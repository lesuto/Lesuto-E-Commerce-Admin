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
                const entities = Array.isArray(event.entity) ? event.entity : [event.entity];
                const ids = entities.map(v => v.id);

                // --- SMART POLLING FIX ---
                // We poll the DB briefly to wait for Price/Stock to be committed
                // Max wait: 2 seconds (10 attempts * 200ms)
                let attempts = 0;
                let ready = false;

                while (attempts < 10 && !ready) {
                    // Check if price exists for the first variant in the batch
                    const check = await this.connection.getRepository(event.ctx, ProductVariantPrice).findOne({
                        where: { variant: { id: ids[0] }, channelId: event.ctx.channelId }
                    });

                    // If we found a price (that isn't 0, optional), we are ready to roll
                    if (check) {
                        ready = true;
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms
                        attempts++;
                    }
                }
                // -------------------------

                const hydratedVariants = await this.connection.getRepository(event.ctx, ProductVariant).find({
                    where: { id: In(ids) },
                    relations: ['channels', 'product'] 
                });

                if (hydratedVariants.length > 0) {
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
                    relations: ['channels', 'product'], 
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
        
        const allChannels = allChannelsCache || (await this.channelService.findAll(ctx)).items;
        const potentialTargets = allChannels.filter(c => c.id !== ctx.channel.id);
        if (potentialTargets.length === 0) return;

        const priceRepo = this.connection.getRepository(ctx, ProductVariantPrice);
        const stockRepo = this.connection.getRepository(ctx, StockLevel);

        // --- STEP 1: Parent Products ---
        const uniqueProducts = new Map<string, Product>();
        variants.forEach(v => {
            const p = v.product;
            if (p && !uniqueProducts.has(p.id.toString())) uniqueProducts.set(p.id.toString(), p);
        });

        for (const product of uniqueProducts.values()) {
            try {
                 await this.channelService.assignToChannels(ctx, Product, product.id, potentialTargets.map(c => c.id));
            } catch (e) { /* Ignore */ }
        }

        // --- STEP 2: Variants (Sequential for Safety) ---
        for (const variant of variants) {
            if (variant.deletedAt) continue;
            if (!variant.channels) continue;

            const existingChannelIds = variant.channels.map(c => c.id);
            const missingChannels = potentialTargets.filter(c => !existingChannelIds.includes(c.id));

            // A. Assign to missing channels
            if (missingChannels.length > 0) {
                try {
                    await this.channelService.assignToChannels(ctx, ProductVariant, variant.id, missingChannels.map(c => c.id));
                } catch (e) { /* Ignore */ }
            }

            // B. SYNC DATA (Direct DB Fetch & Write)
            
            // 1. Fetch Price from Source (The Smart Poll ensured it's there now)
            const sourcePriceRecord = await priceRepo.findOne({
                where: { variant: { id: variant.id }, channelId: ctx.channel.id }
            });
            const priceToCopy = sourcePriceRecord ? sourcePriceRecord.price : 0;

            // 2. Fetch Stock from Source
            const sourceStockLevels = await stockRepo.find({
                where: { productVariant: { id: variant.id } },
                relations: ['stockLocation', 'stockLocation.channels']
            });
            const visibleStockLevels = sourceStockLevels.filter(sl => 
                sl.stockLocation.channels.some(c => c.id === ctx.channel.id)
            );
            const stockToCopy = visibleStockLevels.reduce((sum, level) => sum + level.stockOnHand, 0);

            // 3. Push Updates
            for (const targetChannel of potentialTargets) {
                try {
                    // C. Write Price
                    if (priceToCopy >= 0) { // Changed to >= 0 to allow syncing 0 if intended
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

                    const channelLevel = existingTargetLevels.find(sl => 
                        sl.stockLocation.channels.some(c => c.id === targetChannel.id)
                    );

                    if (channelLevel) {
                         if (channelLevel.stockOnHand !== stockToCopy) {
                             await stockRepo.update(channelLevel.id, { stockOnHand: stockToCopy });
                         }
                    }

                } catch (e: any) {
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