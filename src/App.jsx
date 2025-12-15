import React, { useState, useEffect, useMemo, createContext, useContext, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, Package, Users, Rocket, ClipboardList, Plus, Trash2, Edit2, X, 
  CheckCircle2, AlertCircle, Search, ExternalLink, ChevronRight, Clock, Save, Filter, 
  Calendar, ChevronLeft, MoreHorizontal, ArrowRight, BarChart3, FileText, CheckSquare, 
  AlertTriangle, Loader2, ArrowUpRight, ChevronDown, ChevronUp, PieChart as PieChartIcon, 
  TrendingUp, Link as LinkIcon, Command, Copy, Eye, Keyboard, Activity, History, Sun, Moon,
  Zap, Info, List
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie
} from 'recharts';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, 
  query, where, orderBy, serverTimestamp, limit 
} from 'firebase/firestore';

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// ==========================================
// 🎨 THEME & UTILITIES
// ==========================================

const STANDARD_CHECKLIST = [
  "Requirements Finalized", "API Ready", "Backend Ready", "Frontend Ready",
  "Test Cases Approved", "UAT Completed", "Release Notes Added",
  "Documentation Uploaded", "Go-Live Validation Completed"
];

const DOC_TYPES = [
  { key: 'productGuide', label: 'Product Guide' },
  { key: 'releaseNotes', label: 'Release Notes' },
  { key: 'demoScript', label: 'Demo Script' },
  { key: 'testCases', label: 'Test Cases' },
  { key: 'productionChecklist', label: 'Prod Checklist' }
];

const formatDate = (val) => {
  if (!val) return '-';
  try {
    const date = val.toDate ? val.toDate() : new Date(val);
    if (isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  } catch (e) { return '-'; }
};

const toInputDate = (val) => {
  if (!val) return '';
  try {
    const d = val.toDate ? val.toDate() : new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch (e) { return ''; }
};

const getDaysDiff = (dateString) => {
  if (!dateString) return 999;
  try {
    const target = dateString.toDate ? dateString.toDate() : new Date(dateString);
    const now = new Date();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  } catch (e) { return 999; }
};

const getDeadlineStatus = (dateString, status) => {
  if (status === 'Released') return { color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400', label: 'Released', urgent: false };
  if (status === 'Blocked') return { color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400', label: 'Blocked', urgent: true };
  if (!dateString) return { color: 'text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400', label: 'No Date', urgent: false };
  
  const diffDays = getDaysDiff(dateString);

  if (diffDays < 0) return { color: 'text-rose-700 bg-rose-50 border-rose-200 font-bold dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400', label: `Overdue (${Math.abs(diffDays)}d)`, urgent: true };
  if (diffDays <= 7) return { color: 'text-rose-600 bg-rose-50 border-rose-200 font-semibold dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400', label: `Due in ${diffDays}d`, urgent: true };
  if (diffDays <= 30) return { color: 'text-amber-600 bg-amber-50 border-amber-200 font-medium dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400', label: `Due in ${diffDays}d`, urgent: false };
  return { color: 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300', label: `Due in ${diffDays}d`, urgent: false };
};

const getStatusTooltip = (status) => {
  switch(status) {
    case 'Not Started': return 'No activity yet';
    case 'In Progress': return 'Work underway';
    case 'Blocked': return 'Waiting on dependencies';
    case 'Released': return 'Delivered to client';
    default: return status;
  }
};

const calculateChecklistProgress = (items = []) => {
  if (!items.length) return 0;
  const completed = items.filter(i => i.isCompleted).length;
  return Math.round((completed / items.length) * 100);
};

// ==========================================
// 🧠 CONTEXTS (STATE MANAGEMENT)
// ==========================================

const AuthContext = createContext();
const ToastContext = createContext();
const NavigationContext = createContext();
const ThemeContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    init();
    return onAuthStateChanged(auth, u => { setUser(u); setLoading(false); });
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{!loading ? children : <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="animate-spin text-blue-600" /></div>}</AuthContext.Provider>;
};

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border text-sm font-medium animate-in slide-in-from-right fade-in duration-300 ${
            t.type === 'error' ? 'bg-white dark:bg-slate-800 border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400' : 'bg-white dark:bg-slate-800 border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400'
          }`}>
            {t.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle2 size={16}/>}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const NavigationProvider = ({ children }) => {
  const [state, setState] = useState({ page: 'dashboard', params: {} });
  const [history, setHistory] = useState([]);

  const navigate = useCallback((page, params = {}) => {
    setState({ page, params });
  }, []);

  const addToHistory = useCallback((type, label, id, page, params) => {
    setHistory(prev => {
      const filtered = prev.filter(item => item.id !== id);
      return [{ type, label, id, page, params }, ...filtered].slice(0, 5);
    });
  }, []);
  
  // Keyboard Shortcuts Logic
  useEffect(() => {
    let gotoMode = false;
    let gotoTimeout;

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      const key = e.key.toLowerCase();

      if (key === 'n') { navigate('deployments', { action: 'new' }); }
      if (key === 'g') {
        gotoMode = true;
        clearTimeout(gotoTimeout);
        gotoTimeout = setTimeout(() => { gotoMode = false; }, 1000);
        return;
      }
      if (gotoMode) {
        switch (key) {
          case 'h': navigate('dashboard'); break;
          case 'p': navigate('products'); break;
          case 'c': navigate('clients'); break;
          case 'd': navigate('deployments'); break;
          case 'o': navigate('onboarding'); break;
          default: break;
        }
        gotoMode = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return <NavigationContext.Provider value={{ ...state, navigate, history, addToHistory }}>{children}</NavigationContext.Provider>;
};

const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const toggleTheme = () => setIsDark(!isDark);
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <div className={isDark ? 'dark' : ''}>{children}</div>
    </ThemeContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);
const useToast = () => useContext(ToastContext);
const useNav = () => useContext(NavigationContext);
const useTheme = () => useContext(ThemeContext);

// ==========================================
// 🎣 HOOKS
// ==========================================

const useCollection = (colName) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if(!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', colName));
    const unsub = onSnapshot(q, snap => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [user, colName]);

  return { data, loading };
};

// ==========================================
// 🧱 UI PRIMITIVES
// ==========================================

const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 ${className} ${onClick ? 'cursor-pointer active:scale-[0.99] active:shadow-sm' : ''}`}>
    {children}
  </div>
);

const CustomTooltip = ({ content, children }) => (
  <div className="group relative inline-block">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium text-white bg-slate-800 dark:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
    </div>
  </div>
);

const Badge = ({ children, color = 'slate', size = 'sm', className = '', tooltip }) => {
  const colors = {
    slate: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
  };
  const sizes = { sm: 'text-[10px] px-1.5 py-0.5 uppercase tracking-wide font-bold', md: 'text-xs px-2.5 py-1 font-medium' };
  
  const badge = (
    <span className={`inline-flex items-center rounded-md border ${colors[color]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );

  return tooltip ? <CustomTooltip content={tooltip}>{badge}</CustomTooltip> : badge;
};

const Button = ({ children, icon: Icon, variant = 'primary', onClick, disabled, className = '', ...props }) => {
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md hover:shadow-lg border-transparent',
    secondary: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm',
    ghost: 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border-transparent',
    danger: 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800'
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    >
      {disabled && <Loader2 size={16} className="animate-spin" />}
      {!disabled && Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

const Input = ({ label, error, ...props }) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ml-1">{label}</label>}
    <input 
      {...props} 
      className={`w-full px-3 py-2.5 bg-white dark:bg-slate-900 border rounded-lg text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white ${error ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700'}`}
    />
    {error && <span className="text-xs text-rose-500 ml-1">{error}</span>}
  </div>
);

const ProgressBar = ({ value, max = 100, color = 'bg-blue-600' }) => (
  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
    <div className={`h-full ${color} transition-all duration-500 ease-out`} style={{ width: `${(value/max)*100}%` }} />
  </div>
);

const Sparkles = ({size = 24, className = ""}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/><path d="M9 3v4"/><path d="M3 5h4"/><path d="M3 9h4"/>
  </svg>
);

// ==========================================
// 🧩 FEATURE COMPONENTS
// ==========================================

const HealthScoreRing = ({ score }) => {
  const radius = 30;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  let color = "text-rose-500";
  if (score > 50) color = "text-amber-500";
  if (score > 80) color = "text-emerald-500";

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <CustomTooltip content="Score based on checklist, timeliness, and docs">
        <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
          <circle stroke="currentColor" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} className="text-slate-100 dark:text-slate-800" />
          <circle stroke="currentColor" fill="transparent" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset }} strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius} className={`${color} transition-all duration-1000 ease-out`} />
        </svg>
      </CustomTooltip>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-800 dark:text-white">{Math.round(score)}</span>
        <span className="text-[10px] text-slate-400 uppercase font-bold">Health</span>
      </div>
    </div>
  );
};

