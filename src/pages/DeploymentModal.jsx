import { useState, useEffect } from 'react';
import { X, Clock, CheckCircle2, FileText, ExternalLink, Trash2, CheckCheck, RotateCcw, Cpu, ListTodo, Edit2, Link, User } from 'lucide-react';
import { useToast, useConfig } from '../contexts';
import { useCollection } from '../hooks';
import { updateDocument, deleteDocument, api } from '../utils/api';
import { toInputDate, getDeadlineStatus } from '../utils';
import { DEPLOYMENT_ENVIRONMENTS, ADAPTOR_STATUSES } from '../constants';
import { Button, Card, Badge, ConfirmationModal } from '../components/ui/index.jsx';
import { BlockedCommentsPanel, NotesPanel } from '../components/features';

export const DeploymentModal = ({ editing, setEditing, onClose }) => {
  const { data: products } = useCollection('products');
  const { data: checklists } = useCollection('checklists');
  const { addToast } = useToast();
  const { docTypes, deploymentDocTypes } = useConfig();
  const [confirmModal, setConfirmModal] = useState(null);
  const [isEditingReleaseItems, setIsEditingReleaseItems] = useState(false);
  const [localReleaseItems, setLocalReleaseItems] = useState('');
  // Deployment documentation state
  const [isEditingDocs, setIsEditingDocs] = useState(false);
  const [localDocumentation, setLocalDocumentation] = useState({});
  const [localRelevantDocs, setLocalRelevantDocs] = useState([]);
  // Delivery person state
  const [isEditingDeliveryPerson, setIsEditingDeliveryPerson] = useState(false);
  const [localDeliveryPerson, setLocalDeliveryPerson] = useState('');

  // Sync local release items, documentation, and delivery person state when editing changes
  useEffect(() => {
    if (editing) {
      setLocalReleaseItems(editing.releaseItems || '');
      setIsEditingReleaseItems(false);
      setLocalDocumentation(editing.documentation || {});
      setLocalRelevantDocs(editing.relevantDocs || []);
      setIsEditingDocs(false);
      setLocalDeliveryPerson(editing.deliveryPerson || '');
      setIsEditingDeliveryPerson(false);
    }
  }, [editing?.id]);

  if (!editing) return null;

  const product = products.find(p => p.id === editing.productId);
  const deploymentChecklist = checklists.filter(c => c.deploymentId === editing.id);
  const deadlineStatus = getDeadlineStatus(editing.nextDeliveryDate, editing.status);
  const completedCount = deploymentChecklist.filter(c => c.isCompleted).length;
  const totalCount = deploymentChecklist.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleStatusChange = async (newStatus) => {
    try {
      const oldStatus = editing.status;
      const statusChange = {
        id: crypto.randomUUID(),
        text: `Status changed from "${oldStatus}" to "${newStatus}"`,
        author: 'System',
        timestamp: new Date().toISOString(),
        type: 'status_change',
        fromStatus: oldStatus,
        toStatus: newStatus
      };
      const statusHistory = [...(editing.statusHistory || []), statusChange];

      await updateDocument('deployments', editing.id, {
        status: newStatus,
        statusHistory
      });
      setEditing({ ...editing, status: newStatus, statusHistory });
      addToast(`Status updated to ${newStatus}`, "success");
    } catch(e) { addToast("Failed to update status", "error"); }
  };

  const handleChecklistToggle = async (item) => {
    try {
      await api.toggleChecklist(item.id);
    } catch(e) { addToast("Failed to update checklist", "error"); }
  };

  const handleMarkAllComplete = async () => {
    try {
      await api.markAllChecklistsComplete(editing.id);
      addToast("All items marked complete", "success");
    } catch(e) { addToast("Failed to update checklist", "error"); }
  };

  const handleResetChecklist = async () => {
    try {
      await api.resetAllChecklists(editing.id);
      addToast("Checklist reset", "success");
    } catch(e) { addToast("Failed to reset checklist", "error"); }
  };

  const handleDateChange = async (e) => {
    try {
      await updateDocument('deployments', editing.id, {
        nextDeliveryDate: e.target.value
      });
      setEditing({ ...editing, nextDeliveryDate: e.target.value });
      addToast("Date updated", "success");
    } catch(e) { addToast("Failed to update date", "error"); }
  };

  const handleDelete = () => {
    setConfirmModal({
      title: "Delete Deployment?",
      message: "This will permanently delete this deployment and its checklist items.",
      isDestructive: true,
      onCancel: () => setConfirmModal(null),
      onConfirm: async () => {
        try {
          // Backend handles cascade deletion of checklists
          await deleteDocument('deployments', editing.id);
          addToast("Deployment deleted", "success");
          onClose();
        } catch(e) { addToast("Failed to delete", "error"); }
        setConfirmModal(null);
      }
    });
  };

  const handleAddComment = async (comment) => {
    try {
      const comments = [...(editing.blockedComments || []), comment];
      await updateDocument('deployments', editing.id, {
        blockedComments: comments
      });
      setEditing({ ...editing, blockedComments: comments });
      addToast("Comment added", "success");
    } catch(e) { addToast("Failed to add comment", "error"); }
  };

  const handleAddNote = async (note) => {
    try {
      const notes = [...(editing.notes || []), note];
      await updateDocument('deployments', editing.id, {
        notes
      });
      setEditing({ ...editing, notes });
      addToast("Note added", "success");
    } catch(e) { addToast("Failed to add note", "error"); }
  };

  const handleServiceStatusChange = async (field, value) => {
    try {
      await updateDocument('deployments', editing.id, {
        [field]: value
      });
      setEditing({ ...editing, [field]: value });
      addToast("Service status updated", "success");
    } catch(e) { addToast("Failed to update service status", "error"); }
  };

  const handleEnvironmentChange = async (newEnvironment) => {
    try {
      await updateDocument('deployments', editing.id, {
        environment: newEnvironment
      });
      setEditing({ ...editing, environment: newEnvironment });
      addToast("Environment updated", "success");
    } catch(e) { addToast("Failed to update environment", "error"); }
  };

  const handleDeliveryPersonChange = async (deliveryPerson) => {
    try {
      await updateDocument('deployments', editing.id, {
        deliveryPerson: deliveryPerson.trim() || null
      });
      setEditing({ ...editing, deliveryPerson: deliveryPerson.trim() || null });
      addToast("Delivery person updated", "success");
    } catch(e) { addToast("Failed to update delivery person", "error"); }
  };

  const handleReleaseItemsChange = async (releaseItems) => {
    try {
      await updateDocument('deployments', editing.id, {
        releaseItems: releaseItems.trim() || null
      });
      setEditing({ ...editing, releaseItems });
      addToast("Release items updated", "success");
    } catch(e) { addToast("Failed to update release items", "error"); }
  };

  const handleDocumentationChange = async () => {
    try {
      await updateDocument('deployments', editing.id, {
        documentation: localDocumentation,
        relevantDocs: localRelevantDocs
      });
      setEditing({ ...editing, documentation: localDocumentation, relevantDocs: localRelevantDocs });
      addToast("Documentation updated", "success");
    } catch(e) { addToast("Failed to update documentation", "error"); }
  };

  // Check if this deployment has any service statuses (for adapter products)
  const hasServiceStatuses = editing.equipmentSAStatus !== undefined || editing.equipmentSEStatus !== undefined || editing.mappingStatus !== undefined || editing.constructionStatus !== undefined;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editing.client?.name || (editing.deploymentType === 'ga' ? 'General Availability' : editing.deploymentType === 'eap' ? 'EAP' : editing.deploymentType === 'feature-release' ? (editing.featureName || 'Feature Release') : 'Feature Release')}
                </h2>
                {editing.deploymentType === 'ga' && (
                  <Badge color="blue" size="sm">GA</Badge>
                )}
                {editing.deploymentType === 'eap' && (
                  <Badge color="purple" size="sm">EAP</Badge>
                )}
                {(editing.deploymentType === 'feature-release' || editing.deploymentType === 'generic') && (
                  <Badge color="indigo" size="sm">Feature</Badge>
                )}
                {(() => {
                  const envInfo = DEPLOYMENT_ENVIRONMENTS.find(e => e.key === (editing.environment || 'production'));
                  return envInfo ? (
                    <Badge color={envInfo.color === 'amber' ? 'amber' : envInfo.color === 'blue' ? 'blue' : 'emerald'} size="sm">
                      {envInfo.label}
                    </Badge>
                  ) : null;
                })()}
              </div>
              <p className="text-sm text-slate-500">{product?.name || 'Unknown Product'}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"><X size={20}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {['Not Started', 'In Progress', 'Blocked', 'Released'].map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      editing.status === s
                        ? s === 'Released' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : s === 'Blocked' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          : s === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className={deadlineStatus.color.split(' ')[0]} />
                <input
                  type="date"
                  value={toInputDate(editing.nextDeliveryDate)}
                  onChange={handleDateChange}
                  className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Environment Selector */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mr-2">Environment:</span>
              {DEPLOYMENT_ENVIRONMENTS.map(env => (
                <button
                  key={env.key}
                  onClick={() => handleEnvironmentChange(env.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    (editing.environment || 'production') === env.key
                      ? env.color === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : env.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  {env.label}
                </button>
              ))}
            </div>

            {/* Delivery Person */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mr-2 flex items-center gap-1">
                <User size={12} /> Delivery Person:
              </span>
              {isEditingDeliveryPerson ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={localDeliveryPerson}
                    onChange={(e) => setLocalDeliveryPerson(e.target.value)}
                    placeholder="Enter name..."
                    className="flex-1 min-w-[200px] px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => { setLocalDeliveryPerson(editing.deliveryPerson || ''); setIsEditingDeliveryPerson(false); }}
                    className="px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { handleDeliveryPersonChange(localDeliveryPerson); setIsEditingDeliveryPerson(false); }}
                    className="px-2 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingDeliveryPerson(true)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-all"
                >
                  {editing.deliveryPerson || <span className="text-slate-400 italic">Not assigned</span>}
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{progress}%</div>
                <div className="text-xs text-slate-500">Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{completedCount}/{totalCount}</div>
                <div className="text-xs text-slate-500">Tasks</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${deadlineStatus.color.split(' ')[0]}`}>{deadlineStatus.label}</div>
                <div className="text-xs text-slate-500">Deadline</div>
              </div>
            </div>

            {/* Adapter Service Statuses */}
            {(product?.isAdapter || hasServiceStatuses) && (
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
                  <Cpu size={16} /> Adapter Service Statuses
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(product?.hasEquipmentSA || editing.equipmentSAStatus !== undefined) && editing.equipmentSAStatus !== null && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Equipment - Service Assurance</label>
                      <select
                        value={editing.equipmentSAStatus || 'not_started'}
                        onChange={(e) => handleServiceStatusChange('equipmentSAStatus', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      >
                        {ADAPTOR_STATUSES.map(s => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {(product?.hasEquipmentSE || editing.equipmentSEStatus !== undefined) && editing.equipmentSEStatus !== null && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Equipment - Service Enablement</label>
                      <select
                        value={editing.equipmentSEStatus || 'not_started'}
                        onChange={(e) => handleServiceStatusChange('equipmentSEStatus', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      >
                        {ADAPTOR_STATUSES.map(s => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {(product?.hasMappingService || editing.mappingStatus !== undefined) && editing.mappingStatus !== null && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Mapping Service</label>
                      <select
                        value={editing.mappingStatus || 'not_started'}
                        onChange={(e) => handleServiceStatusChange('mappingStatus', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      >
                        {ADAPTOR_STATUSES.map(s => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {(product?.hasConstructionService || editing.constructionStatus !== undefined) && editing.constructionStatus !== null && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Construction Service</label>
                      <select
                        value={editing.constructionStatus || 'not_started'}
                        onChange={(e) => handleServiceStatusChange('constructionStatus', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      >
                        {ADAPTOR_STATUSES.map(s => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Release Checklist</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{completedCount} of {totalCount}</span>
                  {completedCount < totalCount && (
                    <button
                      onClick={handleMarkAllComplete}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                      title="Mark all complete"
                    >
                      <CheckCheck size={14} />
                      Complete All
                    </button>
                  )}
                  {completedCount > 0 && (
                    <button
                      onClick={handleResetChecklist}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                      title="Reset checklist"
                    >
                      <RotateCcw size={14} />
                      Reset
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {deploymentChecklist.map(item => (
                  <label key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors group">
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={() => handleChecklistToggle(item)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                    />
                    <span className={`text-sm flex-1 ${item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                      {item.item}
                    </span>
                    {item.isCompleted && <CheckCircle2 size={16} className="text-emerald-500" />}
                  </label>
                ))}
              </div>
            </div>

            {editing.status === 'Blocked' && (
              <BlockedCommentsPanel deployment={editing} onAddComment={handleAddComment} />
            )}

            {/* Release Items */}
            <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <ListTodo size={16} /> Release Items
                </h4>
                {!isEditingReleaseItems && (
                  <button
                    onClick={() => setIsEditingReleaseItems(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                )}
              </div>
              {isEditingReleaseItems ? (
                <div className="space-y-3">
                  <textarea
                    value={localReleaseItems}
                    onChange={(e) => setLocalReleaseItems(e.target.value)}
                    placeholder="List the features, fixes, or changes included in this release..."
                    rows={4}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setLocalReleaseItems(editing.releaseItems || ''); setIsEditingReleaseItems(false); }}
                      className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { handleReleaseItemsChange(localReleaseItems); setIsEditingReleaseItems(false); }}
                      className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {editing.releaseItems || <span className="text-slate-400 italic">No release items specified. Click edit to add.</span>}
                </div>
              )}
            </div>

            {/* Deployment Documentation */}
            {deploymentDocTypes && deploymentDocTypes.length > 0 && (
              <div className="p-4 bg-cyan-50/50 dark:bg-cyan-900/10 rounded-xl border border-cyan-100 dark:border-cyan-900/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
                    <Link size={16} /> Deployment Documentation
                  </h4>
                  {!isEditingDocs && (
                    <button
                      onClick={() => setIsEditingDocs(true)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-cyan-600 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 rounded-md transition-colors"
                    >
                      <Edit2 size={12} />
                      Edit
                    </button>
                  )}
                </div>
                {isEditingDocs ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Select relevant doc types and provide URLs</p>
                    {deploymentDocTypes.map(docType => (
                      <div key={docType.key} className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={localRelevantDocs.includes(docType.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setLocalRelevantDocs([...localRelevantDocs, docType.key]);
                              } else {
                                setLocalRelevantDocs(localRelevantDocs.filter(k => k !== docType.key));
                                setLocalDocumentation(prev => {
                                  const updated = { ...prev };
                                  delete updated[docType.key];
                                  return updated;
                                });
                              }
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500/20"
                          />
                          {docType.label}
                        </label>
                        {localRelevantDocs.includes(docType.key) && (
                          <input
                            type="url"
                            value={localDocumentation[docType.key] || ''}
                            onChange={(e) => setLocalDocumentation(prev => ({
                              ...prev,
                              [docType.key]: e.target.value
                            }))}
                            placeholder={`Enter ${docType.label} URL...`}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all"
                          />
                        )}
                      </div>
                    ))}
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => {
                          setLocalDocumentation(editing.documentation || {});
                          setLocalRelevantDocs(editing.relevantDocs || []);
                          setIsEditingDocs(false);
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { handleDocumentationChange(); setIsEditingDocs(false); }}
                        className="px-3 py-1.5 text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-700 rounded-lg transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(editing.relevantDocs || []).length === 0 ? (
                      <span className="text-sm text-slate-400 italic">No documentation links. Click edit to add.</span>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {deploymentDocTypes.filter(t => (editing.relevantDocs || []).includes(t.key)).map(docType => {
                          const url = editing.documentation?.[docType.key];
                          return (
                            <div key={docType.key} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg text-sm">
                              <FileText size={14} className="text-cyan-500 shrink-0" />
                              <span className="text-slate-700 dark:text-slate-300 truncate">{docType.label}</span>
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-auto text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              ) : (
                                <span className="ml-auto text-xs text-slate-400 italic">No URL</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notes & Activity */}
            <NotesPanel
              notes={editing.notes || []}
              onAddNote={handleAddNote}
              title="Notes & Activity"
              placeholder="Add a note about this deployment..."
              showStatusHistory={true}
              statusHistory={editing.statusHistory || []}
            />

            {product?.documentation && Object.values(product.documentation).some(Boolean) && (
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Product Documentation</h4>
                <div className="grid grid-cols-2 gap-2">
                  {docTypes.map(t => {
                    const url = product.documentation?.[t.key];
                    if (!url) return null;
                    return (
                      <a
                        key={t.key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <FileText size={14} />
                        {t.label}
                        <ExternalLink size={12} className="ml-auto" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between shrink-0">
            <Button variant="danger" onClick={handleDelete} icon={Trash2}>Delete</Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </Card>
      </div>
      {confirmModal && <ConfirmationModal {...confirmModal} />}
    </>
  );
};
