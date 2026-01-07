import {getTopCollections} from '@/lib/vendure/cached';
import {
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
} from '@/components/ui/navigation-menu';
import {NavbarLink} from '@/components/layout/navbar/navbar-link';
import { getChannelToken } from "@/lib/channel-helper"; // IMPORT HELPER

export async function NavbarCollections() {
    // REMOVED "use cache" - This was crashing because it can't read headers!
    // We rely on 'getTopCollections' being cached instead.

    // 1. Get Token
    const token = await getChannelToken();

    // 2. Pass token to cached data fetcher
    const collections = await getTopCollections(token);

    return (
        <NavigationMenu>
            <NavigationMenuList>
                {collections.map((collection) => (
                    <NavigationMenuItem key={collection.slug}>
                        <NavbarLink href={`/category/${collection.slug}`}>
                            {collection.name}
                        </NavbarLink>
                    </NavigationMenuItem>
                ))}
            </NavigationMenuList>
        </NavigationMenu>
    );
}