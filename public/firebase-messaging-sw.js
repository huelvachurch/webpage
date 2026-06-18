// firebase-messaging-sw.js
// Import Firebase SDK service worker scripts
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Configuración de Firebase obtenida de tu proyecto
const firebaseConfig = {
  projectId: "ai-studio-applet-webapp-34449",
  appId: "1:458081726794:web:c336d849be408a223291b3",
  apiKey: "AIzaSyCJ2Cl3Q3TEcZ2KcWYps2hwASCVRDjXQU8",
  authDomain: "ai-studio-applet-webapp-34449.firebaseapp.com",
  messagingSenderId: "458081726794"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano: ', payload);
  
  const title = payload.notification?.title || payload.data?.title || 'Huelva Church';
  const body = payload.notification?.body || payload.data?.body || payload.data?.message || 'Tienes una nueva actualización.';
  const icon = payload.notification?.image || payload.data?.icon || '/images/LogoPWA.png';
  const clickUrl = payload.fcm_options?.link || payload.data?.link || '/micelula';

  const options = {
    body: body,
    icon: icon,
    badge: '/images/LogoPWA.png',
    vibrate: [100, 50, 100],
    data: {
      clickUrl: clickUrl
    }
  };

  self.registration.showNotification(title, options);
});

// Incorporate parent Cache and manual Push logic from sw.js
importScripts('/sw.js');
