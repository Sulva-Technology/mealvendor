import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notificationsApi } from './vendor';
import { fetchApi } from './client';

vi.mock('./client', () => ({
  fetchApi: vi.fn(),
}));

const mockedFetchApi = vi.mocked(fetchApi);

describe('notificationsApi device tokens', () => {
  beforeEach(() => {
    mockedFetchApi.mockReset();
  });

  it('registers the FCM device token with the backend', async () => {
    const body = { token: 'fcm-token-123', platform: 'web' as const };

    await notificationsApi.registerDeviceToken(body);

    expect(mockedFetchApi).toHaveBeenCalledWith('/me/device-tokens', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  });

  it('unregisters a device token by encoding it into the path', async () => {
    await notificationsApi.deleteDeviceToken('fcm/token:with+chars');

    expect(mockedFetchApi).toHaveBeenCalledWith(
      '/me/device-tokens/fcm%2Ftoken%3Awith%2Bchars',
      { method: 'DELETE' }
    );
  });
});
