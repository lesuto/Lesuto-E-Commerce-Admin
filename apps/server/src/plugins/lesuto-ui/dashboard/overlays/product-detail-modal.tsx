import React, { useEffect, useState } from 'react';
import { X, Eye, Package, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export type ModalVariant = 'standard' | 'inverse';

export interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  product: any;
  actionButton?: React.ReactNode;
  variant?: ModalVariant;
  commission?: number; // Optional commission rate (%) for marketplace/supplier mode
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  product,
  actionButton,
  variant = 'inverse',
  commission,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImageError, setCurrentImageError] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setCurrentImageError(false);
  }, [product]);

  useEffect(() => {
    setCurrentImageError(false);
  }, [currentIndex]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  // --- Helpers ---
  const formatPrice = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 100);

  const variants = product?.variants || [];
  const basePriceCents = product?.customFields?.basePrice || 0;
  const firstVariantPrice = variants[0]?.price || 0;

  // Determine mode: if commission is provided, use supplier/marketplace mode (matches grid cards)
  const isCommissionMode = commission !== undefined && commission !== null;
  const retailCents = isCommissionMode ? basePriceCents : firstVariantPrice;
  const earningsOrProfitCents = isCommissionMode
    ? Math.round(basePriceCents * (commission / 100))
    : (firstVariantPrice - basePriceCents);

  // Collect all images: featured first, then additional assets (no duplicates)
  const images: string[] = [];
  if (product?.featuredAsset?.preview) {
    images.push(product.featuredAsset.preview);
  }
  if (Array.isArray(product?.assets)) {
    product.assets.forEach((asset: any) => {
      if (asset?.preview && !images.includes(asset.preview)) {
        images.push(asset.preview);
      }
    });
  }

  const hasMultiple = images.length > 1;

  // --- Theme Configuration ---
  const themes = {
    standard: {
      modal: "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100",
      closeBtn: "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400",
      border: "border-gray-200 dark:border-gray-700",
      cardBg: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
      mutedText: "text-gray-500 dark:text-gray-400",
      sectionHeader: "text-gray-900 dark:text-gray-100",
      prose: "prose-neutral dark:prose-invert",
      tableHead: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700",
      tableRow: "text-gray-700 dark:text-gray-300 border-gray-100 dark:border-gray-800",
      tableRowAlt: "even:bg-gray-50 dark:even:bg-white/5",
      tableRowHover: "hover:bg-blue-50 dark:hover:bg-white/10",
    },
    inverse: {
      modal: "bg-gray-900 border-gray-700 text-gray-100",
      closeBtn: "hover:bg-gray-800 text-gray-400",
      border: "border-gray-700",
      cardBg: "bg-gray-800 border-gray-700",
      mutedText: "text-gray-400",
      sectionHeader: "text-white",
      prose: "prose-invert",
      tableHead: "bg-gray-800 text-gray-300 border-gray-700",
      tableRow: "text-gray-300 border-gray-800",
      tableRowAlt: "even:bg-white/8",
      tableRowHover: "hover:bg-white/12",
    }
  };

  const t = themes[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className={`relative w-full max-w-2xl flex flex-col max-h-[90vh] z-10 shadow-2xl rounded-2xl border ${t.modal}`}>

        {/* --- HEADER --- */}
        <div className={`p-4 border-b flex justify-between items-center shrink-0 ${t.border}`}>
          <h3 className="font-bold text-lg line-clamp-1">
            {product?.name || 'Loading Details...'}
          </h3>
          <button onClick={onClose} className={`p-1.5 rounded-full transition-colors ${t.closeBtn}`}>
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

              {/* TOP SECTION: Photo Carousel + Data */}
              <div className="flex flex-col sm:flex-row gap-6 h-[340px]">

                {/* PHOTO CAROUSEL */}
                <div className="sm:w-2/5 shrink-3 h-full">
                  <div className="relative w-full h-full rounded-xl border border-gray-700 dark:border-gray-200 overflow-hidden bg-gray-800 dark:bg-gray-50 flex items-center justify-center">
                    {images.length > 0 ? (
                      <>
                        <img
                          src={images[currentIndex]}
                          className="w-full h-full object-contain"
                          alt={product.name}
                          onError={() => setCurrentImageError(true)}
                        />

                        {currentImageError && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Eye size={48} className="text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                      </>
                    ) : (
                      <Eye size={48} className="text-gray-500 dark:text-gray-400" />
                    )}

                    {/* Controls - only if multiple images */}
                    {hasMultiple && (
                      <>
                        <button
                          onClick={() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
                          aria-label="Previous image"
                        >
                          <ChevronLeft size={20} />
                        </button>

                        <button
                          onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
                          aria-label="Next image"
                        >
                          <ChevronRight size={20} />
                        </button>

                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {images.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentIndex(idx)}
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                idx === currentIndex ? 'bg-white w-6' : 'bg-white/50 w-1.5'
                              }`}
                              aria-label={`Go to image ${idx + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* DATA (Right - 60%) */}
                <div className="sm:w-3/5 flex flex-col h-full gap-4">

                  {/* Price Cards */}
                  <div className="flex gap-4 shrink-0">
                    <div className={`flex-1 p-4 rounded-xl text-center border ${t.cardBg}`}>
                      <div className={`text-xs uppercase font-bold mb-1 opacity-70 ${t.mutedText}`}>Retail Price</div>
                      <div className="text-2xl font-bold">{formatPrice(retailCents)}</div>
                    </div>

                    <div className="flex-1 p-4 rounded-xl text-center border border-emerald-900/50 dark:border-emerald-500/30 bg-emerald-900/10 dark:bg-emerald-900/30">
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold mb-1">
                        {isCommissionMode ? 'Your Earnings' : 'Your Profit'}
                      </div>
                      <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatPrice(earningsOrProfitCents)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description - Fills remaining height (exactly as before) */}
              <div className={`flex-1 border rounded-xl overflow-hidden min-h-[140px] ${t.cardBg}`}>
                <div className="h-full overflow-y-auto p-4 custom-scrollbar">
                  <div
                    className={`text-sm prose prose-sm max-w-none ${t.prose}`}
                    dangerouslySetInnerHTML={{ __html: product.description || 'No description available.' }}
                  />
                </div>
              </div>

              {/* BOTTOM SECTION: Variants Table */}
              <div className={`border-t pt-6 ${t.border}`}>
                <h4 className={`font-bold text-sm uppercase mb-4 flex items-center gap-2 ${t.sectionHeader}`}>
                  <Package size={14} /> Product Variants
                </h4>

                <div className={`border rounded-xl overflow-hidden ${t.border}`}>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className={`text-xs uppercase font-bold border-b ${t.tableHead}`}>
                      <tr>
                        <th className="px-4 py-3">Variant Name</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3 text-right">Stock</th>
                        <th className="px-4 py-3 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-transparent">
                      {variants.map((variant: any) => (
                        <tr
                          key={variant.id}
                          className={`transition-colors border-b last:border-0 ${t.tableRow} ${t.tableRowAlt} ${t.tableRowHover}`}
                        >
                          <td className="px-4 py-3 font-medium">{variant.name}</td>
                          <td className="px-4 py-3 opacity-60 font-mono text-xs">{variant.sku}</td>
                          <td className="px-4 py-3 text-right">
                            {variant.stockOnHand > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{variant.stockOnHand}</span>
                            ) : (
                              <span className="text-red-500 dark:text-red-400 flex items-center justify-end gap-1"><AlertCircle size={12} /> 0</span>
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
          <div className={`p-4 border-t bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl flex justify-end gap-3 shrink-0 ${t.border}`}>
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
};