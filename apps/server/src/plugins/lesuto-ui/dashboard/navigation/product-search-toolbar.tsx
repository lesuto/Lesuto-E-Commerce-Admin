import React from 'react';
import { LayoutGrid, LayoutList, Trash2, Plus, Search, X } from 'lucide-react';

interface ProductSearchToolbarProps {
  // Search
  searchTerm: string;
  onSearchChange: (val: string) => void;
  
  // Data
  count: number;
  selectedCount: number;
  
  // Bulk Actions
  bulkAddCount?: number;
  bulkRemoveCount?: number;
  onBulkAdd?: () => void;
  onBulkRemove?: () => void;
  
  // View Toggle
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

export const ProductSearchToolbar: React.FC<ProductSearchToolbarProps> = ({
  searchTerm, onSearchChange,
  count, selectedCount,
  bulkAddCount = 0, bulkRemoveCount = 0, onBulkAdd, onBulkRemove,
  viewMode, setViewMode
}) => {

  return (
    <div className="w-full h-20 px-6 rounded-2xl flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
      
      {/* 1. SEARCH INPUT (Left, Reasonable Fixed Width) */}
      <div className="relative w-96 group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
          <Search size={20} />
        </div>
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search products..." 
          className="w-full bg-gray-100 dark:bg-gray-900 border-transparent focus:bg-white dark:focus:bg-black focus:border-blue-500 text-gray-900 dark:text-gray-100 text-base rounded-xl py-3 pl-12 pr-10 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-gray-500 font-medium"
        />
        {searchTerm && (
          <button 
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 2. COUNTS (Dead Center - Visible on larger screens) */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center hidden lg:block">
        <div className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          {count} <span className="text-gray-400 font-normal text-base">Products</span>
        </div>
        {selectedCount > 0 && (
          <div className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full mt-1 inline-block">
            {selectedCount} Selected
          </div>
        )}
      </div>

      {/* 3. ACTIONS (Right) */}
      <div className="flex items-center gap-4">
        
        {/* Bulk Actions */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200 mr-2 border-r border-gray-200 dark:border-gray-700 pr-4">
            {bulkAddCount > 0 && onBulkAdd && (
              <button onClick={onBulkAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20 active:scale-95">
                <Plus size={16} /> Add ({bulkAddCount})
              </button>
            )}
            {bulkRemoveCount > 0 && onBulkRemove && (
              <button onClick={onBulkRemove} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                <Trash2 size={16} /> Remove ({bulkRemoveCount})
              </button>
            )}
          </div>
        )}

        {/* View Toggle */}
        <div className="flex p-1.5 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <button 
            onClick={() => setViewMode('list')} 
            className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <LayoutList size={20} />
          </button>
          <button 
            onClick={() => setViewMode('grid')} 
            className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <LayoutGrid size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};