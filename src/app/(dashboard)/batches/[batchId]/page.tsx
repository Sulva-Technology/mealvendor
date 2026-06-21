'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TonalCard } from '@/src/components/shared/Cards';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { LoadingState, ErrorState } from '@/src/components/shared/QueryStates';
import { batchesApi, qk } from '@/src/lib/api/vendor';
import type { BatchDetail } from '@/src/lib/api/types';
import { formatNaira, formatDate, formatTime, orderStatusChip, orderStatusLabel, batchStatusChip, prettifyEnum } from '@/src/lib/format';
import { ArrowLeft, Truck, CheckCircle, Package, ShoppingBag } from 'lucide-react';

export default function BatchDetailPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = use(params);
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: qk.batch(batchId), queryFn: () => batchesApi.get(batchId) });

  const onSuccess = (updated: BatchDetail) => {
    queryClient.setQueryData(qk.batch(batchId), updated);
    queryClient.invalidateQueries({ queryKey: qk.batches() });
  };
  const readyM = useMutation({ mutationFn: () => batchesApi.readyForPickup(batchId), onSuccess });
  const pickupM = useMutation({ mutationFn: () => batchesApi.pickup(batchId), onSuccess });

  if (query.isLoading) return <LoadingState label="Loading batch…" />;
  if (query.isError || !query.data) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const batch = query.data;
  const orders = batch.orders ?? [];
  const pending = readyM.isPending || pickupM.isPending;

  // Aggregate item manifest across the batch's orders (uses item-level data when present).
  const manifest = new Map<string, { name: string; unit: string; qty: number }>();
  for (const o of orders as any[]) {
    for (const it of o.items ?? []) {
      const key = `${it.itemName}-${it.unitType}`;
      const cur = manifest.get(key) ?? { name: it.itemName, unit: it.unitType, qty: 0 };
      cur.qty += it.quantity;
      manifest.set(key, cur);
    }
  }

  let primaryAction: { label: string; run: () => void } | null = null;
  if (batch.status === 'open' || batch.status === 'in_progress' || batch.status === 'assigned') {
    primaryAction = { label: 'Mark Ready for Pickup', run: () => readyM.mutate() };
  } else if (batch.status === 'closed') {
    primaryAction = { label: 'Confirm Pickup', run: () => pickupM.mutate() };
  }

  const mutationError = readyM.error || pickupM.error;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/batches" className="p-2 hover:bg-gray-100 rounded-md transition-colors bg-white border border-[var(--color-border)]">
            <ArrowLeft className="h-5 w-5 text-[var(--color-muted-foreground)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Batch {batch.batchNumber}</h1>
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              {formatDate(batch.serviceDate)} • Cutoff {formatTime(batch.cutoffAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <StatusChip status={batchStatusChip(batch.status)} label={prettifyEnum(batch.status)} />
          {primaryAction && (
            <button
              onClick={primaryAction.run}
              disabled={pending}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors shadow-sm disabled:opacity-60"
            >
              <CheckCircle className="w-4 h-4" />
              {pending ? 'Working…' : primaryAction.label}
            </button>
          )}
        </div>
      </div>

      {mutationError && (
        <p className="text-sm text-[var(--color-error)]">{(mutationError as Error).message}</p>
      )}

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {manifest.size > 0 && (
            <TonalCard className="p-0 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-[var(--color-border)] flex items-center gap-2">
                <Package className="w-5 h-5 text-[var(--color-muted-foreground)]" />
                <h2 className="text-base font-semibold text-[var(--color-foreground)]">Consolidated Manifest</h2>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/50 text-xs text-[var(--color-muted-foreground)] uppercase border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-6 py-3 font-medium">Item</th>
                    <th className="px-6 py-3 font-medium text-center">Unit</th>
                    <th className="px-6 py-3 font-medium text-right">Total Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {[...manifest.values()].map((m) => (
                    <tr key={`${m.name}-${m.unit}`}>
                      <td className="px-6 py-4 font-semibold text-[var(--color-foreground)]">{m.name}</td>
                      <td className="px-6 py-4 text-center capitalize text-[var(--color-muted-foreground)]">{m.unit}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold tabular-nums">
                          {m.qty}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TonalCard>
          )}

          <TonalCard className="p-0 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-[var(--color-border)] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[var(--color-muted-foreground)]" />
              <h2 className="text-base font-semibold text-[var(--color-foreground)]">Orders ({orders.length})</h2>
            </div>
            {orders.length === 0 ? (
              <p className="p-6 text-sm text-[var(--color-muted-foreground)]">No orders in this batch yet.</p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {orders.map((o) => (
                  <div key={o.id} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:bg-gray-50/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link href={`/orders/${o.id}`} className="font-mono text-sm font-semibold text-[var(--color-primary)] hover:underline">
                          {o.orderNumber}
                        </Link>
                        <StatusChip status={orderStatusChip(o.orderStatus)} label={orderStatusLabel(o.orderStatus)} />
                      </div>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {o.locationName} • {formatNaira(o.totalKobo)}
                      </p>
                    </div>
                    <Link
                      href={`/orders/${o.id}`}
                      className="w-full sm:w-auto px-4 py-2 border border-[var(--color-border)] rounded-md text-sm font-medium text-center text-[var(--color-foreground)] bg-white hover:bg-gray-50 transition-colors"
                    >
                      Manage
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </TonalCard>
        </div>

        <div className="space-y-6">
          <TonalCard>
            <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-4">Batch Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-muted-foreground)]">Status</span>
                <StatusChip status={batchStatusChip(batch.status)} label={prettifyEnum(batch.status)} />
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-muted-foreground)]">Orders</span>
                <span className="font-semibold tabular-nums">{batch.orderCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-muted-foreground)]">Delivery earnings</span>
                <span className="font-semibold tabular-nums">{formatNaira(batch.deliveryEarningsKobo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-muted-foreground)]">Closed at</span>
                <span className="font-medium">{batch.closedAt ? formatTime(batch.closedAt) : '—'}</span>
              </div>
            </div>
          </TonalCard>

          <TonalCard className="bg-[var(--color-info)]/5 border border-[var(--color-info)]/20 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Truck className="w-5 h-5 text-[var(--color-info)]" />
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Delivery Mode</h3>
            </div>
            <p className="text-sm text-[var(--color-foreground)] font-medium capitalize">
              {batch.deliveryMode?.replace(/_/g, ' ')}
            </p>
          </TonalCard>
        </div>
      </div>
    </div>
  );
}
