'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Printer } from 'lucide-react';
import { TonalCard } from './Cards';
import { Modal } from './Modal';
import { ApiError } from '@/src/lib/api/client';
import { printingApi, qk } from '@/src/lib/api/vendor';
import { FeatureFlag, useFeatureFlag } from '@/src/lib/hooks/useFeatureFlag';

/** Kitchen-ticket preview + reprint for one paid order (cloud printing feature). */
export function KitchenTicketCard({ orderId, paid }: { orderId: string; paid: boolean }) {
  const enabled = useFeatureFlag(FeatureFlag.CLOUD_PRINTING);
  const queryClient = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);

  const receiptQ = useQuery({
    queryKey: qk.receipt(orderId),
    queryFn: () => printingApi.receipt(orderId),
    enabled: enabled && previewOpen,
  });
  const reprint = useMutation({
    mutationFn: () => printingApi.reprint(orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendor', 'print-jobs'] }),
  });

  if (!enabled || !paid) return null;

  const reprintError =
    reprint.error instanceof ApiError && reprint.error.status === 409
      ? 'No printer connected. Add one under Printers.'
      : (reprint.error as Error | null)?.message;

  return (
    <TonalCard>
      <h3 className="mb-1 text-sm font-semibold text-[var(--color-foreground)]">Kitchen ticket</h3>
      <p className="mb-4 text-xs text-[var(--color-muted-foreground)]">Prints automatically at the slot cutoff.</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setPreviewOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white py-2 text-sm font-medium hover:bg-gray-50"
        >
          <Eye className="h-4 w-4" /> Preview
        </button>
        <button
          onClick={() => reprint.mutate()}
          disabled={reprint.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          <Printer className="h-4 w-4" /> {reprint.isPending ? 'Sending…' : 'Reprint'}
        </button>
      </div>
      {reprint.isSuccess && <p className="mt-3 text-xs text-[var(--color-success)]">Ticket sent to the printer.</p>}
      {reprintError && <p className="mt-3 text-xs text-[var(--color-error)]">{reprintError}</p>}

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Ticket preview" description="Exactly what the printer receives.">
        {receiptQ.isLoading ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">Loading…</p>
        ) : receiptQ.isError ? (
          <p className="text-sm text-[var(--color-error)]">{(receiptQ.error as Error).message}</p>
        ) : (
          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-gray-50 p-3 font-mono text-[11px] leading-snug">
            {receiptQ.data?.text}
          </pre>
        )}
      </Modal>
    </TonalCard>
  );
}
