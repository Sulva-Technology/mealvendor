'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TonalCard } from '@/src/components/shared/Cards';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { LoadingState, ErrorState } from '@/src/components/shared/QueryStates';
import { ordersApi, qk } from '@/src/lib/api/vendor';
import type { OrderDetail } from '@/src/lib/api/types';
import { formatNaira, formatDateTime, orderStatusChip, orderStatusLabel } from '@/src/lib/format';
import { ArrowLeft, MapPin, Clock, Package } from 'lucide-react';

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: qk.order(orderId),
    queryFn: () => ordersApi.get(orderId),
  });

  const onSuccess = (updated: OrderDetail) => {
    queryClient.setQueryData(qk.order(orderId), updated);
    queryClient.invalidateQueries({ queryKey: ['vendor', 'orders'] });
  };

  const acceptM = useMutation({ mutationFn: () => ordersApi.accept(orderId), onSuccess });
  const prepareM = useMutation({ mutationFn: () => ordersApi.preparing(orderId), onSuccess });
  const readyM = useMutation({ mutationFn: () => ordersApi.ready(orderId), onSuccess });

  const pending = acceptM.isPending || prepareM.isPending || readyM.isPending;

  if (query.isLoading) return <LoadingState label="Loading order…" />;
  if (query.isError || !query.data)
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const order = query.data;

  // Contextual primary action based on the order's current status.
  let action: { label: string; run: () => void } | null = null;
  if (['paid', 'confirmed', 'pending_payment'].includes(order.orderStatus)) {
    action = { label: 'Accept Order', run: () => acceptM.mutate() };
  } else if (order.orderStatus === 'accepted') {
    action = { label: 'Start Preparing', run: () => prepareM.mutate() };
  } else if (order.orderStatus === 'preparing') {
    action = { label: 'Mark Ready', run: () => readyM.mutate() };
  }

  const mutationError = acceptM.error || prepareM.error || readyM.error;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/orders" className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <ArrowLeft className="h-5 w-5 text-[var(--color-muted-foreground)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
              Order {order.orderNumber}
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Placed {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>
        <StatusChip status={orderStatusChip(order.orderStatus)} label={orderStatusLabel(order.orderStatus)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TonalCard className="p-0 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-[var(--color-border)] flex justify-between items-center">
              <h2 className="text-base font-semibold text-[var(--color-foreground)]">Order Items</h2>
              <span className="text-sm text-[var(--color-muted-foreground)]">{order.items.length} item(s)</span>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center font-bold text-gray-500">
                      x{item.quantity}
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--color-foreground)]">{item.itemName}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)] capitalize">
                        Unit: {item.unitType} • {formatNaira(item.unitPriceKobo)} each
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-[var(--color-foreground)] tabular-nums">
                    {formatNaira(item.lineTotalKobo)}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 border-t border-[var(--color-border)] space-y-1.5">
              <div className="flex justify-between text-sm text-[var(--color-muted-foreground)]">
                <span>Food subtotal</span>
                <span className="tabular-nums">{formatNaira(order.foodSubtotalKobo)}</span>
              </div>
              <div className="flex justify-between text-sm text-[var(--color-muted-foreground)]">
                <span>Delivery fee</span>
                <span className="tabular-nums">{formatNaira(order.deliveryFeeKobo)}</span>
              </div>
              {order.discountKobo > 0 && (
                <div className="flex justify-between text-sm text-[var(--color-success)]">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatNaira(order.discountKobo)}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-semibold text-lg pt-2 border-t border-[var(--color-border)]">
                <span>Total</span>
                <span className="tabular-nums">{formatNaira(order.totalKobo)}</span>
              </div>
            </div>
          </TonalCard>

          <TonalCard>
            <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-4">Delivery & Handoff</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] mb-1">
                  <Clock className="w-4 h-4" /> Schedule
                </div>
                <p className="font-medium text-[var(--color-foreground)]">{order.deliverySlotName || '—'}</p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">Service date: {order.serviceDate}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] mb-1">
                  <MapPin className="w-4 h-4" /> Location
                </div>
                <p className="font-medium text-[var(--color-foreground)]">{order.locationName || '—'}</p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1 capitalize">
                  {order.deliveryMode?.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          </TonalCard>
        </div>

        <div className="space-y-6">
          {action ? (
            <TonalCard className="bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-primary)]" />
              <h3 className="text-sm font-semibold text-[var(--color-primary)] mb-2">Vendor Action Required</h3>
              <p className="text-sm text-[var(--color-foreground)] mb-4">
                Move this order to its next stage in the fulfillment flow.
              </p>
              <button
                onClick={action.run}
                disabled={pending}
                className="w-full py-2.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-60"
              >
                {pending ? 'Working…' : action.label}
              </button>
              {mutationError && (
                <p className="mt-3 text-xs text-[var(--color-error)]">
                  {(mutationError as Error).message}
                </p>
              )}
            </TonalCard>
          ) : (
            <TonalCard className="flex items-center gap-3">
              <Package className="w-5 h-5 text-[var(--color-muted-foreground)]" />
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No vendor action available for this status.
              </p>
            </TonalCard>
          )}

          <TonalCard>
            <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-4">Order Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-muted-foreground)]">Customer</span>
                <span className="font-mono text-xs">{order.customerId.slice(0, 8)}…</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-muted-foreground)]">Paid at</span>
                <span className="font-medium">{order.paidAt ? formatDateTime(order.paidAt) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-muted-foreground)]">Delivered at</span>
                <span className="font-medium">{order.deliveredAt ? formatDateTime(order.deliveredAt) : '—'}</span>
              </div>
            </div>
          </TonalCard>
        </div>
      </div>
    </div>
  );
}
