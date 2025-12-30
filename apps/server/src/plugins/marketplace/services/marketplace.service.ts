import { Injectable } from '@nestjs/common';
import {
    RequestContext,
    ChannelService,
    TransactionalConnection,
    ID,
    Product,
    ProductVariant,
    Channel
} from '@vendure/core';
import { SupplierSubscription } from '../entities/supplier-subscription.entity';

@Injectable()
export class MarketplaceService {
    constructor(
        private connection: TransactionalConnection,
        private channelService: ChannelService,
    ) {}

    /**
     * Helper: Assigns a product and its variants to a target channel
     */
    async assignProductToChannel(ctx: RequestContext, productId: ID, targetChannelId: ID) {
        // 1. Assign Product
        await this.channelService.assignToChannels(ctx, Product, productId, [targetChannelId]);
        
        // 2. Assign Variants
        const product = await this.connection.getEntityOrThrow(ctx, Product, productId, {
            relations: ['variants']
        });
        
        if (product.variants.length > 0) {
            for (const variant of product.variants) {
                await this.channelService.assignToChannels(ctx, ProductVariant, variant.id, [targetChannelId]);
            }
        }
    }

    async subscribeToSupplier(ctx: RequestContext, supplierChannelId: ID) {
        const sellerChannelId = ctx.channelId;
         
        // 1. Create Subscription
        const existing = await this.connection.getRepository(ctx, SupplierSubscription).findOne({
            where: {
                sellerChannelId: sellerChannelId.toString(),
                supplierChannelId: supplierChannelId.toString()
            }
        });

        if (!existing) {
            await this.connection.getRepository(ctx, SupplierSubscription).save(
                new SupplierSubscription({
                    sellerChannelId: sellerChannelId.toString(),
                    supplierChannelId: supplierChannelId.toString()
                })
            );
        }

        // 2. Initial Sync: Get all existing Supplier products
        const supplierProducts = await this.connection.getRepository(ctx, Product)
            .createQueryBuilder('product')
            .leftJoin('product.channels', 'channel')
            .where('channel.id = :supplierId', { supplierId: supplierChannelId })
            .getMany();
         
        // 3. Assign them
        for (const product of supplierProducts) {
            await this.assignProductToChannel(ctx, product.id, sellerChannelId);
        }

        return { success: true };
    }

    async getMarketplaceSuppliers(ctx: RequestContext) {
        // Find channels where isSupplier = true AND isMarketplaceApproved = true
        // Use actual custom field column names from DB (prefixed with 'customFields' + PascalCase name)
        return this.connection.getRepository(ctx, Channel).createQueryBuilder('channel')
            .where('channel."customFieldsIssupplier" = :isSupplier', { isSupplier: true })
            .andWhere('channel."customFieldsIsmarketplaceapproved" = :approved', { approved: true })
            .getMany();
    }
}