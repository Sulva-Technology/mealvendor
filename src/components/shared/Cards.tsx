import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function TonalCard({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={twMerge(clsx("bg-white rounded-[var(--radius-xl)] shadow-sm border border-[var(--color-border)] p-6", className))}>
      {children}
    </div>
  );
}

export function MetricCard({ title, value, subtext, icon: Icon, trend }: { title: string, value: string, subtext?: string, icon?: React.ElementType, trend?: 'up' | 'down' | 'neutral' }) {
  return (
    <TonalCard className="flex flex-col">
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium text-[var(--color-muted-foreground)] tracking-tight">{title}</h3>
        {Icon && <Icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />}
      </div>
      <div className="mt-2 flex items-baseline gap-x-2">
        <span className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)] tabular-nums">{value}</span>
      </div>
      {subtext && (
        <div className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          {subtext}
        </div>
      )}
    </TonalCard>
  );
}
