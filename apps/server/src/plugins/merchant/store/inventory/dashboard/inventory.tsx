import React, { useState, useMemo } from 'react';
import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, Page, PageLayout, PageBlock, PageTitle } from '@vendure/dashboard';
import { 
    LayoutList, LayoutGrid, Search, Trash2, X, Eye, 
    CheckSquare, Square, Tag, Package, Store, Layers, Filter, AlertCircle
} from 'lucide-react';

// --- SAFE GRAPHQL QUERY ---
const GET_MY_PRODUCTS = graphql(`
  query GetMyProducts($options: ProductListOptions) {
    products(options: $options) {
      items {
        id
        name
        description
        slug
        enabled
        featuredAsset { preview }
        facetValues { id name }
        customFields {
          ownercompany
          basePrice 
        }
        variants {
            price
            currencyCode
        }
      }
      totalItems
    }
  }
`);

const REMOVE_FROM_CHANNEL = graphql(`
  mutation RemoveFromChannel($productId: ID!) {
    removeProductFromMyChannel(productId: $productId)
  }
`);

export function InventoryComponent() {
    // --- UI State ---
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [viewProduct, setViewProduct] = useState<any | null>(null);
    const [statusMessage, setStatusMessage] = useState<{ msg: string, type: 'info' | 'error' } | null>(null);

    // --- Filter State ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFacets, setSelectedFacets] = useState<Set<string>>(new Set());
    const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
    const [hideSoldOut, setHideSoldOut] = useState(false);

    // --- Data Fetching ---
    const { data, isLoading, refetch, error } = useQuery({
        queryKey: ['myProducts'], 
        queryFn: async () => {
            return await api.query(GET_MY_PRODUCTS, {
                options: { take: 100, sort: { createdAt: 'DESC' } },
            });
        },
    });

    const { mutateAsync: removeProduct } = useMutation({
        mutationFn: (variables: { productId: string }) => api.mutate(REMOVE_FROM_CHANNEL, variables),
    });

    const rawProducts = data?.products?.items || [];

    // --- Helpers ---
    const getRetailPrice = (p: any) => {
        if (!p?.variants?.length) return 0;
        return p.variants[0].price || 0;
    };

    const getBasePrice = (p: any) => {
        return p?.customFields?.basePrice || 0;
    };

    const formatPrice = (val: any) => {
        const num = Number(val);
        if (isNaN(num)) return '$0.00';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num / 100);
    };

    const getEarnings = (p: any) => {
        const retail = getRetailPrice(p);
        const base = getBasePrice(p);
        return (retail || 0) - (base || 0);
    };

    // Helper to make "anderson_teak_us" look like "Anderson Teak Us"
    const formatSupplierName = (code: string) => {
        if (!code || code === 'Unknown') return 'Unknown Supplier';
        return code
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // --- Aggregations ---
    const aggregations = useMemo(() => {
        const facetCounts = new Map();
        const supplierCounts = new Map();

        rawProducts.forEach((p: any) => {
            // Facets
            const facets = p?.facetValues || [];
            facets.forEach((f: any) => {
                if (f?.id) {
                    const existing = facetCounts.get(f.id) || { name: f.name, count: 0 };
                    facetCounts.set(f.id, { name: f.name, count: existing.count + 1 });
                }
            });

            // Suppliers
            const supplierCode = p?.customFields?.ownercompany || 'Unknown';
            // Store the friendly name in the map key if you want, or map code -> friendly later
            // Here we count by code to ensure uniqueness
            const sCount = supplierCounts.get(supplierCode) || 0;
            supplierCounts.set(supplierCode, sCount + 1);
        });

        return {
            facets: Array.from(facetCounts.entries()).sort((a: any, b: any) => b[1].count - a[1].count),
            suppliers: Array.from(supplierCounts.entries()).sort((a: any, b: any) => b[1] - a[1])
        };
    }, [rawProducts]);

    // --- Filtering ---
    const filteredProducts = useMemo(() => {
        return rawProducts.filter((p: any) => {
            if (!p) return false;
            
            // Search
            if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            
            // Facets
            if (selectedFacets.size > 0) {
                const facets = p.facetValues || [];
                if (!facets.some((f: any) => selectedFacets.has(f.id))) return false;
            }

            // Suppliers
            if (selectedSuppliers.size > 0) {
                const supplier = p.customFields?.ownercompany || 'Unknown';
                if (!selectedSuppliers.has(supplier)) return false;
            }

            return true;
        });
    }, [rawProducts, searchTerm, selectedFacets, selectedSuppliers]);

    // --- Actions ---
    const handleBulkRemove = async () => {
        if (selectedIds.size === 0 || !confirm(`Remove ${selectedIds.size} items?`)) return;
        setStatusMessage({ msg: 'Removing...', type: 'info' });
        try {
            await Promise.all(Array.from(selectedIds).map(id => removeProduct({ productId: id })));
            setStatusMessage({ msg: 'Success', type: 'info' });
            setSelectedIds(new Set());
            refetch();
        } catch(e: any) { setStatusMessage({ msg: e.message, type: 'error' }); }
        setTimeout(() => setStatusMessage(null), 3000);
    };

    const toggleSelection = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const newSet = new Set(selectedIds);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setSelectedIds(newSet);
    };

    // RESTORED: Toggle All Function
    const toggleAll = () => {
        if (selectedIds.size === filteredProducts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProducts.map((p: any) => p.id)));
        }
    };

    const toggleSetItem = (set: Set<string>, item: string, setter: any) => {
        const newSet = new Set(set);
        newSet.has(item) ? newSet.delete(item) : newSet.add(item);
        setter(newSet);
    };

    const handleRemoveSingle = (p: any, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (confirm(`Remove ${p.name}?`)) {
            removeProduct({ productId: p.id }).then(() => refetch());
        }
    };

    // --- Render ---

    if (isLoading) return <div className="p-12 text-center text-gray-500">Loading Inventory...</div>;
    if (error) return <div className="p-12 text-red-600">Error: {(error as any).message}</div>;

    return (
        <Page pageId="merchant-inventory">
            <PageTitle>My Inventory</PageTitle>
            <PageLayout>
                <PageBlock column="main">
                    <div className="flex flex-col lg:flex-row gap-6 items-start w-full min-h-[600px]">
                        
                        {/* --- LEFT SIDEBAR --- */}
                        <div className="w-full lg:w-64 shrink-0 space-y-4">
                            
                            {/* Search */}
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Search..." 
                                        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Suppliers */}
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-2">
                                    <Store size={14} /> Suppliers
                                </h3>
                                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                    {aggregations.suppliers.map(([code, count]: any) => (
                                        <div key={code} onClick={() => toggleSetItem(selectedSuppliers, code, setSelectedSuppliers)} className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1.5 rounded transition-colors">
                                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedSuppliers.has(code) ? 'bg-blue-600 border-blue-600' : 'border-gray-400 dark:border-gray-500'}`}>
                                                    {selectedSuppliers.has(code) && <CheckSquare size={10} className="text-white"/>}
                                                </div>
                                                <span className="truncate w-32" title={code}>{formatSupplierName(code)}</span>
                                            </div>
                                            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 rounded-full">{count}</span>
                                        </div>
                                    ))}
                                    {aggregations.suppliers.length === 0 && <div className="text-xs text-gray-400 italic">No suppliers found</div>}
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-2">
                                    <Layers size={14} /> Categories
                                </h3>
                                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                    {aggregations.facets.map(([id, {name, count}]: any) => (
                                        <div key={id} onClick={() => toggleSetItem(selectedFacets, id, setSelectedFacets)} className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1.5 rounded transition-colors">
                                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedFacets.has(id) ? 'bg-blue-600 border-blue-600' : 'border-gray-400 dark:border-gray-500'}`}>
                                                    {selectedFacets.has(id) && <CheckSquare size={10} className="text-white"/>}
                                                </div>
                                                <span className="truncate w-32">{name}</span>
                                            </div>
                                            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 rounded-full">{count}</span>
                                        </div>
                                    ))}
                                    {aggregations.facets.length === 0 && <div className="text-xs text-gray-400 italic">No categories found</div>}
                                </div>
                            </div>
                        </div>

                        {/* --- RIGHT CONTENT --- */}
                        <div className="flex-1 w-full">
                            {/* Toolbar */}
                            <div className="flex justify-between items-center mb-4 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div className="text-sm text-gray-600 dark:text-gray-300 px-2">
                                    Found <strong>{filteredProducts.length}</strong> products
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedIds.size > 0 && (
                                        <button onClick={handleBulkRemove} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold flex gap-2 items-center transition-colors">
                                            <Trash2 size={14}/> Remove ({selectedIds.size})
                                        </button>
                                    )}
                                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2"></div>
                                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-md">
                                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300' : 'text-gray-400 dark:text-gray-400'}`}><LayoutList size={16}/></button>
                                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300' : 'text-gray-400 dark:text-gray-400'}`}><LayoutGrid size={16}/></button>
                                    </div>
                                </div>
                            </div>

                            {/* Empty State */}
                            {filteredProducts.length === 0 && (
                                <div className="p-16 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500">
                                    <div className="flex justify-center mb-2"><Filter size={32} /></div>
                                    <p>No products match your filters.</p>
                                </div>
                            )}

                            {/* GRID VIEW */}
                            {viewMode === 'grid' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredProducts.map((p: any) => {
                                        const isSelected = selectedIds.has(p.id);
                                        const retail = getRetailPrice(p);
                                        const earnings = getEarnings(p);

                                        return (
                                            <div 
                                                key={p.id} 
                                                onClick={() => setViewProduct(p)} 
                                                className={`group relative border rounded-xl overflow-hidden bg-white dark:bg-gray-800 cursor-pointer hover:shadow-lg transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-200 dark:border-gray-700'}`}
                                            >
                                                {/* Image */}
                                                <div className="relative aspect-square bg-gray-100 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                                                    <button onClick={(e) => toggleSelection(p.id, e)} className="absolute top-2 left-2 z-10 p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-md shadow-sm transition-transform hover:scale-105">
                                                        {isSelected ? <CheckSquare size={18} className="text-blue-600 dark:text-blue-400"/> : <Square size={18} className="text-gray-400 dark:text-gray-500"/>}
                                                    </button>
                                                    
                                                    {p.featuredAsset ? (
                                                        <img src={p.featuredAsset.preview + '?preset=medium'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={p.name}/>
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-gray-300 dark:text-gray-600"><Eye size={32}/></div>
                                                    )}
                                                    
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors" />
                                                </div>

                                                {/* Details */}
                                                <div className="p-4">
                                                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm line-clamp-1 mb-1" title={p.name}>{p.name}</h3>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1">
                                                        <Store size={10} /> {formatSupplierName(p.customFields?.ownercompany)}
                                                    </div>
                                                    
                                                    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">Retail</span>
                                                            <span className="font-mono text-gray-900 dark:text-gray-100 font-medium">{formatPrice(retail)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-emerald-600 dark:text-emerald-400 text-xs uppercase font-bold">Earnings</span>
                                                            <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">+{formatPrice(earnings)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* LIST VIEW */}
                            {viewMode === 'list' && (
                                <div className="border rounded-xl overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase font-bold text-gray-500 dark:text-gray-400">
                                            <tr>
                                                <th className="p-4 w-12 text-center">
                                                    <button onClick={toggleAll}>
                                                        {selectedIds.size === filteredProducts.length && filteredProducts.length > 0 
                                                            ? <CheckSquare size={18} className="text-blue-600 dark:text-blue-400 mx-auto" /> 
                                                            : <Square size={18} className="mx-auto" />
                                                        }
                                                    </button>
                                                </th>
                                                <th className="p-4">Product</th>
                                                <th className="p-4">Retail</th>
                                                <th className="p-4">Earnings</th>
                                                <th className="p-4 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {filteredProducts.map((p: any) => {
                                                const isSelected = selectedIds.has(p.id);
                                                return (
                                                    <tr key={p.id} onClick={() => setViewProduct(p)} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                                                        <td className="p-4 text-center" onClick={(e) => toggleSelection(p.id, e)}>
                                                            {isSelected ? <CheckSquare size={18} className="text-blue-600 dark:text-blue-400 mx-auto"/> : <Square size={18} className="text-gray-400 dark:text-gray-500 mx-auto"/>}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden shrink-0">
                                                                    {p.featuredAsset ? <img src={p.featuredAsset.preview + '?preset=tiny'} className="w-full h-full object-cover"/> : <div className="h-full flex items-center justify-center text-gray-300"><Eye size={16}/></div>}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-gray-900 dark:text-gray-100">{p.name}</div>
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{formatSupplierName(p.customFields?.ownercompany)}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 font-mono text-gray-900 dark:text-gray-200">{formatPrice(getRetailPrice(p))}</td>
                                                        <td className="p-4"><span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">+{formatPrice(getEarnings(p))}</span></td>
                                                        <td className="p-4 text-right">
                                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveSingle(p, e) }} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 transition-colors"><Trash2 size={18}/></button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </PageBlock>
            </PageLayout>

            {/* MODAL (Dark Mode Fixed) */}
            {viewProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-700">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-1">{viewProduct.name}</h3>
                            <button onClick={() => setViewProduct(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400"><X size={20}/></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="flex flex-col sm:flex-row gap-6">
                                <div className="sm:w-2/5 shrink-0">
                                    <div className="aspect-square bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-4 relative">
                                        {viewProduct.featuredAsset ? <img src={viewProduct.featuredAsset.preview} className="w-full h-full object-cover"/> : <div className="h-full flex items-center justify-center text-gray-300 dark:text-gray-600"><Eye size={32}/></div>}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(viewProduct.facetValues || []).map((f: any) => (
                                            <span key={f.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded-md">
                                                <Tag size={10} /> {f.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="sm:w-3/5 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-center">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Retail</div>
                                            <div className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(getRetailPrice(viewProduct))}</div>
                                        </div>
                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800 text-center">
                                            <div className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold mb-1">Profit</div>
                                            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">+{formatPrice(getEarnings(viewProduct))}</div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Description</h4>
                                        <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-h-40 overflow-y-auto" dangerouslySetInnerHTML={{__html: viewProduct.description || 'No description available.'}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3">
                            <button onClick={() => setViewProduct(null)} className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors">Close</button>
                            <button onClick={(e) => handleRemoveSingle(viewProduct, e)} className="px-4 py-2 bg-white dark:bg-gray-700 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"><Trash2 size={16} /> Remove Product</button>
                        </div>
                    </div>
                </div>
            )}

            {statusMessage && <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg border text-sm font-medium animate-in slide-in-from-bottom-5 ${statusMessage.type === 'error' ? 'bg-red-600 text-white border-red-700' : 'bg-blue-600 text-white border-blue-700'}`}>{statusMessage.msg}</div>}
        </Page>
    );
}