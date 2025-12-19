import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Rocket, Users, Maximize2, X, Minimize2 } from 'lucide-react';

const STATUS_COLORS = {
  'Not Started': { bg: 'bg-slate-400', light: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600' },
  'In Progress': { bg: 'bg-blue-500', light: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600' },
  'Blocked': { bg: 'bg-amber-500', light: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600' },
  'Released': { bg: 'bg-emerald-500', light: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600' }
};

export const GanttChart = ({ deployments, products, clients, onSelect }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle escape key to close fullscreen
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    if (isFullscreen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Generate dates for 4 weeks from current week + offset
  const { dates, weekStart, weekEnd } = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const dates = [];
    for (let i = 0; i < 28; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }

    const weekEnd = new Date(startOfWeek);
    weekEnd.setDate(startOfWeek.getDate() + 27);

    return { dates, weekStart: startOfWeek, weekEnd };
  }, [weekOffset]);

  // Format deployments for display
  const chartData = useMemo(() => {
    return deployments
      .filter(d => d.status !== 'Released')
      .map(d => {
        const product = products.find(p => p.id === d.productId);
        const client = clients.find(c => c.id === d.clientId);
        let clientName = client?.name;
        if (!clientName) {
          if (d.deploymentType === 'ga') clientName = 'GA';
          else if (d.deploymentType === 'generic') clientName = 'Generic';
          else clientName = 'GA';
        }

        const targetDate = d.nextDeliveryDate
          ? (d.nextDeliveryDate.toDate ? d.nextDeliveryDate.toDate() : new Date(d.nextDeliveryDate))
          : null;

        return {
          id: d.id,
          productName: product?.name || 'Unknown',
          clientName,
          status: d.status,
          targetDate,
          deployment: d
        };
      })
      .filter(d => d.targetDate)
      .sort((a, b) => a.targetDate - b.targetDate);
  }, [deployments, products, clients]);

  // Get position for a date on the chart
  const getDatePosition = (date) => {
    if (!date) return null;
    const startTime = weekStart.getTime();
    const endTime = weekEnd.getTime();
    const dateTime = date.getTime();

    if (dateTime < startTime || dateTime > endTime) return null;

    const totalDays = 28;
    const daysDiff = (dateTime - startTime) / (1000 * 60 * 60 * 24);
    return (daysDiff / totalDays) * 100;
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Format month label
  const getMonthLabel = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  // Get week labels
  const weekLabels = useMemo(() => {
    const labels = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(dates[i * 7]);
      const weekEnd = new Date(dates[i * 7 + 6]);
      labels.push({
        start: weekStart,
        end: weekEnd,
        label: `${weekStart.getDate()} - ${weekEnd.getDate()} ${getMonthLabel(weekEnd)}`
      });
    }
    return labels;
  }, [dates]);

  const todayPosition = getDatePosition(new Date());

  const chartContent = (
    <div className="min-w-[700px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-slate-500" />
          <h3 className="font-bold text-slate-900 dark:text-white">Deployment Timeline</h3>
          <span className="text-xs text-slate-400 ml-2">{chartData.length} active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'View fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Timeline Header */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <div className="w-48 shrink-0 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-500 uppercase">Deployment</span>
        </div>
        <div className="flex-1 relative">
          <div className="flex">
            {weekLabels.map((week, i) => (
              <div key={i} className="flex-1 text-center py-2 border-r border-slate-100 dark:border-slate-800 last:border-r-0">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{week.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Day Headers */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <div className="w-48 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50" />
        <div className="flex-1 flex relative">
          {dates.map((date, i) => (
            <div
              key={i}
              className={`flex-1 text-center py-1 border-r border-slate-50 dark:border-slate-800/50 last:border-r-0 ${
                isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              } ${date.getDay() === 0 || date.getDay() === 6 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}
            >
              <span className={`text-[10px] font-medium ${
                isToday(date) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
              }`}>
                {date.getDate()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Body */}
      <div className="max-h-[300px] overflow-y-auto">
        {chartData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No active deployments with target dates in this period
          </div>
        ) : (
          chartData.map((item, index) => {
            const position = getDatePosition(item.targetDate);
            const isInRange = position !== null;
            const isPast = item.targetDate < new Date();
            const colors = STATUS_COLORS[item.status] || STATUS_COLORS['Not Started'];

            return (
              <div
                key={item.id}
                onClick={() => onSelect?.(item.deployment)}
                className={`flex border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                  index % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-slate-800/20'
                }`}
              >
                {/* Label */}
                <div className="w-48 shrink-0 px-3 py-2.5 border-r border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {item.productName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                        <Users size={10} /> {item.clientName}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Bar */}
                <div className="flex-1 relative py-2">
                  {/* Background grid */}
                  <div className="absolute inset-0 flex">
                    {dates.map((date, i) => (
                      <div
                        key={i}
                        className={`flex-1 border-r border-slate-50 dark:border-slate-800/30 last:border-r-0 ${
                          date.getDay() === 0 || date.getDay() === 6 ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''
                        }`}
                      />
                    ))}
                  </div>

                  {/* Today line */}
                  {todayPosition !== null && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                      style={{ left: `${todayPosition}%` }}
                    />
                  )}

                  {/* Deployment marker */}
                  {isInRange ? (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 z-20"
                      style={{ left: `${position}%`, transform: `translateX(-50%) translateY(-50%)` }}
                    >
                      <div className={`relative group`}>
                        <div className={`w-6 h-6 rounded-full ${colors.bg} flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-slate-900`}>
                          <Rocket size={12} className="text-white" />
                        </div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30 pointer-events-none">
                          {item.targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-y-0 right-2 flex items-center">
                      <span className={`text-[10px] font-medium ${isPast ? 'text-rose-500' : 'text-slate-400'}`}>
                        {item.targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {isPast ? ' (overdue)' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-4">
          {Object.entries(STATUS_COLORS).filter(([k]) => k !== 'Released').map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${colors.bg}`} />
              <span className="text-[10px] text-slate-500">{status}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-3 bg-blue-500 rounded" />
          <span className="text-[10px] text-slate-500">Today</span>
        </div>
      </div>
    </div>
  );

  // Fullscreen modal
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <Calendar size={24} className="text-blue-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Deployment Timeline</h2>
            <span className="text-sm text-slate-400 ml-2">{chartData.length} active deployments</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setWeekOffset(w => w - 4)}
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                title="Previous month"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setWeekOffset(w => w - 1)}
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setWeekOffset(w => w + 1)}
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setWeekOffset(w => w + 4)}
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                title="Next month"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              title="Exit fullscreen (Esc)"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Timeline Header */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <div className="w-64 shrink-0 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-500 uppercase">Deployment</span>
          </div>
          <div className="flex-1 relative">
            <div className="flex">
              {weekLabels.map((week, i) => (
                <div key={i} className="flex-1 text-center py-3 border-r border-slate-100 dark:border-slate-800 last:border-r-0">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{week.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Day Headers */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <div className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50" />
          <div className="flex-1 flex relative">
            {dates.map((date, i) => (
              <div
                key={i}
                className={`flex-1 text-center py-2 border-r border-slate-50 dark:border-slate-800/50 last:border-r-0 ${
                  isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                } ${date.getDay() === 0 || date.getDay() === 6 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}
              >
                <span className={`text-xs font-medium ${
                  isToday(date) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                }`}>
                  {date.getDate()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart Body - Full Height */}
        <div className="flex-1 overflow-y-auto">
          {chartData.length === 0 ? (
            <div className="py-24 text-center text-slate-400 text-lg">
              No active deployments with target dates in this period
            </div>
          ) : (
            chartData.map((item, index) => {
              const position = getDatePosition(item.targetDate);
              const isInRange = position !== null;
              const isPast = item.targetDate < new Date();
              const colors = STATUS_COLORS[item.status] || STATUS_COLORS['Not Started'];

              return (
                <div
                  key={item.id}
                  onClick={() => onSelect?.(item.deployment)}
                  className={`flex border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                    index % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-slate-800/20'
                  }`}
                >
                  {/* Label */}
                  <div className="w-64 shrink-0 px-4 py-4 border-r border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${colors.bg}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {item.productName}
                        </div>
                        <div className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                          <Users size={12} /> {item.clientName}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Bar */}
                  <div className="flex-1 relative py-3">
                    {/* Background grid */}
                    <div className="absolute inset-0 flex">
                      {dates.map((date, i) => (
                        <div
                          key={i}
                          className={`flex-1 border-r border-slate-50 dark:border-slate-800/30 last:border-r-0 ${
                            date.getDay() === 0 || date.getDay() === 6 ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''
                          }`}
                        />
                      ))}
                    </div>

                    {/* Today line */}
                    {todayPosition !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                        style={{ left: `${todayPosition}%` }}
                      />
                    )}

                    {/* Deployment marker */}
                    {isInRange ? (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 z-20"
                        style={{ left: `${position}%`, transform: `translateX(-50%) translateY(-50%)` }}
                      >
                        <div className="relative group">
                          <div className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900`}>
                            <Rocket size={16} className="text-white" />
                          </div>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30 pointer-events-none">
                            {item.targetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-y-0 right-4 flex items-center">
                        <span className={`text-sm font-medium ${isPast ? 'text-rose-500' : 'text-slate-400'}`}>
                          {item.targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {isPast ? ' (overdue)' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-6">
            {Object.entries(STATUS_COLORS).filter(([k]) => k !== 'Released').map(([status, colors]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${colors.bg}`} />
                <span className="text-sm text-slate-500">{status}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-blue-500 rounded" />
            <span className="text-sm text-slate-500">Today</span>
          </div>
        </div>
      </div>
    );
  }

  // Normal view
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-w-full">
      <div className="overflow-x-auto">
        {chartContent}
      </div>
    </div>
  );
};
