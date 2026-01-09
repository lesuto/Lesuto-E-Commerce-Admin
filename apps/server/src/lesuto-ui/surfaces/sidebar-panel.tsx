import React from 'react';

// 1. Define the 4 theme modes
export type SurfaceVariant = 'standard' | 'inverse' | 'dark' | 'light';

interface SidebarPanelProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  variant?: SurfaceVariant;
}

export const SidebarPanel: React.FC<SidebarPanelProps> = ({ 
  title, 
  icon, 
  children, 
  action,
  variant = 'inverse' // Default to "Inverse" (Black sidebar in light mode)
}) => {

  // 2. Define the exact Tailwind classes for each mode
  const variants = {
    // STANDARD: Matches the page background (White in Light Mode, Dark in Dark Mode)
    standard: {
      container: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100",
      header: "text-gray-500 dark:text-gray-400"
    },
    
    // INVERSE: High Contrast (Black in Light Mode, White in Dark Mode) <-- YOUR DEFAULT
    inverse: {
      container: "bg-gray-900 dark:bg-white border-gray-700 dark:border-gray-200 text-gray-100 dark:text-gray-900", 
      header: "text-gray-400 dark:text-gray-500"
    },
    
    // DARK: Always Black (Good for "Danger" zones or permanent dark UI)
    dark: {
      container: "bg-gray-900 border-gray-700 text-gray-100",
      header: "text-gray-400"
    },
    
    // LIGHT: Always White (Good for "Paper" look)
    light: {
      container: "bg-white border-gray-200 text-gray-900",
      header: "text-gray-500"
    }
  };

  // 3. Select the active style based on the prop
  const style = variants[variant] || variants.inverse;

  return (
    <div className={`p-4 rounded-lg shadow-sm border transition-colors ${style.container}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-bold text-xs uppercase flex items-center gap-2 ${style.header}`}>
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
};