import { useState, useEffect } from 'react';
import { Download, Upload, Package, Rocket, Users, RefreshCw, Loader2, ArrowUp, ArrowDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../contexts';
import { useCollection } from '../hooks';
import { formatDate, exportToCSV, calculateChecklistProgress } from '../utils';
import { PRODUCT_EXPORT_COLUMNS, DEPLOYMENT_EXPORT_COLUMNS, CLIENT_EXPORT_COLUMNS } from '../constants';
import { Button, Input, Card, Badge } from '../components/ui/index.jsx';
import { SheetsSync } from '../utils/sheetsSync';

export const SettingsPage = () => {
  const { addToast } = useToast();
  const { data: products } = useCollection('products');
  const { data: deployments } = useCollection('deployments');
  const { data: clients } = useCollection('clients');
  const { data: checklists } = useCollection('checklists');

  const [sheetUrl, setSheetUrl] = useState('');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSyncTime, setLastSyncTime] = useState(null);

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
    </div>
  );
};
