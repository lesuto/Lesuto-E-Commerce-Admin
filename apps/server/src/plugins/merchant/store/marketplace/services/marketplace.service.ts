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
import { MarketplaceProfileView } from '../entities/marketplace-profile-view.entity';

@Injectable()
export class MarketplaceService {
    constructor(
        private connection: TransactionalConnection,
        private channelService: ChannelService,
    ) {}

    async assignProductToChannel(ctx: RequestContext, productId: ID, targetChannelId: ID) {
        await this.channelService.assignToChannels(ctx, Product, productId, [targetChannelId]);
        
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
        const merchantChannelId = ctx.channelId;
        
        const existing = await this.connection.getRepository(ctx, SupplierSubscription).findOne({
            where: {
                merchantChannelId: merchantChannelId.toString(),
                supplierChannelId: supplierChannelId.toString()
            }
        });

        if (!existing) {
            await this.connection.getRepository(ctx, SupplierSubscription).save(
                new SupplierSubscription({
                    merchantChannelId: merchantChannelId.toString(),
                    supplierChannelId: supplierChannelId.toString()
                })
            );
        }

        const supplierProducts = await this.connection.getRepository(ctx, Product)
            .createQueryBuilder('product')
            .leftJoin('product.channels', 'channel')
            .where('channel.id = :supplierId', { supplierId: supplierChannelId })
            .getMany();
            
        for (const product of supplierProducts) {
            await this.assignProductToChannel(ctx, product.id, merchantChannelId);
        }

        return { success: true };
    }

    async getMarketplaceSuppliers(ctx: RequestContext) {
        // Find channels where isSupplier = true AND isMarketplaceApproved = true
        return this.connection.getRepository(ctx, Channel).createQueryBuilder('channel')
            .where('channel."customFieldsIssupplier" = :isSupplier', { isSupplier: true })
            .andWhere('channel."customFieldsIsmarketplaceapproved" = :approved', { approved: true })
            .getMany();
    }

    /**
     * Helper to fetch the profile data using our View Entity
     */
    async getSupplierProfile(ctx: RequestContext, channelId: ID) {
        return this.connection.getRepository(ctx, MarketplaceProfileView).findOne({
            where: { channelId: channelId.toString() },
            relations: ['logo']
        });
    }
}