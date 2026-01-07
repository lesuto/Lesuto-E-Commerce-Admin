import type { Metadata } from 'next';
import { Suspense } from 'react';
import { query } from '@/lib/vendure/api';
import { SearchProductsQuery, GetCollectionProductsQuery } from '@/lib/vendure/queries';
import { ProductGrid } from '@/components/commerce/product-grid';
import { FacetFilters } from '@/components/commerce/facet-filters';
import { ProductGridSkeleton } from '@/components/shared/product-grid-skeleton';
import { buildSearchInput, getCurrentPage } from '@/lib/search-helpers';
import { cacheLife, cacheTag } from 'next/cache';
import { SITE_NAME, truncateDescription, buildCanonicalUrl, buildOgImages } from '@/lib/metadata';
import { getChannelToken } from "@/lib/channel-helper"; // 1. IMPORT

// 2. UPDATE FUNCTION SIGNATURE
async function getCollectionProducts(slug: string, searchParams: { [key: string]: string | string[] | undefined }, channelToken: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`collection-${slug}`);

    // Pass token
    return query(SearchProductsQuery, {
        input: buildSearchInput({ searchParams, collectionSlug: slug })
    }, { channelToken });
}

// 2. UPDATE FUNCTION SIGNATURE
async function getCollectionMetadata(slug: string, channelToken: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`collection-meta-${slug}`);

    // Pass token
    return query(GetCollectionProductsQuery, {
        slug,
        input: { take: 0, collectionSlug: slug, groupByProduct: true },
    }, { channelToken });
}

export async function generateMetadata({ params }: PageProps<'/collection/[slug]'>): Promise<Metadata> {
    const { slug } = await params;
    const token = await getChannelToken(); // Get token for metadata
    
    const result = await getCollectionMetadata(slug, token);
    const collection = result.data.collection;

    if (!collection) return { title: 'Collection Not Found' };

    const description = truncateDescription(collection.description) || `Browse our ${collection.name} collection at ${SITE_NAME}`;

    return {
        title: collection.name,
        description,
        alternates: { canonical: buildCanonicalUrl(`/collection/${collection.slug}`) },
        openGraph: {
            title: collection.name,
            description,
            type: 'website',
            url: buildCanonicalUrl(`/collection/${collection.slug}`),
            images: buildOgImages(collection.featuredAsset?.preview, collection.name),
        },
        twitter: {
            card: 'summary_large_image',
            title: collection.name,
            description,
            images: collection.featuredAsset?.preview ? [collection.featuredAsset.preview] : undefined,
        },
    };
}

export default async function CollectionPage({params, searchParams}: PageProps<'/collection/[slug]'>) {
    const { slug } = await params;
    const searchParamsResolved = await searchParams;
    const page = getCurrentPage(searchParamsResolved);

    // 3. GET TOKEN
    const token = await getChannelToken();

    // 4. PASS TOKEN TO CACHED FUNCTION
    const productDataPromise = getCollectionProducts(slug, searchParamsResolved, token);

    return (
        <div className="container mx-auto px-4 py-8 mt-16">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <aside className="lg:col-span-1">
                    <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
                        <FacetFilters productDataPromise={productDataPromise} />
                    </Suspense>
                </aside>
                <div className="lg:col-span-3">
                    <Suspense fallback={<ProductGridSkeleton />}>
                        <ProductGrid productDataPromise={productDataPromise} currentPage={page} take={12} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}