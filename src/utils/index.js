// Date formatting utilities
export const formatDate = (val) => {
  if (!val) return '-';
  try {
    const date = val.toDate ? val.toDate() : new Date(val);
    if (isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  } catch (e) { return '-'; }
};

export const toInputDate = (val) => {
  if (!val) return '';
  try {
    const d = val.toDate ? val.toDate() : new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch (e) { return ''; }
};

// Calculate days difference from today
export const getDaysDiff = (dateString) => {
  if (!dateString) return 999;
  try {
    const target = dateString.toDate ? dateString.toDate() : new Date(dateString);
    const now = new Date();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  } catch (e) { return 999; }
};

// Get deadline status with color and urgency
export const getDeadlineStatus = (dateString, status) => {
  if (status === 'Released') return { color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400', label: 'Released', urgent: false };
  if (status === 'Blocked') return { color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400', label: 'Blocked', urgent: true };
  if (!dateString) return { color: 'text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400', label: 'No Date', urgent: false };

  const diffDays = getDaysDiff(dateString);

  if (diffDays < 0) return { color: 'text-rose-700 bg-rose-50 border-rose-200 font-bold dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400', label: `Overdue (${Math.abs(diffDays)}d)`, urgent: true };
  if (diffDays <= 7) return { color: 'text-rose-600 bg-rose-50 border-rose-200 font-semibold dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400', label: `Due in ${diffDays}d`, urgent: true };
  if (diffDays <= 30) return { color: 'text-amber-600 bg-amber-50 border-amber-200 font-medium dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400', label: `Due in ${diffDays}d`, urgent: false };
  return { color: 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300', label: `Due in ${diffDays}d`, urgent: false };
};

export const getStatusTooltip = (status) => {
  switch(status) {
    case 'Not Started': return 'No activity yet';
    case 'In Progress': return 'Work underway';
    case 'Blocked': return 'Waiting on dependencies';
    case 'Released': return 'Delivered to client';
    default: return status;
  }
};

export const calculateChecklistProgress = (items = []) => {
  if (!items.length) return 0;
  const completed = items.filter(i => i.isCompleted).length;
  return Math.round((completed / items.length) * 100);
};

// Get avatar color from name
export const getAvatarColor = (name, colors) => {
  if (!name || !colors?.length) return colors?.[0] || 'bg-slate-500';
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Filter and search utilities
export const searchFilter = (items, query, fields) => {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter(item =>
    fields.some(field => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], item);
      return value?.toString().toLowerCase().includes(q);
    })
  );
};

// CSV Export utility
export const exportToCSV = (data, filename, columns) => {
  if (!data || data.length === 0) {
    return { success: false, error: 'No data to export' };
  }

  try {
    const header = columns.map(col => col.label).join(',');
    const rows = data.map(item => {
      return columns.map(col => {
        let value = col.getValue ? col.getValue(item) : item[col.key] || '';
        if (typeof value === 'string') {
          value = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            value = `"${value}"`;
          }
        }
        return value;
      }).join(',');
    });

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    return { success: true, count: data.length };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
