import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, Page, PageLayout, PageBlock, PageTitle } from '@vendure/dashboard';
import { 
    ArrowLeft, Layers, Archive, Package, Loader, Filter, Box
} from 'lucide-react';

import { 
    ProductBrowseLayout, 
    ProductToolbar, 
    CheckboxFilterList, 
    ProductGridCard, 
    ProductGridTable, 
    StatusToast, 
    PaginationToolbar, 
    SearchBox, 
    ProductDetailModal, 
    SidebarPanel 
} from '@lesuto/ui';

// --- QUERIES ---
const GET_SUPPLIER_DETAILS = graphql(`
    query GetSupplierDetailsPaginated(
        $id: ID!, $options: ProductListOptions, $collectionId: ID, $facetValueIds: [ID!], 
        $term: String, $stock: String, $status: String, $enabled: Boolean
    ) {
        supplier(supplierChannelId: $id) {
            id, code, 
            supplierProfile { nameCompany, aboutCompany, commission, logo { preview } } 
        }
        supplierProducts(
            supplierChannelId: $id, options: $options, collectionId: $collectionId, facetValueIds: $facetValueIds, 
            term: $term, stock: $stock, status: $status, enabled: $enabled
        ) {
            items {
                id, name, description, featuredAsset { preview }, channels { id }, customFields { basePrice }, enabled,
                variants { stockOnHand price sku }
            }
            totalItems
            collections { count, collection { id name } }
            facets { count, facetValue { id name } }
            counts { total, inStore, notInStore, active, disabled, inStock, outOfStock }
        }
        activeChannel { id } 
    }
`);

const GET_PRODUCT_DETAIL = graphql(`
  query GetSupplierProductDetail($id: ID!) {
    product(id: $id) {
      id, name, description, featuredAsset { preview }, 
      channels { id }, 
      customFields { basePrice ownercompany },
      variants { id, name, sku, price, stockOnHand }
    }
  }
`);

const ADD_PRODUCT = graphql(`mutation AddMarketplaceProduct($productId: ID!) { addMarketplaceProduct(productId: $productId) }`);

