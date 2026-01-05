import { Injectable, OnModuleInit } from '@nestjs/common';
import { 
    EventBus, 
    FacetEvent, 
    FacetValueEvent, 
    ChannelService, 
    RequestContext, 
    Facet,      
    FacetValue, 
    Logger,
    Type,
    ChannelAware,
    VendureEntity
} from '@vendure/core';

@Injectable()
export class GlobalFacetService implements OnModuleInit {
    constructor(
        private eventBus: EventBus,
        private channelService: ChannelService
    ) {}

    onModuleInit() {
        this.eventBus.ofType(FacetEvent).subscribe(async (event) => {
            if (event.type === 'created' || event.type === 'updated') {
                // Explicitly pass the Class 'Facet'
                await this.syncToAllChannels(event.ctx, Facet, event.entity.id);
            }
        });

        this.eventBus.ofType(FacetValueEvent).subscribe(async (event) => {
            if (event.type === 'created' || event.type === 'updated') {
                const values = Array.isArray(event.entity) ? event.entity : [event.entity];
                for (const val of values) {
                    // Explicitly pass the Class 'FacetValue'
                    await this.syncToAllChannels(event.ctx, FacetValue, val.id);
                }
            }
        });
    }

    /**
     * Generic helper that accepts any ChannelAware entity class (Facet or FacetValue)
     */
    private async syncToAllChannels<T extends ChannelAware & VendureEntity>(
        ctx: RequestContext, 
        entityType: Type<T>, 
        entityId: string | number
    ) {
        const defaultChannelCode = '__default_channel__';
        
        // Security: Only allow sync if initiated from the Default Channel (Super Admin context)
        if (ctx.channel.code !== defaultChannelCode) {
            return; 
        }

        const allChannels = await this.channelService.findAll(ctx);
        const targetChannels = allChannels.items.filter(c => c.id !== ctx.channelId);

        if (targetChannels.length > 0) {
            Logger.info(`[GlobalFacet] Syncing ${entityType.name} #${entityId} to ${targetChannels.length} channels.`);
            
            // Now TypeScript is happy because entityType is typed as Type<T>
            await this.channelService.assignToChannels(ctx, entityType, entityId, targetChannels.map(c => c.id));
        }
    }
}