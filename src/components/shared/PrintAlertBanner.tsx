'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { printingApi, qk } from '@/src/lib/api/vendor';
import { unprintedTickets } from '@/src/lib/print-alerts';
import { FeatureFlag, useFeatureFlag } from '@/src/lib/hooks/useFeatureFlag';

/** "N tickets not printed" warning shown across the portal while cloud printing is on. */
export function PrintAlertBanner() {
  const enabled = useFeatureFlag(FeatureFlag.CLOUD_PRINTING);
  const pathname = usePathname();
  const jobsQ = useQuery({
    queryKey: qk.printJobs(),
    queryFn: () => printingApi.jobs({ limit: 50 }),
    enabled,
    refetchInterval: 60_000,
  });

  if (!enabled || pathname === '/printers') return null;
  const stuck = unprintedTickets(jobsQ.data ?? []);
  if (stuck.length === 0) return null;

  return (
    <Link
      href="/printers"
      className="flex items-center gap-3 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-3 text-sm text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
    >
      <Printer className="h-5 w-5 shrink-0" />
      <span>
        <strong>{stuck.length} ticket{stuck.length === 1 ? '' : 's'} not printed.</strong> Check the printer (power, paper,
        Wi-Fi), then reprint from the order.
      </span>
    </Link>
  );
}
