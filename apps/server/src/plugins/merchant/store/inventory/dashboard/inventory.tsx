import { useState } from 'react';
import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Page, PageTitle, PageLayout, PageBlock, api } from '@vendure/dashboard';

// Define queries with typed graphql
const GET_MY_PRODUCTS = graphql(`
  query GetMyProducts($options: ProductListOptions) {
    products(options: $options) {
      items {
        id
        name
        customFields {
          ownercompany
        } # Use existing 'ownerCompany' custom field
        # Add other fields like price, stock, etc. if needed
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
  const [supplierSearch, setSupplierSearch] = useState('');
  const [sort, setSort] = useState<{ field: string; order: 'ASC' | 'DESC' }>({ field: 'name', order: 'ASC' });

  // Use TanStack Query for fetching with variables
  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['myProducts', supplierSearch, sort],
    queryFn: async () => {
      try {
        const variables = {
          options: {
            filter: supplierSearch ? { customFields: { ownerCompany: { contains: supplierSearch } } } : {},
            sort: { [sort.field]: sort.order },
          },
        };
        const result = await api.query(GET_MY_PRODUCTS, variables);
        console.log('Query result:', result); // Log the fetched data
        return result;
      } catch (err) {
        console.error('Query error:', err); // Log any fetch errors
        throw err;
      }
    },
  });

  // Use TanStack Mutation for mutations
  const { mutate: remove } = useMutation({
    mutationFn: (variables: { productId: string }) => api.mutate(REMOVE_FROM_CHANNEL, variables),
  });

  const [statusMessage, setStatusMessage] = useState<{ msg: string, type: 'info' | 'error' } | null>(null);

  const products = data?.products.items || [];
  console.log('Products array:', products); // Log the processed products

  const handleRemove = async (productId: string, name: string) => {
    try {
      setStatusMessage({ msg: `Removing ${name}...`, type: 'info' });
      await remove({ productId });
      setStatusMessage({ msg: `Success! Product removed.`, type: 'info' });
      refetch(); 
    } catch (e: any) {
      setStatusMessage({ msg: `Failed: ${e.message}`, type: 'error' });
    }
    setTimeout(() => setStatusMessage(null), 6000);
  };

  const handleSort = (field: string) => {
    setSort({
      field,
      order: sort.field === field && sort.order === 'ASC' ? 'DESC' : 'ASC',
    });
  };

  return (
    <Page pageId="merchant-inventory">
      {/* ✅ FIX: Use PageTitle here */}
      <PageTitle>Inventory</PageTitle>
      
      <PageLayout>
        {loading ? (
          <div className="p-8 text-center">Loading Inventory...</div>
        ) : error ? (
          <div className="p-8 text-red-600">Error: {error.message}</div>
        ) : (
          <PageBlock column="main" blockId="inventory-block">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <p className="text-lg text-gray-600">
                  View and manage products in your inventory.
                </p>
              </div>

              {statusMessage && (
                <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg shadow-xl border ${statusMessage.type === 'error' ? 'bg-red-600 text-white border-red-700' : 'bg-blue-600 text-white border-blue-700'}`}>
                  {statusMessage.msg}
                </div>
              )}

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search by owner company..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="w-full max-w-md p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-200">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th onClick={() => handleSort('name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                        Name {sort.field === 'name' ? (sort.order === 'ASC' ? '↑' : '↓') : ''}
                      </th>
                      <th onClick={() => handleSort('customFields.ownerCompany')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                        Owner Company {sort.field === 'customFields.ownerCompany' ? (sort.order === 'ASC' ? '↑' : '↓') : ''}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {products.map((product: any) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.customFields.ownerCompany}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleRemove(product.id, product.name)}
                            className="bg-red-600 text-white py-1 px-3 rounded font-medium hover:bg-red-700 transition-all"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {products.length === 0 && (
                <div className="mt-12 text-center p-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <div className="text-5xl mb-4">📦</div>
                  <h3 className="text-xl font-bold text-gray-900">No Products in inventory</h3>
                  <p className="text-gray-500 max-w-xs mx-auto mt-2">
                    Your inventory is empty.
                  </p>
                </div>
              )}
            </div>
          </PageBlock>
        )}
      </PageLayout>
    </Page>
  );
}