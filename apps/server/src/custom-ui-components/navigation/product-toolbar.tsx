import React from 'react';
import { LayoutGrid, LayoutList, Trash2, Plus } from 'lucide-react';

interface ProductToolbarProps {
  count: number;
  selectedCount: number;
  bulkAddCount?: number;
  bulkRemoveCount?: number;
  onBulkAdd?: () => void;
  onBulkRemove?: () => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

export const ProductToolbar: React.FC<ProductToolbarProps> = ({
  count, selectedCount, bulkAddCount = 0, bulkRemoveCount = 0, onBulkAdd, onBulkRemove, viewMode, setViewMode,
}) => (
  // THEME: Standard (Matches Page Background)
  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 shadow-sm">
    <div className="text-sm text-gray-700 dark:text-gray-200 px-2">
      Found <strong>{count}</strong> products
      {selectedCount > 0 && <span className="ml-2 text-gray-500 dark:text-gray-400 text-xs">(Selected: {selectedCount})</span>}
    </div>
    
    <div className="flex items-center gap-3">
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
          {bulkAddCount > 0 && onBulkAdd && (
            <button onClick={onBulkAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm">
              <Plus size={14} /> Add ({bulkAddCount})
            </button>
          )}
          {bulkRemoveCount > 0 && onBulkRemove && (
            <button onClick={onBulkRemove} className="border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 size={14} /> Remove ({bulkRemoveCount})
            </button>
          )}
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
        </div>
      )}
      
      <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}>
          <LayoutList size={16} />
        </button>
        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}>
          <LayoutGrid size={16} />
        </button>
      </div>
    </div>
  </div>
);