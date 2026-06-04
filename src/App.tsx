import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import AdminUsuarios from './pages/admin/AdminUsuarios';
import AdminCursos from './pages/admin/AdminCursos';
import AdminNewsletter from './pages/admin/AdminNewsletter';
import AdminSettings from './pages/admin/AdminSettings';
import Cursos from './pages/Cursos';
import MisCursos from './pages/MisCursos';
import MisDatos from './pages/MisDatos';
import Lideres from './pages/Lideres';
import Legal from './pages/Legal';
import AsistenciaCompartida from './pages/AsistenciaCompartida';
import CursoDetalle from './pages/CursoDetalle';
import CookieBanner from './components/CookieBanner';
import { AuthProvider, ErrorBoundary, useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'motion/react';

import { dismissWelcomePopup } from './firebase';

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

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col overflow-x-hidden">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/nosotros" element={<Nosotros />} />
                <Route path="/celulas" element={<Celulas />} />
                <Route path="/actividades" element={<Actividades />} />
                <Route path="/actividades/:id" element={<ActividadDetalle />} />
                <Route path="/dar" element={<Dar />} />
                <Route path="/contacto" element={<Contacto />} />
                <Route path="/login" element={<Login />} />
                <Route path="/cursos" element={<Cursos />} />
                <Route path="/cursos/:id" element={<CursoDetalle />} />
                <Route path="/mis-cursos" element={<MisCursos />} />
                <Route path="/mis-datos" element={<MisDatos />} />
                <Route path="/lideres" element={<Lideres />} />
                <Route path="/asistencia-compartida" element={<AsistenciaCompartida />} />
                <Route path="/legal" element={<Legal />} />
                
                {/* Admin Routes */}
                <Route path="/admin/comunicaciones" element={<AdminComunicaciones />} />
                <Route path="/admin/usuarios" element={<AdminUsuarios />} />
                <Route path="/admin/celulas" element={<AdminCelulas />} />
                <Route path="/admin/cursos" element={<AdminCursos />} />
                <Route path="/admin/newsletter" element={<AdminNewsletter />} />
                <Route path="/admin/ajustes" element={<AdminSettings />} />
              </Routes>
            </main>
            <Footer />
            <WelcomePopup />
            <CookieBanner />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
