import { Injectable, OnApplicationBootstrap, Inject } from '@nestjs/common';
import { 
    EventBus, ProductVariantEvent, ChannelService, RequestContext, 
    TransactionalConnection, ProductVariant, Channel, ProductVariantService, ID, Product,
    ProductVariantPrice, StockLevel
} from '@vendure/core';
import { filter } from 'rxjs/operators';
import { IsNull, In } from 'typeorm';
import { GLOBAL_VARIANT_CONFIGURATION_PLUGIN_OPTIONS } from '../constants';
import { PluginInitOptions } from '../types';

@Injectable()
export class GlobalVariantConfigurationService implements OnApplicationBootstrap {
    constructor(
        private connection: TransactionalConnection,
        private eventBus: EventBus,
        private channelService: ChannelService,
        private productVariantService: ProductVariantService,
        @Inject(GLOBAL_VARIANT_CONFIGURATION_PLUGIN_OPTIONS) private options: PluginInitOptions
    ) {}

    onApplicationBootstrap() {
        this.eventBus.ofType(ProductVariantEvent)
            .pipe(filter(event => event.type === 'created' || event.type === 'updated'))
            .subscribe(async (event) => {
                // Smart Poll for Price/Stock availability to ensure transaction committed
                const entities = Array.isArray(event.entity) ? event.entity : [event.entity];
                const ids = entities.map(v => v.id);
                let attempts = 0;
                let ready = false;

                while (attempts < 10 && !ready) {
                    const check = await this.connection.getRepository(event.ctx, ProductVariantPrice).findOne({
                        where: { variant: { id: ids[0] }, channelId: event.ctx.channelId }
                    });
                    if (check) ready = true;
                    else {
                        await new Promise(resolve => setTimeout(resolve, 200));
                        attempts++;
                    }
                }

                // FIX: Added 'product.channels' to relations so we know where the PARENT is
                const hydratedVariants = await this.connection.getRepository(event.ctx, ProductVariant).find({
                    where: { id: In(ids) },
                    relations: ['channels', 'product', 'product.channels'] 
                });

                if (hydratedVariants.length > 0) {
                    // Note: We do not pass the 3rd arg here, so distributeVariants will fetch it.
                    await this.distributeVariants(event.ctx, hydratedVariants);
                }
            });
    }

    async performManualSync(ctx: RequestContext, sourceChannelId?: ID) {
        const allChannelsList = await this.channelService.findAll(ctx);
        const allChannels = allChannelsList.items;
        const sourcesToProcess = sourceChannelId 
            ? allChannels.filter(c => c.id === sourceChannelId)
            : allChannels;

        let totalProcessed = 0;

        for (const sourceChannel of sourcesToProcess) {
            const sourceCtx = this.createChannelContext(ctx, sourceChannel);
            const repo = this.connection.getRepository(sourceCtx, ProductVariant);

            const BATCH_SIZE = 50; 
            let skip = 0;
            let hasMore = true;

            while (hasMore) {
                const variants = await repo.find({
                    relations: ['channels', 'product', 'product.channels'], 
                    where: { deletedAt: IsNull() },
                    take: BATCH_SIZE,
                    skip: skip
                });

                if (variants.length > 0) {
                    await this.distributeVariants(sourceCtx, variants, allChannels);
                    totalProcessed += variants.length;
                    skip += BATCH_SIZE;
                } else {
                    hasMore = false;
                }
            }
        }

        return {
            success: true,
            message: `Sync complete. Processed ${totalProcessed} variants.`,
            processedVariants: totalProcessed
        };
    }

