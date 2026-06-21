'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TonalCard } from '@/src/components/shared/Cards';
import { LoadingState, ErrorState, EmptyState } from '@/src/components/shared/QueryStates';
import { notificationsApi, qk } from '@/src/lib/api/vendor';
import { formatRelative } from '@/src/lib/format';
import { Bell, Check, ExternalLink } from 'lucide-react';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: qk.notifications(), queryFn: notificationsApi.list });
  const notifications = query.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.notifications() });
  const markRead = useMutation({ mutationFn: (id: string) => notificationsApi.markRead(id), onSuccess: invalidate });
  const markAll = useMutation({ mutationFn: () => notificationsApi.markAllRead(), onSuccess: invalidate });

  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Notifications</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Updates, alerts, and operational reminders.</p>
        </div>
        <button
          onClick={() => markAll.mutate()}
          disabled={!hasUnread || markAll.isPending}
          className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-gray-50 text-[var(--color-foreground)] transition-colors flex items-center gap-2 bg-white disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          {markAll.isPending ? 'Marking…' : 'Mark all as read'}
        </button>
      </div>

      {query.isLoading ? (
        <LoadingState label="Loading notifications…" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : notifications.length === 0 ? (
        <EmptyState title="You're all caught up!" icon={Bell} />
      ) : (
        <div className="grid gap-4">
          {notifications.map((notif) => {
            const unread = !notif.readAt;
            return (
              <TonalCard
                key={notif.id}
                className={`p-4 sm:p-5 flex gap-4 items-start ${unread ? 'bg-white border-l-4 border-l-[var(--color-primary)]' : 'bg-gray-50 opacity-80'}`}
              >
                <div className={`p-2 rounded-full shrink-0 mt-0.5 ${unread ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-gray-200 text-gray-500'}`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h3 className="font-semibold text-[var(--color-foreground)]">{notif.title}</h3>
                    <span className="text-xs text-[var(--color-muted-foreground)] whitespace-nowrap">{formatRelative(notif.createdAt)}</span>
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">{notif.body}</p>
                  <div className="flex items-center gap-4 mt-3">
                    {notif.linkPath && (
                      <Link href={notif.linkPath} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline">
                        View details <ExternalLink className="w-3 h-3" />
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
      )}
    </div>
  );
}
