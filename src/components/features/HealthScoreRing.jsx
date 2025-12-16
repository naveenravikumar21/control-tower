import { CustomTooltip } from '../ui';

export const HealthScoreRing = ({ score }) => {
  const radius = 30;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = "text-rose-500";
  if (score > 50) color = "text-amber-500";
  if (score > 80) color = "text-emerald-500";

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <CustomTooltip content="Score based on checklist, timeliness, and docs">
        <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
          <circle stroke="currentColor" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} className="text-slate-100 dark:text-slate-800" />
          <circle stroke="currentColor" fill="transparent" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset }} strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius} className={`${color} transition-all duration-1000 ease-out`} />
        </svg>
      </CustomTooltip>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-800 dark:text-white">{Math.round(score)}</span>
        <span className="text-[10px] text-slate-400 uppercase font-bold">Health</span>
      </div>
    </div>
  );
};
