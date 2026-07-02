'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TonalCard } from '@/src/components/shared/Cards';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { LoadingState, ErrorState, EmptyState } from '@/src/components/shared/QueryStates';
import { ordersApi, qk } from '@/src/lib/api/vendor';
import type { OrderSummary } from '@/src/lib/api/types';
import { formatNaira, formatTime, orderStatusChip, orderStatusLabel, orderVendorTotalKobo } from '@/src/lib/format';
import { Search, Box, Check } from 'lucide-react';

const FILTERS = ['all', 'paid', 'accepted', 'preparing', 'ready', 'delivered'] as const;

// Orders the vendor can still accept — the only status eligible for bulk accept.
const ACCEPTABLE = new Set(['paid', 'confirmed']);

// The list endpoint returns OrderSummary WITHOUT line items, so each row lazily
// fetches its own detail (cached by react-query) to show what was ordered.
function OrderItems({ id, fallback }: { id: string; fallback: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.order(id),
    queryFn: () => ordersApi.get(id),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <span className="inline-block h-4 w-32 rounded bg-gray-100 animate-pulse align-middle" />;
  }
  if (isError || !data || data.items.length === 0) {
    return <span className="text-[var(--color-muted-foreground)]">{fallback}</span>;
  }

  const summary = data.items.map((it) => `${it.quantity}× ${it.itemName}`).join(', ');
  return (
    <span className="text-[var(--color-foreground)]" title={summary}>
      {summary}
    </span>
  );
}

export default function OrdersPage() {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: qk.orders({ status: filter }),
    queryFn: () => ordersApi.list(filter === 'all' ? {} : { status: filter }),
  });

  const orders = (query.data ?? []).filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.locationName?.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q)
    );
  });

  const acceptable = orders.filter((o) => ACCEPTABLE.has(o.orderStatus));
  const selectedAcceptable = acceptable.filter((o) => selected.has(o.id));
  const allSelected = acceptable.length > 0 && selectedAcceptable.length === acceptable.length;

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(() => (allSelected ? new Set() : new Set(acceptable.map((o) => o.id))));

  const acceptSelected = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => ordersApi.accept(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'order'] });
      setSelected(new Set());
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Orders</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Manage and track customer orders here.</p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-muted-foreground)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order # or location…"
              className="w-full pl-9 pr-4 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pb-2 overflow-x-auto hide-scrollbar">
        {FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === status
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'bg-white text-[var(--color-muted-foreground)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
            }`}
          >
            {status === 'all' ? 'All' : orderStatusLabel(status)}
          </button>
        ))}
      </div>

      {selectedAcceptable.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-4 py-3">
          <span className="text-sm font-medium text-[var(--color-foreground)]">
            {selectedAcceptable.length} order(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-[var(--color-muted-foreground)] hover:underline"
            >
              Clear
            </button>
            <button
              onClick={() => acceptSelected.mutate(selectedAcceptable.map((o) => o.id))}
              disabled={acceptSelected.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {acceptSelected.isPending ? 'Accepting…' : `Accept ${selectedAcceptable.length} order(s)`}
            </button>
          </div>
        </div>
      )}

      {acceptSelected.isError && (
        <p className="text-sm text-[var(--color-error)]">
          {(acceptSelected.error as Error).message}
        </p>
      )}

      <TonalCard className="p-0 overflow-hidden">
        {query.isLoading ? (
          <div className="p-6">
            <LoadingState label="Loading orders…" rows={4} />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : orders.length === 0 ? (
          <EmptyState title="No orders found" description="Orders for the selected filter will appear here." icon={Box} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[var(--color-muted-foreground)] uppercase bg-gray-50/50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-4 py-4 font-medium w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={acceptable.length === 0}
                      aria-label="Select all acceptable orders"
                      className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-primary)] disabled:opacity-40"
                    />
                  </th>
                  <th className="px-6 py-4 font-medium">Order</th>
                  <th className="px-6 py-4 font-medium">Location</th>
                  <th className="px-6 py-4 font-medium">Slot</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {orders.map((order: OrderSummary) => {
                  const canSelect = ACCEPTABLE.has(order.orderStatus);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
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
                        <div className="flex items-center gap-2">
                          <Box className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                          <div className="min-w-0">
                            <OrderItems id={order.id} fallback={order.orderNumber} />
                            <p className="text-xs text-[var(--color-muted-foreground)]">{order.orderNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{order.locationName || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md bg-gray-100 text-gray-800 text-xs font-medium">
                          {order.deliverySlotName || formatTime(order.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-[var(--color-foreground)] tabular-nums">
                        {formatNaira(orderVendorTotalKobo(order))}
                      </td>
                      <td className="px-6 py-4">
                        <StatusChip status={orderStatusChip(order.orderStatus)} label={orderStatusLabel(order.orderStatus)} />
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/orders/${order.id}`} className="text-[var(--color-primary)] font-medium hover:underline text-sm">
                          Manage
                        </Link>
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
