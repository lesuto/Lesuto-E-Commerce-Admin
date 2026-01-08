import React from 'react';
import { Search } from 'lucide-react';

interface SearchBoxProps {
  value: 'string';
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ value, onChange, placeholder = 'Search...' }) => (
  <div className="relative">
    <Search className="absolute left-3 top-2.5 ui-text-muted" size={16} />
    <input
      type="text"
      placeholder={placeholder}
      className="w-full pl-9 pr-3 py-2 rounded-lg text-sm ui-surface-muted ui-text-primary placeholder-gray-500 border border-transparent focus:border-blue-500 focus:outline-none transition-all"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);