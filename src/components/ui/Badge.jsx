import { useState } from 'react';

const colors = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
  slate: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-sm',
};

export const Badge = ({ children, color = 'slate', size = 'md', tooltip, className = '' }) => {
  const badge = (
    <span className={`inline-flex items-center font-medium rounded-lg border ${colors[color]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );

  return tooltip ? <CustomTooltip content={tooltip}>{badge}</CustomTooltip> : badge;
};

// Custom Tooltip component
export const CustomTooltip = ({ content, children }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
        </div>
      )}
    </div>
  );
};
