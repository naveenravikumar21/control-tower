import { Calendar, AlertTriangle } from 'lucide-react';
import { formatDate, getDeadlineStatus } from '../../utils';

export const TimelineStrip = ({ items, onSelect }) => {
  if (items.length === 0) {
    return (
      <div className="text-slate-400 text-sm italic w-full text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
        <Calendar size={32} className="mx-auto mb-2 text-slate-300" />
        No upcoming releases scheduled
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map(item => {
        const status = getDeadlineStatus(item.date, item.status || 'In Progress');
        const isGA = item.deploymentType === 'ga' || (!item.deploymentType && (item.clientName === 'GA' || item.clientName === 'Generic'));
        return (
          <div key={item.id} onClick={() => onSelect(item)} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg cursor-pointer transition-all hover:-translate-y-1 group">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${status.urgent ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'}`} />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{formatDate(item.date)}</span>
              </div>
              {isGA && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">GA</span>
              )}
            </div>
            <div className="font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 transition-colors">{item.clientName}</div>
            <div className="text-sm text-slate-500 truncate mt-1">{item.productName}</div>
            <div className="mt-3 text-xs text-slate-400 flex justify-between items-center">
               <span className={status.urgent ? 'text-rose-500 font-medium' : ''}>{item.daysLeft} days left</span>
               {status.urgent && <AlertTriangle size={14} className="text-rose-500" />}
            </div>
          </div>
        )
      })}
    </div>
  );
};
