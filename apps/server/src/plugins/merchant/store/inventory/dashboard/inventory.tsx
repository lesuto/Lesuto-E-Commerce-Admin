import { useState } from 'react';
import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Page, PageTitle, PageLayout, PageBlock, api } from '@vendure/dashboard';

// 1. UPDATED QUERY: Fetches Image and Price to match Storefront style
const GET_MY_PRODUCTS = graphql(`
  query GetMyProducts($options: ProductListOptions) {
    products(options: $options) {
      items {
        id
        name
        featuredAsset {
          preview
        }
        variants {
          price
          currencyCode
        }
        customFields {
          ownercompany
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

export function MerchantInventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState<{ field: string; order: 'ASC' | 'DESC' }>({ field: 'name', order: 'ASC' });
  const [statusMessage, setStatusMessage] = useState<{ msg: string, type: 'info' | 'error' } | null>(null);

  // Use TanStack Query
  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['myProducts', searchTerm, sort],
    queryFn: async () => {
      // 2. UPDATED FILTER: Search by Name matches "Search through products" request
      const variables = {
        options: {
          filter: searchTerm ? { name: { contains: searchTerm } } : {},
          sort: { [sort.field]: sort.order },
          take: 50, // Load a reasonable amount
        },
      };
      return await api.query(GET_MY_PRODUCTS, variables);
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: (variables: { productId: string }) => api.mutate(REMOVE_FROM_CHANNEL, variables),
  });

  const products = data?.products.items || [];

  const handleRemove = async (productId: string, name: string) => {
    if(!confirm(`Are you sure you want to remove "${name}" from your list?`)) return;

    try {
      setStatusMessage({ msg: `Removing ${name}...`, type: 'info' });
      await remove({ productId });
      setStatusMessage({ msg: `Successfully removed ${name}`, type: 'info' });
      refetch();
    } catch (e: any) {
      setStatusMessage({ msg: `Failed: ${e.message}`, type: 'error' });
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSort = (field: string) => {
    setSort({
      field,
      order: sort.field === field && sort.order === 'ASC' ? 'DESC' : 'ASC',
    });
  };

  // Helper to format price for display (Storefront style)
  const formatPrice = (min: number, max: number, currency: string) => {
    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency });
    if (min === max) return fmt.format(min / 100);
    return `${fmt.format(min / 100)} - ${fmt.format(max / 100)}`;
  };

  return (
    <Page pageId="merchant-inventory">
      <PageTitle>My Inventory</PageTitle>
      
      <PageLayout>
        <PageBlock column="main" blockId="inventory-block">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage Products</h2>
              <p className="text-sm text-gray-500">Remove items or manage your active inventory.</p>
            </div>
            
            {/* Styled Search Bar */}
            <div className="relative w-full md:w-96 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-shadow"
                placeholder="Search products by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Status Toast */}
          {statusMessage && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 shadow-sm border-l-4 ${
              statusMessage.type === 'error' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-blue-50 border-blue-500 text-blue-700'
            }`}>
              <span className="text-sm font-medium">{statusMessage.msg}</span>
            </div>
          )}

          {/* Main Content Area */}
          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-8 bg-red-50 text-red-600 rounded-lg border border-red-100">
              Error loading inventory: {error.message}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 px-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="text-6xl mb-4 opacity-50">📦</div>
              <h3 className="text-lg font-medium text-gray-900">No products found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your search terms or add products to your channel.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/80 backdrop-blur">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Image
                      </th>
                      <th 
                        onClick={() => handleSort('name')} 
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          Product Name
                          {sort.field === 'name' && (
                            <span className="text-blue-500">{sort.order === 'ASC' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th 
                        onClick={() => handleSort('customFields.ownerCompany')}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                      >
                         <div className="flex items-center gap-1">
                          Owner Company
                          {sort.field === 'customFields.ownerCompany' && (
                            <span className="text-blue-500">{sort.order === 'ASC' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product: any) => {
                      // Calculate price range for display
                      const prices = product.variants.map((v: any) => v.price);
                      const minPrice = Math.min(...prices);
                      const maxPrice = Math.max(...prices);
                      const currency = product.variants[0]?.currencyCode || 'USD';

                      return (
                        <tr key={product.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-12 w-12 rounded-lg border border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                              {product.featuredAsset ? (
                                <img 
                                  src={product.featuredAsset.preview} 
                                  alt={product.name} 
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-xl">📷</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatPrice(minPrice, maxPrice, currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.customFields.ownercompany || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleRemove(product.id, product.name)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 border border-red-200 rounded-md text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </PageBlock>
      </PageLayout>
    </Page>
  );
}