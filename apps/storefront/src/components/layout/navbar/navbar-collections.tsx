import { getTopCollections } from '@/lib/vendure/cached';
import { getChannelToken } from "@/lib/channel-helper";
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';

export async function NavbarCollections() {
    const token = await getChannelToken();
    const collections = await getTopCollections(token);

    if (!collections || collections.length === 0) return null;

    return (
        <NavigationMenu>
            <NavigationMenuList>
                {collections.map((collection) => {
                    // Safety check
                    const hasChildren = collection.children && collection.children.length > 0;

                    return (
                        <NavigationMenuItem key={collection.id}>
                            {hasChildren ? (
                                <>
                                    <NavigationMenuTrigger>{collection.name}</NavigationMenuTrigger>
                                    <NavigationMenuContent>
                                        <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                                            <li className="col-span-2 border-b pb-2 mb-2">
                                                <NavigationMenuLink asChild>
                                                    <Link
                                                        href={`/collection/${collection.slug}`}
                                                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                                    >
                                                        <div className="text-sm font-medium leading-none">
                                                            All {collection.name}
                                                        </div>
                                                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                                            View all products in {collection.name}
                                                        </p>
                                                    </Link>
                                                </NavigationMenuLink>
                                            </li>

                                            {/* FIX: Add optional chaining (?.) here */}
                                            {collection.children?.map((child) => (
                                                <ListItem
                                                    key={child.id}
                                                    title={child.name}
                                                    href={`/collection/${child.slug}`}
                                                >
                                                </ListItem>
                                            ))}
                                        </ul>
                                    </NavigationMenuContent>
                                </>
                            ) : (
                                <Link href={`/collection/${collection.slug}`} legacyBehavior passHref>
                                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                        {collection.name}
                                    </NavigationMenuLink>
                                </Link>
                            )}
                        </NavigationMenuItem>
                    );
                })}
            </NavigationMenuList>
        </NavigationMenu>
    );
}

// Helper Component (No changes needed here)
const ListItem = ({ className, title, children, href, ...props }: any) => {
    return (
        <li>
            <NavigationMenuLink asChild>
                <Link
                    href={href}
                    className={cn(
                        "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                        className
                    )}
                    {...props}
                >
                    <div className="text-sm font-medium leading-none">{title}</div>
                    <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        {children}
                    </p>
                </Link>
            </NavigationMenuLink>
        </li>
    );
};