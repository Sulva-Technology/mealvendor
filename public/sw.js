const CACHE_NAME = 'meal-direct-vendor-v2';
const OFFLINE_URL = '/offline';

const URLS_TO_CACHE = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

function readPushPayload(event) {
  const fallback = {
    title: 'Meal Direct Vendor',
    body: 'You have a new vendor update.',
    url: '/notifications',
  };

  if (!event.data) return fallback;

  try {
    return { ...fallback, ...event.data.json() };
  } catch {
    return { ...fallback, body: event.data.text() || fallback.body };
  }
}

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event);
  const targetUrl =
    typeof payload.linkPath === 'string' && payload.linkPath.startsWith('/')
      ? payload.linkPath
      : typeof payload.url === 'string' && payload.url.startsWith('/')
        ? payload.url
        : '/notifications';

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Meal Direct Vendor', {
      body: payload.body || 'You have a new vendor update.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.tag || payload.id || 'meal-direct-vendor-notification',
      data: {
        url: targetUrl,
        notificationId: payload.id || null,
      },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || '/notifications',
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        if ('navigate' in client) client.navigate(targetUrl);
        if ('focus' in client) return client.focus();
      }

      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
