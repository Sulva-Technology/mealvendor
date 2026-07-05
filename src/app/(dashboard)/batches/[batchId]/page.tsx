'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, Package, ShoppingBag, Truck } from 'lucide-react';
import { SupportAction } from '@/src/components/shared/SupportAction';
import { TonalCard } from '@/src/components/shared/Cards';
import { ErrorState, LoadingState } from '@/src/components/shared/QueryStates';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { batchesApi, ordersApi, qk } from '@/src/lib/api/vendor';
import type { BatchDetail } from '@/src/lib/api/types';
import { batchStatusChip, formatDate, formatDateTime, formatNaira, formatTime, orderStatusChip, orderStatusLabel, orderVendorTotalKobo, prettifyEnum } from '@/src/lib/format';
import { batchReadyCounts, canBatchMoveToReady, canMarkReady, handoffStatusLabel, riderAssignmentLabel, vendorOrderStage } from '@/src/lib/vendor-workflow';

export default function BatchDetailPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = use(params);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: qk.batch(batchId), queryFn: () => batchesApi.get(batchId) });

  const onSuccess = (updated: BatchDetail) => {
    queryClient.setQueryData(qk.batch(batchId), updated);
    queryClient.invalidateQueries({ queryKey: qk.batches() });
    queryClient.invalidateQueries({ queryKey: ['vendor', 'orders'] });
    setSelected(new Set());
  };

  const markSelectedReady = useMutation({
    mutationFn: async (ids: string[]) => {
      try {
        return await batchesApi.markOrdersReady(batchId, ids);
      } catch (error) {
        // Per-order fallback. The backend state machine is accept -> preparing
        // -> ready, so an order still in `accepted` must be started preparing
        // before `/ready`, otherwise the transition is rejected.
        const byId = new Map(orders.map((order) => [order.id, order]));
        await Promise.all(
          ids.map(async (id) => {
            const order = byId.get(id);
            if (order && vendorOrderStage(order.orderStatus) === 'accepted') {
              await ordersApi.preparing(id);
            }
            await ordersApi.ready(id);
          })
        );
        return batchesApi.get(batchId);
      }
    },
    onSuccess,
  });

  const markAllReady = useMutation({ mutationFn: () => batchesApi.readyForPickup(batchId), onSuccess });
  const pickup = useMutation({ mutationFn: () => batchesApi.pickup(batchId), onSuccess });

  if (query.isLoading) return <LoadingState label="Loading batch..." />;
  if (query.isError || !query.data) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const batch = query.data;
  const orders = batch.orders ?? [];
  const counts = batchReadyCounts(batch);
  const readyable = orders.filter(canMarkReady);
  const selectedReadyable = readyable.filter((order) => selected.has(order.id));
  const allSelected = readyable.length > 0 && selectedReadyable.length === readyable.length;
  const pending = markSelectedReady.isPending || markAllReady.isPending || pickup.isPending;
  const mutationError = markSelectedReady.error || markAllReady.error || pickup.error;

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link href="/batches" className="rounded-md border border-[var(--color-border)] bg-white p-2 transition-colors hover:bg-gray-50">
            <ArrowLeft className="h-5 w-5 text-[var(--color-muted-foreground)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Batch {batch.batchNumber}</h1>
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              {formatDate(batch.serviceDate)} / Pickup {batch.pickupTime ? formatTime(batch.pickupTime) : formatTime(batch.cutoffAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={batchStatusChip(batch.status)} label={prettifyEnum(batch.status)} />
          <SupportAction subjectType="batch" subjectId={batch.id} defaultCategory="rider_delay" label="Report issue" />
          {canBatchMoveToReady(batch) && (
            <button
              onClick={() => markAllReady.mutate()}
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-60"
            >
              <CheckCircle className="h-4 w-4" />
              {markAllReady.isPending ? 'Working...' : 'Mark all ready'}
            </button>
          )}
          {batch.status === 'closed' && (
            <button
              onClick={() => pickup.mutate()}
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-60"
            >
              <Truck className="h-4 w-4" />
              {pickup.isPending ? 'Working...' : 'Confirm rider pickup'}
            </button>
          )}
        </div>
      </div>

      {selectedReadyable.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-4 py-3">
          <p className="text-sm font-medium">{selectedReadyable.length} valid order(s) selected</p>
          <button
            onClick={() => markSelectedReady.mutate(selectedReadyable.map((order) => order.id))}
            disabled={pending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Mark selected ready
          </button>
        </div>
      )}

      {mutationError && <p className="text-sm text-[var(--color-error)]">{(mutationError as Error).message}</p>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <TonalCard className="p-0 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-gray-50 p-4">
              <ShoppingBag className="h-5 w-5 text-[var(--color-muted-foreground)]" />
              <h2 className="text-base font-semibold text-[var(--color-foreground)]">Orders ({orders.length})</h2>
            </div>
            {orders.length === 0 ? (
              <p className="p-6 text-sm text-[var(--color-muted-foreground)]">No orders in this batch yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-[var(--color-border)] bg-gray-50/50 text-xs uppercase text-[var(--color-muted-foreground)]">
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          disabled={readyable.length === 0}
                          onChange={() => setSelected(allSelected ? new Set() : new Set(readyable.map((order) => order.id)))}
                          className="h-4 w-4 accent-[var(--color-primary)] disabled:opacity-40"
                        />
                      </th>
                      <th className="px-4 py-3 font-medium">Order</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Rider</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selected.has(order.id)}
                            disabled={!canMarkReady(order)}
                            onChange={() => toggleOne(order.id)}
                            className="h-4 w-4 accent-[var(--color-primary)] disabled:opacity-30"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <Link href={`/orders/${order.id}`} className="font-mono text-sm font-semibold text-[var(--color-primary)] hover:underline">
                            {order.orderNumber}
                          </Link>
                          <p className="text-xs text-[var(--color-muted-foreground)]">{order.locationName || 'No location'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <StatusChip status={orderStatusChip(order.orderStatus)} label={orderStatusLabel(order.orderStatus)} />
                        </td>
                        <td className="px-4 py-4 text-xs text-[var(--color-muted-foreground)]">{riderAssignmentLabel(order)}</td>
                        <td className="px-4 py-4 font-medium tabular-nums">{formatNaira(orderVendorTotalKobo(order))}</td>
                        <td className="px-4 py-4 text-right">
                          <Link href={`/orders/${order.id}`} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TonalCard>
        </div>

        <div className="space-y-6">
          <TonalCard>
            <h3 className="mb-4 text-sm font-semibold text-[var(--color-foreground)]">Batch summary</h3>
            <div className="space-y-3 text-sm">
              <Summary label="Batch ID" value={batch.id.slice(0, 12) + '...'} />
              <Summary label="Orders" value={String(batch.orderCount)} />
              <Summary label="Ready" value={String(counts.ready)} />
              <Summary label="Not ready" value={String(counts.notReady)} />
              <Summary label="Rider assigned" value={batch.riderAssigned || batch.riderName ? batch.riderName || 'Yes' : 'No'} />
              <Summary label="Handoff status" value={batch.handoffStatus || handoffStatusLabel(batch)} />
              <Summary label="Pickup timestamp" value={batch.riderPickedUpAt ? formatDateTime(batch.riderPickedUpAt) : 'Pending'} />
            </div>
          </TonalCard>

          <TonalCard className="border-[var(--color-info)]/20 bg-[var(--color-info)]/5 shadow-sm">
            <div className="mb-2 flex items-center gap-3">
              <Truck className="h-5 w-5 text-[var(--color-info)]" />
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Rider handoff</h3>
            </div>
            <p className="text-sm font-medium capitalize text-[var(--color-foreground)]">{batch.deliveryMode?.replace(/_/g, ' ')}</p>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Handoff code: {batch.handoffCode || 'Not provided yet'}
            </p>
          </TonalCard>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