export function SupplierDetailComponent() {
    const { id } = useParams({ strict: false });
    const navigate = useNavigate();

    // State
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [viewProductId, setViewProductId] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<any>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [selectedFacets, setSelectedFacets] = useState<Set<string>>(new Set());
    
    // Server-Side Filters
    const [filterStatus, setFilterStatus] = useState<'all' | 'added' | 'not-added'>('all');
    const [filterStock, setFilterStock] = useState<'all' | 'in-stock' | 'out-of-stock' | 'disabled'>('all');

    // Main Query
    const { data, refetch, isLoading, isFetching } = useQuery({
        queryKey: ['supplier', id, currentPage, pageSize, searchTerm, selectedCollection, Array.from(selectedFacets), filterStatus, filterStock],
        queryFn: () => api.query(GET_SUPPLIER_DETAILS, {
            id: id!,
            options: { skip: (currentPage - 1) * pageSize, take: pageSize },
            term: searchTerm,
            collectionId: selectedCollection,
            facetValueIds: Array.from(selectedFacets),
            status: filterStatus === 'all' ? undefined : filterStatus,
            stock: filterStock === 'all' ? undefined : filterStock,
            enabled: undefined 
        }),
        enabled: !!id,
        placeholderData: (prev) => prev
    });

    const detailQuery = useQuery({
        queryKey: ['supplierProductDetail', viewProductId],
        queryFn: () => api.query(GET_PRODUCT_DETAIL, { id: viewProductId! }),
        enabled: !!viewProductId,
    });

    const { mutate: addProduct } = useMutation({ 
        mutationFn: ({ productId }: { productId: string }) => api.mutate(ADD_PRODUCT, { productId }), 
        onSuccess: () => refetch() 
    });

    // Data Helpers
    const supplier = data?.supplier;
    const profile = supplier?.supplierProfile;
    const products = (data?.supplierProducts as any)?.items || [];
    const totalItems = (data?.supplierProducts as any)?.totalItems || 0;
    const currentChannelId = data?.activeChannel?.id;
    const commissionRate = profile?.commission || 0;
    
    const counts = (data?.supplierProducts as any)?.counts || { 
        total: 0, inStore: 0, notInStore: 0, active: 0, disabled: 0, inStock: 0, outOfStock: 0 
    };

    const formatPrice = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 100);
    const getPrice = (p: any) => p.customFields?.basePrice || 0;
    const getEarnings = (price: number) => Math.round(price * (commissionRate / 100));
    const isAdded = (p: any) => p.channels?.some((c: any) => c.id === currentChannelId);
    const getStock = (p: any) => (p.variants || []).reduce((acc: number, v: any) => acc + (v.stockOnHand || 0), 0);

    // Sidebar Lists
    const collectionItems = useMemo(() => ((data?.supplierProducts as any)?.collections || []).map((c: any) => ({
        id: c.collection.id, name: c.collection.name, count: c.count
    })).sort((a: any, b: any) => b.count - a.count), [data]);

    const facetItems = useMemo(() => ((data?.supplierProducts as any)?.facets || []).map((f: any) => ({
        id: f.facetValue.id, name: f.facetValue.name, count: f.count
    })).sort((a: any, b: any) => b.count - a.count), [data]);

    // Actions
    const toggleProductSingle = (p: any) => { if (!isAdded(p)) addProduct({ productId: p.id }); };
    const toggleSelection = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    
    const handleBulkAdd = async () => {
        const toAdd = products.filter((p: any) => selectedIds.has(p.id) && !isAdded(p));
        if (!toAdd.length) return;
        setStatusMessage({ msg: 'Adding...', type: 'info' });
        await Promise.all(toAdd.map((p: any) => addProduct({ productId: p.id })));
        setStatusMessage({ msg: 'Success', type: 'success' });
        setSelectedIds(new Set());
        setTimeout(() => setStatusMessage(null), 2000);
    };

    const handleToggleAll = () => {
        const allIds = products.map((p: any) => p.id);
        if (selectedIds.size === allIds.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(allIds));
    };

    const detailedProduct = detailQuery.data?.product;
    const isDetailInStore = detailedProduct?.channels?.some((c: any) => c.id === currentChannelId);

    if (isLoading) return <div className="p-12 flex justify-center"><Loader className="animate-spin text-blue-600" /></div>;

    return (
        <Page pageId="supplier-detail">
            <PageTitle>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate({ to: '/marketplace' })} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><ArrowLeft size={24} /></button>
                    <span>{profile?.nameCompany || 'Supplier'}</span>
                </div>
            </PageTitle>

            <PageLayout>
                <PageBlock column="main">
                    
                    {/* --- HEADER: PROFILE CARD --- */}
                     <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-6">
                        
                        {/* Logo */}
                        <div className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600 shrink-0 shadow-inner">
                            {profile?.logo ? (
                                <img src={profile.logo.preview} alt={profile.nameCompany || ''} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-gray-400">{profile?.nameCompany?.[0]}</span>
                            )}
                        </div>
                        
                        {/* Info Block (Grows) */}
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="flex justify-between items-start">
                                {/* Title & Desc */}
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">{profile?.nameCompany}</h2>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-2xl text-base leading-relaxed line-clamp-2">
                                        {profile?.aboutCompany || "No description available for this supplier."}
                                    </p>
                                </div>

                                {/* Badges (Top Right, Side-by-Side, Smaller) */}
                                <div className="flex items-center gap-2 shrink-0 ml-4">
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                        {commissionRate}% Commission
                                    </span>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 shadow-sm">
                                        {counts.total} Products
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- BROWSER LAYOUT --- */}
                    <ProductBrowseLayout
                        sidebar={
                            <div className="space-y-4 w-full">
                                <SidebarPanel title="Search" variant="standard">
                                    <SearchBox value={searchTerm} onChange={(val) => { setSearchTerm(val); setCurrentPage(1); }} placeholder=" Search products... " />
                                </SidebarPanel>

                                <SidebarPanel title="Catalog Status" icon={<Archive size={14}/>} variant="standard">
                                    <CheckboxFilterList 
                                        selected={new Set([filterStatus])} onToggle={(id: any) => setFilterStatus(id)} 
                                        items={[
                                            { id: 'all', name: 'All Products', count: counts.total }, 
                                            { id: 'not-added', name: 'Available', count: counts.notInStore }, 
                                            { id: 'added', name: 'In Store', count: counts.inStore }
                                        ]} 
                                    />
                                </SidebarPanel>

                                <SidebarPanel title="Visibility & Stock" icon={<Box size={14}/>} variant="standard">
                                    <CheckboxFilterList 
                                        selected={new Set([filterStock])} onToggle={(id: any) => setFilterStock(id)} 
                                        items={[
                                            { id: 'all', name: 'Show All', count: counts.total }, 
                                            { id: 'in-stock', name: 'In Stock', count: counts.inStock }, 
                                            { id: 'out-of-stock', name: 'Out of Stock', count: counts.outOfStock },
                                            { id: 'disabled', name: 'Disabled', count: counts.disabled }
                                        ]} 
                                    />
                                </SidebarPanel>

                                <SidebarPanel title="Categories" icon={<Layers size={14}/>} variant="standard">
                                    <CheckboxFilterList items={collectionItems} selected={selectedCollection ? new Set([selectedCollection]) : new Set()} onToggle={id => setSelectedCollection(prev => prev === id ? null : id)} />
                                </SidebarPanel>

                                <SidebarPanel title="Filters" icon={<Filter size={14}/>} variant="standard">
                                    <CheckboxFilterList items={facetItems} selected={selectedFacets} onToggle={id => setSelectedFacets(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })} />
                                </SidebarPanel>
                            </div>
                        }
                    >
                        {/* CONTENT AREA 
                           Uses flex flex-col min-h-full to ensure sticky footer logic works 
                           inside the simplified layout structure.
                        */}
                        <div className="flex flex-col min-h-[600px]">
                            
                            {/* Toolbar (Top) */}
                            <div className="mb-6">
                                <ProductToolbar 
                                    count={totalItems} 
                                    selectedCount={selectedIds.size} 
                                    bulkAddCount={products.filter((p: any) => selectedIds.has(p.id) && !isAdded(p)).length} 
                                    onBulkAdd={handleBulkAdd} 
                                    viewMode={viewMode} 
                                    setViewMode={setViewMode} 
                                />
                            </div>

                            {/* Grid/Table (Middle - Grows) */}
                            <div className={`flex-1 transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
                                {products.length === 0 && (
                                    <div className="p-16 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-400">
                                        No products found.
                                    </div>
                                )}
                                
                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                                        {products.map((p: any) => {
                                            const added = isAdded(p);
                                            return (
                                                <ProductGridCard
                                                    key={p.id}
                                                    name={p.name}
                                                    image={p.featuredAsset?.preview}
                                                    retailPrice={formatPrice(getPrice(p))}
                                                    earnings={formatPrice(getEarnings(getPrice(p)))}
                                                    stockLevel={getStock(p)}
                                                    isAdded={added}
                                                    isSelected={selectedIds.has(p.id)}
                                                    onView={() => setViewProductId(p.id)}
                                                    onSelect={() => toggleSelection(p.id)}
                                                    onToggle={!added ? () => toggleProductSingle(p) : undefined} 
                                                />
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <ProductGridTable
                                        products={products}
                                        selectedIds={selectedIds}
                                        onToggleSelection={toggleSelection}
                                        onToggleAll={handleToggleAll}
                                        onViewDetails={(id) => setViewProductId(id)}
                                        isAddedPredicate={isAdded}
                                        getEarnings={(p) => getEarnings(getPrice(p))}
                                        onPrimaryAction={(p) => { if (!isAdded(p)) toggleProductSingle(p); }}
                                        variant='standard'
                                    />
                                )}
                            </div>

                            {/* Pagination (Bottom - Sticky) */}
                            <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700">
                                {totalItems > 0 && (
                                    <PaginationToolbar 
                                        currentPage={currentPage} 
                                        totalItems={totalItems} 
                                        pageSize={pageSize} 
                                        onPageChange={setCurrentPage} 
                                        onPageSizeChange={setPageSize} 
                                    />
                                )}
                            </div>
                        </div>

                        {/* Overlays */}
                        <ProductDetailModal
                            isOpen={!!viewProductId}
                            onClose={() => setViewProductId(null)}
                            isLoading={detailQuery.isLoading}
                            product={detailedProduct}
                            actionButton={!isDetailInStore && (
                                <button onClick={() => { addProduct({ productId: viewProductId! }); setViewProductId(null); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-sm transition-colors">
                                    <Package size={16} /> Add to Store
                                </button>
                            )}
                        />
                        {statusMessage && <StatusToast message={statusMessage.msg} type={statusMessage.type} onDismiss={() => setStatusMessage(null)} />}
                    </ProductBrowseLayout>
                </PageBlock>
            </PageLayout>
        </Page>
    );
}