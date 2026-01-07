import {ProductCarousel} from "@/components/commerce/product-carousel";
import {query} from "@/lib/vendure/api";
import {GetCollectionProductsQuery} from "@/lib/vendure/queries";
import { headers } from 'next/headers';

async function getChannelToken(subdomain: string): Promise<string> {
  if (!subdomain || subdomain === 'shop' || subdomain === 'localhost') return '__default_channel__';
  const apiUrl = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query GetChannelToken($channelCode: String!) { getChannelToken(channelCode: $channelCode) }`,
        variables: { channelCode: subdomain },
      }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { data } = await response.json();
    return data?.getChannelToken || '__default_channel__';
  } catch (error) {
    console.error('Channel token error:', error);
    return '__default_channel__';
  }
}

async function getFeaturedCollectionProducts() {

    const headersList = await headers(); // Add await
    const host = headersList.get('host') || 'shop.lesuto.local';
    const subdomain = host.split('.')[0].toLowerCase();

    const channelToken = await getChannelToken(subdomain);

    // Fetch featured products from a specific collection
    // Replace 'electronics' with your actual collection slug
    const result = await query(GetCollectionProductsQuery, {
        slug: "electronics",
        input: {
            collectionSlug: "electronics",
            take: 12,
            skip: 0,
            groupByProduct: true
        }
    }, { channelToken });

    return result.data.search.items;
}

export async function FeaturedProducts() {
    const products = await getFeaturedCollectionProducts();

    return (
        <ProductCarousel
            title="Featured Products"
            products={products}
        />
    )
}