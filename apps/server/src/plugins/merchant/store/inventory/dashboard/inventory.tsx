import React, { useState, useEffect, useMemo } from 'react';
import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, Page, PageLayout, PageBlock, PageTitle } from '@vendure/dashboard';
import { Store, Layers, Eye, Tag, Loader, Search, Trash2, AlertCircle } from 'lucide-react';
import { useDebounce } from 'use-debounce';

import { 
  ProductBrowseLayout, ProductToolbar, CheckboxFilterList, 
  ProductGridCard, Modal, StatusToast, PaginationToolbar 
} from '../../../../../custom-ui-components';

import '../../../../../custom-ui-components/css/ui-surfaces.css';

// --- QUERIES ---
const GET_MY_PRODUCTS_PAGINATED = graphql(`
  query GetMyProductsPaginated($options: ProductListOptions) {
    products(options: $options) {
      items {
        id, name, description, featuredAsset { preview }, facetValues { id name }, 
        channels { id }, customFields { ownercompany, basePrice }, variants { price }
      }
      totalItems
    }
  }
`);

const GET_FILTERS = graphql(`
  query GetInventoryFilters {
    products(options: { take: 500 }) {
      items { facetValues { id name }, customFields { ownercompany } }
    }
  }
`);

const REMOVE_FROM_CHANNEL = graphql(`mutation RemoveFromChannel($productId: ID!) { removeProductFromMyChannel(productId: $productId) }`);
const GET_SUPPLIER_MAP = graphql(`query GetSupplierMap { marketplaceSuppliers { code, supplierProfile { nameCompany } } }`);

