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
import { In, Brackets, SelectQueryBuilder } from 'typeorm'; 

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

    // --- HELPER: Apply Filters ---
    private applyFilters(
        qb: SelectQueryBuilder<Product>, 
        ctx: RequestContext, 
        supplierChannelId: ID, 
        collectionId?: ID, 
        term?: string
    ) {
        // 1. Filter by Supplier
        qb.innerJoin('product.channels', 'channel', 'channel.id = :channelId', { channelId: supplierChannelId });
        
        // 2. Filter out deleted
        qb.andWhere('product.deletedAt IS NULL');

        // 3. Search Term
        if (term && term.trim().length > 0) {
            qb.innerJoin('product.translations', 'search_trans');
            qb.andWhere(new Brackets(subQb => {
                subQb.where('search_trans.languageCode = :lang', { lang: ctx.languageCode })
                     .andWhere('search_trans.name ILIKE :term', { term: `%${term}%` });
            }));
        }

        // 4. Collection Filter (FIXED: Go through Variants)
        if (collectionId) {
            // Join variants first
            qb.innerJoin('product.variants', 'filter_variant');
            // Then join collections from the variant
            qb.innerJoin('filter_variant.collections', 'filter_col');
            qb.andWhere('filter_col.id = :colId', { colId: collectionId });
        }
        
        return qb;
    }

    // --- MAIN QUERY ---
    async getSupplierProducts(
        ctx: RequestContext, 
        supplierChannelId: ID, 
        options?: ProductListOptions,
        collectionId?: ID,
        term?: string
    ) {
        const productRepo = this.connection.getRepository(ctx, Product);

        // A. GET PRODUCTS
        const qb = productRepo.createQueryBuilder('product');
        this.applyFilters(qb, ctx, supplierChannelId, collectionId, term);

        qb.select('product.id', 'id');
        qb.addSelect('product.createdAt', 'createdAt');
        qb.distinct(true);
        qb.orderBy('product.createdAt', 'DESC');

        const totalItems = await qb.getCount();
        const skip = options?.skip || 0;
        const take = options?.take || 25;
        qb.offset(skip).limit(take);

        const rawResults = await qb.getRawMany();
        const pageIds = rawResults.map(r => r.id);

        let items: Product[] = [];
        if (pageIds.length > 0) {
            const hydratedItems = await productRepo.find({
                where: { id: In(pageIds) },
                relations: [
                    'featuredAsset', 
                    'channels', 
                    'customFields', 
                    'variants' 
                ]
            });
            
            items = pageIds
                .map(id => hydratedItems.find(p => p.id === id))
                .filter(item => item !== undefined) as Product[];
        }

        // B. GET COLLECTION COUNTS (Sidebar)
        const colQb = productRepo.createQueryBuilder('product');
        this.applyFilters(colQb, ctx, supplierChannelId, undefined, term); 

        // FIXED: Join Variants -> Collections
        colQb.innerJoin('product.variants', 'count_variant');
        colQb.innerJoin('count_variant.collections', 'count_col');
        
        colQb.innerJoin('count_col.translations', 'count_col_trans');
        colQb.andWhere('count_col_trans.languageCode = :lang', { lang: ctx.languageCode });

        colQb.select('count_col.id', 'id');
        colQb.addSelect('count_col_trans.name', 'name');
        colQb.addSelect('COUNT(DISTINCT product.id)', 'count'); // Count Unique Parents
        
        colQb.groupBy('count_col.id');
        colQb.addGroupBy('count_col_trans.name');

        const rawCollections = await colQb.getRawMany();
        const collections = rawCollections.map(r => ({
            collection: { id: r.id, name: r.name },
            count: parseInt(r.count, 10)
        }));

        // C. GET STATUS COUNTS
        const statusQb = productRepo.createQueryBuilder('product');
        this.applyFilters(statusQb, ctx, supplierChannelId, collectionId, term);
        
        statusQb.leftJoin('product.channels', 'merchant_channel', 'merchant_channel.id = :merchantId', { merchantId: ctx.channelId });
        
        statusQb.select('COUNT(DISTINCT product.id)', 'total');
        statusQb.addSelect('COUNT(DISTINCT merchant_channel.id)', 'inStore');

        const statusResult = await statusQb.getRawOne();
        const total = parseInt(statusResult.total, 10) || 0;
        const inStore = parseInt(statusResult.inStore, 10) || 0;

        return {
            items,
            totalItems,
            collections,
            counts: {
                total,
                inStore,
                notInStore: total - inStore
            }
        };
    }

    // --- STANDARD METHODS (Unchanged) ---
    
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
}