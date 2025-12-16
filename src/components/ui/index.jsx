export { Button } from './Button';
export { Input, TextArea, Select } from './Input';
export { Card } from './Card';
export { Badge, CustomTooltip } from './Badge';
export { ProgressBar, CircularProgress } from './ProgressBar';
export { SearchInput } from './SearchInput';
export { ViewToggle } from './ViewToggle';
export { Modal, ConfirmationModal } from './Modal';
export { FilterTag } from './FilterTag';
export { EmptyState } from './EmptyState';

// Custom Sparkles icon
export const Sparkles = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/><path d="M9 3v4"/><path d="M3 5h4"/><path d="M3 9h4"/>
  </svg>
);
