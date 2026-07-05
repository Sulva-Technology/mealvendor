'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Clock, Layers, MapPin, Package, Truck } from 'lucide-react';
import { TonalCard } from '@/src/components/shared/Cards';
import { EmptyState, ErrorState, LoadingState } from '@/src/components/shared/QueryStates';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { batchesApi, qk } from '@/src/lib/api/vendor';
import type { BatchSummary } from '@/src/lib/api/types';
import { batchStatusChip, formatDate, formatTime, prettifyEnum } from '@/src/lib/format';
import { batchLocationLabel, batchReadyCounts, handoffStatusLabel } from '@/src/lib/vendor-workflow';

export default function BatchesPage() {
  const query = useQuery({ queryKey: qk.batches(), queryFn: batchesApi.list });
  const batches = query.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Order Batches</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">Track grouped orders, readiness, pickup time, and rider assignment.</p>
      </div>

      {query.isLoading ? (
        <LoadingState label="Loading batches..." />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : batches.length === 0 ? (
        <EmptyState title="No batches" description="Batches appear once orders are grouped into delivery slots." icon={Layers} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {batches.map((batch) => (
            <BatchCard key={batch.id} summary={batch} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A batch card enriched with its detail (orders). Batch summaries carry no
 * orders, so readiness counts and the location label were wrong/stale on the
 * list — we fetch the detail (cached, matches the detail page) to stay in sync.
 */
function BatchCard({ summary }: { summary: BatchSummary }) {
  const detail = useQuery({
    queryKey: qk.batch(summary.id),
    queryFn: () => batchesApi.get(summary.id),
    staleTime: 30_000,
  });

  const batch = detail.data ?? summary;
  const counts = batchReadyCounts(batch);
  const active = ['open', 'assigned', 'in_progress'].includes(batch.status);
  const location = batchLocationLabel(batch);
  const rider = batch.riderAssigned || batch.riderName ? batch.riderName || 'Assigned' : 'Not assigned';

  return (
    <TonalCard className={`p-0 overflow-hidden ${active ? 'border-[var(--color-primary)]/40' : ''}`}>
      <div className="border-b border-[var(--color-border)] bg-gray-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-[var(--color-foreground)]">
              {location ? <MapPin className="h-4 w-4 shrink-0 text-[var(--color-primary)]" /> : null}
              <span className="truncate">{location || batch.batchNumber}</span>
            </h3>
            <p className="truncate font-mono text-xs text-[var(--color-muted-foreground)]">{batch.batchNumber}</p>
          </div>
          <StatusChip status={batchStatusChip(batch.status)} label={prettifyEnum(batch.status)} />
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3">
        <Metric icon={Package} label="Orders" value={String(batch.orderCount)} />
        <Metric icon={Clock} label="Ready / not ready" value={`${counts.ready} / ${counts.notReady}`} />
        <Metric icon={Truck} label="Rider" value={rider} />
      </div>

      <div className="grid gap-3 border-t border-[var(--color-border)] px-4 py-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-[var(--color-muted-foreground)]">Delivery date</p>
          <p className="font-medium">{formatDate(batch.serviceDate)}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">Pickup {batch.pickupTime ? formatTime(batch.pickupTime) : formatTime(batch.cutoffAt)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-[var(--color-muted-foreground)]">Created</p>
          <p className="font-medium">{formatTime(batch.createdAt)}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">{formatDate(batch.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-[var(--color-muted-foreground)]">Handoff</p>
          <p className="font-medium">{batch.handoffStatus || handoffStatusLabel(batch)}</p>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] bg-gray-50 p-3">
        <Link
          href={`/batches/${batch.id}`}
          className="flex w-full items-center justify-center rounded-md py-2 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
        >
          View batch detail
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </TonalCard>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white p-3">
      <div className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="font-semibold text-[var(--color-foreground)]">{value}</p>
    </div>
  );
}
