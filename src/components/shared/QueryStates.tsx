'use client';

import React from 'react';
import { Loader2, AlertCircle, Inbox, RefreshCcw } from 'lucide-react';
import { ApiError } from '@/src/lib/api/client';

export function LoadingState({ label = 'Loading…', rows }: { label?: string; rows?: number }) {
  // After a few seconds, hint that a cold backend may be waking up so a long
  // wait doesn't look like a hang.
  const [slow, setSlow] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, []);

  if (rows) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-gray-100" />
          ))}
        </div>
        {slow && (
          <p className="text-center text-xs text-[var(--color-muted-foreground)]">
            Waking up the server — this can take ~30s on the first request.
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
      <p className="text-sm text-[var(--color-muted-foreground)]">{label}</p>
      {slow && (
        <p className="max-w-xs text-xs text-[var(--color-muted-foreground)]">
          Waking up the server — the first request after a pause can take ~30s.
        </p>
      )}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const apiErr = error instanceof ApiError ? error : null;
  const message =
    apiErr?.message || (error instanceof Error ? error.message : 'Something went wrong.');
  const offline = apiErr?.status === 0;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="p-3 rounded-full bg-[var(--color-error)]/10">
        <AlertCircle className="h-6 w-6 text-[var(--color-error)]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--color-foreground)]">
          {offline ? 'Connection problem' : 'Could not load data'}
        </p>
        <p className="mt-1 max-w-sm text-sm text-[var(--color-muted-foreground)]">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-gray-50"
        >
          <RefreshCcw className="h-4 w-4" /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title = 'Nothing here yet',
  description,
  icon: Icon = Inbox,
}: {
  title?: string;
  description?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Icon className="h-8 w-8 text-[var(--color-muted-foreground)] opacity-50" />
      <p className="text-sm font-medium text-[var(--color-foreground)]">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-[var(--color-muted-foreground)]">{description}</p>
      )}
    </div>
  );
}

/**
 * Convenience wrapper: renders loading/error states and only calls `children`
 * once data is present.
 */
export function QueryBoundary<T>({
  query,
  loading,
  children,
}: {
  query: { isLoading: boolean; isError: boolean; error: unknown; data: T | undefined; refetch: () => void };
  loading?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}) {
  if (query.isLoading) return <>{loading ?? <LoadingState />}</>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data === undefined) return <ErrorState error={null} onRetry={() => query.refetch()} />;
  return <>{children(query.data)}</>;
}
