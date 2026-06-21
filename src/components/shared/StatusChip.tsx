import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'default';

export function StatusChip({ status, label, className }: { status: StatusType, label: string, className?: string }) {
  const getColors = () => {
    switch (status) {
      case 'success':
        return 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20';
      case 'warning':
        return 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20';
      case 'error':
        return 'bg-[var(--color-error)]/10 text-[var(--color-error)] border-[var(--color-error)]/20';
      case 'info':
        return 'bg-[var(--color-info)]/10 text-[var(--color-info)] border-[var(--color-info)]/20';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={twMerge(clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border", getColors(), className))}>
      {label}
    </span>
  );
}
