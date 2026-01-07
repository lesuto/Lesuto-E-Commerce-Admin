import type {Metadata} from 'next';
import {Cart} from "@/app/cart/cart";
import {Suspense} from "react";
import {CartSkeleton} from "@/components/shared/skeletons/cart-skeleton";
import {noIndexRobots} from '@/lib/metadata';
import { getChannelToken } from "@/lib/channel-helper"; // 1. IMPORT

export const metadata: Metadata = {
    title: 'Shopping Cart',
    description: 'Review items in your shopping cart.',
    robots: noIndexRobots(),
};

export default async function CartPage(_props: PageProps<'/cart'>) {
    // 2. GET TOKEN
    const token = await getChannelToken();

    return (
        <div className="container mx-auto px-4 py-20">
            <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

            <Suspense fallback={<CartSkeleton />}>
                {/* 3. PASS TOKEN */}
                <Cart channelToken={token}/>
            </Suspense>
        </div>
    );
}