    private async distributeVariants(ctx: RequestContext, variants: ProductVariant[], allChannelsCache?: Channel[]) {
        if (!variants || variants.length === 0) return;
        
        // --- FIX: Fetch Channels if not provided (Critical for Event Listener) ---
        let availableChannels = allChannelsCache;
        if (!availableChannels) {
            const channelsList = await this.channelService.findAll(ctx);
            availableChannels = channelsList.items;
        }

        const priceRepo = this.connection.getRepository(ctx, ProductVariantPrice);
        const stockRepo = this.connection.getRepository(ctx, StockLevel);

        // --- DELETED "STEP 1: Parent Products" ---
        // We no longer force Parent Products into new channels.
        // We only respect where they ALREADY are.

        // --- STEP 2: Variants ---
        for (const variant of variants) {
            if (variant.deletedAt) continue;
            // Guard clause to ensure product relations exist
            if (!variant.channels || !variant.product || !variant.product.channels) continue;

            // 1. Determine VALID Targets
            // Rule: Target must be in the PARENT PRODUCT'S channel list.
            const parentChannelIds = variant.product.channels.map(c => c.id);
            
            // Filter: (All Channels) MINUS (Source Channel) AND MUST BE IN (Parent Channels)
            const validTargets = availableChannels.filter(c => 
                c.id !== ctx.channel.id && // Not the source
                parentChannelIds.includes(c.id) // <--- THE CRITICAL FIX
            );

            if (validTargets.length === 0) continue;

            // 2. Determine "Missing" from Valid Targets
            const existingVariantChannelIds = variant.channels.map(c => c.id);
            const missingChannels = validTargets.filter(c => !existingVariantChannelIds.includes(c.id));

            // A. Assign to missing channels
            if (missingChannels.length > 0) {
                try {
                    await this.channelService.assignToChannels(ctx, ProductVariant, variant.id, missingChannels.map(c => c.id));
                } catch (e) { /* Ignore */ }
            }

            // B. SYNC DATA (Price & Stock)
            const sourcePriceRecord = await priceRepo.findOne({
                where: { variant: { id: variant.id }, channelId: ctx.channel.id }
            });
            const priceToCopy = sourcePriceRecord ? sourcePriceRecord.price : 0;

            const sourceStockLevels = await stockRepo.find({
                where: { productVariant: { id: variant.id } },
                relations: ['stockLocation', 'stockLocation.channels']
            });
            
            // Calculate stock visible to CURRENT channel
            const visibleStockLevels = sourceStockLevels.filter(sl => 
                sl.stockLocation.channels.some(c => c.id === ctx.channel.id)
            );
            const stockToCopy = visibleStockLevels.reduce((sum, level) => sum + level.stockOnHand, 0);

            // Sync ONLY to valid targets
            for (const targetChannel of validTargets) {
                try {
                    // C. Write Price
                    if (priceToCopy >= 0) {
                        const existingPrice = await priceRepo.findOne({
                            where: { variant: { id: variant.id }, channelId: targetChannel.id }
                        });

                        if (existingPrice) {
                            if (existingPrice.price !== priceToCopy) {
                                await priceRepo.update(existingPrice.id, { price: priceToCopy });
                            }
                        } else {
                            await priceRepo.save(new ProductVariantPrice({
                                price: priceToCopy,
                                variant: variant,
                                channelId: targetChannel.id,
                                currencyCode: targetChannel.defaultCurrencyCode || ctx.channel.defaultCurrencyCode,
                            }));
                        }
                    }

                    // D. Write Stock
                    const targetCtx = this.createChannelContext(ctx, targetChannel);
                    const existingTargetLevels = await this.connection.getRepository(targetCtx, StockLevel).find({
                        where: { productVariant: { id: variant.id } },
                        relations: ['stockLocation', 'stockLocation.channels']
                    });

                    // Find a stock level in the target channel that we can update
                    const channelLevel = existingTargetLevels.find(sl => 
                        sl.stockLocation.channels.some(c => c.id === targetChannel.id)
                    );

                    if (channelLevel) {
                         if (channelLevel.stockOnHand !== stockToCopy) {
                             await stockRepo.update(channelLevel.id, { stockOnHand: stockToCopy });
                         }
                    }
                } catch (e: any) {
                     // Suppress duplicate key errors which can happen in race conditions
                     if (!e.message?.includes('duplicate key')) {
                         console.error(`[GlobalSync] Error: ${e.message}`);
                     }
                }
            }
        }
    }

    private createChannelContext(baseCtx: RequestContext, targetChannel: Channel): RequestContext {
        return new RequestContext({
            apiType: baseCtx.apiType,
            channel: targetChannel,
            authorizedAsOwnerOnly: false,
            isAuthorized: true,
            session: baseCtx.session,
            languageCode: baseCtx.languageCode,
        });
    }
}