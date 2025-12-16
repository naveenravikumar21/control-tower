import { X } from 'lucide-react';

export const FilterTag = ({ label, value, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-800">
    <span className="text-blue-400 dark:text-blue-500">{label}:</span>
    {value}
    <button onClick={onRemove} className="hover:bg-blue-100 dark:hover:bg-blue-800 rounded p-0.5 transition-colors">
      <X size={12} />
    </button>
  </span>
);
