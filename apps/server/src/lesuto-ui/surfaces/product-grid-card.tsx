import React from 'react';
import { Eye, Plus, Trash2, CheckSquare, Square, Store } from 'lucide-react';

export type CardVariant = 'standard' | 'inverse';

interface ProductGridCardProps {
  name: string;
  image?: string;
  supplierName?: string;
  retailPrice: string;
  earnings: string;
  isAdded: boolean;
  isSelected: boolean;
  stockLevel?: number;
  onView: () => void;
  onSelect: (e: React.MouseEvent) => void;
  onToggle?: (e: React.MouseEvent) => void;
  variant?: CardVariant; // <--- NEW SETTING
}

export const ProductGridCard: React.FC<ProductGridCardProps> = ({
  name, image, supplierName, retailPrice, earnings, isAdded, isSelected, stockLevel, onView, onSelect, onToggle,
  variant = 'inverse' // Defaults to Black/Inverse style
}) => {

  const styles = {
    standard: {
      card: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
      imageBg: "bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700",
      title: "text-gray-900 dark:text-white",
      subText: "text-gray-500 dark:text-gray-400",
      priceLabel: "text-gray-400"
    },
    inverse: {
      card: "bg-gray-900 border-gray-700",
      imageBg: "bg-gray-800 border-gray-700",
      title: "text-white", // <--- Fixes readability
      subText: "text-gray-400",
      priceLabel: "text-gray-500"
    }
  };

  const s = styles[variant];

  return (
    <div
      onClick={onView}
      className={`
        group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col h-full shadow-sm hover:shadow-xl border
        ${s.card}
        ${isSelected ? 'ring-2 ring-blue-500 border-transparent' : ''}
      `}
    >
      {/* Image Area */}
      <div className={`aspect-square relative overflow-hidden border-b ${s.imageBg}`}>
        {/* Badge */}
        {stockLevel !== undefined && (
          <div className={`absolute top-2 left-2 px-2 py-1 text-[10px] font-bold uppercase rounded-md shadow-sm z-10 
            ${stockLevel > 0 
              ? 'bg-white/90 text-gray-700 border border-gray-200 backdrop-blur-sm' 
              : 'bg-red-100 text-red-700 border border-red-200'}
          `}>
            {stockLevel > 0 ? `${stockLevel} in stock` : 'Out of Stock'}
          </div>
        )}

        {/* Checkbox */}
        <button onClick={onSelect} className="absolute top-2 right-2 z-20 p-1.5 bg-white/10 backdrop-blur-md rounded-md shadow-sm transition-transform hover:scale-105 border border-white/20">
          {isSelected ? <CheckSquare size={18} className="text-blue-500" /> : <Square size={18} className="text-white/70" />}
        </button>

        {image ? (
          <img src={`${image}?preset=medium`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={name} />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${s.subText}`}><Eye size={32} /></div>
        )}

        {isAdded && (
          <div className="absolute bottom-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wide z-10">
            Synced
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
          <span className="bg-white/90 text-gray-900 text-xs font-bold px-3 py-1.5 rounded shadow-sm backdrop-blur-sm">View Details</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className={`font-bold text-sm line-clamp-2 mb-1 h-10 leading-snug ${s.title}`} title={name}>{name}</h3>
        
        <div className={`text-xs mb-4 flex items-center gap-1.5 h-5 ${s.subText}`}>
          {supplierName && <><Store size={12} /> <span className="truncate">{supplierName}</span></>}
        </div>

        <div className="mt-auto space-y-3">
          <div className="flex justify-between items-baseline text-xs">
            <span className={`uppercase font-bold tracking-wider ${s.priceLabel}`}>Retail</span>
            <span className={`font-mono font-medium ${s.title}`}>{retailPrice}</span>
          </div>
          
          <div className="flex justify-between items-center text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-1.5 rounded">
            <span className="text-emerald-500 uppercase font-bold tracking-wider">Earn</span>
            <span className="text-emerald-500 font-bold">{earnings}</span>
          </div>

          {onToggle ? (
            <button
              onClick={onToggle}
              className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                isAdded
                  ? 'bg-transparent border border-red-500/50 text-red-500 hover:bg-red-500/10' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              }`}
            >
              {isAdded ? <><Trash2 size={14} /> Remove</> : <><Plus size={14} /> Add to Store</>}
            </button>
          ) : (
            <div className="w-full py-2.5 rounded-lg text-xs font-bold text-center text-green-400 bg-green-500/10 border border-green-500/20">
              ✔ In Your Catalog
            </div>
          )}
        </div>
      </div>
    </div>
  );
};