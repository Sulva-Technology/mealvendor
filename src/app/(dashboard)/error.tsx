'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h2 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] mb-2">
        Something went wrong!
      </h2>
      <p className="text-[var(--color-muted-foreground)] mb-6 max-w-md">
        We encountered an error loading this section of the portal. It might be a temporary issue.
      </p>
      
      {error.digest && (
        <p className="text-xs font-mono text-gray-500 mb-8 bg-gray-100 p-2 rounded">
          Error Ref: {error.digest}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 bg-[var(--color-primary)] text-white font-medium rounded-lg shadow-sm hover:bg-[var(--color-primary)]/90 transition-colors"
        >
          Try again
        </button>
        <Link 
          href="/" 
          className="px-6 py-2.5 border border-[var(--color-border)] text-[var(--color-foreground)] font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
