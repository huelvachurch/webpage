import React, { useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { BookOpen, Users, Bell } from 'lucide-react';
import { useAuth } from '../../AuthContext';

export default function AdminDocencia() {
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isProfesor = roles?.includes('profesor') || roles?.includes('admin') || roles?.includes('superadmin');

  useEffect(() => {
    if (isAuthReady && !loading) {
      if (!user || !isProfesor) {
        navigate('/');
      }
    }
  }, [user, isProfesor, loading, isAuthReady, navigate]);

  if (loading || !isAuthReady) return <div className="pt-32 text-center">Cargando...</div>;

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-kenao text-primary mb-2">Docencia</h1>
            <p className="text-primary/60 text-sm">Gestión de cursos, inscripciones y notificaciones.</p>
          </div>
        </div>
        
        {/* Header Tabs */}
        <div className="bg-white p-2 rounded-2xl shadow-sm inline-flex mb-8 overflow-x-auto max-w-full">
          <Link
            to="/admin/docencia/cursos"
            className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              location.pathname.includes('/cursos') 
                ? 'bg-primary text-white shadow-md' 
                : 'text-primary/60 hover:bg-slate-50 hover:text-primary'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Cursos
          </Link>
          <Link
            to="/admin/docencia/inscripciones"
            className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              location.pathname.includes('/inscripciones') 
                ? 'bg-primary text-white shadow-md' 
                : 'text-primary/60 hover:bg-slate-50 hover:text-primary'
            }`}
          >
            <Users className="w-4 h-4" />
            Inscripciones
          </Link>
          <Link
            to="/admin/docencia/notificaciones"
            className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              location.pathname.includes('/notificaciones') 
                ? 'bg-primary text-white shadow-md' 
                : 'text-primary/60 hover:bg-slate-50 hover:text-primary'
            }`}
          >
            <Bell className="w-4 h-4" />
            Notificaciones
          </Link>
        </div>

        {/* Sub-pages container */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
