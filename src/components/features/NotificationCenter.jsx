import { useState, useRef, useEffect } from 'react';
import { Bell, X, Clock, AlertTriangle, AlertCircle, CheckCircle, Rocket, ChevronRight } from 'lucide-react';
import { useNotifications, useNav } from '../../contexts';

export const NotificationCenter = ({ openDirection = 'up', alignRight = false }) => {
  const { notifications, counts, dismissNotification, dismissAll } = useNotifications();
  const { navigate } = useNav();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertCircle size={16} className="text-rose-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
      default: return <Clock size={16} className="text-blue-500" />;
    }
  };

  const getSeverityBg = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800';
      case 'warning': return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
      default: return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  const handleNotificationClick = (notification) => {
    if (notification.deploymentId) {
      navigate('deployments', { filter: { id: notification.deploymentId } });
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          isOpen
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
        title={`${counts.total} notifications`}
      >
        <Bell size={20} />
        {counts.total > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full ${
            counts.critical > 0
              ? 'bg-rose-500 text-white'
              : counts.warning > 0
              ? 'bg-amber-500 text-white'
              : 'bg-blue-500 text-white'
          }`}>
            {counts.total > 99 ? '99+' : counts.total}
          </span>
        )}
        {counts.critical > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-rose-500 rounded-full animate-ping opacity-50" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in duration-200 ${
          alignRight ? 'right-0' : 'left-0'
        } ${
          openDirection === 'up'
            ? 'bottom-full mb-2 slide-in-from-bottom-2'
            : 'top-full mt-2 slide-in-from-top-2'
        }`}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-slate-500" />
              <span className="font-semibold text-slate-900 dark:text-white">Notifications</span>
              {counts.total > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                  {counts.total}
                </span>
              )}
            </div>
            {counts.total > 0 && (
              <button
                onClick={dismissAll}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline"
              >
                Dismiss all
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-slate-500 text-sm">All caught up!</p>
                <p className="text-slate-400 text-xs mt-1">No pending notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`relative p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${getSeverityBg(notification.severity)} border`}>
                        {notification.type === 'blocked' ? (
                          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
                        ) : (
                          getSeverityIcon(notification.severity)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${
                            notification.severity === 'critical'
                              ? 'text-rose-700 dark:text-rose-400'
                              : notification.severity === 'warning'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-blue-700 dark:text-blue-400'
                          }`}>
                            {notification.title}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                          {notification.message}
                        </p>
                        {notification.type === 'deadline' && (
                          <div className="flex items-center gap-1 mt-1">
                            <Rocket size={12} className="text-slate-400" />
                            <span className="text-xs text-slate-400">
                              Due: {new Date(notification.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissNotification(notification.id); }}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all"
                          title="Dismiss"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {counts.total > 0 && (
            <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-center gap-4 text-xs">
                {counts.critical > 0 && (
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    {counts.critical} critical
                  </span>
                )}
                {counts.warning > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {counts.warning} warning
                  </span>
                )}
                {counts.info > 0 && (
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {counts.info} upcoming
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
