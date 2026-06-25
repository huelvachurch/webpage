import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGlobalSettings } from '../utils/useSettings';

export default function Footer() {
  const { t } = useTranslation();
  const { meetingTime } = useGlobalSettings();

  return (
    <footer className="bg-primary text-white/70 py-12 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="mb-4">
              <img src="/images/Logotipo%20Blanco.png" alt="Huelva Church" className="h-10 w-auto object-contain" />
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              {t('footer.desc')}
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4 uppercase tracking-wider text-sm">{t('footer.sections.quickLinks')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-secondary transition-colors">{t('footer.links.home')}</Link></li>
              <li><Link to="/nosotros" className="hover:text-secondary transition-colors">{t('nav.about')}</Link></li>
              <li><Link to="/avisos" className="hover:text-secondary transition-colors">{t('footer.links.activities')}</Link></li>
              <li><Link to="/dar" className="hover:text-secondary transition-colors">{t('footer.links.give')}</Link></li>
              <li><Link to="/contacto" className="hover:text-secondary transition-colors">{t('footer.sections.contact')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4 uppercase tracking-wider text-sm">{t('home.mainMeeting')}</h4>
            <ul className="space-y-2 text-sm">
              <li>{meetingTime}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs md:text-sm text-center md:text-left">
          <p>&copy; {new Date().getFullYear()} HuelvaChurch. {t('footer.rights')}</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-white/50">
            <Link to="/marca" className="hover:text-secondary transition-colors">Manual de Marca</Link>
            <Link to="/legal?tab=privacy" className="hover:text-secondary transition-colors">{t('footer.links.privacy')}</Link>
            <Link to="/legal?tab=terms" className="hover:text-secondary transition-colors">{t('footer.links.terms')}</Link>
            <Link to="/legal?tab=cookies" className="hover:text-secondary transition-colors">{t('footer.links.cookies')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
