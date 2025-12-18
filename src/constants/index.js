// Standard checklist items for deployments
export const STANDARD_CHECKLIST = [
  "Requirements Finalized", "API Ready", "Backend Ready", "Frontend Ready",
  "Test Cases Approved", "UAT Completed", "Release Notes Added",
  "Documentation Uploaded", "Go-Live Validation Completed"
];

// Documentation types for products
export const DOC_TYPES = [
  { key: 'productGuide', label: 'Product Guide' },
  { key: 'releaseNotes', label: 'Release Notes' },
  { key: 'demoScript', label: 'Demo Script' },
  { key: 'testCases', label: 'Test Cases' },
  { key: 'productionChecklist', label: 'Prod Checklist' }
];

// Deployment types
export const DEPLOYMENT_TYPES = [
  { key: 'ga', label: 'General Availability (GA)', description: 'General availability release for all clients' },
  { key: 'eap', label: 'Early Access Program (EAP)', description: 'Early access release for select clients' },
  { key: 'generic', label: 'Generic', description: 'Standard deployment for all clients' },
  { key: 'client-specific', label: 'Client-Specific', description: 'Customized for specific client needs' }
];

// Deployment statuses
export const DEPLOYMENT_STATUSES = ['Not Started', 'In Progress', 'Blocked', 'Released'];

// Kanban columns
export const KANBAN_COLUMNS = [
  { id: 'Not Started', label: 'Not Started', color: 'border-slate-400', bgColor: 'bg-slate-50 dark:bg-slate-900/50' },
  { id: 'In Progress', label: 'In Progress', color: 'border-blue-400', bgColor: 'bg-blue-50/50 dark:bg-blue-900/20' },
  { id: 'Blocked', label: 'Blocked', color: 'border-rose-400', bgColor: 'bg-rose-50/50 dark:bg-rose-900/20' },
  { id: 'Released', label: 'Released', color: 'border-emerald-400', bgColor: 'bg-emerald-50/50 dark:bg-emerald-900/20' }
];

// Avatar colors for consistent coloring based on name
export const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500'
];

export const PRODUCT_AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500',
  'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500'
];

// Product export columns for CSV
export const PRODUCT_EXPORT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'parentId', label: 'Parent ID' },
  { key: 'parentName', label: 'Parent Name' },
  { key: 'description', label: 'Description' },
  { key: 'productOwner', label: 'Product Owner' },
  { key: 'engineeringOwner', label: 'Engineering Owner' },
  { key: 'nextReleaseDate', label: 'Next Release Date' },
];

// Deployment export columns for CSV
export const DEPLOYMENT_EXPORT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'clientName', label: 'Client' },
  { key: 'productName', label: 'Product' },
  { key: 'status', label: 'Status' },
  { key: 'deploymentType', label: 'Type' },
  { key: 'nextDeliveryDate', label: 'Target Date' },
];

// Client export columns for CSV
export const CLIENT_EXPORT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'comments', label: 'Notes' },
];

// Release note item types
export const RELEASE_NOTE_TYPES = [
  { key: 'feature', label: 'New Feature', icon: 'Sparkles', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', emoji: '✨' },
  { key: 'improvement', label: 'Improvement', icon: 'TrendingUp', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', emoji: '📈' },
  { key: 'bugfix', label: 'Bug Fix', icon: 'Bug', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30', emoji: '🐛' },
  { key: 'security', label: 'Security', icon: 'Shield', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', emoji: '🔒' },
  { key: 'performance', label: 'Performance', icon: 'Zap', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', emoji: '⚡' },
  { key: 'breaking', label: 'Breaking Change', icon: 'AlertTriangle', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', emoji: '⚠️' },
  { key: 'deprecated', label: 'Deprecated', icon: 'Clock', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800', emoji: '🕐' },
  { key: 'docs', label: 'Documentation', icon: 'FileText', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/30', emoji: '📚' },
];
