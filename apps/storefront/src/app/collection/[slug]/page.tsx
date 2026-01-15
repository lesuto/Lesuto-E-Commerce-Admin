import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { query } from '@/lib/vendure/api';
import { SearchProductsQuery, GetCollectionProductsQuery } from '@/lib/vendure/queries';
import { ProductGrid } from '@/components/commerce/product-grid';
import { FacetFilters } from '@/components/commerce/facet-filters';
import { ProductGridSkeleton } from '@/components/shared/product-grid-skeleton';
import { buildSearchInput, getCurrentPage } from '@/lib/search-helpers';
import { cacheLife, cacheTag } from 'next/cache';
import { SITE_NAME, truncateDescription, buildCanonicalUrl, buildOgImages } from '@/lib/metadata';
import { getChannelToken } from "@/lib/channel-helper";

// 1. FETCH PRODUCTS (Efficient Promise-based)
async function getCollectionProducts(slug: string, searchParams: { [key: string]: string | string[] | undefined }, channelToken: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`collection-products-${slug}`, channelToken);

    return query(SearchProductsQuery, {
        input: buildSearchInput({ searchParams, collectionSlug: slug })
    }, { channelToken });
}

// 2. FETCH METADATA & CHILDREN
async function getCollectionMetadata(slug: string, channelToken: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`collection-meta-${slug}`, channelToken);

    return query(GetCollectionProductsQuery, {
        slug,
        input: { take: 0, collectionSlug: slug, groupByProduct: true },
    }, { channelToken });
}

export async function generateMetadata({ params }: PageProps<'/collection/[slug]'>): Promise<Metadata> {
    const { slug } = await params;
    const token = await getChannelToken();
    
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
    };
}

export default async function CollectionPage({params, searchParams}: PageProps<'/collection/[slug]'>) {
    const { slug } = await params;
    const searchParamsResolved = await searchParams;
    const page = getCurrentPage(searchParamsResolved);
    const token = await getChannelToken();

    // 1. Fetch Collection Details (Name, Children, Description)
    const result = await getCollectionMetadata(slug, token);
    const collection = result.data.collection;

    if (!collection) notFound();

    // 2. Start Fetching Products (Background)
    const productDataPromise = getCollectionProducts(slug, searchParamsResolved, token);

    return (
        <div className="container mx-auto px-4 py-8 mt-16">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold tracking-tight mb-4">{collection.name}</h1>
                {collection.description && (
                    <div 
                        className="prose prose-neutral dark:prose-invert mx-auto max-w-2xl mb-8"
                        dangerouslySetInnerHTML={{ __html: collection.description }} 
                    />
                )}
            </div>

            {/* --- NEW: SUB-COLLECTION GRID --- */}
            {collection.children && collection.children.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-xl font-semibold mb-6 text-center">Shop by Category</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 justify-center">
                        {collection.children.map((child) => (
                            <Link 
                                key={child.id} 
                                href={`/collection/${child.slug}`}
                                className="group flex flex-col items-center text-center p-4 rounded-lg bg-secondary/20 hover:bg-secondary/50 transition border border-transparent hover:border-border"
                            >
                                <div className="relative w-20 h-20 mb-3 rounded-full overflow-hidden bg-white shadow-sm ring-1 ring-border">
                                    {child.featuredAsset ? (
                                        <Image 
                                            src={child.featuredAsset.preview} 
                                            alt={child.name}
                                            fill
                                            className="object-cover group-hover:scale-110 transition"
                                            sizes="(max-width: 768px) 100vw, 150px"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gray-50">
                                            {/* Simple Folder Icon */}
                                            <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                        </div>
                                    )}
                                </div>
                                <span className="text-sm font-medium group-hover:text-primary">{child.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
            {/* -------------------------------- */}

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