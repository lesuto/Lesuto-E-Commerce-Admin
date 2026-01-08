import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, Page, PageLayout, PageBlock, PageTitle } from '@vendure/dashboard';
import { 
    ArrowLeft, DollarSign, Eye, Plus, CheckSquare, Square, 
    Search, Layers, Archive, Package, Loader, Tag, AlertCircle, Store
} from 'lucide-react';

import { 
    ProductBrowseLayout, ProductToolbar, SidebarPanel, SearchBox, CheckboxFilterList, 
    ProductGridCard, Modal, StatusToast, PaginationToolbar 
} from '../../../../../custom-ui-components';
import '../../../../../custom-ui-components/css/ui-surfaces.css';

// --- 1. Main Data Query (Paginated Details) ---
// We fetch enough info here to drive the UI.
const GET_SUPPLIER_DETAILS_PAGINATED = graphql(`
    query GetSupplierDetailsPaginated($id: ID!, $options: ProductListOptions) {
        supplier(supplierChannelId: $id) {
            id, code, supplierProfile { nameCompany, aboutCompany, commission, logo { preview } }
        }
        supplierProducts(supplierChannelId: $id, options: $options) {
            items {
                id, name, slug, enabled, description, featuredAsset { preview }, 
                facetValues { id name }, channels { id }, 
                customFields { basePrice }, 
                variants { id, sku, stockLevel, price } 
            }
            totalItems
        }
        activeChannel { id } 
    }
`);

// --- 2. Facet Query (Lighter) ---
// We limit this to 100 to respect server limits. 
// It gives us the top categories for the sidebar.
const GET_SUPPLIER_FILTERS = graphql(`
    query GetSupplierFilters($id: ID!) {
        supplierProducts(supplierChannelId: $id, options: { take: 100 }) {
            items {
                facetValues { id name }
            }
        }
    }
`);

const ADD_PRODUCT = graphql(`mutation AddMarketplaceProduct($productId: ID!) { addMarketplaceProduct(productId: $productId) }`);
const REMOVE_PRODUCT = graphql(`mutation RemoveMarketplaceProduct($productId: ID!) { removeMarketplaceProduct(productId: $productId) }`);

