import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const NavigationContext = createContext(null);

export const useNav = () => useContext(NavigationContext);

export const NavigationProvider = ({ children }) => {
  const [page, setPage] = useState('dashboard');
  const [params, setParams] = useState({});
  const [history, setHistory] = useState([]);

  const navigate = useCallback((newPage, newParams = {}) => {
    setPage(newPage);
    setParams(newParams);
  }, []);

  const addToHistory = useCallback((type, name, id, targetPage, params = {}) => {
    setHistory(prev => {
      // Use provided params or default to { id }
      const navParams = Object.keys(params).length > 0 ? params : { id };
      const newEntry = { type, label: `${type}: ${name}`, page: targetPage, params: navParams };
      const filtered = prev.filter(h => h.label !== newEntry.label);
      return [newEntry, ...filtered].slice(0, 5);
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    let keyBuffer = [];
    let timeout;

    const handleKeyDown = (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      clearTimeout(timeout);
      keyBuffer.push(e.key.toLowerCase());
      timeout = setTimeout(() => { keyBuffer = []; }, 500);

      const combo = keyBuffer.join('+');

      // Navigation shortcuts
      if (combo === 'g+h') { navigate('dashboard'); keyBuffer = []; }
      if (combo === 'g+p') { navigate('products'); keyBuffer = []; }
      if (combo === 'g+c') { navigate('clients'); keyBuffer = []; }
      if (combo === 'g+d') { navigate('deployments'); keyBuffer = []; }
      if (combo === 'g+o') { navigate('onboarding'); keyBuffer = []; }
      if (combo === 'g+e') { navigate('eap-dashboard'); keyBuffer = []; }
      if (combo === 'g+s') { navigate('settings'); keyBuffer = []; }
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        navigate('deployments', { action: 'new' });
        keyBuffer = [];
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <NavigationContext.Provider value={{ page, params, navigate, history, addToHistory }}>
      {children}
    </NavigationContext.Provider>
  );
};
