const CACHE_NAME = 'huelvachurch-v3';
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
// Handling basic push notifications or manual reminders
self.addEventListener('push', (event) => {
  // Las notificaciones son gestionadas automáticamente por el SDK de Firebase FCM.
  // Silenciamos este listener para evitar notificaciones duplicadas en el dispositivo de destino.
  console.log('[sw.js] Evento push detectado de forma nativa. Delegado a Firebase FCM SDK.');
});

// Click action to open or bring focus to the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Extraemos de forma sumamente robusta la dirección de redirección
  let clickUrl = '/micelula';
  if (event.notification.data) {
    const data = event.notification.data;
    if (data.clickUrl) {
      clickUrl = data.clickUrl;
    } else if (data.link) {
      clickUrl = data.link;
    } else if (data.FCM_MSG) {
      const fcmMsg = data.FCM_MSG;
      clickUrl = fcmMsg.notification?.click_action || fcmMsg.data?.link || fcmMsg.fcm_options?.link || clickUrl;
    }
  }

  // Convertir clickUrl absoluta a relativa al dominio actual para maximizar la compatibilidad en PWA (iOS/Safari, Android/Chrome)
  let relativeUrl = clickUrl;
  if (clickUrl.startsWith('http://') || clickUrl.startsWith('https://')) {
    try {
      const parsed = new URL(clickUrl);
      relativeUrl = parsed.pathname + parsed.search + parsed.hash;
    } catch (e) {
      relativeUrl = clickUrl;
    }
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. Intentar enfocar una pestaña existente de la app abierta
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && relativeUrl) {
            try {
              client.navigate(relativeUrl);
            } catch (err) {
              console.warn('[sw.js] client.navigate falló, reintentando solo con focus:', err);
            }
          }
          return client.focus();
        }
      }
      // 2. Si no hay ventana de la PWA abierta en primer/segundo plano, la abrimos
      if (self.clients.openWindow) {
        return self.clients.openWindow(relativeUrl);
      }
    })
  );
});
