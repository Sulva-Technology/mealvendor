'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { TonalCard } from '@/src/components/shared/Cards';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { LoadingState, ErrorState, EmptyState } from '@/src/components/shared/QueryStates';
import { ordersApi, qk } from '@/src/lib/api/vendor';
import { formatNaira, formatTime, orderStatusChip, orderStatusLabel } from '@/src/lib/format';
import { Search, Box } from 'lucide-react';

const FILTERS = ['all', 'paid', 'accepted', 'preparing', 'ready', 'delivered'] as const;

export default function OrdersPage() {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

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
                  <th className="px-6 py-4 font-medium">Order #</th>
                  <th className="px-6 py-4 font-medium">Location</th>
                  <th className="px-6 py-4 font-medium">Slot</th>
                  <th className="px-6 py-4 font-medium">Total</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-[var(--color-foreground)]">
                      <div className="flex items-center gap-2">
                        <Box className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                        {order.orderNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4">{order.locationName || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md bg-gray-100 text-gray-800 text-xs font-medium">
                        {order.deliverySlotName || formatTime(order.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-[var(--color-foreground)] tabular-nums">
                      {formatNaira(order.totalKobo)}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TonalCard>
    </div>
  );
}
