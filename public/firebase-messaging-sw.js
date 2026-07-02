/* Firebase Cloud Messaging background handler.
 *
 * Firebase registers this file automatically at scope
 * `/firebase-cloud-messaging-push-scope`, so it coexists with the PWA service
 * worker (`/sw.js`) at the root scope.
 *
 * The config below is public client config (not secret) — keep it in sync with
 * `src/config/firebase.ts`. A static service worker cannot read env vars.
 */
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAYKfgVS5WGsbZLQ42dsKTJy98fRRjj1w8',
  authDomain: 'mealdirect-2192b.firebaseapp.com',
  projectId: 'mealdirect-2192b',
  storageBucket: 'mealdirect-2192b.firebasestorage.app',
  messagingSenderId: '99018858239',
  appId: '1:99018858239:web:9ff663f20b28f8c5d036ca',
  measurementId: 'G-34V8S6D2GF',
});

const messaging = firebase.messaging();

function resolveLinkPath(data) {
  if (typeof data.linkPath === 'string' && data.linkPath.startsWith('/')) return data.linkPath;
  if (typeof data.url === 'string' && data.url.startsWith('/')) return data.url;
  return '/notifications';
}

// Fired for FCM messages received while the app is in the background/closed.
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const targetUrl = resolveLinkPath(data);

  self.registration.showNotification(notification.title || data.title || 'Meal Direct Vendor', {
    body: notification.body || data.body || 'You have a new vendor update.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || data.id || 'meal-direct-vendor-notification',
    data: { url: targetUrl, notificationId: data.id || null },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(
    (event.notification.data && event.notification.data.url) || '/notifications',
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
