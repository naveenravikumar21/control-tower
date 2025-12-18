import { useState, useMemo } from 'react';
import { Server, Plus, Edit2, Trash2, X, Tag, GitBranch, ExternalLink, Copy } from 'lucide-react';
import { useToast } from '../contexts';
import { useCollection } from '../hooks';
import { db, appId, serverTimestamp, doc, addDoc, updateDoc, deleteDoc, collection } from '../utils/firebase';
import { formatDate, toInputDate } from '../utils';
import { Button, Input, Card, Badge, SearchInput, ConfirmationModal, EmptyState } from '../components/ui/index.jsx';

// Service status options
const SERVICE_STATUSES = [
  { key: 'active', label: 'Active', color: 'emerald' },
  { key: 'deprecated', label: 'Deprecated', color: 'amber' },
  { key: 'beta', label: 'Beta', color: 'blue' },
  { key: 'archived', label: 'Archived', color: 'slate' }
];

export const Microservices = () => {
  const { data: services } = useCollection('microservices');
  const { data: productServices } = useCollection('productServiceVersions');
  const { addToast } = useToast();

  const [isModalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currentVersion: '',
    repository: '',
    documentation: '',
    status: 'active'
  });

  // Filter and sort services
  const filteredServices = useMemo(() => {
    let result = [...services];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.currentVersion?.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [services, searchQuery]);

  // Open modal for new service
  const openNewModal = () => {
    setEditing(null);
    setFormData({
      name: '',
      description: '',
      currentVersion: '',
      repository: '',
      documentation: '',
      status: 'active'
    });
    setModalOpen(true);
  };

  // Open modal for editing
  const openEditModal = (service) => {
    setEditing(service);
    setFormData({
      name: service.name || '',
      description: service.description || '',
      currentVersion: service.currentVersion || '',
      repository: service.repository || '',
      documentation: service.documentation || '',
      status: service.status || 'active'
    });
    setModalOpen(true);
  };

  // Save service
  const handleSave = async () => {
    if (!formData.name.trim()) {
      addToast("Please enter a service name", "error");
      return;
    }

    try {
      if (editing) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'microservices', editing.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        addToast("Service updated", "success");
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'microservices'), {
          ...formData,
          createdAt: serverTimestamp()
        });
        addToast("Service created", "success");
      }
      setModalOpen(false);
      setEditing(null);
    } catch (e) {
      addToast("Error saving service", "error");
    }
  };

  // Delete service
  const handleDelete = (service) => {
    // Check if service is used in any product
    const usageCount = productServices.filter(ps => ps.serviceId === service.id).length;

    if (usageCount > 0) {
      addToast(`Cannot delete: Service is used in ${usageCount} product(s)`, "error");
      return;
    }

    setConfirmModal({
      title: `Delete ${service.name}?`,
      message: "This action is permanent and cannot be undone.",
      isDestructive: true,
      onCancel: () => setConfirmModal(null),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'microservices', service.id));
          addToast("Service deleted", "success");
        } catch (e) {
          addToast("Deletion failed", "error");
        }
        setConfirmModal(null);
      }
    });
  };

  // Get usage count for a service
  const getUsageCount = (serviceId) => {
    return productServices.filter(ps => ps.serviceId === serviceId).length;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Microservices</h1>
          <p className="text-slate-500 mt-1">Manage services and their versions</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search services..."
            className="w-full md:w-64"
          />
          <Button onClick={openNewModal} icon={Plus}>Add Service</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-slate-900 dark:text-white">{services.length}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Total Services</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-emerald-600">{services.filter(s => s.status === 'active').length}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Active</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{services.filter(s => s.status === 'beta').length}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Beta</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-amber-600">{services.filter(s => s.status === 'deprecated').length}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Deprecated</div>
        </Card>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredServices.map(service => {
          const statusConfig = SERVICE_STATUSES.find(s => s.key === service.status) || SERVICE_STATUSES[0];
          const usageCount = getUsageCount(service.id);

          return (
            <Card key={service.id} className="p-0 overflow-hidden group hover:shadow-lg transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                      <Server size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{service.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge color={statusConfig.color} size="sm">{statusConfig.label}</Badge>
                        {service.currentVersion && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Tag size={10} /> v{service.currentVersion}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(service)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(service)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {service.description && (
                  <p className="mt-3 text-sm text-slate-500 line-clamp-2">{service.description}</p>
                )}

                <div className="mt-4 flex items-center gap-4">
                  {service.repository && (
                    <a
                      href={service.repository}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <GitBranch size={12} /> Repository
                    </a>
                  )}
                  {service.documentation && (
                    <a
                      href={service.documentation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ExternalLink size={12} /> Docs
                    </a>
                  )}
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Used in <b className="text-slate-700 dark:text-slate-300">{usageCount}</b> product{usageCount !== 1 ? 's' : ''}
                </span>
                {service.updatedAt && (
                  <span className="text-xs text-slate-400">
                    Updated {formatDate(service.updatedAt?.toDate?.() || service.updatedAt)}
                  </span>
                )}
              </div>
            </Card>
          );
        })}

        {filteredServices.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={Server}
              title="No services found"
              description="Add your first microservice to track versions"
            />
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">
              {editing ? 'Edit Service' : 'New Service'}
            </h2>
            <div className="space-y-4">
              <Input
                label="Service Name *"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., auth-service, payment-gateway"
              />

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the service..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Current Version"
                  value={formData.currentVersion}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentVersion: e.target.value }))}
                  placeholder="e.g., 2.1.0"
                />
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white"
                  >
                    {SERVICE_STATUSES.map(status => (
                      <option key={status.key} value={status.key}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Repository URL"
                value={formData.repository}
                onChange={(e) => setFormData(prev => ({ ...prev, repository: e.target.value }))}
                placeholder="https://github.com/..."
              />

              <Input
                label="Documentation URL"
                value={formData.documentation}
                onChange={(e) => setFormData(prev => ({ ...prev, documentation: e.target.value }))}
                placeholder="https://docs.example.com/..."
              />

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>{editing ? 'Update' : 'Create'} Service</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {confirmModal && <ConfirmationModal {...confirmModal} />}
    </div>
  );
};
