'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TonalCard } from '@/src/components/shared/Cards';
import { LoadingState, ErrorState, EmptyState } from '@/src/components/shared/QueryStates';
import { availabilityApi, qk } from '@/src/lib/api/vendor';
import type { AvailabilityEntry } from '@/src/lib/api/types';
import { Save, AlertCircle, CalendarClock } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function key(slotId: string, day: number) {
  return `${slotId}__${day}`;
}

export default function AvailabilityPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: qk.availability(), queryFn: availabilityApi.list });

  // Local editable copy keyed by slot+day.
  const [map, setMap] = useState<Map<string, AvailabilityEntry>>(new Map());
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (query.data) {
      const m = new Map<string, AvailabilityEntry>();
      for (const e of query.data) m.set(key(e.deliverySlotId, e.dayOfWeek), e);
      setMap(m);
      setDirty(false);
    }
  }, [query.data]);

  const save = useMutation({
    mutationFn: () => availabilityApi.replace([...map.values()]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.availability() });
      setDirty(false);
    },
  });

  const entries = query.data ?? [];
  const slotIds = [...new Set(entries.map((e) => e.deliverySlotId))];

  const toggle = (slotId: string, day: number) => {
    setMap((prev) => {
      const next = new Map(prev);
      const k = key(slotId, day);
      const existing = next.get(k);
      if (existing) {
        next.set(k, { ...existing, available: !existing.available });
      } else {
        next.set(k, { deliverySlotId: slotId, dayOfWeek: day, available: true });
      }
      return next;
    });
    setDirty(true);
  };

  const activeCount = [...map.values()].filter((e) => e.available).length;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Operating Schedule</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Define the days and slots you are open for orders.</p>
        </div>
        <button
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary)]/90 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {save.isPending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </div>

      {save.isError && (
        <p className="text-sm text-[var(--color-error)]">{(save.error as Error).message}</p>
      )}

      {query.isLoading ? (
        <LoadingState label="Loading schedule…" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : slotIds.length === 0 ? (
        <EmptyState
          title="No delivery slots configured"
          description="Your campus delivery slots have not been set up yet. Once they exist, you can toggle availability per day here."
          icon={CalendarClock}
        />
      ) : (
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <TonalCard className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                    <tr>
                      <th className="px-4 py-4 font-semibold text-[var(--color-foreground)] w-32 sticky left-0 bg-gray-50 z-10">Day</th>
                      {slotIds.map((slotId, i) => (
                        <th key={slotId} className="px-4 py-4 font-medium text-center min-w-[100px] text-[var(--color-muted-foreground)]">
                          Slot {i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {DAYS.map((day, dayIdx) => (
                      <tr key={day} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-4 font-medium text-[var(--color-foreground)] sticky left-0 bg-white z-10">{day}</td>
                        {slotIds.map((slotId) => {
                          const entry = map.get(key(slotId, dayIdx));
                          const checked = entry?.available ?? false;
                          return (
                            <td key={slotId} className="px-4 py-4 text-center">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={checked}
                                  onChange={() => toggle(slotId, dayIdx)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[var(--color-primary)]/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]" />
                              </label>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TonalCard>
          </div>

          <div className="space-y-6">
            <TonalCard className="bg-[var(--color-info)]/5 border border-[var(--color-info)]/20">
              <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[var(--color-info)]" />
                Order Cutoffs
              </h3>
              <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                Customers must place orders before each slot&apos;s cutoff. Cutoff times are set by Meal Direct and cannot be edited here.
              </p>
            </TonalCard>

            <TonalCard>
              <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-4">Schedule Health</h3>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--color-muted-foreground)]">Active slots/week</span>
                <span className="font-semibold text-[var(--color-foreground)] tabular-nums">{activeCount}</span>
              </div>
            </TonalCard>
          </div>
        </div>
      )}
    </div>
  );
}
