import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Heart, LogIn, LogOut, Shield, MessageSquare, User as UserIcon, GraduationCap, Layout, Users, Globe, Mail, Settings, Smile, Radio, Bell, HandHeart, ChevronDown, Home, Wallet, Receipt } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { loginWithGoogle, logout } from '../firebase';
import { useTranslation } from 'react-i18next';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAboutMenuOpen, setIsAboutMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, roles, loading, customPhotoURL } = useAuth();
  const displayPhotoURL = customPhotoURL || user?.photoURL;
  const { t, i18n } = useTranslation();

  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
        setIsLangMenuOpen(false);
        setIsAboutMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsOpen(false);
    setIsUserMenuOpen(false);
    setIsLangMenuOpen(false);
  }, [location]);

  // Lock body & html scroll when mobile menu is open to prevent page scrolling behind menu
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  const baseNavLinks = [
    { name: t('nav.about'), path: '/nosotros', icon: Users },
    { name: t('nav.radio'), path: '/radio', icon: Radio },
    { name: t('nav.kids'), path: '/ninos', icon: Smile },
    { name: t('nav.activities'), path: '/avisos', icon: Bell },
    { name: t('nav.courses'), path: '/cursos', icon: GraduationCap },
    { name: t('nav.give'), path: '/dar', icon: Heart },
    { name: t('nav.contact'), path: '/contacto', icon: Mail },
  ];

  const navLinks = baseNavLinks.filter(link => {
    if (link.path === '/cursos' && !user) return false;
    return true;
  });

  const isHomePage = location.pathname === '/';
  const isSuperAdmin = roles.includes('superadmin');
  const isAdmin = roles.includes('admin') || isSuperAdmin;
  const isComunicador = roles.includes('comunicador') || isSuperAdmin;
  const isProfesor = roles.includes('profesor') || isSuperAdmin;
  const isSupervisor = roles.includes('supervisor') || isSuperAdmin;
  const isLider = roles.includes('lider') || isSuperAdmin;
  const isStudent = true; // anyone can access their courses
  const isMaestro = roles.includes('maestro') || isSuperAdmin;
  const isFinanciero = roles.includes('financiero') || isAdmin;

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsLangMenuOpen(false);
  };

  return (
    <nav ref={navRef} className={`fixed w-full z-50 transition-all duration-500 ${scrolled || !isHomePage ? 'py-4 bg-white/80 backdrop-blur-xl shadow-sm' : 'py-8 bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/images/Logotipo%20Azul.png" alt="Huelva Church" className="h-10 md:h-12 w-auto object-contain transition-all" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;

              if (link.path === '/nosotros') {
                const isNosotrosGroupActive = location.pathname.startsWith('/nosotros');
                return (
                  <div 
                    key="nosotros-dropdown"
                    className="relative"
                    onMouseEnter={() => setIsAboutMenuOpen(true)}
                    onMouseLeave={() => setIsAboutMenuOpen(false)}
                  >
                    <Link
                      to="/nosotros"
                      title={t('nav.about')}
                      aria-label={t('nav.about')}
                      className={`relative group p-3 rounded-2xl transition-all duration-300 flex items-center justify-center ${
                        isNosotrosGroupActive 
                          ? 'bg-secondary/20 text-primary font-bold shadow-sm scale-105 border border-secondary/40' 
                          : 'text-primary/70 hover:text-primary hover:bg-slate-100/80 hover:scale-105'
                      }`}
                    >
                      <Users className={`w-5 h-5 transition-transform duration-200 ${isNosotrosGroupActive ? 'stroke-[2.25] text-primary' : 'stroke-[1.75]'}`} />
                      
                      <span className="pointer-events-none absolute top-full mt-2.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 bg-primary text-white text-[11px] font-bold py-1 px-3 rounded-xl whitespace-nowrap shadow-xl z-50 flex items-center gap-1.5 border border-white/10">
                        {t('nav.about')}
                      </span>
                    </Link>

                    <AnimatePresence>
                      {isAboutMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute left-1/2 -translate-x-1/2 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 min-w-[200px] flex flex-col z-[100]"
                        >
                          <Link
                            to="/nosotros/celulas"
                            onClick={() => setIsAboutMenuOpen(false)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold transition-all ${
                              location.pathname === '/nosotros/celulas' ? 'bg-secondary/20 text-primary' : 'text-primary/70 hover:bg-slate-50 hover:text-primary'
                            }`}
                          >
                            <Home className="w-4 h-4 text-primary shrink-0" />
                            <span>{t('nav.cells', 'Células')}</span>
                          </Link>
                          <Link
                            to="/nosotros/obras"
                            onClick={() => setIsAboutMenuOpen(false)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold transition-all ${
                              location.pathname === '/nosotros/obras' ? 'bg-secondary/20 text-primary' : 'text-primary/70 hover:bg-slate-50 hover:text-primary'
                            }`}
                          >
                            <HandHeart className="w-4 h-4 text-primary shrink-0" />
                            <span>{t('nav.obras', 'Obras Sociales')}</span>
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  title={link.name}
                  aria-label={link.name}
                  className={`relative group p-3 rounded-2xl transition-all duration-300 flex items-center justify-center ${
                    isActive 
                      ? 'bg-secondary/20 text-primary font-bold shadow-sm scale-105 border border-secondary/40' 
                      : 'text-primary/70 hover:text-primary hover:bg-slate-100/80 hover:scale-105'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'stroke-[2.25] text-primary' : 'stroke-[1.75]'}`} />
                  
                  {/* Tooltip on hover */}
                  <span className="pointer-events-none absolute top-full mt-2.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 bg-primary text-white text-[11px] font-bold py-1 px-3 rounded-xl whitespace-nowrap shadow-xl z-50 flex items-center gap-1.5 border border-white/10">
                    {link.name}
                  </span>
                </Link>
              );
            })}
            
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
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center gap-2 focus:outline-none"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 hover:border-secondary transition-all shadow-sm">
                        {displayPhotoURL ? (
                          <img src={displayPhotoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary/40">
                            <UserIcon className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    </button>
                    <AnimatePresence>
                      {isUserMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 min-w-[220px] max-h-[calc(100vh-100px)] overflow-y-auto flex flex-col z-[100]"
                        >
                          <div className="px-4 py-2 border-b border-slate-50 mb-1 text-xs text-primary/50 font-medium font-gordita truncate">
                            {user.displayName || user.email}
                          </div>

                          {/* 1. Mi Perfil */}
                          <Link 
                            onClick={() => setIsUserMenuOpen(false)}
                            to="/miperfil" 
                            className="flex items-center gap-3 px-4 py-2.5 text-left text-sm rounded-lg hover:bg-slate-50 text-primary font-medium transition-colors"
                          >
                            <UserIcon className="w-5 h-5 text-primary/60" />
                            Mi Perfil
                          </Link>

                          {/* 2. Mis Cursos */}
                          {isStudent && (
                            <Link 
                              onClick={() => setIsUserMenuOpen(false)}
                              to="/mis-cursos" 
                              className="flex items-center gap-3 px-4 py-2.5 text-left text-sm rounded-lg hover:bg-slate-50 text-primary font-medium transition-colors"
                            >
                              <GraduationCap className="w-5 h-5 text-primary/60" />
                              Mis Cursos
                            </Link>
                          )}

                          {/* 3. Mi Célula */}
                          <Link 
                            onClick={() => setIsUserMenuOpen(false)}
                            to="/micelula" 
                            className="flex items-center gap-3 px-4 py-2.5 text-left text-sm rounded-lg hover:bg-slate-50 text-primary font-medium transition-colors"
                          >
                            <Users className="w-5 h-5 text-primary/60" />
                            Mi Célula
                          </Link>

                          {/* 4. Liderazgo */}
                          {isLider && (
                            <Link 
                              onClick={() => setIsUserMenuOpen(false)}
                              to="/lideres" 
                              className="flex items-center gap-3 px-4 py-2.5 text-left text-sm rounded-lg bg-amber-50 hover:bg-amber-100/70 text-amber-900 font-bold transition-colors mb-1"
                            >
                              <Shield className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
                              Liderazgo
                            </Link>
                          )}

                          {/* 5. Supervisión */}
                          {isSupervisor && (
                            <Link 
                              onClick={() => setIsUserMenuOpen(false)}
                              to="/supervision" 
                              className="flex items-center gap-3 px-4 py-2.5 text-left text-sm rounded-lg bg-orange-50 hover:bg-orange-100/70 text-orange-900 font-bold transition-colors mb-1"
                            >
                              <Shield className="w-5 h-5 text-orange-500 shrink-0" />
                              Supervisión
                            </Link>
                          )}

                          {/* 6. Infantil */}
                          {isMaestro && (
                            <Link 
                              onClick={() => setIsUserMenuOpen(false)}
                              to="/infantil" 
                              className="flex items-center gap-3 px-4 py-2.5 text-left text-sm rounded-lg hover:bg-slate-50 text-primary font-medium transition-colors"
                            >
                              <Smile className="w-5 h-5 text-primary/60 shrink-0" />
                              Infantil
                            </Link>
                          )}

                          {/* 7. Docencia */}
                          {isProfesor && (
                            <Link 
                              onClick={() => setIsUserMenuOpen(false)}
                              to="/admin/docencia" 
                              className="flex items-center gap-3 px-4 py-2.5 text-left text-sm rounded-lg hover:bg-slate-50 text-primary font-medium transition-colors"
                            >
                              <Layout className="w-5 h-5 text-primary/60" />
                              Docencia
                            </Link>
                          )}

                          {/* 8. Anuncios */}
                          {isComunicador && (
                            <Link 
                              onClick={() => setIsUserMenuOpen(false)}
                              to="/admin/anuncios" 
                              className="flex items-center gap-3 px-4 py-2.5 text-left text-sm rounded-lg hover:bg-slate-50 text-primary font-medium transition-colors"
                            >
                              <MessageSquare className="w-5 h-5 text-primary/60" />
                              Anuncios
                            </Link>
                          )}

                          {/* 9. Boletines */}
                          {isComunicador && (
                            <Link 
                              onClick={() => setIsUserMenuOpen(false)}
                              to="/admin/boletines" 
                              className="flex items-center gap-3 px-4 py-2.5 text-left text-sm rounded-lg hover:bg-slate-50 text-primary font-medium transition-colors"
                            >
                              <Mail className="w-5 h-5 text-primary/60" />
                              Boletines
                            </Link>
                          )}

                          {/* Finanzas */}
                          {isFinanciero && (
                            <Link 
                              onClick={() => setIsUserMenuOpen(false)}
                              to="/admin/finanzas" 
                              className="flex items-center gap-3 px-4 py-2.5 text-left text-sm rounded-lg hover:bg-slate-50 text-primary font-medium transition-colors"
                            >
                              <Wallet className="w-5 h-5 text-primary/60" />
                              Finanzas
                            </Link>
                          )}

                          {/* 10. Administración */}
                          {isAdmin && (
                            <Link 
                              onClick={() => setIsUserMenuOpen(false)}
                              to="/admin/administracion" 
                              className="flex items-center gap-3 px-4 py-2.5 text-left text-sm rounded-lg hover:bg-slate-50 text-primary font-medium transition-colors"
                            >
                              <Shield className="w-5 h-5 text-primary/60" />
                              Administración
                            </Link>
                          )}

                          {/* 11. Ajustes */}
                          {isAdmin && (
                            <Link 
                              onClick={() => setIsUserMenuOpen(false)}
                              to="/admin/ajustes" 
                              className="flex items-center gap-3 px-4 py-2.5 text-left text-sm rounded-lg hover:bg-slate-50 text-primary font-medium transition-colors"
                            >
                              <Settings className="w-5 h-5 text-primary/60" />
                              Ajustes
                            </Link>
                          )}

                          <div className="h-px bg-slate-50 my-1"></div>

                          <button 
                            onClick={() => { logout(); setIsUserMenuOpen(false); }}
                            className="flex items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors w-full"
                          >
                            <LogOut className="w-5 h-5" />
                            {t('nav.logout')}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
          <div className="lg:hidden flex items-center gap-4">
            {!loading && user && (
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                {displayPhotoURL ? (
                  <img src={displayPhotoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
            className="lg:hidden bg-white border-t border-slate-100 max-h-[calc(100vh-80px)] overflow-y-auto overscroll-contain touch-pan-y mt-4 shadow-xl"
          >
            <div className="px-6 py-8 pt-6 space-y-6 flex flex-col items-center text-center">
               {/* Mobile Language Selector */}
               <div className="flex gap-4 justify-center w-full">
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

              <div className="flex flex-col items-center space-y-4 w-full">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;

                  if (link.path === '/nosotros') {
                    return (
                      <div key="nosotros-mobile-group" className="flex flex-col items-center space-y-3 w-full bg-slate-50/80 border border-slate-100 rounded-2xl p-4">
                        <Link
                          to="/nosotros"
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center gap-2 text-base font-extrabold tracking-wider uppercase transition-all hover:text-secondary ${
                            location.pathname === '/nosotros' ? 'text-secondary' : 'text-primary'
                          }`}
                        >
                          <Users className="w-4 h-4 shrink-0" />
                          <span>{t('nav.about', 'Nosotros')}</span>
                        </Link>

                        <Link
                          to="/nosotros/celulas"
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center gap-2.5 text-sm font-bold tracking-wider uppercase transition-all hover:text-secondary ${
                            location.pathname === '/nosotros/celulas' ? 'text-secondary font-extrabold' : 'text-primary/80'
                          }`}
                        >
                          <Home className="w-4 h-4 shrink-0" />
                          <span>{t('nav.cells', 'Células')}</span>
                        </Link>

                        <Link
                          to="/nosotros/obras"
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center gap-2.5 text-sm font-bold tracking-wider uppercase transition-all hover:text-secondary ${
                            location.pathname === '/nosotros/obras' ? 'text-secondary font-extrabold' : 'text-primary/80'
                          }`}
                        >
                          <HandHeart className="w-4 h-4 text-secondary shrink-0" />
                          <span>{t('nav.obras', 'Obras Sociales')}</span>
                        </Link>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 text-lg font-bold tracking-wider uppercase transition-all hover:text-secondary ${
                        isActive ? 'text-secondary font-extrabold' : 'text-primary'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </div>
              
              <div className="h-px bg-slate-100 w-full"></div>
              
              {user ? (
                <div className="space-y-4 flex flex-col items-center w-full">
                  {/* 1. Mi Perfil */}
                  <Link to="/miperfil" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-primary/60 hover:text-primary font-bold uppercase text-sm tracking-widest transition-colors">
                    <UserIcon className="w-5 h-5 shrink-0" />
                    Mi Perfil
                  </Link>

                  {/* 2. Mis Cursos */}
                  {isStudent && (
                    <Link to="/mis-cursos" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-primary/60 hover:text-primary font-bold uppercase text-sm tracking-widest transition-colors">
                      <GraduationCap className="w-5 h-5 shrink-0" />
                      Mis Cursos
                    </Link>
                  )}

                  {/* 3. Mi Célula */}
                  <Link to="/micelula" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-primary/60 hover:text-primary font-bold uppercase text-sm tracking-widest transition-colors">
                    <Users className="w-5 h-5 shrink-0" />
                    Mi Célula
                  </Link>

                  {/* 4. Liderazgo */}
                  {isLider && (
                    <Link to="/lideres" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-amber-600 hover:text-amber-700 bg-amber-50 px-4 py-2 rounded-xl font-bold uppercase text-sm tracking-widest transition-colors">
                      <Shield className="w-5 h-5 shrink-0 animate-pulse" />
                      Liderazgo
                    </Link>
                  )}

                  {/* 5. Supervisión */}
                  {isSupervisor && (
                    <Link to="/supervision" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-orange-600 hover:text-orange-700 bg-orange-50 px-4 py-2 rounded-xl font-bold uppercase text-sm tracking-widest transition-colors">
                      <Shield className="w-5 h-5 shrink-0" />
                      Supervisión
                    </Link>
                  )}

                  {/* 6. Infantil */}
                  {isMaestro && (
                    <Link to="/infantil" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-primary/60 hover:text-primary font-bold uppercase text-sm tracking-widest transition-colors">
                      <Smile className="w-5 h-5 shrink-0" />
                      Infantil
                    </Link>
                  )}

                  {/* 7. Docencia */}
                  {isProfesor && (
                    <Link to="/admin/docencia" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-primary/60 hover:text-primary font-bold uppercase text-sm tracking-widest transition-colors">
                      <Layout className="w-5 h-5 shrink-0" />
                      Docencia
                    </Link>
                  )}

                  {/* 8. Anuncios */}
                  {isComunicador && (
                    <Link to="/admin/anuncios" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-primary/60 hover:text-primary font-bold uppercase text-sm tracking-widest transition-colors">
                      <MessageSquare className="w-5 h-5 shrink-0" />
                      Anuncios
                    </Link>
                  )}

                  {/* 9. Boletines */}
                  {isComunicador && (
                    <Link to="/admin/boletines" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-primary/60 hover:text-primary font-bold uppercase text-sm tracking-widest transition-colors">
                      <Mail className="w-5 h-5 shrink-0" />
                      Boletines
                    </Link>
                  )}

                  {/* Finanzas */}
                  {isFinanciero && (
                    <Link to="/admin/finanzas" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-primary/60 hover:text-primary font-bold uppercase text-sm tracking-widest transition-colors">
                      <Wallet className="w-5 h-5 shrink-0" />
                      Finanzas
                    </Link>
                  )}

                  {/* 10. Administración */}
                  {isAdmin && (
                    <Link to="/admin/administracion" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-primary/60 hover:text-primary font-bold uppercase text-sm tracking-widest transition-colors">
                      <Shield className="w-5 h-5 shrink-0" />
                      Administración
                    </Link>
                  )}

                  {/* 11. Ajustes */}
                  {isAdmin && (
                    <Link to="/admin/ajustes" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-primary/60 hover:text-primary font-bold uppercase text-sm tracking-widest transition-colors">
                      <Settings className="w-5 h-5 shrink-0" />
                      Ajustes
                    </Link>
                  )}

                  <button 
                    onClick={() => { logout(); setIsOpen(false); }}
                    className="flex items-center gap-3 text-red-500 hover:text-red-600 font-bold uppercase text-sm tracking-widest transition-colors"
                  >
                    <LogOut className="w-5 h-5 shrink-0" />
                    {t('nav.logout')}
                  </button>
                </div>
              ) : (
                <Link 
                  to="/login"
                  className="w-full max-w-xs flex items-center justify-center gap-2 bg-primary text-white px-6 py-4 rounded-2xl font-bold hover:bg-secondary hover:text-primary transition-all shadow-lg"
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
