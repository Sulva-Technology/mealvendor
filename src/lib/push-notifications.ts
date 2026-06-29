export type PushReadinessReason =
  | 'ready'
  | 'feature_disabled'
  | 'missing_vapid_key'
  | 'unsupported_browser'
  | 'permission_denied';

export interface PushReadinessInput {
  enabled: boolean;
  vapidPublicKey: string;
  supportsServiceWorker: boolean;
  supportsPushManager: boolean;
  supportsNotification: boolean;
  permission: NotificationPermission;
}

export interface PushReadiness {
  ready: boolean;
  reason: PushReadinessReason;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushSubscriptionJson {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export interface PushSubscriptionLike {
  endpoint: string;
  expirationTime?: number | null;
  toJSON(): PushSubscriptionJson;
  unsubscribe?(): Promise<boolean>;
}

interface PushManagerLike {
  getSubscription(): Promise<PushSubscriptionLike | null>;
  subscribe(options: {
    userVisibleOnly: boolean;
    applicationServerKey: Uint8Array<ArrayBuffer>;
  }): Promise<PushSubscriptionLike>;
}

interface ServiceWorkerRegistrationLike {
  pushManager: PushManagerLike;
}

export interface ServiceWorkerContainerLike {
  ready: Promise<ServiceWorkerRegistrationLike>;
}

export interface NotificationLike {
  permission: NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
}

export class PushNotificationError extends Error {
  constructor(
    public reason: Exclude<PushReadinessReason, 'ready'>,
    message: string
  ) {
    super(message);
    this.name = 'PushNotificationError';
  }
}

export const PUSH_NOTIFICATIONS_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS === 'true';

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = `${base64Url}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = globalThis.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));

  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }

  return output;
}

export function getPushReadiness(input: PushReadinessInput): PushReadiness {
  if (!input.enabled) return { ready: false, reason: 'feature_disabled' };
  if (!input.vapidPublicKey.trim()) return { ready: false, reason: 'missing_vapid_key' };
  if (!input.supportsServiceWorker || !input.supportsPushManager || !input.supportsNotification) {
    return { ready: false, reason: 'unsupported_browser' };
  }
  if (input.permission === 'denied') return { ready: false, reason: 'permission_denied' };
  return { ready: true, reason: 'ready' };
}

export function getBrowserPushReadiness(): PushReadiness {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { ready: false, reason: 'unsupported_browser' };
  }

  return getPushReadiness({
    enabled: PUSH_NOTIFICATIONS_ENABLED,
    vapidPublicKey: VAPID_PUBLIC_KEY,
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsPushManager: 'PushManager' in window,
    supportsNotification: 'Notification' in window,
    permission: 'Notification' in window ? Notification.permission : 'default',
  });
}

export async function requestPushSubscription({
  vapidPublicKey = VAPID_PUBLIC_KEY,
  notification,
  serviceWorker,
}: {
  vapidPublicKey?: string;
  notification?: NotificationLike;
  serviceWorker?: ServiceWorkerContainerLike;
} = {}): Promise<PushSubscriptionLike> {
  const notificationApi =
    notification ??
    (typeof window !== 'undefined' && 'Notification' in window
      ? (Notification as unknown as NotificationLike)
      : undefined);
  const serviceWorkerApi =
    serviceWorker ??
    (typeof navigator !== 'undefined' && 'serviceWorker' in navigator
      ? (navigator.serviceWorker as unknown as ServiceWorkerContainerLike)
      : undefined);

  if (!notificationApi || !serviceWorkerApi) {
    throw new PushNotificationError(
      'unsupported_browser',
      'This browser does not support web push notifications.'
    );
  }
  if (!vapidPublicKey.trim()) {
    throw new PushNotificationError(
      'missing_vapid_key',
      'Push notifications are not configured for this app.'
    );
  }

  const permission =
    notificationApi.permission === 'default'
      ? await notificationApi.requestPermission()
      : notificationApi.permission;
  if (permission !== 'granted') {
    throw new PushNotificationError(
      'permission_denied',
      'Notification permission was not granted.'
    );
  }

  const registration = await serviceWorkerApi.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}

export async function getCurrentPushSubscription(
  serviceWorker?: ServiceWorkerContainerLike
): Promise<PushSubscriptionLike | null> {
  const serviceWorkerApi =
    serviceWorker ??
    (typeof navigator !== 'undefined' && 'serviceWorker' in navigator
      ? (navigator.serviceWorker as unknown as ServiceWorkerContainerLike)
      : undefined);

  if (!serviceWorkerApi) return null;
  const registration = await serviceWorkerApi.ready;
  return registration.pushManager.getSubscription();
}

export function toPushSubscriptionPayload(
  subscription: PushSubscriptionLike
): PushSubscriptionPayload {
  const json = subscription.toJSON();
  const endpoint = json.endpoint ?? subscription.endpoint;
  const expirationTime = json.expirationTime ?? subscription.expirationTime ?? null;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new PushNotificationError(
      'unsupported_browser',
      'The browser returned an incomplete push subscription.'
    );
  }

  return {
    endpoint,
    expirationTime,
    keys: { p256dh, auth },
  };
}
