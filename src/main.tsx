import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './i18n';
import App from './App.tsx';
import './index.css';

// Registro de Service Worker para PWA (incluyendo compatibilidad nativa con FCM)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((reg) => {
        console.log('Service Worker de Firebase registrado correctamente', reg.scope);
      })
      .catch((err) => {
        console.error('Error al registrar Service Worker de Firebase:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
);
