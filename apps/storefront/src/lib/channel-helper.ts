import { cache } from 'react';
import { headers } from 'next/headers';

// Helper to pause execution for a few milliseconds (backoff)
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getChannelToken = cache(async () => {
    try {
        const headersList = await headers();
        const host = headersList.get('host') || '';
        
        // Parse Subdomain
        const subdomain = host.split(':')[0].split('.')[0].toLowerCase();

        // Return empty for defaults
        if (!subdomain || subdomain === 'shop' || subdomain === 'localhost' || subdomain === 'www') {
            return '';
        }

        // Use 127.0.0.1 for local dev
        const apiUrl = (process.env.VENDURE_SHOP_API_URL || 'http://127.0.0.1:3000/shop-api').replace('localhost', '127.0.0.1');

        // RETRY LOGIC (Simplified: No Timeout Signal)
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: `query GetChannelToken($channelCode: String!) { getChannelToken(channelCode: $channelCode) }`,
                        variables: { channelCode: subdomain },
                    }),
                    // Cache for 1 hour to prevent hitting DB constantly
                    next: { revalidate: 3600 } 
                });

                if (!response.ok) throw new Error(`Status ${response.status}`);

                const { data } = await response.json();
                return data?.getChannelToken || '';

            } catch (error) {
                // If it fails, wait a bit and try again
                if (attempt < 3) {
                    await wait(300 * attempt); 
                    continue; 
                }
                // Only log if it truly fails after 3 tries
                console.error(`Failed to get token for ${subdomain} after 3 attempts.`);
            }
        }
        return '';

    } catch (error) {
        // Silent fail for other header parsing errors
        return '';
    }
});