import type { Metadata } from 'next';
import { query } from '@/lib/vendure/api';
import { GetProductDetailQuery } from '@/lib/vendure/queries';
import { ProductImageCarousel } from '@/components/commerce/product-image-carousel';
import { ProductInfo } from '@/components/commerce/product-info';
import { RelatedProducts } from '@/components/commerce/related-products';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { notFound } from 'next/navigation';
import { cacheLife, cacheTag } from 'next/cache';
import { SITE_NAME, truncateDescription, buildCanonicalUrl, buildOgImages } from '@/lib/metadata';
import { getChannelToken } from "@/lib/channel-helper"; // 1. IMPORT

// 2. UPDATE CACHED FUNCTION TO ACCEPT TOKEN
async function getProductData(slug: string, channelToken: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`product-${slug}`);

    // Pass token to API
    return await query(GetProductDetailQuery, { slug }, { channelToken });
}

export async function generateMetadata({
    params,
}: PageProps<'/product/[slug]'>): Promise<Metadata> {
    const { slug } = await params;
    // Note: Metadata might need token too, but for now we skip to avoid async overhead if not critical
    // Or you can fetch it: const token = await getChannelToken();
    // For now, we leave metadata as is to prevent complexity, or use default channel.
    const token = await getChannelToken();
    const result = await getProductData(slug, token);
    const product = result.data.product;

    if (!product) return { title: 'Product Not Found' };

    const description = truncateDescription(product.description);
    const ogImage = product.assets?.[0]?.preview;

    return {
        title: product.name,
        description: description || `Shop ${product.name} at ${SITE_NAME}`,
        alternates: { canonical: buildCanonicalUrl(`/product/${product.slug}`) },
        openGraph: {
            title: product.name,
            description: description || `Shop ${product.name} at ${SITE_NAME}`,
            type: 'website',
            url: buildCanonicalUrl(`/product/${product.slug}`),
            images: buildOgImages(ogImage, product.name),
        },
        twitter: {
            card: 'summary_large_image',
            title: product.name,
            description: description || `Shop ${product.name} at ${SITE_NAME}`,
            images: ogImage ? [ogImage] : undefined,
        },
    };
}

export default async function ProductDetailPage({params, searchParams}: PageProps<'/product/[slug]'>) {
    const { slug } = await params;
    const searchParamsResolved = await searchParams;

    // 3. GET TOKEN & PASS TO FUNCTION
    const token = await getChannelToken();
    const result = await getProductData(slug, token);

    const product = result.data.product;

    if (!product) notFound();

    const primaryCollection = product.collections?.find(c => c.parent?.id) ?? product.collections?.[0];

    return (
        <>
            <div className="container mx-auto px-4 py-8 mt-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    <div className="lg:sticky lg:top-20 lg:self-start">
                        <ProductImageCarousel images={product.assets} />
                    </div>
                    <div>
                        <ProductInfo product={product} searchParams={searchParamsResolved} />
                    </div>
                </div>
            </div>

            {/* Benefits & FAQ Sections (Unchanged) */}
            <section className="py-16 bg-muted/30 mt-12">
                {/* ... (Keep your existing static JSX here) ... */}
                 <div className="container mx-auto px-4">
                    <h2 className="text-2xl font-bold text-center mb-8">Why Choose Us</h2>
                    {/* ... truncated for brevity, paste your SVG section here ... */}
                </div>
            </section>
            
            <section className="py-16 bg-muted/30">
                 {/* ... (Keep your FAQ JSX here) ... */}
                 <div className="container mx-auto px-4 max-w-3xl">
                    <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
                    <Accordion type="single" collapsible className="w-full">
                        {/* ... items ... */}
                         <AccordionItem value="shipping"><AccordionTrigger>What are your shipping options?</AccordionTrigger><AccordionContent>We offer standard shipping...</AccordionContent></AccordionItem>
                         <AccordionItem value="returns"><AccordionTrigger>What is your return policy?</AccordionTrigger><AccordionContent>We accept returns within 30 days...</AccordionContent></AccordionItem>
                    </Accordion>
                </div>
            </section>

            {primaryCollection && (
                <RelatedProducts
                    collectionSlug={primaryCollection.slug}
                    currentProductId={product.id}
                    // 4. PASS TOKEN HERE (You'll need to update RelatedProducts to accept it next)
                    // channelToken={token} 
                />
            )}
        </>
    );
}