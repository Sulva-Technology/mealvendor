'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TonalCard } from '@/src/components/shared/Cards';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { LoadingState, ErrorState, EmptyState } from '@/src/components/shared/QueryStates';
import { menuApi, qk } from '@/src/lib/api/vendor';
import { formatNaira } from '@/src/lib/format';
import { useVendorApproval } from '@/src/lib/hooks/useVendorApproval';
import { Lock, Plus, Search, UtensilsCrossed } from 'lucide-react';

export default function MenuPage() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { isApproved } = useVendorApproval();

  const query = useQuery({ queryKey: qk.menuItems(), queryFn: menuApi.list });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? menuApi.deactivate(id) : menuApi.activate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.menuItems() }),
  });

  const items = (query.data ?? []).filter((i) =>
    !search.trim() ? true : i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Menu Items</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Manage your food offerings and base prices.</p>
        </div>
        {isApproved ? (
          <Link
            href="/menu/new/edit"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Link>
        ) : (
          <span
            title="Available once your vendor account is approved"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-[var(--color-muted-foreground)] text-sm font-medium rounded-lg cursor-not-allowed"
          >
            <Lock className="h-4 w-4" />
            Add Item
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1 sm:w-80 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu items…"
            className="w-full pl-9 pr-4 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-colors"
          />
        </div>
      </div>

      {query.isLoading ? (
        <LoadingState label="Loading menu…" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No menu items"
          description="Add your first dish to start receiving orders."
          icon={UtensilsCrossed}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <TonalCard key={item.id} className="flex flex-col p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Link href={`/menu/${item.id}/edit`} className="text-base font-semibold text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors">
                    {item.name}
                  </Link>
                  <p className="text-sm text-[var(--color-muted-foreground)] capitalize">
                    {item.categoryName || 'Uncategorized'} • {item.unitCode}
                  </p>
                </div>
                <button
                  onClick={() => toggle.mutate({ id: item.id, active: item.active })}
                  disabled={toggle.isPending || !isApproved}
                  title={!isApproved ? 'Available once your vendor account is approved' : undefined}
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                >
                  {item.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
                <span className="text-lg font-bold text-[var(--color-foreground)] tabular-nums">
                  {formatNaira(item.priceKobo)}
                </span>
                <StatusChip status={item.active ? 'success' : 'default'} label={item.active ? 'Active' : 'Inactive'} />
              </div>
            </TonalCard>
          ))}
        </div>
      )}
    </div>
  );
}
