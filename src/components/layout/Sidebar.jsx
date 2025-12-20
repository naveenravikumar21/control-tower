import { LayoutDashboard, Package, Users, Rocket, CheckCircle2, Settings, History, Keyboard, Sun, Moon } from 'lucide-react';
import { useNav, useTheme } from '../../contexts';
import { NavItem } from './NavItem';

export const Sidebar = () => {
  const { page, navigate, history } = useNav();
  const { isDark, toggleTheme } = useTheme();

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col sticky top-0 h-screen z-40 hidden md:flex transition-colors">
      <div className="p-5">
        <div className="flex flex-col items-start gap-1 mb-6">
          <img src="/logo.png" alt="CDG Elements" className="h-8 object-contain" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Control Tower</span>
        </div>

        <nav className="space-y-1">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" active={page === 'dashboard'} onClick={() => navigate('dashboard')} />
          <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modules</div>
          <NavItem id="products" icon={Package} label="Products" active={page === 'products'} onClick={() => navigate('products')} />
          <NavItem id="clients" icon={Users} label="Clients" active={page === 'clients' || page === 'client-detail'} onClick={() => navigate('clients')} />
          <NavItem id="deployments" icon={Rocket} label="Deployments" active={page === 'deployments'} onClick={() => navigate('deployments')} />
          <NavItem id="onboarding" icon={CheckCircle2} label="Onboarding" active={page === 'onboarding'} onClick={() => navigate('onboarding')} />
          <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">System</div>
          <NavItem id="settings" icon={Settings} label="Settings" active={page === 'settings'} onClick={() => navigate('settings')} />
        </nav>

        {history.length > 0 && (
          <div className="mt-6 animate-in slide-in-from-left-2 duration-300">
            <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <History size={12}/> Recently Viewed
            </div>
            {history.map((h, i) => (
              <button key={i} onClick={() => navigate(h.page, h.params)} className="w-full text-left px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors">
                {h.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="mb-4 px-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Keyboard size={10}/> Shortcuts</div>
          <div className="space-y-1">
            {[{k:'/',l:'Search'},{k:'n',l:'New'},{k:'g+h',l:'Home'}].map(s => (
              <div key={s.k} className="flex justify-between text-[10px] text-slate-500">
                <span>{s.l}</span><span className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono">{s.k}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">AD</div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Admin</span>
          </div>
          <button onClick={toggleTheme} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            {isDark ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
        </div>
        <div className="mt-3 text-center text-[10px] text-slate-400">v{__APP_VERSION__}</div>
      </div>
    </aside>
  );
};
