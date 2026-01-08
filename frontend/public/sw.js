const CACHE_NAME = 'powersol-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Voce tem premios disponiveis para resgatar!',
    icon: '/img-moeda.png',
    badge: '/img-moeda.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'powersol-claim',
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'claim', title: 'Resgatar Agora' },
      { action: 'later', title: 'Depois' }
    ],
    data: {
      url: '/profile'
    }
  };

  let title = 'PowerSOL - Premio Disponivel!';

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
      if (data.url) options.data.url = data.url;
    } catch {
      options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/profile';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, url } = event.data;

    self.registration.showNotification(title || 'PowerSOL', {
      body: body || 'Voce tem premios disponiveis!',
      icon: '/img-moeda.png',
      badge: '/img-moeda.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'powersol-claim',
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'claim', title: 'Resgatar' },
        { action: 'later', title: 'Depois' }
      ],
      data: { url: url || '/profile' }
    });
  }
});