const DeploymentTrendChart = ({ deployments }) => {
  const data = useMemo(() => {
    const weeks = {};
    function getWeekNumber(d) {
        const onejan = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    }
    // Generate last 8 weeks keys
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const key = `Wk ${getWeekNumber(d)}`;
      weeks[key] = 0;
    }
    
    deployments.forEach(d => {
      if (!d.createdAt) return;
      const date = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
      const key = `Wk ${getWeekNumber(date)}`;
      if (weeks[key] !== undefined) weeks[key]++;
    });

    return Object.entries(weeks).map(([name, value]) => ({ name, value }));
  }, [deployments]);

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} allowDecimals={false} />
          <RechartsTooltip cursor={{stroke: '#3b82f6', strokeWidth: 2}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const ChecklistWidget = ({ checklist, onToggle, compact }) => {
  const completed = checklist.filter(c => c.isCompleted).length;
  const progress = Math.round((completed / checklist.length) * 100) || 0;
  
  if (compact) {
    return (
      <CustomTooltip content={`${completed} of ${checklist.length} tasks complete`}>
        <div className="flex items-center gap-2 cursor-help">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{progress}%</span>
        </div>
      </CustomTooltip>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Release Checklist</h4>
        <Badge color={progress === 100 ? 'emerald' : 'blue'} size="md">{progress}% Ready</Badge>
      </div>
      <div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {checklist.map(item => (
          <label key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors group">
            <div className="relative flex items-center pt-0.5">
              <input 
                type="checkbox" 
                checked={item.isCompleted} 
                onChange={() => onToggle(item)}
                className="peer h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
              />
            </div>
            <span className={`text-sm transition-colors ${item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200 font-medium'}`}>
              {item.item}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

const FilterTag = ({ label, value, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 text-xs font-medium animate-in fade-in zoom-in duration-200">
    <span className="opacity-60">{label}:</span> {value}
    <button onClick={onRemove} className="hover:bg-blue-100 dark:hover:bg-blue-800 rounded p-0.5 transition-colors"><X size={12}/></button>
  </span>
);

const TimelineStrip = ({ items, onSelect }) => (
  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
    {items.length === 0 && <div className="text-slate-400 text-sm italic w-full text-center py-4">No upcoming releases schedule.</div>}
    {items.map(item => {
      const status = getDeadlineStatus(item.date, item.status || 'In Progress');
      return (
        <div key={item.id} onClick={() => onSelect(item)} className="min-w-[180px] p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 flex-shrink-0 group">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${status.urgent ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'}`} />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{formatDate(item.date)}</span>
          </div>
          <div className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate group-hover:text-blue-600 transition-colors">{item.clientName}</div>
          <div className="text-xs text-slate-500 truncate">{item.productName}</div>
          <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
             <span>{item.daysLeft} days left</span>
             {status.urgent && <AlertTriangle size={12} className="text-rose-500" />}
          </div>
        </div>
      )
    })}
  </div>
);

const ConfirmationModal = ({ title, message, onConfirm, onCancel, isDestructive }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100 dark:border-slate-700">
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-full ${isDestructive ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-blue-100 text-blue-600'}`}>
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant={isDestructive ? 'danger' : 'primary'} onClick={onConfirm} className={isDestructive ? 'bg-rose-600 text-white hover:bg-rose-700 border-none' : ''}>
          Confirm
        </Button>
      </div>
    </div>
  </div>
);

// ==========================================
// 🔍 GLOBAL SEARCH
// ==========================================

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [queryStr, setQueryStr] = useState("");
  const inputRef = useRef(null);
  const { navigate } = useNav();
  const { data: products } = useCollection('products');
  const { data: clients } = useCollection('clients');
  const { data: deployments } = useCollection('deployments');

  useEffect(() => {
    const down = (e) => {
      if (e.key === "/" && !isOpen && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen]);

  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);

  const results = useMemo(() => {
    if (!queryStr) return [];
    const q = queryStr.toLowerCase();
    return [
      ...products.filter(p => p.name.toLowerCase().includes(q)).map(p => ({ type: 'Product', label: p.name, id: p.id, page: 'products' })),
      ...clients.filter(c => c.name.toLowerCase().includes(q)).map(c => ({ type: 'Client', label: c.name, id: c.id, page: 'client-detail', params: { clientId: c.id } })),
      ...deployments.map(d => {
        const c = clients.find(cl => cl.id === d.clientId)?.name || '';
        const p = products.find(pr => pr.id === d.productId)?.name || '';
        const label = `${c} – ${p}`;
        return { type: 'Deployment', label, id: d.id, searchStr: label.toLowerCase(), page: 'deployments', params: { filter: { id: d.id } } };
      }).filter(d => d.searchStr.includes(q))
    ].slice(0, 8);
  }, [queryStr, products, clients, deployments]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-start justify-center pt-[20vh]" onClick={() => setIsOpen(false)}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <Search className="text-slate-400" size={20} />
          <input 
            ref={inputRef}
            className="flex-1 outline-none text-slate-800 dark:text-white placeholder:text-slate-400 bg-transparent"
            placeholder="Search clients, products, deployments..."
            value={queryStr}
            onChange={e => setQueryStr(e.target.value)}
          />
          <div className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-1 rounded">ESC</div>
        </div>
        <div className="py-2 max-h-[300px] overflow-y-auto">
          {results.length === 0 && <div className="px-4 py-8 text-center text-slate-400 text-sm">No results found.</div>}
          {results.map((r, i) => (
            <button 
              key={i} 
              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between group transition-colors"
              onClick={() => {
                navigate(r.page, r.params);
                setIsOpen(false);
                setQueryStr("");
              }}
            >
              <div className="flex items-center gap-3">
                {r.type === 'Product' && <Package size={16} className="text-blue-500" />}
                {r.type === 'Client' && <Users size={16} className="text-emerald-500" />}
                {r.type === 'Deployment' && <Rocket size={16} className="text-purple-500" />}
                <span className="text-slate-700 dark:text-slate-200 font-medium">{r.label}</span>
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">{r.type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 🚀 PAGES
// ==========================================

// --- 1. DASHBOARD ---
const Dashboard = () => {
  const { navigate } = useNav();
  const { data: clients } = useCollection('clients');
  const { data: products } = useCollection('products');
  const { data: deployments } = useCollection('deployments');
  const { data: checklists } = useCollection('checklists');

  // Metrics Logic
  const metrics = useMemo(() => {
    const active = deployments.filter(d => d.status !== 'Released');
    
    // (A) Releases This Month
    const releasesMonth = active.filter(d => {
      const diff = getDaysDiff(d.nextDeliveryDate);
      return diff >= 0 && diff <= 30;
    });

    // (B) High Deployment Clients (Top 5)
    const clientCounts = clients.map(c => ({
      id: c.id,
      count: deployments.filter(d => d.clientId === c.id).length
    })).sort((a,b) => b.count - a.count).slice(0, 5);

    // (C) Products Lacking Documentation
    const productsMissingDocs = products.filter(p => 
      !p.documentation || Object.values(p.documentation).some(val => !val || val === "")
    );

    // (D) Overdue
    const overdue = active.filter(d => getDaysDiff(d.nextDeliveryDate) < 0);

    // (E) Stalled (Not Released & < 30% checklist)
    const stalled = active.filter(d => {
      if (d.status === 'Released') return false;
      const dChecks = checklists.filter(c => c.deploymentId === d.id);
      const prog = calculateChecklistProgress(dChecks);
      return prog < 30;
    });

    // (F) Products No Deployments
    const productsNoDeploys = products.filter(p => !deployments.some(d => d.productId === p.id));

    // Forecast Buckets
    const forecast = { thisWeek: 0, nextWeek: 0, thisMonth: 0 };
    products.forEach(p => {
      if(!p.nextReleaseDate) return;
      const diff = getDaysDiff(p.nextReleaseDate);
      if(diff >=0 && diff <= 7) forecast.thisWeek++;
      else if(diff > 7 && diff <= 14) forecast.nextWeek++;
      else if(diff > 14 && diff <= 30) forecast.thisMonth++;
    });

    // Timeline Items
    const timeline = active
      .filter(d => d.nextDeliveryDate)
      .map(d => ({
        id: d.id,
        date: d.nextDeliveryDate,
        clientName: clients.find(c => c.id === d.clientId)?.name || 'Unknown',
        productName: products.find(p => p.id === d.productId)?.name || 'Unknown',
        status: d.status,
        daysLeft: getDaysDiff(d.nextDeliveryDate)
      }))
      .sort((a,b) => new Date(a.date) - new Date(b.date))
      .slice(0, 10);

    return { releasesMonth, clientCounts, productsMissingDocs, overdue, stalled, productsNoDeploys, timeline, forecast };
  }, [deployments, clients, products, checklists]);

  const KPICard = ({ label, value, subtext, icon: Icon, color, onClick, urgent }) => (
    <Card onClick={onClick} className="p-5 flex flex-col justify-between h-32 group relative overflow-hidden border-transparent hover:border-slate-200 dark:hover:border-slate-700">
      <div className={`absolute inset-0 opacity-[0.03] ${color.replace('text-', 'bg-')}`} />
      <div className="flex justify-between items-start z-10">
        <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">{label}</span>
        <div className={`p-2 rounded-lg ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={18} className={color.replace('bg-', 'text-')} />
        </div>
      </div>
      <div className="flex items-end justify-between z-10">
        <div>
          <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</span>
          {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
        <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors mb-1 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100" />
      </div>
      {urgent && <div className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full m-2 animate-pulse" />}
    </Card>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Command Center</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time delivery visibility</p>
        </div>
        <Button onClick={() => navigate('deployments', { action: 'new' })} icon={Plus}>New Deployment</Button>
      </header>

      {/* Timeline Strip */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Calendar size={12}/> Delivery Timeline
        </h3>
        <TimelineStrip items={metrics.timeline} onSelect={(item) => navigate('deployments', { filter: { id: item.id } })} />
      </div>

      {/* Forecast & Trends Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Release Forecast */}
        <Card className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl"><Sparkles size={20}/></div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Release Forecast</h3>
              <div className="flex gap-4 mt-1 text-sm text-slate-500">
                <span><b className="text-slate-800 dark:text-slate-200">{metrics.forecast.thisWeek}</b> this week</span>
                <span><b className="text-slate-800 dark:text-slate-200">{metrics.forecast.nextWeek}</b> next week</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate('products', { filter: 'upcoming' })} className="text-xs">View Schedule <ArrowRight size={12}/></Button>
        </Card>

        {/* Velocity Chart */}
        <Card className="p-5 flex flex-col justify-center h-full relative overflow-hidden">
          <div className="absolute top-4 left-5 z-10">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Deployment Velocity (8 Wks)</h3>
          </div>
          <div className="h-16 w-full mt-4">
             <DeploymentTrendChart deployments={deployments} />
          </div>
        </Card>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard 
          label="Releases (30d)" value={metrics.releasesMonth.length} icon={Rocket} color="text-blue-600 bg-blue-100" 
          onClick={() => navigate('deployments', { filter: { upcoming: true } })} 
        />
        <KPICard 
          label="Top Clients" value={metrics.clientCounts.length} subtext="By volume" icon={Users} color="text-emerald-600 bg-emerald-100" 
          onClick={() => navigate('clients', { sort: 'deployments' })} 
        />
        <KPICard 
          label="Docs Missing" value={metrics.productsMissingDocs.length} icon={FileText} color="text-amber-600 bg-amber-100" 
          onClick={() => navigate('products', { filter: 'missingDocs' })} urgent={metrics.productsMissingDocs.length > 0}
        />
        <KPICard 
          label="Overdue" value={metrics.overdue.length} icon={AlertTriangle} color="text-rose-600 bg-rose-100" 
          onClick={() => navigate('deployments', { filter: { overdue: true } })} urgent={metrics.overdue.length > 0}
        />
        <KPICard 
          label="Stalled" value={metrics.stalled.length} icon={Clock} color="text-slate-600 bg-slate-100" 
          onClick={() => navigate('deployments', { filter: { stalled: true } })}
        />
        <KPICard 
          label="Unused Products" value={metrics.productsNoDeploys.length} icon={Package} color="text-purple-600 bg-purple-100" 
          onClick={() => navigate('products', { filter: 'noDeploys' })}
        />
      </div>
    </div>
  );
};

// --- 2. PRODUCTS ---
const Products = () => {
  const { data: products } = useCollection('products');
  const { data: deploys } = useCollection('deployments');
  const { params, navigate, addToHistory } = useNav();
  const [editing, setEditing] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [viewingDocs, setViewingDocs] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const { addToast } = useToast();

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const docData = {};
    DOC_TYPES.forEach(t => docData[t.key] = fd.get(t.key) || "");
    
    const payload = {
      name: fd.get('name'),
      description: fd.get('description'),
      productOwner: fd.get('productOwner'),
      engineeringOwner: fd.get('engineeringOwner'),
      nextReleaseDate: fd.get('nextReleaseDate'),
      documentation: docData,
      updatedAt: serverTimestamp()
    };

    try {
      if (editing) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editing.id), payload);
        addToast("Product updated", "success");
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...payload, createdAt: serverTimestamp() });
        addToast("Product created", "success");
      }
      setModalOpen(false); setEditing(null);
    } catch(e) { addToast("Error saving product", "error"); }
  };

  const handleDelete = (product) => {
    if (deploys.some(d => d.productId === product.id)) {
      addToast("Cannot delete product: It is used in active deployments.", "error");
      return;
    }
    setConfirmModal({
      title: `Delete ${product.name}?`,
      message: "This action is permanent and cannot be undone.",
      isDestructive: true,
      onCancel: () => setConfirmModal(null),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id));
          addToast("Product deleted", "success");
        } catch(e) { addToast("Deletion failed", "error"); }
        setConfirmModal(null);
      }
    });
  };

  const filteredProducts = useMemo(() => {
    let res = [...products];
    if (params.filter === 'missingDocs') res = res.filter(p => !p.documentation || Object.values(p.documentation).some(v => !v));
    if (params.filter === 'upcoming') res = res.filter(p => p.nextReleaseDate && getDaysDiff(p.nextReleaseDate) > 0 && getDaysDiff(p.nextReleaseDate) <= 30);
    
    return res.sort((a,b) => {
      if (a.nextReleaseDate && b.nextReleaseDate) return new Date(a.nextReleaseDate) - new Date(b.nextReleaseDate);
      return 0;
    });
  }, [products, params.filter, deploys]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Product Hub</h1>
          {params.filter && <FilterTag label="Filter" value={params.filter} onRemove={() => navigate('products', {})} />}
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} icon={Plus}>Add Product</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(p => {
          const docCount = Object.values(p.documentation || {}).filter(Boolean).length;
          return (
            <Card key={p.id} className="p-6 flex flex-col group" onClick={() => addToHistory('Product', p.name, p.id, 'products')}>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <Package size={24} />
                </div>
                <div className="flex gap-1">
                   <button onClick={(e) => { e.stopPropagation(); setViewingDocs(p); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><Eye size={14}/></button>
                   <button onClick={(e) => { e.stopPropagation(); setEditing(p); setModalOpen(true); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Edit2 size={14}/></button>
                   <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{p.name}</h3>
              <p className="text-sm text-slate-500 mb-4 flex-1">{p.description || "No description."}</p>
              
              {/* Documentation Heatmap */}
              <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Documentation</span>
                  <span className={docCount < 5 ? "text-rose-500 font-bold" : "text-emerald-500 font-bold"}>{docCount}/5</span>
                </div>
                <div className="flex gap-1">
                  {DOC_TYPES.map((t, i) => (
                    <CustomTooltip key={i} content={`${t.label}: ${p.documentation?.[t.key] ? 'Provided' : 'Missing'}`}>
                      <div className={`h-1.5 flex-1 rounded-full ${p.documentation?.[t.key] ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-600'}`} />
                    </CustomTooltip>
                  ))}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Docs Preview Modal */}
      {viewingDocs && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-0 animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
               <div>
                 <h2 className="text-lg font-bold text-slate-900 dark:text-white">{viewingDocs.name}</h2>
                 <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-1">Documentation Hub</p>
               </div>
               <button onClick={() => setViewingDocs(null)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
             </div>
             <div className="p-6 space-y-3">
               {DOC_TYPES.map(t => {
                 const link = viewingDocs.documentation?.[t.key];
                 return (
                   <div key={t.key} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 group transition-colors">
                     <div className="flex items-center gap-3">
                       {link ? <CheckCircle2 size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-rose-500" />}
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.label}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       {!link && <Badge color="rose" size="sm">Missing</Badge>}
                       {link && (
                         <>
                           <button onClick={() => { navigator.clipboard.writeText(link); addToast("Link copied"); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Copy size={14}/></button>
                           <a href={link} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><ExternalLink size={14}/></a>
                         </>
                       )}
                     </div>
                   </div>
                 )
               })}
             </div>
          </Card>
        </div>
      )}

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur z-10">
              <h2 className="text-xl font-bold text-slate-900">{editing ? 'Edit Product' : 'New Product'}</h2>
              <button onClick={() => setModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            <div className="p-6 space-y-8">
              <form id="productForm" onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><Input label="Product Name" name="name" defaultValue={editing?.name} required placeholder="e.g. Analytics Engine" /></div>
                  <div className="col-span-2"><Input label="Description" name="description" defaultValue={editing?.description} placeholder="Brief product overview..." /></div>
                  <Input label="Product Owner" name="productOwner" defaultValue={editing?.productOwner} />
                  <Input label="Eng Owner" name="engineeringOwner" defaultValue={editing?.engineeringOwner} />
                  <Input label="Next Release Date" name="nextReleaseDate" type="date" defaultValue={toInputDate(editing?.nextReleaseDate)} />
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><FileText size={16}/> Documentation Links</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {DOC_TYPES.map(t => {
                      const hasVal = editing?.documentation?.[t.key];
                      return (
                        <div key={t.key} className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-full ${hasVal ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {hasVal ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>}
                          </div>
                          <div className="flex-1">
                            <Input label={t.label} name={t.key} defaultValue={hasVal} placeholder="Paste link..." />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </form>
            </div>
            <div className="flex justify-end pt-4 p-6 border-t border-slate-100 bg-slate-50/50 sticky bottom-0">
              <Button type="submit" form="productForm">Save Product</Button>
            </div>
          </Card>
        </div>
      )}

      {confirmModal && <ConfirmationModal {...confirmModal} />}
    </div>
  );
};

// --- 3. DEPLOYMENT MODAL (With Quick Actions) ---
const DeploymentModal = ({ editing, setEditing, onClose }) => {
  const { addToast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async (data) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'deployments', editing.id), { ...data, updatedAt: serverTimestamp() });
      setEditing(prev => ({ ...prev, ...data })); // Local optimisitc update
      setTimeout(() => setIsUpdating(false), 500);
    } catch(e) { setIsUpdating(false); addToast("Update failed", "error"); }
  };

  const shiftDate = (days) => {
    if (!editing.nextDeliveryDate) return;
    const current = editing.nextDeliveryDate.toDate ? editing.nextDeliveryDate.toDate() : new Date(editing.nextDeliveryDate);
    current.setDate(current.getDate() + days);
    handleUpdate({ nextDeliveryDate: current });
    addToast(`Deadline shifted by ${days} days`);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className={`w-full max-w-4xl h-[85vh] flex overflow-hidden p-0 transition-shadow duration-300 ${isUpdating ? 'shadow-[0_0_0_4px_rgba(59,130,246,0.3)]' : ''}`}>
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editing.client?.name}</h2>
              <p className="text-sm text-slate-500">{editing.product?.name}</p>
            </div>
            <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Status Section */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                <CustomTooltip content={getStatusTooltip(editing.status)}>
                  <select 
                    value={editing.status}
                    onChange={(e) => handleUpdate({ status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-medium bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option>Not Started</option><option>In Progress</option><option>Blocked</option><option>Released</option>
                  </select>
                </CustomTooltip>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Deadline</label>
                <input 
                  type="date"
                  value={toInputDate(editing.nextDeliveryDate)}
                  onChange={(e) => handleUpdate({ nextDeliveryDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Checklist Section */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-100 dark:border-slate-700">
              <ChecklistWidget 
                checklist={editing.checklist} 
                onToggle={async (item) => {
                  await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'checklists', item.id), { isCompleted: !item.isCompleted });
                  handleUpdate({}); // Trigger animation
                }}
              />
            </div>

            {/* Documentation Section */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2"><FileText size={16}/> Documentation Status</h4>
              <div className="grid grid-cols-1 gap-2">
                {DOC_TYPES.map(t => {
                  const link = editing.product?.documentation?.[t.key];
                  return (
                    <div key={t.key} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                      <div className="flex items-center gap-3">
                        {link ? <CheckCircle2 size={16} className="text-emerald-500"/> : <AlertTriangle size={16} className="text-rose-500"/>}
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.label}</span>
                      </div>
                      {link ? (
                        <a href={link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1">Open <ExternalLink size={12}/></a>
                      ) : (
                        <span className="text-xs text-rose-500 font-medium">Missing</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Drawer */}
        <div className="w-64 border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-6 flex flex-col gap-6">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <Button variant="secondary" className="w-full justify-start" onClick={() => handleUpdate({ status: 'In Progress' })} icon={Clock}>Mark In Progress</Button>
              <Button variant="secondary" className="w-full justify-start text-rose-600" onClick={() => handleUpdate({ status: 'Blocked' })} icon={AlertTriangle}>Mark Blocked</Button>
              <Button variant="secondary" className="w-full justify-start text-emerald-600" onClick={() => handleUpdate({ status: 'Released' })} icon={CheckCircle2}>Mark Released</Button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Shift Timeline</h4>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="secondary" className="px-0 text-xs" onClick={() => shiftDate(3)}>+3d</Button>
              <Button variant="secondary" className="px-0 text-xs" onClick={() => shiftDate(7)}>+1w</Button>
              <Button variant="secondary" className="px-0 text-xs" onClick={() => shiftDate(14)}>+2w</Button>
            </div>
          </div>

          <div className="mt-auto">
             <Button variant="danger" icon={Trash2} className="w-full" onClick={async () => {
                if(!confirm("Delete deployment?")) return;
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'deployments', editing.id));
                onClose();
                addToast("Deployment deleted");
              }}>Delete</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

// --- DEPLOYMENTS PAGE ---
const Deployments = () => {
  const { params, navigate } = useNav();
  const { data: deploys } = useCollection('deployments');
  const { data: clients } = useCollection('clients');
  const { data: products } = useCollection('products');
  const { data: checklists } = useCollection('checklists');
  const { addToast } = useToast();

  const [activeFilters, setActiveFilters] = useState(params.filter || {});
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { 
    if (params.filter) setActiveFilters(prev => ({ ...prev, ...params.filter })); 
    if (params.action === 'new') setModalOpen(true);
  }, [params]);

  const removeFilter = (key) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
  };

  const filtered = useMemo(() => {
    let res = deploys.map(d => ({
      ...d, 
      client: clients.find(c => c.id === d.clientId),
      product: products.find(p => p.id === d.productId),
      checklist: checklists.filter(c => c.deploymentId === d.id)
    }));
    
    if (activeFilters.status && activeFilters.status !== 'All') res = res.filter(d => d.status === activeFilters.status);
    if (activeFilters.id) res = res.filter(d => d.id === activeFilters.id);
    if (activeFilters.urgent) res = res.filter(d => getDaysDiff(d.nextDeliveryDate) <= 7 && getDaysDiff(d.nextDeliveryDate) >= 0);
    if (activeFilters.overdue) res = res.filter(d => getDaysDiff(d.nextDeliveryDate) < 0);
    if (activeFilters.upcoming) res = res.filter(d => getDaysDiff(d.nextDeliveryDate) <= 30 && getDaysDiff(d.nextDeliveryDate) >= 0);
    if (activeFilters.stalled) res = res.filter(d => d.status !== 'Released' && calculateChecklistProgress(d.checklist) < 30);

    return res.sort((a,b) => new Date(a.nextDeliveryDate || 0) - new Date(b.nextDeliveryDate || 0));
  }, [deploys, clients, products, checklists, activeFilters]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const ref = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'deployments'), {
        clientId: fd.get('clientId'),
        productId: fd.get('productId'),
        status: 'Not Started',
        nextDeliveryDate: fd.get('nextDeliveryDate'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      STANDARD_CHECKLIST.forEach(item => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'checklists'), {
        deploymentId: ref.id, item, isCompleted: false
      }));
      addToast("Deployment initialized", "success");
      setModalOpen(false);
    } catch(e) { addToast("Failed to create", "error"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Deployments</h1>
        <div className="flex gap-3">
          <Button onClick={() => setModalOpen(true)} icon={Plus}>New Deployment</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Filter size={14}/> Filters:</div>
        <select 
          value={activeFilters.status || 'All'} 
          onChange={e => setActiveFilters(prev => ({ ...prev, status: e.target.value }))} 
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">Status: All</option><option>Not Started</option><option>In Progress</option><option>Blocked</option><option>Released</option>
        </select>
        {Object.entries(activeFilters).map(([key, val]) => {
          if (key === 'status' || !val) return null; 
          return <FilterTag key={key} label={key === 'id' ? 'Single Item' : key} value="Active" onRemove={() => removeFilter(key)} />
        })}
        {Object.keys(activeFilters).length > 0 && <button onClick={() => setActiveFilters({})} className="text-xs text-slate-500 hover:text-rose-500 underline ml-auto">Clear All</button>}
      </div>

      <div className="space-y-3">
        {filtered.map(d => {
          const status = getDeadlineStatus(d.nextDeliveryDate, d.status);
          const completion = calculateChecklistProgress(d.checklist);
          return (
            <Card key={d.id} className="p-4 flex flex-col md:flex-row items-center gap-6 hover:border-blue-300 transition-colors group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-900 dark:text-white truncate">{d.client?.name}</span>
                  <ChevronRight size={14} className="text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-300 truncate">{d.product?.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={d.status === 'Blocked' ? 'rose' : d.status === 'Released' ? 'emerald' : 'blue'}>{d.status}</Badge>
                  <CustomTooltip content={getStatusTooltip(d.status)}>
                    <span className={`text-xs flex items-center gap-1 cursor-help ${status.color.split(' ')[0]}`}><Clock size={12}/> {status.label}</span>
                  </CustomTooltip>
                </div>
              </div>
              <div className="w-full md:w-48 flex flex-col gap-1">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400"><span>Checklist</span><span>{completion}%</span></div>
                <ProgressBar value={completion} color={completion === 100 ? 'bg-emerald-500' : 'bg-blue-500'} />
              </div>
              <Button variant="secondary" className="w-full md:w-auto opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditing(d)}>Manage</Button>
            </Card>
          )
        })}
        {filtered.length === 0 && <div className="text-center py-12 text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">No deployments found.</div>}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Start New Deployment</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Client</label>
                <select name="clientId" className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900" required>
                  <option value="">Select...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Product</label>
                <select name="productId" className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-900" required>
                  <option value="">Select...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <Input label="Target Date" name="nextDeliveryDate" type="date" required />
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => setModalOpen(false)} type="button">Cancel</Button>
                <Button type="submit">Initialize</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {editing && <DeploymentModal editing={editing} setEditing={setEditing} onClose={() => setEditing(null)} />}
    </div>
  );
};

// --- 4. CLIENT DETAIL ---
const ClientDetail = ({ clientId }) => {
  const { navigate, addToHistory } = useNav();
  const { data: clients } = useCollection('clients');
  const { data: deploys } = useCollection('deployments');
  const { data: products } = useCollection('products');
  const { data: checklists } = useCollection('checklists');

  const client = clients.find(c => c.id === clientId);
  useEffect(() => { if(client) addToHistory('Client', client.name, client.id, 'client-detail', { clientId: client.id }); }, [client]);

  if (!client) return <div className="p-10 text-center">Loading client...</div>;

  const dList = deploys.filter(d => d.clientId === client.id);

  // Health Score Calculation
  const healthScore = useMemo(() => {
    if (dList.length === 0) return 100;
    
    // 1. Checklist Progress (40%)
    let totalCheck = 0;
    dList.forEach(d => {
      const checks = checklists.filter(c => c.deploymentId === d.id);
      totalCheck += calculateChecklistProgress(checks);
    });
    const avgCheck = totalCheck / dList.length;

    // 2. On-Time Delivery (30%)
    const onTimeCount = dList.filter(d => getDaysDiff(d.nextDeliveryDate) >= 0).length;
    const onTimePct = (onTimeCount / dList.length) * 100;

    // 3. Documentation (30%)
    let totalDocs = 0;
    dList.forEach(d => {
      const p = products.find(x => x.id === d.productId);
      const filled = Object.values(p?.documentation || {}).filter(Boolean).length;
      totalDocs += (filled / 5) * 100;
    });
    const avgDocs = totalDocs / dList.length;

    return (avgCheck * 0.4) + (onTimePct * 0.3) + (avgDocs * 0.3);
  }, [dList, checklists, products]);

  // Timeline Items
  const timelineItems = dList
    .filter(d => d.nextDeliveryDate && d.status !== 'Released')
    .map(d => ({
      id: d.id,
      date: d.nextDeliveryDate,
      clientName: client.name,
      productName: products.find(p => p.id === d.productId)?.name || 'Unknown',
      status: d.status,
      daysLeft: getDaysDiff(d.nextDeliveryDate)
    }))
    .sort((a,b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('clients')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><ChevronLeft size={20}/></button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{client.name}</h1>
          <p className="text-slate-500 text-sm">Client Portfolio Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 col-span-1 flex flex-col items-center justify-center">
          <HealthScoreRing score={healthScore} />
          <div className="mt-6 w-full space-y-3">
            <div className="flex justify-between text-xs text-slate-500"><span>Checklist Avg</span><span>{Math.round(healthScore * 0.4 * 2.5)}%</span></div>
            <ProgressBar value={healthScore * 0.4 * 2.5} color="bg-blue-500" />
            <div className="flex justify-between text-xs text-slate-500"><span>Doc Readiness</span><span>{Math.round(healthScore * 0.3 * 3.3)}%</span></div>
            <ProgressBar value={healthScore * 0.3 * 3.3} color="bg-emerald-500" />
          </div>
        </Card>

        <Card className="p-6 col-span-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide mb-4">Delivery Timeline</h3>
          <TimelineStrip items={timelineItems} onSelect={(item) => navigate('deployments', { filter: { id: item.id } })} />
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Deployments ({dList.length})</h3>
        {dList.map(d => {
          const p = products.find(x => x.id === d.productId);
          const dlColor = getDeadlineStatus(d.nextDeliveryDate, d.status);
          const checks = checklists.filter(c => c.deploymentId === d.id);
          const completion = calculateChecklistProgress(checks);
          
          return (
            <Card key={d.id} className="p-5 flex justify-between items-center group">
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-lg mb-1">{p?.name}</div>
                <div className="flex items-center gap-3">
                  <Badge color={d.status === 'Blocked' ? 'rose' : 'blue'}>{d.status}</Badge>
                  <CustomTooltip content={getStatusTooltip(d.status)}>
                    <span className={`text-xs ${dlColor.color.split(' ')[0]}`}>{dlColor.label}</span>
                  </CustomTooltip>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{completion}%</div>
                <span className="text-xs text-slate-400 uppercase tracking-wider">Ready</span>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  );
};

// --- 5. CLIENTS LIST ---
const Clients = () => {
  const { data: clients } = useCollection('clients');
  const { data: deploys } = useCollection('deployments');
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const { addToast } = useToast();
  const { navigate, params } = useNav();

  const sortedClients = useMemo(() => {
    let res = [...clients];
    if (params.sort === 'deployments') {
      res = res.sort((a,b) => {
        const countA = deploys.filter(d => d.clientId === a.id).length;
        const countB = deploys.filter(d => d.clientId === b.id).length;
        return countB - countA;
      });
    }
    return res;
  }, [clients, deploys, params.sort]);

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = { name: fd.get('name'), comments: fd.get('comments'), updatedAt: serverTimestamp() };
    try {
      if (editing) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', editing.id), data);
      else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), { ...data, createdAt: serverTimestamp() });
      addToast("Client saved", "success"); setModalOpen(false); setEditing(null);
    } catch(e) { addToast("Error saving", "error"); }
  };

  const handleDelete = (client) => {
    if (deploys.some(d => d.clientId === client.id)) {
      addToast("Cannot delete client: Remove their deployments first.", "error");
      return;
    }
    setConfirmModal({
      title: `Delete ${client.name}?`,
      message: "This action is permanent and cannot be undone.",
      isDestructive: true,
      onCancel: () => setConfirmModal(null),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'clients', client.id));
          addToast("Client deleted", "success");
        } catch(e) { addToast("Deletion failed", "error"); }
        setConfirmModal(null);
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Client Portfolio</h1>
          {params.sort && <Badge color="blue">Sorted by Volume</Badge>}
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} icon={Plus}>Add Client</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedClients.map(c => {
          const activeDeploys = deploys.filter(d => d.clientId === c.id);
          return (
            <Card key={c.id} className="p-6 flex flex-col relative group overflow-hidden" onClick={() => navigate('client-detail', { clientId: c.id })}>
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600" onClick={() => { setEditing(c); setModalOpen(true); }}><Edit2 size={14}/></Button>
                <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(c)}><Trash2 size={14}/></Button>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md mb-4">
                {c.name.substring(0,1)}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{c.name}</h3>
              <p className="text-sm text-slate-500 mb-6 flex-1 line-clamp-2">{c.comments || "No notes."}</p>
              
              <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{activeDeploys.length}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Projects</div>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-right text-slate-500 mb-1">Activity</div>
                  <div className="flex gap-1 h-1.5 justify-end">
                    {[...Array(5)].map((_, i) => <div key={i} className={`w-3 rounded-full ${i < activeDeploys.length ? 'bg-blue-500' : 'bg-slate-100 dark:bg-slate-700'}`} />)}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Client' : 'New Client'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <Input label="Company Name" name="name" defaultValue={editing?.name} required />
              <Input label="Notes" name="comments" defaultValue={editing?.comments} />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="secondary" onClick={() => setModalOpen(false)} type="button">Cancel</Button>
                <Button type="submit">Save Profile</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {confirmModal && <ConfirmationModal {...confirmModal} />}
    </div>
  );
};

const Onboarding = () => {
  const { data: clients } = useCollection('clients');
  const { data: deploys } = useCollection('deployments');
  const { data: products } = useCollection('products');
  const { data: checklists } = useCollection('checklists');
  const { navigate } = useNav();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Onboarding Health</h1>
      <div className="grid grid-cols-1 gap-6">
        {clients.map(client => {
          const clientDeploys = deploys.filter(d => d.clientId === client.id);
          if (clientDeploys.length === 0) return null;

          return (
            <Card key={client.id} className="p-0 overflow-hidden">
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-sm shadow-sm">{client.name.substring(0,2).toUpperCase()}</div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{client.name}</h3>
                </div>
                <Badge>{clientDeploys.length} Projects</Badge>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {clientDeploys.map(d => {
                  const prod = products.find(p => p.id === d.productId);
                  const status = getDeadlineStatus(d.nextDeliveryDate, d.status);
                  const checks = checklists.filter(c => c.deploymentId === d.id);
                  const completion = Math.round((checks.filter(c => c.isCompleted).length / (checks.length || 1)) * 100);

                  return (
                    <div key={d.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{prod?.name}</div>
                        <div className={`text-xs inline-flex items-center gap-1 mt-1 ${status.color.split(' ')[0]}`}>
                          <Clock size={12}/> {status.label}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <Badge color={d.status === 'Released' ? 'emerald' : d.status === 'Blocked' ? 'rose' : 'blue'}>{d.status}</Badge>
                      </div>
                      <div className="md:col-span-5">
                        <div className="flex justify-between text-xs mb-1 text-slate-500"><span>Progress</span><span>{completion}%</span></div>
                        <ProgressBar value={completion} color={completion === 100 ? 'bg-emerald-500' : status.urgent ? 'bg-rose-500' : 'bg-blue-600'} />
                      </div>
                      <div className="md:col-span-2 flex justify-end">
                        <Button variant="secondary" className="h-8 text-xs" onClick={() => navigate('deployments', { filter: { id: d.id } })}>Details <ArrowRight size={12}/></Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  );
};

// ==========================================
// 🏗 LAYOUT
// ==========================================

// NavItem Component Definition - Moved outside Sidebar to avoid re-creation
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
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-8 w-8 bg-slate-900 dark:bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Rocket size={18} />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white tracking-tight leading-none">Control Tower</h1>
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
  const { navigate } = useNav();
  return (
    <div className="md:hidden h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Rocket className="text-blue-600" size={20}/> Control Tower</div>
      <button onClick={() => navigate('dashboard')} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"><LayoutDashboard size={20}/></button>
    </div>
  );
};

const MainContent = () => {
  const { page, params } = useNav();
  return (
    <main className="flex-1 bg-slate-50/50 dark:bg-slate-950 min-h-screen transition-colors">
      <MobileHeader />
      <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10">
        <CommandPalette />
        {page === 'dashboard' && <Dashboard />}
        {page === 'products' && <Products />}
        {page === 'clients' && <Clients />}
        {page === 'client-detail' && <ClientDetail clientId={params.clientId} />}
        {page === 'deployments' && <Deployments />}
        {page === 'onboarding' && <Onboarding />}
      </div>
    </main>
  );
};

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


