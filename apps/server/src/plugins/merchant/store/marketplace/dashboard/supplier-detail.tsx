import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, Page, PageLayout, PageBlock, PageTitle } from '@vendure/dashboard';
import { 
    ArrowLeft, DollarSign, Layers, Archive, 
    Package, Loader
} from 'lucide-react';

import { 
    ProductBrowseLayout, ProductToolbar, CheckboxFilterList, 
    ProductGridCard, StatusToast, PaginationToolbar, SearchBox,
    ProductDetailModal, SidebarPanel // <--- Using the shared components
} from '../../../../../custom-ui-components';

// --- 1. MAIN GRID QUERY ---
// Fetches Products, Variants (for stock), Collections (for sidebar), and Status Counts
const GET_SUPPLIER_DETAILS = graphql(`
    query GetSupplierDetailsPaginated($id: ID!, $options: ProductListOptions, $collectionId: ID, $term: String) {
        supplier(supplierChannelId: $id) {
            id, code, supplierProfile { nameCompany, aboutCompany, commission, logo { preview } }
        }
        supplierProducts(supplierChannelId: $id, options: $options, collectionId: $collectionId, term: $term) {
            items {
                id
                name
                description
                featuredAsset { preview }
                channels { id }
                customFields { basePrice } 
                # Fetch variants to calculate stock sum
                variants { stockLevel }
            }
            totalItems
            # Sidebar Data
            collections {
                count
                collection { id name }
            }
            counts {
                total
                inStore
                notInStore
            }
        }
        activeChannel { id } 
    }
`);

