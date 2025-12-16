import { Rocket } from 'lucide-react';
import { DeploymentTile } from './DeploymentTile';

export const DeploymentGridView = ({ deployments, onDeploymentClick }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
    {deployments.map(d => (
      <DeploymentTile key={d.id} deployment={d} onClick={() => onDeploymentClick(d)} />
    ))}
    {deployments.length === 0 && (
      <div className="col-span-full text-center py-16 text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
        <Rocket size={48} className="mx-auto mb-4 text-slate-300" />
        <p className="text-lg font-medium">No deployments found</p>
        <p className="text-sm mt-1">Try adjusting your filters or create a new deployment</p>
      </div>
    )}
  </div>
);
