/**
 * Tutorial progress, per signed-in user on this device: whether the system tour was
 * finished or skipped, which page tutorials were already shown, and whether page
 * tutorials should pop up on first visit. Pure helpers are exported for tests.
 */
export type TutorialProgress = {
  tourCompleted: boolean;
  seenPages: string[];
  autoShowPages: boolean;
};

export const EMPTY_PROGRESS: TutorialProgress = {
  tourCompleted: false,
  seenPages: [],
  autoShowPages: true,
};

/** The full tour opens by itself once, on the dashboard, for a vendor who has not seen it. */
export function shouldAutoOpenTour(progress: TutorialProgress, pathname: string): boolean {
  return !progress.tourCompleted && pathname === '/';
}

/**
 * A page tutorial opens by itself on the first visit to that page, but never on top of
 * the tour and never once the vendor turned auto-tips off.
 */
export function shouldAutoOpenPage(progress: TutorialProgress, route: string): boolean {
  return progress.tourCompleted && progress.autoShowPages && !progress.seenPages.includes(route);
}

export function markPageSeen(progress: TutorialProgress, route: string): TutorialProgress {
  return progress.seenPages.includes(route)
    ? progress
    : { ...progress, seenPages: [...progress.seenPages, route] };
}

export type SetupItem = {
  id: 'profile' | 'payout' | 'availability' | 'menu' | 'push';
  label: string;
  hint: string;
  href: string;
  done: boolean;
};

/**
 * The one-time setup a vendor must finish before taking orders, with live status from
 * their real data. Payout is owner-only, so staff never see it.
 */
export function setupChecklist(input: {
  isOwner: boolean;
  hasLogo: boolean;
  hasPhone: boolean;
  hasPayoutAccount: boolean;
  availableSlotCount: number;
  activeMenuItemCount: number;
  pushEnabled: boolean;
}): SetupItem[] {
  const items: SetupItem[] = [
    {
      done: input.hasLogo && input.hasPhone,
      hint: 'Logo and phone number so students and riders recognise and reach you.',
      href: '/settings',
      id: 'profile',
      label: 'Complete your store profile',
    },
    {
      done: input.hasPayoutAccount,
      hint: 'Your bank account for settlements. Without it you cannot be paid.',
      href: '/settings',
      id: 'payout',
      label: 'Add your payout bank account',
    },
    {
      done: input.availableSlotCount > 0,
      hint: 'The days and delivery slots you cook for each week.',
      href: '/availability',
      id: 'availability',
      label: 'Set your operating schedule',
    },
    {
      done: input.activeMenuItemCount > 0,
      hint: 'At least one active dish with a photo and a schedule.',
      href: '/menu',
      id: 'menu',
      label: 'Add your menu',
    },
    {
      done: input.pushEnabled,
      hint: 'So new paid orders reach your phone even when the app is closed.',
      href: '/settings',
      id: 'push',
      label: 'Turn on order notifications',
    },
  ];
  return input.isOwner ? items : items.filter((item) => item.id !== 'payout');
}
