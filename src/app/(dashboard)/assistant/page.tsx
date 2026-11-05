'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Check, CircleAlert, Loader2, Send, Sparkles, X } from 'lucide-react';

import { TonalCard } from '@/src/components/shared/Cards';
import { ErrorState, LoadingState } from '@/src/components/shared/QueryStates';
import { inventoryApi, menuApi, qk } from '@/src/lib/api/vendor';
import type { VendorInventory, VendorMenuItem } from '@/src/lib/api/types';
import { formatNaira, todayIso } from '@/src/lib/format';
import { useVendorApproval } from '@/src/lib/hooks/useVendorApproval';

type Proposal =
  | { type: 'price_update'; menuItemId: string; priceKobo: number; reason: string }
  | { type: 'inventory_set'; inventoryId: string; quantityTotal: number; expectedVersion: number; reason: string }
  | { type: 'inventory_adjust'; inventoryId: string; adjustmentQuantity: number; reason: string }
  | { type: 'menu_create'; categoryId: string; unitTypeId: string; name: string; description?: string; priceKobo: number; requiresSoup: boolean; reason: string }
  | { type: 'menu_update'; menuItemId: string; name?: string; description?: string; categoryId?: string; priceKobo?: number; requiresSoup?: boolean; reason: string }
  | { type: 'menu_status'; menuItemId: string; active: boolean; reason: string };
type Plan = { summary: string; assumptions: string[]; proposals: Proposal[] };

const suggestions = ['Increase Jollof Rice by ₦200', 'Set all low-stock items to 20 for today', 'Add 10 portions to Chicken and Chips for the Lunch slot', 'Create a new menu item: Beans and Plantain for ₦1,500'];

function describe(proposal: Proposal, menu: VendorMenuItem[], inventory: VendorInventory[]) {
  const item = (id: string) => menu.find((value) => value.id === id)?.name ?? 'Unknown item';
  const stock = (id: string) => inventory.find((value) => value.id === id);
  if (proposal.type === 'price_update') return `Change ${item(proposal.menuItemId)} to ${formatNaira(proposal.priceKobo)}`;
  if (proposal.type === 'inventory_set') { const row = stock(proposal.inventoryId); return `Set ${row?.menuItemName ?? 'item'} (${row?.deliverySlotName ?? 'slot'}) stock to ${proposal.quantityTotal}`; }
  if (proposal.type === 'inventory_adjust') { const row = stock(proposal.inventoryId); return `${proposal.adjustmentQuantity > 0 ? 'Add' : 'Remove'} ${Math.abs(proposal.adjustmentQuantity)} ${row?.menuItemName ?? 'item'} (${row?.deliverySlotName ?? 'slot'})`; }
  if (proposal.type === 'menu_create') return `Create ${proposal.name} at ${formatNaira(proposal.priceKobo)}`;
  if (proposal.type === 'menu_update') return `Update ${item(proposal.menuItemId)}`;
  return `${proposal.active ? 'Activate' : 'Deactivate'} ${item(proposal.menuItemId)}`;
}

