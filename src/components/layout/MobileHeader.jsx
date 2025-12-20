import { useState } from 'react';
import { LayoutDashboard, Package, Users, Rocket, CheckCircle2, Settings, List, Sun, Moon, X } from 'lucide-react';
import { useNav, useTheme } from '../../contexts';

export const MobileHeader = () => {
  const { page, navigate } = useNav();
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'products', icon: Package, label: 'Products' },
    { id: 'clients', icon: Users, label: 'Clients' },
    { id: 'deployments', icon: Rocket, label: 'Deployments' },
    { id: 'onboarding', icon: CheckCircle2, label: 'Onboarding' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      <div className="md:hidden h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sticky top-0 z-50">
        <button onClick={() => setMenuOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
          <List size={22} />
        </button>
        <img src="/logo.png" alt="CDG Elements" className="h-7 object-contain" />
        <button onClick={toggleTheme} className="p-2 -mr-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
          {isDark ? <Sun size={20}/> : <Moon size={20}/>}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 shadow-xl animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex flex-col items-start gap-0.5">
                <img src="/logo.png" alt="CDG Elements" className="h-7 object-contain" />
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Control Tower</span>
              </div>
              <button onClick={() => setMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={20} />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { navigate(item.id); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                    page === item.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <item.icon size={20} />
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">AD</div>
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">Admin</div>
                  <div className="text-xs text-slate-500">Administrator</div>
                </div>
              </div>
              <div className="mt-3 text-center text-[10px] text-slate-400">v{__APP_VERSION__}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
