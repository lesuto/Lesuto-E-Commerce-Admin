import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationToolbarProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  loading?: boolean;
}

export const PaginationToolbar: React.FC<PaginationToolbarProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  loading = false
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className={`mt-2 py-2 flex flex-col sm:flex-row justify-end items-center gap-6 text-xs transition-opacity ${loading ? 'opacity-50' : ''}`}>
      
      {/* Rows Per Page */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500 dark:text-gray-400">Rows:</span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
          // Fix: Standard theme background (not inverted) + hardcoded text color for options to ensure visibility
          className="bg-transparent text-gray-700 dark:text-gray-200 font-medium focus:outline-none cursor-pointer"
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size} className="text-gray-900 bg-white">
              {size}
            </option>
          ))}
        </select>
      </div>

      {/* Counter */}
      <div className="text-gray-500 dark:text-gray-400">
        <span className="text-gray-900 dark:text-gray-200 font-medium">{startItem}-{endItem}</span> of {totalItems}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-700 dark:text-gray-200"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || totalItems === 0}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-700 dark:text-gray-200"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};