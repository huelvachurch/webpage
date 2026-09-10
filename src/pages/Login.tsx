import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Heart, Shield, MessageSquare, BookOpen, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { loginWithGoogle, loginWithGoogleRedirect } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Login() {
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    try {
      setIsIframe(window.self !== window.top);
    } catch {
      setIsIframe(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthReady && !loading && user) {
      const searchParams = new URLSearchParams(location.search);
      const redirectTarget = (location.state as any)?.from || searchParams.get('redirect');
      if (redirectTarget && typeof redirectTarget === 'string' && redirectTarget.startsWith('/')) {
        navigate(redirectTarget, { replace: true });
        return;
      }

      if (roles.includes('superadmin')) {
        navigate('/admin/administracion');
      } else if (roles.includes('admin')) {
        navigate('/admin/ajustes');
      } else if (roles.includes('comunicador')) {
        navigate('/admin/anuncios');
      } else if (roles.includes('profesor')) {
        navigate('/admin/docencia');
      } else if (roles.includes('financiero')) {
        navigate('/admin/finanzas');
      } else {
        navigate('/');
      }
    }
  }, [user, roles, loading, isAuthReady, navigate, location]);

  const handleLogin = async () => {
    if (isLoggingIn || isRedirecting) return;
    setErrorMsg(null);
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      const isPopupClosed =
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.message?.includes('popup-closed-by-user') ||
        error?.message?.includes('cancelled-popup-request');

      if (isPopupClosed) {
        console.warn('User closed or cancelled the Google login popup.');
        setErrorMsg('La ventana emergente de Google se cerró antes de completar el inicio de sesión. Puedes intentarlo nuevamente o abrir la app en una nueva pestaña.');
      } else if (error && (error.code === 'auth/popup-blocked' || error.message?.includes('popup-blocked'))) {
        console.warn('Popup blocked by browser');
        setErrorMsg('El navegador bloqueó la ventana emergente de Google. Puedes permitir las ventanas emergentes o usar el botón de redirección abajo.');
      } else {
        console.error('Login failed:', error);
        setErrorMsg('Ocurrió un error al iniciar sesión: ' + (error?.message || error));
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoginRedirect = async () => {
    if (isLoggingIn || isRedirecting) return;
    setErrorMsg(null);
    setIsRedirecting(true);
    try {
      await loginWithGoogleRedirect();
    } catch (error: any) {
      console.error('Login redirect failed', error);
      setErrorMsg('Ocurrió un error al iniciar el acceso con redirección: ' + (error?.message || error));
      setIsRedirecting(false);
    }
  };

  if (loading) return <div className="pt-48 text-center">Cargando...</div>;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-slate-50 flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-2xl max-w-md w-full text-center border border-slate-100"
      >
        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-secondary mx-auto mb-8 shadow-xl">
          <Heart className="w-10 h-10 fill-current" />
        </div>
        <h1 className="text-4xl font-kenao text-primary mb-4">Bienvenido</h1>
        <p className="text-primary/60 mb-10 leading-relaxed text-sm">
          Accede a tu cuenta para gestionar el contenido de la iglesia o acceder a tus cursos.
        </p>

        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-4 p-3.5 bg-slate-50 rounded-2xl text-left">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-secondary shadow-xs shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-primary text-sm">Comunicaciones</h4>
              <p className="text-xs text-primary/40">Gestiona noticias y eventos</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3.5 bg-slate-50 rounded-2xl text-left">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-secondary shadow-xs shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-primary text-sm">Enseñanza</h4>
              <p className="text-xs text-primary/40">Accede a cursos y materiales</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3.5 bg-slate-50 rounded-2xl text-left">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-secondary shadow-xs shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-primary text-sm">Administración</h4>
              <p className="text-xs text-primary/40">Control total del sistema</p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-left"
          >
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-amber-900 font-medium leading-relaxed">{errorMsg}</p>
            </div>
          </motion.div>
        )}

        <div className="space-y-3">
          <button 
            onClick={handleLogin}
            disabled={isLoggingIn || isRedirecting}
            className="w-full bg-primary text-white font-bold py-4.5 rounded-2xl hover:bg-secondary hover:text-primary transition-all flex items-center justify-center gap-3 shadow-lg transform hover:-translate-y-0.5 cursor-pointer text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            {isLoggingIn ? 'Abriendo Google...' : 'Acceder con Google'}
          </button>

          {(isIframe || errorMsg) && (
            <div className="pt-2 space-y-2">
              <button
                onClick={handleLoginRedirect}
                disabled={isLoggingIn || isRedirecting}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-60"
              >
                {isRedirecting ? (
                  <div className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isRedirecting ? 'Redirigiendo...' : 'Probar con Redirección completa'}
              </button>

              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full border border-slate-200 text-slate-600 hover:text-primary hover:border-primary/40 font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs"
              >
                <ExternalLink className="w-4 h-4 text-slate-400" />
                Abrir en una pestaña nueva
              </a>
            </div>
          )}
        </div>
        
        <p className="mt-8 text-xs text-primary/40">
          Al acceder, aceptas nuestros términos de servicio y política de privacidad.
        </p>
      </motion.div>
    </div>
  );
}
