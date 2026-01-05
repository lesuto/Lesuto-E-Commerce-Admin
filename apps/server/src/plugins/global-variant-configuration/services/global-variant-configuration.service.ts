import { Injectable, OnApplicationBootstrap, Inject } from '@nestjs/common';
import { 
    EventBus, 
    ProductVariantEvent, 
    ChannelService, 
    RequestContext, 
    TransactionalConnection,
    ProductVariant,
    Channel,
    ProductVariantService // <--- Import this
} from '@vendure/core';
import { filter } from 'rxjs/operators';
import { GLOBAL_VARIANT_CONFIGURATION_PLUGIN_OPTIONS } from '../constants';
import { PluginInitOptions } from '../types';

@Injectable()
export class GlobalVariantConfigurationService implements OnApplicationBootstrap {
    constructor(
        private connection: TransactionalConnection,
        private eventBus: EventBus,
        private channelService: ChannelService,
        private productVariantService: ProductVariantService, // <--- Inject this
        @Inject(GLOBAL_VARIANT_CONFIGURATION_PLUGIN_OPTIONS) private options: PluginInitOptions
    ) {}

    onApplicationBootstrap() {
        this.eventBus.ofType(ProductVariantEvent)
            .pipe(
                filter(event => event.type === 'created'),
            )
            .subscribe(async (event) => {
                await this.handleVariantCreation(event.ctx, event.entity);
            });
    }

    private async handleVariantCreation(ctx: RequestContext, variants: ProductVariant[]) {
        if (variants.length === 0) return;

        // 1. Get all active channels
        const allChannelsList = await this.channelService.findAll(ctx);
        const allChannels = allChannelsList.items;

        // 2. Identify target channels (all except the current one)
        const targetChannels = allChannels.filter(c => c.id !== ctx.channelId);

        if (targetChannels.length === 0) return;

        try {
            // 3. Process each variant
            for (const variant of variants) {
                // We use the price from the source variant. 
                // Ensure your variant has a price at creation, otherwise this is 0.
                const priceToCopy = variant.price; 

                // 4. Process each channel for this variant
                for (const targetChannel of targetChannels) {
                    
                    // A. Assign the variant to the channel
                    await this.channelService.assignToChannels(
                        ctx, 
                        ProductVariant, 
                        variant.id,       
                        [targetChannel.id]  
                    );

                    // B. Create a context specific to this target channel
                    // We need this because prices are saved against the context's channel
                    const channelCtx = new RequestContext({
                        apiType: ctx.apiType,
                        channel: targetChannel,
                        // We assume the system/admin is authorized
                        authorizedAsOwnerOnly: false,
                        isAuthorized: true,
                        session: ctx.session,
                        languageCode: ctx.languageCode,
                    });

                    // C. Explicitly set the price for this channel
                    await this.productVariantService.update(channelCtx, [{
                        id: variant.id,
                        price: priceToCopy 
                    }]);
                }
            }
            
            console.log(`[GlobalVariantSync] synced ${variants.length} variant(s) and prices to ${targetChannels.length} extra channels.`);
        } catch (error) {
            console.error('[GlobalVariantSync] Failed to sync new variants:', error);
        }
    }
}