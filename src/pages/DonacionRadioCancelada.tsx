import React from 'react';
import { motion } from 'motion/react';
import { Radio, Heart, BookOpen, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function DonacionRadioCancelada() {
  const { t } = useTranslation();

  return (
    <div className="pt-32 pb-24 bg-gradient-to-b from-slate-50 via-secondary/10 to-slate-100 min-h-screen font-gordita flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full mx-auto">
        
        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white rounded-[2.5rem] p-8 sm:p-12 border border-[#2D4B73]/10 shadow-xl text-center relative overflow-hidden"
        >
          {/* Subtle decorative background circle */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-secondary/15 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[#2D4B73]/5 rounded-full blur-2xl pointer-events-none"></div>

          {/* Icon Badge */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-secondary/15 border border-secondary/30 text-secondary rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-inner"
          >
            <Heart className="w-10 h-10 text-secondary fill-secondary stroke-[1.75]" />
          </motion.div>

          {/* Heading */}
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-secondary/20 text-primary text-xs font-bold uppercase tracking-wider mb-3">
            <Radio className="w-3.5 h-3.5 text-secondary" /> {t('donations.radioBadge')}
          </span>
          <h1 className="text-3xl sm:text-4xl font-gordita font-bold text-[#2D4B73] mb-4">
            {t('donations.radioCancelTitle')}
          </h1>

          {/* Requested Custom Message */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-6 sm:p-8 mb-8 text-left shadow-sm">
            <p className="text-[#2D4B73]/90 text-base sm:text-lg leading-relaxed font-medium">
              {t('donations.radioCancelMessage')}
            </p>
          </div>

          {/* Biblical Verse */}
          <div className="bg-secondary/10 border border-secondary/20 rounded-2xl p-6 mb-8 text-center relative">
            <BookOpen className="w-5 h-5 text-secondary mx-auto mb-2 opacity-80" />
            <p className="italic text-[#2D4B73]/80 text-sm sm:text-base font-serif leading-relaxed">
              "{t('give.verse')}"
            </p>
            <p className="text-xs uppercase tracking-widest font-bold text-[#2D4B73] mt-3 font-mono">
              {t('give.verseRef')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/radio"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#2D4B73] hover:bg-[#1f3552] text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg transition-all text-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Radio className="w-4 h-4 text-secondary animate-pulse" />
              <span>{t('donations.listenRadio')}</span>
            </Link>

            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-[#2D4B73] font-bold py-3.5 px-6 rounded-2xl transition-all text-sm cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>{t('donations.backToHome')}</span>
            </Link>
          </div>

        </motion.div>

      </div>
    </div>
  );
}
