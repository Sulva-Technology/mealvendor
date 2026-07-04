'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { TonalCard } from '@/src/components/shared/Cards';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { Modal } from '@/src/components/shared/Modal';
import { SupportAction } from '@/src/components/shared/SupportAction';
import { LoadingState, ErrorState } from '@/src/components/shared/QueryStates';
import { inventoryApi, menuApi, qk } from '@/src/lib/api/vendor';
import type { VendorInventory } from '@/src/lib/api/types';
import { formatNaira, todayIso, formatDateTime, formatDate } from '@/src/lib/format';
import {
  Calendar as CalendarIcon,
  Layers,
  SlidersHorizontal,
  AlertCircle,
  CalendarClock,
  UtensilsCrossed,
  Search,
  ChevronDown,
} from 'lucide-react';

type RowStatus = 'out' | 'low' | 'in';

function statusOf(row: VendorInventory): RowStatus {
  if (row.remainingQuantity <= 0) return 'out';
  if (row.remainingQuantity <= Math.max(2, Math.ceil(row.quantityTotal * 0.2))) return 'low';
  return 'in';
}

function AdjustModal({
  row,
  date,
  onClose,
}: {
  row: VendorInventory;
  date: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<'add' | 'remove'>('remove');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const magnitude = Math.abs(Number(amount)) || 0;
  const signed = direction === 'add' ? magnitude : -magnitude;
  const valid = magnitude > 0 && reason.trim().length > 0;

  const adjust = useMutation({
    mutationFn: () =>
      inventoryApi.adjust(row.id, { adjustmentQuantity: signed, reason: reason.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.inventory(date) });
      onClose();
    },
  });

  const adjustments = row.adjustments ?? [];

  return (
    <Modal
      open
      onClose={onClose}
      title="Adjust stock"
      description={`${row.menuItemName} • ${row.deliverySlotName}`}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 border border-[var(--color-border)] p-3">
            <p className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wide">Total</p>
            <p className="font-semibold tabular-nums">{row.quantityTotal}</p>
          </div>
          <div className="rounded-lg bg-gray-50 border border-[var(--color-border)] p-3">
            <p className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wide">Sold</p>
            <p className="font-semibold tabular-nums">{row.quantitySold}</p>
          </div>
          <div className="rounded-lg bg-gray-50 border border-[var(--color-border)] p-3">
            <p className="text-xs text-[var(--color-muted-foreground)] uppercase tracking-wide">Remaining</p>
            <p className="font-semibold tabular-nums">{row.remainingQuantity}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDirection('remove')}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              direction === 'remove'
                ? 'border-[var(--color-error)]/40 bg-[var(--color-error)]/10 text-[var(--color-error)]'
                : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-gray-50'
            }`}
          >
            Remove stock
          </button>
          <button
            type="button"
            onClick={() => setDirection('add')}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              direction === 'add'
                ? 'border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]'
                : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-gray-50'
            }`}
          >
            Add stock
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-foreground)]">Quantity</label>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-md text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-foreground)]">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. spoilage, miscount, restock"
            className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>

        {adjust.isError && (
          <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{(adjust.error as Error).message}</span>
          </div>
        )}

        {adjustments.length > 0 && (
          <div className="pt-2 border-t border-[var(--color-border)]">
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide mb-2">
              Recent adjustments
            </p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {adjustments.slice(0, 6).map((a) => (
                <div key={a.id} className="flex justify-between items-center text-sm">
                  <span className="text-[var(--color-muted-foreground)] truncate mr-2">
                    {a.reason}
                    <span className="text-xs ml-2 opacity-70">{formatDateTime(a.createdAt)}</span>
                  </span>
                  <span
                    className={`font-medium tabular-nums shrink-0 ${
                      a.adjustmentQuantity < 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'
                    }`}
                  >
                    {a.adjustmentQuantity > 0 ? '+' : ''}
                    {a.adjustmentQuantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium text-[var(--color-foreground)] hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => adjust.mutate()}
            disabled={!valid || adjust.isPending}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50"
          >
            {adjust.isPending ? 'Applying…' : 'Apply adjustment'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function InventoryRow({ row, date }: { row: VendorInventory; date: string }) {
  const queryClient = useQueryClient();
  const [qty, setQty] = useState<string>(String(row.quantityTotal));
  const [adjusting, setAdjusting] = useState(false);
  const dirty = Number(qty) !== row.quantityTotal;

  const save = useMutation({
    mutationFn: () =>
      inventoryApi.update(row.id, { quantityTotal: Number(qty), expectedVersion: row.version }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.inventory(date) }),
  });

  const status = statusOf(row);

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-6 py-3.5 font-medium text-[var(--color-foreground)]">{row.deliverySlotName}</td>
      <td className="px-6 py-3.5 tabular-nums text-[var(--color-muted-foreground)]">
        <div className="flex flex-col">
          <span>{row.remainingQuantity}</span>
          {status === 'low' && <span className="text-xs font-medium text-[var(--color-warning)]">Low stock</span>}
        </div>
      </td>
      <td className="px-6 py-3.5">
        <div className="flex items-center w-24">
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full px-2 py-1 border border-[var(--color-border)] rounded text-sm text-center tabular-nums focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>
      </td>
      <td className="px-6 py-3.5">
        {status === 'out' ? (
          <StatusChip status="error" label="Out of stock" />
        ) : status === 'low' ? (
          <StatusChip status="warning" label="Low stock" />
        ) : (
          <StatusChip status="success" label="In stock" />
        )}
      </td>
      <td className="px-6 py-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setAdjusting(true)}
            title="Record an adjustment"
            className="inline-flex items-center gap-1 px-3 py-1 border border-[var(--color-border)] text-[var(--color-foreground)] font-medium rounded hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Adjust
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={!dirty || save.isPending}
            className="px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium rounded hover:bg-[var(--color-primary)]/20 transition-colors disabled:opacity-40"
          >
            {save.isPending ? 'Saving…' : save.isError ? 'Retry' : 'Save'}
          </button>
          <SupportAction
            subjectType="inventory"
            subjectId={row.id}
            defaultCategory="inventory_problem"
            label="Issue"
            context={`Inventory issue for ${row.menuItemName} / ${row.deliverySlotName}`}
          />
        </div>
        {adjusting && <AdjustModal row={row} date={date} onClose={() => setAdjusting(false)} />}
      </td>
    </tr>
  );
}

type ItemGroup = {
  itemId: string;
  itemName: string;
  unitCode: string;
  rows: VendorInventory[];
  remaining: number;
  outCount: number;
  lowCount: number;
};

function ItemSection({
  group,
  date,
  collapsed,
  onToggle,
}: {
  group: ItemGroup;
  date: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const rollup: RowStatus =
    group.outCount > 0 ? 'out' : group.lowCount > 0 ? 'low' : 'in';

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50/70 transition-colors"
      >
        <ChevronDown
          className={`h-4 w-4 text-[var(--color-muted-foreground)] shrink-0 transition-transform ${
            collapsed ? '-rotate-90' : ''
          }`}
        />
        <UtensilsCrossed className="h-4 w-4 text-[var(--color-muted-foreground)] shrink-0" />
        <span className="font-semibold text-[var(--color-foreground)] capitalize">{group.itemName}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-[var(--color-muted-foreground)] capitalize">
          {group.unitCode}
        </span>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {group.rows.length} {group.rows.length === 1 ? 'slot' : 'slots'}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-[var(--color-muted-foreground)] tabular-nums">
            {group.remaining} remaining
          </span>
          {rollup === 'out' ? (
            <StatusChip status="error" label={`${group.outCount} out`} />
          ) : rollup === 'low' ? (
            <StatusChip status="warning" label={`${group.lowCount} low`} />
          ) : (
            <StatusChip status="success" label="In stock" />
          )}
        </div>
      </button>

      {!collapsed && (
        <div className="overflow-x-auto border-t border-[var(--color-border)]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--color-muted-foreground)] uppercase border-b border-[var(--color-border)] bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 font-medium">Slot</th>
                <th className="px-6 py-3 font-medium">Remaining</th>
                <th className="px-6 py-3 font-medium">Total Qty</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {group.rows.map((row) => (
                <InventoryRow key={row.id} row={row} date={date} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InventoryEmpty({ date }: { date: string }) {
  // Inventory rows are generated server-side per service date; show the vendor's
  // active items so they can see "the menu" and understand what stock will appear.
  const menuQ = useQuery({ queryKey: qk.menuItems(), queryFn: menuApi.list });
  const items = menuQ.data ?? [];
  const active = items.filter((i) => i.active);

  return (
    <div className="p-6 sm:p-10">
      <div className="flex flex-col items-center text-center gap-2 mb-6">
        <CalendarClock className="h-8 w-8 text-[var(--color-muted-foreground)] opacity-60" />
        <p className="text-sm font-semibold text-[var(--color-foreground)]">
          No stock entries for {formatDate(date)}
        </p>
        <p className="max-w-md text-sm text-[var(--color-muted-foreground)]">
          Daily inventory is generated automatically for each service date. A row appears here once an
          item is <span className="font-medium">active</span> and you&apos;ve opened that day in your{' '}
          <Link href="/availability" className="text-[var(--color-primary)] font-medium hover:underline">
            delivery availability
          </Link>
          . Then you can set totals and record adjustments.
        </p>
      </div>

      {active.length > 0 && (
        <div className="max-w-md mx-auto">
          <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide mb-2">
            Your active menu items ({active.length})
          </p>
          <div className="rounded-lg border border-[var(--color-border)] divide-y divide-[var(--color-border)] overflow-hidden">
            {active.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white">
                <div className="flex items-center gap-2 min-w-0">
                  <UtensilsCrossed className="h-4 w-4 text-[var(--color-muted-foreground)] shrink-0" />
                  <span className="text-sm font-medium text-[var(--color-foreground)] truncate">{i.name}</span>
                </div>
                <span className="text-sm tabular-nums text-[var(--color-muted-foreground)] shrink-0">
                  {formatNaira(i.priceKobo)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && !menuQ.isLoading && (
        <p className="text-center text-sm text-[var(--color-muted-foreground)]">
          You have no active menu items yet.{' '}
          <Link href="/menu" className="text-[var(--color-primary)] font-medium hover:underline">
            Add or activate items
          </Link>{' '}
          first.
        </p>
      )}
    </div>
  );
}

type StatusFilter = 'all' | 'low' | 'out';

export default function InventoryPage() {
  const [date, setDate] = useState(todayIso());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const query = useQuery({ queryKey: qk.inventory(date), queryFn: () => inventoryApi.list(date) });
  const rows = useMemo(() => query.data ?? [], [query.data]);

  const outRows = useMemo(() => rows.filter((row) => statusOf(row) === 'out'), [rows]);
  const lowRows = useMemo(() => rows.filter((row) => statusOf(row) === 'low'), [rows]);

  // Filter rows by search text + status, then group by menu item.
  const groups = useMemo<ItemGroup[]>(() => {
    const term = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const s = statusOf(row);
      if (statusFilter === 'out' && s !== 'out') return false;
      if (statusFilter === 'low' && s !== 'low') return false;
      if (
        term &&
        !row.menuItemName.toLowerCase().includes(term) &&
        !row.deliverySlotName.toLowerCase().includes(term)
      )
        return false;
      return true;
    });

    const byItem = new Map<string, ItemGroup>();
    for (const row of filtered) {
      let g = byItem.get(row.menuItemId);
      if (!g) {
        g = {
          itemId: row.menuItemId,
          itemName: row.menuItemName,
          unitCode: row.unitCode,
          rows: [],
          remaining: 0,
          outCount: 0,
          lowCount: 0,
        };
        byItem.set(row.menuItemId, g);
      }
      g.rows.push(row);
      g.remaining += row.remainingQuantity;
      const s = statusOf(row);
      if (s === 'out') g.outCount += 1;
      else if (s === 'low') g.lowCount += 1;
    }

    return Array.from(byItem.values())
      .map((g) => ({
        ...g,
        rows: g.rows.sort((a, b) => a.deliverySlotName.localeCompare(b.deliverySlotName)),
      }))
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [rows, search, statusFilter]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.itemId));
  const toggleAll = () =>
    setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.itemId)));

  const filterTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: rows.length },
    { key: 'low', label: 'Low', count: lowRows.length },
    { key: 'out', label: 'Out', count: outRows.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Inventory</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">Manage daily stock levels for your menu items.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center bg-white p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-[var(--color-muted-foreground)]" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 text-sm font-medium border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>

        <div className="relative flex-1 lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item or slot…"
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] p-0.5 lg:ml-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-muted-foreground)] hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 tabular-nums opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <TonalCard className="p-4">
            <p className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">Out of stock</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-error)]">{outRows.length}</p>
            <p className="mt-1 truncate text-xs text-[var(--color-muted-foreground)]" title={outRows.map((row) => row.menuItemName).join(', ')}>
              {outRows.length ? outRows.map((row) => row.menuItemName).join(', ') : 'None'}
            </p>
          </TonalCard>
          <TonalCard className="p-4">
            <p className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">Low stock</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-warning)]">{lowRows.length}</p>
            <p className="mt-1 truncate text-xs text-[var(--color-muted-foreground)]" title={lowRows.map((row) => row.menuItemName).join(', ')}>
              {lowRows.length ? lowRows.map((row) => row.menuItemName).join(', ') : 'None'}
            </p>
          </TonalCard>
          <TonalCard className="p-4">
            <p className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">Affected items</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-foreground)]">{new Set([...outRows, ...lowRows].map((row) => row.menuItemId)).size}</p>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">Use Adjust or Save to restock/update.</p>
          </TonalCard>
        </div>
      )}

      {query.isLoading ? (
        <TonalCard className="p-6">
          <LoadingState label="Loading inventory…" rows={3} />
        </TonalCard>
      ) : query.isError ? (
        <TonalCard className="p-0 overflow-hidden">
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </TonalCard>
      ) : rows.length === 0 ? (
        <TonalCard className="p-0 overflow-hidden">
          <InventoryEmpty date={date} />
        </TonalCard>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
              <Layers className="h-4 w-4" />
              <span>
                {groups.length} {groups.length === 1 ? 'item' : 'items'} • {formatDate(date)}
              </span>
            </div>
            {groups.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-sm font-medium text-[var(--color-primary)] hover:underline"
              >
                {allCollapsed ? 'Expand all' : 'Collapse all'}
              </button>
            )}
          </div>

          {groups.length === 0 ? (
            <TonalCard className="p-10 text-center">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No items match your search or filter.
              </p>
            </TonalCard>
          ) : (
            groups.map((group) => (
              <ItemSection
                key={group.itemId}
                group={group}
                date={date}
                collapsed={collapsed.has(group.itemId)}
                onToggle={() => toggle(group.itemId)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
