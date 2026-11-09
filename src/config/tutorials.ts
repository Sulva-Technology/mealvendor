/**
 * In-app tutorials for vendors: one guided tour of how Meal Direct works end to end,
 * and one short tutorial per page explaining why the page exists, how often it is
 * needed, and how to use it. Content only: no React here, so it is unit-testable.
 */

/** How often a vendor needs a page. Drives the badge on every tutorial. */
export type TutorialFrequency = 'once' | 'daily' | 'weekly' | 'as_needed';

export const FREQUENCY_LABEL: Record<TutorialFrequency, string> = {
  once: 'Do once',
  daily: 'Every day',
  weekly: 'Weekly',
  as_needed: 'When needed',
};

export const FREQUENCY_HINT: Record<TutorialFrequency, string> = {
  once: 'Set this up once when you join. Come back only if something changes.',
  daily: 'Part of your daily routine while you are taking orders.',
  weekly: 'Check this about once a week.',
  as_needed: 'Open this only when you need it.',
};

export type PageTutorial = {
  /** Route pattern; dynamic segments written as [param]. */
  route: string;
  title: string;
  frequency: TutorialFrequency;
  /** One or two sentences: why this page exists. */
  why: string;
  /** How to use it, in order. */
  steps: string[];
  tips?: string[];
  /** Only the vendor owner sees this page. */
  ownerOnly?: boolean;
};

