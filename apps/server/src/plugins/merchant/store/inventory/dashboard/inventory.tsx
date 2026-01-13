import React, { useState, useMemo } from 'react';
import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, Page, PageLayout, PageBlock, PageTitle } from '@vendure/dashboard';
import { Store, Layers, Trash2, Loader, AlertTriangle, RefreshCw, Filter } from 'lucide-react';
import { useDebounce } from 'use-debounce';

import { 
  CheckboxFilterList, 
  ProductGridCard, 
  ProductGridTable, 
  StatusToast, 
  PaginationToolbar, 
  ProductDetailModal, 
  SidebarPanel, 
  SearchBox,
  ProductToolbarSidebar
} from '@lesuto/ui';

// --- QUERIES ---

const GET_MY_INVENTORY = graphql(`
  query GetMyInventory(
      $options: ProductListOptions, 
      $collectionId: ID, 
      $facetValueIds: [ID!], 
      $supplierCodes: [String!],
      $term: String,
      $stock: String
  ) {
    myInventory(
        options: $options, 
        collectionId: $collectionId, 
        facetValueIds: $facetValueIds, 
        supplierCodes: $supplierCodes,
        term: $term,
        stock: $stock
    ) {
      items {
        id, name, description, 
        featuredAsset { preview }, 
        facetValues { id name }, 
        channels { id }, 
        customFields { ownercompany, basePrice }, 
        variants { price stockOnHand sku }
      }
      totalItems
      suppliers { name count }
      facets { count facetValue { id name } }
      collections { count collection { id name } }
    }
    # We still fetch this to map codes (e.g., "SUP-001") to names (e.g., "Acme Corp")
    marketplaceSuppliers { code, supplierProfile { nameCompany } }
  }
`);

const GET_PRODUCT_DETAIL = graphql(`
  query GetProductDetail($id: ID!) {
    product(id: $id) {
      id name description
      featuredAsset { preview }
      customFields { basePrice ownercompany }
      variants {
        id name sku price stockOnHand
        options { code name }
      }
    }
  }
`);

const REMOVE_FROM_INVENTORY = graphql(`mutation RemoveFromInventory($productId: ID!) { removeProductFromInventory(productId: $productId) }`);

