import React from 'react';
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
import Lideres from './pages/Lideres';
import Legal from './pages/Legal';
import CookieBanner from './components/CookieBanner';
import { AuthProvider, ErrorBoundary } from './AuthContext';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
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
                <Route path="/mis-cursos" element={<MisCursos />} />
                <Route path="/lideres" element={<Lideres />} />
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
            <CookieBanner />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
