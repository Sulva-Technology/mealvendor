'use client';

import React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, ExternalLink, PackageCheck } from 'lucide-react';
import { TonalCard } from '@/src/components/shared/Cards';
import { EmptyState, ErrorState, LoadingState } from '@/src/components/shared/QueryStates';
import { notificationsApi, qk } from '@/src/lib/api/vendor';
import { formatRelative } from '@/src/lib/format';

const EXPECTED_EVENTS = [
  'new_paid_order',
  'order_cancelled',
  'rider_assigned',
  'rider_arrived',
  'settlement_generated',
  'review_received',
  'inventory_low',
] as const;

function eventLabel(eventType: string) {
  return eventType.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: qk.notifications(), queryFn: notificationsApi.list });
  const notifications = query.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.notifications() });
  const markRead = useMutation({ mutationFn: (id: string) => notificationsApi.markRead(id), onSuccess: invalidate });
  const markAll = useMutation({ mutationFn: () => notificationsApi.markAllRead(), onSuccess: invalidate });

  const hasUnread = notifications.some((n) => !n.readAt);
  const seenEvents = new Set(notifications.map((n) => n.eventType));

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Notifications</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Paid orders, rider handoff, settlements, reviews, and inventory alerts.</p>
        </div>
        <button
          onClick={() => markAll.mutate()}
          disabled={!hasUnread || markAll.isPending}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {markAll.isPending ? 'Marking...' : 'Mark all as read'}
        </button>
      </div>

      {query.isLoading ? (
        <LoadingState label="Loading notifications..." />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : notifications.length === 0 ? (
        <EmptyState title="No notifications" description="Operational alerts appear here once backend sends them." icon={Bell} />
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <p className="text-sm font-semibold text-[var(--color-foreground)]">Notification coverage</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXPECTED_EVENTS.map((event) => (
                <span
                  key={event}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    seenEvents.has(event)
                      ? 'border-[var(--color-success)]/20 bg-[var(--color-success)]/10 text-[var(--color-success)]'
                      : 'border-[var(--color-border)] bg-gray-50 text-[var(--color-muted-foreground)]'
                  }`}
                >
                  {eventLabel(event)}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {notifications.map((notif) => {
              const unread = !notif.readAt;
              return (
                <TonalCard key={notif.id} className={`flex items-start gap-4 p-4 sm:p-5 ${unread ? 'border-l-4 border-l-[var(--color-primary)] bg-white' : 'bg-gray-50 opacity-80'}`}>
                  <div className={`mt-0.5 shrink-0 rounded-full p-2 ${unread ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-gray-200 text-gray-500'}`}>
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-[var(--color-foreground)]">{notif.title}</h3>
                        <p className="text-xs text-[var(--color-muted-foreground)]">{eventLabel(notif.eventType)} / {notif.aggregateType}</p>
                      </div>
                      <span className="whitespace-nowrap text-xs text-[var(--color-muted-foreground)]">{formatRelative(notif.createdAt)}</span>
                    </div>
                    <p className="text-sm text-[var(--color-muted-foreground)]">{notif.body}</p>
                    <div className="mt-3 flex items-center gap-4">
                      {notif.linkPath && (
                        <Link href={notif.linkPath} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline">
                          View details <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                      {unread && (
                        <button
                          onClick={() => markRead.mutate(notif.id)}
                          disabled={markRead.isPending}
                          className="text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] disabled:opacity-50"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </TonalCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
