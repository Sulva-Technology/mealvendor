'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Check, Clock, CreditCard, Search, Truck, UserRound } from 'lucide-react';
import { TonalCard } from '@/src/components/shared/Cards';
import { OrderItemsInline } from '@/src/components/shared/OrderItemsInline';
import { EmptyState, ErrorState, LoadingState } from '@/src/components/shared/QueryStates';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { ordersApi, qk } from '@/src/lib/api/vendor';
import type { OrderSummary } from '@/src/lib/api/types';
import { features } from '@/src/config/features';
import { formatDate, formatNaira, formatTime, orderStatusChip, orderStatusLabel, orderVendorTotalKobo } from '@/src/lib/format';
import {
  canRunOrderAction,
  customerSafeId,
  nextOrderAction,
  orderActionLabel,
  paymentStatusLabel,
  riderAssignmentLabel,
  vendorOrderStage,
  vendorOrderStageLabel,
} from '@/src/lib/vendor-workflow';

const FILTERS = ['all', 'paid', 'ready', 'out_for_delivery', 'delivered', 'cancelled'] as const;
// v2 collapse: a "new" order is simply paid-and-not-yet-ready.
const ACCEPTABLE = new Set(['paid']);

type NextAction = NonNullable<ReturnType<typeof nextOrderAction>>;

