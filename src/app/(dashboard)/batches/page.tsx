'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { TonalCard } from '@/src/components/shared/Cards';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { LoadingState, ErrorState, EmptyState } from '@/src/components/shared/QueryStates';
import { batchesApi, qk } from '@/src/lib/api/vendor';
import { formatNaira, formatDate, formatTime, batchStatusChip, prettifyEnum } from '@/src/lib/format';
import { Clock, ChevronRight, Package, Truck, Layers } from 'lucide-react';

export default function BatchesPage() {
  const query = useQuery({ queryKey: qk.batches(), queryFn: batchesApi.list });
  const batches = query.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Order Batches</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Manage orders by operational delivery slots.</p>
        </div>
      </div>

      {query.isLoading ? (
        <LoadingState label="Loading batches…" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : batches.length === 0 ? (
        <EmptyState title="No batches" description="Batches appear once orders are grouped into delivery slots." icon={Layers} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => {
            const isOpen = batch.status === 'open' || batch.status === 'in_progress';
            return (
              <TonalCard
                key={batch.id}
                className={`p-0 overflow-hidden flex flex-col ${isOpen ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20' : ''}`}
              >
                {isOpen && (
                  <div className="bg-[var(--color-primary)] text-white text-xs font-semibold py-1.5 px-4 flex justify-between items-center">
                    <span>Active</span>
                    <span>Cutoff {formatTime(batch.cutoffAt)}</span>
                  </div>
                )}
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                        <Clock className="w-5 h-5 text-[var(--color-primary)]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[var(--color-foreground)] tracking-tight">{batch.batchNumber}</h3>
                        <p className="text-xs text-[var(--color-muted-foreground)]">{formatDate(batch.serviceDate)}</p>
                      </div>
                    </div>
                    <StatusChip status={batchStatusChip(batch.status)} label={prettifyEnum(batch.status)} />
                  </div>

                  <div className="flex gap-4 mb-4">
                    <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-[var(--color-border)]">
                      <div className="flex items-center gap-1 text-[var(--color-muted-foreground)] mb-1">
                        <Package className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wide">Orders</span>
                      </div>
                      <span className="text-xl font-semibold tabular-nums text-[var(--color-foreground)]">{batch.orderCount}</span>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-[var(--color-border)]">
                      <div className="flex items-center gap-1 text-[var(--color-muted-foreground)] mb-1">
                        <Truck className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wide">Earnings</span>
                      </div>
                      <span className="text-sm font-medium text-[var(--color-foreground)] tabular-nums">
                        {formatNaira(batch.deliveryEarningsKobo)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[var(--color-border)] bg-gray-50 p-3">
                  <Link
                    href={`/batches/${batch.id}`}
                    className="w-full flex justify-center items-center py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-md transition-colors"
                  >
                    View Batch Orders
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </TonalCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
