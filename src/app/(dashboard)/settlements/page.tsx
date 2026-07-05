'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Download, RefreshCcw, Wallet } from 'lucide-react';
import { MetricCard, TonalCard } from '@/src/components/shared/Cards';
import { EmptyState, ErrorState, LoadingState } from '@/src/components/shared/QueryStates';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { settlementsApi, qk } from '@/src/lib/api/vendor';
import { OwnerOnly } from '@/src/components/shared/OwnerOnly';
import { formatDate, formatNaira, settlementStatusChip, prettifyEnum } from '@/src/lib/format';

export default function SettlementsPage() {
  return (
    <OwnerOnly>
      <SettlementsInner />
    </OwnerOnly>
  );
}

function SettlementsInner() {
  const query = useQuery({ queryKey: qk.settlements(), queryFn: settlementsApi.list });
  const settlements = query.data ?? [];

  const gross = settlements.reduce((sum, s) => sum + s.grossFoodAmountKobo + s.deliveryEarningsKobo, 0);
  const refunds = settlements.reduce((sum, s) => sum + s.refundsKobo, 0);
  const adjustments = settlements.reduce((sum, s) => sum + s.adjustmentsKobo, 0);
  const deductions = settlements.reduce((sum, s) => sum + (s.commissionKobo ?? s.serviceFeeKobo ?? 0) + s.refundsKobo, 0);
  const net = settlements.reduce((sum, s) => sum + s.payableKobo, 0);
  const paid = settlements.filter((s) => s.status === 'paid').reduce((sum, s) => sum + s.payableKobo, 0);
  const pending = settlements.filter((s) => s.status === 'draft' || s.status === 'approved').reduce((sum, s) => sum + s.payableKobo, 0);
  const nextPayout = settlements.find((s) => s.nextExpectedPayoutDate)?.nextExpectedPayoutDate;

  const exportCsv = () => {
    const rows = [
      ['Settlement ID', 'Period', 'Gross amount', 'Deductions', 'Net amount', 'Status', 'Paid date'],
      ...settlements.map((s) => [
        s.id,
        s.settlementDate,
        String(s.grossFoodAmountKobo + s.deliveryEarningsKobo),
        String((s.commissionKobo ?? s.serviceFeeKobo ?? 0) + s.refundsKobo - s.adjustmentsKobo),
        String(s.payableKobo),
        s.status,
        s.paidAt ?? '',
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendor-settlements.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Settlements</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Gross sales, deductions, net settlement, paid, and pending payout visibility.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            disabled={settlements.length === 0}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-foreground)] shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={() => query.refetch()}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-foreground)] shadow-sm transition-colors hover:bg-gray-50"
          >
            <RefreshCcw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard title="Gross sales" value={formatNaira(gross)} subtext="Food + delivery share" />
        <MetricCard title="Fees" value={formatNaira(deductions)} subtext="Commission/service/refunds" />
        <MetricCard title="Refunds" value={formatNaira(refunds)} />
        <MetricCard title="Adjustments" value={formatNaira(adjustments)} />
        <MetricCard title="Net settlement" value={formatNaira(net)} />
        <MetricCard title="Pending" value={formatNaira(pending)} subtext={nextPayout ? `Next ${formatDate(nextPayout)}` : 'Next date not provided'} />
      </div>

      <TonalCard className="p-0 overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-gray-50/50 p-4">
          <h2 className="text-sm font-medium text-[var(--color-foreground)]">Settlement history</h2>
          <p className="text-xs text-[var(--color-muted-foreground)]">Paid amount: {formatNaira(paid)} / pending amount: {formatNaira(pending)}</p>
        </div>
        {query.isLoading ? (
          <div className="p-6">
            <LoadingState label="Loading settlements..." rows={3} />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : settlements.length === 0 ? (
          <EmptyState title="No settlements yet" description="Daily settlements appear here once generated." icon={Wallet} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-6 py-4 font-medium">Settlement ID</th>
                  <th className="px-6 py-4 font-medium">Period</th>
                  <th className="px-6 py-4 font-medium">Gross amount</th>
                  <th className="px-6 py-4 font-medium">Deductions</th>
                  <th className="px-6 py-4 font-medium">Net amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Paid date</th>
                  <th className="px-6 py-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {settlements.map((s) => {
                  const rowDeductions = (s.commissionKobo ?? s.serviceFeeKobo ?? 0) + s.refundsKobo - s.adjustmentsKobo;
                  return (
                    <tr key={s.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-mono text-xs">{s.id.slice(0, 12)}...</td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatDate(s.settlementDate)}</td>
                      <td className="px-6 py-4 font-semibold tabular-nums">{formatNaira(s.grossFoodAmountKobo + s.deliveryEarningsKobo)}</td>
                      <td className="px-6 py-4 tabular-nums text-[var(--color-muted-foreground)]">{formatNaira(rowDeductions)}</td>
                      <td className="px-6 py-4 font-semibold tabular-nums">{formatNaira(s.payableKobo)}</td>
                      <td className="px-6 py-4"><StatusChip status={settlementStatusChip(s.status)} label={prettifyEnum(s.status)} /></td>
                      <td className="px-6 py-4">{s.paidAt ? formatDate(s.paidAt) : '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/settlements/${s.id}`} className="font-medium text-[var(--color-primary)] hover:underline">
                          View details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TonalCard>
    </div>
  );
}
