import { useState } from 'react';
import { X, Clock, CheckCircle2, FileText, ExternalLink, Trash2, CheckCheck, RotateCcw } from 'lucide-react';
import { useToast } from '../contexts';
import { useCollection } from '../hooks';
import { db, appId, serverTimestamp, doc, updateDoc, deleteDoc } from '../utils/firebase';
import { toInputDate, getDeadlineStatus } from '../utils';
import { DOC_TYPES } from '../constants';
import { Button, Card, Badge, ConfirmationModal } from '../components/ui/index.jsx';
import { BlockedCommentsPanel, NotesPanel } from '../components/features';

export const DeploymentModal = ({ editing, setEditing, onClose }) => {
  const { data: products } = useCollection('products');
  const { data: checklists } = useCollection('checklists');
  const { addToast } = useToast();
  const [confirmModal, setConfirmModal] = useState(null);

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

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'deployments', editing.id), {
        status: newStatus,
        statusHistory,
        updatedAt: serverTimestamp()
      });
      setEditing({ ...editing, status: newStatus, statusHistory });
      addToast(`Status updated to ${newStatus}`, "success");
    } catch(e) { addToast("Failed to update status", "error"); }
  };

  const handleChecklistToggle = async (item) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'checklists', item.id), {
        isCompleted: !item.isCompleted
      });
    } catch(e) { addToast("Failed to update checklist", "error"); }
  };

  const handleMarkAllComplete = async () => {
    try {
      const incomplete = deploymentChecklist.filter(c => !c.isCompleted);
      await Promise.all(incomplete.map(item =>
        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'checklists', item.id), {
          isCompleted: true
        })
      ));
      addToast(`Marked ${incomplete.length} items complete`, "success");
    } catch(e) { addToast("Failed to update checklist", "error"); }
  };

  const handleResetChecklist = async () => {
    try {
      const completed = deploymentChecklist.filter(c => c.isCompleted);
      await Promise.all(completed.map(item =>
        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'checklists', item.id), {
          isCompleted: false
        })
      ));
      addToast(`Reset ${completed.length} items`, "success");
    } catch(e) { addToast("Failed to reset checklist", "error"); }
  };

  const handleDateChange = async (e) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'deployments', editing.id), {
        nextDeliveryDate: e.target.value,
        updatedAt: serverTimestamp()
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
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'deployments', editing.id));
          for (const item of deploymentChecklist) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'checklists', item.id));
          }
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
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'deployments', editing.id), {
        blockedComments: comments,
        updatedAt: serverTimestamp()
      });
      setEditing({ ...editing, blockedComments: comments });
      addToast("Comment added", "success");
    } catch(e) { addToast("Failed to add comment", "error"); }
  };

  const handleAddNote = async (note) => {
    try {
      const notes = [...(editing.notes || []), note];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'deployments', editing.id), {
        notes,
        updatedAt: serverTimestamp()
      });
      setEditing({ ...editing, notes });
      addToast("Note added", "success");
    } catch(e) { addToast("Failed to add note", "error"); }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editing.client?.name || (editing.deploymentType === 'ga' ? 'General Availability' : editing.deploymentType === 'eap' ? 'Early Access Program' : 'Generic')}
                </h2>
                {editing.deploymentType === 'ga' && (
                  <Badge color="blue" size="sm">GA</Badge>
                )}
                {editing.deploymentType === 'eap' && (
                  <Badge color="purple" size="sm">EAP</Badge>
                )}
                {editing.deploymentType === 'generic' && (
                  <Badge color="slate" size="sm">Generic</Badge>
                )}
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
                  {DOC_TYPES.map(t => {
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
