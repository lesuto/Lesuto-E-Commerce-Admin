import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-2xl',
}) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* THEME INVERSION:
         If Dark Mode -> Modal is White.
         If Light Mode -> Modal is Dark Gray (Gray-900).
      */}
      <div
        className={`
          relative w-full ${maxWidth} flex flex-col max-h-[90vh] z-10 shadow-2xl rounded-2xl border
          bg-gray-900 text-gray-100 border-gray-700  /* Default (Light mode inverted) */
          dark:bg-white dark:text-gray-900 dark:border-gray-200 /* Dark mode inverted */
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 dark:border-gray-100 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg line-clamp-1">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-gray-400 dark:text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-gray-700 dark:border-gray-100 bg-gray-800/50 dark:bg-gray-50 rounded-b-2xl flex justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};