export default function OrdersPage() {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: qk.orders({ status: filter }),
    queryFn: () => ordersApi.list(filter === 'all' ? {} : { status: filter }),
    // Live board: poll while the tab is visible so new paid orders appear
    // without a manual reload. react-query pauses this in background tabs.
    refetchInterval: 45_000,
  });

  const orders = (query.data ?? []).filter((order) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(q) ||
      order.locationName?.toLowerCase().includes(q) ||
      order.id.toLowerCase().includes(q)
    );
  });

  const acceptable = orders.filter((order) => ACCEPTABLE.has(order.orderStatus));
  const selectedAcceptable = acceptable.filter((order) => selected.has(order.id));
  const allSelected = acceptable.length > 0 && selectedAcceptable.length === acceptable.length;

  const invalidateOrders = () => {
    queryClient.invalidateQueries({ queryKey: ['vendor', 'orders'] });
    queryClient.invalidateQueries({ queryKey: ['vendor', 'order'] });
  };

  const acceptSelected = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => ordersApi.ready(id)));
    },
    onSuccess: () => {
      invalidateOrders();
      setSelected(new Set());
    },
  });

  const runAction = useMutation({
    mutationFn: ({ order, action }: { order: OrderSummary; action: NextAction }) => {
      if (!canRunOrderAction(order, action)) throw new Error('Invalid status transition for this order.');
      if (action === 'ready') return ordersApi.ready(order.id);
      return ordersApi.confirmRiderPickup(order.id);
    },
    onSuccess: invalidateOrders,
  });

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => setSelected(() => (allSelected ? new Set() : new Set(acceptable.map((order) => order.id))));

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Orders</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Mark ready, hand off, and resolve vendor orders.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search order or location"
            className="w-full rounded-lg border border-[var(--color-border)] bg-white py-2 pl-9 pr-4 text-sm transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'border border-[var(--color-border)] bg-white text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)]/50'
            }`}
          >
            {status === 'all' ? 'All' : orderStatusLabel(status)}
          </button>
        ))}
      </div>

      {selectedAcceptable.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-4 py-3">
          <span className="text-sm font-medium text-[var(--color-foreground)]">{selectedAcceptable.length} new order(s) selected</span>
          {/* v2 collapse: bulk action moves paid orders straight to ready. */}
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(new Set())} className="text-sm text-[var(--color-muted-foreground)] hover:underline">
              Clear
            </button>
            <button
              onClick={() => acceptSelected.mutate(selectedAcceptable.map((order) => order.id))}
              disabled={acceptSelected.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {acceptSelected.isPending ? 'Working...' : `Mark ${selectedAcceptable.length} ready`}
            </button>
          </div>
        </div>
      )}

      {(acceptSelected.isError || runAction.isError) && (
        <p className="text-sm text-[var(--color-error)]">{((acceptSelected.error || runAction.error) as Error).message}</p>
      )}

      <TonalCard className="p-0 overflow-hidden">
        {query.isLoading ? (
          <div className="p-6">
            <LoadingState label="Loading orders..." rows={4} />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : orders.length === 0 ? (
          <EmptyState title="No orders found" description="Paid customer orders for this filter appear here." icon={Box} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="border-b border-[var(--color-border)] bg-gray-50/50 text-xs uppercase text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="w-10 px-4 py-4 font-medium">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={acceptable.length === 0}
                      aria-label="Select all acceptable orders"
                      className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)] disabled:opacity-40"
                    />
                  </th>
                  <th className="px-6 py-4 font-medium">Order ID / items</th>
                  <th className="px-6 py-4 font-medium">Schedule</th>
                  <th className="px-6 py-4 font-medium">Customer / type</th>
                  <th className="px-6 py-4 font-medium">Payment / rider</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium">Current status</th>
                  <th className="px-6 py-4 font-medium">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {orders.map((order) => {
                  const canSelect = ACCEPTABLE.has(order.orderStatus);
                  const rawAction = nextOrderAction(order.orderStatus);
                  // Hide rider-pickup confirm until the backend ships the endpoint.
                  const action = rawAction === 'confirm_pickup' && !features.orderHandoffConfirm ? null : rawAction;
                  const stage = vendorOrderStage(order.orderStatus);
                  return (
                    <tr key={order.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selected.has(order.id)}
                          onChange={() => toggleOne(order.id)}
                          disabled={!canSelect}
                          aria-label={`Select order ${order.orderNumber}`}
                          className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)] disabled:opacity-30"
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-[var(--color-foreground)]">
                        <div className="flex items-start gap-2">
                          <Box className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                          <div className="min-w-0">
                            <OrderItemsInline id={order.id} fallback={order.orderNumber} />
                            <p className="text-xs text-[var(--color-muted-foreground)]">{order.orderNumber}</p>
                            {order.specialNotes && (
                              <p className="mt-1 max-w-xs truncate text-xs text-[var(--color-warning)]" title={order.specialNotes}>
                                Note: {order.specialNotes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-foreground)]">
                            <Clock className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                            {formatDate(order.serviceDate)} · {order.scheduledAt ? formatTime(order.scheduledAt) : order.deliverySlotName || formatTime(order.createdAt)}
                          </span>
                          <span className="block text-xs text-[var(--color-muted-foreground)]">Placed {formatTime(order.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="flex items-center gap-1.5 text-xs font-medium">
                            <UserRound className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                            {customerSafeId(order.customerId)}
                          </span>
                          <span className="block text-xs capitalize text-[var(--color-muted-foreground)]">
                            {order.deliveryMode?.replace(/_/g, ' ') || 'Delivery'} / {order.locationName || 'No location'}
                            {order.roomNumber ? ` · Room ${order.roomNumber}` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="flex items-center gap-1.5 text-xs font-medium">
                            <CreditCard className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                            {paymentStatusLabel(order)}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                            <Truck className="h-3.5 w-3.5" />
                            {riderAssignmentLabel(order)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium tabular-nums text-[var(--color-foreground)]">
                        {formatNaira(orderVendorTotalKobo(order))}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <StatusChip status={orderStatusChip(order.orderStatus)} label={orderStatusLabel(order.orderStatus)} />
                          <p className="text-xs text-[var(--color-muted-foreground)]">{vendorOrderStageLabel(stage)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {action && (
                            <button
                              onClick={() => runAction.mutate({ order, action })}
                              disabled={runAction.isPending}
                              className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
                            >
                              {runAction.isPending ? 'Working...' : orderActionLabel(action)}
                            </button>
                          )}
                          <Link href={`/orders/${order.id}`} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                            Detail
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TonalCard>
    </div>
  );
}
