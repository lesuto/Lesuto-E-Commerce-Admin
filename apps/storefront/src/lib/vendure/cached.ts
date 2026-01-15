import { cacheLife, cacheTag } from 'next/cache';
import { query } from './api';
import { GetActiveChannelQuery, GetAvailableCountriesQuery, GetTopCollectionsQuery, GetCollectionProductsQuery } from './queries';

// 1. ACTIVE CHANNEL
export async function getActiveChannelCached(channelToken: string) {
    'use cache';
    cacheLife('hours');
    const result = await query(GetActiveChannelQuery, {}, { channelToken });
    return result.data.activeChannel;
}

// 2. COUNTRIES
export async function getAvailableCountriesCached(channelToken: string) {
    'use cache';
    cacheLife('max');
    cacheTag('countries');
    const result = await query(GetAvailableCountriesQuery, {}, { channelToken });
    return result.data.availableCountries || [];
}

// 3. TOP COLLECTIONS (Used in Navbar/Footer)
export async function getTopCollections(channelToken: string) {
    'use cache';
    cacheTag('collections', channelToken);
    cacheLife('days');
    
    // FIX: You were passing {} (empty), but Vendure needs the 'topLevelOnly' option
    // to know which collections to return for the menu.
    const result = await query(GetTopCollectionsQuery, 
        { options: { topLevelOnly: true } }, // <--- ADD THIS
        { channelToken }
    );
    
    console.log(`[Collections] Token: ${channelToken}, Found: ${result?.data?.collections?.items?.length}`);
    
    return result.data.collections.items;
}

export async function getCollectionProducts(slug: string, page = 1, channelToken: string) {
    'use cache';
    // 1. Tag cache with BOTH slug and token to prevent data mixing between stores
    cacheTag(`collection-${slug}`, channelToken);
    cacheLife('hours');

    const result = await query(
        GetCollectionProductsQuery,
        { 
            slug, 
            input: { 
                take: 24, 
                skip: (page - 1) * 24,
                groupByProduct: true 
            } 
        },
        // 2. CRITICAL: Inject the token into the API request
        { channelToken }
    );

    return {
        collection: result.data.collection,
        search: result.data.search
    };
}