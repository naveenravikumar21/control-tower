import { Calendar, AlertTriangle } from 'lucide-react';
import { formatDate, getDeadlineStatus } from '../../utils';

export const TimelineStrip = ({ items, onSelect }) => (
  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
    {items.length === 0 && (
      <div className="text-slate-400 text-sm italic w-full text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
        <Calendar size={32} className="mx-auto mb-2 text-slate-300" />
        No upcoming releases scheduled
      </div>
    )}
    {items.map(item => {
      const status = getDeadlineStatus(item.date, item.status || 'In Progress');
      return (
        <div key={item.id} onClick={() => onSelect(item)} className="min-w-[200px] p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg cursor-pointer transition-all hover:-translate-y-1 flex-shrink-0 group">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2.5 h-2.5 rounded-full ${status.urgent ? 'bg-rose-500 animate-pulse' : 'bg-blue-500'}`} />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{formatDate(item.date)}</span>
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
