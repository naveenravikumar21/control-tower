import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Trash2, Edit2, X, Clock, FileText, Rocket, Plus, ChevronDown, ChevronRight, FolderPlus, Tag, Sparkles, Plug, Cpu, Bell, Mail } from 'lucide-react';
import { useNav, useToast, useConfig } from '../contexts';
import { useCollection } from '../hooks';
import { addDocument, updateDocument, deleteDocument } from '../utils/api';
import { formatDate, toInputDate, getDaysDiff, getDeadlineStatus } from '../utils';
import { Button, Input, Card, Badge, CustomTooltip, SearchInput, ConfirmationModal, EmptyState } from '../components/ui/index.jsx';

export const Products = () => {
  const { docTypes } = useConfig();
  const { data: products } = useCollection('products');
  const { data: deploys } = useCollection('deployments');
  const { data: releaseNotes } = useCollection('releaseNotes');
  const { data: clients } = useCollection('clients');
  const { params, navigate } = useNav();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  // Initialize from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [activeFilter, setActiveFilter] = useState(searchParams.get('filter') || params.filter || '');

  // Sync state to URL params
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (searchQuery) newParams.set('search', searchQuery);
    if (activeFilter) newParams.set('filter', activeFilter);
    setSearchParams(newParams, { replace: true });
  }, [searchQuery, activeFilter, setSearchParams]);

  const [expandedProducts, setExpandedProducts] = useState({});
  const [selectedParentId, setSelectedParentId] = useState('');
  const [eapEnabled, setEapEnabled] = useState(false);
  const [eapStartDate, setEapStartDate] = useState('');
  const [eapEndDate, setEapEndDate] = useState('');
  const [eapJiraUrl, setEapJiraUrl] = useState('');
  const [eapClientIds, setEapClientIds] = useState([]);
  // Adapter type fields
  const [isAdapter, setIsAdapter] = useState(false);
  const [hasEquipmentSA, setHasEquipmentSA] = useState(false);
  const [hasEquipmentSE, setHasEquipmentSE] = useState(false);
  const [hasMappingService, setHasMappingService] = useState(false);
  const [hasConstructionService, setHasConstructionService] = useState(false);
  // Relevant documentation tracking - which docs are applicable for this product
  const [relevantDocs, setRelevantDocs] = useState({});
  // Notification emails
  const [notificationEmails, setNotificationEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
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

  // Get latest release version for each product
  const latestVersionByProduct = useMemo(() => {
    const map = {};
    releaseNotes.forEach(note => {
      if (!note.productId || !note.version) return;
      const existing = map[note.productId];
      if (!existing || new Date(note.releaseDate || note.createdAt) > new Date(existing.releaseDate || existing.createdAt)) {
        map[note.productId] = note;
      }
    });
    return map;
  }, [releaseNotes]);

  const toggleExpanded = (productId, e) => {
    e.stopPropagation();
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const resetFormState = (product = null) => {
    // Reset EAP state
    if (product?.eap) {
      setEapEnabled(product.eap.isActive || false);
      setEapStartDate(product.eap.startDate || '');
      setEapEndDate(product.eap.endDate || '');
      setEapJiraUrl(product.eap.jiraBoardUrl || '');
      setEapClientIds(product.eap.clientIds || []);
    } else {
      setEapEnabled(false);
      setEapStartDate('');
      setEapEndDate('');
      setEapJiraUrl('');
      setEapClientIds([]);
    }
    // Reset adapter type state
    setIsAdapter(product?.isAdapter || false);
    setHasEquipmentSA(product?.hasEquipmentSA || false);
    setHasEquipmentSE(product?.hasEquipmentSE || false);
    setHasMappingService(product?.hasMappingService || false);
    setHasConstructionService(product?.hasConstructionService || false);
    // Reset relevant docs - default all to true for new products
    if (product?.relevantDocs) {
      setRelevantDocs(product.relevantDocs);
    } else {
      // Default all docs to relevant for new products
      const defaultRelevant = {};
      docTypes.forEach(t => defaultRelevant[t.key] = true);
      setRelevantDocs(defaultRelevant);
    }
    // Reset notification emails
    setNotificationEmails(product?.notificationEmails || []);
    setNewEmail('');
  };

  const handleAddEmail = () => {
    if (!newEmail.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      addToast("Please enter a valid email address", "error");
      return;
    }
    if (notificationEmails.includes(newEmail.toLowerCase())) {
      addToast("Email already added", "error");
      return;
    }
    setNotificationEmails([...notificationEmails, newEmail.toLowerCase()]);
    setNewEmail('');
  };

  const handleRemoveEmail = (email) => {
    setNotificationEmails(notificationEmails.filter(e => e !== email));
  };

  const handleOpenModal = (product = null, parentId = '') => {
    setEditing(product);
    // When editing, use the product's existing parentId; otherwise use the provided parentId
    setSelectedParentId(product?.parentId || parentId);
    resetFormState(product);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditing(null);
    setSelectedParentId('');
    resetFormState();
  };

  const toggleEapClient = (clientId) => {
    setEapClientIds(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const docData = {};
    docTypes.forEach(t => docData[t.key] = fd.get(t.key) || "");

    const parentId = fd.get('parentId') || null;

    // Build EAP data if enabled
    const eapData = eapEnabled ? {
      isActive: true,
      startDate: eapStartDate || null,
      endDate: eapEndDate || null,
      jiraBoardUrl: eapJiraUrl || null,
      clientIds: eapClientIds
    } : null;

    const payload = {
      name: fd.get('name'),
      description: fd.get('description'),
      productOwner: fd.get('productOwner'),
      engineeringOwner: fd.get('engineeringOwner'),
      nextReleaseDate: fd.get('nextReleaseDate'),
      documentation: docData,
      relevantDocs,
      parentId,
      eap: eapData,
      notificationEmails,
      // Adapter type fields
      isAdapter,
      hasEquipmentSA: isAdapter ? hasEquipmentSA : false,
      hasEquipmentSE: isAdapter ? hasEquipmentSE : false,
      hasMappingService: isAdapter ? hasMappingService : false,
      hasConstructionService: isAdapter ? hasConstructionService : false
    };

    try {
      if (editing) {
        await updateDocument('products', editing.id, payload);
        addToast("Product updated", "success");
      } else {
        await addDocument('products', payload);
        addToast("Product created", "success");
      }
      handleCloseModal();
    } catch(e) { addToast("Error saving product", "error"); }
  };

  const handleDelete = (product, e) => {
    e?.stopPropagation();
    if (deploys.some(d => d.productId === product.id)) {
      addToast("Cannot delete product: It is used in active deployments.", "error");
      return;
    }
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
          await deleteDocument('products', product.id);
          addToast("Product deleted", "success");
        } catch(e) { addToast("Deletion failed", "error"); }
        setConfirmModal(null);
      }
    });
  };

  const sortedProducts = useMemo(() => {
    let res = [...parentProducts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
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

    if (activeFilter === 'missingDocs') {
      res = res.filter(p => {
        // Only check relevant docs for missing status
        const relevantTypes = docTypes.filter(t => p.relevantDocs?.[t.key] !== false);
        return relevantTypes.some(t => !p.documentation?.[t.key] || p.documentation[t.key] === "");
      });
    } else if (activeFilter === 'noDeploys') {
      res = res.filter(p => !deploys.some(d => d.productId === p.id));
    } else if (activeFilter === 'upcoming') {
      res = res.filter(p => {
        const hasUpcomingRelease = (product) => {
          if (!product.nextReleaseDate) return false;
          const diff = getDaysDiff(product.nextReleaseDate);
          return diff >= 0 && diff <= 30;
        };
        if (hasUpcomingRelease(p)) return true;
        const subProjects = subProjectsByParent[p.id] || [];
        return subProjects.some(sp => hasUpcomingRelease(sp));
      }).sort((a, b) => new Date(a.nextReleaseDate || '9999-12-31') - new Date(b.nextReleaseDate || '9999-12-31'));
    } else if (activeFilter === 'subprojects') {
      res = res.filter(p => subProjectsByParent[p.id]?.length > 0);
    }
    return res;
  }, [parentProducts, subProjectsByParent, deploys, activeFilter, searchQuery, docTypes]);

  const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Product Catalog</h1>
          <p className="text-slate-500 mt-1">Manage products and documentation</p>
          {activeFilter && <Badge color="blue" className="mt-2">Filtered: {activeFilter}</Badge>}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search products..."
            className="w-full md:w-72"
          />
          <Button onClick={() => handleOpenModal()} icon={Plus}>Add Product</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {sortedProducts.map(p => {
          const deployCount = deploys.filter(d => d.productId === p.id).length;
          // Count docs based on relevance - only count relevant docs
          const relevantDocTypes = docTypes.filter(t => p.relevantDocs?.[t.key] !== false);
          const filledRelevantDocs = relevantDocTypes.filter(t => p.documentation?.[t.key]);
          const docsCount = filledRelevantDocs.length;
          const totalRelevantDocs = relevantDocTypes.length;
          const colorIndex = p.name?.charCodeAt(0) % colors.length || 0;
          const avatarColor = colors[colorIndex];
          const deadlineStatus = getDeadlineStatus(p.nextReleaseDate, 'In Progress');
          const subProjects = subProjectsByParent[p.id] || [];
          const hasSubProjects = subProjects.length > 0;
          const isExpanded = expandedProducts[p.id];
          const latestVersion = latestVersionByProduct[p.id];

          return (
            <Card
              key={p.id}
              className="p-0 overflow-hidden group hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer"
              onClick={() => navigate('product-detail', { productId: p.id })}
            >
              <div className="p-5 flex-1 relative">
                {/* Action buttons - absolute positioned */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenModal(null, p.id); }}
                    className="p-1.5 bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/50 rounded-lg text-slate-400 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shadow-sm border border-slate-200 dark:border-slate-600"
                    title="Add Sub-Project"
                  >
                    <FolderPlus size={16}/>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenModal(p, p.parentId || ''); }}
                    className="p-1.5 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg text-slate-400 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm border border-slate-200 dark:border-slate-600"
                    title="Edit"
                  >
                    <Edit2 size={16}/>
                  </button>
                  <button
                    onClick={(e) => handleDelete(p, e)}
                    className="p-1.5 bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg text-slate-400 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors shadow-sm border border-slate-200 dark:border-slate-600"
                    title="Delete"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>

                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${avatarColor} rounded-xl flex items-center justify-center text-white shadow-sm shrink-0`}>
                    <Package size={22} />
                  </div>
                  <div className="flex-1 min-w-0 pr-20">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">{p.name}</h3>
                      {p.eap?.isActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                          <Sparkles size={10} /> EAP
                        </span>
                      )}
                      {latestVersion && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                          <Tag size={10} /> v{latestVersion.version}
                        </span>
                      )}
                    </div>
                    {p.description ? (
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">{p.description}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic mt-2">No description</p>
                    )}
                  </div>
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

              <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
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
                        <b className={docsCount === totalRelevantDocs ? "text-emerald-600" : "text-slate-900 dark:text-white"}>{docsCount}/{totalRelevantDocs}</b> docs
                      </span>
                    </div>
                    {p.isAdapter && (
                      <div className="flex items-center gap-1.5">
                        <Cpu size={14} className="text-indigo-500" />
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Adapter</span>
                      </div>
                    )}
                  </div>
                  {hasSubProjects && (
                    <span className="text-xs text-slate-400">{subProjects.length} sub-projects</span>
                  )}
                </div>
              </div>

              {/* Sub-Projects Preview */}
              {hasSubProjects && (
                <div className="border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={(e) => toggleExpanded(p.id, e)}
                    className="w-full px-5 py-3 flex items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      {subProjects.length} Sub-Project{subProjects.length !== 1 ? 's' : ''}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 overflow-hidden">
                      {subProjects.slice(0, 3).map(sp => {
                        const spDeadlineStatus = getDeadlineStatus(sp.nextReleaseDate, 'In Progress');
                        return (
                          <div
                            key={sp.id}
                            onClick={(e) => { e.stopPropagation(); navigate('product-detail', { productId: sp.id }); }}
                            className="flex items-center justify-between p-3 bg-slate-100/50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-600/50 transition-colors cursor-pointer"
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
                          </div>
                        );
                      })}
                      {subProjects.length > 3 && (
                        <div className="text-xs text-center text-slate-400 pt-1">
                          +{subProjects.length - 3} more
                        </div>
                      )}
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

              {/* EAP Section */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eapEnabled}
                      onChange={(e) => setEapEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500/20"
                    />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Sparkles size={16} className="text-purple-500" />
                      EAP
                    </span>
                  </label>
                </div>

                {eapEnabled && (
                  <div className="space-y-4 pl-6 border-l-2 border-purple-200 dark:border-purple-800">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Start Date</label>
                        <input
                          type="date"
                          value={eapStartDate}
                          onChange={(e) => setEapStartDate(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">End Date</label>
                        <input
                          type="date"
                          value={eapEndDate}
                          onChange={(e) => setEapEndDate(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Jira Board URL</label>
                      <input
                        type="url"
                        value={eapJiraUrl}
                        onChange={(e) => setEapJiraUrl(e.target.value)}
                        placeholder="https://jira.example.com/board/..."
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">EAP Clients</label>
                      <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg p-2 space-y-1 bg-white dark:bg-slate-900">
                        {clients.length === 0 ? (
                          <p className="text-xs text-slate-400 italic p-2">No clients available</p>
                        ) : (
                          clients.map(client => (
                            <label key={client.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={eapClientIds.includes(client.id)}
                                onChange={() => toggleEapClient(client.id)}
                                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500/20"
                              />
                              <span className="text-sm text-slate-700 dark:text-slate-300">{client.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                      {eapClientIds.length > 0 && (
                        <p className="text-xs text-purple-600 dark:text-purple-400">{eapClientIds.length} client(s) selected</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Adapter Type Section */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAdapter}
                      onChange={(e) => setIsAdapter(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                    />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Cpu size={16} className="text-indigo-500" />
                      This is an Adapter
                    </span>
                  </label>
                </div>

                {isAdapter && (
                  <div className="space-y-3 pl-6 border-l-2 border-indigo-200 dark:border-indigo-800">
                    <p className="text-xs text-slate-500 mb-2">Select the services this adapter supports:</p>
                    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                      <input
                        type="checkbox"
                        checked={hasEquipmentSA}
                        onChange={(e) => setHasEquipmentSA(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Equipment - Service Assurance</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                      <input
                        type="checkbox"
                        checked={hasEquipmentSE}
                        onChange={(e) => setHasEquipmentSE(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Equipment - Service Enablement</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                      <input
                        type="checkbox"
                        checked={hasMappingService}
                        onChange={(e) => setHasMappingService(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Mapping Service</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                      <input
                        type="checkbox"
                        checked={hasConstructionService}
                        onChange={(e) => setHasConstructionService(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">Construction Service</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Documentation Links</div>
                <p className="text-xs text-slate-400 mb-3">Check the box to mark each documentation type as relevant for this product. Only relevant docs count toward completion.</p>
                {docTypes.map(t => (
                  <div key={t.key} className="flex items-start gap-3 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer pt-2 shrink-0" title="Mark as relevant for this product">
                      <input
                        type="checkbox"
                        checked={relevantDocs[t.key] !== false}
                        onChange={(e) => setRelevantDocs(prev => ({ ...prev, [t.key]: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                      />
                    </label>
                    <div className={`flex-1 ${relevantDocs[t.key] === false ? 'opacity-50' : ''}`}>
                      <Input label={t.label} name={t.key} defaultValue={editing?.documentation?.[t.key]} placeholder="https://..." />
                    </div>
                  </div>
                ))}
              </div>

              {/* Notification Emails */}
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Bell size={14} className="text-blue-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Notification Emails</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  These emails will receive notifications when deadlines are within 7 days.
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddEmail(); }}}
                    placeholder="email@example.com"
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddEmail}
                    className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {notificationEmails.length > 0 && (
                  <div className="space-y-2">
                    {notificationEmails.map(email => (
                      <div key={email} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{email}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(email)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {notificationEmails.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No notification emails configured.</p>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
                <Button variant="secondary" onClick={handleCloseModal} type="button">Cancel</Button>
                <Button type="submit">{editing ? 'Update' : selectedParentId ? 'Create Sub-Project' : 'Create Product'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {confirmModal && <ConfirmationModal {...confirmModal} />}
    </div>
  );
};
