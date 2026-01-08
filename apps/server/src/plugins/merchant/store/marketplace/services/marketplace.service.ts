import { Injectable } from '@nestjs/common';
import {
    RequestContext,
    ChannelService,
    TransactionalConnection,
    ID,
    Product,
    ProductVariant,
    Channel,
    ProductVariantService,
    ListQueryBuilder
} from '@vendure/core';
import { ProductListOptions } from '@vendure/common/lib/generated-types';
import { SupplierSubscription } from '../entities/supplier-subscription.entity';
import { MarketplaceProfileView } from '../entities/marketplace-profile-view.entity';

@Injectable()
export class MarketplaceService {
    constructor(
        private connection: TransactionalConnection,
        private channelService: ChannelService,
        private productVariantService: ProductVariantService,
        private listQueryBuilder: ListQueryBuilder
    ) { }

    private getSystemContext(ctx: RequestContext): RequestContext {
        return new RequestContext({
            apiType: 'admin',
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
            channel: ctx.channel,
            languageCode: ctx.languageCode,
            session: ctx.session,
            req: ctx.req,
        });
    }

    async assignProductToChannel(ctx: RequestContext, productId: ID, targetChannelId: ID) {
        const systemCtx = this.getSystemContext(ctx);
        await this.channelService.assignToChannels(systemCtx, Product, productId, [targetChannelId]);
        
        const product = await this.connection.getEntityOrThrow(systemCtx, Product, productId, { 
            relations: ['variants', 'variants.productVariantPrices'] 
        });

        if (!product.variants || product.variants.length === 0) return true;

        const variantsToUpdate = [];

        for (const variant of product.variants) {
            await this.channelService.assignToChannels(systemCtx, ProductVariant, variant.id, [targetChannelId]);
            const prices = variant.productVariantPrices || [];
            const supplierPrice = prices.find(p => p.currencyCode === ctx.channel.defaultCurrencyCode) || prices[0];

            if (supplierPrice) {
                variantsToUpdate.push({ id: variant.id, price: supplierPrice.price });
            }
        }

        if (variantsToUpdate.length > 0) {
            await this.productVariantService.update(systemCtx, variantsToUpdate);
        }

        return true;
    }

    async removeProductFromChannel(ctx: RequestContext, productId: ID, targetChannelId: ID) {
        const systemCtx = this.getSystemContext(ctx);
        await this.channelService.removeFromChannels(systemCtx, Product, productId, [targetChannelId]);
        const product = await this.connection.getEntityOrThrow(systemCtx, Product, productId, { relations: ['variants'] });
        for (const variant of product.variants) {
            await this.channelService.removeFromChannels(systemCtx, ProductVariant, variant.id, [targetChannelId]);
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
            .andWhere('product.deletedAt IS NULL')
            .getMany();

        for (const product of supplierProducts) {
            await this.assignProductToChannel(ctx, product.id, merchantChannelId);
        }

        return true;
    }

    async getMarketplaceSuppliers(ctx: RequestContext) {
        return this.connection.getRepository(ctx, Channel).createQueryBuilder('channel')
            .where('channel.customFields.isSupplier = :isSupplier', { isSupplier: true })
            .andWhere('channel.customFields.isMarketplaceApproved = :approved', { approved: true })
            .andWhere('channel.id != :currentChannel', { currentChannel: ctx.channelId }) 
            .getMany();
    }

    async getSupplierChannel(ctx: RequestContext, id: ID) {
        return this.connection.getRepository(ctx, Channel).findOne({
            where: { id },
            relations: ['customFields']
        });
    }

    async getSupplierProfile(ctx: RequestContext, channelId: ID) {
        return this.connection.getRepository(ctx, MarketplaceProfileView).findOne({
            where: { channelId: channelId.toString() },
            relations: ['logo']
        });
    }

    // --- FIX IS HERE ---
    async getSupplierProducts(ctx: RequestContext, supplierChannelId: ID, options?: ProductListOptions) {
        return this.listQueryBuilder
            .build(Product, options, {
                ctx,
                // FIX: Removed 'variants' and 'facetValues' to prevent Cartesian product (tripling rows).
                // 'featuredAsset' is needed for the image.
                // 'channels' is needed to check if it's already added.
                // 'customFields' is needed for basePrice.
                relations: ['featuredAsset', 'channels', 'customFields'], 
                channelId: supplierChannelId,
            })
            .getManyAndCount()
            .then(([items, totalItems]) => {
                return {
                    items,
                    totalItems
                };
            });
    }
}