import { useState, useMemo } from 'react';
import { Rocket, Users, FileText, AlertTriangle, Clock, Package, Calendar, Plus, ArrowRight } from 'lucide-react';
import { useNav } from '../contexts';
import { useCollection } from '../hooks';
import { getDaysDiff, calculateChecklistProgress } from '../utils';
import { Button, Card, SearchInput, Sparkles } from '../components/ui/index.jsx';
import { KPICard, TimelineStrip } from '../components/features';

export const Dashboard = () => {
  const { navigate } = useNav();
  const { data: clients } = useCollection('clients');
  const { data: products } = useCollection('products');
  const { data: deployments } = useCollection('deployments');
  const { data: checklists } = useCollection('checklists');
  const [searchQuery, setSearchQuery] = useState('');

  const metrics = useMemo(() => {
    const active = deployments.filter(d => d.status !== 'Released');

    const releasesMonth = active.filter(d => {
      const diff = getDaysDiff(d.nextDeliveryDate);
      return diff >= 0 && diff <= 30;
    });

    const clientCounts = clients.map(c => ({
      id: c.id,
      count: deployments.filter(d => d.clientId === c.id).length
    })).sort((a,b) => b.count - a.count).slice(0, 5);

    const productsMissingDocs = products.filter(p =>
      !p.documentation || Object.values(p.documentation).some(val => !val || val === "")
    );

    const overdue = active.filter(d => getDaysDiff(d.nextDeliveryDate) < 0);

    const stalled = active.filter(d => {
      if (d.status === 'Released') return false;
      const dChecks = checklists.filter(c => c.deploymentId === d.id);
      const prog = calculateChecklistProgress(dChecks);
      return prog < 30;
    });

    const productsNoDeploys = products.filter(p => !deployments.some(d => d.productId === p.id));

    const forecast = { thisWeek: 0, nextWeek: 0, thisMonth: 0 };
    products.forEach(p => {
      if(!p.nextReleaseDate) return;
      const diff = getDaysDiff(p.nextReleaseDate);
      if(diff >=0 && diff <= 7) forecast.thisWeek++;
      else if(diff > 7 && diff <= 14) forecast.nextWeek++;
      else if(diff > 14 && diff <= 30) forecast.thisMonth++;
    });

    const statusBreakdown = {
      notStarted: deployments.filter(d => d.status === 'Not Started').length,
      inProgress: deployments.filter(d => d.status === 'In Progress').length,
      blocked: deployments.filter(d => d.status === 'Blocked').length,
      released: deployments.filter(d => d.status === 'Released').length
    };

    const activeWithChecklists = active.map(d => {
      const dChecks = checklists.filter(c => c.deploymentId === d.id);
      return calculateChecklistProgress(dChecks);
    });
    const avgChecklistProgress = activeWithChecklists.length > 0
      ? Math.round(activeWithChecklists.reduce((a, b) => a + b, 0) / activeWithChecklists.length)
      : 0;

    const releasedDeployments = deployments.filter(d => d.status === 'Released');
    const onTimeReleases = releasedDeployments.filter(d => {
      if (!d.nextDeliveryDate) return true;
      const targetDate = d.nextDeliveryDate.toDate ? d.nextDeliveryDate.toDate() : new Date(d.nextDeliveryDate);
      const releaseDate = d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date();
      return releaseDate <= targetDate;
    });
    const onTimeRate = releasedDeployments.length > 0
      ? Math.round((onTimeReleases.length / releasedDeployments.length) * 100)
      : 100;

    let timeline = active
      .filter(d => d.nextDeliveryDate)
      .map(d => ({
        id: d.id,
        date: d.nextDeliveryDate,
        clientName: clients.find(c => c.id === d.clientId)?.name || 'Unknown',
        productName: products.find(p => p.id === d.productId)?.name || 'Unknown',
        status: d.status,
        daysLeft: getDaysDiff(d.nextDeliveryDate)
      }))
      .sort((a,b) => new Date(a.date) - new Date(b.date));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      timeline = timeline.filter(t =>
        t.clientName.toLowerCase().includes(q) ||
        t.productName.toLowerCase().includes(q)
      );
    }

    timeline = timeline.slice(0, 10);

    return { releasesMonth, clientCounts, productsMissingDocs, overdue, stalled, productsNoDeploys, timeline, forecast, statusBreakdown, avgChecklistProgress, onTimeRate };
  }, [deployments, clients, products, checklists, searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Command Center</h1>
          <p className="text-slate-500 mt-1">Real-time delivery visibility and insights</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search timeline..."
            className="w-full md:w-72"
          />
          <Button onClick={() => navigate('deployments', { action: 'new' })} icon={Plus}>New Deployment</Button>
        </div>
      </header>

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Calendar size={12}/> Delivery Timeline
        </h3>
        <TimelineStrip items={metrics.timeline} onSelect={(item) => navigate('deployments', { filter: { id: item.id } })} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 flex items-center justify-between hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl"><Sparkles size={28}/></div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Release Forecast</h3>
              <div className="flex gap-6 mt-2 text-sm text-slate-500">
                <span><b className="text-2xl text-slate-800 dark:text-slate-200">{metrics.forecast.thisWeek}</b> <span className="text-slate-400">this week</span></span>
                <span><b className="text-2xl text-slate-800 dark:text-slate-200">{metrics.forecast.nextWeek}</b> <span className="text-slate-400">next week</span></span>
              </div>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate('products', { filter: 'upcoming' })} className="text-sm">View Schedule <ArrowRight size={14}/></Button>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all duration-300">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-5">Deployment Health</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400" title="Not Started" />
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" title="In Progress" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" title="Blocked" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Released" />
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {metrics.statusBreakdown.inProgress + metrics.statusBreakdown.notStarted}
              </div>
              <div className="text-sm text-slate-500 mt-1">Active</div>
              <div className="text-xs text-slate-400 mt-1">
                {metrics.statusBreakdown.blocked > 0 && <span className="text-amber-600 font-medium">{metrics.statusBreakdown.blocked} blocked</span>}
              </div>
            </div>
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-2">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-slate-700" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${metrics.avgChecklistProgress * 0.88} 88`} className="text-blue-500" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-300">{metrics.avgChecklistProgress}%</span>
              </div>
              <div className="text-sm text-slate-500">Avg Progress</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">{metrics.onTimeRate}%</div>
              <div className="text-sm text-slate-500 mt-1">On-Time Rate</div>
              <div className="text-xs text-slate-400 mt-2">{metrics.statusBreakdown.released} released</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
        <KPICard
          label="Releases (30d)" value={metrics.releasesMonth.length} icon={Rocket} color="text-blue-600 bg-blue-100"
          onClick={() => navigate('deployments', { filter: { upcoming: true } })}
        />
        <KPICard
          label="Top Clients" value={metrics.clientCounts.length} subtext="By volume" icon={Users} color="text-emerald-600 bg-emerald-100"
          onClick={() => navigate('clients', { sort: 'deployments' })}
        />
        <KPICard
          label="Docs Missing" value={metrics.productsMissingDocs.length} icon={FileText} color="text-amber-600 bg-amber-100"
          onClick={() => navigate('products', { filter: 'missingDocs' })} urgent={metrics.productsMissingDocs.length > 0}
        />
        <KPICard
          label="Overdue" value={metrics.overdue.length} icon={AlertTriangle} color="text-rose-600 bg-rose-100"
          onClick={() => navigate('deployments', { filter: { overdue: true } })} urgent={metrics.overdue.length > 0}
        />
        <KPICard
          label="Stalled" value={metrics.stalled.length} icon={Clock} color="text-slate-600 bg-slate-100"
          onClick={() => navigate('deployments', { filter: { stalled: true } })}
        />
        <KPICard
          label="Unused Products" value={metrics.productsNoDeploys.length} icon={Package} color="text-purple-600 bg-purple-100"
          onClick={() => navigate('products', { filter: 'noDeploys' })}
        />
      </div>
    </div>
  );
};
