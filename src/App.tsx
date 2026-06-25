import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Nosotros from './pages/Nosotros';
import Celulas from './pages/Celulas';
import AdminCelulas from './pages/admin/AdminCelulas';
import Actividades from './pages/Actividades';
import ActividadDetalle from './pages/ActividadDetalle';
import Dar from './pages/Dar';
import Contacto from './pages/Contacto';
import Login from './pages/Login';
import AdminComunicaciones from './pages/admin/AdminComunicaciones';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsuarios from './pages/admin/AdminUsuarios';
import AdminCursos from './pages/admin/AdminCursos';
import AdminNewsletter from './pages/admin/AdminNewsletter';
import AdminSettings from './pages/admin/AdminSettings';
import Cursos from './pages/Cursos';
import MisCursos from './pages/MisCursos';
import MisDatos from './pages/MisDatos';
import MiCelula from './pages/MiCelula';
import Lideres from './pages/Lideres';
import Supervision from './pages/Supervision';
import Presentacion from './pages/Presentacion';
import Legal from './pages/Legal';
import AsistenciaCompartida from './pages/AsistenciaCompartida';
import CursoDetalle from './pages/CursoDetalle';
import Marca from './pages/Marca';
import BoletinPublico from './pages/BoletinPublico';
import RadioPage from './pages/RadioPage';
import CookieBanner from './components/CookieBanner';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { AuthProvider, ErrorBoundary, useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'motion/react';

import { dismissWelcomePopup, messaging } from './firebase';
import { onMessage } from 'firebase/messaging';

// Component to handle elegant, interactive foreground push notification bubbles inside the application
function ForegroundNotificationListener() {
  const [activeNotification, setActiveNotification] = useState<{ title: string; body: string; clickUrl?: string } | null>(null);

  useEffect(() => {
    if (!messaging) return;

    try {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground Push recibido:', payload);
        const title = payload.notification?.title || payload.data?.title || 'Huelva Church';
        const body = payload.notification?.body || payload.data?.body || payload.data?.message || '';
        
        // Resolver de forma sumamente robusta la redirección del click
        let clickUrl = payload.data?.targetPath || payload.data?.link || (payload as any).fcm_options?.link || (payload as any).fcmOptions?.link || '/micelula';
        if (clickUrl === '/micelula' || clickUrl === '/mi-celula') {
          if (
            title.toLowerCase().includes('solicitud') || 
            title.toLowerCase().includes('supervisor') || 
            title.toLowerCase().includes('difusión') ||
            title.toLowerCase().includes('liderazgo')
          ) {
            clickUrl = '/lideres';
          }
        }
        
        setActiveNotification({ title, body, clickUrl });
        
        // Intentar reproducir un sonido sutil de notificación
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch (soundErr) {
          // Ignorar fallos de audio (son bloqueados por navegadores si no hay interacción previa)
        }
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn("No se pudo iniciar el listener de primer plano para notificaciones:", err);
    }
  }, []);

  useEffect(() => {
    if (activeNotification) {
      const timer = setTimeout(() => {
        setActiveNotification(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [activeNotification]);

  return (
    <AnimatePresence>
      {activeNotification && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 z-[250] max-w-sm pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xl pointer-events-auto flex gap-4 items-start relative overflow-hidden"
            style={{ boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.15)' }}
          >
            {/* Accent Color Strip */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary" />

            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0 text-lg">
              🔔
            </div>

            <div className="flex-grow">
              <h4 className="text-sm font-bold font-kenao text-primary pr-4">{activeNotification.title}</h4>
              <p className="text-xs text-primary/70 mt-1 leading-relaxed">{activeNotification.body}</p>
              <div className="mt-3 flex gap-2 animate-none">
                <a
                  href={activeNotification.clickUrl || '/micelula'}
                  onClick={() => setActiveNotification(null)}
                  className="bg-primary hover:bg-primary/95 text-white font-bold py-1.5 px-3.5 rounded-lg text-[10px] uppercase tracking-wide cursor-pointer transition-all inline-block"
                >
                  Ver ahora
                </a>
                <button
                  onClick={() => setActiveNotification(null)}
                  className="text-primary/60 hover:text-primary hover:bg-slate-50 py-1.5 px-3 rounded-lg text-[10px] uppercase tracking-wide cursor-pointer transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <button
              onClick={() => setActiveNotification(null)}
              className="absolute top-3 right-3 text-primary/40 hover:text-primary transition-all p-0.5 rounded-full hover:bg-slate-50 cursor-pointer text-xs"
            >
              ✕
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Global Welcome Popup on Login
function WelcomePopup() {
  const { user, isAuthReady, showWelcomePopup } = useAuth();
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (isAuthReady && user && showWelcomePopup) {
      setShowPopup(true);
    } else {
      setShowPopup(false);
    }
  }, [user, isAuthReady, showWelcomePopup]);

  const handleDismiss = async () => {
    if (user) {
      await dismissWelcomePopup(user.uid);
    }
    setShowPopup(false);
  };

  return (
    <AnimatePresence>
      {showPopup && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[2.5rem] border border-slate-100 p-8 md:p-10 max-w-lg w-full shadow-2xl relative overflow-hidden text-center md:text-left"
          >
            {/* Ambient background decoration */}
            <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-secondary/5 pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10 animate-none">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-2xl">💡</span>
              </div>

              <div className="flex-grow text-center md:text-left">
                <h3 className="text-2xl font-kenao text-primary mb-3">¡Sesión iniciada correctamente!</h3>
                <p className="text-sm text-primary/80 leading-relaxed mb-4">
                  Te damos la bienvenida a la plataforma oficial de <strong>Huelva Church</strong>.
                </p>
                <p className="text-xs text-primary/60 bg-slate-50 border border-slate-100 p-4 rounded-xl leading-relaxed">
                  💡 Si estás esperando la asignación de roles especiales, no te preocupes, el equipo administrativo revisará y dará respuesta a tu solicitud muy pronto.
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-center md:justify-end">
              <button
                onClick={handleDismiss}
                className="bg-primary hover:bg-primary/95 text-white font-bold py-3.5 px-6 rounded-xl transition-all text-xs uppercase tracking-wider shadow-sm cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function GlobalIframeAuth() {
  const { user } = useAuth();
  
  useEffect(() => {
    if (user?.uid) {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        if (iframe.src && iframe.src.includes('estudios.huelvachurch.com')) {
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'AUTH_STATE',
              uid: user.uid
            }, 'https://estudios.huelvachurch.com');
          }
        }
      });
    }
  }, [user]);
  
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <GlobalIframeAuth />
          <AppContent />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const location = useLocation();
  const isBoletin = location.pathname.startsWith('/boletin');

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {!isBoletin && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/celulas" element={<Celulas />} />
          <Route path="/avisos" element={<Actividades />} />
          <Route path="/avisos/:id" element={<ActividadDetalle />} />
          <Route path="/dar" element={<Dar />} />
          <Route path="/radio" element={<RadioPage />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cursos" element={<Cursos />} />
          <Route path="/cursos/:id" element={<CursoDetalle />} />
          <Route path="/mis-cursos" element={<MisCursos />} />
          <Route path="/mis-datos" element={<MisDatos />} />
          <Route path="/micelula" element={<MiCelula />} />
          <Route path="/lideres" element={<Lideres />} />
          <Route path="/supervision" element={<Supervision />} />
          <Route path="/presentacion" element={<Presentacion />} />
          <Route path="/asistencia-compartida" element={<AsistenciaCompartida />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/marca" element={<Marca />} />
          
          <Route path="/boletin/web/:date" element={<BoletinPublico forcedViewMode="web" />} />
          <Route path="/boletin/folleto/:date" element={<BoletinPublico forcedViewMode="revista" />} />
          <Route path="/boletin/:date" element={<BoletinPublico />} />
          
          {/* Admin Routes */}
          <Route path="/admin/comunicaciones" element={<AdminComunicaciones />} />
          <Route path="/admin/administracion" element={<AdminDashboard />}>
            <Route path="usuarios" element={<AdminUsuarios />} />
            <Route path="celulas" element={<AdminCelulas />} />
            <Route index element={<Navigate to="usuarios" replace />} />
          </Route>
          <Route path="/admin/cursos" element={<AdminCursos />} />
          <Route path="/admin/newsletter" element={<AdminNewsletter />} />
          <Route path="/admin/ajustes" element={<AdminSettings />} />
        </Routes>
      </main>
      {!isBoletin && <Footer />}
      <WelcomePopup />
      <ForegroundNotificationListener />
      <CookieBanner />
      <PWAInstallPrompt />
    </div>
  );
}
