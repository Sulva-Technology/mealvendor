'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Clock, ImageIcon, Lock, Plus, Search, UtensilsCrossed } from 'lucide-react';
import { TonalCard } from '@/src/components/shared/Cards';
import { EmptyState, ErrorState, LoadingState } from '@/src/components/shared/QueryStates';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { inventoryApi, menuApi, qk } from '@/src/lib/api/vendor';
import type { VendorMenuItem } from '@/src/lib/api/types';
import { formatNaira, todayIso } from '@/src/lib/format';
import { useVendorApproval } from '@/src/lib/hooks/useVendorApproval';

export default function MenuPage() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { isApproved } = useVendorApproval();
  const today = todayIso();

  const query = useQuery({ queryKey: qk.menuItems(), queryFn: menuApi.list, refetchOnMount: 'always' });
  const inventoryQ = useQuery({ queryKey: qk.inventory(today), queryFn: () => inventoryApi.list(today) });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => (active ? menuApi.deactivate(id) : menuApi.activate(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.menuItems() }),
  });

  const soldOut = useMutation({
    mutationFn: async (item: VendorMenuItem) => {
      const rows = (inventoryQ.data ?? []).filter((row) => row.menuItemId === item.id);
      if (rows.length === 0) throw new Error('No inventory row exists for this item today. Open inventory after schedule generation.');
      await Promise.all(
        rows.map((row) => {
          const targetTotal = Math.max(row.quantityReserved + row.quantitySold - row.quantityAdjusted, 0);
          return inventoryApi.update(row.id, { quantityTotal: targetTotal, expectedVersion: row.version });
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.inventory(today) }),
  });

  const items = (query.data ?? []).filter((item) =>
    !search.trim() ? true : item.name.toLowerCase().includes(search.toLowerCase()) || item.categoryName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Menu Items</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Manage dishes, pricing, availability, images, and daily stock state.</p>
        </div>
        {isApproved ? (
          <Link
            href="/menu/new/edit"
            className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-primary)]/90"
          >
            <Plus className="h-4 w-4" />
            Add item
          </Link>
        ) : (
          <span title="Available once your vendor account is approved" className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-[var(--color-muted-foreground)]">
            <Lock className="h-4 w-4" />
            Add item
          </span>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-muted-foreground)]" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search menu items"
          className="w-full rounded-lg border border-[var(--color-border)] bg-white py-2 pl-9 pr-4 text-sm transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
      </div>

      {(toggle.isError || soldOut.isError) && (
        <p className="text-sm text-[var(--color-error)]">{((toggle.error || soldOut.error) as Error).message}</p>
      )}

      {query.isLoading ? (
        <LoadingState label="Loading menu..." />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="No menu items" description="Add your first dish to start receiving orders." icon={UtensilsCrossed} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const rows = (inventoryQ.data ?? []).filter((row) => row.menuItemId === item.id);
            const remaining = rows.reduce((sum, row) => sum + row.remainingQuantity, 0);
            const outToday = rows.length > 0 && remaining <= 0;
            const unavailable = !item.active || outToday || item.soldOut;
            return (
              <TonalCard key={item.id} className="flex flex-col p-5">
                <div className="mb-4 aspect-[4/3] overflow-hidden rounded-lg border border-[var(--color-border)] bg-gray-50">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className={`h-full w-full object-cover ${unavailable ? 'grayscale' : ''}`} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--color-muted-foreground)]">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>

                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/menu/${item.id}/edit`} className="text-base font-semibold text-[var(--color-foreground)] transition-colors hover:text-[var(--color-primary)]">
                      {item.name}
                    </Link>
                    <p className="text-sm capitalize text-[var(--color-muted-foreground)]">{item.categoryName || 'Uncategorized'} / {item.unitCode}</p>
                    {item.description && <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">{item.description}</p>}
                  </div>
                  <StatusChip status={unavailable ? 'warning' : 'success'} label={outToday ? 'Sold out' : item.active ? 'Available' : 'Unavailable'} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Meta label="Prep" value={item.prepTimeMinutes ? `${item.prepTimeMinutes} min` : 'Not set'} icon={Clock} />
                  <Meta label="Today stock" value={rows.length ? String(remaining) : 'No row'} />
                  <Meta label="Daily limit" value={item.dailyQuantityLimit ? String(item.dailyQuantityLimit) : 'Backend not set'} />
                  <Meta label="Dietary" value={item.dietaryTags?.length ? item.dietaryTags.join(', ') : 'None'} />
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-4">
                  <span className="text-lg font-bold tabular-nums text-[var(--color-foreground)]">{formatNaira(item.priceKobo)}</span>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      onClick={() => soldOut.mutate(item)}
                      disabled={soldOut.isPending || !isApproved || inventoryQ.isLoading}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      Sold out
                    </button>
                    <button
                      onClick={() => toggle.mutate({ id: item.id, active: item.active })}
                      disabled={toggle.isPending || !isApproved}
                      title={!isApproved ? 'Available once your vendor account is approved' : undefined}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/5 disabled:opacity-50"
                    >
                      {item.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <Link href={`/menu/${item.id}/edit`} className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white">
                      Edit
                    </Link>
                  </div>
                </div>

                <p className="mt-3 flex items-start gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                  <Archive className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Backend must enforce unavailable/sold-out checkout rejection.
                </p>
              </TonalCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Meta({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-gray-50 p-2">
      <p className="flex items-center gap-1 text-[var(--color-muted-foreground)]">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="mt-1 truncate font-medium text-[var(--color-foreground)]" title={value}>{value}</p>
    </div>
  );
}
