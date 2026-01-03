import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router'; 
import { loadErrorMessages, loadDevMessages } from "@apollo/client/dev"; 
import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, Page, PageTitle, PageLayout, PageBlock } from '@vendure/dashboard';

const GET_MARKETPLACE_SUPPLIERS = graphql(`
    query GetMarketplaceSuppliers {
        marketplaceSuppliers {
            id
            code
            supplierProfile {
                nameCompany
                shortDescription
                aboutCompany
                commission
                logo {
                    preview
                }
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

    const navigate = useNavigate();

    const { data, isLoading: loading, error, refetch } = useQuery({
        queryKey: ['marketplaceSuppliers'],
        queryFn: async () => {
            return await api.query(GET_MARKETPLACE_SUPPLIERS, {});
        },
    });

    const { mutate: subscribe } = useMutation({
        mutationFn: (variables: { id: string }) => api.mutate(SUBSCRIBE_TO_SUPPLIER, variables),
    });

    const [statusMessage, setStatusMessage] = useState<{ msg: string, type: 'info' | 'error' } | null>(null);

    const suppliers = data?.marketplaceSuppliers || [];

    const getSupplierName = (s: any) => s.supplierProfile?.nameCompany || s.code;

    const handleSubscribe = async (id: string, name: string) => {
        try {
            setStatusMessage({ msg: `Linking ${name}'s catalog...`, type: 'info' });
            await subscribe({ id });
            setStatusMessage({ msg: `Success! ${name}'s products are syncing.`, type: 'info' });
            refetch(); 
        } catch (e: any) {
            setStatusMessage({ msg: `Failed: ${e.message}`, type: 'error' });
        }
        setTimeout(() => setStatusMessage(null), 6000);
    };

    return (
        <Page pageId="marketplace">
            <PageTitle>Supplier Marketplace</PageTitle>
            
            <PageLayout>
                {/* UPDATED LOADING STATE:
                   Replaced simple text with a centered spinner container 
                */}
                {loading ? (
                    <PageBlock column="main" blockId="loading-block">
                        <div className="flex flex-col items-center justify-center min-h-[400px]">
                            {/* Spinning circle */}
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                            {/* Pulsing text */}
                            <p className="text-gray-500 font-medium animate-pulse">Loading Marketplace...</p>
                        </div>
                    </PageBlock>
                ) : error ? (
                    <div className="p-8 text-red-600">Error: {error.message}</div>
                ) : (
                    <PageBlock column="main" blockId="marketplace-list">
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
                                                    {s.supplierProfile?.logo?.preview ? (
                                                        <img src={s.supplierProfile.logo.preview} alt={s.code} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-300 bg-gray-100">
                                                            {s.code.substring(0, 1).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900">{getSupplierName(s)}</h3>
                                                    <div className="mt-1 flex items-center">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            {s.supplierProfile?.commission || 0}% Commission
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="text-gray-600 text-sm mb-6 line-clamp-3 min-h-[4.5rem]">
                                                {s.supplierProfile?.shortDescription || "No description provided."}
                                            </div>
                                            
                                            <div className="flex flex-col space-y-3">
                                                <button
                                                    onClick={() => handleSubscribe(s.id, getSupplierName(s))}
                                                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all"
                                                >
                                                    Add Entire Catalog
                                                </button>
                                                
                                                <button
                                                    onClick={() => navigate({ to: `/marketplace/supplier/${s.id}` })}
                                                    className="w-full bg-white text-gray-700 border border-gray-300 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                                                >
                                                    View Profile & Products
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </PageBlock>
                )}
            </PageLayout>
        </Page>
    );
}