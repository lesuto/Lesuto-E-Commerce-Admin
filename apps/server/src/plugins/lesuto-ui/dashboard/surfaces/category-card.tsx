import React from 'react';

export type CategoryCardVariant = 'standard' | 'inverse';

interface CategoryCardProps {
  name: string;
  logo?: string;
  commission: number;
  description: string;
  onAddCatalog: () => void;
  onViewProfile: () => void;
  variant?: CategoryCardVariant; // <--- NEW SETTING
}

export const CategoryCard: React.FC<CategoryCardProps> = (props) => {
  const { variant = 'inverse' } = props; // Default to black

  const styles = {
    standard: {
      card: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
      title: "text-gray-900 dark:text-white",
      desc: "text-gray-500 dark:text-gray-400",
      logoBg: "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600",
      secondaryBtn: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
    },
    inverse: {
      card: "bg-gray-900 border-gray-700",
      title: "text-white",
      desc: "text-gray-400",
      logoBg: "bg-gray-800 border-gray-700",
      secondaryBtn: "bg-gray-800 text-gray-200 border-gray-600 hover:bg-gray-700"
    }
  };

  const s = styles[variant];

  return (
    <div className={`group rounded-2xl shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full border ${s.card}`}>
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className={`w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center border ${s.logoBg}`}>
            {props.logo ? (
              <img src={props.logo} className="w-full h-full object-cover" alt={props.name} />
            ) : (
              <span className={`text-2xl font-bold ${s.desc}`}>{props.name[0]}</span>
            )}
          </div>
          <div>
            <h3 className={`text-xl font-bold ${s.title}`}>{props.name}</h3>
            <div className="mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">
                {props.commission}% Commission
              </span>
            </div>
          </div>
        </div>

        <div className={`text-sm mb-6 line-clamp-3 min-h-[4.5rem] ${s.desc}`}>
          {props.description || "No description provided."}
        </div>

        <div className="flex flex-col space-y-3 mt-auto">
          {/* <button
            onClick={props.onAddCatalog}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm"
          >
            Add Entire Catalog
          </button> */}

          <button
            onClick={props.onViewProfile}
            className={`w-full py-3 rounded-xl font-semibold border transition-all ${s.secondaryBtn}`}
          >
            View Profile & Products
          </button>
        </div>
      </div>
    </div>
  );
};