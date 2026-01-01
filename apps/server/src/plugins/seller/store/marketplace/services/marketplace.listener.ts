import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus, ProductEvent, TransactionalConnection, ChannelService, RequestContext, Product } from '@vendure/core';
import { SupplierSubscription } from '../entities/supplier-subscription.entity';

@Injectable()
export class MarketplaceEventListener implements OnModuleInit {
    constructor(
        private eventBus: EventBus,
        private connection: TransactionalConnection,
        private channelService: ChannelService
    ) {}

    onModuleInit() {
        this.eventBus.ofType(ProductEvent).subscribe(async event => {
            // Only care about Created or Updated events
            if (event.type !== 'created' && event.type !== 'updated') return;
            
            const product = event.entity;
            const ctx = event.ctx;
            const supplierChannelId = ctx.channelId;

            // 1. Check if this Channel has subscribers
            const subscriptions = await this.connection.getRepository(ctx, SupplierSubscription).find({
                where: { supplierChannelId: supplierChannelId.toString() }
            });

            if (subscriptions.length === 0) return;

            // 2. Push updates to all Subscribers
            // In a real app, you might clone the ctx or use a superadmin context
            // For now, we reuse ctx assuming it has permission or using lower-level service access
            for (const sub of subscriptions) {
                if (event.type === 'created') {
                    await this.channelService.assignToChannels(
                        ctx,
                        Product,
                        product.id,
                        [sub.sellerChannelId]
                    );
                    // Note: Variants are usually handled in a separate variant event, 
                    // or you can fetch and assign them here if created simultaneously.
                }
            }
        });
    }
}