export const Card = ({ children, className = '', onClick, ...props }) => (
  <div
    onClick={onClick}
    className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ${
      onClick ? 'cursor-pointer' : ''
    } ${className}`}
    {...props}
  >
    {children}
  </div>
);
