import { ProductCarousel } from "@/components/commerce/product-carousel";
import { query } from "@/lib/vendure/api";
import { GetCollectionProductsQuery } from "@/lib/vendure/queries";

// 1. ADD INTERFACE
interface FeaturedProductsProps {
    channelToken: string;
}

// 2. ACCEPT THE PROP
export async function FeaturedProducts({ channelToken }: FeaturedProductsProps) {
    
    // 3. USE THE TOKEN IN THE QUERY
    // Note: You might want to change "electronics" to a dynamic slug later, 
    // or ensure every store has a collection with this slug.
    const result = await query(GetCollectionProductsQuery, {
        slug: "electronics", 
        input: {
            collectionSlug: "electronics",
            take: 12,
            skip: 0,
            groupByProduct: true
        }
    }, { channelToken }); // <--- PASS TOKEN HERE

    const products = result.data.search?.items || [];

    return (
        <ProductCarousel
            title="Featured Products"
            products={products}
        />
    )
}