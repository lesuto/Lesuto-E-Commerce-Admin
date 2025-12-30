import React, { useState } from 'react';
import { loadErrorMessages, loadDevMessages } from "@apollo/client/dev"; // Optional, can remove if not needed

// Use Vendure's typed graphql
import { graphql } from '@/gql';

// Import TanStack Query hook
import { useQuery, useMutation } from '@tanstack/react-query';

// Import Vendure API client
import { api } from '@vendure/dashboard';

import { Page, PageTitle, PageLayout, PageBlock } from '@vendure/dashboard';

// Define queries with typed graphql
const GET_MARKETPLACE_SUPPLIERS = graphql(`
    query GetMarketplaceSuppliers {
        marketplaceSuppliers {
            id
            code
            customFields {
                isSupplier
                commissionRate
                logoUrl
                supplierDescription
                isMarketplaceApproved
            }
        }
    }
`);

const SUBSCRIBE_TO_SUPPLIER = graphql(`
    mutation Subscribe($id: ID!) {
        subscribeToSupplier(supplierChannelId: $id)
    }
`);

export function MarketplaceComponent() {
    if (process.env.NODE_ENV !== "production") {
        loadDevMessages();
        loadErrorMessages();
    }

    // Use TanStack Query for fetching
    const { data, isLoading: loading, error, refetch } = useQuery({
        queryKey: ['marketplaceSuppliers'],
        queryFn: () => api.query(GET_MARKETPLACE_SUPPLIERS, {}), // No variables needed
    });

    // Use TanStack Mutation for mutations
    const { mutate: subscribe } = useMutation({
        mutationFn: (variables: { id: string }) => api.mutate(SUBSCRIBE_TO_SUPPLIER, variables),
    });

    const [statusMessage, setStatusMessage] = useState<{ msg: string, type: 'info' | 'error' } | null>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);

    const suppliers = data?.marketplaceSuppliers || [];

    const handleSubscribe = async (id: string, name: string) => {
        try {
            setStatusMessage({ msg: `Linking ${name}'s catalog...`, type: 'info' });
            await subscribe({ id });
            setStatusMessage({ msg: `Success! ${name}'s products are syncing.`, type: 'info' });
            setSelectedSupplier(null);
            refetch(); 
        } catch (e: any) {
            setStatusMessage({ msg: `Failed: ${e.message}`, type: 'error' });
        }
        setTimeout(() => setStatusMessage(null), 6000);
    };

    return (
        <Page pageId="marketplace">
            {/* ✅ FIX: Use PageTitle here */}
            <PageTitle>Supplier Marketplace</PageTitle>
            
            <PageLayout>
                {loading ? (
                    <div className="p-8 text-center">Loading Marketplace...</div>
                ) : error ? (
                    <div className="p-8 text-red-600">Error: {error.message}</div>
                ) : (
                    <PageBlock>
                        <div className="max-w-7xl mx-auto">
                            <div className="mb-8">
                                <p className="text-lg text-gray-600">
                                    Discover manufacturers and artisans. Add their entire inventory to your store with one click.
                                </p>
                            </div>

                            {statusMessage && (
                                <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-xl border ${statusMessage.type === 'error' ? 'bg-red-600 text-white border-red-700' : 'bg-blue-600 text-white border-blue-700'}`}>
                                    {statusMessage.msg}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {suppliers.map((s: any) => (
                                    <div key={s.id} className="group bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                                        <div className="p-6">
                                            <div className="flex items-center space-x-4 mb-6">
                                                <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                                                    {s.customFields.logoUrl ? (
                                                        <img src={s.customFields.logoUrl} alt={s.code} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-300 bg-gray-100">
                                                            {s.code.substring(0, 1).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900">{s.code}</h3>
                                                    <div className="mt-1 flex items-center">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            {s.customFields.commissionRate}% Commission
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-gray-600 text-sm mb-6 line-clamp-3 min-h-[4.5rem]">
                                                {s.customFields.supplierDescription?.replace(/<[^>]+>/g, '') || "No description provided."}
                                            </div>
                                            <div className="flex flex-col space-y-3">
                                                <button
                                                    onClick={() => handleSubscribe(s.id, s.code)}
                                                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all"
                                                >
                                                    Add Entire Catalog
                                                </button>
                                                <button
                                                    onClick={() => setSelectedSupplier(s)}
                                                    className="w-full bg-white text-gray-700 border border-gray-300 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                                                >
                                                    View Profile
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selectedSupplier && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
                                    <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center space-x-4">
                                                {selectedSupplier.customFields.logoUrl && 
                                                    <img src={selectedSupplier.customFields.logoUrl} className="w-24 h-24 rounded-2xl object-cover border" />
                                                }
                                                <div>
                                                    <h2 className="text-3xl font-bold">{selectedSupplier.code}</h2>
                                                    <p className="text-green-600 font-bold text-lg">{selectedSupplier.customFields.commissionRate}% Profit Share</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setSelectedSupplier(null)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                                        </div>
                                        <div className="prose max-w-none mb-8">
                                            <h4 className="text-gray-900 font-bold uppercase tracking-widest text-xs mb-2">About this Supplier</h4>
                                            <div dangerouslySetInnerHTML={{ __html: selectedSupplier.customFields.supplierDescription || 'No details provided.' }} />
                                        </div>
                                        <button
                                            onClick={() => handleSubscribe(selectedSupplier.id, selectedSupplier.code)}
                                            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all"
                                        >
                                            Subscribe & Sync All Products
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {suppliers.length === 0 && (
                                <div className="mt-12 text-center p-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                    <div className="text-5xl mb-4">🏪</div>
                                    <h3 className="text-xl font-bold text-gray-900">No Suppliers Available</h3>
                                    <p className="text-gray-500 max-w-xs mx-auto mt-2">
                                        Approved suppliers will appear here.
                                    </p>
                                </div>
                            )}
                        </div>
                    </PageBlock>
                )}
            </PageLayout>
        </Page>
    );
}