import { useState, useEffect } from 'react';
import { Download, Upload, Package, Rocket, Users, RefreshCw, Loader2, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, FileText, Plus, Trash2, Pencil, X, Save, Link } from 'lucide-react';
import { useToast, useConfig } from '../contexts';
import { useCollection } from '../hooks';
import { formatDate, exportToCSV, calculateChecklistProgress } from '../utils';
import { PRODUCT_EXPORT_COLUMNS, DEPLOYMENT_EXPORT_COLUMNS, CLIENT_EXPORT_COLUMNS } from '../constants';
import { Button, Input, Card, Badge } from '../components/ui/index.jsx';
import { SheetsSync } from '../utils/sheetsSync';

export const SettingsPage = () => {
  const { addToast } = useToast();
  const { docTypes, saveDocTypes, deploymentDocTypes, saveDeploymentDocTypes } = useConfig();
  const { data: products } = useCollection('products');
  const { data: deployments } = useCollection('deployments');
  const { data: clients } = useCollection('clients');
  const { data: checklists } = useCollection('checklists');

  const [sheetUrl, setSheetUrl] = useState('');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Product Documentation types state
  const [editingDocTypes, setEditingDocTypes] = useState([]);
  const [newDocKey, setNewDocKey] = useState('');
  const [newDocLabel, setNewDocLabel] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [docTypeSaving, setDocTypeSaving] = useState(false);

  // Deployment Documentation types state
  const [editingDeploymentDocTypes, setEditingDeploymentDocTypes] = useState([]);
  const [newDeployDocKey, setNewDeployDocKey] = useState('');
  const [newDeployDocLabel, setNewDeployDocLabel] = useState('');
  const [editingDeployId, setEditingDeployId] = useState(null);
  const [editDeployLabel, setEditDeployLabel] = useState('');
  const [deployDocTypeSaving, setDeployDocTypeSaving] = useState(false);

  useEffect(() => {
    setEditingDocTypes(docTypes);
  }, [docTypes]);

  useEffect(() => {
    setEditingDeploymentDocTypes(deploymentDocTypes);
  }, [deploymentDocTypes]);

  useEffect(() => {
    const savedSettings = localStorage.getItem('controlTowerSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setSheetUrl(settings.sheetUrl || '');
      setAppsScriptUrl(settings.appsScriptUrl || '');
      setSyncEnabled(settings.syncEnabled || false);
      setLastSyncTime(settings.lastSyncTime ? new Date(settings.lastSyncTime) : null);
    }
  }, []);

  const handleSaveSettings = () => {
    const settings = {
      sheetUrl,
      appsScriptUrl,
      syncEnabled,
      lastSyncTime: lastSyncTime?.toISOString() || null
    };
    localStorage.setItem('controlTowerSettings', JSON.stringify(settings));
    addToast("Settings saved successfully", "success");
  };

  const handleExportProducts = () => {
    const result = exportToCSV(products, 'products', PRODUCT_EXPORT_COLUMNS);
    if (result.success) {
      addToast(`Exported ${result.count} products to CSV`, "success");
    } else {
      addToast(result.error || "Export failed", "error");
    }
  };

  const handleExportDeployments = () => {
    const enrichedDeployments = deployments.map(d => ({
      ...d,
      clientName: clients.find(c => c.id === d.clientId)?.name || 'Unknown',
      productName: products.find(p => p.id === d.productId)?.name || 'Unknown',
      checklistProgress: calculateChecklistProgress(checklists.filter(c => c.deploymentId === d.id))
    }));
    const result = exportToCSV(enrichedDeployments, 'deployments', DEPLOYMENT_EXPORT_COLUMNS);
    if (result.success) {
      addToast(`Exported ${result.count} deployments to CSV`, "success");
    } else {
      addToast(result.error || "Export failed", "error");
    }
  };

  const handleExportClients = () => {
    const enrichedClients = clients.map(c => ({
      ...c,
      deploymentCount: deployments.filter(d => d.clientId === c.id).length
    }));
    const result = exportToCSV(enrichedClients, 'clients', CLIENT_EXPORT_COLUMNS);
    if (result.success) {
      addToast(`Exported ${result.count} clients to CSV`, "success");
    } else {
      addToast(result.error || "Export failed", "error");
    }
  };

  const handlePushToSheet = async () => {
    if (!appsScriptUrl) {
      addToast("Please configure the Apps Script URL", "error");
      return;
    }

    setSyncStatus('pushing');
    let totalCount = 0;

    const productRows = SheetsSync.productsToRows(products);
    const productResult = await SheetsSync.pushToSheet(appsScriptUrl, 'Products', productRows);
    if (productResult.success) totalCount += productResult.count;

    const deploymentRows = SheetsSync.deploymentsToRows(deployments, clients, products);
    const deploymentResult = await SheetsSync.pushToSheet(appsScriptUrl, 'Deployments', deploymentRows);
    if (deploymentResult.success) totalCount += deploymentResult.count;

    const clientRows = SheetsSync.clientsToRows(clients);
    const clientResult = await SheetsSync.pushToSheet(appsScriptUrl, 'Clients', clientRows);
    if (clientResult.success) totalCount += clientResult.count;

    if (productResult.success && deploymentResult.success && clientResult.success) {
      setSyncStatus('success');
      setLastSyncTime(new Date());
      addToast(`Pushed ${totalCount} records to Google Sheets`, "success");
    } else {
      setSyncStatus('error');
      addToast("Some data failed to sync", "error");
    }
  };

  const handlePullFromSheet = async () => {
    if (!appsScriptUrl) {
      addToast("Please configure the Apps Script URL", "error");
      return;
    }

    setSyncStatus('pulling');

    const productResult = await SheetsSync.pullFromSheet(appsScriptUrl, 'Products');
    const deploymentResult = await SheetsSync.pullFromSheet(appsScriptUrl, 'Deployments');
    const clientResult = await SheetsSync.pullFromSheet(appsScriptUrl, 'Clients');

    if (productResult.success && deploymentResult.success && clientResult.success) {
      const totalRows = (productResult.rows?.length || 0) + (deploymentResult.rows?.length || 0) + (clientResult.rows?.length || 0);
      setSyncStatus('success');
      setLastSyncTime(new Date());
      addToast(`Pulled ${totalRows} records from Google Sheets (preview only - import not implemented)`, "success");
    } else {
      setSyncStatus('error');
      addToast("Failed to pull data from sheets", "error");
    }
  };

  const handleTestConnection = async () => {
    if (!appsScriptUrl) {
      addToast("Please configure the Apps Script URL", "error");
      return;
    }

    setSyncStatus('testing');

    try {
      const result = await SheetsSync.pullFromSheet(appsScriptUrl, 'Products');
      if (result.success) {
        setSyncStatus('success');
        addToast(`Connection successful! Found ${result.rows?.length || 0} products in sheet.`, "success");
      } else {
        setSyncStatus('error');
        addToast(`Connection failed: ${result.error || 'Unknown error'}`, "error");
      }
    } catch (e) {
      setSyncStatus('error');
      addToast(`Connection failed: ${e.message}`, "error");
    }
  };

  // Documentation types handlers
  const handleAddDocType = () => {
    if (!newDocKey.trim() || !newDocLabel.trim()) {
      addToast("Please enter both key and label", "error");
      return;
    }
    // Convert label to camelCase key if key not provided differently
    const key = newDocKey.trim().replace(/\s+/g, '');
    if (editingDocTypes.some(t => t.key === key)) {
      addToast("A documentation type with this key already exists", "error");
      return;
    }
    setEditingDocTypes([...editingDocTypes, { key, label: newDocLabel.trim() }]);
    setNewDocKey('');
    setNewDocLabel('');
  };

  const handleRemoveDocType = (key) => {
    setEditingDocTypes(editingDocTypes.filter(t => t.key !== key));
  };

  const handleStartEdit = (docType) => {
    setEditingId(docType.key);
    setEditLabel(docType.label);
  };

  const handleSaveEdit = () => {
    setEditingDocTypes(editingDocTypes.map(t =>
      t.key === editingId ? { ...t, label: editLabel } : t
    ));
    setEditingId(null);
    setEditLabel('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
  };

  const handleSaveDocTypes = async () => {
    setDocTypeSaving(true);
    try {
      await saveDocTypes(editingDocTypes);
      addToast("Documentation types saved successfully", "success");
    } catch (e) {
      addToast("Failed to save documentation types", "error");
    }
    setDocTypeSaving(false);
  };

  const handleMoveDocType = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= editingDocTypes.length) return;
    const newTypes = [...editingDocTypes];
    [newTypes[index], newTypes[newIndex]] = [newTypes[newIndex], newTypes[index]];
    setEditingDocTypes(newTypes);
  };

  // Deployment Documentation types handlers
  const handleAddDeploymentDocType = () => {
    if (!newDeployDocKey.trim() || !newDeployDocLabel.trim()) {
      addToast("Please enter both key and label", "error");
      return;
    }
    const key = newDeployDocKey.trim().replace(/\s+/g, '');
    if (editingDeploymentDocTypes.some(t => t.key === key)) {
      addToast("A documentation type with this key already exists", "error");
      return;
    }
    setEditingDeploymentDocTypes([...editingDeploymentDocTypes, { key, label: newDeployDocLabel.trim() }]);
    setNewDeployDocKey('');
    setNewDeployDocLabel('');
  };

  const handleRemoveDeploymentDocType = (key) => {
    setEditingDeploymentDocTypes(editingDeploymentDocTypes.filter(t => t.key !== key));
  };

  const handleStartDeploymentEdit = (docType) => {
    setEditingDeployId(docType.key);
    setEditDeployLabel(docType.label);
  };

  const handleSaveDeploymentEdit = () => {
    setEditingDeploymentDocTypes(editingDeploymentDocTypes.map(t =>
      t.key === editingDeployId ? { ...t, label: editDeployLabel } : t
    ));
    setEditingDeployId(null);
    setEditDeployLabel('');
  };

  const handleCancelDeploymentEdit = () => {
    setEditingDeployId(null);
    setEditDeployLabel('');
  };

  const handleSaveDeploymentDocTypes = () => {
    setDeployDocTypeSaving(true);
    try {
      saveDeploymentDocTypes(editingDeploymentDocTypes);
      addToast("Deployment documentation types saved successfully", "success");
    } catch (e) {
      addToast("Failed to save deployment documentation types", "error");
    }
    setDeployDocTypeSaving(false);
  };

  const handleMoveDeploymentDocType = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= editingDeploymentDocTypes.length) return;
    const newTypes = [...editingDeploymentDocTypes];
    [newTypes[index], newTypes[newIndex]] = [newTypes[newIndex], newTypes[index]];
    setEditingDeploymentDocTypes(newTypes);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 mt-1">Configure sync and export options</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Download size={20} /> Export Data
          </h3>
          <p className="text-sm text-slate-500 mb-4">Download your data as CSV files for backup or external analysis.</p>
          <div className="space-y-3">
            <Button variant="secondary" onClick={handleExportProducts} className="w-full justify-start">
              <Package size={16} className="mr-2" /> Export Products ({products.length})
            </Button>
            <Button variant="secondary" onClick={handleExportDeployments} className="w-full justify-start">
              <Rocket size={16} className="mr-2" /> Export Deployments ({deployments.length})
            </Button>
            <Button variant="secondary" onClick={handleExportClients} className="w-full justify-start">
              <Users size={16} className="mr-2" /> Export Clients ({clients.length})
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <RefreshCw size={20} /> Google Sheets Sync
          </h3>
          <div className="space-y-4">
            <Input
              label="Google Sheet URL"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
            <Input
              label="Apps Script Web App URL"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
            />

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveSettings}>Save Settings</Button>
              <Button
                variant="secondary"
                onClick={handleTestConnection}
                disabled={['pushing', 'pulling', 'testing'].includes(syncStatus)}
              >
                {syncStatus === 'testing' ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" /> Testing...</>
                ) : (
                  <>Test Connection</>
                )}
              </Button>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Sync Actions</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={handlePushToSheet}
                  disabled={['pushing', 'pulling', 'testing'].includes(syncStatus)}
                >
                  {syncStatus === 'pushing' ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> Pushing...</>
                  ) : (
                    <><ArrowUp size={16} className="mr-2" /> Push to Sheet</>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePullFromSheet}
                  disabled={['pushing', 'pulling', 'testing'].includes(syncStatus)}
                >
                  {syncStatus === 'pulling' ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> Pulling...</>
                  ) : (
                    <><ArrowDown size={16} className="mr-2" /> Pull from Sheet</>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              {syncStatus === 'success' && (
                <Badge color="emerald" className="flex items-center gap-1">
                  <CheckCircle2 size={12} /> Connected
                </Badge>
              )}
              {syncStatus === 'error' && (
                <Badge color="rose" className="flex items-center gap-1">
                  <AlertCircle size={12} /> Error
                </Badge>
              )}
              {lastSyncTime && (
                <span className="text-xs text-slate-400">
                  Last sync: {formatDate(lastSyncTime)}
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Documentation Types Management */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText size={20} /> Documentation Types
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Manage the documentation types available for products. You can add, edit, remove, or reorder types.
        </p>

        {/* Current doc types list */}
        <div className="space-y-2 mb-4">
          {editingDocTypes.map((docType, index) => (
            <div
              key={docType.key}
              className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg group"
            >
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMoveDocType(index, -1)}
                  disabled={index === 0}
                  className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => handleMoveDocType(index, 1)}
                  disabled={index === editingDocTypes.length - 1}
                  className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowDown size={12} />
                </button>
              </div>

              {editingId === docType.key ? (
                /* Edit mode */
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded"
                  >
                    <Save size={14} />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                /* Display mode */
                <>
                  <div className="flex-1">
                    <span className="font-medium text-slate-900 dark:text-white">{docType.label}</span>
                    <span className="ml-2 text-xs text-slate-400">({docType.key})</span>
                  </div>
                  <button
                    onClick={() => handleStartEdit(docType)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleRemoveDocType(docType.key)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new doc type */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Add New Type</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDocKey}
              onChange={(e) => setNewDocKey(e.target.value)}
              placeholder="Key (e.g., apiDocs)"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
            />
            <input
              type="text"
              value={newDocLabel}
              onChange={(e) => setNewDocLabel(e.target.value)}
              placeholder="Label (e.g., API Documentation)"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
            />
            <Button variant="secondary" onClick={handleAddDocType}>
              <Plus size={16} className="mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Save button */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
          <Button onClick={handleSaveDocTypes} disabled={docTypeSaving}>
            {docTypeSaving ? (
              <><Loader2 size={16} className="mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save size={16} className="mr-2" /> Save Documentation Types</>
            )}
          </Button>
          {JSON.stringify(editingDocTypes) !== JSON.stringify(docTypes) && (
            <span className="ml-3 text-sm text-amber-600">Unsaved changes</span>
          )}
        </div>
      </Card>

      {/* Deployment Documentation Types Management */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Link size={20} /> Deployment Documentation Types
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Manage the documentation types available for deployments. These appear when creating or editing a deployment.
        </p>

        {/* Current deployment doc types list */}
        <div className="space-y-2 mb-4">
          {editingDeploymentDocTypes.map((docType, index) => (
            <div
              key={docType.key}
              className="flex items-center gap-2 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg group"
            >
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMoveDeploymentDocType(index, -1)}
                  disabled={index === 0}
                  className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => handleMoveDeploymentDocType(index, 1)}
                  disabled={index === editingDeploymentDocTypes.length - 1}
                  className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowDown size={12} />
                </button>
              </div>

              {editingDeployId === docType.key ? (
                /* Edit mode */
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editDeployLabel}
                    onChange={(e) => setEditDeployLabel(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveDeploymentEdit}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded"
                  >
                    <Save size={14} />
                  </button>
                  <button
                    onClick={handleCancelDeploymentEdit}
                    className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                /* Display mode */
                <>
                  <div className="flex-1">
                    <span className="font-medium text-slate-900 dark:text-white">{docType.label}</span>
                    <span className="ml-2 text-xs text-slate-400">({docType.key})</span>
                  </div>
                  <button
                    onClick={() => handleStartDeploymentEdit(docType)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleRemoveDeploymentDocType(docType.key)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new deployment doc type */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Add New Type</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDeployDocKey}
              onChange={(e) => setNewDeployDocKey(e.target.value)}
              placeholder="Key (e.g., rollbackPlan)"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
            />
            <input
              type="text"
              value={newDeployDocLabel}
              onChange={(e) => setNewDeployDocLabel(e.target.value)}
              placeholder="Label (e.g., Rollback Plan)"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
            />
            <Button variant="secondary" onClick={handleAddDeploymentDocType}>
              <Plus size={16} className="mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Save button */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
          <Button onClick={handleSaveDeploymentDocTypes} disabled={deployDocTypeSaving}>
            {deployDocTypeSaving ? (
              <><Loader2 size={16} className="mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save size={16} className="mr-2" /> Save Deployment Doc Types</>
            )}
          </Button>
          {JSON.stringify(editingDeploymentDocTypes) !== JSON.stringify(deploymentDocTypes) && (
            <span className="ml-3 text-sm text-amber-600">Unsaved changes</span>
          )}
        </div>
      </Card>
    </div>
  );
};