export function SupplierDetailComponent() {
    const { id } = useParams({ strict: false });
    const navigate = useNavigate();

    // --- STATE ---
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [viewProduct, setViewProduct] = useState<any | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [statusMessage, setStatusMessage] = useState<{ msg: string; type: 'info' | 'error' | 'success' } | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [selectedFacets, setSelectedFacets] = useState<Set<string>>(new Set());
    
    // Client-side visual filters (applied after fetching page)
    const [filterStock, setFilterStock] = useState<'all' | 'in' | 'out'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'added' | 'not-added'>('all');

    // --- DATA FETCHING ---

    // A. Main Query
    const { data, refetch, isLoading, isFetching } = useQuery({
        queryKey: ['supplier', id, currentPage, pageSize, searchTerm, Array.from(selectedFacets)],
        queryFn: () => api.query(GET_SUPPLIER_DETAILS_PAGINATED, { 
            id: id!,
            options: {
                skip: (currentPage - 1) * pageSize,
                take: pageSize,
                filter: {
                    name: { contains: searchTerm },
                    ...(selectedFacets.size > 0 ? { facetValueId: { in: Array.from(selectedFacets) } } : {}),
                }
            }
        }),
        enabled: !!id,
        placeholderData: (prev) => prev
    });

    // B. Filters Query (Cached, Limit 100)
    const filterQuery = useQuery({
        queryKey: ['supplierFilters', id],
        queryFn: () => api.query(GET_SUPPLIER_FILTERS, { id: id! }),
        enabled: !!id,
        staleTime: 1000 * 60 * 5 
    });

    const { mutate: addProduct } = useMutation({
        mutationFn: ({ productId }: { productId: string }) => api.mutate(ADD_PRODUCT, { productId }),
        onSuccess: () => refetch()
    });

    const { mutate: removeProduct } = useMutation({
        mutationFn: ({ productId }: { productId: string }) => api.mutate(REMOVE_PRODUCT, { productId }),
        onSuccess: () => refetch()
    });

    // --- HELPERS ---
    const supplier = data?.supplier;
    // FIX: Cast to 'any' to avoid TS errors with mismatched types
    const products = (data?.supplierProducts as any)?.items || [];
    const totalItems = (data?.supplierProducts as any)?.totalItems || 0;
    
    const currentChannelId = data?.activeChannel?.id;
    const commissionRate = supplier?.supplierProfile?.commission || 0;
    const supplierName = supplier?.supplierProfile?.nameCompany || supplier?.code || 'Supplier';

    const formatPrice = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 100);
    const getPrice = (p: any) => p.customFields?.basePrice || 0;
    const getEarnings = (price: number) => Math.round(price * (commissionRate / 100));
    
    const isAdded = (p: any) => p.channels?.some((c: any) => c.id === currentChannelId);
    const isOutOfStock = (p: any) => {
        if (!p.variants?.length) return true;
        return p.variants.every((v: any) => (v.stockLevel || 0) <= 0);
    };

    // --- SIDEBAR COUNTS (Based on available filter data) ---
    const facetItems = useMemo(() => {
        // Use the filter query data (top 100) to populate the sidebar list
        const rawItems = (filterQuery.data?.supplierProducts as any)?.items || [];
        const counts = new Map<string, { name: string, count: number }>();

        rawItems.forEach((p: any) => {
            p.facetValues.forEach((f: any) => {
                const curr = counts.get(f.id) || { name: f.name, count: 0 };
                counts.set(f.id, { name: f.name, count: curr.count + 1 });
            });
        });
        
        return Array.from(counts.entries())
            .sort((a,b) => b[1].count - a[1].count)
            .map(([id, val]) => ({ id, ...val }));
    }, [filterQuery.data]);

    // --- CLIENT SIDE FILTERING ---
    const displayProducts = useMemo(() => {
        return products.filter((p: any) => {
            if (filterStock === 'in' && isOutOfStock(p)) return false;
            if (filterStock === 'out' && !isOutOfStock(p)) return false;
            if (filterStatus === 'added' && !isAdded(p)) return false;
            if (filterStatus === 'not-added' && isAdded(p)) return false;
            return true;
        });
    }, [products, filterStock, filterStatus, currentChannelId]); 

    // Actions
    const toggleSelection = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    const toggleProductSingle = (p: any, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (isAdded(p)) {
             // Already added, do nothing (ghosted state)
        } else {
            addProduct({ productId: p.id });
        }
    };

    const handleBulkAction = async (action: 'add' | 'remove') => {
        const targets = products.filter(p => selectedIds.has(p.id));
        if (!targets.length) return;
        setStatusMessage({ msg: 'Processing...', type: 'info' });
        await Promise.all(targets.map(p => {
            if(action === 'add' && !isAdded(p)) return addProduct({ productId: p.id });
            if(action === 'remove' && isAdded(p)) return removeProduct({ productId: p.id });
            return Promise.resolve();
        }));
        setStatusMessage({ msg: 'Done', type: 'success' });
        setSelectedIds(new Set());
        setTimeout(() => setStatusMessage(null), 2500);
    };

    if (isLoading) return <div className="p-12 flex justify-center"><Loader className="animate-spin text-blue-600" /></div>;

    const bulkAddCount = products.filter(p => selectedIds.has(p.id) && !isAdded(p)).length;

    return (
        <Page pageId="supplier-detail">
            <PageTitle>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate({ to: '/marketplace' })} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400"><ArrowLeft size={24} /></button>
                    <span>{supplierName}</span>
                </div>
            </PageTitle>

            <PageLayout>
                <PageBlock column="main">
                    {/* Header: Inverted Theme */}
                    <div className="ui-surface rounded-2xl p-6 mb-6">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="w-24 h-24 shrink-0 rounded-xl ui-surface-muted border overflow-hidden flex items-center justify-center">
                                {supplier?.supplierProfile?.logo?.preview ? <img src={supplier.supplierProfile.logo.preview} className="w-full h-full object-contain"/> : <div className="text-2xl font-bold ui-text-muted">S</div>}
                            </div>
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold ui-text-primary">{supplierName}</h2>
                                    <div className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-semibold text-sm border border-emerald-200"><DollarSign size={16} className="inline mr-1"/> Commission: {commissionRate}%</div>
                                </div>
                                <div className="prose max-w-none ui-text-muted text-sm">{supplier?.supplierProfile?.aboutCompany || "No description."}</div>
                            </div>
                        </div>
                    </div>

                    <ProductBrowseLayout
                        sidebar={
                            <div className="space-y-4">
                                {/* Search */}
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                    <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase mb-3">Search</h3>
                                    <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Search products..." />
                                </div>

                                {/* Status Filter */}
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                    <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-2"><Archive size={14}/> Catalog Status</h3>
                                    <div className="space-y-1">
                                        {[
                                            { id: 'all', label: 'All Products' },
                                            { id: 'not-added', label: 'Available to Add' },
                                            { id: 'added', label: 'Already In Store' }
                                        ].map(opt => (
                                            <div key={opt.id} onClick={() => setFilterStatus(opt.id as any)} className={`text-sm cursor-pointer px-2 py-1.5 rounded flex justify-between items-center gap-2 ${filterStatus === opt.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                                <span>{opt.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Stock Filter */}
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                    <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-2"><Package size={14}/> Availability</h3>
                                    <div className="space-y-1">
                                        {[
                                            { id: 'all', label: 'All Stock' },
                                            { id: 'in', label: 'In Stock' },
                                            { id: 'out', label: 'Sold Out' }
                                        ].map(opt => (
                                            <div key={opt.id} onClick={() => setFilterStock(opt.id as any)} className={`text-sm cursor-pointer px-2 py-1.5 rounded flex justify-between items-center gap-2 ${filterStock === opt.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                                <span>{opt.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Categories - Fixed Black Text Issue by passing wrapper class or relying on parent */}
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                    <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-2"><Layers size={14}/> Collections</h3>
                                    <div className="text-gray-700 dark:text-gray-200">
                                        <CheckboxFilterList items={facetItems} selected={selectedFacets} onToggle={id => setSelectedFacets(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })} />
                                    </div>
                                </div>
                            </div>
                        }
                    >
                        <ProductToolbar count={totalItems} selectedCount={selectedIds.size} bulkAddCount={bulkAddCount} onBulkAdd={() => handleBulkAction('add')} onBulkRemove={() => handleBulkAction('remove')} viewMode={viewMode} setViewMode={setViewMode} />

                        <div className={`transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
                            {displayProducts.length === 0 && (
                                <div className="p-16 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-400">
                                    <p>No products match your filters.</p>
                                </div>
                            )}

                            {viewMode === 'grid' && (
                                // Grid Size: Middle Ground (sm:2, lg:3, xl:5)
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {displayProducts.map((p: any) => {
                                        const added = isAdded(p);
                                        const outOfStock = isOutOfStock(p);
                                        return (
                                            <ProductGridCard
                                                key={p.id}
                                                name={p.name}
                                                image={p.featuredAsset?.preview}
                                                retailPrice={formatPrice(getPrice(p))}
                                                earnings={formatPrice(getEarnings(getPrice(p)))}
                                                isAdded={added}
                                                isSelected={selectedIds.has(p.id)}
                                                onView={() => setViewProduct(p)}
                                                onSelect={(e) => toggleSelection(p.id, e)}
                                                onToggle={!added && !outOfStock ? (e) => toggleProductSingle(p, e) : undefined} 
                                            />
                                        );
                                    })}
                                </div>
                            )}
                            
                             {viewMode === 'list' && (
                                <div className="ui-surface rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-sm">
                                        <thead className="ui-surface-muted text-xs uppercase font-bold ui-text-muted">
                                            <tr><th className="p-4 w-12"></th><th className="p-4">Product</th><th className="p-4">Retail</th><th className="p-4">Earnings</th><th className="p-4 text-right">Action</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {displayProducts.map((p: any) => {
                                                const added = isAdded(p);
                                                return (
                                                <tr key={p.id} onClick={() => setViewProduct(p)} className="ui-hover cursor-pointer">
                                                    <td className="p-4" onClick={(e) => toggleSelection(p.id, e)}>{selectedIds.has(p.id) ? <CheckSquare size={18} className="text-blue-600 dark:text-blue-400"/> : <Square size={18} className="ui-text-muted"/>}</td>
                                                    <td className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg ui-surface-muted border overflow-hidden">{p.featuredAsset ? <img src={p.featuredAsset.preview} className="w-full h-full object-cover"/> : <Eye size={16} className="m-auto ui-text-muted"/>}</div><div className="font-bold ui-text-primary">{p.name}</div></div></td>
                                                    <td className="p-4 font-mono ui-text-primary">{formatPrice(getPrice(p))}</td>
                                                    <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">+{formatPrice(getEarnings(getPrice(p)))}</td>
                                                    <td className="p-4 text-right">
                                                        {!added ? <button onClick={e => toggleProductSingle(p, e)} className="text-blue-600 hover:underline">Add</button> : <span className="text-green-600 text-xs font-bold">✔ In Store</span>}
                                                    </td>
                                                </tr>
                                            )})}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {totalItems > 0 && <PaginationToolbar currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />}

                        {/* MODAL */}
                        {viewProduct && (
                            <Modal isOpen={true} onClose={() => setViewProduct(null)} title={viewProduct.name}>
                                <div className="flex flex-col sm:flex-row gap-6">
                                    <div className="sm:w-2/5 shrink-0">
                                        <div className="aspect-square ui-surface-muted rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden mb-4">
                                            {viewProduct.featuredAsset ? <img src={viewProduct.featuredAsset.preview} className="w-full h-full object-cover"/> : <Eye size={32} className="m-auto ui-text-muted"/>}
                                        </div>
                                    </div>
                                    <div className="sm:w-3/5 space-y-4">
                                        {isOutOfStock(viewProduct) && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold border border-red-100"><AlertCircle size={16}/> Sold Out / Unavailable</div>}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 ui-surface-muted rounded-xl border text-center">
                                                <div className="text-xs ui-text-muted uppercase font-bold mb-1">Retail</div>
                                                <div className="text-xl font-bold ui-text-primary">{formatPrice(getPrice(viewProduct))}</div>
                                            </div>
                                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                                                <div className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold mb-1">Profit</div>
                                                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">+{formatPrice(getEarnings(getPrice(viewProduct)))}</div>
                                            </div>
                                        </div>
                                        <div className="text-sm ui-text-primary opacity-90" dangerouslySetInnerHTML={{ __html: viewProduct.description || 'No description.' }} />
                                    </div>
                                </div>
                                <div slot="footer">
                                    <button onClick={() => setViewProduct(null)} className="px-4 py-2 border rounded-lg ui-surface-muted hover:opacity-80">Close</button>
                                    {!isAdded(viewProduct) && !isOutOfStock(viewProduct) && (
                                        <button onClick={e => toggleProductSingle(viewProduct, e)} className="px-4 py-2 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
                                            <Plus size={16}/> Add to Store
                                        </button>
                                    )}
                                    {isAdded(viewProduct) && <button onClick={e => {if(confirm('Remove?')) removeProduct({productId: viewProduct.id})}} className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50">Remove</button>}
                                </div>
                            </Modal>
                        )}
                    </ProductBrowseLayout>
                    {statusMessage && <StatusToast message={statusMessage.msg} type={statusMessage.type} onDismiss={() => setStatusMessage(null)} />}
                </PageBlock>
            </PageLayout>
        </Page>
    );
}