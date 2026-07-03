'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { SupportAction } from '@/src/components/shared/SupportAction';
import { TonalCard } from '@/src/components/shared/Cards';
import { ErrorState, LoadingState } from '@/src/components/shared/QueryStates';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { settlementsApi, qk } from '@/src/lib/api/vendor';
import { formatDate, formatDateTime, formatNaira, prettifyEnum, settlementStatusChip } from '@/src/lib/format';

export default function SettlementDetailPage({ params }: { params: Promise<{ settlementId: string }> }) {
  const { settlementId } = use(params);

  const query = useQuery({
    queryKey: qk.settlement(settlementId),
    queryFn: () => settlementsApi.get(settlementId),
  });

  if (query.isLoading) return <LoadingState label="Loading settlement..." />;
  if (query.isError || !query.data) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const s = query.data;
  const commission = s.commissionKobo ?? s.serviceFeeKobo ?? 0;
  const orders = s.orders ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link href="/settlements" className="rounded-md border border-[var(--color-border)] bg-white p-2 transition-colors hover:bg-gray-50">
            <ArrowLeft className="h-5 w-5 text-[var(--color-muted-foreground)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Settlement detail</h1>
            <p className="font-mono text-sm text-[var(--color-muted-foreground)]">{s.id}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={settlementStatusChip(s.status)} label={prettifyEnum(s.status)} />
          <SupportAction subjectType="settlement" subjectId={s.id} defaultCategory="settlement_concern" label="Settlement concern" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <TonalCard className="border-none bg-[var(--color-primary)] text-white">
            <div className="mb-6 flex justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white/80">Net payable</p>
                <h2 className="mt-1 text-4xl font-bold tracking-tight tabular-nums">{formatNaira(s.payableKobo)}</h2>
              </div>
              <div className="text-right text-sm text-white/80">
                <p>{formatDate(s.settlementDate)}</p>
                <p>{s.paidAt ? `Paid ${formatDate(s.paidAt)}` : 'Payment pending'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4 sm:grid-cols-5">
              <Amount label="Gross sales" value={s.grossFoodAmountKobo + s.deliveryEarningsKobo} />
              <Amount label="Commission" value={commission} />
              <Amount label="Refunds" value={s.refundsKobo} negative />
              <Amount label="Adjustments" value={s.adjustmentsKobo} />
              <Amount label="Net" value={s.payableKobo} />
            </div>
          </TonalCard>

          <TonalCard className="p-0 overflow-hidden">
            <div className="border-b border-[var(--color-border)] bg-gray-50 p-4">
              <h2 className="text-base font-semibold text-[var(--color-foreground)]">Orders included</h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">{orders.length || s.lineCount} settlement line(s)</p>
            </div>
            {orders.length === 0 ? (
              <div className="p-6 text-sm text-[var(--color-muted-foreground)]">
                Order-level settlement lines were not returned by backend. Required contract: `GET /vendor/settlements/:id` should include `orders[]` with order IDs, dates, item totals, commission, refunds, adjustments, net payable, payment status, and admin notes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted-foreground)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Order ID</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Item totals</th>
                      <th className="px-4 py-3 font-medium">Commission</th>
                      <th className="px-4 py-3 font-medium">Refunds</th>
                      <th className="px-4 py-3 font-medium">Adjustments</th>
                      <th className="px-4 py-3 font-medium">Net payable</th>
                      <th className="px-4 py-3 font-medium">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-4 py-3 font-mono text-xs">{order.orderNumber || order.orderId}</td>
                        <td className="px-4 py-3">{formatDate(order.orderDate)}</td>
                        <td className="px-4 py-3 tabular-nums">{formatNaira(order.itemTotalKobo)}</td>
                        <td className="px-4 py-3 tabular-nums">{formatNaira(order.commissionKobo)}</td>
                        <td className="px-4 py-3 tabular-nums">{formatNaira(order.refundsKobo)}</td>
                        <td className="px-4 py-3 tabular-nums">{formatNaira(order.adjustmentsKobo)}</td>
                        <td className="px-4 py-3 font-semibold tabular-nums">{formatNaira(order.netPayableKobo)}</td>
                        <td className="px-4 py-3">{order.paymentStatus || 'Not provided'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TonalCard>
        </div>

        <div className="space-y-6">
          <TonalCard>
            <h3 className="mb-4 text-sm font-semibold text-[var(--color-foreground)]">Payment status</h3>
            <div className="space-y-3 text-sm">
              <Summary label="Settlement status" value={prettifyEnum(s.status)} />
              <Summary label="Paid date" value={s.paidAt ? formatDateTime(s.paidAt) : 'Pending'} />
              <Summary label="Next expected payout" value={s.nextExpectedPayoutDate ? formatDate(s.nextExpectedPayoutDate) : 'Not provided'} />
              <Summary label="External reference" value={s.externalReference || '-'} />
              <Summary label="Admin notes" value={s.adminNotes || 'None'} />
            </div>
          </TonalCard>

          <TonalCard className="border-[var(--color-info)]/20 bg-[var(--color-info)]/5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
              <AlertCircle className="h-4 w-4 text-[var(--color-info)]" />
              Finance support
            </h3>
            <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              Settlement values are backend-owned. Use escalation when an order, refund, adjustment, or payout reference looks wrong.
            </p>
          </TonalCard>
        </div>
      </div>
    </div>
  );
}

function Amount({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/70">{label}</p>
      <p className={`font-semibold tabular-nums ${negative ? 'text-red-200' : ''}`}>{negative ? '-' : ''}{formatNaira(value)}</p>
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
