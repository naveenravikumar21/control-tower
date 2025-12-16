export const EmptyState = ({ icon: Icon, title, description, className = '' }) => (
  <div className={`col-span-full text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 ${className}`}>
    {Icon && <Icon size={48} className="mx-auto mb-4 text-slate-300" />}
    <p className="text-lg font-medium text-slate-600 dark:text-slate-400">{title}</p>
    {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
  </div>
);
