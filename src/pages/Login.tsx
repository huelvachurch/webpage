import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Heart, Shield, MessageSquare, BookOpen, AlertCircle } from 'lucide-react';
import { loginWithGoogle, loginWithGoogleRedirect } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthReady && !loading && user) {
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
  }, [user, roles, loading, isAuthReady, navigate]);

  const handleLogin = async () => {
    setErrorMsg(null);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      console.error("Login failed", error);
      if (error && (error.code === 'auth/popup-closed-by-user' || error.message?.includes('popup-closed-by-user'))) {
        setErrorMsg('La ventana emergente de inicio de sesión se cerró. Para solucionar esto en el visor de AI Studio, prueba el botón "Acceder con Google (Redirección)" o abre la app en una pestaña nueva.');
      } else if (error && (error.code === 'auth/popup-blocked' || error.message?.includes('popup-blocked'))) {
        setErrorMsg('El navegador bloqueó la ventana emergente de Google. Por favor, permite las ventanas emergentes o utiliza "Acceder con Google (Redirección)".');
      } else {
        setErrorMsg('Ocurrió un error al iniciar sesión con Google: ' + (error?.message || error));
      }
    }
  };

  const handleLoginRedirect = async () => {
    setErrorMsg(null);
    try {
      await loginWithGoogleRedirect();
    } catch (error: any) {
      console.error("Login redirect failed", error);
      setErrorMsg('Ocurrió un error al iniciar el acceso con redirección: ' + (error?.message || error));
    }
  };

  if (loading) return <div className="pt-48 text-center">Cargando...</div>;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-slate-50 flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-md w-full text-center border border-slate-100"
      >
        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-secondary mx-auto mb-8 shadow-xl">
          <Heart className="w-10 h-10 fill-current" />
        </div>
        <h1 className="text-4xl font-kenao text-primary mb-4">Bienvenido</h1>
        <p className="text-primary/60 mb-12 leading-relaxed">
          Accede a tu cuenta para gestionar el contenido de la iglesia o acceder a tus cursos.
        </p>

        <div className="space-y-4 mb-12">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl text-left">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-secondary shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-primary text-sm">Comunicaciones</h4>
              <p className="text-xs text-primary/40">Gestiona noticias y eventos</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl text-left">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-secondary shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-primary text-sm">Enseñanza</h4>
              <p className="text-xs text-primary/40">Accede a cursos y materiales</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl text-left">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-secondary shadow-sm">
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
            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-left"
          >
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium leading-relaxed">{errorMsg}</p>
          </motion.div>
        )}

        <button 
          onClick={handleLogin}
          className="w-full bg-primary text-white font-bold py-5 rounded-2xl hover:bg-secondary hover:text-primary transition-all flex items-center justify-center gap-3 shadow-lg transform hover:-translate-y-1 cursor-pointer text-sm"
        >
          <LogIn className="w-5 h-5" />
          Acceder con Google
        </button>
        
        <p className="mt-8 text-xs text-primary/30">
          Al acceder, aceptas nuestros términos de servicio y política de privacidad.
        </p>
      </motion.div>
    </div>
  );
}
