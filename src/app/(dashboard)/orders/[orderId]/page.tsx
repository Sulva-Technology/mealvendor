'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, CreditCard, MapPin, Package, ShieldCheck, Truck, UserRound } from 'lucide-react';
import { SupportAction } from '@/src/components/shared/SupportAction';
import { TonalCard } from '@/src/components/shared/Cards';
import { ErrorState, LoadingState } from '@/src/components/shared/QueryStates';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { ordersApi, qk } from '@/src/lib/api/vendor';
import type { OrderDetail } from '@/src/lib/api/types';
import { features } from '@/src/config/features';
import { formatDateTime, formatNaira, orderStatusChip, orderStatusLabel, orderVendorTotalKobo, prettifyEnum } from '@/src/lib/format';
import {
  canRunOrderAction,
  customerSafeId,
  handoffStatusLabel,
  nextOrderAction,
  orderActionLabel,
  paymentStatusLabel,
  riderAssignmentLabel,
  vendorOrderStage,
  vendorOrderStageLabel,
} from '@/src/lib/vendor-workflow';

type NextAction = NonNullable<ReturnType<typeof nextOrderAction>>;

const ISSUE_ACTIONS = [
  { label: 'Rider late', category: 'rider_delay' },
  { label: 'Wrong rider', category: 'wrong_order' },
  { label: 'Wrong order', category: 'wrong_order' },
  { label: 'Pickup dispute', category: 'customer_issue' },
  { label: 'App issue', category: 'app_issue' },
] as const;

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: qk.order(orderId), queryFn: () => ordersApi.get(orderId) });

  const onSuccess = (updated: OrderDetail) => {
    queryClient.setQueryData(qk.order(orderId), updated);
    queryClient.invalidateQueries({ queryKey: ['vendor', 'orders'] });
  };

  const runAction = useMutation({
    mutationFn: ({ order, action }: { order: OrderDetail; action: NextAction }) => {
      if (!canRunOrderAction(order, action)) throw new Error('Invalid status transition for this order.');
      if (action === 'ready') return ordersApi.ready(order.id);
      return ordersApi.confirmRiderPickup(order.id);
    },
    onSuccess,
  });

  if (query.isLoading) return <LoadingState label="Loading order..." />;
  if (query.isError || !query.data) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const order = query.data;
  const rawAction = nextOrderAction(order.orderStatus);
  // Hide rider-pickup confirm until the backend ships the endpoint.
  const action = rawAction === 'confirm_pickup' && !features.orderHandoffConfirm ? null : rawAction;
  const stage = vendorOrderStage(order.orderStatus);
  const pending = runAction.isPending;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link href="/orders" className="rounded-md border border-[var(--color-border)] bg-white p-2 transition-colors hover:bg-gray-50">
            <ArrowLeft className="h-5 w-5 text-[var(--color-muted-foreground)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Order {order.orderNumber}</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">Placed {formatDateTime(order.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={orderStatusChip(order.orderStatus)} label={orderStatusLabel(order.orderStatus)} />
          <SupportAction subjectType="order" subjectId={order.id} defaultCategory="customer_issue" label="Report issue" />
        </div>
      </div>

      <TonalCard className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['New order', stage === 'new'],
            ['Ready / pickup', ['ready_for_pickup', 'picked_up_by_rider', 'completed'].includes(stage)],
            ['Handed off', ['picked_up_by_rider', 'completed'].includes(stage)],
          ].map(([label, done]) => (
            <div key={String(label)} className={`rounded-lg border p-3 ${done ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] bg-gray-50'}`}>
              <p className={`text-sm font-medium ${done ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]'}`}>{label}</p>
            </div>
          ))}
        </div>
      </TonalCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <TonalCard className="p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-gray-50 p-4">
              <h2 className="text-base font-semibold text-[var(--color-foreground)]">Order items</h2>
              <span className="text-sm text-[var(--color-muted-foreground)]">{order.items.length} item(s)</span>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100 font-bold text-gray-500">x{item.quantity}</div>
                    <div>
                      <p className="font-semibold text-[var(--color-foreground)]">{item.itemName}</p>
                      <p className="text-xs capitalize text-[var(--color-muted-foreground)]">
                        {item.unitType} / {formatNaira(item.unitPriceKobo)} each
                      </p>
                      {item.soupName && (
                        <p className="mt-0.5 text-xs font-medium text-[var(--color-primary)]">🍲 Soup: {item.soupName}</p>
                      )}
                    </div>
                  </div>
                  <span className="font-medium tabular-nums text-[var(--color-foreground)]">{formatNaira(item.lineTotalKobo)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5 border-t border-[var(--color-border)] bg-gray-50 p-4">
              <div className="flex justify-between text-sm text-[var(--color-muted-foreground)]">
                <span>Food subtotal</span>
                <span className="tabular-nums">{formatNaira(order.foodSubtotalKobo)}</span>
              </div>
              <div className="flex justify-between text-sm text-[var(--color-muted-foreground)]">
                <span>Delivery fee</span>
                <span className="tabular-nums line-through">{formatNaira(order.deliveryFeeKobo)}</span>
              </div>
              {order.discountKobo > 0 && (
                <div className="flex justify-between text-sm text-[var(--color-success)]">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatNaira(order.discountKobo)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2 text-lg font-semibold">
                <span>Your total</span>
                <span className="tabular-nums">{formatNaira(orderVendorTotalKobo(order))}</span>
              </div>
            </div>
          </TonalCard>

          <TonalCard>
            <h2 className="mb-4 text-base font-semibold text-[var(--color-foreground)]">Delivery and rider handoff</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Info icon={Clock} label="Scheduled" value={order.scheduledAt ? formatDateTime(order.scheduledAt) : order.deliverySlotName || order.serviceDate} />
              <Info icon={MapPin} label="Delivery/pickup type" value={`${prettifyEnum(order.deliveryMode)} / ${order.locationName || 'No location'}${order.roomNumber ? ` · Room ${order.roomNumber}` : ''}`} />
              <Info icon={Truck} label="Rider" value={order.riderName || riderAssignmentLabel(order)} detail={order.riderContact || 'Contact not provided'} />
              <Info icon={ShieldCheck} label="Handoff" value={handoffStatusLabel(order)} detail={order.handoffCode ? `Code ${order.handoffCode}` : 'No handoff code yet'} />
            </div>
            <div className="mt-4 grid gap-3 rounded-lg border border-[var(--color-border)] bg-gray-50 p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-[var(--color-muted-foreground)]">Pickup time</p>
                <p className="font-medium">{order.assignedPickupTime ? formatDateTime(order.assignedPickupTime) : 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--color-muted-foreground)]">Order ID</p>
                <p className="font-mono text-xs">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--color-muted-foreground)]">Handoff timestamp</p>
                <p className="font-medium">{order.riderPickedUpAt ? formatDateTime(order.riderPickedUpAt) : 'Pending'}</p>
              </div>
            </div>
          </TonalCard>
        </div>

        <div className="space-y-6">
          {action ? (
            <TonalCard className="border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-[var(--color-primary)]">Next vendor action</h3>
              <p className="mb-4 text-sm text-[var(--color-foreground)]">
                Current stage: {vendorOrderStageLabel(stage)}.
              </p>
              <button
                onClick={() => runAction.mutate({ order, action })}
                disabled={pending}
                className="w-full rounded-lg bg-[var(--color-primary)] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-60"
              >
                {pending ? 'Working...' : orderActionLabel(action)}
              </button>
              {runAction.isError && <p className="mt-3 text-xs text-[var(--color-error)]">{(runAction.error as Error).message}</p>}
            </TonalCard>
          ) : (
            <TonalCard className="flex items-center gap-3">
              <Package className="h-5 w-5 text-[var(--color-muted-foreground)]" />
              <p className="text-sm text-[var(--color-muted-foreground)]">No vendor action available for this status.</p>
            </TonalCard>
          )}

          <TonalCard>
            <h3 className="mb-4 text-sm font-semibold text-[var(--color-foreground)]">Order info</h3>
            <div className="space-y-3 text-sm">
              <Summary label="Customer-safe ID" value={customerSafeId(order.customerId)} />
              <Summary label="Payment" value={paymentStatusLabel(order)} />
              <Summary label="Paid at" value={order.paidAt ? formatDateTime(order.paidAt) : 'Not paid'} />
              <Summary label="Completed at" value={order.deliveredAt ? formatDateTime(order.deliveredAt) : 'Pending'} />
              <Summary label="Room number" value={order.roomNumber || 'None'} />
              <Summary label="Special notes" value={order.specialNotes || 'None'} />
            </div>
          </TonalCard>

          {features.supportIssues && (
            <TonalCard>
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-foreground)]">Handoff issue actions</h3>
              <div className="flex flex-wrap gap-2">
                {ISSUE_ACTIONS.map((issue) => (
                  <SupportAction
                    key={issue.label}
                    subjectType="rider_handoff"
                    subjectId={order.id}
                    defaultCategory={issue.category}
                    label={issue.label}
                    context={`${issue.label} for order ${order.orderNumber}`}
                  />
                ))}
              </div>
            </TonalCard>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string; detail?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="font-medium text-[var(--color-foreground)]">{value}</p>
      {detail && <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{detail}</p>}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
