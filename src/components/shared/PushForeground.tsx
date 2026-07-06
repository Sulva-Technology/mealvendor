'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { onForegroundMessage } from '@/src/config/firebase';
import { qk } from '@/src/lib/api/vendor';

/**
 * Headless: mounted inside the authenticated shell. FCM does not render a system
 * notification while the tab is focused, so we do it ourselves and refresh the
 * bell badge / inbox. Matches the foreground handling in the admin, rider and
 * user apps. Renders nothing; no-ops when push is unsupported.
 */
export function PushForeground() {
  const qc = useQueryClient();

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    onForegroundMessage((payload) => {
      // Read from either the notification payload or a data-only message: the
      // backend sends data-only (title/body/linkPath in `data`) to avoid the
      // web duplicate-notification bug.
      const data = (payload.data ?? {}) as Record<string, string>;
      const title = payload.notification?.title || data.title || 'Meal Direct';
      const body = payload.notification?.body || data.body || 'You have a new update.';

      // Nudge the unread badge + inbox to refetch immediately.
      qc.invalidateQueries({ queryKey: qk.notifications() });

      // Pop a transient in-app toast (FCM suppresses the system notification while
      // the tab is focused). Matches the admin/rider foreground behaviour.
      window.dispatchEvent(new CustomEvent('md:toast', { detail: { title, body } }));
    }).then((fn) => {
      if (cancelled) fn();
      else unsubscribe = fn;
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [qc]);

  return null;
}
