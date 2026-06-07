import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { Users, Users as UsersIcon, Home } from 'lucide-react';
import { useAuth } from '../../AuthContext';

export default function AdminDashboard() {
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdmin = roles.includes('superadmin');

  useEffect(() => {
    if (isAuthReady && !loading) {
      if (!user || !isSuperAdmin) {
        navigate('/');
      }
    }
  }, [user, isSuperAdmin, loading, isAuthReady, navigate]);

  if (loading || !isAuthReady) return <div className="pt-32 text-center">Cargando...</div>;

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-kenao text-primary mb-2 uppercase tracking-wide">Administración</h1>
        <p className="text-lg text-primary/60 mb-8 max-w-3xl">Panel de administración general del sistema.</p>
        
        {/* Header Tabs for SuperAdmin */}
        <div className="bg-white p-2 rounded-2xl shadow-sm inline-flex mb-8 overflow-x-auto max-w-full">
          <Link
            to="/admin/administracion/usuarios"
            className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              location.pathname.includes('/usuarios') 
                ? 'bg-primary text-white shadow-md' 
                : 'text-primary/60 hover:bg-slate-50 hover:text-primary'
            }`}
          >
            <Users className="w-4 h-4" />
            Usuarios
          </Link>
          <Link
            to="/admin/administracion/celulas"
            className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              location.pathname.includes('/celulas') 
                ? 'bg-primary text-white shadow-md' 
                : 'text-primary/60 hover:bg-slate-50 hover:text-primary'
            }`}
          >
            <Home className="w-4 h-4" />
            Células
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
