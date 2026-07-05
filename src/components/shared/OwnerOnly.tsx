'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useVendorRole } from '@/src/lib/hooks/useVendorRole';

/**
 * Wraps owner-only routes (e.g. Settlements). Staff are redirected to the
 * dashboard — this blocks direct-URL entry, complementing the nav item being
 * hidden. The backend also rejects staff, so this is purely UX.
 */
export function OwnerOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isOwner, isStaff, isLoading } = useVendorRole();

  useEffect(() => {
    if (!isLoading && isStaff) router.replace('/');
  }, [isLoading, isStaff, router]);

  if (isLoading || !isOwner) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return <>{children}</>;
}