export const PAGE_TUTORIALS: PageTutorial[] = [
  {
    route: '/',
    title: 'Dashboard',
    frequency: 'daily',
    why: 'Your home screen. It shows today at a glance: orders, revenue, money waiting to be paid to you, and batches still open, so you know what needs attention first.',
    steps: [
      'Open it at the start of each service to see how busy today is.',
      'Use the recent orders and batches lists to jump straight into one, or "View all" for the full page.',
      'If "Open Batches" is above zero close to a delivery time, go to Batches and get those orders ready.',
    ],
    tips: ['The numbers refresh on their own. Pull down or reload if you have just finished a big rush.'],
  },
  {
    route: '/orders',
    title: 'Orders',
    frequency: 'daily',
    why: 'Every paid order from a student lands here. This is where you tell Meal Direct that food is ready so a rider can collect it.',
    steps: [
      'New paid orders appear at the top. Each one is already paid for: you never collect cash.',
      'Cook the order, pack it, then tap "Mark ready for pickup". That tells the rider and the customer it is waiting for collection.',
      'You can select several orders and mark them ready together.',
      'Use the filters to see ready, picked-up, or completed orders.',
    ],
    tips: [
      'Read special instructions (shown in orange) before you pack.',
      'Mark ready only when the food is packed. Riders plan their route around it.',
    ],
  },
  {
    route: '/orders/[orderId]',
    title: 'Order details',
    frequency: 'as_needed',
    why: 'Everything about one order: items, soups, quantities, the customer\'s delivery point and room number, and its status history.',
    steps: [
      'Check the items and notes while packing.',
      'Tap "Mark ready for pickup" here if you did not do it from the list.',
      'If something is wrong (missing item, customer problem), use the support button so the team can help.',
    ],
  },
  {
    route: '/batches',
    title: 'Batches',
    frequency: 'daily',
    why: 'Orders going to the same delivery slot and zone are grouped into a batch so one rider can carry them together. This is how you see what each rider will collect, and when.',
    steps: [
      'Each batch shows its delivery slot, zone, how many orders are inside, and whether a rider is assigned.',
      'Open a batch to see every order in it and get them all ready before the pickup time.',
      'When the rider arrives, check the handoff code on the batch page before handing over the food.',
    ],
    tips: ['Batches appear automatically once orders are placed. You do not create them yourself.'],
  },
  {
    route: '/batches/[batchId]',
    title: 'Batch details',
    frequency: 'daily',
    why: 'One rider pickup: the orders inside it, who the rider is, and the handoff code that proves you gave the food to the right person.',
    steps: [
      'Mark each order ready as you finish it.',
      'When the rider arrives, match the handoff code before releasing the food.',
      'If a "Confirm pickup" button is shown, tap it once the rider has the bags.',
    ],
  },
  {
    route: '/availability',
    title: 'Operating schedule',
    frequency: 'once',
    why: 'Tells Meal Direct which days and delivery slots you cook for. Students can only order from you in the slots you switch on here.',
    steps: [
      'Each row is a delivery slot set by your campus (for example breakfast, lunch, dinner). Each column is a day of the week.',
      'Tick the slots you can serve every week, then save.',
      'Use the store status buttons (Open, Sold out today, Pause, Closed) to stop orders for a while without changing your schedule.',
    ],
    tips: ['Set this once. Change it only when your opening days change.'],
  },
  {
    route: '/menu',
    title: 'Menu',
    frequency: 'once',
    why: 'Your dishes, prices, and photos. Students only see what is on this page, so building it is the main part of getting started.',
    steps: [
      'Tap "Add item" for each dish: name, category, price, unit (plate, wrap, piece) and a clear photo.',
      'Open each dish and choose which days and slots it is sold. A dish with no schedule never shows to students.',
      'Use "Sold out" for the rest of today if you run out, and the active switch to hide a dish for longer.',
    ],
    tips: [
      'Good photos sell. Take them in daylight on a plain plate.',
      'After setup, come back only to change prices or add new dishes.',
    ],
  },
  {
    route: '/menu/[itemId]/edit',
    title: 'Edit a dish',
    frequency: 'once',
    why: 'All the details of one dish: price, photo, and the weekly schedule of when it is sold.',
    steps: [
      'Update the name, price, or photo and save.',
      'In the schedule grid, tick the day and slot combinations this dish is available.',
      'Save the schedule. Daily stock for this dish is created from it automatically.',
    ],
  },
  {
    route: '/menu/soups',
    title: 'Soups',
    frequency: 'once',
    why: 'If you sell swallow (eba, amala, pounded yam...), customers pick a soup with it. This page holds the soups they can choose from.',
    steps: [
      'Add each soup you cook.',
      'Turn a soup off when you are not making it.',
      'Swallow dishes on your menu offer these soups automatically.',
    ],
    tips: ['Skip this page if you do not sell swallow.'],
  },
  {
    route: '/inventory',
    title: 'Inventory',
    frequency: 'daily',
    why: 'How many portions of each dish you can sell per slot today. Stock stops you from receiving more orders than you can cook.',
    steps: [
      'Pick the date (today by default). Rows are created automatically from your menu schedule.',
      'Set the quantity you plan to cook for each dish and slot before orders start.',
      'Watch the "Low" and "Out" tabs during service, and adjust if you can make more.',
    ],
    tips: ['When stock reaches zero the dish shows as sold out to students for that slot. No overselling.'],
  },
  {
    route: '/settlements',
    title: 'Settlements',
    frequency: 'weekly',
    ownerOnly: true,
    why: 'Your money. Each settlement covers one day of sales: gross sales, Meal Direct fees, refunds, and the net amount paid to your bank account.',
    steps: [
      'Each row is one service day, with its status: draft, approved, then paid.',
      'Open a settlement to see every order that went into it.',
      'If a number looks wrong, use the support button on that settlement.',
    ],
    tips: ['Payouts need a verified bank account in Settings. Add it on day one.'],
  },
  {
    route: '/settlements/[settlementId]',
    title: 'Settlement details',
    frequency: 'as_needed',
    ownerOnly: true,
    why: 'The order-by-order breakdown of one day\'s payout, so you can check exactly what you are being paid for.',
    steps: [
      'Compare the order lines with what you cooked that day.',
      'Look at fees and refunds to understand the difference between gross and net.',
    ],
  },
  {
    route: '/reviews',
    title: 'Reviews',
    frequency: 'weekly',
    why: 'What students say about your food after delivery. Better reviews mean more orders.',
    steps: [
      'Read new reviews once a week.',
      'Look for repeated comments (portion size, temperature, packaging) and fix the pattern.',
    ],
  },
  {
    route: '/notifications',
    title: 'Notifications',
    frequency: 'as_needed',
    why: 'Alerts about new paid orders, rider pickups, settlements, reviews, and low stock, in one list.',
    steps: [
      'The bell at the top shows how many are unread.',
      'Turn on push notifications in Settings so new orders reach your phone even when the app is closed.',
    ],
  },
  {
    route: '/guide',
    title: 'Guide',
    frequency: 'as_needed',
    why: 'Your map of the whole app: the system tour, a setup checklist that ticks itself off, and a tutorial for every page.',
    steps: [
      'Finish every item in "Your one-time setup" before your first service.',
      'Replay the tour any time, or give it to a new staff member.',
      'Tap any page card to read why it exists and how to use it.',
    ],
  },
  {
    route: '/settings',
    title: 'Settings',
    frequency: 'once',
    why: 'Your store profile and the details Meal Direct needs to run and pay you: logo, contact, delivery mode, packaging fee, bank account, and phone notifications.',
    steps: [
      'Upload your logo and check your display name and phone number.',
      'Add your payout bank account. Without it you cannot be paid.',
      'Set a takeaway or packaging fee if you charge one.',
      'Turn on push notifications on the phone you cook with.',
    ],
    tips: ['Set this up once. Return only to change your bank account or contact details.'],
  },
];

