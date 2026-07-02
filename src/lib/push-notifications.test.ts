import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCurrentPushToken,
  getPushReadiness,
  PushNotificationError,
  requestPushToken,
} from './push-notifications';

const { fetchPushToken } = vi.hoisted(() => ({ fetchPushToken: vi.fn() }));

vi.mock('@/src/config/firebase', () => ({
  fetchPushToken,
  revokePushToken: vi.fn(),
}));

beforeEach(() => {
  fetchPushToken.mockReset();
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

describe('requestPushToken', () => {
  it('requests permission and returns the FCM token', async () => {
    fetchPushToken.mockResolvedValue('fcm-device-token');
    const requestPermission = vi.fn().mockResolvedValue('granted');

    const token = await requestPushToken({
      vapidKey: 'vapid-key',
      notification: { permission: 'default', requestPermission },
    });

    expect(requestPermission).toHaveBeenCalledOnce();
    expect(fetchPushToken).toHaveBeenCalledWith('vapid-key');
    expect(token).toBe('fcm-device-token');
  });

  it('does not re-prompt when permission is already granted', async () => {
    fetchPushToken.mockResolvedValue('fcm-device-token');
    const requestPermission = vi.fn();

    await requestPushToken({
      vapidKey: 'vapid-key',
      notification: { permission: 'granted', requestPermission },
    });

    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('throws permission_denied when the user declines', async () => {
    const requestPermission = vi.fn().mockResolvedValue('denied');

    await expect(
      requestPushToken({
        vapidKey: 'vapid-key',
        notification: { permission: 'default', requestPermission },
      })
    ).rejects.toMatchObject({ reason: 'permission_denied' } as Partial<PushNotificationError>);

    expect(fetchPushToken).not.toHaveBeenCalled();
  });

  it('throws missing_vapid_key when no key is configured', async () => {
    await expect(
      requestPushToken({
        vapidKey: '',
        notification: { permission: 'granted', requestPermission: vi.fn() },
      })
    ).rejects.toMatchObject({ reason: 'missing_vapid_key' } as Partial<PushNotificationError>);
  });
});

describe('getCurrentPushToken', () => {
  it('returns null without prompting when permission is not granted', async () => {
    const token = await getCurrentPushToken({
      notification: { permission: 'default', requestPermission: vi.fn() },
    });

    expect(token).toBeNull();
    expect(fetchPushToken).not.toHaveBeenCalled();
  });

  it('returns the existing token when permission is granted', async () => {
    fetchPushToken.mockResolvedValue('existing-token');

    const token = await getCurrentPushToken({
      notification: { permission: 'granted', requestPermission: vi.fn() },
    });

    expect(token).toBe('existing-token');
  });
});
