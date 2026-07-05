'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi, qk } from '@/src/lib/api/vendor';

/**
 * Renders "2x Jollof, 1x Water" for an order by fetching its detail (order
 * summaries carry no line items). Shared by the orders board and batch detail
 * so vendors can see what was ordered without opening the order.
 */
export function OrderItemsInline({ id, fallback }: { id: string; fallback: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.order(id),
    queryFn: () => ordersApi.get(id),
    staleTime: 30_000,
  });

  if (isLoading) return <span className="inline-block h-4 w-32 animate-pulse rounded bg-gray-100 align-middle" />;
  if (isError || !data || data.items.length === 0) {
    return <span className="text-[var(--color-muted-foreground)]">{fallback}</span>;
  }

  const summary = data.items.map((item) => `${item.quantity}x ${item.itemName}`).join(', ');
  return (
    <span className="text-[var(--color-foreground)]" title={summary}>
      {summary}
    </span>
  );
}