export type TourStep = {
  id: string;
  title: string;
  body: string;
  /** Pages this step introduces, as quick links. */
  links?: { label: string; href: string }[];
};

/** The guided tour of the whole system, shown on a vendor's first visit. */
export const SYSTEM_TOUR: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Meal Direct',
    body: 'Students on your campus order food ahead for a delivery slot and pay online. You cook, a rider delivers, and you are paid to your bank account. This short tour shows how each part of the app fits in. It takes about two minutes.',
  },
  {
    id: 'flow',
    title: 'How an order flows',
    body: '1. A student orders before the slot cutoff and pays. 2. The order appears in Orders. 3. You cook and tap "Mark ready for pickup". 4. A rider collects the batch and checks the handoff code. 5. The student receives it. 6. The sale is added to that day\'s settlement and paid to you.',
  },
  {
    id: 'setup',
    title: 'Set up once',
    body: 'Before your first order, do these one time: your store details and bank account in Settings, the days and slots you cook in Availability, and your dishes (with photos and schedules) in Menu. Add Soups if you sell swallow. After that you only come back when something changes.',
    links: [
      { label: 'Settings', href: '/settings' },
      { label: 'Availability', href: '/availability' },
      { label: 'Menu', href: '/menu' },
    ],
  },
  {
    id: 'daily',
    title: 'Every service day',
    body: 'Set how many portions you can cook in Inventory. During service, tap "Mark ready for pickup" in Orders. Use Batches to see what each rider collects, and check the handoff code when they arrive. The Dashboard shows the whole day at a glance.',
    links: [
      { label: 'Inventory', href: '/inventory' },
      { label: 'Orders', href: '/orders' },
      { label: 'Batches', href: '/batches' },
    ],
  },
  {
    id: 'money',
    title: 'Getting paid',
    body: 'Each day of sales becomes a settlement: gross sales minus Meal Direct fees and any refunds. Check Settlements about once a week to see what has been paid and what is pending.',
    links: [{ label: 'Settlements', href: '/settlements' }],
  },
  {
    id: 'grow',
    title: 'Grow with feedback',
    body: 'Read Reviews weekly to learn what students love and what to fix. Turn on push notifications in Settings so you never miss a paid order.',
    links: [
      { label: 'Reviews', href: '/reviews' },
      { label: 'Settings', href: '/settings' },
    ],
  },
  {
    id: 'help',
    title: 'Help is on every page',
    body: 'Tap the "?" button on any page to learn why it exists and how to use it. The Guide page in the menu has your setup checklist and this tour, any time you want it.',
  },
];

function routeRegex(route: string): RegExp {
  const pattern = route
    .split('/')
    .map((segment) => (/^\[.+\]$/.test(segment) ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return new RegExp(`^${pattern}$`);
}

/** The tutorial for a pathname, matching dynamic segments, or undefined if none. */
export function tutorialForPath(pathname: string): PageTutorial | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PAGE_TUTORIALS.find((tutorial) => routeRegex(tutorial.route).test(path));
}

/** Tutorials grouped for the Guide page, in the order a vendor meets them. */
export function tutorialsByFrequency(): Record<TutorialFrequency, PageTutorial[]> {
  const groups: Record<TutorialFrequency, PageTutorial[]> = {
    once: [],
    daily: [],
    weekly: [],
    as_needed: [],
  };
  for (const tutorial of PAGE_TUTORIALS) {
    // Detail pages are reached from their list page; keep the Guide to top-level pages.
    if (tutorial.route.includes('[')) continue;
    groups[tutorial.frequency].push(tutorial);
  }
  return groups;
}
