import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Package, Users, Rocket } from 'lucide-react';
import { useNav } from '../../contexts';
import { useCollection } from '../../hooks/useCollection';

export const CommandPalette = () => {
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
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-start justify-center pt-[10vh] sm:pt-[20vh] p-4" onClick={() => setIsOpen(false)}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <Search className="text-slate-400 shrink-0" size={20} />
          <input
            ref={inputRef}
            className="flex-1 outline-none text-slate-800 dark:text-white placeholder:text-slate-400 bg-transparent text-base"
            placeholder="Search..."
            value={queryStr}
            onChange={e => setQueryStr(e.target.value)}
          />
          <button onClick={() => setIsOpen(false)} className="sm:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={18} />
          </button>
          <div className="hidden sm:block text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-1 rounded">ESC</div>
        </div>
        <div className="py-2 max-h-[50vh] sm:max-h-[300px] overflow-y-auto">
          {results.length === 0 && queryStr && <div className="px-4 py-8 text-center text-slate-400 text-sm">No results found.</div>}
          {results.length === 0 && !queryStr && <div className="px-4 py-8 text-center text-slate-400 text-sm">Type to search clients, products, deployments...</div>}
          {results.map((r, i) => (
            <button
              key={i}
              className="w-full text-left px-4 py-3 sm:py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between group transition-colors"
              onClick={() => {
                navigate(r.page, r.params);
                setIsOpen(false);
                setQueryStr("");
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {r.type === 'Product' && <Package size={16} className="text-blue-500 shrink-0" />}
                {r.type === 'Client' && <Users size={16} className="text-emerald-500 shrink-0" />}
                {r.type === 'Deployment' && <Rocket size={16} className="text-purple-500 shrink-0" />}
                <span className="text-slate-700 dark:text-slate-200 font-medium truncate">{r.label}</span>
              </div>
              <span className="text-xs text-slate-400 uppercase tracking-wider ml-2 shrink-0">{r.type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
