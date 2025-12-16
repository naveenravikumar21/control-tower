import { LayoutGrid, Columns } from 'lucide-react';

export const ViewToggle = ({ view, setView }) => (
  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
    <button
      onClick={() => setView('grid')}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        view === 'grid'
          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      <LayoutGrid size={16} /> <span className="hidden sm:inline">Grid</span>
    </button>
    <button
      onClick={() => setView('kanban')}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        view === 'kanban'
          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      <Columns size={16} /> <span className="hidden sm:inline">Kanban</span>
    </button>
  </div>
);
