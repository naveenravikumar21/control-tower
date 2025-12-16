import { useState, useMemo } from 'react';
import { Package, Trash2, Edit2, X, Clock, FileText, Rocket, Plus, ExternalLink, Copy, Eye, ChevronDown, ChevronRight, FolderPlus } from 'lucide-react';
import { useNav, useToast } from '../contexts';
import { useCollection } from '../hooks';
import { db, appId, serverTimestamp, doc, addDoc, updateDoc, deleteDoc, collection } from '../utils/firebase';
import { formatDate, toInputDate, getDaysDiff, getDeadlineStatus } from '../utils';
import { DOC_TYPES } from '../constants';
import { Button, Input, Card, Badge, CustomTooltip, SearchInput, ConfirmationModal, EmptyState } from '../components/ui/index.jsx';

export const Products = () => {
  const { data: products } = useCollection('products');
  const { data: deploys } = useCollection('deployments');
  const { params, navigate } = useNav();
  const [editing, setEditing] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [viewingDocs, setViewingDocs] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProducts, setExpandedProducts] = useState({});
  const [selectedParentId, setSelectedParentId] = useState('');
  const { addToast } = useToast();

  // Get parent products (products without parentId)
  const parentProducts = useMemo(() =>
    products.filter(p => !p.parentId), [products]);

  // Get sub-projects grouped by parent
  const subProjectsByParent = useMemo(() => {
    const map = {};
    products.forEach(p => {
      if (p.parentId) {
        if (!map[p.parentId]) map[p.parentId] = [];
        map[p.parentId].push(p);
      }
    });
    return map;
  }, [products]);

  // Calculate deployment progress for a product/sub-project
  const getDeploymentProgress = (productId) => {
    const productDeploys = deploys.filter(d => d.productId === productId);
    const released = productDeploys.filter(d => d.status === 'Released').length;
    return { released, total: productDeploys.length };
  };

  const toggleExpanded = (productId) => {
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const docData = {};
    DOC_TYPES.forEach(t => docData[t.key] = fd.get(t.key) || "");

    const parentId = fd.get('parentId') || null;

    const payload = {
      name: fd.get('name'),
      description: fd.get('description'),
      productOwner: fd.get('productOwner'),
      engineeringOwner: fd.get('engineeringOwner'),
      nextReleaseDate: fd.get('nextReleaseDate'),
      documentation: docData,
      parentId,
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
      setModalOpen(false); setEditing(null); setSelectedParentId('');
    } catch(e) { addToast("Error saving product", "error"); }
  };

  const handleDelete = (product) => {
    if (deploys.some(d => d.productId === product.id)) {
      addToast("Cannot delete product: It is used in active deployments.", "error");
      return;
    }
    // Check if product has sub-projects
    if (subProjectsByParent[product.id]?.length > 0) {
      addToast("Cannot delete product: It has sub-projects. Delete sub-projects first.", "error");
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

  const sortedProducts = useMemo(() => {
    // Start with parent products only (sub-projects shown nested)
    let res = [...parentProducts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      // Include parents that match OR have matching sub-projects
      res = res.filter(p => {
        const parentMatches = p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.productOwner?.toLowerCase().includes(q) ||
          p.engineeringOwner?.toLowerCase().includes(q);
        const subProjects = subProjectsByParent[p.id] || [];
        const subProjectMatches = subProjects.some(sp =>
          sp.name?.toLowerCase().includes(q) ||
          sp.description?.toLowerCase().includes(q)
        );
        return parentMatches || subProjectMatches;
      });
    }

    if (params.filter === 'missingDocs') {
      res = res.filter(p => !p.documentation || Object.values(p.documentation).some(val => !val || val === ""));
    } else if (params.filter === 'noDeploys') {
      res = res.filter(p => !deploys.some(d => d.productId === p.id));
    } else if (params.filter === 'upcoming') {
      res = res.filter(p => {
        if (!p.nextReleaseDate) return false;
        const diff = getDaysDiff(p.nextReleaseDate);
        return diff >= 0 && diff <= 30;
      }).sort((a, b) => new Date(a.nextReleaseDate) - new Date(b.nextReleaseDate));
    } else if (params.filter === 'subprojects') {
      // Show only products that have sub-projects
      res = res.filter(p => subProjectsByParent[p.id]?.length > 0);
    }
    return res;
  }, [parentProducts, subProjectsByParent, deploys, params.filter, searchQuery]);

  const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Product Catalog</h1>
          <p className="text-slate-500 mt-1">Manage products and documentation</p>
          {params.filter && <Badge color="blue" className="mt-2">Filtered: {params.filter}</Badge>}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search products..."
            className="w-full md:w-72"
          />
          <Button onClick={() => { setEditing(null); setModalOpen(true); }} icon={Plus}>Add Product</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {sortedProducts.map(p => {
          const deployCount = deploys.filter(d => d.productId === p.id).length;
          const docsCount = p.documentation ? Object.values(p.documentation).filter(Boolean).length : 0;
          const colorIndex = p.name?.charCodeAt(0) % colors.length || 0;
          const avatarColor = colors[colorIndex];
          const deadlineStatus = getDeadlineStatus(p.nextReleaseDate, 'In Progress');
          const subProjects = subProjectsByParent[p.id] || [];
          const hasSubProjects = subProjects.length > 0;
          const isExpanded = expandedProducts[p.id];

          return (
            <Card key={p.id} className="p-0 overflow-hidden group hover:shadow-lg transition-all duration-300 flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${avatarColor} rounded-xl flex items-center justify-center text-white shadow-sm shrink-0`}>
                    <Package size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">{p.name}</h3>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <CustomTooltip content="Add Sub-Project">
                          <button onClick={() => { setSelectedParentId(p.id); setEditing(null); setModalOpen(true); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"><FolderPlus size={16}/></button>
                        </CustomTooltip>
                        <button onClick={() => { setEditing(p); setSelectedParentId(p.parentId || ''); setModalOpen(true); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(p)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    </div>
                    {p.description ? (
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">{p.description}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic mt-2">No description</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  {p.productOwner && (
                    <div>
                      <span className="text-slate-400 text-xs block">Product Owner</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{p.productOwner}</span>
                    </div>
                  )}
                  {p.engineeringOwner && (
                    <div>
                      <span className="text-slate-400 text-xs block">Eng Owner</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{p.engineeringOwner}</span>
                    </div>
                  )}
                </div>

                {p.nextReleaseDate && (
                  <div className="mt-4 flex items-center gap-2">
                    <Clock size={14} className={deadlineStatus.color.split(' ')[0]} />
                    <span className={`text-sm ${deadlineStatus.color.split(' ')[0]}`}>
                      Next release: {formatDate(p.nextReleaseDate)}
                    </span>
                  </div>
                )}
              </div>

              <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Rocket size={14} className="text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        <b className="text-slate-900 dark:text-white">{deployCount}</b> deploys
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        <b className={docsCount === DOC_TYPES.length ? "text-emerald-600" : "text-slate-900 dark:text-white"}>{docsCount}/{DOC_TYPES.length}</b> docs
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setViewingDocs(p)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <Eye size={12}/> View Docs
                  </button>
                </div>
              </div>

              {/* Sub-Projects Section */}
              {hasSubProjects && (
                <div className="border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => toggleExpanded(p.id)}
                    className="w-full px-5 py-3 flex items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      {subProjects.length} Sub-Project{subProjects.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-slate-400">
                      {subProjects.filter(sp => getDeploymentProgress(sp.id).released > 0).length}/{subProjects.length} with releases
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2">
                      {subProjects.map(sp => {
                        const progress = getDeploymentProgress(sp.id);
                        const spDeadlineStatus = getDeadlineStatus(sp.nextReleaseDate, 'In Progress');
                        return (
                          <div
                            key={sp.id}
                            className="flex items-center justify-between p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg group/sub"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm text-slate-700 dark:text-slate-300 truncate">{sp.name}</div>
                                {sp.nextReleaseDate && (
                                  <div className={`text-xs ${spDeadlineStatus.color.split(' ')[0]}`}>
                                    {formatDate(sp.nextReleaseDate)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-1 rounded ${progress.total === 0 ? 'bg-slate-200 dark:bg-slate-700 text-slate-500' : progress.released === progress.total ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                                {progress.total === 0 ? 'No deploys' : `${progress.released}/${progress.total}`}
                              </span>
                              <div className="flex gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                <button onClick={() => { setEditing(sp); setSelectedParentId(sp.parentId || ''); setModalOpen(true); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-blue-600"><Edit2 size={14}/></button>
                                <button onClick={() => handleDelete(sp)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
        {sortedProducts.length === 0 && (
          <EmptyState
            icon={Package}
            title="No products found"
            description="Try adjusting your search or add a new product"
          />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">
              {editing ? 'Edit Product' : selectedParentId ? 'New Sub-Project' : 'New Product'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <Input label="Product Name" name="name" defaultValue={editing?.name} required placeholder="Enter product name" />
              <Input label="Description" name="description" defaultValue={editing?.description} placeholder="Brief product description" />

              {/* Parent Product Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Parent Product <span className="font-normal text-slate-400">(optional - makes this a sub-project)</span>
                </label>
                <select
                  name="parentId"
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">None (Top-level product)</option>
                  {parentProducts.filter(pp => pp.id !== editing?.id).map(pp => (
                    <option key={pp.id} value={pp.id}>{pp.name}</option>
                  ))}
                </select>
                {selectedParentId && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    This will be a sub-project under "{parentProducts.find(p => p.id === selectedParentId)?.name}"
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Product Owner" name="productOwner" defaultValue={editing?.productOwner} placeholder="Name" />
                <Input label="Engineering Owner" name="engineeringOwner" defaultValue={editing?.engineeringOwner} placeholder="Name" />
              </div>
              <Input label="Next Release Date" name="nextReleaseDate" type="date" defaultValue={toInputDate(editing?.nextReleaseDate)} />
              <div className="pt-2 border-t">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Documentation Links</div>
                {DOC_TYPES.map(t => (
                  <Input key={t.key} label={t.label} name={t.key} defaultValue={editing?.documentation?.[t.key]} placeholder="https://..." className="mb-2" />
                ))}
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
                <Button variant="secondary" onClick={() => { setModalOpen(false); setSelectedParentId(''); }} type="button">Cancel</Button>
                <Button type="submit">{selectedParentId ? 'Save Sub-Project' : 'Save Product'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {viewingDocs && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <Card className="w-full max-w-md p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{viewingDocs.name} - Documentation</h2>
              <button onClick={() => setViewingDocs(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"><X size={20}/></button>
            </div>
            <div className="space-y-3">
              {DOC_TYPES.map(t => {
                const url = viewingDocs.documentation?.[t.key];
                return (
                  <div key={t.key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className={url ? "text-emerald-500" : "text-slate-300"} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.label}</span>
                    </div>
                    {url ? (
                      <div className="flex gap-1">
                        <CustomTooltip content="Copy link">
                          <button onClick={() => { navigator.clipboard.writeText(url); addToast("Link copied!", "success"); }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"><Copy size={14}/></button>
                        </CustomTooltip>
                        <CustomTooltip content="Open in new tab">
                          <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-blue-600"><ExternalLink size={14}/></a>
                        </CustomTooltip>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Not added</span>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {confirmModal && <ConfirmationModal {...confirmModal} />}
    </div>
  );
};
