import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const remove = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={18} className="text-green-500" />,
    error:   <AlertCircle size={18} className="text-red-500" />,
    info:    <Info size={18} className="text-blue-500" />,
  };

  const borders: Record<ToastType, string> = {
    success: 'border-l-4 border-green-400',
    error:   'border-l-4 border-red-400',
    info:    'border-l-4 border-blue-400',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 left-4 z-50 flex flex-col gap-2 max-w-sm mx-auto pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`bg-white rounded-xl shadow-lg px-4 py-3 flex items-start gap-3
              pointer-events-auto animate-in slide-in-from-top-2 duration-200 ${borders[t.type]}`}
          >
            {icons[t.type]}
            <p className="flex-1 text-sm text-slate-800 leading-snug">{t.message}</p>
            <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
