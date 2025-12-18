import { useState, useMemo } from 'react';
import { Grid3X3, Server, Package, Plus, Edit2, X, Check, Download, Search, Filter } from 'lucide-react';
import { useToast } from '../contexts';
import { useCollection } from '../hooks';
import { db, appId, serverTimestamp, doc, addDoc, updateDoc, deleteDoc, collection } from '../utils/firebase';
import { Button, Input, Card, Badge, SearchInput, EmptyState } from '../components/ui/index.jsx';

export const CompatibilityMatrix = () => {
  const { data: products } = useCollection('products');
  const { data: services } = useCollection('microservices');
  const { data: productServices } = useCollection('productServiceVersions');
  const { addToast } = useToast();

  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { productId, serviceId, existing }
  const [versionInput, setVersionInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyWithServices, setShowOnlyWithServices] = useState(false);

  // Get parent products only (no sub-projects in matrix)
  const parentProducts = useMemo(() =>
    products.filter(p => !p.parentId).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [products]
  );

  // Get active services
  const activeServices = useMemo(() =>
    services.filter(s => s.status !== 'archived').sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [services]
  );

  // Build matrix data: productId -> serviceId -> version info
  const matrixData = useMemo(() => {
    const matrix = {};
    productServices.forEach(ps => {
      if (!matrix[ps.productId]) matrix[ps.productId] = {};
      matrix[ps.productId][ps.serviceId] = {
        id: ps.id,
        version: ps.version,
        notes: ps.notes,
        updatedAt: ps.updatedAt
      };
    });
    return matrix;
  }, [productServices]);

  // Filter products based on search and filter
  const filteredProducts = useMemo(() => {
    let result = [...parentProducts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(q));
    }

    if (showOnlyWithServices) {
      result = result.filter(p => matrixData[p.id] && Object.keys(matrixData[p.id]).length > 0);
    }

    return result;
  }, [parentProducts, searchQuery, showOnlyWithServices, matrixData]);

  // Get cell value
  const getCellValue = (productId, serviceId) => {
    return matrixData[productId]?.[serviceId] || null;
  };

  // Open edit modal for a cell
  const openEditCell = (productId, serviceId) => {
    const existing = getCellValue(productId, serviceId);
    setEditingCell({ productId, serviceId, existing });
    setVersionInput(existing?.version || '');
    setNotesInput(existing?.notes || '');
    setEditModalOpen(true);
  };

  // Save cell value
  const handleSaveCell = async () => {
    if (!editingCell) return;

    const { productId, serviceId, existing } = editingCell;

    try {
      if (existing?.id) {
        if (versionInput.trim()) {
          // Update existing
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'productServiceVersions', existing.id), {
            version: versionInput.trim(),
            notes: notesInput.trim(),
            updatedAt: serverTimestamp()
          });
          addToast("Version updated", "success");
        } else {
          // Delete if version is empty
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'productServiceVersions', existing.id));
          addToast("Version removed", "success");
        }
      } else if (versionInput.trim()) {
        // Create new
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'productServiceVersions'), {
          productId,
          serviceId,
          version: versionInput.trim(),
          notes: notesInput.trim(),
          createdAt: serverTimestamp()
        });
        addToast("Version added", "success");
      }

      setEditModalOpen(false);
      setEditingCell(null);
      setVersionInput('');
      setNotesInput('');
    } catch (e) {
      addToast("Error saving version", "error");
    }
  };

  // Export matrix to CSV
  const exportToCSV = () => {
    const headers = ['Product', ...activeServices.map(s => s.name)];
    const rows = filteredProducts.map(p => {
      const row = [p.name];
      activeServices.forEach(s => {
        const cell = getCellValue(p.id, s.id);
        row.push(cell?.version || '-');
      });
      return row;
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compatibility-matrix-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Matrix exported to CSV", "success");
  };

  // Count products using each service
  const getServiceUsageCount = (serviceId) => {
    return Object.values(matrixData).filter(m => m[serviceId]).length;
  };

  // Count services for each product
  const getProductServiceCount = (productId) => {
    return Object.keys(matrixData[productId] || {}).length;
  };

  if (activeServices.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Compatibility Matrix</h1>
          <p className="text-slate-500 mt-1">Service version requirements by product</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Server}
            title="No services defined"
            description="Add microservices first to build the compatibility matrix"
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Compatibility Matrix</h1>
          <p className="text-slate-500 mt-1">Service version requirements by product</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search products..."
            className="w-full md:w-64"
          />
          <button
            onClick={() => setShowOnlyWithServices(!showOnlyWithServices)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
              showOnlyWithServices
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Filter size={16} />
            {showOnlyWithServices ? 'Showing configured' : 'Show all'}
          </button>
          <Button variant="secondary" onClick={exportToCSV} icon={Download}>Export CSV</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-slate-900 dark:text-white">{parentProducts.length}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Products</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-cyan-600">{activeServices.length}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Services</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-emerald-600">{productServices.length}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Configured</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">
            {Math.round((productServices.length / (parentProducts.length * activeServices.length || 1)) * 100)}%
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Coverage</div>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800" />
            <span>Up to date</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" />
            <span>Outdated version</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
            <span>Not configured</span>
          </div>
        </div>
        <div className="text-slate-400 italic">
          Tip: Click any cell to set or edit the version
        </div>
      </div>

      {/* Matrix Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide border-b border-r border-slate-200 dark:border-slate-700 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <Package size={14} />
                    Product
                  </div>
                </th>
                {activeServices.map(service => (
                  <th
                    key={service.id}
                    className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200 dark:border-slate-700 min-w-[120px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Server size={14} className="text-cyan-500" />
                      <span className="truncate max-w-[100px]" title={service.name}>{service.name}</span>
                      <span className="text-[10px] font-normal text-slate-400">
                        v{service.currentVersion || '?'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, rowIndex) => {
                const serviceCount = getProductServiceCount(product.id);
                return (
                  <tr
                    key={product.id}
                    className={`${rowIndex % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-900/30'} hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors`}
                  >
                    <td className="sticky left-0 z-10 px-4 py-3 border-b border-r border-slate-200 dark:border-slate-700 bg-inherit">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">{product.name}</div>
                          <div className="text-xs text-slate-500">
                            {serviceCount} service{serviceCount !== 1 ? 's' : ''} configured
                          </div>
                        </div>
                      </div>
                    </td>
                    {activeServices.map(service => {
                      const cellValue = getCellValue(product.id, service.id);
                      const isConfigured = !!cellValue?.version;
                      const isOutdated = isConfigured && service.currentVersion && cellValue.version !== service.currentVersion;

                      return (
                        <td
                          key={service.id}
                          onClick={() => openEditCell(product.id, service.id)}
                          className={`px-3 py-3 text-center border-b border-slate-200 dark:border-slate-700 cursor-pointer transition-all hover:bg-blue-100 dark:hover:bg-blue-900/30 ${
                            isConfigured
                              ? isOutdated
                                ? 'bg-amber-50 dark:bg-amber-900/20'
                                : 'bg-emerald-50/50 dark:bg-emerald-900/10'
                              : ''
                          }`}
                          title={cellValue?.notes || 'Click to set version'}
                        >
                          {isConfigured ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-sm font-mono font-semibold ${
                                isOutdated
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-emerald-700 dark:text-emerald-400'
                              }`}>
                                v{cellValue.version}
                              </span>
                              {isOutdated && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                  (latest: {service.currentVersion})
                                </span>
                              )}
                              {cellValue.notes && (
                                <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                                  {cellValue.notes}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 text-lg">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={activeServices.length + 1} className="px-4 py-8 text-center text-slate-500">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>

            {/* Footer with service usage counts */}
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-900/70">
                <td className="sticky left-0 z-10 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide border-t border-r border-slate-200 dark:border-slate-700">
                  Usage Count
                </td>
                {activeServices.map(service => (
                  <td
                    key={service.id}
                    className="px-3 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700"
                  >
                    {getServiceUsageCount(service.id)} products
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Edit Cell Modal */}
      {isEditModalOpen && editingCell && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <Card className="w-full max-w-md p-4 sm:p-6">
            <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
              <Edit2 size={18} />
              Set Service Version
            </h2>

            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Product:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {products.find(p => p.id === editingCell.productId)?.name}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-500">Service:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {services.find(s => s.id === editingCell.serviceId)?.name}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-500">Latest Version:</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400">
                  v{services.find(s => s.id === editingCell.serviceId)?.currentVersion || '?'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Required Version"
                value={versionInput}
                onChange={(e) => setVersionInput(e.target.value)}
                placeholder="e.g., 2.1.0 (leave empty to remove)"
              />

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="e.g., Minimum required for feature X"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button variant="secondary" onClick={() => { setEditModalOpen(false); setEditingCell(null); }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCell}>
                  {editingCell.existing?.id ? (versionInput.trim() ? 'Update' : 'Remove') : 'Save'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
