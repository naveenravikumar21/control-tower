import { useState, useEffect, useMemo } from 'react';
import { Plus, Filter } from 'lucide-react';
import { useNav, useToast } from '../contexts';
import { useCollection } from '../hooks';
import { db, appId, serverTimestamp, collection, addDoc } from '../utils/firebase';
import { getDaysDiff, calculateChecklistProgress } from '../utils';
import { STANDARD_CHECKLIST, DEPLOYMENT_TYPES } from '../constants';
import { Button, Input, Card, SearchInput, ViewToggle, FilterTag } from '../components/ui/index.jsx';
import { DeploymentGridView, DeploymentKanbanBoard } from '../components/features';
import { DeploymentModal } from './DeploymentModal';

export const Deployments = () => {
  const { data: deploys } = useCollection('deployments');
  const { data: clients } = useCollection('clients');
  const { data: products } = useCollection('products');
  const { data: checklists } = useCollection('checklists');
  const { params, navigate } = useNav();
  const { addToast } = useToast();

  // Organize products into parent/sub-project hierarchy
  const productHierarchy = useMemo(() => {
    const parentProducts = products.filter(p => !p.parentId);
    const subProjectsByParent = {};
    products.forEach(p => {
      if (p.parentId) {
        if (!subProjectsByParent[p.parentId]) subProjectsByParent[p.parentId] = [];
        subProjectsByParent[p.parentId].push(p);
      }
    });
    return { parentProducts, subProjectsByParent };
  }, [products]);

  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [activeFilters, setActiveFilters] = useState(params.filter || {});
  const [newDeploymentType, setNewDeploymentType] = useState('generic');

  useEffect(() => {
    if (params.filter) setActiveFilters(params.filter);
    if (params.action === 'new') setModalOpen(true);
  }, [params]);

  const removeFilter = (key) => setActiveFilters(prev => { const n = {...prev}; delete n[key]; return n; });

  const filtered = useMemo(() => {
    let res = deploys.map(d => ({
      ...d,
      client: clients.find(c => c.id === d.clientId),
      product: products.find(p => p.id === d.productId),
      checklist: checklists.filter(c => c.deploymentId === d.id)
    }));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      res = res.filter(d =>
        d.client?.name?.toLowerCase().includes(q) ||
        d.product?.name?.toLowerCase().includes(q)
      );
    }

    if (activeFilters.status && activeFilters.status !== 'All') res = res.filter(d => d.status === activeFilters.status);
    if (activeFilters.id) res = res.filter(d => d.id === activeFilters.id);
    if (activeFilters.urgent) res = res.filter(d => getDaysDiff(d.nextDeliveryDate) <= 7 && getDaysDiff(d.nextDeliveryDate) >= 0);
    if (activeFilters.overdue) res = res.filter(d => getDaysDiff(d.nextDeliveryDate) < 0);
    if (activeFilters.upcoming) res = res.filter(d => getDaysDiff(d.nextDeliveryDate) <= 30 && getDaysDiff(d.nextDeliveryDate) >= 0);
    if (activeFilters.stalled) res = res.filter(d => d.status !== 'Released' && calculateChecklistProgress(d.checklist) < 30);

    return res.sort((a,b) => new Date(a.nextDeliveryDate || 0) - new Date(b.nextDeliveryDate || 0));
  }, [deploys, clients, products, checklists, activeFilters, searchQuery]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const deploymentType = newDeploymentType;
    // Only client-specific deployments need a clientId
    const clientId = deploymentType === 'client-specific' ? fd.get('clientId') : null;
    try {
      const ref = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'deployments'), {
        clientId,
        productId: fd.get('productId'),
        status: 'Not Started',
        nextDeliveryDate: fd.get('nextDeliveryDate'),
        deploymentType,
        blockedComments: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      STANDARD_CHECKLIST.forEach(item => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'checklists'), {
        deploymentId: ref.id, item, isCompleted: false
      }));
      addToast("Deployment initialized", "success");
      setModalOpen(false);
      setNewDeploymentType('generic');
    } catch(e) { addToast("Failed to create", "error"); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Deployments</h1>
          <p className="text-slate-500 mt-1">Track and manage deployment progress</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search deployments..."
            className="w-full md:w-72"
          />
          <ViewToggle view={viewMode} setView={setViewMode} />
          <Button onClick={() => setModalOpen(true)} icon={Plus}>New Deployment</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-center">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Filter size={14}/> Filters:</div>
        <select
          value={activeFilters.status || 'All'}
          onChange={e => setActiveFilters(prev => ({ ...prev, status: e.target.value }))}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white w-full sm:w-auto"
        >
          <option value="All">Status: All</option><option>Not Started</option><option>In Progress</option><option>Blocked</option><option>Released</option>
        </select>
        <div className="flex flex-wrap gap-2 items-center">
          {Object.entries(activeFilters).map(([key, val]) => {
            if (key === 'status' || !val) return null;
            return <FilterTag key={key} label={key === 'id' ? 'Single Item' : key} value="Active" onRemove={() => removeFilter(key)} />
          })}
          {Object.keys(activeFilters).length > 0 && <button onClick={() => setActiveFilters({})} className="text-xs text-slate-500 hover:text-rose-500 underline sm:ml-auto">Clear All</button>}
        </div>
      </div>

      {viewMode === 'grid' && (
        <DeploymentGridView deployments={filtered} onDeploymentClick={setEditing} />
      )}
      {viewMode === 'kanban' && (
        <DeploymentKanbanBoard deployments={filtered} onDeploymentClick={setEditing} />
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <Card className="w-full max-w-md p-4 sm:p-6">
            <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Start New Deployment</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Deployment Type</label>
                <select
                  value={newDeploymentType}
                  onChange={(e) => setNewDeploymentType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  required
                >
                  {DEPLOYMENT_TYPES.map(t => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  {newDeploymentType === 'ga'
                    ? 'General availability release for all clients'
                    : newDeploymentType === 'generic'
                    ? 'Standard deployment for all clients'
                    : 'Customized deployment for a specific client'}
                </p>
              </div>
              {newDeploymentType === 'client-specific' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Client</label>
                  <select name="clientId" className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" required>
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Product</label>
                <select name="productId" className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" required>
                  <option value="">Select product...</option>
                  {productHierarchy.parentProducts.map(parent => {
                    const subProjects = productHierarchy.subProjectsByParent[parent.id] || [];
                    if (subProjects.length === 0) {
                      return <option key={parent.id} value={parent.id}>{parent.name}</option>;
                    }
                    return (
                      <optgroup key={parent.id} label={parent.name}>
                        <option value={parent.id}>{parent.name}</option>
                        {subProjects.map(sp => (
                          <option key={sp.id} value={sp.id}>↳ {sp.name}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
              <Input label="Target Date" name="nextDeliveryDate" type="date" required />
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => { setModalOpen(false); setNewDeploymentType('generic'); }} type="button">Cancel</Button>
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
