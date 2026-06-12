import React from 'react';
import { getCategoryMeta } from '@/lib/constants';
import type { ComplaintCategory } from '@sahayi/types';

interface CategoryChipProps {
  category: ComplaintCategory | string;
  size?: 'sm' | 'md';
}

export function CategoryChip({ category, size = 'md' }: CategoryChipProps) {
  const meta = getCategoryMeta(category);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold
        ${meta.bgColor} ${meta.color} ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : ''}`}
    >
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  );
}
