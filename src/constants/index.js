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
