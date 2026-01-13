import React from 'react';
import { Eye, CheckSquare, Square, AlertCircle, Trash2, Plus, Store } from 'lucide-react';
import { CardVariant } from './product-grid-card';

export interface TableProduct {
  id: string;
  name: string;
  featuredAsset?: { preview: string };
  sku?: string;
  variants?: Array<{ price: number; stockOnHand: number; sku?: string }>;
  customFields?: { basePrice?: number; ownercompany?: string };
}

interface ProductGridTableProps {
  products: TableProduct[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll?: () => void;
  onViewDetails: (id: string) => void;
  variant?: CardVariant;
  currencyCode?: string;
  isAddedPredicate?: (product: TableProduct) => boolean;
  onPrimaryAction: (product: TableProduct) => void;
  getEarnings?: (product: TableProduct) => number | null;
  getSupplierName?: (code: string) => string;
}

export const ProductGridTable: React.FC<ProductGridTableProps> = ({
  products,
  selectedIds,
  onToggleSelection,
  onToggleAll,
  onViewDetails,
  variant = 'inverse',
  currencyCode = 'USD',
  isAddedPredicate,
  onPrimaryAction,
  getEarnings,
  getSupplierName
}) => {

  const styles = {
    standard: {
      header: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700",
      row: "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800",
      text: "text-gray-700 dark:text-gray-200",
      subText: "text-gray-500 dark:text-gray-400"
    },
    inverse: {
      header: "bg-gray-900 border-gray-700 text-gray-400",
      row: "bg-gray-900 border-gray-800 hover:bg-gray-800",
      text: "text-gray-100",
      subText: "text-gray-500"
    }
  };

  const s = styles[variant];

  const formatPrice = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(val / 100);

  const getStock = (p: TableProduct) => 
    (p.variants || []).reduce((acc, v) => acc + (v.stockOnHand || 0), 0);

  const getDisplayPrice = (p: TableProduct) => {
    const price = p.customFields?.basePrice || p.variants?.[0]?.price || 0;
    return formatPrice(price);
  };

  return (
    <div className={`w-full overflow-hidden rounded-xl border shadow-sm ${variant === 'inverse' ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className={`text-xs uppercase font-bold border-b ${s.header}`}>
            <tr>
              <th className="p-4 w-12 text-center">
                {onToggleAll && (
                  <button onClick={onToggleAll} className="opacity-60 hover:opacity-100 transition-opacity">
                    <CheckSquare size={16} />
                  </button>
                )}
              </th>
              <th className="p-4 w-16">Image</th>
              <th className="p-4">Product Details</th>
              <th className="p-4 text-center">Stock</th>
              <th className="p-4 text-right">Price</th>
              {getEarnings && <th className="p-4 text-right">Profit</th>}
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {products.map((product) => {
              const isSelected = selectedIds.has(product.id);
              const isAdded = isAddedPredicate ? isAddedPredicate(product) : true;
              const stock = getStock(product);
              const earnings = getEarnings ? getEarnings(product) : null;
              const supplierName = product.customFields?.ownercompany && getSupplierName 
                ? getSupplierName(product.customFields.ownercompany) 
                : null;

              return (
                <tr 
                  key={product.id} 
                  className={`transition-colors group ${s.row} ${isSelected ? 'bg-blue-900/10 dark:bg-blue-900/20' : ''}`}
                >
                  <td className="p-4 text-center">
                    <button onClick={() => onToggleSelection(product.id)} className="text-gray-500 hover:text-blue-500 transition-colors">
                      {isSelected ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} />}
                    </button>
                  </td>
                  <td className="p-4">
                    <div 
                      onClick={() => onViewDetails(product.id)}
                      className="w-12 h-12 rounded-lg border border-gray-700 bg-gray-800 overflow-hidden cursor-pointer flex items-center justify-center hover:scale-105 transition-transform"
                    >
                      {product.featuredAsset ? (
                        <img src={`${product.featuredAsset.preview}?preset=tiny`} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Eye size={16} className="text-gray-600" />
                      )}
                    </div>
                  </td>
                  <td className="p-4 max-w-xs">
                    <div 
                      onClick={() => onViewDetails(product.id)}
                      className={`font-bold truncate cursor-pointer hover:underline ${s.text}`}
                    >
                      {product.name}
                    </div>
                    <div className={`flex flex-col gap-1 mt-1 text-xs ${s.subText}`}>
                       <span className="font-mono opacity-80">{product.variants?.[0]?.sku || product.sku || 'NO-SKU'}</span>
                       {supplierName && (
                         <span className="flex items-center gap-1 opacity-70"><Store size={10}/> {supplierName}</span>
                       )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                     {stock > 0 ? (
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                         {stock}
                       </span>
                     ) : (
                       <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                         <AlertCircle size={10} /> Out
                       </span>
                     )}
                  </td>
                  <td className={`p-4 text-right font-mono font-medium ${s.text}`}>
                    {getDisplayPrice(product)}
                  </td>
                  {getEarnings && (
                    <td className="p-4 text-right font-bold text-emerald-500">
                      +{formatPrice(earnings || 0)}
                    </td>
                  )}
                  <td className="p-4 text-center">
                    {isAdded ? (
                       <div className="flex items-center justify-center gap-1 text-xs font-bold text-blue-400">
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                         Synced
                       </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 text-xs font-medium text-gray-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                        Available
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => onPrimaryAction(product)}
                      className={`
                        p-2 rounded-lg transition-all text-xs font-bold flex items-center gap-2 ml-auto
                        ${isAdded 
                          ? 'text-red-500 hover:bg-red-500/10' 
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                        }
                      `}
                    >
                      {isAdded ? <Trash2 size={16} /> : <><Plus size={16} /> Add</>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {products.length === 0 && (
        <div className={`p-8 text-center text-sm ${s.subText}`}>
          No products found.
        </div>
      )}
    </div>
  );
};