import React, { useState, useMemo } from 'react';
import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, Page, PageLayout, PageBlock, PageTitle } from '@vendure/dashboard';
import { Store, Layers, Trash2, Loader, AlertTriangle, RefreshCw } from 'lucide-react';
import { useDebounce } from 'use-debounce';

import { 
  ProductBrowseLayout, 
  ProductToolbar, 
  CheckboxFilterList, 
  ProductGridCard, 
  ProductGridTable, 
  StatusToast, 
  PaginationToolbar, 
  ProductDetailModal, 
  SidebarPanel, 
  SearchBox 
} from '@lesuto/ui';

// --- QUERIES (Unchanged) ---
const GET_MY_PRODUCTS_PAGINATED = graphql(`
  query GetMyProductsPaginated($options: ProductListOptions) {
    products(options: $options) {
      items {
        id, name, description, featuredAsset { preview }, facetValues { id name }, 
        channels { id }, customFields { ownercompany, basePrice }, 
        variants { price stockOnHand sku }
      }
      totalItems
    }
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

const GET_FILTERS = graphql(`query GetInventoryFilters { products(options: { take: 500 }) { items { facetValues { id name }, customFields { ownercompany } } } }`);
const REMOVE_FROM_CHANNEL = graphql(`mutation RemoveFromChannel($productId: ID!) { removeProductFromMyChannel(productId: $productId) }`);
const GET_SUPPLIER_MAP = graphql(`query GetSupplierMap { marketplaceSuppliers { code, supplierProfile { nameCompany } } }`);

export function InventoryComponent() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewProductId, setViewProductId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  const [selectedFacets, setSelectedFacets] = useState<Set<string>>(new Set());
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());

  // --- Queries ---
  const productsQuery = useQuery({
    queryKey: ['myProducts', currentPage, pageSize, debouncedSearch],
    queryFn: () => api.query(GET_MY_PRODUCTS_PAGINATED, {
      options: {
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
        sort: { createdAt: 'DESC' },
        filter: { name: { contains: debouncedSearch } }
      }
    }),
    placeholderData: (prev) => prev,
  });

  const detailQuery = useQuery({
    queryKey: ['productDetail', viewProductId],
    queryFn: () => api.query(GET_PRODUCT_DETAIL, { id: viewProductId! }),
    enabled: !!viewProductId, 
  });

  const filterQuery = useQuery({ queryKey: ['inventoryFilters'], queryFn: () => api.query(GET_FILTERS, {}), staleTime: 60000 });
  const supplierMapQuery = useQuery({ queryKey: ['supplierMap'], queryFn: () => api.query(GET_SUPPLIER_MAP, {}), staleTime: 360000 });

  const { mutate: removeProduct } = useMutation({
    mutationFn: ({ productId }: { productId: string }) => api.mutate(REMOVE_FROM_CHANNEL, { productId }),
    onSuccess: () => {
      productsQuery.refetch();
      setViewProductId(null);
      setStatusMessage({ msg: 'Product removed', type: 'success' });
    },
  });

  // --- Helpers ---
  const rawItems = productsQuery.data?.products?.items || [];
  const totalItems = productsQuery.data?.products?.totalItems || 0;
  
  const dedupedItems = useMemo(() => {
    return Array.from(new Map(rawItems.map(item => [item.id, item])).values());
  }, [rawItems]);
  
  const getSupplierName = (code: string) => {
    if (!code) return '';
    const map = supplierMapQuery.data?.marketplaceSuppliers;
    const found = map?.find(s => s.code === code);
    return found?.supplierProfile?.nameCompany || code;
  };

  const formatPrice = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 100);
  const getPrice = (p: any) => p.variants?.[0]?.price || 0;
  const getEarnings = (p: any) => getPrice(p) - (p.customFields?.basePrice || 0);
  const getStock = (p: any) => (p.variants || []).reduce((acc: number, v: any) => acc + (v.stockOnHand || 0), 0);

  const filters = useMemo(() => {
    const raw = filterQuery.data?.products?.items || [];
    const facets = new Map(), suppliers = new Set();
    raw.forEach((p: any) => {
      p.facetValues?.forEach((f: any) => facets.set(f.id, f.name));
      if(p.customFields?.ownercompany) suppliers.add(p.customFields.ownercompany);
    });
    return {
      facets: Array.from(facets.entries()).map(([id, name]) => ({ id, name, count: 0 })),
      suppliers: Array.from(suppliers).map((code: any) => ({ id: code, name: getSupplierName(code), count: 0 }))
    };
  }, [filterQuery.data, supplierMapQuery.data]);

  const toggleSelection = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleBulkRemove = async () => {
    if (!selectedIds.size || !confirm(`Remove ${selectedIds.size} items?`)) return;
    setStatusMessage({ msg: 'Removing...', type: 'info' });
    await Promise.all(Array.from(selectedIds).map(id => removeProduct({ productId: id })));
    setStatusMessage({ msg: 'Success', type: 'success' });
    setSelectedIds(new Set());
    setTimeout(() => setStatusMessage(null), 2000);
  };

  // Client Side Filtering
  const filteredDisplayItems = useMemo(() => {
    return dedupedItems.filter(p => {
        const matchSupplier = selectedSuppliers.size === 0 || selectedSuppliers.has(p.customFields?.ownercompany || 'Unknown');
        const matchFacet = selectedFacets.size === 0 || (p.facetValues || []).some((fv: any) => selectedFacets.has(fv.id));
        return matchSupplier && matchFacet;
    });
  }, [dedupedItems, selectedSuppliers, selectedFacets]);

  // Toggle All Helper for Table
  const handleToggleAll = () => {
    if (selectedIds.size === filteredDisplayItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredDisplayItems.map(p => p.id)));
  };

  return (
    <Page pageId="merchant-inventory">
      <PageTitle>My Inventory</PageTitle>
      <PageLayout>
        <PageBlock column="main">
          <ProductBrowseLayout
            sidebar={
              <div className="space-y-4 w-full">
                <SidebarPanel title="Search" variant='inverse'>
                    <SearchBox 
                        value={searchTerm} 
                        onChange={(val) => { setSearchTerm(val); setCurrentPage(1); }} 
                        placeholder="Search inventory..."
                    />
                </SidebarPanel>
                <SidebarPanel title="Suppliers" icon={<Store size={14}/>} variant='inverse'>
                    <CheckboxFilterList 
                        items={filters.suppliers} 
                        selected={selectedSuppliers} 
                        onToggle={id => { setSelectedSuppliers(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); setCurrentPage(1); }} 
                    />
                </SidebarPanel>
                <SidebarPanel title="Categories" icon={<Layers size={14}/>} variant='inverse'>
                    <CheckboxFilterList 
                        items={filters.facets} 
                        selected={selectedFacets} 
                        onToggle={id => { setSelectedFacets(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); setCurrentPage(1); }} 
                    />
                </SidebarPanel>
              </div>
            }
          >
            <ProductToolbar variant='inverse' count={totalItems} selectedCount={selectedIds.size} bulkRemoveCount={selectedIds.size} onBulkRemove={handleBulkRemove} viewMode={viewMode} setViewMode={setViewMode} />

            {productsQuery.isError ? (
              <div className="p-8 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 text-center">
                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <h3 className="text-red-700 dark:text-red-400 font-bold mb-1">Unable to load inventory</h3>
                <button 
                  onClick={() => productsQuery.refetch()} 
                  className="px-4 py-2 mt-4 bg-white dark:bg-red-900 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-100 rounded-lg text-sm font-bold flex items-center gap-2 mx-auto hover:shadow-sm"
                >
                  <RefreshCw size={14} /> Retry
                </button>
              </div>
            ) : productsQuery.isLoading ? (
              <div className="p-24 text-center">
                <Loader className="animate-spin inline text-blue-600 w-8 h-8" />
              </div>
            ) : (
              /* --- VIEW TOGGLE LOGIC --- */
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {filteredDisplayItems.map((p: any) => (
                        <ProductGridCard
                          key={p.id}
                          name={p.name}
                          image={p.featuredAsset?.preview}
                          supplierName={getSupplierName(p.customFields?.ownercompany)}
                          retailPrice={formatPrice(getPrice(p))}
                          earnings={formatPrice(getEarnings(p))}
                          stockLevel={getStock(p)} 
                          isAdded={true}
                          isSelected={selectedIds.has(p.id)}
                          onView={() => setViewProductId(p.id)} 
                          onSelect={() => toggleSelection(p.id)}
                          onToggle={() => { if(confirm('Remove?')) removeProduct({ productId: p.id }) }}
                        />
                     ))}
                  </div>
                ) : (
                  <ProductGridTable
                    products={filteredDisplayItems}
                    selectedIds={selectedIds}
                    onToggleSelection={toggleSelection}
                    onToggleAll={handleToggleAll}
                    onViewDetails={(id) => setViewProductId(id)}
                    isAddedPredicate={() => true} // Always true in inventory
                    onPrimaryAction={(p) => { if(confirm('Remove from inventory?')) removeProduct({ productId: p.id }) }}
                    getSupplierName={getSupplierName}
                    variant='inverse'
                  />
                )}
                {filteredDisplayItems.length === 0 && <div className="py-12 text-center text-gray-400">No products match your filters.</div>}
              </>
            )}

            <PaginationToolbar currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
            
            <ProductDetailModal
                isOpen={!!viewProductId}
                onClose={() => setViewProductId(null)}
                isLoading={detailQuery.isLoading}
                product={detailQuery.data?.product}
                actionButton={
                    <button 
                       onClick={() => { if(confirm('Remove this product?')) removeProduct({ productId: viewProductId! }) }} 
                       className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium shadow-sm transition-colors"
                    >
                       <Trash2 size={16} /> Remove from Inventory
                    </button>
                }
            />
            
            {statusMessage && <StatusToast message={statusMessage.msg} type={statusMessage.type} onDismiss={() => setStatusMessage(null)} />}
          </ProductBrowseLayout>
        </PageBlock>
      </PageLayout>
    </Page>
  );
}