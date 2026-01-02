import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Trash2, Edit2, Plus, Rocket } from 'lucide-react';
import { useNav, useToast } from '../contexts';
import { useCollection } from '../hooks';
import { addDocument, updateDocument, deleteDocument } from '../utils/api';
import { AVATAR_COLORS } from '../constants';
import { Button, Input, Card, Badge, CustomTooltip, SearchInput, ConfirmationModal, EmptyState } from '../components/ui/index.jsx';

export const Clients = () => {
  const { data: clients } = useCollection('clients');
  const { data: deploys } = useCollection('deployments');
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  // Initialize from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || '');
  const { addToast } = useToast();
  const { navigate, params } = useNav();

  // Sync state to URL params
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (searchQuery) newParams.set('search', searchQuery);
    if (sortBy) newParams.set('sort', sortBy);
    setSearchParams(newParams, { replace: true });
  }, [searchQuery, sortBy, setSearchParams]);

  // Initialize from params if coming from navigation
  useEffect(() => {
    if (params.sort && !sortBy) setSortBy(params.sort);
  }, [params.sort]);

  const sortedClients = useMemo(() => {
    let res = [...clients];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      res = res.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.comments?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'deployments') {
      res = res.sort((a,b) => {
        const countA = deploys.filter(d => d.clientId === a.id).length;
        const countB = deploys.filter(d => d.clientId === b.id).length;
        return countB - countA;
      });
    }
    return res;
  }, [clients, deploys, sortBy, searchQuery]);

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = { name: fd.get('name'), comments: fd.get('comments') };
    try {
      if (editing) await updateDocument('clients', editing.id, data);
      else await addDocument('clients', data);
      addToast("Client saved", "success"); setModalOpen(false); setEditing(null);
    } catch(e) { addToast("Error saving", "error"); }
  };

  const handleDelete = (client) => {
    if (deploys.some(d => d.clientId === client.id)) {
      addToast("Cannot delete client: Remove their deployments first.", "error");
      return;
    }
    setConfirmModal({
      title: `Delete ${client.name}?`,
      message: "This action is permanent and cannot be undone.",
      isDestructive: true,
      onCancel: () => setConfirmModal(null),
      onConfirm: async () => {
        try {
          await deleteDocument('clients', client.id);
          addToast("Client deleted", "success");
        } catch(e) { addToast("Deletion failed", "error"); }
        setConfirmModal(null);
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Client Portfolio</h1>
          <p className="text-slate-500 mt-1">Manage clients and their deployments</p>
          {sortBy && <Badge color="blue">Sorted by Volume</Badge>}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search clients..."
            className="w-full md:w-72"
          />
          <Button onClick={() => { setEditing(null); setModalOpen(true); }} icon={Plus}>Add Client</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {sortedClients.map(c => {
          const clientDeploys = deploys.filter(d => d.clientId === c.id);
          const notStartedCount = clientDeploys.filter(d => d.status === 'Not Started').length;
          const inProgressCount = clientDeploys.filter(d => d.status === 'In Progress').length;
          const blockedCount = clientDeploys.filter(d => d.status === 'Blocked').length;
          const releasedCount = clientDeploys.filter(d => d.status === 'Released').length;

          const colorIndex = c.name?.charCodeAt(0) % AVATAR_COLORS.length || 0;
          const avatarColor = AVATAR_COLORS[colorIndex];

          return (
            <Card key={c.id} className="p-0 overflow-hidden group hover:shadow-lg transition-all duration-300 flex flex-col h-full" onClick={() => navigate('client-detail', { clientId: c.id })}>
              <div className="p-5 flex-1">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${avatarColor} rounded-xl flex items-center justify-center text-white shadow-sm shrink-0`}>
                    <Users size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">{c.name}</h3>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setEditing(c); setModalOpen(true); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Edit2 size={16}/></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(c); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    </div>
                    {c.comments ? (
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">{c.comments}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic mt-2">No notes</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {clientDeploys.length === 0 ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">No projects</span>
                    </div>
                  ) : (
                    <>
                      {notStartedCount > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-slate-400" />
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{notStartedCount} not started</span>
                        </div>
                      )}
                      {inProgressCount > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{inProgressCount} in progress</span>
                        </div>
                      )}
                      {blockedCount > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-rose-500" />
                          <span className="text-sm font-medium text-rose-700 dark:text-rose-300">{blockedCount} blocked</span>
                        </div>
                      )}
                      {releasedCount > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{releasedCount} released</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 mt-auto">
                <div className="flex items-center gap-2">
                  <Rocket size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    <b className="text-slate-900 dark:text-white">{clientDeploys.length}</b> projects
                  </span>
                </div>
              </div>
            </Card>
          )
        })}
        {sortedClients.length === 0 && (
          <EmptyState
            icon={Users}
            title="No clients found"
            description="Try adjusting your search or add a new client"
          />
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <Card className="w-full max-w-md p-4 sm:p-6">
            <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">{editing ? 'Edit Client' : 'New Client'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <Input label="Company Name" name="name" defaultValue={editing?.name} required placeholder="Enter company name" />
              <Input label="Notes" name="comments" defaultValue={editing?.comments} placeholder="Optional notes about this client" />
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
                <Button variant="secondary" onClick={() => setModalOpen(false)} type="button">Cancel</Button>
                <Button type="submit">Save Profile</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {confirmModal && <ConfirmationModal {...confirmModal} />}
    </div>
  );
};
