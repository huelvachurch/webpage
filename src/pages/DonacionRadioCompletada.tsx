import React from 'react';
import { motion } from 'motion/react';
import { Radio, Heart, Sparkles, CheckCircle2, Home, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function DonacionRadioCompletada() {
  const { t } = useTranslation();

  return (
    <div className="pt-32 pb-24 bg-gradient-to-b from-slate-50 via-emerald-50/20 to-slate-100 min-h-screen font-gordita flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full mx-auto">
        
        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white rounded-[2.5rem] p-8 sm:p-12 border border-[#2D4B73]/10 shadow-xl text-center relative overflow-hidden"
        >
          {/* Decorative glowing background elements */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#2D4B73]/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Icon Badge with celebratory ring */}
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
            className="w-22 h-22 bg-emerald-50 border-2 border-emerald-200 text-emerald-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-lg relative"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-600 stroke-[1.8]" />
            <Sparkles className="w-6 h-6 text-amber-500 absolute -top-2 -right-2 animate-bounce" />
          </motion.div>

          {/* Heading */}
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Radio className="w-3.5 h-3.5 text-emerald-600" /> {t('donations.radioBadge')}
          </span>
          <h1 className="text-3xl sm:text-4xl font-gordita font-bold text-[#2D4B73] mb-4">
            {t('donations.radioCompleteTitle')}
          </h1>

          {/* Requested Custom Message */}
          <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-2xl p-6 sm:p-8 mb-8 text-left shadow-sm">
            <p className="text-[#2D4B73]/90 text-base sm:text-lg leading-relaxed font-medium">
              {t('donations.radioCompleteMessage')}
            </p>
          </div>

          {/* Biblical Verse */}
          <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-6 mb-8 text-center relative">
            <BookOpen className="w-5 h-5 text-amber-600 mx-auto mb-2 opacity-80" />
            <p className="italic text-[#2D4B73]/80 text-sm sm:text-base font-serif leading-relaxed">
              "Dad, y se os dará; medida buena, apretada, remecida y rebosando darán en vuestro regazo. Porque con la misma medida con que medís, os volverán a medir."
            </p>
            <p className="text-xs uppercase tracking-widest font-bold text-amber-700 mt-3 font-mono">
              Lucas 6:38
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/radio"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#2D4B73] hover:bg-[#1f3552] text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg transition-all text-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>{t('donations.listenRadioLive')}</span>
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
