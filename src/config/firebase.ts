'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';

/**
 * Public Firebase client config for Cloud Messaging (web push).
 *
 * These values are NOT secrets — they are the client identifiers Firebase
 * expects to be shipped to the browser. Keep them in sync with the hardcoded
 * copy in `public/firebase-messaging-sw.js` (a static service worker cannot
 * read `process.env`).
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyAYKfgVS5WGsbZLQ42dsKTJy98fRRjj1w8',
  authDomain: 'mealdirect-2192b.firebaseapp.com',
  projectId: 'mealdirect-2192b',
  storageBucket: 'mealdirect-2192b.firebasestorage.app',
  messagingSenderId: '99018858239',
  appId: '1:99018858239:web:9ff663f20b28f8c5d036ca',
  measurementId: 'G-34V8S6D2GF',
} as const;

export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

/**
 * Resolve a Messaging instance, or null when the browser/environment does not
 * support FCM (SSR, unsupported browser, missing service worker support).
 * Cached so repeated calls don't re-run the (async) support check.
 */
let messagingSupport: Promise<boolean> | null = null;

async function messagingIsSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!messagingSupport) {
    const { isSupported } = await import('firebase/messaging');
    messagingSupport = isSupported().catch(() => false);
  }
  return messagingSupport;
}

/**
 * Fetch (or create) the FCM registration token for this device.
 * Returns null when messaging is unsupported. Firebase auto-registers
 * `/firebase-messaging-sw.js` at its own scope, so it coexists with the
 * PWA service worker at `/`.
 */
export async function fetchPushToken(vapidKey: string): Promise<string | null> {
  if (!(await messagingIsSupported())) return null;
  const { getMessaging, getToken } = await import('firebase/messaging');
  const messaging = getMessaging(getFirebaseApp());
  const token = await getToken(messaging, { vapidKey });
  return token || null;
}

/** Invalidate this device's FCM token locally. Safe to call when unsupported. */
export async function revokePushToken(): Promise<boolean> {
  if (!(await messagingIsSupported())) return false;
  const { getMessaging, deleteToken } = await import('firebase/messaging');
  const messaging = getMessaging(getFirebaseApp());
  return deleteToken(messaging);
}
