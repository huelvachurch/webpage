import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Users, BookOpen, MapPin, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Nosotros() {
  const { t } = useTranslation();

  return (
    <div className="pt-32 pb-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-secondary tracking-wider uppercase text-sm font-bold mb-4">{t('about.tag')}</h2>
          <h1 className="text-5xl md:text-6xl font-kenao text-primary mb-6">{t('about.title')}</h1>
          <p className="text-primary/70 text-xl max-w-3xl mx-auto leading-relaxed">
            {t('about.desc')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-3xl font-kenao text-primary mb-6">{t('about.visionTitle')}</h3>
            <p className="text-primary/80 text-lg mb-6 leading-relaxed font-semibold italic text-secondary">
              {t('about.visionQuote')}
            </p>
            <p className="text-primary/80 text-lg mb-8 leading-relaxed">
              {t('about.visionDesc')}
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <Heart className="w-5 h-5" />
                </div>
                <span className="font-bold text-primary">{t('about.valLove')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <Users className="w-5 h-5" />
                </div>
                <span className="font-bold text-primary">{t('about.valCommunity')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="font-bold text-primary">{t('about.valTruth')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="font-bold text-primary">{t('about.valService')}</span>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-square bg-gradient-to-tr from-slate-50 to-amber-50/40 rounded-[3rem] p-10 flex flex-col justify-between border border-slate-100 shadow-md">
              <div className="space-y-4">
                <span className="bg-secondary/20 text-slate-900 font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-bold inline-block">Huelva Church</span>
                <h4 className="text-3xl font-kenao text-primary leading-tight">{t('about.valCommunity')}</h4>
                <p className="text-primary/75 text-sm leading-relaxed">{t('about.desc')}</p>
              </div>
              <div className="pt-6 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-wider">
                <span>Viviendo en comunidad</span>
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                <span>Huelva, España</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Células CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 md:p-16 text-center max-w-4xl mx-auto mt-16"
        >
          <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center text-secondary mx-auto mb-6">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-4xl font-kenao text-primary mb-4">{t('about.cellsCtaTitle')}</h2>
          <p className="text-lg text-primary/70 mb-8 max-w-2xl mx-auto font-gordita">
            {t('about.cellsCtaDesc')}
          </p>
          <Link 
            to="/celulas"
            className="inline-flex items-center gap-2 bg-primary text-white font-bold py-4 px-8 rounded-xl hover:bg-secondary hover:text-primary transition-colors text-lg"
          >
            {t('common.learnMore')}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
