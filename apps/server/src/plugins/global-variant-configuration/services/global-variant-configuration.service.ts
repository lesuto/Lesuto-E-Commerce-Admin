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
                
                // Allow DB to settle
                await new Promise(resolve => setTimeout(resolve, 500));

                const hydratedVariants = await this.connection.getRepository(event.ctx, ProductVariant).find({
                    where: { id: In(ids) },
                    relations: ['channels', 'product', 'product.channels', 'product.customFields'] 
                });

                if (hydratedVariants.length > 0) {
                    await this.distributeVariants(event.ctx, hydratedVariants);
                }
            });
    }

    async performManualSync(ctx: RequestContext, sourceChannelId?: ID) {
        // Fetch channels with custom fields to check isMerchant/isSupplier
        const allChannelsList = await this.connection.getRepository(ctx, Channel).find();
        
        const sourcesToProcess = sourceChannelId 
            ? allChannelsList.filter(c => c.id === sourceChannelId)
            : allChannelsList;

        let totalProcessed = 0;

        for (const sourceChannel of sourcesToProcess) {
            const sourceCtx = this.createChannelContext(ctx, sourceChannel);
            const repo = this.connection.getRepository(sourceCtx, ProductVariant);

            const BATCH_SIZE = 50; 
            let skip = 0;
            let hasMore = true;

            while (hasMore) {
                const variants = await repo.find({
                    relations: ['channels', 'product', 'product.channels', 'product.customFields'], 
                    where: { deletedAt: IsNull() },
                    take: BATCH_SIZE,
                    skip: skip
                });

                if (variants.length > 0) {
                    await this.distributeVariants(sourceCtx, variants, allChannelsList);
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
        
        let availableChannels = allChannelsCache;
        if (!availableChannels) {
            availableChannels = await this.connection.getRepository(ctx, Channel).find();
        }

        const priceRepo = this.connection.getRepository(ctx, ProductVariantPrice);
        const stockRepo = this.connection.getRepository(ctx, StockLevel);

        for (const variant of variants) {
            if (variant.deletedAt) continue;
            if (!variant.channels || !variant.product || !variant.product.channels) continue;

            // --- 1. DETERMINE OWNER & VALID TARGETS ---
            
            // Resolve Owner Code
            const productCustomFields = (variant.product.customFields as any);
            const productOwnerCode = productCustomFields?.ownercompany;

            // 1. Filter: Only consider "Merchant" channels as valid targets for syncing
            // We EXCLUDE isSupplier channels from receiving updates (unless they are the owner, handled separately)
            const merchantChannels = availableChannels.filter(c => {
                const isMerchant = (c.customFields as any)?.isMerchant || (c.customFields as any)?.isSeller; // Handle both naming conventions
                const isSupplier = (c.customFields as any)?.isSupplier;
                // Valid if: Is Merchant AND Not Supplier (unless your logic differs)
                return isMerchant === true && isSupplier !== true;
            });

            // 2. Rule: Target must be subscribed to the Parent Product
            const parentChannelIds = variant.product.channels.map(c => c.id);
            const validTargets = merchantChannels.filter(c => 
                c.id !== ctx.channel.id && // Not the source
                parentChannelIds.includes(c.id)
            );

            // --- 2. GHOSTBUSTING (Wipe invalid variants) ---
            // If the variant exists in a channel that is NOT a valid target, NOT the default channel, and NOT the Owner:
            // REMOVE IT. This cleans up the "Ghost" variants.

            const currentChannelIds = variant.channels.map(c => c.id);
            const channelsToRemove: ID[] = [];

            for (const channel of availableChannels) {
                // Skip if not currently assigned
                if (!currentChannelIds.includes(channel.id)) continue;
                
                // PROTECTED CHANNELS (Do not wipe):
                // 1. Default Channel (ID 1)
                if (channel.id === 1 || channel.code === '__default_channel__') continue;
                // 2. The Product Owner Channel
                if (productOwnerCode && channel.code === productOwnerCode) continue;
                // 3. The Current Context (prevent suicide during sync)
                if (channel.id === ctx.channel.id) continue;

                // CHECK: Is this a valid target?
                const isValidTarget = validTargets.find(vt => vt.id === channel.id);
                
                if (!isValidTarget) {
                    // It is assigned, but not valid. It is a GHOST.
                    channelsToRemove.push(channel.id);
                }
            }

            if (channelsToRemove.length > 0) {
                try {
                    console.log(`[Ghostbuster] Wiping variant ${variant.sku} from channels: ${channelsToRemove}`);
                    await this.channelService.removeFromChannels(ctx, ProductVariant, variant.id, channelsToRemove);
                } catch (e) { console.error(`Failed to wipe ghosts:`, e); }
            }

            // --- 3. CRASH REPAIR (Self-Healing) ---
            // If we are currently in the Owner Channel (or any channel), and the price is missing,
            // the UI will crash with "No price information found". We must fix this immediately.
            
            let sourcePriceRecord = await priceRepo.findOne({
                where: { variant: { id: variant.id }, channelId: ctx.channel.id }
            });

            if (!sourcePriceRecord) {
                // REPAIR: Create a 0 price so the admin doesn't crash
                console.log(`[CrashFix] Repairing missing price for ${variant.sku} in ${ctx.channel.code}`);
                sourcePriceRecord = await priceRepo.save(new ProductVariantPrice({
                    price: 0,
                    variant: variant,
                    channelId: ctx.channel.id,
                    currencyCode: ctx.channel.defaultCurrencyCode,
                }));
            }

            // --- 4. AUTHORITY CHECK ---
            // If we are not the owner, we stop here. We cleaned up ghosts, repaired local crash, but we don't sync out.
            if (productOwnerCode && productOwnerCode !== ctx.channel.code) {
                continue; 
            }

            // --- 5. SYNC TO MERCHANTS ---
            const priceToCopy = sourcePriceRecord.price;

            const sourceStockLevels = await stockRepo.find({
                where: { productVariant: { id: variant.id } },
                relations: ['stockLocation', 'stockLocation.channels']
            });
            const visibleStockLevels = sourceStockLevels.filter(sl => 
                sl.stockLocation.channels.some(c => c.id === ctx.channel.id)
            );
            const stockToCopy = visibleStockLevels.reduce((sum, level) => sum + level.stockOnHand, 0);

            // Apply to Valid Merchant Targets
            // We use 'assignToChannels' here to ensure they are added if missing
            const targetsToAssign = validTargets.filter(vt => !currentChannelIds.includes(vt.id));
            if (targetsToAssign.length > 0) {
                await this.channelService.assignToChannels(ctx, ProductVariant, variant.id, targetsToAssign.map(t => t.id));
            }

            for (const targetChannel of validTargets) {
                try {
                    // Force Price Sync (Source is Truth)
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

                    // Force Stock Sync
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