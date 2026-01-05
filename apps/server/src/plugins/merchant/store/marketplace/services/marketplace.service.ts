import { Injectable } from '@nestjs/common';
import {
    RequestContext,
    ChannelService,
    TransactionalConnection,
    ID,
    Product,
    ProductVariant,
    Channel,
    ProductVariantService
} from '@vendure/core';
import { SupplierSubscription } from '../entities/supplier-subscription.entity';
import { MarketplaceProfileView } from '../entities/marketplace-profile-view.entity';

@Injectable()
export class MarketplaceService {
    constructor(
        private connection: TransactionalConnection,
        private channelService: ChannelService,
        private productVariantService: ProductVariantService
    ) { }

    /**
     * Sudo-mode: Allows us to move the Supplier's product
     * even though the Merchant doesn't strictly own it yet.
     */
    private getSystemContext(ctx: RequestContext): RequestContext {
        return new RequestContext({
            apiType: 'admin',
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
            channel: ctx.channel, // Keeps the Merchant's channel active
            languageCode: ctx.languageCode,
            session: ctx.session,
            req: ctx.req,
        });
    }

async assignProductToChannel(ctx: RequestContext, productId: ID, targetChannelId: ID) {
    console.log("Assign Product To Channel");

    // 1. Switch to System Admin Context
    const systemCtx = this.getSystemContext(ctx);

    // 2. Assign the Product to the Merchant Channel
    await this.channelService.assignToChannels(systemCtx, Product, productId, [targetChannelId]);
    
    // Fetch the product with its relations
    const product = await this.connection.getEntityOrThrow(systemCtx, Product, productId, { 
        relations: ['variants', 'variants.productVariantPrices'] 
    });

    // --- SAFETY CHECK: Early exit if no variants exist ---
    if (!product.variants || product.variants.length === 0) {
        // No variants to process, so we are done.
        return true;
    }

    // 3. Fix the "No Price" Error
    const variantsToUpdate = [];

    for (const variant of product.variants) {
        // Assign the specific variant to the channel
        await this.channelService.assignToChannels(systemCtx, ProductVariant, variant.id, [targetChannelId]);
        
        // Safety check: ensure prices array exists before trying to find()
        const prices = variant.productVariantPrices || [];

        // Find the price in the current currency (or fallback to the first one)
        const supplierPrice = prices.find(p => 
            p.currencyCode === ctx.channel.defaultCurrencyCode
        ) || prices[0];

        // Only add to update list if a valid price was found
        if (supplierPrice) {
            variantsToUpdate.push({
                id: variant.id,
                price: supplierPrice.price 
            });
        }
    }

    // 4. Save all prices in one go
    if (variantsToUpdate.length > 0) {
        await this.productVariantService.update(systemCtx, variantsToUpdate);
    }

    return true;
}

    // ... The rest of your methods (removeProduct, etc) remain the same ...
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

    async getSupplierProducts(ctx: RequestContext, supplierChannelId: ID) {
        return this.connection.getRepository(ctx, Product)
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.channels', 'channel')
            .leftJoinAndSelect('product.featuredAsset', 'featuredAsset')
            .leftJoinAndSelect('product.variants', 'variants')
            .where('channel.id = :supplierId', { supplierId: supplierChannelId })
            .andWhere('product.deletedAt IS NULL') 
            .getMany();
    }
}