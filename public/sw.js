// Altus Performance service worker — web push + notification click handling
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || 'Altus Performance';
  const options = {
    body: data.body || '',
    icon: '/altus-icon.png',
    badge: '/altus-icon.png',
    vibrate: data.urgent ? [200, 100, 200, 100, 300] : [100],
    tag: data.tag || 'altus',
    renotify: !!data.urgent,
    requireInteraction: !!data.urgent,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus(); } }
      return self.clients.openWindow(url);
    })
  );
});
