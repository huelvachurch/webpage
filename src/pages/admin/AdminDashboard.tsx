import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { Users, Users as UsersIcon, Home, Wallet, Building2 } from 'lucide-react';
import { useAuth } from '../../AuthContext';

export default function AdminDashboard() {
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = roles.includes('admin') || roles.includes('superadmin');

  useEffect(() => {
    if (isAuthReady && !loading) {
      if (!user || !isAdmin) {
        navigate('/');
      }
    }
  }, [user, isAdmin, loading, isAuthReady, navigate]);

  if (loading || !isAuthReady) return <div className="pt-32 text-center">Cargando...</div>;

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-kenao text-primary mb-2">Administración</h1>
            <p className="text-primary/60 text-sm">Panel de administración general del sistema.</p>
          </div>
        </div>
        
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
          <Link
            to="/admin/administracion/areas"
            className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              location.pathname.includes('/areas') 
                ? 'bg-primary text-white shadow-md' 
                : 'text-primary/60 hover:bg-slate-50 hover:text-primary'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Áreas
          </Link>
          <Link
            to="/admin/administracion/finanzas"
            className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              location.pathname.includes('/finanzas') 
                ? 'bg-primary text-white shadow-md' 
                : 'text-primary/60 hover:bg-slate-50 hover:text-primary'
            }`}
          >
            <Wallet className="w-4 h-4 text-teal-600" />
            Finanzas
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
