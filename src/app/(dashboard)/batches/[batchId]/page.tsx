'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, MapPin, ShoppingBag, Truck } from 'lucide-react';
import { SupportAction } from '@/src/components/shared/SupportAction';
import { TonalCard } from '@/src/components/shared/Cards';
import { OrderItemsInline } from '@/src/components/shared/OrderItemsInline';
import { ErrorState, LoadingState } from '@/src/components/shared/QueryStates';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { batchesApi, ordersApi, qk } from '@/src/lib/api/vendor';
import type { BatchDetail, OrderSummary } from '@/src/lib/api/types';
import { features } from '@/src/config/features';
import { batchStatusChip, formatDate, formatDateTime, formatTime, orderStatusChip, orderStatusLabel, prettifyEnum } from '@/src/lib/format';
import {
  batchLocationLabel,
  batchReadyCounts,
  canBatchMoveToReady,
  handoffStatusLabel,
  nextOrderAction,
  orderActionLabel,
  vendorOrderStage,
} from '@/src/lib/vendor-workflow';

type NextAction = NonNullable<ReturnType<typeof nextOrderAction>>;

/** v2 collapse: a paid ("new") order goes straight to ready in one call. The
 * accept/preparing intermediate steps no longer exist. */
async function advanceOrderToReady(order: OrderSummary): Promise<void> {
  if (vendorOrderStage(order.orderStatus) === 'new') {
    await ordersApi.ready(order.id);
  }
}

export default function BatchDetailPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = use(params);
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: qk.batch(batchId), queryFn: () => batchesApi.get(batchId) });

  const onSuccess = (updated: BatchDetail) => {
    queryClient.setQueryData(qk.batch(batchId), updated);
    queryClient.invalidateQueries({ queryKey: qk.batches() });
    queryClient.invalidateQueries({ queryKey: ['vendor', 'orders'] });
    queryClient.invalidateQueries({ queryKey: ['vendor', 'order'] });
  };

  // One order, one step forward (paid -> ready, or confirm rider pickup).
  const runStep = useMutation({
    mutationFn: async ({ order, action }: { order: OrderSummary; action: NextAction }) => {
      if (action === 'ready') await ordersApi.ready(order.id);
      else await ordersApi.confirmRiderPickup(order.id);
      return batchesApi.get(batchId);
    },
    onSuccess,
  });

  // Advance every not-yet-ready order all the way to ready, one legal step at a
  // time. Falls back to per-order chaining if the batch endpoint rejects.
  const markAllReady = useMutation({
    mutationFn: async () => {
      const targets = orders.filter((o) => vendorOrderStage(o.orderStatus) === 'new');
      await Promise.all(targets.map(advanceOrderToReady));
      try {
        return await batchesApi.readyForPickup(batchId);
      } catch {
        return batchesApi.get(batchId);
      }
    },
    onSuccess,
  });

  const pickup = useMutation({ mutationFn: () => batchesApi.pickup(batchId), onSuccess });

  if (query.isLoading) return <LoadingState label="Loading batch..." />;
  if (query.isError || !query.data) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const batch = query.data;
  const orders = batch.orders ?? [];
  const counts = batchReadyCounts(batch);
  const location = batchLocationLabel(batch);
  const pending = runStep.isPending || markAllReady.isPending || pickup.isPending;
  const mutationError = runStep.error || markAllReady.error || pickup.error;
  const hasReadyable = orders.some((o) => vendorOrderStage(o.orderStatus) === 'new');

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link href="/batches" className="rounded-md border border-[var(--color-border)] bg-white p-2 transition-colors hover:bg-gray-50">
            <ArrowLeft className="h-5 w-5 text-[var(--color-muted-foreground)]" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
              {location ? <MapPin className="h-5 w-5 text-[var(--color-primary)]" /> : null}
              {location || `Batch ${batch.batchNumber}`}
            </h1>
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              {formatDate(batch.serviceDate)} · Pickup {batch.pickupTime ? formatTime(batch.pickupTime) : formatTime(batch.cutoffAt)} · Created {formatTime(batch.createdAt)}
            </p>
            <p className="font-mono text-xs text-[var(--color-muted-foreground)]">{batch.batchNumber}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={batchStatusChip(batch.status)} label={prettifyEnum(batch.status)} />
          <SupportAction subjectType="batch" subjectId={batch.id} defaultCategory="rider_delay" label="Report issue" />
          {canBatchMoveToReady(batch) && hasReadyable && (
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
              <ul className="divide-y divide-[var(--color-border)]">
                {orders.map((order) => {
                  const rawAction = nextOrderAction(order.orderStatus);
                  const action = rawAction === 'confirm_pickup' && !features.orderHandoffConfirm ? null : rawAction;
                  return (
                    <li key={order.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--color-foreground)]">
                          <OrderItemsInline id={order.id} fallback={order.orderNumber} />
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                          <MapPin className="h-3 w-3" />
                          {order.locationName || 'No location'}
                          {order.roomNumber ? ` · Room ${order.roomNumber}` : ''}
                          <span className="text-[var(--color-border)]">·</span>
                          <span className="font-mono">{order.orderNumber}</span>
                        </p>
                        {order.specialNotes && (
                          <p className="mt-1 truncate text-xs text-[var(--color-warning)]" title={order.specialNotes}>
                            Note: {order.specialNotes}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <StatusChip status={orderStatusChip(order.orderStatus)} label={orderStatusLabel(order.orderStatus)} />
                        {action && (
                          <button
                            onClick={() => runStep.mutate({ order, action })}
                            disabled={pending}
                            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
                          >
                            {runStep.isPending ? 'Working...' : orderActionLabel(action)}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </TonalCard>
        </div>

        <div className="space-y-6">
          <TonalCard>
            <h3 className="mb-4 text-sm font-semibold text-[var(--color-foreground)]">Batch summary</h3>
            <div className="space-y-3 text-sm">
              <Summary label="Location" value={location || '—'} />
              <Summary label="Delivery date" value={formatDate(batch.serviceDate)} />
              <Summary label="Pickup time" value={batch.pickupTime ? formatTime(batch.pickupTime) : formatTime(batch.cutoffAt)} />
              <Summary label="Created" value={formatDateTime(batch.createdAt)} />
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
