import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate as useRouterNavigate, useLocation, useSearchParams } from 'react-router-dom';

const NavigationContext = createContext(null);

export const useNav = () => useContext(NavigationContext);

// Map old page names to new routes
const PAGE_TO_ROUTE = {
  'dashboard': '/dashboard',
  'products': '/products',
  'product-detail': '/products',
  'clients': '/clients',
  'client-detail': '/clients',
  'deployments': '/deployments',
  'onboarding': '/onboarding',
  'release-notes': '/release-notes',
  'eap-dashboard': '/eap',
  'users': '/users',
  'settings': '/settings',
  'login': '/login',
};

// Map routes to page names (for backward compatibility)
const ROUTE_TO_PAGE = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/products': 'products',
  '/clients': 'clients',
  '/deployments': 'deployments',
  '/onboarding': 'onboarding',
  '/release-notes': 'release-notes',
  '/eap': 'eap-dashboard',
  '/users': 'users',
  '/settings': 'settings',
  '/login': 'login',
};

export const NavigationProvider = ({ children }) => {
  const routerNavigate = useRouterNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [history, setHistory] = useState([]);

  // Derive current page from location
  const page = useMemo(() => {
    const path = location.pathname;

    // Check for detail pages
    if (path.startsWith('/products/') && path.split('/').length === 3) {
      return 'product-detail';
    }
    if (path.startsWith('/clients/') && path.split('/').length === 3) {
      return 'client-detail';
    }

    return ROUTE_TO_PAGE[path] || 'dashboard';
  }, [location.pathname]);

  // Derive params from URL (route params + search params)
  const params = useMemo(() => {
    const urlParams = {};

    // Extract route params from pathname
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'products' && pathParts[2]) {
      urlParams.productId = pathParts[2];
    }
    if (pathParts[1] === 'clients' && pathParts[2]) {
      urlParams.clientId = pathParts[2];
    }

    // Extract search params
    searchParams.forEach((value, key) => {
      // Handle filter object for deployments
      if (key === 'status' || key === 'environment' || key === 'id') {
        if (!urlParams.filter) urlParams.filter = {};
        urlParams.filter[key] = value;
      } else if (key === 'urgent' || key === 'overdue' || key === 'upcoming' || key === 'stalled') {
        if (!urlParams.filter) urlParams.filter = {};
        urlParams.filter[key] = value === 'true';
      } else if (key === 'action') {
        urlParams.action = value;
      } else if (key === 'filter') {
        urlParams.filter = value;
      } else if (key === 'sort') {
        urlParams.sort = value;
      } else if (key === 'view') {
        urlParams.view = value;
      } else if (key === 'search') {
        urlParams.search = value;
      } else if (key === 'product') {
        urlParams.product = value;
      } else {
        urlParams[key] = value;
      }
    });

    return urlParams;
  }, [location.pathname, searchParams]);

  // Navigate function that maps old-style calls to router navigation
  const navigate = useCallback((pageName, newParams = {}) => {
    let path = PAGE_TO_ROUTE[pageName] || '/dashboard';
    const queryParams = new URLSearchParams();

    // Handle detail pages with IDs
    if (pageName === 'product-detail' && newParams.productId) {
      path = `/products/${newParams.productId}`;
    } else if (pageName === 'client-detail' && newParams.clientId) {
      path = `/clients/${newParams.clientId}`;
    }

    // Convert params to query string
    if (newParams.filter && typeof newParams.filter === 'object') {
      Object.entries(newParams.filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'All') {
          queryParams.set(key, String(value));
        }
      });
    } else if (newParams.filter && typeof newParams.filter === 'string') {
      queryParams.set('filter', newParams.filter);
    }

    if (newParams.action) queryParams.set('action', newParams.action);
    if (newParams.sort) queryParams.set('sort', newParams.sort);
    if (newParams.view) queryParams.set('view', newParams.view);
    if (newParams.search) queryParams.set('search', newParams.search);
    if (newParams.product) queryParams.set('product', newParams.product);

    const queryString = queryParams.toString();
    routerNavigate(queryString ? `${path}?${queryString}` : path);
  }, [routerNavigate]);

  const addToHistory = useCallback((type, name, id, targetPage, params = {}) => {
    setHistory(prev => {
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
