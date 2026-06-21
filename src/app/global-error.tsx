'use client';

import React from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-background)] px-4">
          <div className="text-center max-w-sm">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] mb-2">Something went wrong</h1>
            <p className="text-[var(--color-muted-foreground)] mb-6 text-sm">
              We encountered an unexpected error loading the Vendor Portal.
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-gray-500 mb-8 bg-gray-100 p-2 rounded block">
                Ref: {error.digest}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => reset()}
                className="px-6 py-2.5 border border-[var(--color-border)] text-[var(--color-foreground)] font-medium rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
               >
                Try Again
              </button>
              <Link 
                href="/"
                className="px-6 py-2.5 bg-[var(--color-primary)] text-white font-medium rounded-lg shadow-sm hover:bg-[var(--color-primary)]/90 transition-colors"
               >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
