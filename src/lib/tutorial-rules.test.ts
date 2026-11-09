import { describe, expect, it } from 'vitest';
import {
  EMPTY_PROGRESS,
  markPageSeen,
  setupChecklist,
  shouldAutoOpenPage,
  shouldAutoOpenTour,
} from './tutorial-rules';

const base = {
  activeMenuItemCount: 0,
  availableSlotCount: 0,
  hasLogo: false,
  hasPayoutAccount: false,
  hasPhone: false,
  isOwner: true,
  pushEnabled: false,
};

describe('tutorial progress rules', () => {
  it('opens the tour once, on the dashboard only', () => {
    expect(shouldAutoOpenTour(EMPTY_PROGRESS, '/')).toBe(true);
    expect(shouldAutoOpenTour(EMPTY_PROGRESS, '/orders')).toBe(false);
    expect(shouldAutoOpenTour({ ...EMPTY_PROGRESS, tourCompleted: true }, '/')).toBe(false);
  });

  it('opens a page tutorial on first visit, after the tour, unless turned off', () => {
    const afterTour = { ...EMPTY_PROGRESS, tourCompleted: true };
    expect(shouldAutoOpenPage(EMPTY_PROGRESS, '/orders')).toBe(false);
    expect(shouldAutoOpenPage(afterTour, '/orders')).toBe(true);
    expect(shouldAutoOpenPage(markPageSeen(afterTour, '/orders'), '/orders')).toBe(false);
    expect(shouldAutoOpenPage({ ...afterTour, autoShowPages: false }, '/orders')).toBe(false);
  });

  it('records a seen page once', () => {
    const seen = markPageSeen(markPageSeen(EMPTY_PROGRESS, '/menu'), '/menu');
    expect(seen.seenPages).toEqual(['/menu']);
  });
});

describe('setup checklist', () => {
  it('lists the one-time tasks and ticks them from real data', () => {
    const items = setupChecklist({
      ...base,
      activeMenuItemCount: 3,
      availableSlotCount: 5,
      hasLogo: true,
      hasPhone: true,
    });
    expect(items.map((i) => [i.id, i.done])).toEqual([
      ['profile', true],
      ['payout', false],
      ['availability', true],
      ['menu', true],
      ['push', false],
    ]);
  });

  it('needs both logo and phone for the profile step', () => {
    expect(setupChecklist({ ...base, hasLogo: true })[0]?.done).toBe(false);
  });

  it('hides the owner-only bank account step from staff', () => {
    expect(setupChecklist({ ...base, isOwner: false }).map((i) => i.id)).not.toContain('payout');
  });
});
