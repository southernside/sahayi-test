import React from 'react';
import { getStatusMeta } from '@/lib/constants';
import type { ComplaintStatus } from '@sahayi/types';

interface StatusBadgeProps {
  status: ComplaintStatus | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const meta = getStatusMeta(status);
  return (
    <span
      className={`badge ${meta.bgColor} ${meta.color} ${
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : ''
      }`}
    >
      {meta.label}
    </span>
  );
}
