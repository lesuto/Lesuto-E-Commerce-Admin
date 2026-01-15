import Link from 'next/link';
import { query } from "@/lib/vendure/api";
import { GetTopCollectionsQuery } from "@/lib/vendure/queries";
import { getChannelToken } from "@/lib/channel-helper"; // IMPORT HELPER

async function getFooterCollections() {
    // 1. Use the shared helper (No more copy-pasted fetch logic)
    const channelToken = await getChannelToken();

    // 2. Pass token to API
    const result = await query(GetTopCollectionsQuery, {}, { channelToken });
    return result.data.collections?.items || [];
}

export async function Footer() {
    const collections = await getFooterCollections();

    return (
        <footer className="border-t bg-muted/20 mt-auto">
            <div className="container py-12 mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="font-semibold mb-4">Collections</h3>
                        <ul className="space-y-2">
                            {collections.slice(0, 5).map((collection) => (
                                <li key={collection.id}>
                                    <Link 
                                        href={`/category/${collection.slug}`}
                                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        {collection.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="md:col-span-3">
                         <h3 className="font-semibold mb-4">About</h3>
                         <p className="text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} Powered By Lesuto™ – Let's Succeed Together                         </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}