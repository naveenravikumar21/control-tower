import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, Rocket, CheckCircle2,
  History, Sun, Moon, Keyboard, List, X, Settings, FileText, Sparkles, LogOut, Shield
} from 'lucide-react';

// Import from extracted modules
import {
  AuthProvider, useAuth,
  ToastProvider,
  NavigationProvider, useNav,
  ThemeProvider, useTheme,
  NotificationProvider,
  ConfigProvider
} from './contexts';
import { CommandPalette, NotificationCenter } from './components/features';
import { AppRoutes } from './routes';
import { Login } from './pages';

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
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen z-40 hidden md:flex transition-colors">
      {/* Scrollable navigation area */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col items-start gap-1 mb-6">
          <img src="/logo.png" alt="CDG Elements" className="h-8 object-contain" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Control Tower</span>
        </div>

        <nav className="space-y-1">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" active={page === 'dashboard'} onClick={() => navigate('dashboard')} />
          <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modules</div>
          <NavItem id="products" icon={Package} label="Products" active={page === 'products' || page === 'product-detail'} onClick={() => navigate('products')} />
          <NavItem id="clients" icon={Users} label="Clients" active={page === 'clients' || page === 'client-detail'} onClick={() => navigate('clients')} />
          <NavItem id="deployments" icon={Rocket} label="Deployments" active={page === 'deployments'} onClick={() => navigate('deployments')} />
          <NavItem id="onboarding" icon={CheckCircle2} label="Onboarding" active={page === 'onboarding'} onClick={() => navigate('onboarding')} />
          <NavItem id="release-notes" icon={FileText} label="Release Notes" active={page === 'release-notes'} onClick={() => navigate('release-notes')} />
          <NavItem id="eap-dashboard" icon={Sparkles} label="EAP Dashboard" active={page === 'eap-dashboard'} onClick={() => navigate('eap-dashboard')} />
          <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">System</div>
          <NavItem id="users" icon={Shield} label="Users" active={page === 'users'} onClick={() => navigate('users')} />
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

      {/* Fixed bottom section */}
      <div className="shrink-0 p-4 border-t border-slate-100 dark:border-slate-800">
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
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${user?.role === 'admin' ? 'bg-gradient-to-tr from-purple-500 to-pink-500' : 'bg-gradient-to-tr from-blue-500 to-emerald-500'}`}>
              {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                {user?.name || user?.email?.split('@')[0] || 'User'}
              </span>
              {user?.role && (
                <span className="text-[10px] text-slate-500 capitalize">{user.role}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
              {isDark ? <Sun size={14}/> : <Moon size={14}/>}
            </button>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Logout">
              <LogOut size={14}/>
            </button>
          </div>
        </div>
        <div className="mt-3 text-center text-[10px] text-slate-400">v{__APP_VERSION__}</div>
      </div>
    </aside>
  );
};

const MobileHeader = () => {
  const { page, navigate } = useNav();
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'products', icon: Package, label: 'Products' },
    { id: 'clients', icon: Users, label: 'Clients' },
    { id: 'deployments', icon: Rocket, label: 'Deployments' },
    { id: 'onboarding', icon: CheckCircle2, label: 'Onboarding' },
    { id: 'release-notes', icon: FileText, label: 'Release Notes' },
    { id: 'users', icon: Shield, label: 'Users' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      <div className="md:hidden h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sticky top-0 z-50">
        <button onClick={() => setMenuOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
          <List size={22} />
        </button>
        <img src="/logo.png" alt="CDG Elements" className="h-7 object-contain" />
        <div className="flex items-center gap-1">
          <NotificationCenter openDirection="down" alignRight />
          <button onClick={toggleTheme} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            {isDark ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
        </div>
      </div>

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
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${user?.role === 'admin' ? 'bg-gradient-to-tr from-purple-500 to-pink-500' : 'bg-gradient-to-tr from-blue-500 to-emerald-500'}`}>
                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{user?.name || user?.email?.split('@')[0] || 'User'}</div>
                    <div className="text-xs text-slate-500 capitalize">{user?.role || 'User'}</div>
                  </div>
                </div>
                <button onClick={() => { logout(); setMenuOpen(false); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Logout">
                  <LogOut size={18}/>
                </button>
              </div>
              <div className="mt-3 text-center text-[10px] text-slate-400">v{__APP_VERSION__}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const MainContent = () => {
  return (
    <main className="flex-1 bg-slate-50/50 dark:bg-slate-950 h-screen overflow-y-auto transition-colors overflow-x-hidden min-w-0">
      <MobileHeader />
      <div className="w-full max-w-full p-4 md:p-6 lg:p-8 overflow-x-hidden">
        <CommandPalette />
        <AppRoutes />
      </div>
    </main>
  );
};

// ==========================================
// APP CONTENT (WITH AUTH CHECK)
// ==========================================

const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Allow access to login page without auth
  if (location.pathname === '/login') {
    return user ? <Navigate to="/dashboard" replace /> : <Login />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show main app
  return (
    <div className="flex font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-100 selection:text-blue-900 w-full max-w-full overflow-x-hidden h-screen">
      <Sidebar />
      <MainContent />
    </div>
  );
};

// ==========================================
// APP EXPORT
// ==========================================

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ConfigProvider>
          <NavigationProvider>
            <ToastProvider>
              <NotificationProvider>
                <AppContent />
              </NotificationProvider>
            </ToastProvider>
          </NavigationProvider>
        </ConfigProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
