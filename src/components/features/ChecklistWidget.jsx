import { CustomTooltip, Badge } from '../ui';

export const ChecklistWidget = ({ checklist, onToggle, compact }) => {
  const completed = checklist.filter(c => c.isCompleted).length;
  const progress = Math.round((completed / checklist.length) * 100) || 0;

  if (compact) {
    return (
      <CustomTooltip content={`${completed} of ${checklist.length} tasks complete`}>
        <div className="flex items-center gap-2 cursor-help">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{progress}%</span>
        </div>
      </CustomTooltip>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Release Checklist</h4>
        <Badge color={progress === 100 ? 'emerald' : 'blue'} size="md">{progress}% Ready</Badge>
      </div>
      <div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {checklist.map(item => (
          <label key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors group">
            <div className="relative flex items-center pt-0.5">
              <input
                type="checkbox"
                checked={item.isCompleted}
                onChange={() => onToggle(item)}
                className="peer h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
              />
            </div>
            <span className={`text-sm transition-colors ${item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200 font-medium'}`}>
              {item.item}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};
