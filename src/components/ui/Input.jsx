export const Input = ({ label, error, className = '', ...props }) => (
  <div className={`space-y-2 ${className}`}>
    {label && (
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 ml-1">
        {label}
      </label>
    )}
    <input
      {...props}
      className={`w-full px-4 py-3 bg-white dark:bg-slate-900 border rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white ${
        error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700'
      }`}
    />
    {error && <span className="text-xs text-rose-500 ml-1">{error}</span>}
  </div>
);

export const TextArea = ({ label, error, className = '', rows = 3, ...props }) => (
  <div className={`space-y-2 ${className}`}>
    {label && (
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 ml-1">
        {label}
      </label>
    )}
    <textarea
      rows={rows}
      {...props}
      className={`w-full px-4 py-3 bg-white dark:bg-slate-900 border rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white resize-none ${
        error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700'
      }`}
    />
    {error && <span className="text-xs text-rose-500 ml-1">{error}</span>}
  </div>
);

export const Select = ({ label, error, children, className = '', ...props }) => (
  <div className={`space-y-2 ${className}`}>
    {label && (
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 ml-1">
        {label}
      </label>
    )}
    <select
      {...props}
      className={`w-full px-4 py-3 bg-white dark:bg-slate-900 border rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white ${
        error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      {children}
    </select>
    {error && <span className="text-xs text-rose-500 ml-1">{error}</span>}
  </div>
);
