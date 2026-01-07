import {getTopCollections} from '@/lib/vendure/cached';
import Image from "next/image";
import Link from "next/link";
import { headers } from 'next/headers';
import { DEFAULT_CONTENT } from '@/app/providers/channel-provider';

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

async function getCmsContent(channelToken: string): Promise<typeof DEFAULT_CONTENT> {
  const apiUrl = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'vendure-token': channelToken,
      },
      body: JSON.stringify({
        query: `query GetCmsPage($slug: String!) { page(slug: $slug) { blocks } }`,
        variables: { slug: 'home' },
      }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { data } = await response.json();
    return { ...DEFAULT_CONTENT, ...data?.page?.blocks };
  } catch (error) {
    console.error('CMS error:', error);
    return DEFAULT_CONTENT;
  }
}

async function Copyright() {
    return (
        <div>
            © {new Date().getFullYear()} Vendure Store. All rights reserved.
        </div>
    )
}

export async function Footer() {
    const headersList = await headers();
    const host = headersList.get('host') || 'shop.lesuto.local';
    const subdomain = host.split('.')[0].toLowerCase();

    const channelToken = await getChannelToken(subdomain);
    const cmsContent = await getCmsContent(channelToken);
    const collections = await getTopCollections();

    return (
        <footer className="border-t border-border mt-auto">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <p className="text-sm font-semibold mb-4 uppercase tracking-wider">
                            Vendure Store
                        </p>
                    </div>

                    <div>
                        <p className="text-sm font-semibold mb-4">Categories</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {collections.map((collection) => (
                                <li key={collection.id}>
                                    <Link
                                        href={`/collection/${collection.slug}`}
                                        className="hover:text-foreground transition-colors"
                                    >
                                        {collection.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold mb-4">Vendure</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <a
                                    href="https://github.com/vendure-ecommerce"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-foreground transition-colors"
                                >
                                    GitHub
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://docs.vendure.io"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-foreground transition-colors"
                                >
                                    Documentation
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/vendure-ecommerce/vendure"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-foreground transition-colors"
                                >
                                    Source code
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Section */}
                <div
                    className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <Copyright/>
                    <div className="flex items-center gap-2">
                        <span>Powered by</span>
                        <a
                            href="https://vendure.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground transition-colors"
                        >
                            <Image src="/vendure.svg" alt="Vendure" width={40} height={27} className="h-4 w-auto dark:invert" />
                        </a>
                        <span>&</span>
                        <a
                            href="https://nextjs.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground transition-colors"
                        >
                            <Image src="/next.svg" alt="Next.js" width={16} height={16} className="h-5 w-auto dark:invert" />
                        </a>
                    </div>
                </div>
            </div>
            <section className="py-8 bg-gray-800 text-white text-center">
              <p>Contact: {cmsContent.contactEmail}</p>
            </section>
            <section className="py-16">
              <div className="container mx-auto px-4">
                <h2 className="text-3xl font-semibold mb-4">About Us</h2>
                <p className="text-muted-foreground">{cmsContent.aboutUs}</p>
              </div>
            </section>
        </footer>
    );
}