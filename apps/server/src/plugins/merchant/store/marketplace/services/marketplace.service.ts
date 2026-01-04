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
    ) { }

    async assignProductToChannel(ctx: RequestContext, productId: ID, targetChannelId: ID) {
        await this.channelService.assignToChannels(ctx, Product, productId, [targetChannelId]);
        const product = await this.connection.getEntityOrThrow(ctx, Product, productId, { relations: ['variants'] });
        for (const variant of product.variants) {
            await this.channelService.assignToChannels(ctx, ProductVariant, variant.id, [targetChannelId]);
        }
        return true;
    }

    async removeProductFromChannel(ctx: RequestContext, productId: ID, targetChannelId: ID) {
        await this.channelService.removeFromChannels(ctx, Product, productId, [targetChannelId]);
        const product = await this.connection.getEntityOrThrow(ctx, Product, productId, { relations: ['variants'] });
        for (const variant of product.variants) {
            await this.channelService.removeFromChannels(ctx, ProductVariant, variant.id, [targetChannelId]);
        }
        return true;
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

    async getSupplierChannel(ctx: RequestContext, id: ID) {
        return this.connection.getRepository(ctx, Channel).findOne({
            where: { id },
            relations: ['customFields'] // Ensure we load custom fields if needed
        });
    }

    async getSupplierProfile(ctx: RequestContext, channelId: ID) {
        return this.connection.getRepository(ctx, MarketplaceProfileView).findOne({
            where: { channelId: channelId.toString() },
            relations: ['logo']
        });
    }

    // Updated to ensure we load channels to check state on frontend
async getSupplierProducts(ctx: RequestContext, supplierChannelId: ID) {
    return this.connection.getRepository(ctx, Product)
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.channels', 'channel')
        .leftJoinAndSelect('product.featuredAsset', 'featuredAsset')
        .leftJoinAndSelect('product.variants', 'variants')
        .where('channel.id = :supplierId', { supplierId: supplierChannelId })
        .andWhere('product."deletedAt" IS NULL') // exclude deleted
        .getMany();
}
}