export default function AssistantPage() {
  const [command, setCommand] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();
  const { isApproved } = useVendorApproval();
  const date = todayIso();
  const menuQuery = useQuery({ queryKey: qk.menuItems(), queryFn: menuApi.list });
  const inventoryQuery = useQuery({ queryKey: qk.inventory(date), queryFn: () => inventoryApi.list(date) });
  const metadataQuery = useQuery({ queryKey: qk.menuMetadata(), queryFn: menuApi.metadata });
  const menu = menuQuery.data ?? [];
  const inventory = inventoryQuery.data ?? [];
  const ready = !menuQuery.isLoading && !inventoryQuery.isLoading && !metadataQuery.isLoading;

  const generate = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai/vendor-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ command, context: { date, menuItems: menu.map(({ id, name, categoryId, categoryName, unitTypeId, unitCode, priceKobo, active, requiresSoup }) => ({ id, name, categoryId, categoryName, unitTypeId, unitCode, priceKobo, active, requiresSoup })), inventory: inventory.map(({ id, menuItemId, menuItemName, deliverySlotName, quantityTotal, remainingQuantity, version }) => ({ id, menuItemId, menuItemName, deliverySlotName, quantityTotal, remainingQuantity, version })), categories: (metadataQuery.data?.categories ?? []).map(({ id, name }) => ({ id, name })), unitTypes: (metadataQuery.data?.unitTypes ?? []).map(({ id, code, displayName }) => ({ id, code, displayName })) } }) });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error?.message ?? 'Could not generate a plan.');
      return json.data as Plan;
    },
    onSuccess: (result) => { setPlan(result); setApplied(new Set()); setDismissed(new Set()); },
  });
  const apply = useMutation({
    mutationFn: async ({ proposal, index }: { proposal: Proposal; index: number }) => {
      if (proposal.type === 'price_update') await menuApi.update(proposal.menuItemId, { priceKobo: proposal.priceKobo });
      else if (proposal.type === 'inventory_set') await inventoryApi.update(proposal.inventoryId, { quantityTotal: proposal.quantityTotal, expectedVersion: proposal.expectedVersion });
      else if (proposal.type === 'inventory_adjust') await inventoryApi.adjust(proposal.inventoryId, { adjustmentQuantity: proposal.adjustmentQuantity, reason: proposal.reason, metadata: { source: 'vendor_ai_assistant' } });
      else if (proposal.type === 'menu_create') await menuApi.create({ categoryId: proposal.categoryId, unitTypeId: proposal.unitTypeId, name: proposal.name, description: proposal.description, priceKobo: proposal.priceKobo, requiresSoup: proposal.requiresSoup });
      else if (proposal.type === 'menu_update') { const { type: _, menuItemId, reason: __, ...body } = proposal; await menuApi.update(menuItemId, body); }
      else await (proposal.active ? menuApi.activate(proposal.menuItemId) : menuApi.deactivate(proposal.menuItemId));
      return index;
    },
    onSuccess: (index) => { setApplied((value) => new Set(value).add(index)); queryClient.invalidateQueries({ queryKey: qk.menuItems() }); queryClient.invalidateQueries({ queryKey: qk.inventory(date) }); },
  });
  const visible = useMemo(() => plan?.proposals.map((proposal, index) => ({ proposal, index })).filter(({ index }) => !dismissed.has(index)) ?? [], [plan, dismissed]);

  if (menuQuery.isError || inventoryQuery.isError || metadataQuery.isError) return <ErrorState error={menuQuery.error || inventoryQuery.error || metadataQuery.error} onRetry={() => { menuQuery.refetch(); inventoryQuery.refetch(); metadataQuery.refetch(); }} />;
  return <div className="mx-auto max-w-5xl space-y-6">
    <section className="rounded-2xl bg-[linear-gradient(120deg,var(--color-primary),#5c2d91)] p-6 text-white shadow-lg sm:p-8"><div className="flex items-start gap-4"><div className="rounded-xl bg-white/15 p-3"><Sparkles className="h-7 w-7" /></div><div><h1 className="text-2xl font-semibold tracking-tight">Vendor AI Assistant</h1><p className="mt-1 max-w-2xl text-sm text-white/80">Describe the change in everyday language. You will review and apply every action yourself.</p></div></div></section>
    <TonalCard className="p-5 sm:p-6"><label htmlFor="assistant-command" className="text-sm font-semibold">What would you like to change?</label><div className="mt-3 flex flex-col gap-3 sm:flex-row"><textarea id="assistant-command" value={command} onChange={(event) => setCommand(event.target.value)} placeholder="e.g. Raise the price of Jollof Rice by ₦200 and restock Chicken and Chips to 30" rows={3} className="min-h-24 flex-1 resize-y rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20" /><button type="button" onClick={() => generate.mutate()} disabled={command.trim().length < 2 || !ready || generate.isPending} className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{generate.isPending ? 'Creating plan…' : 'Create plan'}</button></div><div className="mt-4 flex flex-wrap gap-2">{suggestions.map((value) => <button key={value} type="button" onClick={() => setCommand(value)} className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">{value}</button>)}</div>{!ready && <div className="mt-4"><LoadingState label="Loading current menu and stock…" rows={1} /></div>}{generate.isError && <p className="mt-4 flex items-center gap-2 text-sm text-[var(--color-error)]"><CircleAlert className="h-4 w-4" />{(generate.error as Error).message}</p>}</TonalCard>
    {plan && <section className="space-y-4"><div><h2 className="text-lg font-semibold">Review your plan</h2><p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{plan.summary}</p></div>{plan.assumptions.length > 0 && <div className="rounded-xl border border-[var(--color-warning)]/25 bg-[var(--color-warning)]/10 p-4 text-sm"><p className="font-semibold">Check these details</p><ul className="mt-2 list-disc space-y-1 pl-5">{plan.assumptions.map((value) => <li key={value}>{value}</li>)}</ul></div>}{visible.length === 0 ? <TonalCard className="p-6 text-sm text-[var(--color-muted-foreground)]">No changes are waiting for review.</TonalCard> : <div className="space-y-3">{visible.map(({ proposal, index }) => <TonalCard key={index} className="p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4 text-[var(--color-primary)]" />{describe(proposal, menu, inventory)}</div><p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{proposal.reason}</p></div><div className="flex shrink-0 gap-2">{applied.has(index) ? <span className="flex items-center gap-1 rounded-lg bg-[var(--color-success)]/10 px-3 py-2 text-sm font-medium text-[var(--color-success)]"><Check className="h-4 w-4" />Applied</span> : <><button type="button" onClick={() => setDismissed((value) => new Set(value).add(index))} disabled={apply.isPending || !isApproved} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-50"><X className="h-4 w-4" /></button><button type="button" onClick={() => apply.mutate({ proposal, index })} disabled={apply.isPending || !isApproved} className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{apply.isPending && apply.variables?.index === index ? 'Applying…' : 'Apply'}</button></>}</div></div></TonalCard>)}</div>}{!isApproved && <p className="text-sm text-[var(--color-warning)]">Your account must be approved before changes can be applied.</p>}{apply.isError && <p className="flex items-center gap-2 text-sm text-[var(--color-error)]"><CircleAlert className="h-4 w-4" />{(apply.error as Error).message}</p>}</section>}
    <p className="text-center text-xs text-[var(--color-muted-foreground)]">AI suggests changes only. Nothing is updated until you select Apply.</p>
  </div>;
}
