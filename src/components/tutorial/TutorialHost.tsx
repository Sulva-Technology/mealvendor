'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarClock, CalendarDays, CheckCircle2, HelpCircle, Repeat, Sparkles } from 'lucide-react';
import { Modal } from '@/src/components/shared/Modal';
import { useAuthStore } from '@/src/lib/auth/session';
import { useTutorialStore } from '@/src/lib/tutorial-progress';
import { shouldAutoOpenPage, shouldAutoOpenTour } from '@/src/lib/tutorial-rules';
import {
  FREQUENCY_HINT,
  FREQUENCY_LABEL,
  SYSTEM_TOUR,
  tutorialForPath,
  type PageTutorial,
  type TutorialFrequency,
} from '@/src/config/tutorials';

const FREQUENCY_STYLE: Record<TutorialFrequency, { className: string; Icon: React.ElementType }> = {
  once: { className: 'bg-violet-50 text-violet-700 border-violet-200', Icon: CheckCircle2 },
  daily: { className: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: Repeat },
  weekly: { className: 'bg-sky-50 text-sky-700 border-sky-200', Icon: CalendarDays },
  as_needed: { className: 'bg-gray-50 text-gray-700 border-gray-200', Icon: CalendarClock },
};

export function FrequencyBadge({ frequency }: { frequency: TutorialFrequency }) {
  const { className, Icon } = FREQUENCY_STYLE[frequency];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {FREQUENCY_LABEL[frequency]}
    </span>
  );
}

/** The signed-in user's id, or a device-wide fallback before the session resolves. */
export function useTutorialUserId(): string {
  return useAuthStore((s) => s.user?.id ?? 'anonymous');
}

export function PageTutorialContent({ tutorial }: { tutorial: PageTutorial }) {
  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <FrequencyBadge frequency={tutorial.frequency} />
        {tutorial.ownerOnly && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            Owner only
          </span>
        )}
      </div>
      <p className="text-[var(--color-muted-foreground)]">{FREQUENCY_HINT[tutorial.frequency]}</p>

      <section>
        <h3 className="font-semibold text-[var(--color-foreground)] mb-1">Why this page exists</h3>
        <p className="text-[var(--color-foreground)] leading-relaxed">{tutorial.why}</p>
      </section>

      <section>
        <h3 className="font-semibold text-[var(--color-foreground)] mb-2">How to use it</h3>
        <ol className="space-y-2">
          {tutorial.steps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-xs font-semibold text-[var(--color-primary)]">
                {index + 1}
              </span>
              <span className="leading-relaxed pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {tutorial.tips && tutorial.tips.length > 0 && (
        <section className="rounded-lg bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/15 p-3">
          <h3 className="font-semibold text-[var(--color-foreground)] mb-1">Tips</h3>
          <ul className="list-disc pl-5 space-y-1">
            {tutorial.tips.map((tip) => (
              <li key={tip} className="leading-relaxed">{tip}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// Mounted only while open, so every opening starts again at step one.
function SystemTourModal({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = React.useState(0);
  const open = true;

  const step = SYSTEM_TOUR[index] ?? SYSTEM_TOUR[0];
  const isLast = index === SYSTEM_TOUR.length - 1;
  if (!step) return null;

  return (
    <Modal open={open} onClose={onClose} title={step.title} description={`Step ${index + 1} of ${SYSTEM_TOUR.length}`} size="md">
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-[var(--color-foreground)]">{step.body}</p>

        {step.links && (
          <div className="flex flex-wrap gap-2">
            {step.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className="rounded-full border border-[var(--color-primary)]/30 px-3 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
              >
                Go to {link.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
          {SYSTEM_TOUR.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-[var(--color-primary)]' : 'w-1.5 bg-gray-300'}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
            Skip tour
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex(index - 1)}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? onClose() : setIndex(index + 1))}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              {isLast ? 'Start using Meal Direct' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Mounted once in the app shell. Opens the system tour on a vendor's first visit, opens
 * each page's tutorial on the first visit to that page, and shows a "?" button so any
 * page's tutorial can be reopened.
 */
export function TutorialHost() {
  const pathname = usePathname();
  const userId = useTutorialUserId();
  const ready = useAuthStore((s) => s.ready);
  const store = useTutorialStore();
  const tutorial = tutorialForPath(pathname);
  const progress = store.progressFor(userId);

  // Wait for the session (so progress is keyed to the right user) and for the persisted
  // store to load, then decide once per page whether to open anything automatically.
  const hydrated = useSyncExternalStore(
    (onChange) => useTutorialStore.persist.onFinishHydration(onChange),
    () => useTutorialStore.persist.hasHydrated(),
    () => false,
  );

  useEffect(() => {
    if (!hydrated || !ready || store.tourOpen || store.pageOpen) return;
    if (shouldAutoOpenTour(progress, pathname)) {
      store.openTour();
    } else if (tutorial && shouldAutoOpenPage(progress, tutorial.route)) {
      store.openPage(tutorial.route);
    }
    // Only when the page or readiness changes, not on every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, ready, pathname]);

  const openTutorial = store.pageOpen ? tutorialForPath(store.pageOpen) : undefined;

  return (
    <>
      {tutorial && (
        <button
          type="button"
          onClick={() => store.openPage(tutorial.route)}
          aria-label={`How the ${tutorial.title} page works`}
          title={`How the ${tutorial.title} page works`}
          className="fixed right-4 bottom-20 md:bottom-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg hover:opacity-90"
        >
          <HelpCircle className="h-6 w-6" />
        </button>
      )}

      {store.tourOpen && <SystemTourModal onClose={() => store.closeTour(userId)} />}

      <Modal
        open={openTutorial !== undefined}
        onClose={() => store.closePage(userId)}
        title={openTutorial?.title ?? ''}
        size="md"
      >
        {openTutorial && (
          <div className="space-y-6">
            <PageTutorialContent tutorial={openTutorial} />
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[var(--color-border)] pt-4">
              <Link
                href="/guide"
                onClick={() => store.closePage(userId)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline"
              >
                <Sparkles className="h-4 w-4" />
                How the whole system works
              </Link>
              <button
                type="button"
                onClick={() => store.closePage(userId)}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
