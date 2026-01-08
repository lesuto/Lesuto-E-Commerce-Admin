import React from 'react';

interface SidebarPanelProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const SidebarPanel: React.FC<SidebarPanelProps> = ({ title, icon, children }) => (
  <div className="ui-surface p-4 rounded-lg">
    <h3 className="font-bold text-xs ui-text-heading uppercase mb-3 flex items-center gap-2">
      {icon}
      {title}
    </h3>
    {children}
  </div>
);