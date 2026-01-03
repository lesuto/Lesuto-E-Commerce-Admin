import React, { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, Page, PageLayout, PageBlock, PageTitle } from '@vendure/dashboard';
import { Plus, Trash2, Eye, X, ArrowLeft } from 'lucide-react';

interface SupplierProduct {
    id: string;
    name: string;
    slug: string;
    enabled: boolean;
    featuredAsset?: { preview: string };
    channels: { id: string }[];
}

interface SupplierData {
    id: string;
    code: string;
    supplierProfile?: {
        nameCompany?: string;
        aboutCompany?: string;
        logo?: { preview: string };
    };
}

const GET_SUPPLIER_DETAILS = graphql(`
    query GetSupplierDetails($id: ID!) {
        supplier(supplierChannelId: $id) {
            id
            code
            supplierProfile {
                nameCompany
                aboutCompany
                logo { preview }
            }
        }
        supplierProducts(supplierChannelId: $id) {
            id
            name
            slug
            enabled
            featuredAsset { preview }
            channels { id } 
        }
        activeChannel { id } 
    }
`);

const ADD_PRODUCT = graphql(`
    mutation AddMarketplaceProduct($productId: ID!) {
        addMarketplaceProduct(productId: $productId)
    }
`);

const REMOVE_PRODUCT = graphql(`
    mutation RemoveMarketplaceProduct($productId: ID!) {
        removeMarketplaceProduct(productId: $productId)
    }
`);

export function SupplierDetailComponent() {
    const { id } = useParams({ strict: false });
    const navigate = useNavigate();

    const [viewProduct, setViewProduct] = useState<SupplierProduct | null>(null);

    const { data, refetch, isLoading } = useQuery({
        queryKey: ['supplier', id],
        queryFn: () => api.query(GET_SUPPLIER_DETAILS, { id: id! }),
        enabled: !!id,
    });

    const { mutate: addProduct } = useMutation({
        mutationFn: (variables: { productId: string }) => api.mutate(ADD_PRODUCT, variables),
        onSuccess: () => refetch(),
    });

    const { mutate: removeProduct } = useMutation({
        mutationFn: (variables: { productId: string }) => api.mutate(REMOVE_PRODUCT, variables),
        onSuccess: () => refetch(),
    });

    if (isLoading) return <div className="p-8">Loading Supplier...</div>;

    const supplier = data?.supplier as SupplierData | undefined;
    const products = (data?.supplierProducts || []) as SupplierProduct[];
    const currentChannelId = data?.activeChannel?.id;

    const isAdded = (p: SupplierProduct) => p.channels.some((c) => c.id === currentChannelId);

    const toggleProduct = (p: SupplierProduct) => {
        if (isAdded(p)) {
            if (confirm(`Remove ${p.name} from your store?`)) {
                removeProduct({ productId: p.id });
            }
        } else {
            addProduct({ productId: p.id });
        }
    };

    return (
        <Page pageId="supplier-detail">
            <PageTitle>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate({ to: '/marketplace' })}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                        title="Back to Marketplace"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <span>{supplier?.supplierProfile?.nameCompany || supplier?.code || 'Supplier Detail'}</span>
                </div>
            </PageTitle>

            <PageLayout>
                {/* FIX: Added column and blockId */}
                <PageBlock column="main" blockId="supplier-profile-info">
                    <div className="flex flex-col md:flex-row gap-8 mb-8">
                        {supplier?.supplierProfile?.logo?.preview && (
                            <img
                                src={supplier.supplierProfile.logo.preview}
                                className="w-32 h-32 rounded-xl object-cover border border-gray-200"
                                alt="Logo"
                            />
                        )}
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold mb-4">About the Business</h2>
                            <div className="prose max-w-none text-gray-600 whitespace-pre-wrap">
                                {supplier?.supplierProfile?.aboutCompany || "No detailed description provided."}
                            </div>
                        </div>
                    </div>
                </PageBlock>

                {/* FIX: Added column and blockId */}
                <PageBlock column="main" blockId="supplier-product-list">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-semibold">Available Products</h1>
                        </div>

                        <div className="rounded-md border my-2 relative shadow-sm overflow-hidden">
                            <div className="relative w-full overflow-auto">
                                <table className="w-full caption-bottom text-sm text-left">
                                    <thead className="[&_tr]:border-b bg-muted/50 bg-gray-50">
                                        <tr className="border-b transition-colors data-[state=selected]:bg-muted">
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[80px]">Image</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Slug</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {products.map((p) => (
                                            <tr key={p.id} className="border-b transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-muted">
                                                <td className="p-4 align-middle">
                                                    <div className="rounded-sm bg-gray-100 border border-gray-200 overflow-hidden w-[50px] h-[50px]">
                                                        {p.featuredAsset ? (
                                                            <img src={p.featuredAsset.preview + '?preset=tiny'} alt={p.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                <Eye size={16} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle font-medium">
                                                    <button
                                                        onClick={() => setViewProduct(p)}
                                                        className="hover:underline text-blue-600 hover:text-blue-800 text-left font-semibold"
                                                    >
                                                        {p.name}
                                                    </button>
                                                </td>
                                                <td className="p-4 align-middle text-gray-500">{p.slug}</td>
                                                <td className="p-4 align-middle">
                                                    {isAdded(p) ? (
                                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800">
                                                            Synced
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800">
                                                            Available
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 align-middle text-right">
                                                    <button
                                                        onClick={() => toggleProduct(p)}
                                                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none h-10 px-4 py-2 ${isAdded(p)
                                                                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                                            }`}
                                                    >
                                                        {isAdded(p) ? (
                                                            <>
                                                                <Trash2 className="mr-2 h-4 w-4" /> Remove
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus className="mr-2 h-4 w-4" /> Add
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {products.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                                    No products found for this supplier.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </PageBlock>
            </PageLayout>

            {/* Popup Modal */}
            {viewProduct && (
                <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-xl font-bold">{viewProduct.name}</h3>
                            <button onClick={() => setViewProduct(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex gap-6">
                                <div className="w-1/3 bg-gray-100 rounded-lg aspect-square flex items-center justify-center overflow-hidden">
                                    {viewProduct.featuredAsset ? (
                                        <img src={viewProduct.featuredAsset.preview} className="w-full h-full object-cover" alt={viewProduct.name} />
                                    ) : (
                                        <Eye className="text-gray-400 w-12 h-12" />
                                    )}
                                </div>
                                <div className="w-2/3 space-y-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-500">Slug</label>
                                        <p className="font-mono text-sm">{viewProduct.slug}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-gray-500">Status</label>
                                        <div className="mt-1">
                                            {isAdded(viewProduct)
                                                ? <span className="text-green-600 font-bold">✓ Added to your store</span>
                                                : <span className="text-gray-500">Not added yet</span>
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <button
                                onClick={() => setViewProduct(null)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    toggleProduct(viewProduct);
                                    setViewProduct(null);
                                }}
                                className={`px-4 py-2 rounded-lg font-medium text-white ${isAdded(viewProduct) ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {isAdded(viewProduct) ? 'Remove Product' : 'Add Product'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Page>
    );
}