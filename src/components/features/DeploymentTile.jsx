import { Rocket, Clock, CheckCircle2, MessageSquare, Package, Cpu } from 'lucide-react';
import { Card, CustomTooltip, ProgressBar } from '../ui';
import { getDeadlineStatus, getAvatarColor } from '../../utils';
import { AVATAR_COLORS, DEPLOYMENT_ENVIRONMENTS, DEPLOYMENT_TYPES, ADAPTOR_STATUSES } from '../../constants';

export const DeploymentTile = ({ deployment, onClick }) => {
  const { client, product, status, nextDeliveryDate, checklist, blockedComments = [], deploymentType, environment, featureName, equipmentSAStatus, equipmentSEStatus, mappingStatus, constructionStatus } = deployment;
  const deadlineStatus = getDeadlineStatus(nextDeliveryDate, status);
  const completed = checklist?.filter(c => c.isCompleted).length || 0;
  const total = checklist?.length || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Check if this deployment has any service statuses (for adapter products)
  const hasServiceStatuses = equipmentSAStatus !== undefined || equipmentSEStatus !== undefined || mappingStatus !== undefined || constructionStatus !== undefined;

  // Get status color for service badges
  const getServiceStatusColor = (statusKey) => {
    const status = ADAPTOR_STATUSES.find(s => s.key === statusKey);
    if (!status) return 'bg-slate-300';
    if (status.key === 'completed') return 'bg-emerald-500';
    if (status.key === 'in_progress') return 'bg-blue-500';
    return 'bg-slate-300';
  };

  // Product is now the primary display (label reorder - product first)
  const productName = product?.name || 'Unknown Product';
  const avatarColor = getAvatarColor(productName, AVATAR_COLORS);

  // Get environment info
  const envInfo = DEPLOYMENT_ENVIRONMENTS.find(e => e.key === (environment || 'production')) || DEPLOYMENT_ENVIRONMENTS[2];

  // Get deployment type label
  const getTypeLabel = () => {
    if (deploymentType === 'feature-release') return featureName || 'Feature Release';
    const typeInfo = DEPLOYMENT_TYPES.find(t => t.key === deploymentType);
    return typeInfo?.label || 'Release';
  };

  return (
    <Card
      className="p-0 overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 ${avatarColor} rounded-xl flex items-center justify-center text-white shadow-sm shrink-0`}>
            <Package size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                  {productName}
                </h3>
                {deploymentType === 'eap' && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">EAP</span>
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
            {/* Environment - Type subtitle */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                envInfo.color === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                envInfo.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              }`}>{envInfo.label}</span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">{getTypeLabel()}</span>
            </div>
            {/* Client name if client-specific */}
            {client?.name && (
              <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
                <span className="text-slate-400">Client:</span> {client.name}
              </p>
            )}
          </div>
        </div>

        {/* Status and Deadline badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          <StatusBadge status={status} />
          <DeadlineBadge deadlineStatus={deadlineStatus} />
        </div>

        {/* Service Status Indicators for Adapter Products */}
        {hasServiceStatuses && (
          <div className="flex items-center gap-2 mt-3">
            <Cpu size={14} className="text-indigo-500" />
            <div className="flex items-center gap-1.5">
              {equipmentSAStatus !== null && equipmentSAStatus !== undefined && (
                <CustomTooltip content={`Equip-SA: ${ADAPTOR_STATUSES.find(s => s.key === equipmentSAStatus)?.label || 'Unknown'}`}>
                  <div className={`w-6 h-5 rounded ${getServiceStatusColor(equipmentSAStatus)} flex items-center justify-center text-white text-[9px] font-bold`}>
                    E-SA
                  </div>
                </CustomTooltip>
              )}
              {equipmentSEStatus !== null && equipmentSEStatus !== undefined && (
                <CustomTooltip content={`Equip-SE: ${ADAPTOR_STATUSES.find(s => s.key === equipmentSEStatus)?.label || 'Unknown'}`}>
                  <div className={`w-6 h-5 rounded ${getServiceStatusColor(equipmentSEStatus)} flex items-center justify-center text-white text-[9px] font-bold`}>
                    E-SE
                  </div>
                </CustomTooltip>
              )}
              {mappingStatus !== null && mappingStatus !== undefined && (
                <CustomTooltip content={`Mapping: ${ADAPTOR_STATUSES.find(s => s.key === mappingStatus)?.label || 'Unknown'}`}>
                  <div className={`w-6 h-5 rounded ${getServiceStatusColor(mappingStatus)} flex items-center justify-center text-white text-[9px] font-bold`}>
                    Map
                  </div>
                </CustomTooltip>
              )}
              {constructionStatus !== null && constructionStatus !== undefined && (
                <CustomTooltip content={`Construction: ${ADAPTOR_STATUSES.find(s => s.key === constructionStatus)?.label || 'Unknown'}`}>
                  <div className={`w-6 h-5 rounded ${getServiceStatusColor(constructionStatus)} flex items-center justify-center text-white text-[9px] font-bold`}>
                    Con
                  </div>
                </CustomTooltip>
              )}
            </div>
          </div>
        )}
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
