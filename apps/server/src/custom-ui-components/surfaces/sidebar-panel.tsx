import React from 'react';

interface SidebarPanelProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode; // Optional header action
}

export const SidebarPanel: React.FC<SidebarPanelProps> = ({ title, icon, children, action }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {action}
    </div>
    {children}
  </div>
);