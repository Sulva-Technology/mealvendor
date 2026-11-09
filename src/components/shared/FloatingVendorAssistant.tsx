'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Check, CircleAlert, Loader2, Send, Sparkles, X } from 'lucide-react';

import { Modal } from '@/src/components/shared/Modal';
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

function proposalLabel(proposal: Proposal, menu: VendorMenuItem[], inventory: VendorInventory[]) {
  const item = (id: string) => menu.find((value) => value.id === id)?.name ?? 'menu item';
  const stock = (id: string) => inventory.find((value) => value.id === id);
  if (proposal.type === 'price_update') return `Set ${item(proposal.menuItemId)} to ${formatNaira(proposal.priceKobo)}`;
  if (proposal.type === 'inventory_set') { const row = stock(proposal.inventoryId); return `Set ${row?.menuItemName ?? 'item'} stock to ${proposal.quantityTotal}`; }
  if (proposal.type === 'inventory_adjust') { const row = stock(proposal.inventoryId); return `${proposal.adjustmentQuantity > 0 ? 'Add' : 'Remove'} ${Math.abs(proposal.adjustmentQuantity)} ${row?.menuItemName ?? 'item'} stock`; }
  if (proposal.type === 'menu_create') return `Create ${proposal.name} at ${formatNaira(proposal.priceKobo)}`;
  if (proposal.type === 'menu_update') return `Update ${item(proposal.menuItemId)}`;
  return `${proposal.active ? 'Activate' : 'Deactivate'} ${item(proposal.menuItemId)}`;
}

/** Mounted in the dashboard shell so a vendor can use AI without leaving their current task. */
export function FloatingVendorAssistant() {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();
  const { isApproved } = useVendorApproval();
  const date = todayIso();
  const menuQuery = useQuery({ queryKey: qk.menuItems(), queryFn: menuApi.list, enabled: open });
  const inventoryQuery = useQuery({ queryKey: qk.inventory(date), queryFn: () => inventoryApi.list(date), enabled: open });
  const metadataQuery = useQuery({ queryKey: qk.menuMetadata(), queryFn: menuApi.metadata, enabled: open });
  const menu = menuQuery.data ?? [];
  const inventory = inventoryQuery.data ?? [];
  const ready = open && !menuQuery.isLoading && !inventoryQuery.isLoading && !metadataQuery.isLoading;

  const createPlan = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai/vendor-assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ command, context: {
          date,
          menuItems: menu.map(({ id, name, categoryId, categoryName, unitTypeId, unitCode, priceKobo, active, requiresSoup }) => ({ id, name, categoryId, categoryName, unitTypeId, unitCode, priceKobo, active, requiresSoup })),
          inventory: inventory.map(({ id, menuItemId, menuItemName, deliverySlotName, quantityTotal, remainingQuantity, version }) => ({ id, menuItemId, menuItemName, deliverySlotName, quantityTotal, remainingQuantity, version })),
          categories: (metadataQuery.data?.categories ?? []).map(({ id, name }) => ({ id, name })),
          unitTypes: (metadataQuery.data?.unitTypes ?? []).map(({ id, code, displayName }) => ({ id, code, displayName })),
        } }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error?.message ?? 'Could not create a plan.');
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
      else if (proposal.type === 'menu_update') { const { type: _type, menuItemId, reason: _reason, ...body } = proposal; await menuApi.update(menuItemId, body); }
      else await (proposal.active ? menuApi.activate(proposal.menuItemId) : menuApi.deactivate(proposal.menuItemId));
      return index;
    },
    onSuccess: (index) => {
      setApplied((value) => new Set(value).add(index));
      queryClient.invalidateQueries({ queryKey: qk.menuItems() });
      queryClient.invalidateQueries({ queryKey: qk.inventory(date) });
    },
  });

  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="Open Vendor AI Assistant" title="Ask Vendor AI" className="fixed right-4 bottom-36 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg ring-4 ring-white/80 transition hover:scale-105 hover:opacity-95 md:bottom-20">
      <Sparkles className="h-5 w-5" />
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title="Vendor AI" description="Ask for a menu, price, or inventory change. You approve every action." size="lg">
      <div className="space-y-4">
        <div className="flex gap-2"><textarea value={command} onChange={(event) => setCommand(event.target.value)} placeholder="e.g. Make Jollof Rice ₦1,500 and set its stock to 25" rows={3} className="min-h-20 flex-1 resize-none rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20" /><button type="button" onClick={() => createPlan.mutate()} disabled={command.trim().length < 2 || !ready || createPlan.isPending} className="self-end rounded-lg bg-[var(--color-primary)] p-3 text-white disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send request">{createPlan.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button></div>
        {!ready && <p className="text-sm text-[var(--color-muted-foreground)]">Loading your menu and stock…</p>}
        {createPlan.isError && <p className="flex items-center gap-2 text-sm text-[var(--color-error)]"><CircleAlert className="h-4 w-4" />{(createPlan.error as Error).message}</p>}
        {plan && <div className="space-y-3 border-t border-[var(--color-border)] pt-4"><p className="text-sm text-[var(--color-muted-foreground)]">{plan.summary}</p>{plan.assumptions.map((assumption) => <p key={assumption} className="rounded-lg bg-[var(--color-warning)]/10 p-2 text-xs text-[var(--color-foreground)]">{assumption}</p>)}{plan.proposals.map((proposal, index) => !dismissed.has(index) && <div key={index} className="rounded-lg border border-[var(--color-border)] p-3"><div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-medium"><Bot className="h-4 w-4 text-[var(--color-primary)]" />{proposalLabel(proposal, menu, inventory)}</p><p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{proposal.reason}</p></div>{applied.has(index) ? <span className="flex items-center gap-1 text-xs font-medium text-[var(--color-success)]"><Check className="h-4 w-4" />Applied</span> : <div className="flex gap-1"><button type="button" onClick={() => setDismissed((value) => new Set(value).add(index))} disabled={apply.isPending || !isApproved} className="rounded-md border border-[var(--color-border)] p-1.5 disabled:opacity-50" aria-label="Dismiss proposal"><X className="h-4 w-4" /></button><button type="button" onClick={() => apply.mutate({ proposal, index })} disabled={apply.isPending || !isApproved} className="rounded-md bg-[var(--color-primary)] px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{apply.isPending && apply.variables?.index === index ? 'Applying…' : 'Apply'}</button></div>}</div></div>)}</div>}
        {!isApproved && plan && <p className="text-xs text-[var(--color-warning)]">Your account must be approved before changes can be applied.</p>}
        {apply.isError && <p className="flex items-center gap-2 text-sm text-[var(--color-error)]"><CircleAlert className="h-4 w-4" />{(apply.error as Error).message}</p>}
      </div>
    </Modal>
  </>;
}
