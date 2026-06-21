'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { TonalCard, MetricCard } from '@/src/components/shared/Cards';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { LoadingState, ErrorState, EmptyState } from '@/src/components/shared/QueryStates';
import { settlementsApi, qk } from '@/src/lib/api/vendor';
import { formatNaira, formatDate, settlementStatusChip, prettifyEnum } from '@/src/lib/format';
import { Wallet, ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react';

export default function SettlementsPage() {
  const query = useQuery({ queryKey: qk.settlements(), queryFn: settlementsApi.list });
  const settlements = query.data ?? [];

  const totalPaid = settlements.filter((s) => s.status === 'paid').reduce((sum, s) => sum + s.payableKobo, 0);
  const totalDelivery = settlements.reduce((sum, s) => sum + s.deliveryEarningsKobo, 0);
  const pending = settlements
    .filter((s) => s.status === 'draft' || s.status === 'approved')
    .reduce((sum, s) => sum + s.payableKobo, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Settlements</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">View your earnings, payouts, and financial history.</p>
        </div>
        <button
          onClick={() => query.refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[var(--color-border)] text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-[var(--color-foreground)]"
        >
          <RefreshCcw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TonalCard className="bg-[var(--color-primary)] text-white border-none relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-white/80">Pending Payout</p>
            <h2 className="text-3xl font-bold tracking-tight mt-1 tabular-nums">{formatNaira(pending)}</h2>
            <p className="text-xs text-white/60 mt-4">Automated payouts daily via Paystack</p>
          </div>
        </TonalCard>

        <MetricCard title="Total Paid" value={formatNaira(totalPaid)} subtext="All settled payouts" icon={ArrowUpRight} />
        <MetricCard title="Delivery Share" value={formatNaira(totalDelivery)} subtext="From vendor delivery mode" icon={ArrowDownRight} />
      </div>

      <TonalCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] bg-gray-50/50">
          <h2 className="text-sm font-medium text-[var(--color-foreground)]">Settlement History</h2>
        </div>
        {query.isLoading ? (
          <div className="p-6">
            <LoadingState label="Loading settlements…" rows={3} />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : settlements.length === 0 ? (
          <EmptyState title="No settlements yet" description="Daily settlements appear here once generated." icon={Wallet} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[var(--color-muted-foreground)] uppercase border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Payable</th>
                  <th className="px-6 py-4 font-medium">Lines</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Reference</th>
                  <th className="px-6 py-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {settlements.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(s.settlementDate)}</td>
                    <td className="px-6 py-4 font-semibold tabular-nums">{formatNaira(s.payableKobo)}</td>
                    <td className="px-6 py-4 tabular-nums text-[var(--color-muted-foreground)]">{s.lineCount}</td>
                    <td className="px-6 py-4">
                      <StatusChip status={settlementStatusChip(s.status)} label={prettifyEnum(s.status)} />
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[var(--color-muted-foreground)]">
                      {s.externalReference || '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/settlements/${s.id}`} className="text-[var(--color-primary)] font-medium hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TonalCard>
    </div>
  );
}
