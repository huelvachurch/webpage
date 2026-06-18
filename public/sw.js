const CACHE_NAME = 'huelvachurch-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/public/manifest.json',
  '/images/LogoPWA.png',
  '/images/Logotipo Azul.png',
  '/images/Logotipo Blanco.png'
];

// Install Service Worker and cache core static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch events: Network First falling back to Cache
self.addEventListener('fetch', (event) => {
  // Allow normal execution of firebase database, auth and external api requests
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com') ||
    event.request.url.includes('firebase')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful requests for later offline use
        if (response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If seeking page routes and we are offline, return root index.html to let SPA router handle it
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

// Handling basic push notifications or manual reminders
self.addEventListener('push', (event) => {
  let title = 'Huelva Church';
  let body = 'Tienes una nueva actualización.';
  let icon = '/images/LogoPWA.png';
  let clickUrl = '/micelula';

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('Push recibido:', payload);
      
      // Intentar extraer de payload.notification (FCM estándar), payload.data.notification, o la raíz
      const notif = payload.notification || 
                    (payload.data && payload.data.notification) || 
                    (payload.data && typeof payload.data === 'object' ? payload.data : null) || 
                    payload;
                    
      if (notif) {
        title = notif.title || title;
        body = notif.body || notif.message || body;
        icon = notif.icon || icon;
      }

      // Buscar enlaces personalizados para redirigir al pulsar
      if (payload.data && payload.data.link) {
        clickUrl = payload.data.link;
      } else if (payload.fcm_options && payload.fcm_options.link) {
        clickUrl = payload.fcm_options.link;
      } else if (payload.notification && payload.notification.click_action) {
        clickUrl = payload.notification.click_action;
      }
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  const options = {
    body: body,
    icon: icon,
    badge: '/images/LogoPWA.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1',
      clickUrl: clickUrl
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Click action to open or bring focus to the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickUrl = event.notification.data?.clickUrl || '/micelula';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si hay una ventana del portal abierta, la enfocamos
      for (const client of clientList) {
        if ('focus' in client) {
          // Si el cliente ya está en la URL adecuada o cerca, lo enfocamos
          return client.focus();
        }
      }
      // Si no hay ventana abierta, abrimos una nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(clickUrl);
      }
    })
  );
});
