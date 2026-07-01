import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notificationsApi } from './vendor';
import { fetchApi } from './client';

vi.mock('./client', () => ({
  fetchApi: vi.fn(),
}));

const mockedFetchApi = vi.mocked(fetchApi);

describe('notificationsApi push subscriptions', () => {
  beforeEach(() => {
    mockedFetchApi.mockReset();
  });

  it('registers the browser push subscription with the notification service', async () => {
    const body = {
      endpoint: 'https://push.example/subscription',
      expirationTime: null,
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      userAgent: 'Vitest Browser',
    };

    await notificationsApi.registerPushSubscription(body);

    expect(mockedFetchApi).toHaveBeenCalledWith('/notifications/push-subscriptions', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  });

  it('removes a browser push subscription by endpoint', async () => {
    await notificationsApi.deletePushSubscription('https://push.example/subscription');

    expect(mockedFetchApi).toHaveBeenCalledWith('/notifications/push-subscriptions', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: 'https://push.example/subscription' }),
    });
  });
});
