import { X, AlertTriangle } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';

export const Modal = ({ children, onClose, title, className = '', maxWidth = 'max-w-md' }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
    <Card className={`w-full ${maxWidth} p-0 animate-in zoom-in-95 duration-200 ${className}`}>
      {title && (
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <X size={20} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
            </button>
          )}
        </div>
      )}
      {children}
    </Card>
  </div>
);

export const ConfirmationModal = ({ title, message, onConfirm, onCancel, isDestructive = false }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] p-3 sm:p-4 animate-in fade-in duration-200">
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6 border border-slate-100 dark:border-slate-700">
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4">
        <div className={`p-2.5 sm:p-3 rounded-full shrink-0 ${
          isDestructive
            ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
        }`}>
          <AlertTriangle size={20} className="sm:w-6 sm:h-6" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-6 sm:mb-8 leading-relaxed">{message}</p>
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button
          variant={isDestructive ? 'danger' : 'primary'}
          onClick={onConfirm}
          className={isDestructive ? 'bg-rose-600 text-white hover:bg-rose-700 border-none' : ''}
        >
          Confirm
        </Button>
      </div>
    </div>
  </div>
);
