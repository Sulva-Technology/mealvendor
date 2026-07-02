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

/**
 * Firebase Web Push certificate ("VAPID") public key, passed to
 * `getToken({ vapidKey })`. Configured via env so it can rotate without a code
 * change.
 */
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

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

function browserNotification(): NotificationLike | undefined {
  return typeof window !== 'undefined' && 'Notification' in window
    ? (Notification as unknown as NotificationLike)
    : undefined;
}

/**
 * Request notification permission (if not already decided) and return this
 * device's FCM registration token. Throws a PushNotificationError with the
 * matching readiness reason on any failure so callers can surface it.
 *
 * Firebase is loaded lazily so this module stays importable in non-browser
 * (SSR / test) environments.
 */
export async function requestPushToken({
  vapidKey = VAPID_PUBLIC_KEY,
  notification,
}: {
  vapidKey?: string;
  notification?: NotificationLike;
} = {}): Promise<string> {
  const notificationApi = notification ?? browserNotification();
  if (!notificationApi) {
    throw new PushNotificationError(
      'unsupported_browser',
      'This browser does not support web push notifications.'
    );
  }
  if (!vapidKey.trim()) {
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

  const { fetchPushToken } = await import('@/src/config/firebase');
  const token = await fetchPushToken(vapidKey);
  if (!token) {
    throw new PushNotificationError(
      'unsupported_browser',
      'Could not obtain a device token for push notifications.'
    );
  }
  return token;
}

/**
 * Return the current device's FCM token when permission is already granted,
 * or null otherwise (never prompts). Used to reflect the enabled/disabled
 * state and to find the token to unregister.
 */
export async function getCurrentPushToken({
  notification,
}: {
  notification?: NotificationLike;
} = {}): Promise<string | null> {
  const notificationApi = notification ?? browserNotification();
  if (!notificationApi || notificationApi.permission !== 'granted') return null;

  try {
    const { fetchPushToken } = await import('@/src/config/firebase');
    return await fetchPushToken(VAPID_PUBLIC_KEY);
  } catch {
    return null;
  }
}

/** Invalidate this device's FCM token locally (best-effort). */
export async function deletePushToken(): Promise<void> {
  try {
    const { revokePushToken } = await import('@/src/config/firebase');
    await revokePushToken();
  } catch {
    // Best-effort: the backend record is removed separately via the API.
  }
}
