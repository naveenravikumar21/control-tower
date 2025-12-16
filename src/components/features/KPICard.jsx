import { ArrowRight } from 'lucide-react';
import { Card } from '../ui';

export const KPICard = ({ label, value, subtext, icon: Icon, color, onClick, urgent }) => (
  <Card onClick={onClick} className="p-6 flex flex-col justify-between h-40 group relative overflow-hidden border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-lg transition-all duration-300">
    <div className={`absolute inset-0 opacity-[0.05] ${color.replace('text-', 'bg-')}`} />
    <div className="flex justify-between items-start z-10">
      <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">{label}</span>
      <div className={`p-3 rounded-xl ${color.includes('bg-') ? color.split(' ')[1] : 'bg-slate-100'} group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={22} className={color.split(' ')[0]} />
      </div>
    </div>
    <div className="flex items-end justify-between z-10">
      <div>
        <span className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</span>
        {subtext && <p className="text-sm text-slate-400 mt-1">{subtext}</p>}
      </div>
      <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-600 transition-colors mb-1 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100" />
    </div>
    {urgent && <div className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full m-3 animate-pulse" />}
  </Card>
);
