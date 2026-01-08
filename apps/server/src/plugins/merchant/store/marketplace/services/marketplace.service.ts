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
     * Helper to apply common filters (Channel, Deleted, Search, Facets)
     * Uses specific aliases to avoid collisions.
     */
    private applyFilters(
        qb: SelectQueryBuilder<Product>, 
        ctx: RequestContext, 
        supplierChannelId: ID, 
        facetValueIds?: string[], 
        term?: string
    ) {
        // 1. Filter by Supplier Channel
        qb.innerJoin('product.channels', 'channel', 'channel.id = :channelId', { channelId: supplierChannelId });
        
        // 2. Filter out deleted items
        qb.andWhere('product.deletedAt IS NULL');

        // 3. Search Term (Join Translations)
        if (term && term.trim().length > 0) {
            qb.innerJoin('product.translations', 'search_trans');
            qb.andWhere(new Brackets(subQb => {
                subQb.where('search_trans.languageCode = :lang', { lang: ctx.languageCode })
                     .andWhere('search_trans.name ILIKE :term', { term: `%${term}%` });
            }));
        }

        // 4. Facet Filter (Restrict results to selected facets)
        if (facetValueIds && facetValueIds.length > 0) {
            qb.innerJoin('product.facetValues', 'filter_fv');
            qb.andWhere('filter_fv.id IN (:...facetIds)', { facetIds: facetValueIds });
        }
        
        return qb;
    }

    /**
     * MAIN QUERY: Get Products + Sidebar Counts
     */
    async getSupplierProducts(
        ctx: RequestContext, 
        supplierChannelId: ID, 
        options?: ProductListOptions,
        facetValueIds?: string[],
        term?: string
    ) {
        const productRepo = this.connection.getRepository(ctx, Product);

        // --- PART 1: GET THE PRODUCT LIST ---
        const qb = productRepo.createQueryBuilder('product');
        
        this.applyFilters(qb, ctx, supplierChannelId, facetValueIds, term);

        // Deduplicate Parents
        qb.select('product.id', 'id');
        qb.addSelect('product.createdAt', 'createdAt'); // Required for sorting
        qb.distinct(true);
        qb.orderBy('product.createdAt', 'DESC');

        // Pagination
        const totalItems = await qb.getCount();
        const skip = options?.skip || 0;
        const take = options?.take || 25;
        qb.offset(skip).limit(take);

        // Fetch IDs
        const rawResults = await qb.getRawMany();
        const pageIds = rawResults.map(r => r.id);

        // Hydrate Data
        let items: Product[] = [];
        if (pageIds.length > 0) {
            const hydratedItems = await productRepo.find({
                where: { id: In(pageIds) },
                relations: ['featuredAsset', 'channels', 'customFields', 'facetValues']
            });
            
            // Restore Sort Order
            items = pageIds
                .map(id => hydratedItems.find(p => p.id === id))
                .filter(item => item !== undefined) as Product[];
        }

        // --- PART 2: GET FACET COUNTS (Sidebar) ---
        // We start a fresh query builder for the aggregations
        const facetQb = productRepo.createQueryBuilder('product');
        
        // 1. Re-apply the same filters (Search term, Channel, etc)
        // Note: We intentionally do NOT apply the 'facetValueIds' filter here if we want to see 
        // OTHER available facets. However, standard drill-down usually implies we DO filter.
        // For now, we apply exactly what the user selected to show remaining available options.
        this.applyFilters(facetQb, ctx, supplierChannelId, facetValueIds, term);

        // 2. Join FacetValues to count them
        facetQb.innerJoin('product.facetValues', 'count_fv');
        
        // 3. Join Translations to get the Facet Name (FIXED)
        facetQb.innerJoin('count_fv.translations', 'count_fv_trans');
        facetQb.andWhere('count_fv_trans.languageCode = :lang', { lang: ctx.languageCode });

        // 4. Select & Group
        facetQb.select('count_fv.id', 'id');
        facetQb.addSelect('count_fv_trans.name', 'name');
        facetQb.addSelect('COUNT(DISTINCT product.id)', 'count'); // Count unique products
        
        facetQb.groupBy('count_fv.id');
        facetQb.addGroupBy('count_fv_trans.name');

        const rawFacets = await facetQb.getRawMany();
        
        // Map to Schema Type
        const facets = rawFacets.map(r => ({
            facetValue: { id: r.id, name: r.name },
            count: parseInt(r.count, 10)
        }));

        return {
            items,
            totalItems,
            facets
        };
    }

    // --- STANDARD HELPER METHODS (Unchanged) ---

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