export function InventoryComponent() {
  // State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewProductId, setViewProductId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<any>(null);
  
  // Filters & Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  
  const [selectedFacets, setSelectedFacets] = useState<Set<string>>(new Set());
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  // --- Main Query ---
  const { data, refetch, isLoading, isError } = useQuery({
    queryKey: ['myInventory', currentPage, pageSize, debouncedSearch, Array.from(selectedFacets), Array.from(selectedSuppliers), selectedCollection],
    queryFn: () => api.query(GET_MY_INVENTORY, {
      options: {
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      },
      term: debouncedSearch,
      facetValueIds: Array.from(selectedFacets),
      supplierCodes: Array.from(selectedSuppliers),
      collectionId: selectedCollection,
      stock: undefined 
    }),
    placeholderData: (prev) => prev,
  });

  const detailQuery = useQuery({
    queryKey: ['productDetail', viewProductId],
    queryFn: () => api.query(GET_PRODUCT_DETAIL, { id: viewProductId! }),
    enabled: !!viewProductId, 
  });

  const { mutate: removeProduct } = useMutation({
    mutationFn: ({ productId }: { productId: string }) => api.mutate(REMOVE_FROM_INVENTORY, { productId }),
    onSuccess: () => {
      refetch();
      setViewProductId(null);
      setStatusMessage({ msg: 'Product removed', type: 'success' });
      // Logic to remove from set not strictly necessary as refetch updates list, but good UI practice
      setSelectedIds(prev => { 
          const next = new Set(prev);
          // We can't easily know which ID was removed if triggered via bulk, 
          // but if triggered singly we could. For now, rely on refetch.
          return next; 
      });
    },
  });

  // --- Helpers ---
  // Casting to 'any' to bypass TS errors until codegen runs
  const inventoryData = (data as any)?.myInventory;
  const products = inventoryData?.items || [];
  const totalItems = inventoryData?.totalItems || 0;
  const suppliersMap = (data as any)?.marketplaceSuppliers || [];

  const getSupplierName = (code: string) => {
    if (!code) return 'Unknown';
    const found = suppliersMap.find((s: any) => s.code === code);
    return found?.supplierProfile?.nameCompany || code;
  };

  const formatPrice = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 100);
  const getPrice = (p: any) => p.variants?.[0]?.price || 0;
  const getEarnings = (p: any) => getPrice(p) - (p.customFields?.basePrice || 0);
  const getStock = (p: any) => (p.variants || []).reduce((acc: number, v: any) => acc + (v.stockOnHand || 0), 0);

  // --- Filter Lists (Server-Side Aggregations) ---
  const facetItems = useMemo(() => {
     return (inventoryData?.facets || []).map((f: any) => ({
         id: f.facetValue.id,
         name: f.facetValue.name,
         count: f.count
     })).sort((a: any, b: any) => b.count - a.count);
  }, [inventoryData]);

  const supplierItems = useMemo(() => {
    return (inventoryData?.suppliers || []).map((v: any) => ({
        id: v.name, // The ID for filtering is the code (name in this specific DTO)
        name: getSupplierName(v.name),
        count: v.count
    })).sort((a: any, b: any) => b.count - a.count);
  }, [inventoryData, suppliersMap]);

  const collectionItems = useMemo(() => {
    return (inventoryData?.collections || []).map((c: any) => ({
        id: c.collection.id,
        name: c.collection.name,
        count: c.count
    })).sort((a: any, b: any) => b.count - a.count);
  }, [inventoryData]);

  // Actions
  const toggleSelection = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleBulkRemove = async () => {
    if (!selectedIds.size || !confirm(`Remove ${selectedIds.size} items?`)) return;
    setStatusMessage({ msg: 'Removing...', type: 'info' });
    await Promise.all(Array.from(selectedIds).map(id => removeProduct({ productId: id })));
    setStatusMessage({ msg: 'Success', type: 'success' });
    setSelectedIds(new Set());
    setTimeout(() => setStatusMessage(null), 2000);
  };

  const handleToggleAll = () => {
    if (selectedIds.size === products.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map((p: any) => p.id)));
  };

  if (isLoading) return <div className="p-12 flex justify-center"><Loader className="animate-spin text-blue-600" /></div>;

  return (
    <Page pageId="merchant-inventory">
      <PageTitle>My Inventory</PageTitle>

      <PageLayout>
        <PageBlock column="main">
            <div className="flex flex-col min-h-[600px]">
                {isError ? (
                   <div className="p-8 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 text-center">
                     <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                     <h3 className="text-red-700 dark:text-red-400 font-bold mb-1">Unable to load inventory</h3>
                     <button 
                       onClick={() => refetch()} 
                       className="px-4 py-2 mt-4 bg-white dark:bg-red-900 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-100 rounded-lg text-sm font-bold flex items-center gap-2 mx-auto hover:shadow-sm"
                     >
                       <RefreshCw size={14} /> Retry
                     </button>
                   </div>
                ) : (
                    <div className="flex-1">
                        {products.length === 0 && <div className="p-16 text-center text-gray-400">No products found.</div>}
                        
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pb-4">
                                {products.map((p: any) => (
                                    <ProductGridCard
                                        key={p.id}
                                        name={p.name}
                                        image={p.featuredAsset?.preview}
                                        retailPrice={formatPrice(getPrice(p))}
                                        earnings={formatPrice(getEarnings(p))}
                                        stockLevel={getStock(p)}
                                        isAdded={true}
                                        isSelected={selectedIds.has(p.id)}
                                        onView={() => setViewProductId(p.id)}
                                        onSelect={() => toggleSelection(p.id)}
                                        onToggle={() => { if(confirm('Remove?')) removeProduct({ productId: p.id }) }}
                                        variant='standard'
                                    />
                                ))}
                            </div>
                        ) : (
                            <ProductGridTable
                                products={products}
                                selectedIds={selectedIds}
                                onToggleSelection={toggleSelection}
                                onToggleAll={handleToggleAll}
                                onViewDetails={(id) => setViewProductId(id)}
                                isAddedPredicate={() => true}
                                getEarnings={(p) => getEarnings(p)}
                                onPrimaryAction={(p) => { if(confirm('Remove from inventory?')) removeProduct({ productId: p.id }) }}
                                variant='standard'
                            />
                        )}
                    </div>
                )}
                {totalItems > 0 && <PaginationToolbar currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />}
            </div>

            <ProductDetailModal
                variant='inverse'
                isOpen={!!viewProductId}
                onClose={() => setViewProductId(null)}
                isLoading={detailQuery.isLoading}
                product={detailQuery.data?.product}
                actionButton={
                    <button 
                       onClick={() => { if(confirm('Remove this product?')) removeProduct({ productId: viewProductId! }); setViewProductId(null); }} 
                       className="flex items-center gap-2"
                    >
                       <Trash2 size={16} /> Remove
                    </button>
                }
            />
            {statusMessage && <StatusToast message={statusMessage.msg} type={statusMessage.type} onDismiss={() => setStatusMessage(null)} />}
        </PageBlock>

        <PageBlock column="side">
            <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-sm space-y-2">
                    <ProductToolbarSidebar 
                        count={totalItems} 
                        selectedCount={selectedIds.size} 
                        bulkAddCount={selectedIds.size} 
                        onBulkAdd={handleBulkRemove}    
                        viewMode={viewMode} 
                        setViewMode={setViewMode} 
                    />
                    <div className="px-1 pb-1">
                        <SearchBox 
                            value={searchTerm} 
                            onChange={(val) => { setSearchTerm(val); setCurrentPage(1); }} 
                            placeholder="Search inventory..." 
                        />
                    </div>
                </div>

                <SidebarPanel title="Suppliers" icon={<Store size={14} />} variant="standard">
                    <CheckboxFilterList 
                        items={supplierItems} 
                        selected={selectedSuppliers} 
                        onToggle={id => { setSelectedSuppliers(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); setCurrentPage(1); }} 
                    />
                </SidebarPanel>

                <SidebarPanel title="Collections" icon={<Layers size={14} />} variant="standard">
                    <CheckboxFilterList 
                        items={collectionItems} 
                        selected={selectedCollection ? new Set([selectedCollection]) : new Set()} 
                        onToggle={id => { setSelectedCollection(prev => prev === id ? null : id); setCurrentPage(1); }} 
                    />
                </SidebarPanel>

                <SidebarPanel title="Categories" icon={<Filter size={14} />} variant="standard">
                    <CheckboxFilterList 
                        items={facetItems} 
                        selected={selectedFacets} 
                        onToggle={id => { setSelectedFacets(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); setCurrentPage(1); }} 
                    />
                </SidebarPanel>
            </div>
        </PageBlock>
      </PageLayout>
    </Page>
  );
}