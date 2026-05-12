'use client';

import * as React from 'react';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: string; message: string; type: ToastType };
type ToastContextType = { showToast: (message: string, type?: ToastType) => void };

const ToastContext = React.createContext<ToastContextType>({ showToast: () => {} });

export function useToast() { return React.useContext(ToastContext); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  function showToast(message: string, type: ToastType = 'success') {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 md:bottom-6">
        {toasts.map((toast) => (
          <div key={toast.id}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur-sm animate-in slide-in-from-right-4 fade-in duration-200 ${
              toast.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200' :
              toast.type === 'error' ? 'border-red-500/30 bg-red-500/15 text-red-200' :
              'border-sky-500/30 bg-sky-500/15 text-sky-200'
            }`}>
            <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
