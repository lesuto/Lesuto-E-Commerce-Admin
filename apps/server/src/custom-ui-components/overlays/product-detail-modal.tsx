import React, { useEffect, useState } from 'react';
import { X, Eye, Package, AlertCircle } from 'lucide-react';

export interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  product: any;
  actionButton?: React.ReactNode;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  product,
  actionButton,
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset image error when product changes
  useEffect(() => { setImageError(false); }, [product]);

  // Lock scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  // Helpers
  const formatPrice = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 100);

  const variants = product?.variants || [];
  const firstPrice = variants[0]?.price || 0;
  const basePrice = product?.customFields?.basePrice || 0;
  const profit = firstPrice - basePrice;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* CONTAINER: Confined Size (max-w-4xl), Centered, Rounded */}
      <div
        className=" relative w-full max-w-2xl flex flex-col max-h-[90vh] z-10 shadow-2xl rounded-2xl border bg-gray-900 text-gray-100 border-gray-700 /* Default (Light mode inverted) */ dark:bg-white dark:text-gray-900 dark:border-gray-200 /* Dark mode inverted */ "
      >
        {/* --- HEADER --- */}
        <div className="p-4 border-b border-gray-700 dark:border-gray-200 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg line-clamp-1">
            {product?.name || 'Loading Details...'}
          </h3>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-gray-400 dark:text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* --- BODY --- */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current opacity-50"></div>
            </div>
          ) : product ? (
            <div className="flex flex-col gap-6">
              
              {/* TOP SECTION: Photo + Data */}
              <div className="flex flex-col sm:flex-row gap-6 h-[340px]"> 
                
                {/* PHOTO (Left - 40%) */}
                <div className="sm:w-2/5 shrink-3 h-full">
                  <div className="w-full h-full rounded-xl border border-gray-700 dark:border-gray-200 overflow-hidden bg-gray-800 dark:bg-gray-50 flex items-center justify-center">
                    {product.featuredAsset && !imageError ? (
                      <img 
                        src={product.featuredAsset.preview} 
                        className="w-full h-full object-contain" 
                        alt={product.name} 
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <Eye size={48} className="text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                </div>

                {/* DATA (Right - 60%) */}
                <div className="sm:w-3/5 flex flex-col h-full gap-4">
                  
                  {/* Price Cards */}
                  <div className="flex gap-4 shrink-0">
                    <div className="flex-1 p-4 rounded-xl text-center border border-gray-700 dark:border-gray-200 bg-gray-800 dark:bg-gray-50">
                      <div className="text-xs uppercase font-bold mb-1 opacity-70">Retail Price</div>
                      <div className="text-2xl font-bold">{formatPrice(firstPrice)}</div>
                    </div>
                    
                    <div className="flex-1 p-4 rounded-xl text-center border border-emerald-900 dark:border-emerald-200 bg-emerald-900/30 dark:bg-emerald-50">
                      <div className="text-xs text-emerald-400 dark:text-emerald-600 uppercase font-bold mb-1">Your Profit</div>
                      <div className="text-2xl font-bold text-emerald-400 dark:text-emerald-600">
                        +{formatPrice(profit)}
                      </div>
                    </div>
                  </div>

                  {/* Description (Scrollable) */}
                  <div className="flex-1 relative border border-gray-700 dark:border-gray-200 rounded-xl p-4 overflow-hidden bg-gray-800 dark:bg-gray-50">
                    <div className="absolute inset-0 overflow-y-auto p-4 custom-scrollbar">
                      <div 
                        className="text-sm opacity-80 prose prose-sm max-w-none prose-invert dark:prose-neutral" 
                        dangerouslySetInnerHTML={{ __html: product.description || 'No description available.' }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM SECTION: Variants Table */}
              <div className="border-t border-gray-700 dark:border-gray-200 pt-6">
                <h4 className="font-bold text-sm uppercase opacity-70 mb-4 flex items-center gap-2">
                  <Package size={14}/> Product Variants
                </h4>
                <div className="border border-gray-700 dark:border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-800 dark:bg-gray-100 text-xs uppercase font-bold opacity-70 border-b border-gray-700 dark:border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Variant Name</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3 text-right">Stock</th>
                        <th className="px-4 py-3 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 dark:divide-gray-200 bg-gray-900 dark:bg-white">
                      {variants.map((variant: any) => (
                        <tr key={variant.id} className="hover:bg-gray-800 dark:hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium">{variant.name}</td>
                          <td className="px-4 py-3 opacity-60 font-mono text-xs">{variant.sku}</td>
                          <td className="px-4 py-3 text-right">
                            {variant.stockLevel > 0 ? (
                              <span className="text-emerald-400 dark:text-emerald-600 font-bold">{variant.stockLevel}</span>
                            ) : (
                              <span className="text-red-400 dark:text-red-500 flex items-center justify-end gap-1"><AlertCircle size={12}/> 0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            {formatPrice(variant.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-12 text-center text-red-500">Failed to load product data.</div>
          )}
        </div>

        {/* --- FOOTER --- */}
        {actionButton && (
          <div className="p-4 border-t border-gray-700 dark:border-gray-200 bg-gray-800/50 dark:bg-gray-50 rounded-b-2xl flex justify-end gap-3 shrink-0">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
};