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
    VendureEntity,
    TransactionalConnection,
    ID
} from '@vendure/core';

@Injectable()
export class GlobalFacetService implements OnModuleInit {
    constructor(
        private eventBus: EventBus,
        private channelService: ChannelService,
        private connection: TransactionalConnection
    ) {}

    onModuleInit() {
        // 1. Listen for Facet Creation/Updates
        this.eventBus.ofType(FacetEvent).subscribe(async (event) => {
            if (event.type === 'created' || event.type === 'updated') {
                await this.syncToAllChannels(event.ctx, Facet, event.entity.id);
            }
        });

        // 2. Listen for FacetValue Creation/Updates
        this.eventBus.ofType(FacetValueEvent).subscribe(async (event) => {
            if (event.type === 'created' || event.type === 'updated') {
                const values = Array.isArray(event.entity) ? event.entity : [event.entity];
                for (const val of values) {
                    await this.syncToAllChannels(event.ctx, FacetValue, val.id);
                }
            }
        });
    }

    /**
     * MANUAL SYNC: Loops through ALL facets and values and assigns them to ALL channels.
     */
    async syncAllManually(ctx: RequestContext) {
        // 1. Fetch All Facet IDs
        const facets = await this.connection.getRepository(ctx, Facet).find({ select: ['id'] });
        const facetIds = facets.map(f => f.id);

        // 2. Fetch All FacetValue IDs
        const values = await this.connection.getRepository(ctx, FacetValue).find({ select: ['id'] });
        const valueIds = values.map(v => v.id);

        // 3. Get Target Channels (Everyone except default)
        const allChannels = await this.channelService.findAll(ctx);
        const targetChannelIds = allChannels.items
            .filter(c => c.code !== '__default_channel__')
            .map(c => c.id);

        if (targetChannelIds.length === 0) return { count: 0 };

        Logger.info(`[GlobalFacet] Starting Manual Sync for ${targetChannelIds.length} channels...`);

        // 4. Perform Assignment (Looping required because assignToChannels expects single Entity ID)
        
        // Sync Facets
        for (const id of facetIds) {
            await this.channelService.assignToChannels(ctx, Facet, id, targetChannelIds);
        }

        // Sync Facet Values
        for (const id of valueIds) {
            await this.channelService.assignToChannels(ctx, FacetValue, id, targetChannelIds);
        }

        const totalOps = (facetIds.length + valueIds.length) * targetChannelIds.length;
        Logger.info(`[GlobalFacet] Manual Sync complete. Verified/Created ${totalOps} links.`);
        
        return { success: true };
    }

    /**
     * Helper: Assigns a SINGLE entity to ALL available channels
     */
    private async syncToAllChannels<T extends ChannelAware & VendureEntity>(
        ctx: RequestContext, 
        entityType: Type<T>, 
        entityId: ID
    ) {
        const defaultChannelCode = '__default_channel__';
        
        // Security: Only allow sync if initiated from the Default Channel
        if (ctx.channel.code !== defaultChannelCode) {
            return; 
        }

        const allChannels = await this.channelService.findAll(ctx);
        const targetChannels = allChannels.items.filter(c => c.id !== ctx.channelId);

        if (targetChannels.length > 0) {
            await this.channelService.assignToChannels(ctx, entityType, entityId, targetChannels.map(c => c.id));
        }
    }
}