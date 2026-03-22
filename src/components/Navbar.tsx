import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Heart, LogIn, LogOut, Shield, MessageSquare, User as UserIcon, GraduationCap, Layout } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { loginWithGoogle, logout } from '../firebase';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, roles, loading } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => setIsOpen(false), [location]);

  const navLinks = [
    { name: 'Inicio', path: '/' },
    { name: 'Nosotros', path: '/nosotros' },
    { name: 'Actividades', path: '/actividades' },
    { name: 'Cursos', path: '/cursos' },
    { name: 'Dar', path: '/dar' },
    { name: 'Contacto', path: '/contacto' },
  ];

  const isHomePage = location.pathname === '/';
  const isAdmin = roles.includes('admin');
  const isComunicador = roles.includes('comunicador') || isAdmin;
  const isProfesor = roles.includes('profesor') || isAdmin;

  return (
    <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled || !isHomePage ? 'py-4 bg-white/80 backdrop-blur-xl shadow-sm' : 'py-8 bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-secondary transform group-hover:rotate-12 transition-transform duration-500 shadow-lg">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-kenao leading-none text-primary">Huelva</span>
              <span className="text-xs font-bold tracking-[0.3em] text-secondary uppercase leading-none mt-1">Church</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm font-bold tracking-wider uppercase transition-all hover:text-secondary ${
                  location.pathname === link.path 
                    ? 'text-secondary' 
                    : 'text-primary'
                }`}
              >
                {link.name}
              </Link>
            ))}
            
            <div className={`h-8 w-px mx-2 ${scrolled || !isHomePage ? 'bg-slate-200' : 'bg-primary/10'}`}></div>

            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-4">
                    {/* Student Link */}
                    <Link 
                      to="/mis-cursos" 
                      className="p-2 transition-all hover:text-secondary text-primary/40"
                      title="Mis Cursos"
                    >
                      <GraduationCap className="w-5 h-5" />
                    </Link>

                    {/* Admin/Profesor Links */}
                    {isProfesor && (
                      <Link 
                        to="/admin/cursos" 
                        className="p-2 transition-all hover:text-secondary text-primary/40"
                        title="Gestión Cursos"
                      >
                        <Layout className="w-5 h-5" />
                      </Link>
                    )}
                    {isComunicador && (
                      <Link 
                        to="/admin/comunicaciones" 
                        className="p-2 transition-all hover:text-secondary text-primary/40"
                        title="Portal Comunicaciones"
                      >
                        <MessageSquare className="w-5 h-5" />
                      </Link>
                    )}
                    {isAdmin && (
                      <Link 
                        to="/admin/usuarios" 
                        className="p-2 transition-all hover:text-secondary text-primary/40"
                        title="Administración Usuarios"
                      >
                        <Shield className="w-5 h-5" />
                      </Link>
                    )}
                    
                    <div className="flex items-center gap-3 pl-2">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary/20">
                            <UserIcon className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => logout()}
                        className="p-2 transition-all hover:text-red-500 text-primary/40"
                        title="Cerrar Sesión"
                      >
                        <LogOut className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link 
                    to="/login"
                    className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-secondary hover:text-primary transition-all shadow-lg text-sm"
                  >
                    <LogIn className="w-4 h-4" />
                    Acceso
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            {!loading && user && (
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary/20">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`p-3 rounded-2xl shadow-sm ${scrolled || !isHomePage ? 'bg-white text-primary' : 'bg-primary/5 text-primary backdrop-blur-md'}`}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-slate-100 overflow-hidden"
          >
            <div className="px-4 py-8 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`block text-lg font-bold tracking-wider uppercase transition-all ${location.pathname === link.path ? 'text-secondary' : 'text-primary'}`}
                >
                  {link.name}
                </Link>
              ))}
              
              <div className="h-px bg-slate-100 w-full my-4"></div>
              
              {user ? (
                <div className="space-y-4">
                  <Link to="/mis-cursos" className="flex items-center gap-3 text-primary/60 font-bold uppercase text-sm tracking-widest">
                    <GraduationCap className="w-5 h-5" />
                    Mis Cursos
                  </Link>
                  {isProfesor && (
                    <Link to="/admin/cursos" className="flex items-center gap-3 text-primary/60 font-bold uppercase text-sm tracking-widest">
                      <Layout className="w-5 h-5" />
                      Gestión Cursos
                    </Link>
                  )}
                  {isComunicador && (
                    <Link to="/admin/comunicaciones" className="flex items-center gap-3 text-primary/60 font-bold uppercase text-sm tracking-widest">
                      <MessageSquare className="w-5 h-5" />
                      Comunicaciones
                    </Link>
                  )}
                  {isAdmin && (
                    <Link to="/admin/usuarios" className="flex items-center gap-3 text-primary/60 font-bold uppercase text-sm tracking-widest">
                      <Shield className="w-5 h-5" />
                      Usuarios
                    </Link>
                  )}
                  <button 
                    onClick={() => logout()}
                    className="flex items-center gap-3 text-red-500 font-bold uppercase text-sm tracking-widest"
                  >
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión
                  </button>
                </div>
              ) : (
                <Link 
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white px-6 py-4 rounded-2xl font-bold hover:bg-secondary hover:text-primary transition-all shadow-lg"
                >
                  <LogIn className="w-5 h-5" />
                  Iniciar Sesión
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
