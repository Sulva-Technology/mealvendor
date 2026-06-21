import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-[var(--color-foreground)] mb-2">404</h1>
      <p className="text-[var(--color-muted-foreground)] mb-8 max-w-md">
        The page you are looking for does not exist or you do not have permission to access it.
      </p>
      <div className="flex justify-center flex-wrap gap-4">
        <Link 
          href="/" 
          className="px-6 py-2.5 bg-[var(--color-primary)] text-white font-medium rounded-lg shadow-sm hover:bg-[var(--color-primary)]/90 transition-colors flex items-center justify-center"
        >
          Return to Dashboard
        </Link>
        <Link 
          href={process.env.NEXT_PUBLIC_SUPPORT_URL || "#"} 
          target="_blank"
          className="px-6 py-2.5 border border-[var(--color-border)] text-[var(--color-foreground)] font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
