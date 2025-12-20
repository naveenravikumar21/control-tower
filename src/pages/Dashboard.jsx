import { useState, useMemo } from 'react';
import { Rocket, Users, FileText, AlertTriangle, Clock, Package, Calendar, Plus, ArrowRight, Sparkles } from 'lucide-react';
import { useNav, useConfig } from '../contexts';
import { useCollection } from '../hooks';
import { getDaysDiff, calculateChecklistProgress, formatDate } from '../utils';
import { Button, Card, SearchInput } from '../components/ui/index.jsx';
import { KPICard, TimelineStrip, GanttChart } from '../components/features';

export const Dashboard = () => {
  const { navigate } = useNav();
  const { docTypes } = useConfig();
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

    const productsMissingDocs = products.filter(p => {
      // Only check relevant docs for missing status
      const relevantTypes = docTypes.filter(t => p.relevantDocs?.[t.key] !== false);
      // If no docs are relevant, the product is not missing any
      if (relevantTypes.length === 0) return false;
      return relevantTypes.some(t => !p.documentation?.[t.key] || p.documentation[t.key] === "");
    });

    const overdue = active.filter(d => getDaysDiff(d.nextDeliveryDate) < 0);

    const stalled = active.filter(d => {
      if (d.status === 'Released') return false;
      const dChecks = checklists.filter(c => c.deploymentId === d.id);
      const prog = calculateChecklistProgress(dChecks);
      return prog < 30;
    });

    const productsNoDeploys = products.filter(p => !deployments.some(d => d.productId === p.id));

    // EAP products count
    const eapProducts = products.filter(p => p.eap?.isActive);

    // Get parent products and sub-projects grouped
    const parentProds = products.filter(p => !p.parentId);
    const subProjectsByParent = {};
    products.forEach(p => {
      if (p.parentId) {
        if (!subProjectsByParent[p.parentId]) subProjectsByParent[p.parentId] = [];
        subProjectsByParent[p.parentId].push(p);
      }
    });

    // Count releases and collect product details
    const forecast = { thisWeek: [], nextWeek: [], thisMonth: [] };
    parentProds.forEach(p => {
      // Check parent product release date
      let earliestDiff = Infinity;
      let earliestSource = null;
      let earliestDate = null;
      if (p.nextReleaseDate) {
        earliestDiff = getDaysDiff(p.nextReleaseDate);
        earliestSource = p.name;
        earliestDate = p.nextReleaseDate;
      }
      // Check all sub-projects for earliest release
      const subs = subProjectsByParent[p.id] || [];
      subs.forEach(sp => {
        if (sp.nextReleaseDate) {
          const spDiff = getDaysDiff(sp.nextReleaseDate);
          if (spDiff >= 0 && spDiff < earliestDiff) {
            earliestDiff = spDiff;
            earliestSource = sp.name;
            earliestDate = sp.nextReleaseDate;
          }
        }
      });
      // Collect product info based on earliest release
      if (earliestDiff >= 0 && earliestDiff <= 30) {
        const item = {
          id: p.id,
          name: p.name,
          subProject: earliestSource !== p.name ? earliestSource : null,
          days: earliestDiff,
          date: earliestDate
        };
        if (earliestDiff <= 7) forecast.thisWeek.push(item);
        else if (earliestDiff <= 14) forecast.nextWeek.push(item);
        else forecast.thisMonth.push(item);
      }
    });
    // Sort each by days
    forecast.thisWeek.sort((a, b) => a.days - b.days);
    forecast.nextWeek.sort((a, b) => a.days - b.days);
    forecast.thisMonth.sort((a, b) => a.days - b.days);

    // Get deployment details by status with product/client names
    const getDeploymentDetails = (d) => {
      const product = products.find(p => p.id === d.productId);
      const client = clients.find(c => c.id === d.clientId);
      let clientName = client?.name;
      if (!clientName) {
        if (d.deploymentType === 'ga') clientName = 'GA';
        else if (d.deploymentType === 'generic') clientName = 'Generic';
        else clientName = 'GA';
      }
      const dChecks = checklists.filter(c => c.deploymentId === d.id);
      const progress = calculateChecklistProgress(dChecks);
      return {
        id: d.id,
        productName: product?.name || 'Unknown',
        clientName,
        status: d.status,
        daysLeft: getDaysDiff(d.nextDeliveryDate),
        progress
      };
    };

    const statusBreakdown = {
      notStarted: deployments.filter(d => d.status === 'Not Started').map(getDeploymentDetails),
      inProgress: deployments.filter(d => d.status === 'In Progress').map(getDeploymentDetails),
      blocked: deployments.filter(d => d.status === 'Blocked').map(getDeploymentDetails),
      released: deployments.filter(d => d.status === 'Released').map(getDeploymentDetails)
    };
    // Sort in-progress by days left (urgent first)
    statusBreakdown.inProgress.sort((a, b) => a.daysLeft - b.daysLeft);

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
      .map(d => {
        const client = clients.find(c => c.id === d.clientId);
        const product = products.find(p => p.id === d.productId);
        const productName = product?.name || 'Unknown';

        // Show "Type - ProductName" for non-client-specific deployments
        let clientName = client?.name;
        if (!clientName) {
          const typeLabel = d.deploymentType === 'ga' ? 'GA'
            : d.deploymentType === 'eap' ? 'EAP'
            : d.deploymentType === 'feature-release' ? (d.featureName || 'Feature')
            : 'Release';
          clientName = `${typeLabel} - ${productName}`;
        }
        return {
          id: d.id,
          date: d.nextDeliveryDate,
          clientName,
          productName,
          status: d.status,
          deploymentType: d.deploymentType,
          daysLeft: getDaysDiff(d.nextDeliveryDate)
        };
      })
      .sort((a,b) => new Date(a.date) - new Date(b.date));

    // Filter to next 30 days only
    timeline = timeline.filter(t => t.daysLeft >= 0 && t.daysLeft <= 30);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      timeline = timeline.filter(t =>
        t.clientName.toLowerCase().includes(q) ||
        t.productName.toLowerCase().includes(q)
      );
    }

    return { releasesMonth, clientCounts, productsMissingDocs, overdue, stalled, productsNoDeploys, eapProducts, timeline, forecast, statusBreakdown, avgChecklistProgress, onTimeRate };
  }, [deployments, clients, products, checklists, searchQuery, docTypes]);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
        <Card className="p-6 hover:shadow-lg transition-all duration-300 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl"><Sparkles size={22}/></div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Release Forecast</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('products', { filter: 'upcoming' })} className="text-xs">View All <ArrowRight size={12}/></Button>
          </div>

          {metrics.forecast.thisWeek.length === 0 && metrics.forecast.nextWeek.length === 0 && metrics.forecast.thisMonth.length === 0 ? (
            <div className="text-center py-4 text-slate-400 text-sm">No upcoming releases in the next 30 days</div>
          ) : (
            <div className="space-y-3">
              {/* This Week */}
              {metrics.forecast.thisWeek.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> This Week ({metrics.forecast.thisWeek.length})
                  </div>
                  <div className="space-y-1.5">
                    {metrics.forecast.thisWeek.map(item => (
                      <div
                        key={item.id}
                        onClick={() => navigate('product-detail', { productId: item.id })}
                        className="flex items-center justify-between p-2.5 bg-rose-50 dark:bg-rose-900/20 rounded-lg cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Package size={14} className="text-rose-600 shrink-0" />
                          <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate group-hover:text-rose-700 dark:group-hover:text-rose-300">
                            {item.subProject || item.name}
                          </span>
                          {item.subProject && (
                            <span className="text-xs text-slate-400 truncate hidden sm:inline">({item.name})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-medium text-rose-600 dark:text-rose-400">{item.days === 0 ? 'Today' : item.days === 1 ? 'Tomorrow' : `${item.days}d`}</span>
                          <ArrowRight size={12} className="text-slate-300 group-hover:text-rose-500 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Week */}
              {metrics.forecast.nextWeek.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" /> Next Week ({metrics.forecast.nextWeek.length})
                  </div>
                  <div className="space-y-1.5">
                    {metrics.forecast.nextWeek.map(item => (
                      <div
                        key={item.id}
                        onClick={() => navigate('product-detail', { productId: item.id })}
                        className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Package size={14} className="text-amber-600 shrink-0" />
                          <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate group-hover:text-amber-700 dark:group-hover:text-amber-300">
                            {item.subProject || item.name}
                          </span>
                          {item.subProject && (
                            <span className="text-xs text-slate-400 truncate hidden sm:inline">({item.name})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{item.days}d</span>
                          <ArrowRight size={12} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* This Month */}
              {metrics.forecast.thisMonth.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" /> This Month ({metrics.forecast.thisMonth.length})
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {metrics.forecast.thisMonth.map(item => (
                      <div
                        key={item.id}
                        onClick={() => navigate('product-detail', { productId: item.id })}
                        className="flex items-center justify-between p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Package size={14} className="text-blue-600 shrink-0" />
                          <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-700 dark:group-hover:text-blue-300">
                            {item.subProject || item.name}
                          </span>
                          {item.subProject && (
                            <span className="text-xs text-slate-400 truncate hidden sm:inline">({item.name})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{item.days}d</span>
                          <ArrowRight size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all duration-300 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide truncate">Deployment Health</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('deployments')} className="text-xs shrink-0">View All <ArrowRight size={12}/></Button>
          </div>

          {/* Status Summary - Clickable */}
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            <button
              onClick={() => navigate('deployments', { filter: { status: 'Not Started' } })}
              className="p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center group"
            >
              <div className="text-base font-bold text-slate-900 dark:text-white group-hover:text-slate-600">{metrics.statusBreakdown.notStarted.length}</div>
              <div className="text-[9px] text-slate-400 uppercase leading-tight">Not Started</div>
            </button>
            <button
              onClick={() => navigate('deployments', { filter: { status: 'In Progress' } })}
              className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-center group"
            >
              <div className="text-base font-bold text-blue-600 dark:text-blue-400">{metrics.statusBreakdown.inProgress.length}</div>
              <div className="text-[9px] text-blue-600/70 uppercase leading-tight">In Progress</div>
            </button>
            <button
              onClick={() => navigate('deployments', { filter: { status: 'Blocked' } })}
              className="p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-center group"
            >
              <div className="text-base font-bold text-amber-600 dark:text-amber-400">{metrics.statusBreakdown.blocked.length}</div>
              <div className="text-[9px] text-amber-600/70 uppercase leading-tight">Blocked</div>
            </button>
            <button
              onClick={() => navigate('deployments', { filter: { status: 'Released' } })}
              className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors text-center group"
            >
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{metrics.statusBreakdown.released.length}</div>
              <div className="text-[9px] text-emerald-600/70 uppercase leading-tight">Released</div>
            </button>
          </div>

          {/* Active Deployments List */}
          <div className="space-y-3">
            {/* Blocked - Always show if any */}
            {metrics.statusBreakdown.blocked.length > 0 && (
              <div>
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <AlertTriangle size={12} /> Blocked - Needs Attention
                </div>
                <div className="space-y-1">
                  {metrics.statusBreakdown.blocked.slice(0, 2).map(d => (
                    <div
                      key={d.id}
                      onClick={() => navigate('deployments', { filter: { id: d.id } })}
                      className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Rocket size={12} className="text-amber-600 shrink-0" />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{d.productName}</span>
                        <span className="text-xs text-slate-400 truncate hidden sm:inline">• {d.clientName}</span>
                      </div>
                      <ArrowRight size={12} className="text-slate-300 group-hover:text-amber-500 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* In Progress - Show top urgent ones */}
            {metrics.statusBreakdown.inProgress.length > 0 && (
              <div>
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Clock size={12} /> In Progress - Upcoming
                </div>
                <div className="space-y-1">
                  {metrics.statusBreakdown.inProgress.slice(0, 3).map(d => (
                    <div
                      key={d.id}
                      onClick={() => navigate('deployments', { filter: { id: d.id } })}
                      className="flex items-center justify-between p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Rocket size={12} className="text-blue-600 shrink-0" />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{d.productName}</span>
                        <span className="text-xs text-slate-400 truncate hidden sm:inline">• {d.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-medium ${d.daysLeft < 0 ? 'text-rose-600' : d.daysLeft <= 7 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {d.daysLeft < 0 ? `${Math.abs(d.daysLeft)}d overdue` : d.daysLeft === 0 ? 'Today' : `${d.daysLeft}d`}
                        </span>
                        <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${d.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {metrics.statusBreakdown.inProgress.length > 3 && (
                    <button
                      onClick={() => navigate('deployments', { filter: { status: 'In Progress' } })}
                      className="w-full text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 py-1"
                    >
                      +{metrics.statusBreakdown.inProgress.length - 3} more in progress...
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Metrics Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="relative w-7 h-7 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-200 dark:text-slate-700" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={`${metrics.avgChecklistProgress * 0.88} 88`} className="text-blue-500" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-400">{metrics.avgChecklistProgress}%</span>
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">Avg<br/>Progress</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="relative w-7 h-7 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-200 dark:text-slate-700" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={`${metrics.onTimeRate * 0.88} 88`} className="text-emerald-500" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-400">{metrics.onTimeRate}%</span>
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">On-Time<br/>Rate</div>
                </div>
              </div>
              {metrics.overdue.length > 0 && (
                <button
                  onClick={() => navigate('deployments', { filter: { overdue: true } })}
                  className="flex items-center gap-1 px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded text-[10px] font-medium hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors shrink-0"
                >
                  <AlertTriangle size={10} />
                  {metrics.overdue.length} Overdue
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Gantt Chart */}
      <GanttChart
        deployments={deployments}
        products={products}
        clients={clients}
        onSelect={(d) => navigate('deployments', { filter: { id: d.id } })}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 md:gap-4">
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
        <KPICard
          label="Active EAPs" value={metrics.eapProducts.length} icon={Sparkles} color="text-purple-600 bg-purple-100"
          onClick={() => navigate('eap-dashboard')}
        />
      </div>
    </div>
  );
};
