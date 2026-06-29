'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, TrendingUp, Wallet, Clock } from 'lucide-react';
import { MetricCard, TonalCard } from '@/src/components/shared/Cards';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { LoadingState, ErrorState, EmptyState } from '@/src/components/shared/QueryStates';
import { ordersApi, settlementsApi, batchesApi, profileApi, qk } from '@/src/lib/api/vendor';
import { formatNaira, orderStatusChip, orderStatusLabel, todayIso, prettifyEnum } from '@/src/lib/format';

export default function DashboardHome() {
  const today = todayIso();

  const ordersQ = useQuery({ queryKey: qk.orders({ date: today }), queryFn: () => ordersApi.list({ date: today }) });
  const settlementsQ = useQuery({ queryKey: qk.settlements(), queryFn: settlementsApi.list });
  const batchesQ = useQuery({ queryKey: qk.batches(), queryFn: batchesApi.list });
  const profileQ = useQuery({ queryKey: qk.profile(), queryFn: profileApi.get, staleTime: 5 * 60_000 });

  const orders = ordersQ.data ?? [];
  const settlements = settlementsQ.data ?? [];
  const batches = batchesQ.data ?? [];

  const revenue = orders
    .filter((o) => !['cancelled', 'expired', 'refunded', 'pending_payment'].includes(o.orderStatus))
    .reduce((sum, o) => sum + o.totalKobo, 0);
  const pendingPrep = orders.filter((o) => ['paid', 'accepted', 'confirmed'].includes(o.orderStatus)).length;
  const pendingSettlements = settlements
    .filter((s) => s.status === 'draft' || s.status === 'approved')
    .reduce((sum, s) => sum + s.payableKobo, 0);
  const openBatches = batches.filter((b) => b.status === 'open' || b.status === 'in_progress').length;

  const recentOrders = [...orders]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6);

  const isOpen = profileQ.data?.active ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Overview</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {profileQ.data?.displayName
              ? `Welcome back, ${profileQ.data.displayName}.`
              : "Here's what's happening with your store today."}
          </p>
        </div>
        {profileQ.data && (
          <StatusChip status={isOpen ? 'success' : 'default'} label={isOpen ? 'Store Open' : 'Store Closed'} />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Orders"
          value={ordersQ.isLoading ? '…' : String(orders.length)}
          subtext={`${pendingPrep} pending preparation`}
          icon={ShoppingBag}
        />
        <MetricCard
          title="Today's Revenue"
          value={ordersQ.isLoading ? '…' : formatNaira(revenue)}
          subtext="Excludes cancelled/unpaid"
          icon={TrendingUp}
        />
        <MetricCard
          title="Pending Settlements"
          value={settlementsQ.isLoading ? '…' : formatNaira(pendingSettlements)}
          subtext="Draft & approved payouts"
          icon={Wallet}
        />
        <MetricCard
          title="Open Batches"
          value={batchesQ.isLoading ? '…' : String(openBatches)}
          subtext={`${batches.length} total today`}
          icon={Clock}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <TonalCard className="flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold tracking-tight">Recent Orders</h2>
            <Link href="/orders" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
              View all
            </Link>
          </div>
          {ordersQ.isLoading ? (
            <LoadingState label="Loading orders…" rows={4} />
          ) : ordersQ.isError ? (
            <ErrorState error={ordersQ.error} onRetry={() => ordersQ.refetch()} />
          ) : recentOrders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState title="No orders today yet" />
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50/50 -mx-2 px-2 rounded transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">{o.orderNumber}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{o.locationName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums">{formatNaira(o.totalKobo)}</span>
                    <StatusChip status={orderStatusChip(o.orderStatus)} label={orderStatusLabel(o.orderStatus)} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TonalCard>

        <TonalCard className="flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold tracking-tight">Today&apos;s Batches</h2>
            <Link href="/batches" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
              Manage
            </Link>
          </div>
          {batchesQ.isLoading ? (
            <LoadingState label="Loading batches…" rows={4} />
          ) : batchesQ.isError ? (
            <ErrorState error={batchesQ.error} onRetry={() => batchesQ.refetch()} />
          ) : batches.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState title="No batches scheduled" />
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {batches.slice(0, 6).map((b) => (
                <Link
                  key={b.id}
                  href={`/batches/${b.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50/50 -mx-2 px-2 rounded transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">{b.batchNumber}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{b.orderCount} orders</p>
                  </div>
                  <StatusChip status={b.status === 'open' ? 'info' : 'default'} label={prettifyEnum(b.status)} />
                </Link>
              ))}
            </div>
          )}
        </TonalCard>
      </div>
    </div>
  );
}
