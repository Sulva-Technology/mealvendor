'use client';

import { useEffect, useState } from 'react';

/**
 * Transient toast popups for foreground pushes. Decoupled via a `md:toast`
 * window event so PushForeground can raise one without shared state. Mirrors the
 * in-app toasts the admin/rider apps show while the tab is focused.
 * Auto-dismisses; click to close.
 */
type Toast = { id: string; title: string; body: string };

export type PushToastDetail = { title: string; body?: string };

export function PushToaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<PushToastDetail>).detail;
      if (!detail?.title) return;
      const id = 'toast_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id, title: detail.title, body: detail.body ?? '' }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };
    window.addEventListener('md:toast', onToast);
    return () => window.removeEventListener('md:toast', onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-left shadow-lg"
        >
          <p className="text-sm font-semibold text-[var(--color-foreground)]">{t.title}</p>
          {t.body && <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">{t.body}</p>}
        </button>
      ))}
    </div>
  );
}
