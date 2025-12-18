import { useState, useMemo, useEffect } from 'react';
import {
  FileText, Plus, Edit2, Trash2, Copy, Download, Eye, X, Check,
  Sparkles, TrendingUp, Bug, Shield, Zap, AlertTriangle, Clock,
  ChevronDown, ChevronRight, Calendar, Package, Tag, Search,
  Globe, Lock, History, Users, Building2, Wand2, CheckCircle2, Rocket, Server
} from 'lucide-react';
import { useNav, useToast } from '../contexts';
import { useCollection } from '../hooks';
import { db, appId, serverTimestamp, doc, addDoc, updateDoc, deleteDoc, collection } from '../utils/firebase';
import { formatDate, toInputDate } from '../utils';
import { RELEASE_NOTE_TYPES } from '../constants';
import { Button, Input, Card, Badge, SearchInput, ConfirmationModal, EmptyState } from '../components/ui/index.jsx';

// Visibility options
const VISIBILITY_OPTIONS = [
  { key: 'public', label: 'Public', icon: Globe, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  { key: 'internal', label: 'Internal', icon: Lock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' }
];

// Icon mapping
const IconMap = {
  Sparkles, TrendingUp, Bug, Shield, Zap, AlertTriangle, Clock, FileText
};

export const ReleaseNotes = () => {
  const { data: releaseNotes } = useCollection('releaseNotes');
  const { data: products } = useCollection('products');
  const { data: deployments } = useCollection('deployments');
  const { data: checklists } = useCollection('checklists');
  const { data: clients } = useCollection('clients');
  const { data: microservices } = useCollection('microservices');
  const { data: productServiceVersions } = useCollection('productServiceVersions');
  const { addToast } = useToast();
  const { navigate } = useNav();

  const [isModalOpen, setModalOpen] = useState(false);
  const [isPreviewOpen, setPreviewOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isImportOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [exportVisibility, setExportVisibility] = useState('all'); // 'all', 'public', 'internal'
  const [openDropdown, setOpenDropdown] = useState(null); // 'copy-{noteId}' or 'pdf-{noteId}'
  const [selectedDeploymentId, setSelectedDeploymentId] = useState('');
  const [selectedChecklistItems, setSelectedChecklistItems] = useState([]);
  const [showServiceVersions, setShowServiceVersions] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  // Form state
  const [formData, setFormData] = useState({
    productId: '',
    version: '',
    releaseDate: '',
    title: '',
    summary: '',
    items: [],
    serviceVersions: {} // { serviceId: version }
  });
  const [newItem, setNewItem] = useState({ type: 'feature', title: '', description: '', visibility: 'public' });

  // Filter and sort release notes
  const filteredNotes = useMemo(() => {
    let notes = [...releaseNotes];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      notes = notes.filter(n =>
        n.version?.toLowerCase().includes(q) ||
        n.title?.toLowerCase().includes(q) ||
        n.items?.some(i => i.title?.toLowerCase().includes(q))
      );
    }

    if (selectedProduct) {
      notes = notes.filter(n => n.productId === selectedProduct);
    }

    return notes.sort((a, b) => new Date(b.releaseDate || b.createdAt) - new Date(a.releaseDate || a.createdAt));
  }, [releaseNotes, searchQuery, selectedProduct]);

  // Get deployments for the selected product (for import)
  const productDeployments = useMemo(() => {
    if (!formData.productId) return [];
    return deployments
      .filter(d => d.productId === formData.productId)
      .map(d => {
        const client = clients.find(c => c.id === d.clientId);
        let clientName = client?.name;
        if (!clientName) {
          if (d.deploymentType === 'ga') clientName = 'GA Release';
          else if (d.deploymentType === 'generic') clientName = 'Generic';
          else clientName = 'GA Release';
        }
        const deployChecklist = checklists.filter(c => c.deploymentId === d.id);
        const completedCount = deployChecklist.filter(c => c.isCompleted).length;
        return {
          ...d,
          clientName,
          checklist: deployChecklist,
          completedCount,
          totalCount: deployChecklist.length
        };
      })
      .sort((a, b) => new Date(b.nextDeliveryDate || 0) - new Date(a.nextDeliveryDate || 0));
  }, [deployments, formData.productId, clients, checklists]);

  // Get checklist items for selected deployment
  const selectedDeploymentChecklist = useMemo(() => {
    if (!selectedDeploymentId) return [];
    const deployment = productDeployments.find(d => d.id === selectedDeploymentId);
    return deployment?.checklist || [];
  }, [selectedDeploymentId, productDeployments]);

  // Get service dependencies for the selected product
  const productDependencies = useMemo(() => {
    if (!formData.productId) return [];
    return productServiceVersions
      .filter(ps => ps.productId === formData.productId)
      .map(ps => {
        const service = microservices.find(s => s.id === ps.serviceId);
        return {
          ...ps,
          serviceName: service?.name || 'Unknown',
          currentVersion: service?.currentVersion
        };
      })
      .sort((a, b) => (a.serviceName || '').localeCompare(b.serviceName || ''));
  }, [productServiceVersions, formData.productId, microservices]);

  // Import selected checklist items as release note items
  const importChecklistItems = () => {
    if (selectedChecklistItems.length === 0) {
      addToast("Please select at least one item to import", "error");
      return;
    }

    const newItems = selectedChecklistItems.map(checkItem => ({
      id: crypto.randomUUID(),
      type: 'feature', // Default type, user can change
      title: checkItem.name,
      description: checkItem.isCompleted ? 'Completed' : 'Pending',
      visibility: 'public'
    }));

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, ...newItems]
    }));

    addToast(`Imported ${newItems.length} item${newItems.length !== 1 ? 's' : ''}`, "success");
    setImportOpen(false);
    setSelectedDeploymentId('');
    setSelectedChecklistItems([]);
  };

  // Toggle checklist item selection
  const toggleChecklistItem = (item) => {
    setSelectedChecklistItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.filter(i => i.id !== item.id);
      }
      return [...prev, item];
    });
  };

  // Select all completed items
  const selectAllCompleted = () => {
    const completedItems = selectedDeploymentChecklist.filter(c => c.isCompleted);
    setSelectedChecklistItems(completedItems);
  };

  // Open modal for new release note
  const openNewModal = () => {
    setEditing(null);
    setFormData({
      productId: selectedProduct || '',
      version: '',
      releaseDate: toInputDate(new Date()),
      title: '',
      summary: '',
      items: []
    });
    setNewItem({ type: 'feature', title: '', description: '', visibility: 'public' });
    setModalOpen(true);
  };

  // Open modal for editing
  const openEditModal = (note) => {
    setEditing(note);
    setFormData({
      productId: note.productId || '',
      version: note.version || '',
      releaseDate: toInputDate(note.releaseDate),
      title: note.title || '',
      summary: note.summary || '',
      items: (note.items || []).map(item => ({
        ...item,
        visibility: item.visibility || 'public' // Ensure visibility field exists
      })),
      serviceVersions: note.serviceVersions || {}
    });
    setNewItem({ type: 'feature', title: '', description: '', visibility: 'public' });
    setModalOpen(true);
  };

  // Add item to release note
  const addItem = () => {
    if (!newItem.title.trim()) {
      addToast("Please enter an item title", "error");
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...newItem, id: crypto.randomUUID() }]
    }));
    setNewItem({ type: 'feature', title: '', description: '', visibility: 'public' });
  };

  // Remove item from release note
  const removeItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId)
    }));
  };

  // Toggle item visibility
  const toggleItemVisibility = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId
          ? { ...item, visibility: item.visibility === 'public' ? 'internal' : 'public' }
          : item
      )
    }));
  };

  // Generate history entry
  const createHistoryEntry = (action, changes = null) => {
    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      author: 'Admin', // In a real app, this would come from auth context
      action,
      changes
    };
  };

  // Save release note
  const handleSave = async () => {
    if (!formData.version.trim()) {
      addToast("Please enter a version number", "error");
      return;
    }
    if (!formData.productId) {
      addToast("Please select a product", "error");
      return;
    }

    try {
      if (editing) {
        // Determine what changed for history
        const changes = [];
        if (editing.version !== formData.version) changes.push(`Version: ${editing.version} → ${formData.version}`);
        if (editing.title !== formData.title) changes.push(`Title updated`);
        if (editing.summary !== formData.summary) changes.push(`Summary updated`);
        if (editing.releaseDate !== formData.releaseDate) changes.push(`Release date changed`);

        const oldItemCount = (editing.items || []).length;
        const newItemCount = formData.items.length;
        if (oldItemCount !== newItemCount) {
          changes.push(`Items: ${oldItemCount} → ${newItemCount}`);
        }

        const historyEntry = createHistoryEntry('updated', changes.length > 0 ? changes : ['Minor changes']);
        const existingHistory = editing.history || [];

        const payload = {
          ...formData,
          history: [...existingHistory, historyEntry],
          updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'releaseNotes', editing.id), payload);
        addToast("Release note updated", "success");
      } else {
        const historyEntry = createHistoryEntry('created');
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'releaseNotes'), {
          ...formData,
          history: [historyEntry],
          createdAt: serverTimestamp()
        });
        addToast("Release note created", "success");
      }
      setModalOpen(false);
      setEditing(null);
    } catch (e) {
      addToast("Error saving release note", "error");
    }
  };

  // Delete release note
  const handleDelete = (note) => {
    setConfirmModal({
      title: `Delete Release Note v${note.version}?`,
      message: "This action is permanent and cannot be undone.",
      isDestructive: true,
      onCancel: () => setConfirmModal(null),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'releaseNotes', note.id));
          addToast("Release note deleted", "success");
        } catch (e) {
          addToast("Deletion failed", "error");
        }
        setConfirmModal(null);
      }
    });
  };

  // Filter items by visibility
  const filterItemsByVisibility = (items, visibility) => {
    if (visibility === 'all') return items;
    return items.filter(item => (item.visibility || 'public') === visibility);
  };

  // Generate markdown content
  const generateMarkdown = (note, visibility = 'all') => {
    const product = products.find(p => p.id === note.productId);
    const filteredItems = filterItemsByVisibility(note.items || [], visibility);
    const groupedItems = {};

    filteredItems.forEach(item => {
      if (!groupedItems[item.type]) groupedItems[item.type] = [];
      groupedItems[item.type].push(item);
    });

    const audienceLabel = visibility === 'public' ? ' (Customer-Facing)' : visibility === 'internal' ? ' (Internal)' : '';
    let md = `# ${product?.name || 'Product'} - Release Notes${audienceLabel}\n\n`;
    md += `## Version ${note.version}\n`;
    md += `**Release Date:** ${formatDate(note.releaseDate)}\n\n`;

    if (note.title) md += `### ${note.title}\n\n`;
    if (note.summary) md += `${note.summary}\n\n`;

    RELEASE_NOTE_TYPES.forEach(type => {
      const items = groupedItems[type.key];
      if (items && items.length > 0) {
        md += `### ${type.emoji} ${type.label}\n\n`;
        items.forEach(item => {
          md += `- **${item.title}**`;
          if (item.description) md += `\n  ${item.description}`;
          md += '\n';
        });
        md += '\n';
      }
    });

    return md;
  };

  // Generate HTML content for PDF
  const generateHTML = (note, visibility = 'all') => {
    const product = products.find(p => p.id === note.productId);
    const filteredItems = filterItemsByVisibility(note.items || [], visibility);
    const groupedItems = {};

    filteredItems.forEach(item => {
      if (!groupedItems[item.type]) groupedItems[item.type] = [];
      groupedItems[item.type].push(item);
    });

    const audienceLabel = visibility === 'public' ? ' (Customer-Facing)' : visibility === 'internal' ? ' (Internal)' : '';
    const audienceBadge = visibility === 'public'
      ? '<span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">Customer-Facing</span>'
      : visibility === 'internal'
      ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">Internal Only</span>'
      : '';

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${product?.name || 'Product'} - Release Notes v${note.version}${audienceLabel}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1e293b; }
    h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; display: flex; align-items: center; }
    h2 { color: #334155; margin-top: 32px; }
    h3 { color: #475569; margin-top: 24px; display: flex; align-items: center; gap: 8px; }
    .meta { color: #64748b; font-size: 14px; margin-bottom: 24px; }
    .summary { background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #3b82f6; }
    ul { list-style: none; padding: 0; }
    li { padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    li:last-child { border-bottom: none; }
    .item-title { font-weight: 600; color: #1e293b; }
    .item-desc { color: #64748b; font-size: 14px; margin-top: 4px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; margin-right: 8px; }
    .feature { background: #d1fae5; color: #065f46; }
    .bugfix { background: #fee2e2; color: #991b1b; }
    .improvement { background: #dbeafe; color: #1e40af; }
    .security { background: #fef3c7; color: #92400e; }
    .performance { background: #ede9fe; color: #5b21b6; }
    .breaking { background: #fee2e2; color: #991b1b; }
    .deprecated { background: #f1f5f9; color: #475569; }
    .docs { background: #cffafe; color: #0e7490; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${product?.name || 'Product'} ${audienceBadge}</h1>
  <h2>Version ${note.version}</h2>
  <div class="meta">
    <strong>Release Date:</strong> ${formatDate(note.releaseDate)}
  </div>
`;

    if (note.title) {
      html += `<h3>${note.title}</h3>`;
    }
    if (note.summary) {
      html += `<div class="summary">${note.summary}</div>`;
    }

    RELEASE_NOTE_TYPES.forEach(type => {
      const items = groupedItems[type.key];
      if (items && items.length > 0) {
        html += `<h3>${type.emoji} ${type.label}</h3><ul>`;
        items.forEach(item => {
          html += `<li><span class="badge ${type.key}">${type.label}</span><span class="item-title">${item.title}</span>`;
          if (item.description) html += `<div class="item-desc">${item.description}</div>`;
          html += `</li>`;
        });
        html += `</ul>`;
      }
    });

    html += `
  <div class="footer">
    Generated by Control Tower on ${new Date().toLocaleDateString()}${visibility !== 'all' ? ` | ${visibility === 'public' ? 'Customer-Facing Version' : 'Internal Version'}` : ''}
  </div>
</body>
</html>`;

    return html;
  };

  // Copy to clipboard with visibility filter
  const copyToClipboard = (note, visibility = 'all') => {
    const markdown = generateMarkdown(note, visibility);
    navigator.clipboard.writeText(markdown);
    const label = visibility === 'all' ? '' : visibility === 'public' ? ' (Customer-Facing)' : ' (Internal)';
    addToast(`Release notes${label} copied to clipboard!`, "success");
  };

  // Export to PDF with visibility filter
  const exportToPDF = (note, visibility = 'all') => {
    const html = generateHTML(note, visibility);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Preview release note
  const [previewNote, setPreviewNote] = useState(null);
  const [previewVisibility, setPreviewVisibility] = useState('all');

  // Get service versions for preview note (enriched with service names)
  const previewServiceVersions = useMemo(() => {
    if (!previewNote?.serviceVersions) return [];
    return Object.entries(previewNote.serviceVersions)
      .filter(([_, version]) => version) // Only show services with versions set
      .map(([serviceId, version]) => {
        const service = microservices.find(s => s.id === serviceId);
        const productDep = productServiceVersions.find(ps => ps.productId === previewNote.productId && ps.serviceId === serviceId);
        return {
          serviceId,
          serviceName: service?.name || 'Unknown',
          version,
          currentVersion: service?.currentVersion,
          defaultVersion: productDep?.version
        };
      })
      .sort((a, b) => (a.serviceName || '').localeCompare(b.serviceName || ''));
  }, [previewNote, microservices, productServiceVersions]);

  const openPreview = (note) => {
    setPreviewNote(note);
    setPreviewVisibility('all');
    setPreviewOpen(true);
  };

  // History modal
  const [historyNote, setHistoryNote] = useState(null);

  const openHistory = (note) => {
    setHistoryNote(note);
    setIsHistoryOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Release Notes</h1>
          <p className="text-slate-500 mt-1">Generate and manage release notes for your products</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search release notes..."
            className="w-full md:w-64"
          />
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Products</option>
            {products.filter(p => !p.parentId).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button onClick={openNewModal} icon={Plus}>New Release Note</Button>
        </div>
      </div>

      {/* Release Notes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredNotes.map(note => {
          const product = products.find(p => p.id === note.productId);
          const itemCounts = {};
          const publicCount = (note.items || []).filter(i => (i.visibility || 'public') === 'public').length;
          const internalCount = (note.items || []).filter(i => i.visibility === 'internal').length;

          (note.items || []).forEach(item => {
            itemCounts[item.type] = (itemCounts[item.type] || 0) + 1;
          });

          return (
            <Card key={note.id} className="p-0 overflow-hidden group hover:shadow-lg transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                      <Tag size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">v{note.version}</h3>
                      </div>
                      <p className="text-sm text-slate-500">{product?.name || 'Unknown Product'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openPreview(note)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600"
                      title="Preview"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => { setHistoryNote(note); setIsHistoryOpen(true); }}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-purple-600"
                      title="View History"
                    >
                      <History size={16} />
                    </button>
                    <button
                      onClick={() => openEditModal(note)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(note)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {note.title && (
                  <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">{note.title}</p>
                )}

                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(note.releaseDate)}
                  </span>
                  {/* Visibility counts */}
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
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(itemCounts).map(([type, count]) => {
                    const typeConfig = RELEASE_NOTE_TYPES.find(t => t.key === type);
                    if (!typeConfig) return null;
                    return (
                      <span
                        key={type}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeConfig.bg} ${typeConfig.color}`}
                      >
                        {typeConfig.emoji} {count}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Footer actions */}
              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  {(note.items || []).length} item{(note.items || []).length !== 1 ? 's' : ''}
                  {(note.history || []).length > 0 && (
                    <span className="ml-2">| {(note.history || []).length} edit{(note.history || []).length !== 1 ? 's' : ''}</span>
                  )}
                </span>
                <div className="flex gap-1">
                  {/* Copy dropdown */}
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === `copy-${note.id}` ? null : `copy-${note.id}`); }}
                      className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                        openDropdown === `copy-${note.id}`
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      <Copy size={12} /> Copy <ChevronDown size={10} />
                    </button>
                    {openDropdown === `copy-${note.id}` && (
                      <div className="absolute bottom-full right-0 mb-1 z-20">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[140px]">
                          <button onClick={(e) => { e.stopPropagation(); copyToClipboard(note, 'all'); setOpenDropdown(null); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                            <FileText size={12} /> All Items
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); copyToClipboard(note, 'public'); setOpenDropdown(null); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <Globe size={12} /> Customer-Facing
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); copyToClipboard(note, 'internal'); setOpenDropdown(null); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <Lock size={12} /> Internal Only
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* PDF dropdown */}
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === `pdf-${note.id}` ? null : `pdf-${note.id}`); }}
                      className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                        openDropdown === `pdf-${note.id}`
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                      }`}
                    >
                      <Download size={12} /> PDF <ChevronDown size={10} />
                    </button>
                    {openDropdown === `pdf-${note.id}` && (
                      <div className="absolute bottom-full right-0 mb-1 z-20">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[140px]">
                          <button onClick={(e) => { e.stopPropagation(); exportToPDF(note, 'all'); setOpenDropdown(null); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                            <FileText size={12} /> All Items
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); exportToPDF(note, 'public'); setOpenDropdown(null); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <Globe size={12} /> Customer-Facing
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); exportToPDF(note, 'internal'); setOpenDropdown(null); }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <Lock size={12} /> Internal Only
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {filteredNotes.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={FileText}
              title="No release notes found"
              description="Create your first release note to document product changes"
            />
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Edit Release Note' : 'New Release Note'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                    Product *
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white"
                    required
                  >
                    <option value="">Select Product</option>
                    {products.filter(p => !p.parentId).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Input
                    label="Version *"
                    value={formData.version}
                    onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="e.g., 1.0.0, 2.3.1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Release Date"
                  type="date"
                  value={formData.releaseDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, releaseDate: e.target.value }))}
                />
                <Input
                  label="Title (Optional)"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Holiday Release"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                  Summary (Optional)
                </label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Brief overview of this release..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* Add Item Section */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Add Release Items</h4>
                  {formData.productId && productDeployments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setSelectedDeploymentId(''); setSelectedChecklistItems([]); setImportOpen(true); }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                    >
                      <Wand2 size={14} /> Import from Deployment
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <select
                      value={newItem.type}
                      onChange={(e) => setNewItem(prev => ({ ...prev, type: e.target.value }))}
                      className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white"
                    >
                      {RELEASE_NOTE_TYPES.map(type => (
                        <option key={type.key} value={type.key}>{type.emoji} {type.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newItem.title}
                      onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Item title *"
                      className="col-span-2 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); }}}
                    />
                    {/* Visibility toggle */}
                    <button
                      type="button"
                      onClick={() => setNewItem(prev => ({ ...prev, visibility: prev.visibility === 'public' ? 'internal' : 'public' }))}
                      className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                        newItem.visibility === 'public'
                          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      }`}
                      title={newItem.visibility === 'public' ? 'Public (click to make internal)' : 'Internal (click to make public)'}
                    >
                      {newItem.visibility === 'public' ? <Globe size={14} /> : <Lock size={14} />}
                      {newItem.visibility === 'public' ? 'Public' : 'Internal'}
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newItem.description}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description (optional)"
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); }}}
                    />
                    <Button onClick={addItem} icon={Plus}>Add</Button>
                  </div>
                </div>
              </div>

              {/* Items List */}
              {formData.items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                    Release Items ({formData.items.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {formData.items.map(item => {
                      const typeConfig = RELEASE_NOTE_TYPES.find(t => t.key === item.type);
                      const isPublic = (item.visibility || 'public') === 'public';
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg group"
                        >
                          <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${typeConfig?.bg} ${typeConfig?.color}`}>
                            {typeConfig?.emoji} {typeConfig?.label}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                            )}
                          </div>
                          {/* Visibility toggle for existing items */}
                          <button
                            onClick={() => toggleItemVisibility(item.id)}
                            className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                              isPublic
                                ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                            }`}
                            title={isPublic ? 'Public (click to make internal)' : 'Internal (click to make public)'}
                          >
                            {isPublic ? <Globe size={14} /> : <Lock size={14} />}
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="shrink-0 p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Service Versions Section */}
              {productDependencies.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Server size={16} className="text-cyan-500" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                      Service Versions
                    </h3>
                    <span className="text-xs text-slate-400">({productDependencies.length} dependencies)</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Specify the required service versions for this release. Leave blank to use the default dependency version.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {productDependencies.map(dep => (
                      <div key={dep.serviceId} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{dep.serviceName}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            Default: <span className="font-mono text-cyan-600 dark:text-cyan-400">v{dep.version || '?'}</span>
                            {dep.currentVersion && dep.version !== dep.currentVersion && (
                              <span className="text-amber-600 dark:text-amber-400">(latest: {dep.currentVersion})</span>
                            )}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={formData.serviceVersions?.[dep.serviceId] || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            serviceVersions: {
                              ...prev.serviceVersions,
                              [dep.serviceId]: e.target.value
                            }
                          }))}
                          placeholder={dep.version || dep.currentVersion || 'version'}
                          className="w-24 px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-sm font-mono bg-white dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? 'Update' : 'Create'} Release Note</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewOpen && previewNote && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Release Notes Preview
                  </h2>
                  <p className="text-sm text-slate-500">
                    {products.find(p => p.id === previewNote.productId)?.name} - v{previewNote.version}
                  </p>
                </div>
                <button onClick={() => setPreviewOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400">
                  <X size={20} />
                </button>
              </div>
              {/* Visibility filter and export buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => setPreviewVisibility('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      previewVisibility === 'all'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setPreviewVisibility('public')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                      previewVisibility === 'public'
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Globe size={12} /> Customer
                  </button>
                  <button
                    onClick={() => setPreviewVisibility('internal')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                      previewVisibility === 'internal'
                        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Lock size={12} /> Internal
                  </button>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  {previewServiceVersions.length > 0 && (
                    <button
                      onClick={() => setShowServiceVersions(!showServiceVersions)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        showServiceVersions
                          ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Server size={14} />
                      Services {showServiceVersions ? 'On' : 'Off'}
                    </button>
                  )}
                  <Button variant="secondary" onClick={() => copyToClipboard(previewNote, previewVisibility)} icon={Copy}>
                    Copy
                  </Button>
                  <Button variant="secondary" onClick={() => exportToPDF(previewNote, previewVisibility)} icon={Download}>
                    PDF
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="prose dark:prose-invert max-w-none">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white m-0">
                      {products.find(p => p.id === previewNote.productId)?.name}
                    </h1>
                    {previewVisibility !== 'all' && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        previewVisibility === 'public'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      }`}>
                        {previewVisibility === 'public' ? 'Customer-Facing' : 'Internal'}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl text-slate-700 dark:text-slate-300 mt-0">Version {previewNote.version}</h2>
                  <p className="text-slate-500 mt-2">
                    <strong>Release Date:</strong> {formatDate(previewNote.releaseDate)}
                  </p>
                </div>

                {/* Service Versions Section (toggleable) */}
                {showServiceVersions && previewServiceVersions.length > 0 && (
                  <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide flex items-center gap-2 mb-3">
                      <Server size={16} className="text-cyan-500" /> Required Service Versions
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {previewServiceVersions.map(sv => (
                        <div key={sv.serviceId} className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{sv.serviceName}</span>
                          <span className="text-sm font-mono font-medium text-cyan-600 dark:text-cyan-400 shrink-0">
                            v{sv.version}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewNote.title && (
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6">{previewNote.title}</h3>
                )}

                {previewNote.summary && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg my-4">
                    <p className="text-slate-700 dark:text-slate-300 m-0">{previewNote.summary}</p>
                  </div>
                )}

                {RELEASE_NOTE_TYPES.map(type => {
                  const items = filterItemsByVisibility(previewNote.items || [], previewVisibility).filter(i => i.type === type.key);
                  if (items.length === 0) return null;

                  return (
                    <div key={type.key} className="mt-6">
                      <h3 className={`text-lg font-semibold ${type.color} flex items-center gap-2`}>
                        <span>{type.emoji}</span> {type.label}
                      </h3>
                      <ul className="mt-3 space-y-3 list-none pl-0">
                        {items.map(item => {
                          const isPublic = (item.visibility || 'public') === 'public';
                          return (
                            <li key={item.id} className="flex items-start gap-3">
                              <span className={`shrink-0 w-2 h-2 rounded-full mt-2 ${type.bg.replace('/30', '')}`} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-slate-800 dark:text-slate-200 m-0">{item.title}</p>
                                  {previewVisibility === 'all' && (
                                    <span className={`shrink-0 ${isPublic ? 'text-emerald-500' : 'text-amber-500'}`}>
                                      {isPublic ? <Globe size={12} /> : <Lock size={12} />}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-sm text-slate-500 mt-1 m-0">{item.description}</p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}

                {filterItemsByVisibility(previewNote.items || [], previewVisibility).length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Lock size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No {previewVisibility} items in this release note</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && historyNote && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History size={20} /> Version History
                </h2>
                <p className="text-sm text-slate-500">
                  v{historyNote.version} - {products.find(p => p.id === historyNote.productId)?.name}
                </p>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {(historyNote.history || []).length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <History size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No history available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[...(historyNote.history || [])].reverse().map((entry, index) => (
                    <div key={entry.id || index} className="relative pl-6 pb-4 border-l-2 border-slate-200 dark:border-slate-700 last:pb-0">
                      <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center">
                        {entry.action === 'created' ? (
                          <Plus size={8} className="text-emerald-500" />
                        ) : (
                          <Edit2 size={8} className="text-blue-500" />
                        )}
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold uppercase tracking-wide ${
                            entry.action === 'created' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                          }`}>
                            {entry.action === 'created' ? 'Created' : 'Updated'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(entry.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          By <span className="font-medium">{entry.author}</span>
                        </p>
                        {entry.changes && entry.changes.length > 0 && (
                          <ul className="mt-2 text-xs text-slate-500 space-y-1">
                            {entry.changes.map((change, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <ChevronRight size={12} className="shrink-0 mt-0.5" />
                                {change}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="secondary" onClick={() => setIsHistoryOpen(false)} className="w-full">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Import from Deployment Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Wand2 size={20} className="text-purple-500" /> Import from Deployment
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Select checklist items to add as release notes
                </p>
              </div>
              <button onClick={() => setImportOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Deployment Selector */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                  Select Deployment
                </label>
                <select
                  value={selectedDeploymentId}
                  onChange={(e) => { setSelectedDeploymentId(e.target.value); setSelectedChecklistItems([]); }}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Choose a deployment...</option>
                  {productDeployments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.clientName} - {d.status} ({d.completedCount}/{d.totalCount} completed)
                    </option>
                  ))}
                </select>
              </div>

              {/* Checklist Items */}
              {selectedDeploymentId && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Checklist Items ({selectedDeploymentChecklist.length})
                    </label>
                    <button
                      type="button"
                      onClick={selectAllCompleted}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Select all completed
                    </button>
                  </div>

                  {selectedDeploymentChecklist.length === 0 ? (
                    <div className="text-center py-6 text-slate-500">
                      <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No checklist items found</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedDeploymentChecklist.map(item => {
                        const isSelected = selectedChecklistItems.find(i => i.id === item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleChecklistItem(item)}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700'
                                : 'bg-slate-50 dark:bg-slate-800 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-600'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-purple-500 text-white'
                                : 'border-2 border-slate-300 dark:border-slate-600'
                            }`}>
                              {isSelected && <Check size={12} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${item.isCompleted ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500'}`}>
                                {item.name}
                              </p>
                            </div>
                            {item.isCompleted ? (
                              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs rounded-full">
                                Completed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs rounded-full">
                                Pending
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedChecklistItems.length > 0 && (
                    <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        <strong>{selectedChecklistItems.length}</strong> item{selectedChecklistItems.length !== 1 ? 's' : ''} selected for import
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!selectedDeploymentId && productDeployments.length > 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Rocket size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a deployment to see its checklist items</p>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setImportOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={importChecklistItems}
                disabled={selectedChecklistItems.length === 0}
                icon={Wand2}
              >
                Import {selectedChecklistItems.length > 0 ? `(${selectedChecklistItems.length})` : ''}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {confirmModal && <ConfirmationModal {...confirmModal} />}
    </div>
  );
};
