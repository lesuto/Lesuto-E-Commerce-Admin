// File: src/custom-ui-components/surfaces/category-card.tsx
// Updated to match your original Marketplace style exactly
// - Inverted with ui-surface (dark in light mode, white in dark mode)
// - Fixed description height (min-h + line-clamp-3) → buttons always aligned
// - Commission badge: higher contrast in dark mode (brighter text, more opaque bg)
// - Hover shadow, transitions preserved

import React from 'react';

interface CategoryCardProps {
  name: string;
  logo?: string;
  commission: number;
  description: string;
  onAddCatalog: () => void;
  onViewProfile: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = (props) => (
  <div className="ui-surface group rounded-2xl shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
    <div className="p-6">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gray-800/30 dark:bg-gray-100/30 border border-gray-700 dark:border-gray-300 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {props.logo ? (
            <img src={props.logo} className="w-full h-full object-cover" alt={props.name} />
          ) : (
            <span className="text-2xl font-bold ui-text-muted">{props.name[0]}</span>
          )}
        </div>
        <div>
          <h3 className="text-xl font-bold ui-text-primary">{props.name}</h3>
          <div className="mt-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-800/50 dark:bg-green-200/50 text-green-400 dark:text-green-600 border border-green-700 dark:border-green-400">
              {props.commission}% Commission
            </span>
          </div>
        </div>
      </div>

      <div className="text-sm ui-text-muted mb-6 line-clamp-3 min-h-[4.5rem]">
        {props.description || "No description provided."}
      </div>

      <div className="flex flex-col space-y-3 mt-auto">
        <button
          onClick={props.onAddCatalog}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          Add Entire Catalog
        </button>

        <button
          onClick={props.onViewProfile}
          className="w-full bg-white/10 dark:bg-gray-800/50 text-ui-text-primary border border-gray-700 dark:border-gray-300 py-3 rounded-xl font-semibold hover:bg-white/20 dark:hover:bg-gray-700/50 transition-all"
        >
          View Profile & Products
        </button>
      </div>
    </div>
  </div>
);