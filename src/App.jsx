import { useState } from 'react';
import {
  LayoutDashboard, Package, Users, Rocket, CheckCircle2,
  History, Sun, Moon, Keyboard, List, X, Settings
} from 'lucide-react';

// Import from extracted modules
import {
  AuthProvider,
  ToastProvider,
  NavigationProvider, useNav,
  ThemeProvider, useTheme
} from './contexts';
import { CommandPalette } from './components/features';
import {
  Dashboard,
  Products,
  Deployments,
  Clients,
  ClientDetail,
  Onboarding,
  SettingsPage
} from './pages';

// ==========================================
// LAYOUT
// ==========================================

const NavItem = ({ id, icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${active ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
  >
    <Icon size={18} className={active ? 'text-blue-400 dark:text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'} />
    {label}
  </button>
);

const Sidebar = () => {
  const { page, navigate, history } = useNav();
  const { isDark, toggleTheme } = useTheme();

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col sticky top-0 h-screen z-40 hidden md:flex transition-colors">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-slate-900 dark:bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <Rocket size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight">Control Tower</h1>
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Enterprise</span>
          </div>
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
      </div>
    </aside>
  );
};

const MobileHeader = () => {
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
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <Rocket className="text-blue-600" size={18}/> Control Tower
        </div>
        <button onClick={toggleTheme} className="p-2 -mr-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
          {isDark ? <Sun size={20}/> : <Moon size={20}/>}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 shadow-xl animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-slate-900 dark:bg-blue-600 text-white rounded-lg flex items-center justify-center">
                  <Rocket size={16} />
                </div>
                <span className="font-bold text-slate-900 dark:text-white">Control Tower</span>
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
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const MainContent = () => {
  const { page, params } = useNav();
  return (
    <main className="flex-1 bg-slate-50/50 dark:bg-slate-950 min-h-screen transition-colors">
      <MobileHeader />
      <div className="w-full p-4 md:p-6 lg:p-8">
        <CommandPalette />
        {page === 'dashboard' && <Dashboard />}
        {page === 'products' && <Products />}
        {page === 'clients' && <Clients />}
        {page === 'client-detail' && <ClientDetail clientId={params.clientId} />}
        {page === 'deployments' && <Deployments />}
        {page === 'onboarding' && <Onboarding />}
        {page === 'settings' && <SettingsPage />}
      </div>
    </main>
  );
};

// ==========================================
// APP EXPORT
// ==========================================

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationProvider>
          <ToastProvider>
            <div className="flex font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-100 selection:text-blue-900">
              <Sidebar />
              <MainContent />
            </div>
          </ToastProvider>
        </NavigationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
