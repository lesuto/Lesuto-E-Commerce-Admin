import type { Metadata } from "next";
import { HeroSection } from "@/components/layout/hero-section";
import { FeaturedProducts } from "@/components/commerce/featured-products";
import { SITE_NAME, buildCanonicalUrl } from "@/lib/metadata";
import { getChannelToken } from "@/lib/channel-helper"; // 1. IMPORT HELPER

export const metadata: Metadata = {
    title: { absolute: `${SITE_NAME} - Your One-Stop Shop` },
    alternates: { canonical: buildCanonicalUrl("/") },
};

export default async function Home(_props: PageProps<'/'>) {
    // 2. GET TOKEN
    const token = await getChannelToken();

    return (
        <div className="min-h-screen">
            <HeroSection />

            {/* 3. PASS TOKEN TO FEATURED PRODUCTS */}
            {/* Note: We need to make sure FeaturedProducts accepts this prop next! */}
            <FeaturedProducts channelToken={token} />

            <section className="py-16 bg-muted/30">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-4">Shop by Collection</h2>
                    <p className="text-muted-foreground mb-8">
                        Discover our curated selections designed just for you.
                    </p>
                </div>
            </section>
        </div>
    );
}