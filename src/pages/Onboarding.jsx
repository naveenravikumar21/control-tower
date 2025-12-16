import { useState, useMemo } from 'react';
import { Users, Package, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNav } from '../contexts';
import { useCollection } from '../hooks';
import { getDeadlineStatus } from '../utils';
import { AVATAR_COLORS } from '../constants';
import { Card, Badge, SearchInput, ProgressBar, EmptyState } from '../components/ui/index.jsx';

export const Onboarding = () => {
  const { data: clients } = useCollection('clients');
  const { data: deploys } = useCollection('deployments');
  const { data: products } = useCollection('products');
  const { data: checklists } = useCollection('checklists');
  const { navigate } = useNav();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(c => c.name?.toLowerCase().includes(q));
  }, [clients, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Onboarding Health</h1>
          <p className="text-slate-500 mt-1">Monitor client deployment progress</p>
        </div>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search clients..."
          className="w-full md:w-72"
        />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredClients.map(client => {
          const clientDeploys = deploys.filter(d => d.clientId === client.id);
          if (clientDeploys.length === 0) return null;

          const totalChecks = clientDeploys.reduce((acc, d) => {
            const checks = checklists.filter(c => c.deploymentId === d.id);
            return acc + (checks.filter(c => c.isCompleted).length / (checks.length || 1)) * 100;
          }, 0);
          const avgCompletion = Math.round(totalChecks / clientDeploys.length);
          const blockedCount = clientDeploys.filter(d => d.status === 'Blocked').length;

          const colorIndex = client.name?.charCodeAt(0) % AVATAR_COLORS.length || 0;
          const avatarColor = AVATAR_COLORS[colorIndex];

          return (
            <Card key={client.id} className="p-0 overflow-hidden hover:shadow-lg transition-all duration-300">
              <div className="p-5 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${avatarColor} rounded-xl flex items-center justify-center text-white shadow-sm shrink-0`}>
                      <Users size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{client.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-slate-500">{clientDeploys.length} projects</span>
                        {blockedCount > 0 && <Badge color="rose" size="sm">{blockedCount} blocked</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-slate-400 uppercase tracking-wide font-bold">Avg Progress</div>
                      <div className="text-xl font-bold text-slate-900 dark:text-white">{avgCompletion}%</div>
                    </div>
                    <div className="relative w-12 h-12">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-slate-700" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${avgCompletion * 0.88} 88`} className={avgCompletion === 100 ? "text-emerald-500" : blockedCount > 0 ? "text-amber-500" : "text-blue-500"} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 sm:hidden">{avgCompletion}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {clientDeploys.map(d => {
                  const prod = products.find(p => p.id === d.productId);
                  const deadlineStatus = getDeadlineStatus(d.nextDeliveryDate, d.status);
                  const checks = checklists.filter(c => c.deploymentId === d.id);
                  const completed = checks.filter(c => c.isCompleted).length;
                  const total = checks.length || 1;
                  const completion = Math.round((completed / total) * 100);

                  return (
                    <div key={d.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group" onClick={() => navigate('deployments', { filter: { id: d.id } })}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                          <Package size={18} className="text-slate-500 dark:text-slate-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">{prod?.name || 'Unknown Product'}</span>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              d.status === 'Released' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                              d.status === 'Blocked' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' :
                              d.status === 'In Progress' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}>{d.status}</div>
                          </div>
                          <div className={`text-xs mt-0.5 ${deadlineStatus.color.split(' ')[0]}`}>{deadlineStatus.label}</div>
                        </div>

                        <div className="w-24 hidden md:block">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">{completed}/{total}</span>
                            <span className={completion === 100 ? "text-emerald-600 font-bold" : "text-slate-600 dark:text-slate-300"}>{completion}%</span>
                          </div>
                          <ProgressBar value={completion} color={completion === 100 ? 'bg-emerald-500' : deadlineStatus.urgent ? 'bg-rose-500' : 'bg-blue-500'} />
                        </div>

                        <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
        {filteredClients.filter(c => deploys.filter(d => d.clientId === c.id).length > 0).length === 0 && (
          <EmptyState
            icon={CheckCircle2}
            title="No onboarding projects"
            description="Create deployments to track onboarding progress"
          />
        )}
      </div>
    </div>
  );
};
