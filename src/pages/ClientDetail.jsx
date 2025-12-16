import { useEffect, useMemo } from 'react';
import { ChevronLeft, Rocket, Package, Calendar } from 'lucide-react';
import { useNav } from '../contexts';
import { useCollection } from '../hooks';
import { getDaysDiff, calculateChecklistProgress, getDeadlineStatus } from '../utils';
import { Card, Badge, ProgressBar, EmptyState } from '../components/ui/index.jsx';
import { TimelineStrip } from '../components/features';

export const ClientDetail = ({ clientId }) => {
  const { navigate, addToHistory } = useNav();
  const { data: clients } = useCollection('clients');
  const { data: deploys } = useCollection('deployments');
  const { data: products } = useCollection('products');
  const { data: checklists } = useCollection('checklists');

  const client = clients.find(c => c.id === clientId);
  useEffect(() => { if(client) addToHistory('Client', client.name, client.id, 'client-detail', { clientId: client.id }); }, [client]);

  const dList = deploys.filter(d => d.clientId === clientId);

  const stats = useMemo(() => {
    if (!client || dList.length === 0) {
      return { checklistAvg: 0, docReadiness: 0, onTimeRate: 0, totalProjects: 0 };
    }

    // Calculate checklist average
    let totalCheck = 0;
    dList.forEach(d => {
      const checks = checklists.filter(c => c.deploymentId === d.id);
      totalCheck += calculateChecklistProgress(checks);
    });
    const checklistAvg = Math.round(totalCheck / dList.length);

    // Calculate on-time rate
    const onTimeCount = dList.filter(d => getDaysDiff(d.nextDeliveryDate) >= 0).length;
    const onTimeRate = Math.round((onTimeCount / dList.length) * 100);

    // Calculate doc readiness
    let totalDocs = 0;
    dList.forEach(d => {
      const p = products.find(x => x.id === d.productId);
      const filled = Object.values(p?.documentation || {}).filter(Boolean).length;
      totalDocs += (filled / 5) * 100;
    });
    const docReadiness = Math.round(totalDocs / dList.length);

    return { checklistAvg, docReadiness, onTimeRate, totalProjects: dList.length };
  }, [client, dList, checklists, products]);

  const timelineItems = useMemo(() => {
    if (!client) return [];
    return dList
      .filter(d => d.nextDeliveryDate && d.status !== 'Released')
      .map(d => ({
        id: d.id,
        date: d.nextDeliveryDate,
        clientName: client.name,
        productName: products.find(p => p.id === d.productId)?.name || 'Unknown',
        status: d.status,
        daysLeft: getDaysDiff(d.nextDeliveryDate)
      }))
      .sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [client, dList, products]);

  // Status counts
  const statusCounts = useMemo(() => ({
    notStarted: dList.filter(d => d.status === 'Not Started').length,
    inProgress: dList.filter(d => d.status === 'In Progress').length,
    blocked: dList.filter(d => d.status === 'Blocked').length,
    released: dList.filter(d => d.status === 'Released').length,
  }), [dList]);

  if (!client) return <div className="p-10 text-center text-slate-500">Loading client...</div>;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('clients')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400"/>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{client.name}</h1>
          <p className="text-slate-500 text-sm">{client.comments || 'Client Portfolio Dashboard'}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalProjects}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Total Projects</div>
        </Card>
        <Card className="p-4 text-center">
          <div className={`text-3xl font-bold ${stats.checklistAvg >= 70 ? 'text-emerald-600' : stats.checklistAvg >= 40 ? 'text-amber-600' : 'text-slate-400'}`}>
            {stats.checklistAvg}%
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Checklist Avg</div>
        </Card>
        <Card className="p-4 text-center">
          <div className={`text-3xl font-bold ${stats.docReadiness >= 70 ? 'text-emerald-600' : stats.docReadiness >= 40 ? 'text-amber-600' : 'text-slate-400'}`}>
            {stats.docReadiness}%
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Doc Readiness</div>
        </Card>
        <Card className="p-4 text-center">
          <div className={`text-3xl font-bold ${stats.onTimeRate >= 70 ? 'text-emerald-600' : stats.onTimeRate >= 40 ? 'text-amber-600' : 'text-slate-400'}`}>
            {stats.onTimeRate}%
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">On-Time Rate</div>
        </Card>
      </div>

      {/* Status Breakdown */}
      {dList.length > 0 && (
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

      {/* Timeline */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide mb-4 flex items-center gap-2">
          <Calendar size={16} /> Delivery Timeline
        </h3>
        <TimelineStrip items={timelineItems} onSelect={(item) => navigate('deployments', { filter: { id: item.id } })} />
      </Card>

      {/* Deployments List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Rocket size={20} /> Deployments ({dList.length})
        </h3>

        {dList.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={Package}
              title="No deployments yet"
              description="This client doesn't have any deployments. Create one from the Deployments page."
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dList.map(d => {
              const p = products.find(x => x.id === d.productId);
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
                      <div className="font-semibold text-slate-900 dark:text-white truncate">{p?.name || 'Unknown Product'}</div>
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
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
};
