import { Rocket, Clock, CheckCircle2, MessageSquare } from 'lucide-react';
import { Card, CustomTooltip, ProgressBar } from '../ui';
import { getDeadlineStatus, getAvatarColor } from '../../utils';
import { AVATAR_COLORS } from '../../constants';

export const DeploymentTile = ({ deployment, onClick }) => {
  const { client, product, status, nextDeliveryDate, checklist, blockedComments = [], deploymentType } = deployment;
  const deadlineStatus = getDeadlineStatus(nextDeliveryDate, status);
  const completed = checklist?.filter(c => c.isCompleted).length || 0;
  const total = checklist?.length || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Determine display name based on deployment type
  const displayName = client?.name || (deploymentType === 'ga' ? 'GA' : deploymentType === 'generic' ? 'Generic' : 'GA');
  const avatarColor = getAvatarColor(displayName, AVATAR_COLORS);

  return (
    <Card
      className="p-0 overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 ${avatarColor} rounded-xl flex items-center justify-center text-white shadow-sm shrink-0`}>
            <Rocket size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                  {displayName}
                </h3>
                {deploymentType === 'ga' && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">GA</span>
                )}
              </div>
              {blockedComments.length > 0 && (
                <CustomTooltip content={`${blockedComments.length} comment(s)`}>
                  <div className="flex items-center gap-1 text-sm text-slate-400">
                    <MessageSquare size={14} />
                    <span>{blockedComments.length}</span>
                  </div>
                </CustomTooltip>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-2">{product?.name || 'Unknown Product'}</p>
          </div>
        </div>

        {/* Status and Deadline badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          <StatusBadge status={status} />
          <DeadlineBadge deadlineStatus={deadlineStatus} />
        </div>
      </div>

      {/* Stats footer */}
      <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className={progress === 100 ? "text-emerald-500" : "text-slate-400"} />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              <b className={progress === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}>{completed}/{total}</b> tasks
            </span>
          </div>
          <span className={`text-sm font-bold ${progress === 100 ? "text-emerald-600" : "text-slate-600 dark:text-slate-300"}`}>{progress}%</span>
        </div>
        <ProgressBar value={progress} color={progress === 100 ? 'bg-emerald-500' : deadlineStatus.urgent ? 'bg-rose-500' : 'bg-blue-500'} />
      </div>
    </Card>
  );
};

// Status Badge Component
export const StatusBadge = ({ status }) => {
  const colors = {
    'Released': 'bg-emerald-50 dark:bg-emerald-900/20',
    'Blocked': 'bg-rose-50 dark:bg-rose-900/20',
    'In Progress': 'bg-blue-50 dark:bg-blue-900/20',
    'Not Started': 'bg-slate-100 dark:bg-slate-700',
  };

  const dotColors = {
    'Released': 'bg-emerald-500',
    'Blocked': 'bg-rose-500',
    'In Progress': 'bg-blue-500',
    'Not Started': 'bg-slate-400',
  };

  const textColors = {
    'Released': 'text-emerald-700 dark:text-emerald-300',
    'Blocked': 'text-rose-700 dark:text-rose-300',
    'In Progress': 'text-blue-700 dark:text-blue-300',
    'Not Started': 'text-slate-600 dark:text-slate-300',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${colors[status] || colors['Not Started']}`}>
      <div className={`w-2 h-2 rounded-full ${dotColors[status] || dotColors['Not Started']}`} />
      <span className={`text-sm font-medium ${textColors[status] || textColors['Not Started']}`}>{status}</span>
    </div>
  );
};

// Deadline Badge Component
export const DeadlineBadge = ({ deadlineStatus }) => (
  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${deadlineStatus.urgent ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
    <Clock size={14} className={deadlineStatus.color.split(' ')[0]} />
    <span className={`text-sm font-medium ${deadlineStatus.color.split(' ')[0]}`}>{deadlineStatus.label}</span>
  </div>
);
