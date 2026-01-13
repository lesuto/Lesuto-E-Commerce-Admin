import React from 'react';
import { CheckSquare, Square } from 'lucide-react';

interface FilterItem {
  id: string;
  name: string;
  count: number;
}

interface CheckboxFilterListProps {
  items: FilterItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  emptyMessage?: string;
}

export const CheckboxFilterList: React.FC<CheckboxFilterListProps> = ({
  items,
  selected,
  onToggle,
  emptyMessage = 'No items found',
}) => (
  <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
    {items.map((item) => (
      <div
        key={item.id}
        onClick={() => onToggle(item.id)}
        className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1.5 rounded transition-colors group"
      >
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
          <div
            className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
              selected.has(item.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-400 dark:border-gray-500'
            }`}
          >
            {selected.has(item.id) && <CheckSquare size={10} className="text-white" />}
          </div>
          <span className="truncate max-w-[140px]">{item.name}</span>
        </div>
        <span className="">{item.count}</span>
      </div>
    ))}
    {items.length === 0 && <div className="text-xs text-gray-400 italic py-2">{emptyMessage}</div>}
  </div>
);