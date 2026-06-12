import type { CategoryMeta, StatusMeta } from '@sahayi/types';

export const CATEGORIES: CategoryMeta[] = [
  {
    value: 'ROAD',
    label: 'Road',
    icon: '🛣️',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
  },
  {
    value: 'WATER',
    label: 'Water',
    icon: '💧',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  {
    value: 'ELECTRICITY',
    label: 'Electricity',
    icon: '⚡',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
  },
  {
    value: 'STREET_LIGHT',
    label: 'Street Light',
    icon: '💡',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
  },
];

export const STATUSES: StatusMeta[] = [
  { value: 'DRAFT',              label: 'Draft',              color: 'text-slate-600',  bgColor: 'bg-slate-100' },
  { value: 'SUBMITTED',          label: 'Submitted',          color: 'text-sky-700',    bgColor: 'bg-sky-50',  step: 1 },
  { value: 'PENDING',            label: 'Pending Review',     color: 'text-amber-700',  bgColor: 'bg-amber-50', step: 2 },
  { value: 'ASSIGNED',           label: 'Assigned',           color: 'text-blue-700',   bgColor: 'bg-blue-50', step: 3 },
  { value: 'ESCALATED',          label: 'Escalated',          color: 'text-orange-700', bgColor: 'bg-orange-50' },
  { value: 'MORE_INFO_REQUIRED', label: 'Action Needed',      color: 'text-red-700',    bgColor: 'bg-red-50' },
  { value: 'UNDER_VERIFICATION', label: 'Under Verification', color: 'text-indigo-700', bgColor: 'bg-indigo-50', step: 4 },
  { value: 'IN_PROGRESS',        label: 'In Progress',        color: 'text-teal-700',   bgColor: 'bg-teal-50', step: 5 },
  { value: 'RESOLVED',           label: 'Resolved',           color: 'text-green-700',  bgColor: 'bg-green-50', step: 6 },
  { value: 'REOPENED',           label: 'Reopened',           color: 'text-orange-700', bgColor: 'bg-orange-50' },
  { value: 'REJECTED',           label: 'Rejected',           color: 'text-red-700',    bgColor: 'bg-red-50' },
  { value: 'CLOSED',             label: 'Closed',             color: 'text-slate-600',  bgColor: 'bg-slate-100', step: 7 },
];

export function getStatusMeta(status: string): StatusMeta {
  return STATUSES.find((s) => s.value === status) ?? STATUSES[0];
}

export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
}

export const STATUS_PROGRESS_STEPS = [
  'SUBMITTED', 'PENDING', 'ASSIGNED', 'UNDER_VERIFICATION', 'IN_PROGRESS', 'RESOLVED', 'CLOSED',
];
