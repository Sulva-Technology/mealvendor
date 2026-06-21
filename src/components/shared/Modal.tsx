'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Lightweight accessible modal dialog. Rendered in a portal on document.body so
 * it always centers against the viewport (the app's scroll container and
 * `glass` backdrop-filter ancestors otherwise trap a `position: fixed` child).
 * Closes on backdrop click or Escape and locks body scroll while open.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const maxW = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center overflow-y-auto p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative my-0 sm:my-8 w-full ${maxW} bg-white rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] shadow-xl border border-[var(--color-border)] max-h-[92vh] sm:max-h-[88vh] flex flex-col`}
      >
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[var(--color-border)] shrink-0">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">{title}</h2>
            {description && (
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 -m-1.5 rounded-md text-[var(--color-muted-foreground)] hover:bg-gray-100 hover:text-[var(--color-foreground)] transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
