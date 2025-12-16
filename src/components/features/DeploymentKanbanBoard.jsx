import { useMemo } from 'react';
import { DeploymentTile } from './DeploymentTile';
import { Badge } from '../ui';
import { KANBAN_COLUMNS } from '../../constants';

export const DeploymentKanbanBoard = ({ deployments, onDeploymentClick }) => {
  const groupedDeployments = useMemo(() => {
    const groups = {};
    KANBAN_COLUMNS.forEach(col => groups[col.id] = []);
    deployments.forEach(d => {
      if (groups[d.status]) groups[d.status].push(d);
    });
    return groups;
  }, [deployments]);

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-4">
      <div className="flex gap-4 min-w-max sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:min-w-0">
        {KANBAN_COLUMNS.map(column => (
          <div
            key={column.id}
            className={`${column.bgColor} rounded-xl p-4 border-t-4 ${column.color} w-72 sm:w-auto flex-shrink-0 sm:flex-shrink`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">
                {column.label}
              </h3>
              <Badge color="slate" size="sm">{groupedDeployments[column.id].length}</Badge>
            </div>

            <div className="space-y-3 max-h-[60vh] sm:max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
              {groupedDeployments[column.id].length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm italic">
                  No deployments
                </div>
              )}
              {groupedDeployments[column.id].map(d => (
                <DeploymentTile key={d.id} deployment={d} onClick={() => onDeploymentClick(d)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
