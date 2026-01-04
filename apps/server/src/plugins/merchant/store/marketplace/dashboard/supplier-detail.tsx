import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, Page, PageLayout, PageBlock, PageTitle } from '@vendure/dashboard';
import {
    Plus, Trash2, Eye, X, ArrowLeft, LayoutList,
    LayoutGrid, DollarSign, Search, Tag
} from 'lucide-react';

// 1. UPDATED INTERFACE: Added customFields
interface SupplierProduct {
    id: string;
    name: string;
    slug: string;
    enabled: boolean;
    description?: string;
    featuredAsset?: { preview: string };
    channels: { id: string }[];
    facetValues: { name: string; id: string }[];
    // We now look here for the price
    customFields?: {
        basePrice?: number;
    };
    variants: {
        id: string;
        sku: string;
        enabled: boolean;
        // Price is no longer needed here for the main display, 
        // but keeping the object for SKU is fine.
        currencyCode: string;
    }[];
}

interface SupplierData {
    id: string;
    code: string;
    supplierProfile?: {
        nameCompany?: string;
        aboutCompany?: string;
        logo?: { preview: string };
        commission?: number;
    };
}

// 2. UPDATED QUERY: Fetching customFields { basePrice }
const GET_SUPPLIER_DETAILS = graphql(`
    query GetSupplierDetails($id: ID!) {
        supplier(supplierChannelId: $id) {
            id
            code
            supplierProfile {
                nameCompany
                aboutCompany
                commission
                logo { preview }
            }
        }
        supplierProducts(supplierChannelId: $id) {
            id
            name
            slug
            enabled
            description
            featuredAsset { preview }
            facetValues { id name }
            channels { id }
            
            # --- NEW FIELD ---
            customFields {
                basePrice
            }
            # -----------------

            variants {
                id
                sku
                enabled
                currencyCode
            }
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

    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [viewProduct, setViewProduct] = useState<SupplierProduct | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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

    // Extract raw data safely
    const supplier = data?.supplier as SupplierData | undefined;
    const allProducts = (data?.supplierProducts || []) as SupplierProduct[];
    const currentChannelId = data?.activeChannel?.id;
    const commissionRate = supplier?.supplierProfile?.commission || 0;

    // Run useMemo
    const products = useMemo(() => {
        if (!searchTerm) return allProducts;
        return allProducts.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.slug.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allProducts, searchTerm]);

    if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

    const isAdded = (p: SupplierProduct) => p.channels.some((c) => c.id === currentChannelId);

    // 3. UPDATED HELPER: Get price from Product Custom Field
    const getPrice = (p: SupplierProduct) => {
        // Return the custom field basePrice, or 0 if null/undefined
        return p.customFields?.basePrice ?? 0;
    };

    const getSku = (p: SupplierProduct) => {
        // We still look at the first enabled variant for the SKU
        const variant = p.variants.find(v => v.enabled) || p.variants[0];
        return variant?.sku ?? '—';
    };

    const formatPrice = (val: number, currencyCode: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
        }).format(val / 100);
    };

    const getEarnings = (price: number) => {
        if (!commissionRate || !price) return 0;
        return Math.round(price * (commissionRate / 100));
    };

    const toggleProduct = (p: SupplierProduct, e?: React.MouseEvent) => {
        e?.stopPropagation();
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
                <PageBlock column="main" blockId="supplier-header">
                    <div className="flex flex-col md:flex-row gap-6 mb-4 items-start">
                        <div className="w-24 h-24 shrink-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
                            {supplier?.supplierProfile?.logo?.preview ? (
                                <img
                                    src={supplier.supplierProfile.logo.preview}
                                    className="w-full h-full object-contain"
                                    alt="Logo"
                                />
                            ) : (
                                <div className="text-2xl font-bold text-gray-300">
                                    {supplier?.supplierProfile?.nameCompany?.[0] || 'S'}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">{supplier?.supplierProfile?.nameCompany}</h2>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
                                    <DollarSign size={16} />
                                    <span className="font-semibold text-sm">Commission: {commissionRate}%</span>
                                </div>
                            </div>
                            <div className="prose max-w-none text-gray-600 text-sm">
                                {supplier?.supplierProfile?.aboutCompany || "No detailed description provided."}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t pt-6 gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <h1 className="text-xl font-semibold shrink-0">
                                Products <span className="text-gray-400 font-normal">({products.length})</span>
                            </h1>
                            <div className="relative max-w-md w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shrink-0">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 px-3 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <LayoutList size={16} /> List
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 px-3 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <LayoutGrid size={16} /> Grid
                            </button>
                        </div>
                    </div>
                </PageBlock>

                <PageBlock column="main" blockId="supplier-products">
                    {viewMode === 'list' && (
                        <div className="rounded-md border relative shadow-sm overflow-hidden bg-white">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                    <tr>
                                        <th className="h-10 px-4 w-[60px]"></th>
                                        <th className="h-10 px-4">Name</th>
                                        <th className="h-10 px-4">Price</th>
                                        <th className="h-10 px-4">SKU</th>
                                        <th className="h-10 px-4 text-emerald-600">Earnings</th>
                                        <th className="h-10 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((p) => {
                                        const price = getPrice(p);
                                        const added = isAdded(p);
                                        return (
                                            <tr key={p.id} className="border-b hover:bg-gray-50 group cursor-pointer" onClick={() => setViewProduct(p)}>
                                                <td className="p-3">
                                                    <div className="w-10 h-10 bg-gray-100 rounded border overflow-hidden">
                                                        {p.featuredAsset ? (
                                                            <img src={p.featuredAsset.preview + '?preset=tiny'} className="w-full h-full object-cover" />
                                                        ) : <Eye size={16} className="m-auto mt-3 text-gray-400" />}
                                                    </div>
                                                </td>
                                                <td className="p-3 font-medium text-blue-600 group-hover:underline">{p.name}</td>
                                                <td className="p-3 text-gray-600">{formatPrice(price)}</td>
                                                <td className="p-3 text-xs text-gray-500 font-mono">
                                                    {getSku(p)}
                                                </td>
                                                <td className="p-3 text-emerald-600 font-bold">
                                                    {formatPrice(getEarnings(price))}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={(e) => toggleProduct(p, e)}
                                                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${added
                                                            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                                            }`}
                                                    >
                                                        {added ? 'Remove' : 'Add'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {products.map((p) => {
                                const price = getPrice(p);
                                const earnings = getEarnings(price);
                                const added = isAdded(p);

                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => setViewProduct(p)}
                                        className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all cursor-pointer flex flex-col h-full"
                                    >
                                        <div className="aspect-square bg-gray-100 relative overflow-hidden">
                                            {p.featuredAsset ? (
                                                <img
                                                    src={p.featuredAsset.preview + '?preset=medium'}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    alt={p.name}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <Eye size={32} />
                                                </div>
                                            )}
                                            {added && (
                                                <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wide z-10">
                                                    Synced
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <span className="bg-white/90 text-gray-800 text-xs font-bold px-2 py-1 rounded shadow-sm backdrop-blur-sm">
                                                    View Details
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-3 flex flex-col flex-1">
                                            <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-3 h-10 leading-snug" title={p.name}>
                                                {p.name}
                                            </h3>

                                            <div className="mt-auto space-y-2">
                                                <div className="flex justify-between items-baseline text-xs">
                                                    <span className="text-gray-500">Retail:</span>
                                                    <span className="font-medium text-gray-900">{formatPrice(price)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                                    <span className="text-emerald-700 font-medium">Earn:</span>
                                                    <span className="text-emerald-700 font-bold">{formatPrice(earnings)}</span>
                                                </div>

                                                <button
                                                    onClick={(e) => toggleProduct(p, e)}
                                                    className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer relative z-20 ${added
                                                        ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                                        }`}
                                                >
                                                    {added ? (
                                                        <> <Trash2 size={14} /> Remove </>
                                                    ) : (
                                                        <> <Plus size={14} /> Add to Store </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {products.length === 0 && (
                        <div className="text-center py-12 px-4">
                            <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <Search className="text-gray-300" size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No products found</h3>
                            <p className="text-gray-500 mt-1">Try adjusting your search terms.</p>
                        </div>
                    )}
                </PageBlock>
            </PageLayout>

            {viewProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-4 border-b bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{viewProduct.name}</h3>
                            <div className="text-xs text-gray-400 font-mono">
                                SKU: {getSku(viewProduct)}
                            </div>
                            <button
                                onClick={() => setViewProduct(null)}
                                className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="flex flex-col sm:flex-row gap-6">
                                <div className="sm:w-2/5 shrink-0">
                                    <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-inner mb-4">
                                        {viewProduct.featuredAsset ? (
                                            <img
                                                src={viewProduct.featuredAsset.preview}
                                                className="w-full h-full object-cover"
                                                alt={viewProduct.name}
                                            />
                                        ) : (
                                            <div className="h-full flex items-center justify-center"><Eye className="text-gray-300 w-12 h-12" /></div>
                                        )}
                                    </div>

                                    {viewProduct.facetValues && viewProduct.facetValues.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {viewProduct.facetValues.map(f => (
                                                <span key={f.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                                                    <Tag size={10} /> {f.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="sm:w-3/5 space-y-6">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Retail Price</div>
                                            <div className="text-xl font-medium text-gray-900">{formatPrice(getPrice(viewProduct))}</div>
                                        </div>
                                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                            <div className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider mb-1">Your Earnings</div>
                                            <div className="text-xl font-bold text-emerald-700">
                                                {formatPrice(getEarnings(getPrice(viewProduct)))}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Description</label>
                                        <div
                                            className="mt-2 text-sm text-gray-600 leading-relaxed max-h-40 overflow-y-auto pr-2"
                                            dangerouslySetInnerHTML={{ __html: viewProduct.description || 'No description available.' }}
                                        />
                                    </div>

                                    <div className="pt-2 border-t border-gray-100">
                                        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Status</label>
                                        <div className="mt-2">
                                            {isAdded(viewProduct) ? (
                                                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                    <span className="font-medium text-sm">Active in your store</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                                    <span className="text-sm">Available to add</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setViewProduct(null)}
                                className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={(e) => {
                                    toggleProduct(viewProduct, e);
                                }}
                                className={`px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-transform active:scale-95 ${isAdded(viewProduct)
                                    ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                            >
                                {isAdded(viewProduct) ? (
                                    <> <Trash2 size={16} /> Remove Product </>
                                ) : (
                                    <> <Plus size={16} /> Add to Store </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Page>
    );
}