import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Users, Sparkles, Globe, ArrowRight, ShieldCheck, HandHeart, MessageSquare, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Obras() {
  const { t } = useTranslation();

  return (
    <div className="pt-32 pb-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 font-gordita">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-kenao text-primary mb-6">
            {t('obras.title', 'Obras Sociales')}
          </h1>
          <p className="text-primary/80 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            {t('obras.heroDesc', 'Nuestra principal obra social es dar a conocer a Jesús y, con ello, llevar sanidad espiritual y esperanza a la ciudad de Huelva.')}
          </p>
        </motion.div>

        {/* Vision Highlight Banner */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-primary text-white rounded-[2.5rem] p-8 md:p-12 mb-16 shadow-xl relative overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-2xl relative z-10">
            <span className="text-secondary uppercase text-xs tracking-widest font-bold mb-2 block font-mono">
              {t('obras.visionTag', 'NUESTRA VISIÓN')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-kenao text-white mb-4 italic leading-snug">
              "{t('obras.visionQuote', 'Somos una iglesia en células que se multiplican cumpliendo el mandato de Jesús.')}"
            </h2>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              {t('obras.visionDesc', 'A través de nuestra forma de hacer iglesia en células impartimos el evangelio, cuidamos a las personas y a las familias y servimos con amor a la comunidad.')}
            </p>
          </div>

          <Link
            to="/nosotros/celulas"
            className="relative z-10 shrink-0 inline-flex items-center gap-2 bg-secondary text-primary font-bold py-4 px-8 rounded-2xl hover:bg-white transition-all shadow-md text-sm hover:scale-105"
          >
            <Home className="w-5 h-5 text-primary" />
            <span>{t('obras.knowCells', 'Conocer las Células')}</span>
          </Link>
        </motion.div>

        {/* Main Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          
          {/* Pillar 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-secondary/20 rounded-2xl flex items-center justify-center text-primary mb-6">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-kenao text-primary mb-3">
                {t('obras.pillar1Title', 'Sanidad Espiritual y Esperanza')}
              </h3>
              <p className="text-primary/75 text-base leading-relaxed mb-6">
                {t('obras.pillar1Desc', 'Creemos que la transformación más profunda comienza en el corazón. Llevamos el mensaje vivo del Evangelio a Huelva para traer paz, restauración interior y una esperanza eterna a cada persona.')}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
              <ShieldCheck className="w-4 h-4 text-secondary" />
              <span>{t('obras.pillar1Tag', 'Transformación Personal')}</span>
            </div>
          </motion.div>

          {/* Pillar 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-secondary/20 rounded-2xl flex items-center justify-center text-primary mb-6">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-kenao text-primary mb-3">
                {t('obras.pillar2Title', 'Cuidado de Personas y Familias')}
              </h3>
              <p className="text-primary/75 text-base leading-relaxed mb-6">
                {t('obras.pillar2Desc', 'Nuestras células abren sus puertas en hogares de la ciudad para escuchar, acompañar y contener a familias y personas en momentos difíciles, fortaleciendo los vínculos y el amor en comunidad.')}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
              <Heart className="w-4 h-4 text-secondary fill-secondary" />
              <span>{t('obras.pillar2Tag', 'Red Familiar y Pastoral')}</span>
            </div>
          </motion.div>

          {/* Pillar 3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-secondary/20 rounded-2xl flex items-center justify-center text-primary mb-6">
                <HandHeart className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-kenao text-primary mb-3">
                {t('obras.pillar3Title', 'Servicio Práctico a la Comunidad')}
              </h3>
              <p className="text-primary/75 text-base leading-relaxed mb-6">
                {t('obras.pillar3Desc', 'No nos limitamos a palabras; servimos activamente en las necesidades reales de los vecinos de Huelva, fomentando la solidaridad, el acompañamiento humano y la ayuda mutua.')}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
              <HandHeart className="w-4 h-4 text-secondary" />
              <span>{t('obras.pillar3Tag', 'Servicio en la Ciudad')}</span>
            </div>
          </motion.div>

          {/* Pillar 4 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-secondary/20 rounded-2xl flex items-center justify-center text-primary mb-6">
                <Globe className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-kenao text-primary mb-3">
                {t('obras.pillar4Title', 'Proyectos Misioneros UEBE')}
              </h3>
              <p className="text-primary/75 text-base leading-relaxed mb-6">
                {t('obras.pillar4Desc', 'Formamos parte y apoyamos activamente las iniciativas de acción social, misericordia y misiones promovidas por la Unión Evangélica Bautista de España (UEBE), extendiendo nuestro alcance a nivel nacional e internacional.')}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
              <Globe className="w-4 h-4 text-secondary" />
              <span>{t('obras.pillar4Tag', 'Alcance Misionero')}</span>
            </div>
          </motion.div>

        </div>

        {/* CTA Bottom Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 md:p-12 text-center max-w-4xl mx-auto shadow-sm"
        >
          <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center text-primary mx-auto mb-6">
            <Heart className="w-8 h-8 fill-primary text-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-kenao text-primary mb-4">
            {t('obras.ctaTitle', '¿Quieres colaborar con nuestra labor social?')}
          </h2>
          <p className="text-primary/75 text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            {t('obras.ctaDesc', 'Tu colaboración y tus oraciones nos permiten sostener los proyectos de ayuda y seguir llevando sanidad, amor y el evangelio a familias de nuestra ciudad.')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/dar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/95 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-md text-sm hover:scale-[1.02]"
            >
              <HandHeart className="w-5 h-5 text-secondary" />
              <span>{t('obras.ctaDonateBtn', 'Colaborar')}</span>
            </Link>
            <Link 
              to="/contacto"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-primary font-bold py-4 px-8 rounded-2xl hover:bg-slate-50 transition-all text-sm"
            >
              <MessageSquare className="w-4 h-4 text-primary" />
              <span>{t('obras.ctaContactBtn', 'Contactar con nosotros')}</span>
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
