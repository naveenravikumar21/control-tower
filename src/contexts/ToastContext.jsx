import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

const Toast = ({ message, type, onClose }) => {
  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-500" />,
    error: <AlertCircle size={18} className="text-rose-500" />,
    info: <Info size={18} className="text-blue-500" />,
  };

  const colors = {
    success: 'border-emerald-200 dark:border-emerald-800',
    error: 'border-rose-200 dark:border-rose-800',
    info: 'border-blue-200 dark:border-blue-800',
  };

  return (
    <div className={`flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-lg border ${colors[type] || colors.info} animate-in slide-in-from-right-5 duration-300`}>
      {icons[type] || icons.info}
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{message}</span>
      <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
