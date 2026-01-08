import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  isSelected?: boolean;
  className?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  onClick,
  isSelected,
  className = '',
  noPadding = false,
}) => (
  <div
    onClick={onClick}
    className={`
      group relative bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow-sm border 
      border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300
      ${onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1' : ''}
      ${isSelected ? 'ring-2 ring-blue-600 border-transparent z-10' : ''}
      ${className}
    `}
  >
    <div className={noPadding ? '' : 'p-6'}>{children}</div>
  </div>
);