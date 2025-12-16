export const ProgressBar = ({ value, max = 100, color = 'bg-blue-600', className = '' }) => (
  <div className={`h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden ${className}`}>
    <div
      className={`h-full ${color} transition-all duration-500 ease-out rounded-full`}
      style={{ width: `${(value / max) * 100}%` }}
    />
  </div>
);

export const CircularProgress = ({ value, size = 48, strokeWidth = 3, color = 'text-blue-500', className = '' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={color}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
        {Math.round(value)}%
      </span>
    </div>
  );
};
