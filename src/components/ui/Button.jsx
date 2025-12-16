import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md hover:shadow-lg border-transparent',
  secondary: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm',
  ghost: 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border-transparent',
  danger: 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
};

export const Button = ({
  children,
  icon: Icon,
  variant = 'primary',
  onClick,
  disabled,
  loading,
  className = '',
  type = 'button',
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={18} className="animate-spin" />}
      {!loading && Icon && <Icon size={18} />}
      {children}
    </button>
  );
};
