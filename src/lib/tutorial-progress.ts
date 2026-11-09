'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  EMPTY_PROGRESS,
  markPageSeen,
  type TutorialProgress,
} from '@/src/lib/tutorial-rules';

type UiState = {
  tourOpen: boolean;
  /** Route pattern of the page tutorial being shown, if any. */
  pageOpen: string | null;
};

type TutorialStore = UiState & {
  byUser: Record<string, TutorialProgress>;
  progressFor: (userId: string) => TutorialProgress;
  openTour: () => void;
  closeTour: (userId: string) => void;
  openPage: (route: string) => void;
  closePage: (userId: string) => void;
  setAutoShowPages: (userId: string, value: boolean) => void;
  reset: (userId: string) => void;
};

function update(
  state: TutorialStore,
  userId: string,
  change: (progress: TutorialProgress) => TutorialProgress,
): Record<string, TutorialProgress> {
  return { ...state.byUser, [userId]: change(state.byUser[userId] ?? EMPTY_PROGRESS) };
}

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      byUser: {},
      tourOpen: false,
      pageOpen: null,
      progressFor: (userId) => get().byUser[userId] ?? EMPTY_PROGRESS,
      openTour: () => set({ pageOpen: null, tourOpen: true }),
      // Closing the tour, finished or skipped, counts as done: it can be replayed from the Guide.
      closeTour: (userId) =>
        set((state) => ({
          byUser: update(state, userId, (p) => ({ ...p, tourCompleted: true })),
          tourOpen: false,
        })),
      openPage: (route) => set({ pageOpen: route, tourOpen: false }),
      closePage: (userId) =>
        set((state) => ({
          byUser: state.pageOpen
            ? update(state, userId, (p) => markPageSeen(p, state.pageOpen as string))
            : state.byUser,
          pageOpen: null,
        })),
      setAutoShowPages: (userId, value) =>
        set((state) => ({ byUser: update(state, userId, (p) => ({ ...p, autoShowPages: value })) })),
      reset: (userId) => set((state) => ({ byUser: update(state, userId, () => EMPTY_PROGRESS) })),
    }),
    {
      name: 'md-vendor-tutorials',
      // Only progress is remembered; which dialog is open is per page load.
      partialize: (state) => ({ byUser: state.byUser }),
    },
  ),
);
