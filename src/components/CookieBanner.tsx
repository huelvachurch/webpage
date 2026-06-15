import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, X } from 'lucide-react';

const bannerTexts = {
  es: {
    text: "Utilizamos cookies propias y de terceros para asegurar el buen funcionamiento del sitio web y mejorar tu experiencia. Al continuar navegando, aceptas su uso.",
    linkText: "Política de Cookies",
    accept: "Aceptar",
    decline: "Rechazar"
  },
  en: {
    text: "We use our own and third-party cookies to ensure the website works correctly and to improve your experience. By continuing to browse, you agree to their use.",
    linkText: "Cookie Policy",
    accept: "Accept",
    decline: "Decline"
  },
  pt: {
    text: "Utilizamos cookies próprios e de terceiros para garantir o bom funcionamento do site e melhorar a sua experiência. Ao continuar a navegar, aceita o seu uso.",
    linkText: "Política de Cookies",
    accept: "Aceitar",
    decline: "Recusar"
  }
};

export default function CookieBanner() {
  const { i18n } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already made a preference choice
    const consent = localStorage.getItem('huelvachurch_cookies_consent');
    if (!consent) {
      // Small delay on load for higher visual appeal
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('huelvachurch_cookies_consent', 'accepted');
    setIsVisible(false);
    window.dispatchEvent(new CustomEvent('huelvachurch_cookies_resolved'));
  };

  const handleDecline = () => {
    localStorage.setItem('huelvachurch_cookies_consent', 'declined');
    setIsVisible(false);
    window.dispatchEvent(new CustomEvent('huelvachurch_cookies_resolved'));
  };

  // Get current translation texts based on context language
  const lang = i18n.language.substring(0, 2) as 'es' | 'en' | 'pt';
  const content = bannerTexts[lang] || bannerTexts.es;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 lg:max-w-4xl lg:mx-auto bg-primary text-white p-5 md:p-6 rounded-3xl shadow-2xl z-[9999] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 font-gordita"
        >
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-white/10 text-secondary shrink-0 hidden sm:block">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-sm text-white/90 leading-relaxed font-medium">
                {content.text}{' '}
                <Link
                  to="/legal?tab=cookies"
                  onClick={() => setIsVisible(false)}
                  className="text-secondary font-bold hover:underline underline-offset-4 ml-1"
                >
                  {content.linkText}
                </Link>
              </p>
            </div>
          </div>

          <div className="flex gap-3 shrink-0 w-full md:w-auto justify-center">
            <button
              onClick={handleDecline}
              className="px-5 py-2.5 text-xs font-bold text-white/70 hover:text-white transition-colors"
            >
              {content.decline}
            </button>
            <button
              onClick={handleAccept}
              className="px-6 py-2.5 text-xs font-bold bg-secondary text-primary rounded-xl hover:bg-white hover:text-primary transition-all shadow-md shrink-0 uppercase tracking-wider"
            >
              {content.accept}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
