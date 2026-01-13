import { Injectable } from '@nestjs/common';
import {
    RequestContext,
    TransactionalConnection,
    Product,
    ProductVariant,
    ID,
    ChannelService,
    ProductEvent,
    EventBus
} from '@vendure/core';
import { ProductListOptions } from '@vendure/common/lib/generated-types';
import { In, Brackets, SelectQueryBuilder } from 'typeorm'; 

@Injectable()
export class MerchantInventoryService {
    constructor(
        private connection: TransactionalConnection,
        private channelService: ChannelService,
        private eventBus: EventBus
    ) { }

    /**
     * Shared filter logic for main list and all aggregations
     */
    private applyInventoryFilters(
        qb: SelectQueryBuilder<Product>, 
        ctx: RequestContext, 
        collectionId?: ID, 
        facetValueIds?: string[], 
        supplierCodes?: string[],
        term?: string,
        stock?: string
    ) {
        // 1. SCOPE: Current Merchant Channel ONLY
        qb.innerJoin('product.channels', 'channel', 'channel.id = :channelId', { channelId: ctx.channelId });
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

        // 5. Supplier Filter (Owner Company)
        if (supplierCodes && supplierCodes.length > 0) {
             qb.andWhere('product.customFields.ownercompany IN (:...owners)', { owners: supplierCodes });
        }

        // 6. Stock Filter
        if (stock === 'in-stock') {
            qb.andWhere('product.enabled = :isEnabled', { isEnabled: true });
            qb.andWhere((qb) => {
                const subQuery = qb.subQuery().select('1').from(ProductVariant, 'v')
                    .leftJoin('v.stockLevels', 'sl') 
                    .where('v.productId = product.id').andWhere('sl.stockOnHand > 0').getQuery();
                return `EXISTS ${subQuery}`;
            });
        } else if (stock === 'out-of-stock') {
            qb.andWhere('product.enabled = :isEnabled', { isEnabled: true });
            qb.andWhere((qb) => {
                const subQuery = qb.subQuery().select('1').from(ProductVariant, 'v')
                    .leftJoin('v.stockLevels', 'sl')
                    .where('v.productId = product.id').andWhere('sl.stockOnHand > 0').getQuery();
                return `NOT EXISTS ${subQuery}`;
            });
        }

        return qb;
    }

    async getMyInventory(
        ctx: RequestContext, 
        options?: ProductListOptions,
        collectionId?: ID,
        facetValueIds?: string[],
        supplierCodes?: string[],
        term?: string,
        stock?: string
    ) {
        const productRepo = this.connection.getRepository(ctx, Product);

        // Helper to instantiate a fresh QB with filters applied
        const buildQb = () => {
             const qb = productRepo.createQueryBuilder('product');
             return this.applyInventoryFilters(qb, ctx, collectionId, facetValueIds, supplierCodes, term, stock);
        };

        // --- 1. Main Product List ---
        const mainQb = buildQb();
        mainQb.select('product.id', 'id')
              .addSelect('product.createdAt', 'createdAt')
              .distinct(true)
              .orderBy('product.createdAt', 'DESC')
              .offset(options?.skip || 0)
              .limit(options?.take || 25);

        // --- 2. Aggregation: Collections ---
        // Pass undefined for collectionId so we see other available collections
        const colQb = productRepo.createQueryBuilder('product');
        this.applyInventoryFilters(colQb, ctx, undefined, facetValueIds, supplierCodes, term, stock);
        
        colQb.innerJoin('product.variants', 'cv')
             .innerJoin('cv.collections', 'cc')
             .innerJoin('cc.translations', 'cct')
             .andWhere('cct.languageCode = :lang', { lang: ctx.languageCode })
             .select('cc.id', 'id')
             .addSelect('cct.name', 'name')
             .addSelect('COUNT(DISTINCT product.id)', 'count')
             .groupBy('cc.id')
             .addGroupBy('cct.name');

        // --- 3. Aggregation: Facets ---
        // Pass undefined for facetValueIds
        const facQb = productRepo.createQueryBuilder('product');
        this.applyInventoryFilters(facQb, ctx, collectionId, undefined, supplierCodes, term, stock);

        facQb.innerJoin('product.facetValues', 'cfv')
             .innerJoin('cfv.translations', 'cfvt')
             .andWhere('cfvt.languageCode = :lang', { lang: ctx.languageCode })
             .select('cfv.id', 'id')
             .addSelect('cfvt.name', 'name')
             .addSelect('COUNT(DISTINCT product.id)', 'count')
             .groupBy('cfv.id')
             .addGroupBy('cfvt.name');

        // --- 4. Aggregation: Suppliers (OwnerCompany) ---
        // Pass undefined for supplierCodes
        const supQb = productRepo.createQueryBuilder('product');
        this.applyInventoryFilters(supQb, ctx, collectionId, facetValueIds, undefined, term, stock);

        supQb.select('product.customFields.ownercompany', 'name')
             .addSelect('COUNT(DISTINCT product.id)', 'count')
             .where('product.customFields.ownercompany IS NOT NULL')
             .groupBy('product.customFields.ownercompany');

        // --- EXECUTE QUERIES PARALLEL ---
        const [rawItems, totalItems, rawCols, rawFacets, rawSuppliers] = await Promise.all([
            mainQb.getRawMany(),
            mainQb.getCount(),
            colQb.getRawMany(),
            facQb.getRawMany(),
            supQb.getRawMany()
        ]);

        // --- HYDRATE ENTITIES ---
        const pageIds = rawItems.map((r: any) => r.id);
        let items: Product[] = [];
        if (pageIds.length > 0) {
            const hydrated = await productRepo.find({
                where: { id: In(pageIds) },
                relations: ['featuredAsset', 'channels', 'customFields', 'variants', 'variants.stockLevels', 'facetValues']
            });
            // Map back to preserve order
            items = pageIds.map((id: any) => hydrated.find(p => p.id === id)).filter((x: any) => x) as Product[];
        }

        return { 
            items, 
            totalItems, 
            collections: rawCols.map((r: any) => ({ collection: { id: r.id, name: r.name }, count: +r.count })), 
            facets: rawFacets.map((r: any) => ({ facetValue: { id: r.id, name: r.name }, count: +r.count })),
            suppliers: rawSuppliers.map((r: any) => ({ name: r.name, count: +r.count }))
        };
    }

    async removeProductFromInventory(ctx: RequestContext, productId: ID): Promise<boolean> {
        const product = await this.connection.getEntityOrThrow(ctx, Product, productId);
        
        // Remove from product_channels
        await this.channelService.removeFromChannels(ctx, Product, productId, [ctx.channelId]);
        
        // Also remove variants to ensure clean detachment
        const productWithVariants = await this.connection.getEntityOrThrow(ctx, Product, productId, { relations: ['variants'] });
        for (const variant of productWithVariants.variants) {
            await this.channelService.removeFromChannels(ctx, ProductVariant, variant.id, [ctx.channelId]);
        }

        // Fire event so search index updates immediately
        this.eventBus.publish(new ProductEvent(ctx, product, 'updated'));
        
        return true;
    }
}