const GET_PRODUCT_DETAIL = graphql(`
  query GetSupplierProductDetail($id: ID!) {
    product(id: $id) {
      id name description
      featuredAsset { preview }
      customFields { basePrice ownercompany }
      variants {
        id name sku price stockLevel
        options { code name }
      }
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
    const [filterStatus, setFilterStatus] = useState<'all' | 'added' | 'not-added'>('all');

    // Main Query
    const { data, refetch, isLoading, isFetching } = useQuery({
        queryKey: ['supplier', id, currentPage, pageSize, searchTerm, selectedCollection],
        queryFn: () => api.query(GET_SUPPLIER_DETAILS, {
            id: id!,
            options: { skip: (currentPage - 1) * pageSize, take: pageSize },
            term: searchTerm,
            collectionId: selectedCollection
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

    const { mutate: addProduct } = useMutation({ mutationFn: ({ productId }: { productId: string }) => api.mutate(ADD_PRODUCT, { productId }), onSuccess: () => refetch() });

    // Helpers
    const supplier = data?.supplier;
    const products = (data?.supplierProducts as any)?.items || [];
    const totalItems = (data?.supplierProducts as any)?.totalItems || 0;
    const currentChannelId = data?.activeChannel?.id;
    const commissionRate = supplier?.supplierProfile?.commission || 0;
    const supplierName = supplier?.supplierProfile?.nameCompany || supplier?.code || 'Supplier';
    
    const counts = (data?.supplierProducts as any)?.counts || { total: 0, inStore: 0, notInStore: 0 };

    const formatPrice = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 100);
    const getPrice = (p: any) => p.customFields?.basePrice || 0;
    const getEarnings = (price: number) => Math.round(price * (commissionRate / 100));
    const isAdded = (p: any) => p.channels?.some((c: any) => c.id === currentChannelId);

    // Calculate Stock Sum
    const getStock = (p: any) => {
        return (p.variants || []).reduce((acc: number, v: any) => acc + (v.stockLevel || 0), 0);
    };

    // Build Collection List
    const collectionItems = useMemo(() => {
        const raw = (data?.supplierProducts as any)?.collections || [];
        return raw.map((c: any) => ({
            id: c.collection.id,
            name: c.collection.name,
            count: c.count
        })).sort((a: any, b: any) => b.count - a.count);
    }, [data?.supplierProducts?.collections]);

    // Client-side Filtering (Status)
    const displayProducts = useMemo(() => {
        return products.filter((p: any) => {
            if (filterStatus === 'added' && !isAdded(p)) return false;
            if (filterStatus === 'not-added' && isAdded(p)) return false;
            return true;
        });
    }, [products, filterStatus, currentChannelId]);

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

    const bulkAddCount = products.filter((p: any) => selectedIds.has(p.id) && !isAdded(p)).length;
    const detailedProduct = detailQuery.data?.product;
    const isDetailAdded = detailedProduct && isAdded(detailedProduct);

    if (isLoading) return <div className="p-12 flex justify-center"><Loader className="animate-spin text-blue-600" /></div>;

    return (
        <Page pageId="supplier-detail">
            <PageTitle>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate({ to: '/marketplace' })} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500"><ArrowLeft size={24} /></button>
                    <span>{supplierName}</span>
                </div>
            </PageTitle>

            <PageLayout>
                <PageBlock column="main">
                    {/* Header */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="w-24 h-24 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden flex items-center justify-center">
                                {supplier?.supplierProfile?.logo?.preview ? <img src={supplier.supplierProfile.logo.preview} className="w-full h-full object-contain"/> : <div className="text-2xl font-bold text-gray-400">S</div>}
                            </div>
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{supplierName}</h2>
                                    <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg font-semibold text-sm border border-emerald-200 dark:border-emerald-800">
                                        <DollarSign size={16} className="inline mr-1"/> Commission: {commissionRate}%
                                    </div>
                                </div>
                                <div className="prose max-w-none text-gray-600 dark:text-gray-300 text-sm">
                                    {supplier?.supplierProfile?.aboutCompany || "No description."}
                                </div>
                            </div>
                        </div>
                    </div>

                    <ProductBrowseLayout
                        sidebar={
                            <div className="space-y-4 w-full">
                                {/* 1. Search Panel */}
                                <SidebarPanel title="">
                                    <SearchBox 
                                        value={searchTerm} 
                                        onChange={(val) => { setSearchTerm(val); setCurrentPage(1); }} 
                                        placeholder="Search products..."
                                    />
                                </SidebarPanel>

                                {/* 2. Status Panel */}
                                <SidebarPanel title="Catalog Status" icon={<Archive size={14}/>}>
                                    <CheckboxFilterList 
                                        selected={new Set([filterStatus])} 
                                        onToggle={(id: any) => setFilterStatus(id)} 
                                        items={[
                                            { id: 'all', name: 'All Products', count: counts.total }, 
                                            { id: 'not-added', name: 'Available to Add', count: counts.notInStore }, 
                                            { id: 'added', name: 'Already In Store', count: counts.inStore }
                                        ]} 
                                    />
                                </SidebarPanel>

                                {/* 3. Categories Panel */}
                                <SidebarPanel title="Categories" icon={<Layers size={14}/>}>
                                    <div className="max-h-60 overflow-y-auto">
                                        <CheckboxFilterList 
                                            items={collectionItems} 
                                            selected={selectedCollection ? new Set([selectedCollection]) : new Set()} 
                                            onToggle={id => setSelectedCollection(prev => prev === id ? null : id)} 
                                        />
                                    </div>
                                </SidebarPanel>
                            </div>
                        }
                    >
                        <ProductToolbar count={totalItems} selectedCount={selectedIds.size} bulkAddCount={bulkAddCount} onBulkAdd={handleBulkAdd} viewMode={viewMode} setViewMode={setViewMode} />

                        <div className={`transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
                            {displayProducts.length === 0 && <div className="p-16 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-400">No products found.</div>}
                            
                            {viewMode === 'grid' && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {displayProducts.map((p: any) => {
                                        const added = isAdded(p);
                                        return (
                                            <ProductGridCard
                                                key={p.id}
                                                name={p.name}
                                                image={p.featuredAsset?.preview}
                                                retailPrice={formatPrice(getPrice(p))}
                                                earnings={formatPrice(getEarnings(getPrice(p)))}
                                                stockLevel={getStock(p)} // <--- Passes stock level to card
                                                isAdded={added}
                                                isSelected={selectedIds.has(p.id)}
                                                onView={() => setViewProductId(p.id)}
                                                onSelect={() => toggleSelection(p.id)}
                                                onToggle={!added ? (e) => toggleProductSingle(p) : undefined} 
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
                                !isDetailAdded ? (
                                    <button 
                                        onClick={() => { addProduct({ productId: viewProductId! }); setViewProductId(null); }} 
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-sm transition-colors"
                                    >
                                        <Package size={16} /> Add to Store
                                    </button>
                                ) : (
                                    <div className="px-4 py-2 text-green-500 font-bold flex items-center gap-2">
                                        ✔ In Your Store
                                    </div>
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