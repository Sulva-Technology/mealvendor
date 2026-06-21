'use client';

import React from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--color-background)] px-4">
      <div className="text-center max-w-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 mb-6">
          <WifiOff className="h-10 w-10 text-gray-500" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] mb-2">You are offline</h1>
        <p className="text-[var(--color-muted-foreground)] mb-8">
          It looks like you&apos;ve lost your internet connection. Some features of the Vendor Portal require an active connection.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-3 bg-[var(--color-primary)] text-white font-medium rounded-lg shadow-sm hover:bg-[var(--color-primary)]/90 transition-colors w-full"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
