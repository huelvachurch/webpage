import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Users, BookOpen, MapPin, ArrowRight, HandHeart, Home } from 'lucide-react';
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

        <div className="max-w-4xl mx-auto mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-3xl font-kenao text-primary mb-6 text-center">{t('about.visionTitle')}</h3>
            <p className="text-primary/85 text-lg mb-6 leading-relaxed font-semibold italic text-secondary text-center">
              {t('about.visionQuote')}
            </p>
            <p className="text-primary/70 text-lg mb-10 leading-relaxed text-center">
              {t('about.visionDesc')}
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex flex-col items-center p-6 bg-slate-50 border border-slate-100/60 rounded-[1.5rem] gap-3 text-center">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <Heart className="w-6 h-6" />
                </div>
                <span className="font-bold text-primary">{t('about.valLove')}</span>
              </div>
              
              <div className="flex flex-col items-center p-6 bg-slate-50 border border-slate-100/60 rounded-[1.5rem] gap-3 text-center">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <Users className="w-6 h-6" />
                </div>
                <span className="font-bold text-primary">{t('about.valCommunity')}</span>
              </div>
              
              <div className="flex flex-col items-center p-6 bg-slate-50 border border-slate-100/60 rounded-[1.5rem] gap-3 text-center">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="font-bold text-primary">{t('about.valTruth')}</span>
              </div>
              
              <div className="flex flex-col items-center p-6 bg-slate-50 border border-slate-100/60 rounded-[1.5rem] gap-3 text-center">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <MapPin className="w-6 h-6" />
                </div>
                <span className="font-bold text-primary">{t('about.valService')}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Células & Obras Sociales CTA Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mt-16">
          
          {/* Células CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-slate-50 border border-slate-100/80 rounded-[2.5rem] p-8 md:p-10 text-center flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-secondary/20 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6">
                <Home className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-3xl font-kenao text-primary mb-3">{t('about.cellsCtaTitle')}</h2>
              <p className="text-base text-primary/75 mb-8 font-gordita leading-relaxed">
                {t('about.cellsCtaDesc')}
              </p>
            </div>
            <Link 
              to="/nosotros/celulas"
              className="inline-flex items-center justify-center gap-2 bg-primary text-white font-bold py-3.5 px-6 rounded-2xl hover:bg-secondary hover:text-primary transition-all text-sm hover:scale-[1.02]"
            >
              <span>{t('common.learnMore')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Obras Sociales CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="bg-secondary/10 border border-secondary/25 rounded-[2.5rem] p-8 md:p-10 text-center flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-secondary text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <HandHeart className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-3xl font-kenao text-primary mb-3">{t('obras.title', 'Obras Sociales')}</h2>
              <p className="text-base text-primary/80 mb-8 font-gordita leading-relaxed">
                {t('obras.promoShortDesc', 'Llevamos el evangelio, sanidad espiritual y esperanza a Huelva, cuidando a personas y familias e impulsando proyectos misioneros con la UEBE.')}
              </p>
            </div>
            <Link 
              to="/nosotros/obras"
              className="inline-flex items-center justify-center gap-2 bg-primary text-white font-bold py-3.5 px-6 rounded-2xl hover:bg-secondary hover:text-primary transition-all text-sm hover:scale-[1.02]"
            >
              <span>{t('obras.knowMore', 'Conocer Obras Sociales')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
