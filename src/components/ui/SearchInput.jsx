import { Search, X } from 'lucide-react';

export const SearchInput = ({ value, onChange, placeholder = "Search...", className = "" }) => (
  <div className={`relative ${className}`}>
    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
    />
    {value && (
      <button
        onClick={() => onChange('')}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5"
      >
        <X size={16} />
      </button>
    )}
  </div>
);
