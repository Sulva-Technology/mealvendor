'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Soup } from 'lucide-react';
import { TonalCard } from '@/src/components/shared/Cards';
import { EmptyState, ErrorState, LoadingState } from '@/src/components/shared/QueryStates';
import { StatusChip } from '@/src/components/shared/StatusChip';
import { soupApi, qk } from '@/src/lib/api/vendor';
import type { VendorSoupOption } from '@/src/lib/api/types';
import { useVendorApproval } from '@/src/lib/hooks/useVendorApproval';

export default function SoupsPage() {
  const queryClient = useQueryClient();
  const { isApproved } = useVendorApproval();
  const lockTitle = 'Available once your vendor account is approved';

  const query = useQuery({ queryKey: qk.soupOptions(), queryFn: soupApi.list, refetchOnMount: 'always' });

  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk.soupOptions() });

  const create = useMutation({
    mutationFn: () => soupApi.create({ name: newName.trim() }),
    onSuccess: () => {
      setNewName('');
      invalidate();
    },
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => soupApi.update(id, { name: name.trim() }),
    onSuccess: () => {
      setEditId(null);
      setEditName('');
      invalidate();
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => soupApi.update(id, { active: !active }),
    onSuccess: invalidate,
  });

  const soups = query.data ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/menu" className="p-2 hover:bg-gray-100 rounded-md transition-colors">
          <ArrowLeft className="h-5 w-5 text-[var(--color-muted-foreground)]" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
            <Soup className="h-6 w-6 text-[var(--color-primary)]" /> Soups
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            One shared list. Any menu item marked “requires a soup” lets customers pick one of the active soups
            below.
          </p>
        </div>
      </div>

      <TonalCard>
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">Add a soup</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            placeholder="e.g. Egusi, Ogbono, Vegetable"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim() && !create.isPending) create.mutate();
            }}
            disabled={!isApproved}
            title={!isApproved ? lockTitle : undefined}
            className="flex-1 px-3 py-2 bg-white border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending || !newName.trim() || !isApproved}
            title={!isApproved ? lockTitle : undefined}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-primary)] text-white rounded-md text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            {create.isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
        {create.isError && (
          <p className="mt-2 text-xs text-[var(--color-error)]">{(create.error as Error).message}</p>
        )}
      </TonalCard>

      <TonalCard>
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">Your soups</h2>
        {query.isLoading ? (
          <LoadingState label="Loading soups…" rows={3} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : soups.length === 0 ? (
          <EmptyState title="No soups yet" description="Add your first soup above to enable soup selection on your swallow dishes." />
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {soups.map((soup: VendorSoupOption) => (
              <li key={soup.id} className="flex items-center justify-between gap-3 py-3">
                {editId === soup.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && editName.trim()) rename.mutate({ id: soup.id, name: editName });
                      if (e.key === 'Escape') setEditId(null);
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                ) : (
                  <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-foreground)]">
                    {soup.name}
                    <StatusChip status={soup.active ? 'success' : 'default'} label={soup.active ? 'Active' : 'Hidden'} />
                  </span>
                )}

                <div className="flex items-center gap-3 shrink-0">
                  {editId === soup.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => rename.mutate({ id: soup.id, name: editName })}
                        disabled={rename.isPending || !editName.trim()}
                        className="text-sm font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditId(null)}
                        className="text-sm text-[var(--color-muted-foreground)] hover:underline"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(soup.id);
                          setEditName(soup.name);
                        }}
                        disabled={!isApproved}
                        title={!isApproved ? lockTitle : undefined}
                        className="text-sm font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle.mutate({ id: soup.id, active: soup.active })}
                        disabled={toggle.isPending || !isApproved}
                        title={!isApproved ? lockTitle : undefined}
                        className="text-sm font-medium text-[var(--color-muted-foreground)] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        {soup.active ? 'Hide' : 'Show'}
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </TonalCard>
    </div>
  );
}
