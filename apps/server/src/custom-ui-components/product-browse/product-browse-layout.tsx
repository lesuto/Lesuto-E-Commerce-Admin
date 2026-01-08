import React from 'react';

interface ProductBrowseLayoutProps {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export const ProductBrowseLayout: React.FC<ProductBrowseLayoutProps> = ({ sidebar, children }) => (
  // FLEX WRAPPER: Force row on large screens, column on small
  <div className="flex flex-col lg:flex-row gap-8 w-full min-h-[600px] items-start">
    
    {/* SIDEBAR: Fixed width on Desktop, Full width on Mobile */}
    <aside className="flex-0 lg:w-64 shrink-0 space-y-6">
      {sidebar}
    </aside>

    {/* MAIN CONTENT: Grows to fill space */}
    <main className="flex-1 w-full min-w-0">
      {children}
    </main>
  </div>
);