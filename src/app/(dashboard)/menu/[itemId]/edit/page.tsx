'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TonalCard } from '@/src/components/shared/Cards';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { LoadingState, ErrorState } from '@/src/components/shared/QueryStates';
import { menuApi, qk } from '@/src/lib/api/vendor';
import type { CreateMenuItemBody } from '@/src/lib/api/types';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function EditMenuItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const router = useRouter();
  const { itemId } = use(params);
  const isNew = itemId === 'new';
  const queryClient = useQueryClient();

  const metaQ = useQuery({ queryKey: qk.menuMetadata(), queryFn: menuApi.metadata });
  const itemQ = useQuery({ queryKey: qk.menuItem(itemId), queryFn: () => menuApi.get(itemId), enabled: !isNew });
  const schedulesQ = useQuery({
    queryKey: qk.menuSchedules(itemId),
    queryFn: () => menuApi.listSchedules(itemId),
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    name: '',
    description: '',
    unitTypeId: '',
    categoryId: '',
    priceNaira: '',
    displayOrder: '0',
  });
  const [saved, setSaved] = useState(false);

  // Hydrate the form once the item loads (edit mode).
  useEffect(() => {
    const it = itemQ.data;
    if (it) {
      setForm({
        name: it.name,
        description: it.description ?? '',
        unitTypeId: it.unitTypeId,
        categoryId: it.categoryId ?? '',
        priceNaira: String(it.priceKobo / 100),
        displayOrder: String(it.displayOrder ?? 0),
      });
    }
  }, [itemQ.data]);

  // Default unit type for new items once metadata is available.
  useEffect(() => {
    if (isNew && !form.unitTypeId && metaQ.data?.unitTypes?.length) {
      setForm((f) => ({ ...f, unitTypeId: metaQ.data!.unitTypes[0].id }));
    }
  }, [isNew, metaQ.data, form.unitTypeId]);

  const save = useMutation({
    mutationFn: async () => {
      const body: CreateMenuItemBody = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        unitTypeId: form.unitTypeId,
        categoryId: form.categoryId || undefined,
        priceKobo: Math.round(Number(form.priceNaira) * 100),
        displayOrder: Number(form.displayOrder) || 0,
      };
      return isNew ? menuApi.create(body) : menuApi.update(itemId, body);
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: qk.menuItems() });
      if (isNew) {
        router.replace(`/menu/${item.id}/edit`);
      } else {
        queryClient.invalidateQueries({ queryKey: qk.menuItem(itemId) });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    },
  });

  const toggleActive = useMutation({
    mutationFn: () => (itemQ.data?.active ? menuApi.deactivate(itemId) : menuApi.activate(itemId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.menuItem(itemId) });
      queryClient.invalidateQueries({ queryKey: qk.menuItems() });
    },
  });

  const saveSchedules = useMutation({
    mutationFn: (entries: NonNullable<typeof schedulesQ.data>) => menuApi.replaceSchedules(itemId, entries),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.menuSchedules(itemId) }),
  });

  if (!isNew && itemQ.isLoading) return <LoadingState label="Loading item…" />;
  if (!isNew && itemQ.isError) return <ErrorState error={itemQ.error} onRetry={() => itemQ.refetch()} />;

  const active = itemQ.data?.active ?? true;
  const schedules = schedulesQ.data ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass p-4 rounded-xl sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/menu" className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <ArrowLeft className="h-5 w-5 text-[var(--color-muted-foreground)]" />
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-[var(--color-muted-foreground)]">Menu</span>
            <span className="text-[var(--color-muted-foreground)]">/</span>
            <span className="font-semibold text-[var(--color-foreground)] truncate max-w-[150px] sm:max-w-xs">
              {isNew ? 'New Item' : `Edit ${itemQ.data?.name ?? ''}`}
            </span>
          </div>
          {!isNew && (
            <StatusChip status={active ? 'success' : 'default'} label={active ? 'Active' : 'Inactive'} className="ml-2" />
          )}
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          {!isNew && (
            <button
              onClick={() => toggleActive.mutate()}
              disabled={toggleActive.isPending}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 flex-1 sm:flex-none text-[var(--color-foreground)] transition-colors disabled:opacity-50"
            >
              {active ? 'Deactivate' : 'Activate'}
            </button>
          )}
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.name || !form.unitTypeId || !form.priceNaira}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary)]/90 flex-1 sm:flex-none flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {save.isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {save.isPending ? 'Saving…' : saved ? 'Saved' : isNew ? 'Create Item' : 'Save Changes'}
          </button>
        </div>
      </div>

      {save.isError && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{(save.error as Error).message}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TonalCard>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-foreground)] mb-6">Item Details</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-foreground)]">Name</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-foreground)]">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-foreground)]">Unit Type</label>
                  <select
                    value={form.unitTypeId}
                    onChange={(e) => setForm((f) => ({ ...f, unitTypeId: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  >
                    <option value="">Select…</option>
                    {metaQ.data?.unitTypes.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-foreground)]">Price (₦)</label>
                  <input
                    required
                    min="0"
                    step="10"
                    type="number"
                    value={form.priceNaira}
                    onChange={(e) => setForm((f) => ({ ...f, priceNaira: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-md text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-foreground)]">Category</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  >
                    <option value="">Uncategorized</option>
                    {metaQ.data?.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-foreground)]">Display Order</label>
                  <input
                    type="number"
                    min="0"
                    value={form.displayOrder}
                    onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-md text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                </div>
              </div>
            </form>
          </TonalCard>

          {!isNew && (
            <TonalCard>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">Schedule Availability</h2>
                {schedules.length > 0 && (
                  <button
                    onClick={() => saveSchedules.mutate(schedules)}
                    disabled={saveSchedules.isPending}
                    className="text-sm font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
                  >
                    {saveSchedules.isPending ? 'Saving…' : 'Save schedule'}
                  </button>
                )}
              </div>
              {schedulesQ.isLoading ? (
                <LoadingState label="Loading schedule…" rows={2} />
              ) : schedules.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  No slot schedules configured for this item yet. Slots are derived from your campus delivery
                  slots — once configured they will appear here as per-day toggles.
                </p>
              ) : (
                <div className="space-y-2">
                  {schedules.map((s, idx) => (
                    <label
                      key={`${s.deliverySlotId}-${s.dayOfWeek}`}
                      className="flex items-center justify-between gap-3 p-3 border border-[var(--color-border)] rounded-lg"
                    >
                      <span className="text-sm font-medium text-[var(--color-foreground)]">
                        {DAYS[s.dayOfWeek] ?? `Day ${s.dayOfWeek}`} • slot {s.deliverySlotId.slice(0, 8)}
                      </span>
                      <input
                        type="checkbox"
                        checked={s.available}
                        onChange={(e) => {
                          const next = [...schedules];
                          next[idx] = { ...s, available: e.target.checked };
                          queryClient.setQueryData(qk.menuSchedules(itemId), next);
                        }}
                        className="w-4 h-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                    </label>
                  ))}
                </div>
              )}
            </TonalCard>
          )}
        </div>

        <div className="space-y-6">
          <TonalCard className="bg-gray-50 border-[var(--color-border)]">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--color-muted-foreground)] shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-[var(--color-foreground)]">Read-only snapshot</p>
                <p className="text-[var(--color-muted-foreground)] mt-1">
                  Changes apply to future orders only. Historical orders keep the snapshot from when they were placed.
                </p>
              </div>
            </div>
            {!isNew && itemQ.data && (
              <div className="space-y-2 pt-4 mt-4 border-t border-[var(--color-border)] text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted-foreground)]">Item ID</span>
                  <span className="font-mono text-xs">{itemQ.data.id.slice(0, 12)}…</span>
                </div>
              </div>
            )}
          </TonalCard>

          {!isNew && (
            <TonalCard className="border-[var(--color-primary)]/20 shadow-sm">
              <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-2">Inventory</h3>
              <p className="text-sm text-[var(--color-muted-foreground)] mb-4">Manage daily stock for this item.</p>
              <Link href="/inventory" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                Open Inventory →
              </Link>
            </TonalCard>
          )}
        </div>
      </div>
    </div>
  );
}
