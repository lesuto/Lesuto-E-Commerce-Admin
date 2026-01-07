import { cacheLife, cacheTag } from 'next/cache';
import { query } from './api';
import { GetActiveChannelQuery, GetAvailableCountriesQuery, GetTopCollectionsQuery } from './queries';

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
    cacheLife('days');
    cacheTag('collections');
    
    // Explicitly pass token so the cache key is unique per store
    const result = await query(GetTopCollectionsQuery, {}, { channelToken });
    return result.data.collections.items;
}