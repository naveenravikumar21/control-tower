export const NavItem = ({ id, icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${active ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
  >
    <Icon size={18} className={active ? 'text-blue-400 dark:text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'} />
    {label}
  </button>
);
