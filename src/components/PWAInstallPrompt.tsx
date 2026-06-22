import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share2, PlusSquare, Smartphone, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Detect if the app is already running in standalone mode (installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true ||
      localStorage.getItem('huelvachurch_pwa_installed') === 'true';

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // 2. Check local storage if the user recently dismissed the prompt
    const dismissedTime = localStorage.getItem('huelvachurch_pwa_dismissed');
    if (dismissedTime) {
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      // Do not show the prompt if dismissed less than 30 days ago
      if (now - parseInt(dismissedTime) < thirtyDays) {
        return;
      }
    }

    // Check if food/cookies consent is already decided
    const isCookieConsentResolved = !!localStorage.getItem('huelvachurch_cookies_consent');

    const triggerPromptWithDelay = (delayMs: number) => {
      return setTimeout(() => {
        setShowPrompt(true);
      }, delayMs);
    };

    let showTimer: any = null;

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDetected = /iphone|ipad|ipod/.test(userAgent);
    
    if (iosDetected) {
      setIsIOS(true);
      if (isCookieConsentResolved) {
        // Show Apple custom prompt after a small delay to make it smooth
        showTimer = triggerPromptWithDelay(3500);
      }
    }

    // 4. Capture standard prompt event (Android / Chrome / Desktop)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      if (isCookieConsentResolved) {
        // Delay prompt appearance for an integrated premium experience
        showTimer = triggerPromptWithDelay(3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Coordinate showing when cookies are resolved
    const handleCookiesResolved = () => {
      showTimer = triggerPromptWithDelay(2500);
    };
    window.addEventListener('huelvachurch_cookies_resolved', handleCookiesResolved);

    // 5. Detect when the app is installed successfully
    const handleAppInstalled = () => {
      setInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('huelvachurch_cookies_resolved', handleCookiesResolved);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (showTimer) clearTimeout(showTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Trigger system installer prompt
    await deferredPrompt.prompt();
    
    // Await decision
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('User installed the web app');
      setInstalled(true);
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Save timestamp of dismissal
    localStorage.setItem('huelvachurch_pwa_dismissed', Date.now().toString());
  };

  const handleInstalledForever = () => {
    setShowPrompt(false);
    localStorage.setItem('huelvachurch_pwa_installed', 'true');
    setInstalled(true);
  };

  if (installed || !showPrompt) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[9999]">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-primary text-white border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md bg-opacity-95"
        >
          {/* Subtle gold line accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary/40 via-secondary to-secondary/40" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
                <img 
                  src="/images/LogoPWA.png" 
                  alt="Huelva Church Logo" 
                  className="w-7 h-7 object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-wide">Instala Huelva Church</h4>
                <p className="text-xs text-white/60">Acceso rápido, estudios y notificaciones</p>
              </div>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-white/40 hover:text-white p-1 rounded-full transition-colors cursor-pointer"
              aria-label="Cerrar prompt de instalación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conditional Description & Steps */}
          {isIOS ? (
            <div className="space-y-3.5 mb-5 text-xs text-white/80">
              <p className="font-medium text-white/90">Sigue estos sencillos pasos para añadir la app en tu iPhone/iPad:</p>
              <div className="space-y-2 bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold text-[10px]">1</span>
                  <span>Pulsa el botón de compartir</span>
                  <Share2 className="w-4 h-4 text-secondary inline-block ml-1" />
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold text-[10px]">2</span>
                  <span>Selecciona</span>
                  <span className="font-semibold text-secondary">"Añadir a la pantalla de inicio"</span>
                  <PlusSquare className="w-4 h-4 text-secondary inline-block shrink-0" />
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold text-[10px]">3</span>
                  <span>Pulsa</span>
                  <span className="font-semibold text-secondary">"Añadir"</span>
                  <span className="text-[10px] text-white/50">(arriba a la derecha)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 mb-5 text-xs text-white/70">
              <p>Disfruta de la mejor experiencia instalando nuestra aplicación nativa web en tu pantalla de inicio. No abarca espacio en tu memoria física.</p>
              <div className="flex items-center gap-2 text-[11px] text-green-400 bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/10">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Compatible con Android, Chrome y ordenadores</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              {!isIOS ? (
                <button
                  onClick={handleInstallClick}
                  disabled={!deferredPrompt}
                  className="flex-grow flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 disabled:bg-white/10 disabled:text-white/50 text-primary font-bold px-4 py-3 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar Ahora</span>
                </button>
              ) : (
                <button
                  onClick={handleInstalledForever}
                  className="flex-grow flex items-center justify-center gap-2 bg-secondary text-primary font-bold px-4 py-3 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer hover:bg-secondary/90 text-center"
                >
                  <span>¡Ya la tengo!</span>
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer text-center shrink-0"
              >
                Más tarde
              </button>
            </div>
            
            <button
              onClick={handleInstalledForever}
              className="text-[10.5px] text-white/40 hover:text-white/80 transition-colors pt-1 pb-0.5 hover:underline cursor-pointer text-center"
            >
              Ya la tengo instalada / No volver a mostrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
