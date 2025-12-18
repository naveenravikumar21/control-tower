import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Rocket, Package, Calendar, Clock, FileText, ExternalLink, Copy, Edit2, Trash2, FolderPlus, Users, Plus, Mail, X, Bell, Tag, Eye, Download, Globe, Lock } from 'lucide-react';
import { useNav, useToast } from '../contexts';
import { useCollection } from '../hooks';
import { getDaysDiff, calculateChecklistProgress, getDeadlineStatus, formatDate, toInputDate } from '../utils';
import { db, appId, serverTimestamp, doc, addDoc, updateDoc, deleteDoc, collection } from '../utils/firebase';
import { DOC_TYPES, PRODUCT_AVATAR_COLORS, RELEASE_NOTE_TYPES } from '../constants';
import { Card, Badge, ProgressBar, EmptyState, Button, Input, CustomTooltip, ConfirmationModal } from '../components/ui/index.jsx';
import { TimelineStrip, NotesPanel } from '../components/features';

export const ProductDetail = ({ productId }) => {
  const { navigate, addToHistory } = useNav();
  const { addToast } = useToast();
  const { data: products } = useCollection('products');
  const { data: deploys } = useCollection('deployments');
  const { data: clients } = useCollection('clients');
  const { data: checklists } = useCollection('checklists');
  const { data: releaseNotes } = useCollection('releaseNotes');

  const [isModalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [isSubProject, setIsSubProject] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [notificationEmails, setNotificationEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');

  // Get all parent products (for parent selector)
  const parentProducts = useMemo(() =>
    products.filter(p => !p.parentId), [products]);

  const product = products.find(p => p.id === productId);
  const parentProduct = product?.parentId ? products.find(p => p.id === product.parentId) : null;

  useEffect(() => {
    if (product) addToHistory('Product', product.name, product.id, 'product-detail', { productId: product.id });
  }, [product]);

  // Get sub-projects for this product
  const subProjects = useMemo(() =>
    products.filter(p => p.parentId === productId), [products, productId]);

  // Get deployments for this product
  const productDeploys = useMemo(() =>
    deploys.filter(d => d.productId === productId), [deploys, productId]);

  // Get deployments for sub-projects
  const subProjectDeploys = useMemo(() => {
    const subIds = subProjects.map(sp => sp.id);
    return deploys.filter(d => subIds.includes(d.productId));
  }, [deploys, subProjects]);

  // All related deployments (product + sub-projects)
  const allDeploys = useMemo(() =>
    [...productDeploys, ...subProjectDeploys], [productDeploys, subProjectDeploys]);

  // Get release notes for this product, sorted by date (newest first)
  const productReleaseNotes = useMemo(() =>
    releaseNotes
      .filter(n => n.productId === productId)
      .sort((a, b) => new Date(b.releaseDate || b.createdAt) - new Date(a.releaseDate || a.createdAt)),
    [releaseNotes, productId]);

  // Get the latest version
  const latestVersion = productReleaseNotes[0];

  // Stats
  const stats = useMemo(() => {
    if (!product) return { totalDeploys: 0, released: 0, inProgress: 0, blocked: 0, avgProgress: 0, docReadiness: 0 };

    const released = allDeploys.filter(d => d.status === 'Released').length;
    const inProgress = allDeploys.filter(d => d.status === 'In Progress').length;
    const blocked = allDeploys.filter(d => d.status === 'Blocked').length;

    // Calculate average checklist progress
    let totalProgress = 0;
    allDeploys.forEach(d => {
      const checks = checklists.filter(c => c.deploymentId === d.id);
      totalProgress += calculateChecklistProgress(checks);
    });
    const avgProgress = allDeploys.length > 0 ? Math.round(totalProgress / allDeploys.length) : 0;

    // Calculate doc readiness
    const docs = product.documentation || {};
    const filledDocs = Object.values(docs).filter(Boolean).length;
    const docReadiness = Math.round((filledDocs / DOC_TYPES.length) * 100);

    return { totalDeploys: allDeploys.length, released, inProgress, blocked, avgProgress, docReadiness };
  }, [product, allDeploys, checklists]);

  // Timeline items
  const timelineItems = useMemo(() => {
    if (!product) return [];
    return allDeploys
      .filter(d => d.nextDeliveryDate && d.status !== 'Released')
      .map(d => {
        const client = clients.find(c => c.id === d.clientId);
        let clientName = client?.name;
        if (!clientName) {
          if (d.deploymentType === 'ga') clientName = 'GA';
          else if (d.deploymentType === 'generic') clientName = 'Generic';
          else clientName = 'GA';
        }
        return {
          id: d.id,
          date: d.nextDeliveryDate,
          clientName,
          productName: products.find(p => p.id === d.productId)?.name || 'Unknown',
          status: d.status,
          daysLeft: getDaysDiff(d.nextDeliveryDate)
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [product, allDeploys, clients, products]);

  // Status counts
  const statusCounts = useMemo(() => ({
    notStarted: allDeploys.filter(d => d.status === 'Not Started').length,
    inProgress: allDeploys.filter(d => d.status === 'In Progress').length,
    blocked: allDeploys.filter(d => d.status === 'Blocked').length,
    released: allDeploys.filter(d => d.status === 'Released').length,
  }), [allDeploys]);

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const docData = {};
    DOC_TYPES.forEach(t => docData[t.key] = fd.get(t.key) || "");

    // Determine parentId based on context
    let parentId = null;
    if (isSubProject) {
      parentId = productId; // Creating new sub-project under current product
    } else if (editing?.parentId || selectedParentId) {
      parentId = selectedParentId || editing?.parentId || null; // Editing sub-project, use selected or keep existing
    }

    const payload = {
      name: fd.get('name'),
      description: fd.get('description'),
      productOwner: fd.get('productOwner'),
      engineeringOwner: fd.get('engineeringOwner'),
      nextReleaseDate: fd.get('nextReleaseDate'),
      documentation: docData,
      parentId,
      notificationEmails,
      updatedAt: serverTimestamp()
    };

    try {
      if (editing) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editing.id), payload);
        addToast("Product updated", "success");
        // If parent changed, navigate to new parent or products list
        if (editing.parentId !== parentId && parentId !== productId) {
          if (parentId) {
            navigate('product-detail', { productId: parentId });
          } else {
            navigate('products');
          }
        }
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...payload, createdAt: serverTimestamp() });
        addToast(isSubProject ? "Sub-project created" : "Product updated", "success");
      }
      setModalOpen(false);
      setEditing(null);
      setIsSubProject(false);
      setSelectedParentId('');
      setNotificationEmails([]);
      setNewEmail('');
    } catch (e) {
      addToast("Error saving", "error");
    }
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

  const openEditModal = (item, asSubProject = false) => {
    setEditing(item);
    setIsSubProject(asSubProject);
    setSelectedParentId(item?.parentId || '');
    setNotificationEmails(item?.notificationEmails || []);
    setNewEmail('');
    setModalOpen(true);
  };

  const handleDelete = (item) => {
    const itemDeploys = deploys.filter(d => d.productId === item.id);
    if (itemDeploys.length > 0) {
      addToast("Cannot delete: It has active deployments.", "error");
      return;
    }
    const itemSubProjects = products.filter(p => p.parentId === item.id);
    if (itemSubProjects.length > 0) {
      addToast("Cannot delete: It has sub-projects.", "error");
      return;
    }

    setConfirmModal({
      title: `Delete ${item.name}?`,
      message: "This action is permanent and cannot be undone.",
      isDestructive: true,
      onCancel: () => setConfirmModal(null),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', item.id));
          addToast("Deleted successfully", "success");
          if (item.id === productId) {
            navigate('products');
          }
        } catch (e) {
          addToast("Deletion failed", "error");
        }
        setConfirmModal(null);
      }
    });
  };

  const handleAddNote = async (note) => {
    try {
      const notes = [...(product.notes || []), note];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', productId), {
        notes,
        updatedAt: serverTimestamp()
      });
      addToast("Note added", "success");
    } catch(e) { addToast("Failed to add note", "error"); }
  };

  if (!product) return <div className="p-10 text-center text-slate-500">Loading product...</div>;

  const colorIndex = product.name?.charCodeAt(0) % PRODUCT_AVATAR_COLORS.length || 0;
  const avatarColor = PRODUCT_AVATAR_COLORS[colorIndex];
  const deadlineStatus = getDeadlineStatus(product.nextReleaseDate, 'In Progress');

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('products')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div className={`w-14 h-14 ${avatarColor} rounded-xl flex items-center justify-center text-white shadow-lg`}>
            <Package size={28} />
          </div>
          <div>
            {parentProduct && (
              <button
                onClick={() => navigate('product-detail', { productId: parentProduct.id })}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mb-1"
              >
                <Package size={12} /> {parentProduct.name}
              </button>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{product.name}</h1>
              {latestVersion && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
                  <Tag size={14} /> v{latestVersion.version}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-1">{product.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openEditModal(product)} icon={Edit2}>
            Edit
          </Button>
          <Button variant="ghost" onClick={() => handleDelete(product)} className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20">
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {/* Product Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Product Owner</div>
          <div className="font-semibold text-slate-900 dark:text-white">{product.productOwner || '-'}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Engineering Owner</div>
          <div className="font-semibold text-slate-900 dark:text-white">{product.engineeringOwner || '-'}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Next Release</div>
          <div className={`font-semibold ${deadlineStatus.color.split(' ')[0]}`}>
            {product.nextReleaseDate ? formatDate(product.nextReleaseDate) : '-'}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Sub-Projects</div>
          <div className="font-semibold text-slate-900 dark:text-white">{subProjects.length}</div>
        </Card>
        <Card className="p-4 col-span-2 md:col-span-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className={product.notificationEmails?.length > 0 ? "text-blue-500" : "text-slate-300"} />
              <span className="text-xs text-slate-400 uppercase tracking-wide">Notifications</span>
            </div>
            {product.notificationEmails?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {product.notificationEmails.map(email => (
                  <span key={email} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-full flex items-center gap-1">
                    <Mail size={10} /> {email}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400">No notifications configured</span>
            )}
          </div>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalDeploys}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Total Deploys</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-emerald-600">{stats.released}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Released</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">In Progress</div>
        </Card>
        <Card className="p-4 text-center">
          <div className={`text-3xl font-bold ${stats.avgProgress >= 70 ? 'text-emerald-600' : stats.avgProgress >= 40 ? 'text-amber-600' : 'text-slate-400'}`}>
            {stats.avgProgress}%
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Avg Progress</div>
        </Card>
        <Card className="p-4 text-center">
          <div className={`text-3xl font-bold ${stats.docReadiness >= 80 ? 'text-emerald-600' : stats.docReadiness >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
            {stats.docReadiness}%
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Doc Readiness</div>
        </Card>
      </div>

      {/* Documentation Section */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide mb-4 flex items-center gap-2">
          <FileText size={16} /> Documentation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {DOC_TYPES.map(t => {
            const url = product.documentation?.[t.key];
            return (
              <div key={t.key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText size={16} className={url ? "text-emerald-500" : "text-slate-300"} />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.label}</span>
                </div>
                {url ? (
                  <div className="flex gap-1">
                    <CustomTooltip content="Copy link">
                      <button onClick={() => { navigator.clipboard.writeText(url); addToast("Link copied!", "success"); }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500">
                        <Copy size={14} />
                      </button>
                    </CustomTooltip>
                    <CustomTooltip content="Open in new tab">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-blue-600">
                        <ExternalLink size={14} />
                      </a>
                    </CustomTooltip>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Not added</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Release Versions Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide flex items-center gap-2">
            <Tag size={16} /> Release Versions ({productReleaseNotes.length})
          </h3>
          <Button variant="secondary" size="sm" onClick={() => navigate('release-notes')} icon={Plus}>
            New Version
          </Button>
        </div>

        {productReleaseNotes.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No release notes"
            description="Create release notes to document version changes"
          />
        ) : (
          <div className="space-y-3">
            {productReleaseNotes.map((note, index) => {
              const publicCount = (note.items || []).filter(i => (i.visibility || 'public') === 'public').length;
              const internalCount = (note.items || []).filter(i => i.visibility === 'internal').length;
              const itemCounts = {};
              (note.items || []).forEach(item => {
                itemCounts[item.type] = (itemCounts[item.type] || 0) + 1;
              });

              return (
                <div
                  key={note.id}
                  className={`p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer ${
                    index === 0
                      ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                  onClick={() => navigate('release-notes')}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-lg font-bold ${index === 0 ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
                          v{note.version}
                        </span>
                        {index === 0 && (
                          <Badge color="blue" size="sm">Latest</Badge>
                        )}
                        {note.title && (
                          <span className="text-sm text-slate-500">- {note.title}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(note.releaseDate)}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Globe size={12} />
                          {publicCount} public
                        </span>
                        {internalCount > 0 && (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Lock size={12} />
                            {internalCount} internal
                          </span>
                        )}
                      </div>
                      {/* Item type badges */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {Object.entries(itemCounts).map(([type, count]) => {
                          const typeConfig = RELEASE_NOTE_TYPES.find(t => t.key === type);
                          if (!typeConfig) return null;
                          return (
                            <span
                              key={type}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${typeConfig.bg} ${typeConfig.color}`}
                            >
                              {typeConfig.emoji} {count}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <CustomTooltip content="View">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate('release-notes'); }}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                      </CustomTooltip>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Notes Section */}
      <Card className="p-6">
        <NotesPanel
          notes={product.notes || []}
          onAddNote={handleAddNote}
          title="Product Notes"
          placeholder="Add a note about this product..."
        />
      </Card>

      {/* Timeline */}
      {timelineItems.length > 0 && (
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide mb-4 flex items-center gap-2">
            <Calendar size={16} /> Delivery Timeline
          </h3>
          <TimelineStrip items={timelineItems} onSelect={(item) => navigate('deployments', { filter: { id: item.id } })} />
        </Card>
      )}

      {/* Sub-Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderPlus size={20} /> Sub-Projects ({subProjects.length})
          </h3>
          <Button variant="secondary" size="sm" onClick={() => { setEditing(null); setIsSubProject(true); setSelectedParentId(productId); setNotificationEmails([]); setNewEmail(''); setModalOpen(true); }} icon={Plus}>
            Add Sub-Project
          </Button>
        </div>

        {subProjects.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={Package}
              title="No sub-projects"
              description="Break down this product into smaller sub-projects for better tracking."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subProjects.map(sp => {
              const spDeploys = deploys.filter(d => d.productId === sp.id);
              const deployCount = spDeploys.length;
              const docsCount = sp.documentation ? Object.values(sp.documentation).filter(Boolean).length : 0;
              const spDeadline = getDeadlineStatus(sp.nextReleaseDate, 'In Progress');
              const spColorIndex = sp.name?.charCodeAt(0) % PRODUCT_AVATAR_COLORS.length || 0;
              const spAvatarColor = PRODUCT_AVATAR_COLORS[spColorIndex];

              return (
                <Card
                  key={sp.id}
                  className="p-0 overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex flex-col"
                  onClick={() => navigate('product-detail', { productId: sp.id })}
                >
                  <div className="p-5 flex-1">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 ${spAvatarColor} rounded-xl flex items-center justify-center text-white shadow-sm shrink-0`}>
                        <Package size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight truncate">
                            {sp.name}
                          </h4>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModal(sp); }}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(sp); }}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {sp.description ? (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{sp.description}</p>
                        ) : (
                          <p className="text-sm text-slate-400 italic mt-1">No description</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                      {sp.productOwner && (
                        <div>
                          <span className="text-slate-400 text-xs block">Product Owner</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">{sp.productOwner}</span>
                        </div>
                      )}
                      {sp.engineeringOwner && (
                        <div>
                          <span className="text-slate-400 text-xs block">Eng Owner</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">{sp.engineeringOwner}</span>
                        </div>
                      )}
                    </div>

                    {sp.nextReleaseDate && (
                      <div className="mt-3 flex items-center gap-2">
                        <Clock size={14} className={spDeadline.color.split(' ')[0]} />
                        <span className={`text-sm ${spDeadline.color.split(' ')[0]}`}>
                          Next release: {formatDate(sp.nextReleaseDate)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
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
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Deployments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Rocket size={20} /> Deployments ({productDeploys.length})
          </h3>
          <Button variant="secondary" size="sm" onClick={() => navigate('deployments', { action: 'new', productId })} icon={Plus}>
            New Deployment
          </Button>
        </div>

        {/* Status Breakdown */}
        {allDeploys.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {statusCounts.notStarted > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{statusCounts.notStarted} Not Started</span>
              </div>
            )}
            {statusCounts.inProgress > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{statusCounts.inProgress} In Progress</span>
              </div>
            )}
            {statusCounts.blocked > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-sm font-medium text-rose-700 dark:text-rose-300">{statusCounts.blocked} Blocked</span>
              </div>
            )}
            {statusCounts.released > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{statusCounts.released} Released</span>
              </div>
            )}
          </div>
        )}

        {productDeploys.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={Rocket}
              title="No deployments yet"
              description="Create a deployment to track this product's rollout to clients."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productDeploys.map(d => {
              const client = clients.find(c => c.id === d.clientId);
              let clientName = client?.name;
              if (!clientName) {
                if (d.deploymentType === 'ga') clientName = 'GA Release';
                else if (d.deploymentType === 'generic') clientName = 'Generic';
                else clientName = 'GA Release';
              }
              const dlColor = getDeadlineStatus(d.nextDeliveryDate, d.status);
              const checks = checklists.filter(c => c.deploymentId === d.id);
              const completion = calculateChecklistProgress(checks);

              return (
                <Card
                  key={d.id}
                  className="p-4 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate('deployments', { filter: { id: d.id } })}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-slate-400" />
                        <span className="font-semibold text-slate-900 dark:text-white truncate">{clientName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          color={d.status === 'Released' ? 'emerald' : d.status === 'Blocked' ? 'rose' : d.status === 'In Progress' ? 'blue' : 'slate'}
                          size="sm"
                        >
                          {d.status}
                        </Badge>
                        <span className={`text-xs ${dlColor.color.split(' ')[0]}`}>{dlColor.label}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xl font-bold ${completion === 100 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                        {completion}%
                      </div>
                      <div className="w-16 mt-1">
                        <ProgressBar
                          value={completion}
                          color={completion === 100 ? 'bg-emerald-500' : d.status === 'Blocked' ? 'bg-rose-500' : 'bg-blue-500'}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">
              {editing ? `Edit ${editing.parentId ? 'Sub-Project' : 'Product'}` : isSubProject ? 'New Sub-Project' : 'Edit Product'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <Input label="Name" name="name" defaultValue={editing?.name} required placeholder="Enter name" />
              <Input label="Description" name="description" defaultValue={editing?.description} placeholder="Brief description" />

              {/* Parent Product Selector - shown when editing a sub-project or creating new sub-project */}
              {(editing?.parentId || isSubProject) && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Parent Product
                  </label>
                  <select
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="">None (Make top-level product)</option>
                    {parentProducts.filter(pp => pp.id !== editing?.id).map(pp => (
                      <option key={pp.id} value={pp.id}>{pp.name}</option>
                    ))}
                  </select>
                  {selectedParentId && selectedParentId !== productId && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Moving to "{parentProducts.find(p => p.id === selectedParentId)?.name}" - you'll be redirected after saving
                    </p>
                  )}
                  {!selectedParentId && editing?.parentId && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      This will become a top-level product - you'll be redirected to Products page after saving
                    </p>
                  )}
                </div>
              )}

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
                <Button variant="secondary" onClick={() => { setModalOpen(false); setEditing(null); setIsSubProject(false); setSelectedParentId(''); setNotificationEmails([]); setNewEmail(''); }} type="button">Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {confirmModal && <ConfirmationModal {...confirmModal} />}
    </div>
  );
};
