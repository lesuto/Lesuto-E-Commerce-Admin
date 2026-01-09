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

    /**
     * MASTER FILTER LOGIC
     */
    private applyFilters(
        qb: SelectQueryBuilder<Product>, 
        ctx: RequestContext, 
        supplierChannelId: ID, 
        collectionId?: ID, 
        facetValueIds?: string[], 
        term?: string,
        stock?: string,
        status?: string,
        enabled?: boolean
    ) {
        // 1. Supplier Filter
        qb.innerJoin('product.channels', 'channel', 'channel.id = :channelId', { channelId: supplierChannelId });
        qb.andWhere('product.deletedAt IS NULL');

        // 2. Search Term
        if (term && term.trim().length > 0) {
            qb.innerJoin('product.translations', 'search_trans');
            qb.andWhere(new Brackets(subQb => {
                subQb.where('search_trans.languageCode = :lang', { lang: ctx.languageCode })
                     .andWhere('search_trans.name ILIKE :term', { term: `%${term}%` });
            }));
        }

        // 3. Collection Filter
        if (collectionId) {
            qb.innerJoin('product.variants', 'filter_variant_col');
            qb.innerJoin('filter_variant_col.collections', 'filter_col');
            qb.andWhere('filter_col.id = :colId', { colId: collectionId });
        }

        // 4. Facet Filter
        if (facetValueIds && facetValueIds.length > 0) {
            qb.innerJoin('product.facetValues', 'filter_fv');
            qb.andWhere('filter_fv.id IN (:...facetIds)', { facetIds: facetValueIds });
        }

        // 5. Stock Filter
        if (stock === 'in-stock') {
            qb.andWhere((qb) => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from(ProductVariant, 'v')
                    .where('v.productId = product.id')
                    .andWhere('v.stock_on_hand > 0') 
                    .getQuery();
                return `EXISTS ${subQuery}`;
            });
        } else if (stock === 'out-of-stock') {
            qb.andWhere((qb) => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from(ProductVariant, 'v')
                    .where('v.productId = product.id')
                    .andWhere('v.stock_on_hand > 0')
                    .getQuery();
                return `NOT EXISTS ${subQuery}`;
            });
        }

        // 6. Catalog Status
        if (status === 'added') {
            qb.innerJoin('product.channels', 'merchant_channel_inc', 'merchant_channel_inc.id = :merchantId', { merchantId: ctx.channelId });
        } else if (status === 'not-added') {
             qb.andWhere((qb) => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from('product_channels_channel', 'pcc')
                    .where('pcc.productId = product.id')
                    .andWhere('pcc.channelId = :merchantId')
                    .getQuery();
                return `NOT EXISTS ${subQuery}`;
            });
            qb.setParameter('merchantId', ctx.channelId);
        }

        // 7. Visibility
        if (enabled !== undefined && enabled !== null) {
            qb.andWhere('product.enabled = :enabled', { enabled });
        }

        return qb;
    }

    /**
     * OPTIMIZED: Fixed Parallel Execution
     */
    async getSupplierProducts(
        ctx: RequestContext, 
        supplierChannelId: ID, 
        options?: ProductListOptions,
        collectionId?: ID,
        facetValueIds?: string[],
        term?: string,
        stock?: string,
        status?: string,
        enabled?: boolean
    ) {
        const productRepo = this.connection.getRepository(ctx, Product);

        // --- 1. Main Product Query ---
        const qb = productRepo.createQueryBuilder('product');
        this.applyFilters(qb, ctx, supplierChannelId, collectionId, facetValueIds, term, stock, status, enabled);

        qb.select('product.id', 'id');
        qb.addSelect('product.createdAt', 'createdAt');
        qb.distinct(true); 
        qb.orderBy('product.createdAt', 'DESC');

        const skip = options?.skip || 0;
        const take = options?.take || 25;
        qb.offset(skip).limit(take);

        // --- 2. Sidebar: Collections (Fixed Selection) ---
        const colQb = productRepo.createQueryBuilder('product');
        this.applyFilters(colQb, ctx, supplierChannelId, undefined, facetValueIds, term, stock, status, enabled);
        colQb.innerJoin('product.variants', 'count_variant');
        colQb.innerJoin('count_variant.collections', 'count_col');
        colQb.innerJoin('count_col.translations', 'count_col_trans');
        colQb.andWhere('count_col_trans.languageCode = :lang', { lang: ctx.languageCode });
        
        // FIXED: Explicit aliasing using standard TypeORM chain
        colQb.select('count_col.id', 'id')
             .addSelect('count_col_trans.name', 'name')
             .addSelect('COUNT(DISTINCT product.id)', 'count')
             .groupBy('count_col.id')
             .addGroupBy('count_col_trans.name');

        // --- 3. Sidebar: Facets (Fixed Selection) ---
        const facQb = productRepo.createQueryBuilder('product');
        this.applyFilters(facQb, ctx, supplierChannelId, collectionId, undefined, term, stock, status, enabled);
        facQb.innerJoin('product.facetValues', 'count_fv');
        facQb.innerJoin('count_fv.translations', 'count_fv_trans');
        facQb.andWhere('count_fv_trans.languageCode = :lang', { lang: ctx.languageCode });

        // FIXED: Explicit aliasing
        facQb.select('count_fv.id', 'id')
             .addSelect('count_fv_trans.name', 'name')
             .addSelect('COUNT(DISTINCT product.id)', 'count')
             .groupBy('count_fv.id')
             .addGroupBy('count_fv_trans.name');

        // --- 4. Status Counts ---
        const statusQb = productRepo.createQueryBuilder('product');
        statusQb.innerJoin('product.channels', 'channel', 'channel.id = :channelId', { channelId: supplierChannelId });
        statusQb.andWhere('product.deletedAt IS NULL');
        statusQb.leftJoin('product.channels', 'mc', 'mc.id = :mid', { mid: ctx.channelId });
        statusQb.select('COUNT(DISTINCT product.id)', 'total')
                .addSelect('COUNT(DISTINCT mc.id)', 'inStore');

        // 
        // --- EXECUTE EVERYTHING IN PARALLEL ---
        const [rawResults, totalItems, rawCols, rawFacets, statusRes] = await Promise.all([
            qb.getRawMany(),      // 1a. IDs
            qb.getCount(),        // 1b. Total
            colQb.getRawMany(),   // 2. Collections
            facQb.getRawMany(),   // 3. Facets
            statusQb.getRawOne()  // 4. Status
        ]);

        // --- 5. Hydrate Visible Items ---
        const pageIds = rawResults.map(r => r.id);
        let items: Product[] = [];
        
        if (pageIds.length > 0) {
            const hydratedItems = await productRepo.find({
                where: { id: In(pageIds) },
                relations: ['featuredAsset', 'channels', 'customFields', 'variants']
            });
            items = pageIds.map(id => hydratedItems.find(p => p.id === id)).filter(x => x) as Product[];
        }

        // --- 6. Map Results ---
        // The keys 'id' and 'name' match the aliases we set in select()
        const collections = rawCols.map(r => ({ 
            collection: { id: r.id, name: r.name }, 
            count: +r.count 
        }));

        const facets = rawFacets.map(r => ({ 
            facetValue: { id: r.id, name: r.name }, 
            count: +r.count 
        }));

        const total = +statusRes?.total || 0;
        const inStore = +statusRes?.inStore || 0;

        return { 
            items, 
            totalItems, 
            collections, 
            facets, 
            counts: { total, inStore, notInStore: total - inStore } 
        };
    }

    async getMarketplaceSuppliers(ctx: RequestContext) {
        return this.connection.getRepository(ctx, Channel)
            .createQueryBuilder('channel')
            .where('channel.customFields.isSupplier = :isSupplier', { isSupplier: true })
            .andWhere('channel.customFields.isMarketplaceApproved = :approved', { approved: true })
            .andWhere('channel.id != :currentChannel', { currentChannel: ctx.channelId })
            .getMany();
    }

    // ... (Keep remaining methods: assignProductToChannel, etc. unchanged)
    
    async assignProductToChannel(ctx: RequestContext, productId: ID, targetChannelId: ID) {
        const systemCtx = this.getSystemContext(ctx);
        await this.channelService.assignToChannels(systemCtx, Product, productId, [targetChannelId]);
        const product = await this.connection.getEntityOrThrow(systemCtx, Product, productId, { relations: ['variants', 'variants.productVariantPrices'] });
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
        const existing = await this.connection.getRepository(ctx, SupplierSubscription).findOne({ where: { merchantChannelId: merchantChannelId.toString(), supplierChannelId: supplierChannelId.toString() } });
        if (!existing) {
            await this.connection.getRepository(ctx, SupplierSubscription).save(new SupplierSubscription({ merchantChannelId: merchantChannelId.toString(), supplierChannelId: supplierChannelId.toString() }));
        }
        const supplierProducts = await this.connection.getRepository(ctx, Product).createQueryBuilder('product').leftJoin('product.channels', 'channel').where('channel.id = :supplierId', { supplierId: supplierChannelId }).andWhere('product.deletedAt IS NULL').getMany();
        for (const product of supplierProducts) {
            await this.assignProductToChannel(ctx, product.id, merchantChannelId);
        }
        return true;
    }

    async getSupplierChannel(ctx: RequestContext, id: ID) {
        return this.connection.getRepository(ctx, Channel).findOne({ where: { id }, relations: ['customFields'] });
    }

    async getSupplierProfile(ctx: RequestContext, channelId: ID) {
        return this.connection.getRepository(ctx, MarketplaceProfileView).findOne({ where: { channelId: channelId.toString() }, relations: ['logo'] });
    }
}