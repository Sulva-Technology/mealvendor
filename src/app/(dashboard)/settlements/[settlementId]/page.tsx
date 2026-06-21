'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { TonalCard } from '@/src/components/shared/Cards';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { LoadingState, ErrorState } from '@/src/components/shared/QueryStates';
import { settlementsApi, qk } from '@/src/lib/api/vendor';
import { formatNaira, formatDate, formatDateTime, settlementStatusChip, prettifyEnum } from '@/src/lib/format';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function SettlementDetailPage({ params }: { params: Promise<{ settlementId: string }> }) {
  const { settlementId } = use(params);

  const query = useQuery({
    queryKey: qk.settlement(settlementId),
    queryFn: () => settlementsApi.get(settlementId),
  });

  if (query.isLoading) return <LoadingState label="Loading settlement…" />;
  if (query.isError || !query.data) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const s = query.data;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/settlements" className="p-2 hover:bg-gray-100 rounded-md transition-colors">
            <ArrowLeft className="h-5 w-5 text-[var(--color-muted-foreground)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Settlement</h1>
            <p className="text-sm font-mono text-[var(--color-muted-foreground)]">{formatDate(s.settlementDate)}</p>
          </div>
        </div>
        <StatusChip status={settlementStatusChip(s.status)} label={prettifyEnum(s.status)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <TonalCard className="bg-[var(--color-primary)] text-white border-none flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-sm font-medium text-white/80">Total Payable</p>
                <h2 className="text-4xl font-bold tracking-tight mt-1 tabular-nums">{formatNaira(s.payableKobo)}</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/20">
              <div>
                <p className="text-xs text-white/70 uppercase tracking-wider font-semibold mb-1">Food Sales</p>
                <p className="font-semibold tabular-nums">{formatNaira(s.grossFoodAmountKobo)}</p>
              </div>
              <div>
                <p className="text-xs text-white/70 uppercase tracking-wider font-semibold mb-1">Delivery Share</p>
                <p className="font-semibold tabular-nums">{formatNaira(s.deliveryEarningsKobo)}</p>
              </div>
              <div>
                <p className="text-xs text-white/70 uppercase tracking-wider font-semibold mb-1">Refunds</p>
                <p className="font-semibold tabular-nums text-red-200">-{formatNaira(s.refundsKobo)}</p>
              </div>
              <div>
                <p className="text-xs text-white/70 uppercase tracking-wider font-semibold mb-1">Adjustments</p>
                <p className="font-semibold tabular-nums text-blue-200">{formatNaira(s.adjustmentsKobo)}</p>
              </div>
            </div>
          </TonalCard>

          <TonalCard>
            <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-4">Breakdown</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-muted-foreground)]">Line items</span>
                <span className="font-medium tabular-nums">{s.lineCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-muted-foreground)]">Settlement date</span>
                <span className="font-medium">{formatDate(s.settlementDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-muted-foreground)]">Paid at</span>
                <span className="font-medium">{s.paidAt ? formatDateTime(s.paidAt) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-muted-foreground)]">External reference</span>
                <span className="font-mono text-xs">{s.externalReference || '—'}</span>
              </div>
            </div>
          </TonalCard>
        </div>

        <div className="space-y-6">
          <TonalCard className="bg-[var(--color-info)]/5 border border-[var(--color-info)]/20">
            <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--color-info)]" />
              Need help?
            </h3>
            <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
              Settlements are calculated and paid by Meal Direct via Paystack. If you believe there is a discrepancy,
              contact finance support with this settlement date.
            </p>
          </TonalCard>
        </div>
      </div>
    </div>
  );
}
