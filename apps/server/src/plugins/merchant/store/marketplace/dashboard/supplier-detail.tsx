import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, Page, PageLayout, PageBlock, PageTitle } from '@vendure/dashboard';
import { 
    ArrowLeft, DollarSign, Layers, Archive, Package, Loader, Filter, Box
} from 'lucide-react';

import { 
    ProductBrowseLayout, ProductToolbar, CheckboxFilterList, 
    ProductGridCard, StatusToast, PaginationToolbar, SearchBox,
    ProductDetailModal, SidebarPanel 
} from '../../../../../lesuto-ui';

// 1. MAIN GRID QUERY
const GET_SUPPLIER_DETAILS = graphql(`
    query GetSupplierDetailsPaginated(
        $id: ID!, $options: ProductListOptions, $collectionId: ID, $facetValueIds: [ID!], 
        $term: String, $stock: String, $status: String, $enabled: Boolean
    ) {
        supplier(supplierChannelId: $id) {
            id, code, supplierProfile { nameCompany, aboutCompany, commission, logo { preview } }
        }
        supplierProducts(
            supplierChannelId: $id, options: $options, collectionId: $collectionId, facetValueIds: $facetValueIds, 
            term: $term, stock: $stock, status: $status, enabled: $enabled
        ) {
            items {
                id, name, description, featuredAsset { preview }, channels { id }, customFields { basePrice }, 
                variants { stockOnHand }
            }
            totalItems
            collections { count, collection { id name } }
            facets { count, facetValue { id name } }
            counts { total, inStore, notInStore }
        }
        activeChannel { id } 
    }
`);

