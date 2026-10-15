'use client';

import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronRight, Circle, PlayCircle } from 'lucide-react';
import { availabilityApi, menuApi, profileApi, qk } from '@/src/lib/api/vendor';
import { useVendorRole } from '@/src/lib/hooks/useVendorRole';
import { useTutorialStore } from '@/src/lib/tutorial-progress';
import { setupChecklist } from '@/src/lib/tutorial-rules';
import {
  FREQUENCY_HINT,
  FREQUENCY_LABEL,
  tutorialsByFrequency,
  type TutorialFrequency,
} from '@/src/config/tutorials';
import { FrequencyBadge, useTutorialUserId } from '@/src/components/tutorial/TutorialHost';

const GROUP_ORDER: TutorialFrequency[] = ['once', 'daily', 'weekly', 'as_needed'];

const noSubscription = () => () => {};

/** Whether this browser already allows notifications. False during server render. */
function usePushEnabled(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted',
    () => false,
  );
}

export default function GuidePage() {
  const userId = useTutorialUserId();
  const store = useTutorialStore();
  const progress = store.progressFor(userId);
  const { isOwner, isStaff } = useVendorRole();
  const pushEnabled = usePushEnabled();

  const profileQ = useQuery({ queryKey: qk.profile(), queryFn: profileApi.get });
  const payoutQ = useQuery({ queryKey: qk.payoutAccount(), queryFn: profileApi.getPayoutAccount, enabled: isOwner });
  const availabilityQ = useQuery({ queryKey: qk.availability(), queryFn: availabilityApi.list });
  const menuQ = useQuery({ queryKey: qk.menuItems(), queryFn: menuApi.list });

  const checklistLoading = profileQ.isLoading || availabilityQ.isLoading || menuQ.isLoading;
  const checklist = setupChecklist({
    activeMenuItemCount: (menuQ.data ?? []).filter((item) => item.active).length,
    availableSlotCount: (availabilityQ.data ?? []).filter((entry) => entry.available).length,
    hasLogo: Boolean(profileQ.data?.logoUrl),
    hasPayoutAccount: Boolean(payoutQ.data),
    hasPhone: Boolean(profileQ.data?.phone),
    isOwner,
    pushEnabled,
  });
  const doneCount = checklist.filter((item) => item.done).length;
  const groups = tutorialsByFrequency();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Guide</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          How Meal Direct works, what to set up once, and what to do every day.
        </p>
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-semibold tracking-tight">How the whole system works</h2>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            A two-minute tour: how an order flows from a student to your kitchen to a rider, and how you get paid.
          </p>
        </div>
        <button
          type="button"
          onClick={store.openTour}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          <PlayCircle className="h-5 w-5" />
          {progress.tourCompleted ? 'Replay the tour' : 'Start the tour'}
        </button>
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Your one-time setup</h2>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              Do these once before your first order. They tick themselves off as you finish them.
            </p>
          </div>
          {!checklistLoading && (
            <span className="shrink-0 rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-sm font-semibold text-[var(--color-primary)]">
              {doneCount}/{checklist.length}
            </span>
          )}
        </div>
        <ul className="mt-4 divide-y divide-[var(--color-border)]">
          {checklist.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="flex items-center gap-3 py-3 group">
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Done" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-gray-300" aria-label="Not done yet" />
                )}
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm font-medium ${item.done ? 'text-[var(--color-muted-foreground)] line-through' : 'text-[var(--color-foreground)]'}`}>
                    {item.label}
                  </span>
                  <span className="block text-xs text-[var(--color-muted-foreground)]">{item.hint}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-[var(--color-primary)]" />
              </Link>
            </li>
          ))}
        </ul>
        {isStaff && (
          <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
            The bank account is managed by the store owner, so it is not listed here.
          </p>
        )}
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Every page, and why it exists</h2>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Tap any page for its full tutorial. You can also tap the ? button on any page.
          </p>
        </div>

        {GROUP_ORDER.map((frequency) => {
          const pages = groups[frequency].filter((page) => !(page.ownerOnly && isStaff));
          if (pages.length === 0) return null;
          return (
            <div key={frequency}>
              <div className="flex items-center gap-2 mb-2">
                <FrequencyBadge frequency={frequency} />
                <span className="text-xs text-[var(--color-muted-foreground)]">{FREQUENCY_HINT[frequency]}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {pages.map((page) => (
                  <button
                    key={page.route}
                    type="button"
                    onClick={() => store.openPage(page.route)}
                    className="text-left rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm hover:border-[var(--color-primary)]/40 transition-colors"
                    aria-label={`${page.title}: ${FREQUENCY_LABEL[page.frequency]}. Open tutorial`}
                  >
                    <span className="block font-semibold text-[var(--color-foreground)]">{page.title}</span>
                    <span className="block text-sm text-[var(--color-muted-foreground)] mt-1 line-clamp-3">{page.why}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Tutorial settings</h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={progress.autoShowPages}
            onChange={(e) => store.setAutoShowPages(userId, e.target.checked)}
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          Show each page&apos;s tutorial the first time I open it
        </label>
        <button
          type="button"
          onClick={() => store.reset(userId)}
          className="text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          Show all tutorials again from the start
        </button>
      </section>
    </div>
  );
}
