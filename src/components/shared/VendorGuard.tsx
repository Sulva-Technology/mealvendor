'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/src/lib/auth/session';

/**
 * Gates the vendor app. A vendor can be authenticated but not yet linked to a
 * vendor record — in that case the access token has no `vendor_id` and every
 * vendor route returns 403. Such users are sent to /onboarding until done.
 */
export function VendorGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const vendorId = useAuthStore((s) => s.vendorId);

  // Wait for zustand's persisted state to hydrate before deciding, otherwise we
  // could redirect a logged-in vendor on the first paint.
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  const needsOnboarding = hydrated && !!accessToken && !vendorId;

  useEffect(() => {
    if (needsOnboarding && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [needsOnboarding, pathname, router]);

  if (!hydrated || needsOnboarding) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return <>{children}</>;
}
