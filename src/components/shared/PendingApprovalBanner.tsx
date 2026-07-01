import React from 'react';
import { Clock } from 'lucide-react';
import { useVendorApproval } from '@/src/lib/hooks/useVendorApproval';

export function PendingApprovalBanner() {
  const { status, isLoading } = useVendorApproval();

  if (isLoading || status === 'approved') return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-[var(--color-warning)]/20 bg-[var(--color-warning)]/10 px-4 py-3 text-sm text-[var(--color-warning)]">
      <Clock className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Your vendor account is awaiting admin approval. Menu, payout, and availability actions unlock once you&apos;re
        approved.
      </span>
    </div>
  );
}
