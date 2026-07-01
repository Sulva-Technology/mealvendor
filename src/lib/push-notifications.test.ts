import { describe, expect, it, vi } from 'vitest';
import {
  getPushReadiness,
  requestPushSubscription,
  toPushSubscriptionPayload,
  urlBase64ToUint8Array,
} from './push-notifications';

describe('urlBase64ToUint8Array', () => {
  it('decodes VAPID public keys from base64url into bytes', () => {
    expect(Array.from(urlBase64ToUint8Array('SGVsbG8td29ybGQ'))).toEqual(
      Array.from(new TextEncoder().encode('Hello-world'))
    );
  });
});

describe('getPushReadiness', () => {
  it('requires the feature flag and VAPID key before enabling push controls', () => {
    expect(
      getPushReadiness({
        enabled: false,
        vapidPublicKey: '',
        supportsServiceWorker: true,
        supportsPushManager: true,
        supportsNotification: true,
        permission: 'default',
      })
    ).toEqual({ ready: false, reason: 'feature_disabled' });

    expect(
      getPushReadiness({
        enabled: true,
        vapidPublicKey: '',
        supportsServiceWorker: true,
        supportsPushManager: true,
        supportsNotification: true,
        permission: 'default',
      })
    ).toEqual({ ready: false, reason: 'missing_vapid_key' });
  });

  it('blocks unsupported browsers and denied permissions', () => {
    expect(
      getPushReadiness({
        enabled: true,
        vapidPublicKey: 'key',
        supportsServiceWorker: false,
        supportsPushManager: true,
        supportsNotification: true,
        permission: 'default',
      })
    ).toEqual({ ready: false, reason: 'unsupported_browser' });

    expect(
      getPushReadiness({
        enabled: true,
        vapidPublicKey: 'key',
        supportsServiceWorker: true,
        supportsPushManager: true,
        supportsNotification: true,
        permission: 'denied',
      })
    ).toEqual({ ready: false, reason: 'permission_denied' });
  });

  it('is ready when the feature and browser capabilities are available', () => {
    expect(
      getPushReadiness({
        enabled: true,
        vapidPublicKey: 'key',
        supportsServiceWorker: true,
        supportsPushManager: true,
        supportsNotification: true,
        permission: 'default',
      })
    ).toEqual({ ready: true, reason: 'ready' });
  });
});

describe('requestPushSubscription', () => {
  it('requests permission and creates a user-visible subscription with the VAPID key', async () => {
    const subscribe = vi.fn().mockResolvedValue({
      endpoint: 'https://push.example/subscription',
      expirationTime: null,
      toJSON: () => ({
        endpoint: 'https://push.example/subscription',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      }),
    });

    const subscription = await requestPushSubscription({
      vapidPublicKey: 'SGVsbG8td29ybGQ',
      notification: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(null),
            subscribe,
          },
        }),
      },
    });

    expect(subscription.endpoint).toBe('https://push.example/subscription');
    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('SGVsbG8td29ybGQ'),
    });
  });

  it('reuses an existing browser subscription instead of creating another one', async () => {
    const existing = {
      endpoint: 'https://push.example/existing',
      expirationTime: null,
      toJSON: () => ({
        endpoint: 'https://push.example/existing',
        keys: { p256dh: 'existing-p256dh', auth: 'existing-auth' },
      }),
    };
    const subscribe = vi.fn();

    await expect(
      requestPushSubscription({
        vapidPublicKey: 'SGVsbG8td29ybGQ',
        notification: {
          permission: 'granted',
          requestPermission: vi.fn(),
        },
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(existing),
              subscribe,
            },
          }),
        },
      })
    ).resolves.toBe(existing);

    expect(subscribe).not.toHaveBeenCalled();
  });
});

describe('toPushSubscriptionPayload', () => {
  it('normalizes the browser subscription into the backend payload shape', () => {
    const payload = toPushSubscriptionPayload({
      endpoint: 'https://push.example/subscription',
      expirationTime: 123,
      toJSON: () => ({
        endpoint: 'https://push.example/subscription',
        expirationTime: 123,
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      }),
    });

    expect(payload).toEqual({
      endpoint: 'https://push.example/subscription',
      expirationTime: 123,
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
    });
  });
});
