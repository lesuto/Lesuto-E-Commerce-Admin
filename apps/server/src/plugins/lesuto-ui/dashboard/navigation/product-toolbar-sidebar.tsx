import React from 'react';
import { LayoutGrid, LayoutList, Trash2, Plus } from 'lucide-react';

export type ToolbarSidebarVariant = 'standard' | 'inverse';

interface ProductToolbarSidebarProps {
  count: number;
  selectedCount: number;
  bulkAddCount?: number;
  bulkRemoveCount?: number;
  onBulkAdd?: () => void;
  onBulkRemove?: () => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  variant?: ToolbarSidebarVariant; // <--- NEW SETTING
}

export const ProductToolbarSidebar: React.FC<ProductToolbarSidebarProps> = ({
  count, selectedCount, bulkAddCount = 0, bulkRemoveCount = 0, onBulkAdd, onBulkRemove, viewMode, setViewMode,
  variant = 'standard' // Toolbars usually look best 'standard' (white), but you can flip it.
}) => {
  
  // Theme Definitions
  const styles = {
    standard: {
      container: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
      text: "text-gray-700 dark:text-gray-200",
      subText: "text-gray-500 dark:text-gray-400",
      iconBg: "bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700",
      activeBtn: "bg-white dark:bg-gray-700 shadow-sm text-blue-600",
      inactiveBtn: "text-gray-400 hover:text-gray-600"
    },
    inverse: {
      container: "bg-gray-900 border-gray-700",
      text: "text-white", // <--- Fixed contrast
      subText: "text-gray-400",
      iconBg: "bg-gray-800 border-gray-600",
      activeBtn: "bg-gray-700 shadow-sm text-white",
      inactiveBtn: "text-gray-500 hover:text-gray-300"
    }
  };

  const s = styles[variant];

  return (
    <div className={`p-3 rounded-xl flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 shadow-sm border ${s.container}`}>
      <div className={`text-sm px-2 ${s.text}`}>
        Found <strong>{count}</strong> products
        {selectedCount > 0 && <span className={`ml-2 text-xs ${s.subText}`}>(Selected: {selectedCount})</span>}
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
              <button onClick={onBulkRemove} className="border border-red-500/30 text-red-500 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-red-500/10 transition-colors">
                <Trash2 size={14} /> Remove ({bulkRemoveCount})
              </button>
            )}
            <div className="h-5 w-px bg-gray-500/20 mx-1" />
          </div>
        )}
        
        <div className={`flex p-1 rounded-lg border ${s.iconBg}`}>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? s.activeBtn : s.inactiveBtn}`}>
            <LayoutList size={16} />
          </button>
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? s.activeBtn : s.inactiveBtn}`}>
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};