import type {Metadata} from 'next';
import {query} from '@/lib/vendure/api';
import {
    GetActiveOrderForCheckoutQuery,
    GetCustomerAddressesQuery,
    GetEligiblePaymentMethodsQuery,
    GetEligibleShippingMethodsQuery,
} from '@/lib/vendure/queries';
import {redirect} from 'next/navigation';
import CheckoutFlow from './checkout-flow';
import {CheckoutProvider} from './checkout-provider';
import {noIndexRobots} from '@/lib/metadata';
import {getActiveCustomer} from '@/lib/vendure/actions';
import {getAvailableCountriesCached} from '@/lib/vendure/cached';
import { getChannelToken } from "@/lib/channel-helper"; // 1. IMPORT HELPER

export const metadata: Metadata = {
    title: 'Checkout',
    description: 'Complete your purchase.',
    robots: noIndexRobots(),
};

export default async function CheckoutPage(_props: PageProps<'/checkout'>) {
    // 2. GET TOKEN
    const token = await getChannelToken();

    // Check if user is authenticated
    // (Note: getActiveCustomer likely needs the token too, but let's fix the main crash first)
    const customer = await getActiveCustomer();
    if (!customer) {
        redirect('/sign-in?redirectTo=/checkout');
    }

    // 3. PASS TOKEN TO EVERY QUERY
    const [orderRes, addressesRes, countries, shippingMethodsRes, paymentMethodsRes] =
        await Promise.all([
            // Fix: Active Order needs to know WHICH store's order to fetch
            query(GetActiveOrderForCheckoutQuery, {}, {
                useAuthToken: true, 
                channelToken: token 
            }),
            
            // Fix: Addresses need to be fetched for this channel context
            query(GetCustomerAddressesQuery, {}, {
                useAuthToken: true,
                channelToken: token
            }),
            
            // Fix: This was the specific error you saw
            getAvailableCountriesCached(token),
            
            // Fix: Shipping methods vary by channel
            query(GetEligibleShippingMethodsQuery, {}, {
                useAuthToken: true,
                channelToken: token
            }),
            
            // Fix: Payment methods vary by channel
            query(GetEligiblePaymentMethodsQuery, {}, {
                useAuthToken: true,
                channelToken: token
            }),
        ]);

    const activeOrder = orderRes.data.activeOrder;

    if (!activeOrder || activeOrder.lines.length === 0) {
        return redirect('/cart');
    }

    // If the order is no longer in AddingItems state, it's been completed
    if (activeOrder.state !== 'AddingItems' && activeOrder.state !== 'ArrangingPayment') {
        return redirect(`/order-confirmation/${activeOrder.code}`);
    }

    const addresses = addressesRes.data.activeCustomer?.addresses || [];
    const shippingMethods = shippingMethodsRes.data.eligibleShippingMethods || [];
    const paymentMethods =
        paymentMethodsRes.data.eligiblePaymentMethods?.filter((m) => m.isEligible) || [];

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Checkout</h1>
            <CheckoutProvider
                order={activeOrder}
                addresses={addresses}
                countries={countries}
                shippingMethods={shippingMethods}
                paymentMethods={paymentMethods}
            >
                <CheckoutFlow/>
            </CheckoutProvider>
        </div>
    );
}