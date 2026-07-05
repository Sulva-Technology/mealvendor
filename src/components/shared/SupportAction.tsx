'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Headset, Send } from 'lucide-react';
import { Modal } from './Modal';
import { supportApi } from '@/src/lib/api/vendor';
import type { SupportIssueBody } from '@/src/lib/api/types';
import { SUPPORT_CATEGORIES, supportCategoryLabel } from '@/src/lib/vendor-workflow';
import { features } from '@/src/config/features';

export function SupportAction({
  subjectType,
  subjectId,
  defaultCategory = 'other',
  label = 'Report issue',
  context,
}: {
  subjectType: SupportIssueBody['subjectType'];
  subjectId: string;
  defaultCategory?: SupportIssueBody['category'];
  label?: string;
  context?: string;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<SupportIssueBody['category']>(defaultCategory);
  const [message, setMessage] = useState(context ?? '');

  const create = useMutation({
    mutationFn: () =>
      supportApi.createIssue({
        subjectType,
        subjectId,
        category,
        message: message.trim(),
      }),
    onSuccess: () => setOpen(false),
  });

  // Hidden until the backend exposes POST /vendor/support/issues; otherwise the
  // modal would always fail on submit. (After hooks — rules-of-hooks.)
  if (!features.supportIssues) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-gray-50"
      >
        <Headset className="h-4 w-4" />
        {label}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Support issue" description={subjectId}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-foreground)]">Category</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as SupportIssueBody['category'])}
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            >
              {SUPPORT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {supportCategoryLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-foreground)]">Details</label>
            <textarea
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Describe what happened..."
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          {create.isError && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{(create.error as Error).message}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => create.mutate()}
              disabled={create.isPending || message.trim().length < 3}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {create.isPending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
