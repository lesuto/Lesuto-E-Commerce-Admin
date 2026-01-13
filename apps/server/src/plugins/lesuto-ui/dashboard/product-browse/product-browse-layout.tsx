import React from 'react';

interface ProductBrowseLayoutProps {
  header?: React.ReactNode; // <--- Full Width Toolbar Slot
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export const ProductBrowseLayout: React.FC<ProductBrowseLayoutProps> = ({ header, sidebar, children }) => (
  // 1. VERTICAL STACK (Full Height)
  <div className="flex flex-col w-full min-h-[600px]">
    
    {/* 2. HEADER SLOT (Full Width, Above Sidebar/Main) */}
    {header && (
      <div className="w-full shrink-0 mb-6 z-20">
        {header}
      </div>
    )}

    {/* 3. COLUMNS CONTAINER (Sidebar + Main Content) */}
    <div className="flex flex-col lg:flex-row gap-8 w-full flex-1 items-start">
      
      {/* Sidebar */}
      <aside className="flex-0 lg:w-64 shrink-0 space-y-6">
        {sidebar}
      </aside>

      {/* Main Content (Grid/Table) */}
      <main className="flex-1 w-full min-w-0">
        {children}
      </main>
    </div>
  </div>
);