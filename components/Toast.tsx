'use client';
import * as React from 'react';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: string; message: string; type: ToastType };
type ToastContextType = { showToast: (message: string, type?: ToastType) => void };

const ToastContext = React.createContext<ToastContextType>({ showToast: () => {} });
export function useToast() { return React.useContext(ToastContext); }

const Icons = {
  success: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>,
  error:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4 shrink-0"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  info:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  function showToast(message: string, type: ToastType = 'success') {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id}
            className={`animate-slide-down flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-semibold shadow-2xl backdrop-blur-md ${
              toast.type === 'success' ? 'border-emerald-500/30 bg-[#030810]/90 text-emerald-300' :
              toast.type === 'error'   ? 'border-red-500/30 bg-[#030810]/90 text-red-300' :
                                         'border-sky-500/30 bg-[#030810]/90 text-sky-300'
            }`}>
            <span className={toast.type === 'success' ? 'text-emerald-400' : toast.type === 'error' ? 'text-red-400' : 'text-sky-400'}>
              {Icons[toast.type]}
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
