import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Heart, LogIn, LogOut, Shield, MessageSquare, User as UserIcon, GraduationCap, Layout, Users, Globe } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { loginWithGoogle, logout } from '../firebase';
import { useTranslation } from 'react-i18next';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, roles, loading } = useAuth();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => setIsOpen(false), [location]);

  const navLinks = [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.about'), path: '/nosotros' },
    { name: t('nav.activities'), path: '/actividades' },
    { name: t('nav.courses'), path: '/cursos' },
    { name: t('nav.give'), path: '/dar' },
    { name: t('nav.contact'), path: '/contacto' },
  ];

  const isHomePage = location.pathname === '/';
  const isAdmin = roles.includes('admin');
  const isComunicador = roles.includes('comunicador') || isAdmin;
  const isProfesor = roles.includes('profesor') || isAdmin;

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsLangMenuOpen(false);
  };

  return (
    <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled || !isHomePage ? 'py-4 bg-white/80 backdrop-blur-xl shadow-sm' : 'py-8 bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-logo-huelva text-primary leading-none">Huelva</span>
              <span className="text-2xl font-logo-church text-primary leading-none font-light">Church</span>
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

            <div className="relative">
              <button 
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-xl text-primary/70 hover:bg-slate-100 hover:text-primary transition-all font-bold uppercase tracking-wider"
                title="Change language"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200">
                  <img 
                    src={i18n.language.startsWith('es') ? 'https://flagcdn.com/w40/es.png' : i18n.language.startsWith('pt') ? 'https://flagcdn.com/w40/pt.png' : 'https://flagcdn.com/w40/gb.png'} 
                    alt="Current Language"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Globe className="w-4 h-4 ml-1 opacity-50" />
              </button>
              <AnimatePresence>
                {isLangMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 min-w-[140px] flex flex-col z-[100]"
                  >
                    <button onClick={() => { changeLanguage('es'); setIsLangMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-2 text-left text-sm rounded-lg hover:bg-slate-50 transition-colors ${i18n.language.startsWith('es') ? 'font-bold text-secondary bg-slate-50' : 'font-medium text-primary'}`}>
                      <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-200 shrink-0"><img src="https://flagcdn.com/w40/es.png" alt="ES" className="w-full h-full object-cover" /></div>
                      Español
                    </button>
                    <button onClick={() => { changeLanguage('en'); setIsLangMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-2 text-left text-sm rounded-lg hover:bg-slate-50 transition-colors ${i18n.language.startsWith('en') ? 'font-bold text-secondary bg-slate-50' : 'font-medium text-primary'}`}>
                      <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-200 shrink-0"><img src="https://flagcdn.com/w40/gb.png" alt="EN" className="w-full h-full object-cover" /></div>
                      English
                    </button>
                    <button onClick={() => { changeLanguage('pt'); setIsLangMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-2 text-left text-sm rounded-lg hover:bg-slate-50 transition-colors ${i18n.language.startsWith('pt') ? 'font-bold text-secondary bg-slate-50' : 'font-medium text-primary'}`}>
                      <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-200 shrink-0"><img src="https://flagcdn.com/w40/pt.png" alt="PT" className="w-full h-full object-cover" /></div>
                      Português
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-4">
                    {/* Student Link */}
                    <Link 
                      to="/mis-cursos" 
                      className="p-2 transition-all hover:text-secondary text-primary/40"
                      title={t('nav.myCourses')}
                    >
                      <GraduationCap className="w-5 h-5" />
                    </Link>

                    {/* Admin/Profesor Links */}
                    {isProfesor && (
                      <Link 
                        to="/admin/cursos" 
                        className="p-2 transition-all hover:text-secondary text-primary/40"
                        title={t('nav.adminCourses')}
                      >
                        <Layout className="w-5 h-5" />
                      </Link>
                    )}
                    {isAdmin && (
                      <Link 
                        to="/admin/celulas" 
                        className="p-2 transition-all hover:text-secondary text-primary/40"
                        title={t('nav.adminCells')}
                      >
                        <Users className="w-5 h-5" />
                      </Link>
                    )}
                    {isComunicador && (
                      <Link 
                        to="/admin/comunicaciones" 
                        className="p-2 transition-all hover:text-secondary text-primary/40"
                        title={t('nav.adminComms')}
                      >
                        <MessageSquare className="w-5 h-5" />
                      </Link>
                    )}
                    {isAdmin && (
                      <Link 
                        to="/admin/usuarios" 
                        className="p-2 transition-all hover:text-secondary text-primary/40"
                        title={t('nav.adminUsers')}
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
                        title={t('nav.logout')}
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
                    {t('nav.login')}
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
            className="md:hidden bg-white border-t border-slate-100 overflow-hidden mt-8 shadow-xl"
          >
            <div className="px-4 py-8 pt-6 space-y-4">
               {/* Mobile Language Selector */}
               <div className="flex gap-4 mb-6 justify-center">
                <button onClick={() => { changeLanguage('es'); setIsOpen(false); }} className={`flex items-center justify-center w-12 h-12 rounded-full overflow-hidden border-2 transition-all shadow-sm ${i18n.language.startsWith('es') ? 'border-secondary scale-110' : 'border-slate-100 opacity-60 hover:opacity-100'}`}>
                  <img src="https://flagcdn.com/w80/es.png" alt="ES" className="w-full h-full object-cover" />
                </button>
                <button onClick={() => { changeLanguage('en'); setIsOpen(false); }} className={`flex items-center justify-center w-12 h-12 rounded-full overflow-hidden border-2 transition-all shadow-sm ${i18n.language.startsWith('en') ? 'border-secondary scale-110' : 'border-slate-100 opacity-60 hover:opacity-100'}`}>
                  <img src="https://flagcdn.com/w80/gb.png" alt="EN" className="w-full h-full object-cover" />
                </button>
                <button onClick={() => { changeLanguage('pt'); setIsOpen(false); }} className={`flex items-center justify-center w-12 h-12 rounded-full overflow-hidden border-2 transition-all shadow-sm ${i18n.language.startsWith('pt') ? 'border-secondary scale-110' : 'border-slate-100 opacity-60 hover:opacity-100'}`}>
                  <img src="https://flagcdn.com/w80/pt.png" alt="PT" className="w-full h-full object-cover" />
                </button>
               </div>

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
                    {t('nav.myCourses')}
                  </Link>
                  {isProfesor && (
                    <Link to="/admin/cursos" className="flex items-center gap-3 text-primary/60 font-bold uppercase text-sm tracking-widest">
                      <Layout className="w-5 h-5" />
                      {t('nav.adminCourses')}
                    </Link>
                  )}
                  {isAdmin && (
                    <Link to="/admin/celulas" className="flex items-center gap-3 text-primary/60 font-bold uppercase text-sm tracking-widest">
                      <Users className="w-5 h-5" />
                      {t('nav.adminCells')}
                    </Link>
                  )}
                  {isComunicador && (
                    <Link to="/admin/comunicaciones" className="flex items-center gap-3 text-primary/60 font-bold uppercase text-sm tracking-widest">
                      <MessageSquare className="w-5 h-5" />
                      {t('nav.adminComms')}
                    </Link>
                  )}
                  {isAdmin && (
                    <Link to="/admin/usuarios" className="flex items-center gap-3 text-primary/60 font-bold uppercase text-sm tracking-widest">
                      <Shield className="w-5 h-5" />
                      {t('nav.adminUsers')}
                    </Link>
                  )}
                  <button 
                    onClick={() => logout()}
                    className="flex items-center gap-3 text-red-500 font-bold uppercase text-sm tracking-widest"
                  >
                    <LogOut className="w-5 h-5" />
                    {t('nav.logout')}
                  </button>
                </div>
              ) : (
                <Link 
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white px-6 py-4 rounded-2xl font-bold hover:bg-secondary hover:text-primary transition-all shadow-lg"
                >
                  <LogIn className="w-5 h-5" />
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