export function InventoryComponent() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // This state controls the Modal
  const [viewProduct, setViewProduct] = useState<any | null>(null);
  
  const [statusMessage, setStatusMessage] = useState<any>(null);

  // Pagination & Filter State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 500);
  const [selectedFacets, setSelectedFacets] = useState<Set<string>>(new Set());
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());

  // Queries
  const productsQuery = useQuery({
    queryKey: ['myProducts', currentPage, pageSize, debouncedSearch, Array.from(selectedFacets), Array.from(selectedSuppliers)],
    queryFn: () => api.query(GET_MY_PRODUCTS_PAGINATED, {
      options: {
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
        sort: { createdAt: 'DESC' },
        filter: {
          name: { contains: debouncedSearch },
          ...(selectedFacets.size > 0 ? { facetValueId: { in: Array.from(selectedFacets) } } : {})
        }
      }
    }),
    placeholderData: (prev) => prev,
  });

  const filterQuery = useQuery({ queryKey: ['inventoryFilters'], queryFn: () => api.query(GET_FILTERS, {}), staleTime: 60000 });
  const supplierMapQuery = useQuery({ queryKey: ['supplierMap'], queryFn: () => api.query(GET_SUPPLIER_MAP, {}), staleTime: 360000 });

  const { mutate: removeProduct } = useMutation({
    mutationFn: ({ productId }: { productId: string }) => api.mutate(REMOVE_FROM_CHANNEL, { productId }),
    onSuccess: () => {
      productsQuery.refetch();
      setViewProduct(null); // Close modal on success
      setStatusMessage({ msg: 'Product removed', type: 'success' });
    },
  });

  // Helpers
  const rawItems = productsQuery.data?.products?.items || [];
  const totalItems = productsQuery.data?.products?.totalItems || 0;
  
  // FIX: Deduplicate items to prevent tripling
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

  // Filters List
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

  return (
    <Page pageId="merchant-inventory">
      <PageTitle>My Inventory</PageTitle>
      <PageLayout>
        <PageBlock column="main">
          <ProductBrowseLayout
            sidebar={
              <div className="space-y-4 w-full">
                {/* SEARCH PANEL: Fixed Theme Colors */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                   <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">Search</h3>
                   <div className="relative">
                      <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search..." 
                        className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        value={searchTerm} 
                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                      />
                   </div>
                </div>

                {/* SUPPLIER PANEL */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                    <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-2">
                        <Store size={14}/> Suppliers
                    </h3>
                    <CheckboxFilterList 
                        items={filters.suppliers} 
                        selected={selectedSuppliers} 
                        onToggle={id => { 
                            setSelectedSuppliers(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
                            setCurrentPage(1);
                        }} 
                    />
                </div>

                {/* CATEGORY PANEL */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                    <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-2">
                         <Layers size={14}/> Categories
                    </h3>
                    <CheckboxFilterList 
                        items={filters.facets} 
                        selected={selectedFacets} 
                        onToggle={id => {
                            setSelectedFacets(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
                            setCurrentPage(1);
                        }} 
                    />
                </div>
              </div>
            }
          >
            <ProductToolbar count={totalItems} selectedCount={selectedIds.size} bulkRemoveCount={selectedIds.size} onBulkRemove={handleBulkRemove} viewMode={viewMode} setViewMode={setViewMode} />

            {productsQuery.isLoading ? <div className="p-12 text-center"><Loader className="animate-spin inline" /></div> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {dedupedItems
                    .filter(p => selectedSuppliers.size === 0 || selectedSuppliers.has(p.customFields?.ownercompany || 'Unknown'))
                    .map((p: any) => (
                    <ProductGridCard
                      key={p.id}
                      name={p.name}
                      image={p.featuredAsset?.preview}
                      supplierName={getSupplierName(p.customFields?.ownercompany)}
                      retailPrice={formatPrice(getPrice(p))}
                      earnings={formatPrice(getEarnings(p))}
                      isAdded={true}
                      isSelected={selectedIds.has(p.id)}
                      onView={() => setViewProduct(p)} // Triggers Modal
                      onSelect={() => toggleSelection(p.id)}
                      onToggle={() => { if(confirm('Remove?')) removeProduct({ productId: p.id }) }}
                    />
                 ))}
              </div>
            )}

            {/* Pagination Logic */}
            <PaginationToolbar 
                currentPage={currentPage} 
                totalItems={totalItems} 
                pageSize={pageSize} 
                onPageChange={setCurrentPage} 
                onPageSizeChange={setPageSize} 
            />
            
            {/* THE MODAL: This was missing in the previous response */}
            {viewProduct && (
              <Modal isOpen={true} onClose={() => setViewProduct(null)} title={viewProduct.name}>
                 <div className="flex flex-col sm:flex-row gap-6">
                    <div className="sm:w-2/5 shrink-0">
                       <div className="aspect-square rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-800/20 flex items-center justify-center">
                          {viewProduct.featuredAsset ? (
                             <img src={viewProduct.featuredAsset.preview} className="w-full h-full object-cover" />
                          ) : (
                             <Eye size={48} className="text-gray-400" />
                          )}
                       </div>
                    </div>
                    <div className="sm:w-3/5 space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 ui-surface-muted rounded-xl text-center">
                             <div className="text-xs uppercase font-bold mb-1 opacity-70">Retail</div>
                             <div className="text-xl font-bold ui-text-primary">{formatPrice(getPrice(viewProduct))}</div>
                          </div>
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                             <div className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold mb-1">Profit</div>
                             <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">+{formatPrice(getEarnings(viewProduct))}</div>
                          </div>
                       </div>
                       
                       {/* Description */}
                       <div 
                         className="text-sm ui-text-primary opacity-80 prose prose-sm max-w-none" 
                         dangerouslySetInnerHTML={{ __html: viewProduct.description || 'No description available.' }} 
                       />
                       
                       {/* Supplier Info Badge */}
                       <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-100 dark:border-blue-800">
                          <Store size={14} />
                          {getSupplierName(viewProduct.customFields?.ownercompany)}
                       </div>
                    </div>
                 </div>
                 
                 <div slot="footer">
                    <button onClick={() => setViewProduct(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors">
                      Close
                    </button>
                    <button 
                       onClick={() => { if(confirm('Remove this product?')) removeProduct({ productId: viewProduct.id }) }} 
                       className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium shadow-sm"
                    >
                       <Trash2 size={16} /> Remove from Inventory
                    </button>
                 </div>
              </Modal>
            )}
            
            {statusMessage && <StatusToast message={statusMessage.msg} type={statusMessage.type} onDismiss={() => setStatusMessage(null)} />}
          </ProductBrowseLayout>
        </PageBlock>
      </PageLayout>
    </Page>
  );
}