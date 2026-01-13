import React, { useEffect } from 'react';

export interface StatusToastProps {
  message: string;
  type: 'info' | 'error' | 'success';
  onDismiss?: () => void;
}

export const StatusToast: React.FC<StatusToastProps> = ({ message, type, onDismiss }) => {
  useEffect(() => {
    if (onDismiss) {
      const timer = setTimeout(onDismiss, 6000);
      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  const colors = {
    info: 'bg-blue-600 border-blue-700',
    error: 'bg-red-600 border-red-700',
    success: 'bg-emerald-600 border-emerald-700',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[300] px-6 py-3 rounded-lg shadow-xl border text-white font-medium animate-in slide-in-from-bottom-5 ${colors[type]}`}>
      {message}
    </div>
  );
};