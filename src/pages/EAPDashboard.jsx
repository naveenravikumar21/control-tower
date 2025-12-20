import { useMemo } from 'react';
import { Sparkles, Package, Users, Calendar, Clock, ExternalLink, ArrowRight } from 'lucide-react';
import { useNav } from '../contexts';
import { useCollection } from '../hooks';
import { formatDate, getDaysDiff, getDeadlineStatus } from '../utils';
import { Card, Badge, EmptyState, ProgressBar } from '../components/ui/index.jsx';
import { KPICard } from '../components/features';

export const EAPDashboard = () => {
  const { navigate } = useNav();
  const { data: products } = useCollection('products');
  const { data: clients } = useCollection('clients');
  const { data: deploys } = useCollection('deployments');

  // Get all EAP products
  const eapProducts = useMemo(() =>
    products.filter(p => p.eap?.isActive), [products]);

  // Get all EAP clients (unique)
  const eapClientIds = useMemo(() => {
    const ids = new Set();
    eapProducts.forEach(p => {
      (p.eap?.clientIds || []).forEach(id => ids.add(id));
    });
    return [...ids];
  }, [eapProducts]);

  const eapClients = useMemo(() =>
    clients.filter(c => eapClientIds.includes(c.id)), [clients, eapClientIds]);

  // Get EAP deployments (deployments for EAP products with type 'eap')
  const eapDeploys = useMemo(() =>
    deploys.filter(d => d.deploymentType === 'eap'), [deploys]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const active = eapProducts.filter(p => {
      const start = p.eap?.startDate ? new Date(p.eap.startDate) : null;
      const end = p.eap?.endDate ? new Date(p.eap.endDate) : null;
      if (start && start > now) return false;
      if (end && end < now) return false;
      return true;
    });

    const endingSoon = eapProducts.filter(p => {
      if (!p.eap?.endDate) return false;
      const days = getDaysDiff(p.eap.endDate);
      return days >= 0 && days <= 30;
    });

    const expiredCount = eapProducts.filter(p => {
      if (!p.eap?.endDate) return false;
      return getDaysDiff(p.eap.endDate) < 0;
    }).length;

    return {
      total: eapProducts.length,
      active: active.length,
      endingSoon: endingSoon.length,
      expired: expiredCount,
      totalClients: eapClients.length,
      totalDeploys: eapDeploys.length
    };
  }, [eapProducts, eapClients, eapDeploys]);

  // Products sorted by end date (soonest first)
  const sortedEapProducts = useMemo(() =>
    [...eapProducts].sort((a, b) => {
      const aEnd = a.eap?.endDate ? new Date(a.eap.endDate) : new Date('9999-12-31');
      const bEnd = b.eap?.endDate ? new Date(b.eap.endDate) : new Date('9999-12-31');
      return aEnd - bEnd;
    }), [eapProducts]);

  const getEapStatusBadge = (product) => {
    if (!product.eap?.endDate) {
      return <Badge color="slate" size="sm">No End Date</Badge>;
    }
    const days = getDaysDiff(product.eap.endDate);
    if (days < 0) {
      return <Badge color="rose" size="sm">Expired</Badge>;
    }
    if (days <= 7) {
      return <Badge color="rose" size="sm">Ending in {days}d</Badge>;
    }
    if (days <= 30) {
      return <Badge color="amber" size="sm">Ending in {days}d</Badge>;
    }
    return <Badge color="emerald" size="sm">Active</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Sparkles className="text-purple-500" size={32} />
            EAP Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Track EAP products and clients</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          label="Total EAPs"
          value={stats.total}
          icon={Sparkles}
          color="text-purple-600 bg-purple-100"
        />
        <KPICard
          label="Active"
          value={stats.active}
          icon={Package}
          color="text-emerald-600 bg-emerald-100"
        />
        <KPICard
          label="Ending Soon"
          value={stats.endingSoon}
          icon={Clock}
          color="text-amber-600 bg-amber-100"
          urgent={stats.endingSoon > 0}
        />
        <KPICard
          label="Expired"
          value={stats.expired}
          icon={Calendar}
          color="text-rose-600 bg-rose-100"
        />
        <KPICard
          label="EAP Clients"
          value={stats.totalClients}
          icon={Users}
          color="text-blue-600 bg-blue-100"
        />
        <KPICard
          label="EAP Deploys"
          value={stats.totalDeploys}
          icon={Package}
          color="text-indigo-600 bg-indigo-100"
        />
      </div>

      {/* EAP Products Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">EAP Products</h2>

        {sortedEapProducts.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={Sparkles}
              title="No EAP Products"
              description="Enable EAP on products to track them here"
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedEapProducts.map(product => {
              const clientCount = product.eap?.clientIds?.length || 0;
              const productDeploys = deploys.filter(d => d.productId === product.id && d.deploymentType === 'eap');
              const daysUntilEnd = product.eap?.endDate ? getDaysDiff(product.eap.endDate) : null;

              // Calculate progress through EAP period
              let progress = 0;
              if (product.eap?.startDate && product.eap?.endDate) {
                const start = new Date(product.eap.startDate);
                const end = new Date(product.eap.endDate);
                const now = new Date();
                const total = end - start;
                const elapsed = now - start;
                progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
              }

              return (
                <Card
                  key={product.id}
                  className="p-0 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => navigate('product-detail', { productId: product.id })}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                          <Sparkles size={20} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-xs text-slate-500">{product.productOwner || 'No owner'}</p>
                        </div>
                      </div>
                      {getEapStatusBadge(product)}
                    </div>

                    {/* Timeline */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{product.eap?.startDate ? formatDate(product.eap.startDate) : 'No start'}</span>
                        <span>{product.eap?.endDate ? formatDate(product.eap.endDate) : 'No end'}</span>
                      </div>
                      <ProgressBar
                        value={progress}
                        color={daysUntilEnd !== null && daysUntilEnd < 0 ? 'bg-rose-500' : daysUntilEnd !== null && daysUntilEnd <= 30 ? 'bg-amber-500' : 'bg-purple-500'}
                      />
                    </div>

                    {/* Jira Link */}
                    {product.eap?.jiraBoardUrl && (
                      <a
                        href={product.eap.jiraBoardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 hover:underline mb-3"
                      >
                        <ExternalLink size={12} />
                        Jira Board
                      </a>
                    )}
                  </div>

                  {/* Footer Stats */}
                  <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                        <Users size={14} className="text-slate-400" />
                        <span className="font-medium text-slate-900 dark:text-white">{clientCount}</span>
                        <span>clients</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                        <Package size={14} className="text-slate-400" />
                        <span className="font-medium text-slate-900 dark:text-white">{productDeploys.length}</span>
                        <span>deploys</span>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-purple-500 transition-colors" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* EAP Clients Section */}
      {eapClients.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">EAP Clients ({eapClients.length})</h2>
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              {eapClients.map(client => {
                // Find which EAP products this client is enrolled in
                const enrolledProducts = eapProducts.filter(p =>
                  p.eap?.clientIds?.includes(client.id)
                );

                return (
                  <div
                    key={client.id}
                    className="group inline-flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer transition-colors"
                    onClick={() => navigate('client-detail', { clientId: client.id })}
                  >
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                      {client.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {client.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {enrolledProducts.length} EAP{enrolledProducts.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* EAP Deployments Section */}
      {eapDeploys.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">EAP Deployments ({eapDeploys.length})</h2>
            <button
              onClick={() => navigate('deployments')}
              className="text-sm text-blue-600 hover:underline"
            >
              View All Deployments
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eapDeploys.slice(0, 6).map(deploy => {
              const product = products.find(p => p.id === deploy.productId);
              const client = clients.find(c => c.id === deploy.clientId);
              const deadlineStatus = getDeadlineStatus(deploy.nextDeliveryDate, deploy.status);

              return (
                <Card
                  key={deploy.id}
                  className="p-4 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate('deployments', { filter: { id: deploy.id } })}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <Sparkles size={18} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 dark:text-white truncate">
                        {product?.name || 'Unknown Product'}
                      </div>
                      <div className="text-sm text-slate-500">
                        {client?.name || 'No Client'}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          color={deploy.status === 'Released' ? 'emerald' : deploy.status === 'Blocked' ? 'rose' : deploy.status === 'In Progress' ? 'blue' : 'slate'}
                          size="sm"
                        >
                          {deploy.status}
                        </Badge>
                        <span className={`text-xs ${deadlineStatus.color.split(' ')[0]}`}>
                          {deadlineStatus.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