// 2. DETAIL QUERY
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
    const [filterStock, setFilterStock] = useState<'all' | 'in-stock' | 'out-of-stock'>('all');
    const [filterEnabled, setFilterEnabled] = useState<'all' | 'active' | 'disabled'>('all');

    // Main Query
    const { data, refetch, isLoading, isFetching } = useQuery({
        queryKey: ['supplier', id, currentPage, pageSize, searchTerm, selectedCollection, Array.from(selectedFacets), filterStatus, filterStock, filterEnabled],
        queryFn: () => api.query(GET_SUPPLIER_DETAILS, {
            id: id!,
            options: { skip: (currentPage - 1) * pageSize, take: pageSize },
            term: searchTerm,
            collectionId: selectedCollection,
            facetValueIds: Array.from(selectedFacets),
            status: filterStatus === 'all' ? undefined : filterStatus,
            stock: filterStock === 'all' ? undefined : filterStock,
            enabled: filterEnabled === 'all' ? undefined : (filterEnabled === 'active')
        }),
        enabled: !!id,
        placeholderData: (prev) => prev
    });

    // Detail Query
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
    const products = (data?.supplierProducts as any)?.items || [];
    const totalItems = (data?.supplierProducts as any)?.totalItems || 0;
    const currentChannelId = data?.activeChannel?.id;
    const commissionRate = supplier?.supplierProfile?.commission || 0;
    const counts = (data?.supplierProducts as any)?.counts || { total: 0, inStore: 0, notInStore: 0 };

    const formatPrice = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 100);
    const getPrice = (p: any) => p.customFields?.basePrice || 0;
    const getEarnings = (price: number) => Math.round(price * (commissionRate / 100));
    const isAdded = (p: any) => p.channels?.some((c: any) => c.id === currentChannelId);
    
    // Stock Helper
    const getStock = (p: any) => (p.variants || []).reduce((acc: number, v: any) => acc + (v.stockOnHand || 0), 0);

    // Sidebar Lists
    const collectionItems = useMemo(() => ((data?.supplierProducts as any)?.collections || []).map((c: any) => ({
        id: c.collection.id, name: c.collection.name, count: c.count
    })).sort((a: any, b: any) => b.count - a.count), [data]);

    const facetItems = useMemo(() => ((data?.supplierProducts as any)?.facets || []).map((f: any) => ({
        id: f.facetValue.id, name: f.facetValue.name, count: f.count
    })).sort((a: any, b: any) => b.count - a.count), [data]);

    // Bulk Actions
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

    // --- LOGIC EXTRACTION FOR MODAL ---
    const detailedProduct = detailQuery.data?.product;
    const isDetailInStore = detailedProduct?.channels?.some((c: any) => c.id === currentChannelId);

    if (isLoading) return <div className="p-12 flex justify-center"><Loader className="animate-spin text-blue-600" /></div>;

    return (
        <Page pageId="supplier-detail">
            <PageTitle>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate({ to: '/marketplace' })} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><ArrowLeft size={24} /></button>
                    <span>{supplier?.supplierProfile?.nameCompany || 'Supplier'}</span>
                </div>
            </PageTitle>

            <PageLayout>
                <PageBlock column="main">
                    <ProductBrowseLayout
                        sidebar={
                            <div className="space-y-4 w-full">
                                <SidebarPanel title="Search" variant="standard">
                                    <SearchBox value={searchTerm} onChange={(val) => { setSearchTerm(val); setCurrentPage(1); }} placeholder="Search products..." />
                                </SidebarPanel>

                                <SidebarPanel title="Catalog Status" icon={<Archive size={14}/>}>
                                    <CheckboxFilterList 
                                        selected={new Set([filterStatus])} onToggle={(id: any) => setFilterStatus(id)} 
                                        items={[
                                            { id: 'all', name: 'All Products', count: counts.total }, 
                                            { id: 'not-added', name: 'Available to Add', count: counts.notInStore }, 
                                            { id: 'added', name: 'Already In Store', count: counts.inStore }
                                        ]} 
                                    />
                                </SidebarPanel>

                                <SidebarPanel title="Stock Status" icon={<Box size={14}/>} variant="standard">
                                    <CheckboxFilterList 
                                        selected={new Set([filterStock])} onToggle={(id: any) => setFilterStock(id)} 
                                        items={[
                                            { id: 'all', name: 'Show All', count: 0 }, 
                                            { id: 'in-stock', name: 'In Stock', count: 0 }, 
                                            { id: 'out-of-stock', name: 'Out of Stock', count: 0 }
                                        ]} 
                                    />
                                </SidebarPanel>

                                <SidebarPanel title="Categories" icon={<Layers size={14}/>} variant="standard">
                                    <div className="max-h-48 overflow-y-auto">
                                        <CheckboxFilterList items={collectionItems} selected={selectedCollection ? new Set([selectedCollection]) : new Set()} onToggle={id => setSelectedCollection(prev => prev === id ? null : id)} />
                                    </div>
                                </SidebarPanel>

                                <SidebarPanel title="Filters" icon={<Filter size={14}/>}>
                                    <div className="max-h-48 overflow-y-auto">
                                        <CheckboxFilterList items={facetItems} selected={selectedFacets} onToggle={id => setSelectedFacets(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })} />
                                    </div>
                                </SidebarPanel>
                            </div>
                        }
                    >
                        <ProductToolbar count={totalItems} selectedCount={selectedIds.size} bulkAddCount={products.filter((p: any) => selectedIds.has(p.id) && !isAdded(p)).length} onBulkAdd={handleBulkAdd} viewMode={viewMode} setViewMode={setViewMode} />

                        <div className={`transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
                            {products.length === 0 && <div className="p-16 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-400">No products found.</div>}
                            
                            {viewMode === 'grid' && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                            )}
                        </div>
                        
                        {totalItems > 0 && <PaginationToolbar currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />}
                        
                        <ProductDetailModal
                            isOpen={!!viewProductId}
                            onClose={() => setViewProductId(null)}
                            isLoading={detailQuery.isLoading}
                            product={detailedProduct}
                            actionButton={
                                !isDetailInStore && (
                                    <button 
                                        onClick={() => { addProduct({ productId: viewProductId! }); setViewProductId(null); }} 
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-sm transition-colors"
                                    >
                                        <Package size={16} /> Add to Store
                                    </button>
                                )
                            }
                        />
                        {statusMessage && <StatusToast message={statusMessage.msg} type={statusMessage.type} onDismiss={() => setStatusMessage(null)} />}
                    </ProductBrowseLayout>
                </PageBlock>
            </PageLayout>
        </Page>
    );
}