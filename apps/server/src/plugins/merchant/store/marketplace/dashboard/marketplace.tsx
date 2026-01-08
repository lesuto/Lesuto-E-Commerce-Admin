import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { loadErrorMessages, loadDevMessages } from "@apollo/client/dev";
import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, Page, PageTitle, PageLayout, PageBlock } from '@vendure/dashboard';
import { CategoryCard, StatusToast } from '../../../../../custom-ui-components';

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
                logo { preview }
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
    const [statusMessage, setStatusMessage] = useState<{ msg: string, type: 'info' | 'error' | 'success' } | null>(null);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['marketplaceSuppliers'],
        queryFn: () => api.query(GET_MARKETPLACE_SUPPLIERS, {}),
    });

    const { mutate: subscribe } = useMutation({
        mutationFn: (variables: { id: string }) => api.mutate(SUBSCRIBE_TO_SUPPLIER, variables),
    });

    const suppliers = data?.marketplaceSuppliers || [];
    const getSupplierName = (s: any) => s.supplierProfile?.nameCompany || s.code;

    const handleSubscribe = async (id: string, name: string) => {
        setStatusMessage({ msg: `Linking ${name}'s catalog...`, type: 'info' });
        try {
            await subscribe({ id });
            setStatusMessage({ msg: `Success! ${name} synced.`, type: 'success' });
            refetch();
        } catch (e: any) {
            setStatusMessage({ msg: `Failed: ${e.message}`, type: 'error' });
        }
    };

    return (
        <Page pageId="marketplace">
            <PageTitle>Supplier Marketplace</PageTitle>
            <PageLayout>
                {isLoading ? (
                    <PageBlock column='main'>
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    </PageBlock>
                ) : error ? (
                    <div className="p-8 text-red-600">Error: {error.message}</div>
                ) : (
                    <PageBlock column="main">
                        <div className="mb-8 max-w-7xl mx-auto">
                            <p className="text-lg text-gray-600 mb-6">
                                Discover manufacturers. Add their inventory to your store.
                            </p>

                            {/* CATEGORY CARD GRID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {suppliers.map((s: any) => (
                                    <CategoryCard
                                        key={s.id}
                                        name={s.supplierProfile?.nameCompany || s.code}
                                        logo={s.supplierProfile?.logo?.preview}
                                        commission={s.supplierProfile?.commission || 0}
                                        description={s.supplierProfile?.shortDescription || "No description provided."}
                                        onAddCatalog={() => handleSubscribe(s.id, s.code)}
                                        onViewProfile={() => navigate({ to: `/marketplace/supplier/${s.id}` })}
                                    />
                                ))}
                            </div>
                        </div>
                    </PageBlock>
                )}
            </PageLayout>
            {statusMessage && <StatusToast message={statusMessage.msg} type={statusMessage.type} onDismiss={() => setStatusMessage(null)} />}
        </Page>
    );
}