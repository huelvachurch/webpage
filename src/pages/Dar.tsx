import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Coins, CreditCard, Landmark, ArrowRight, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { useTranslation } from 'react-i18next';

const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export default function Dar() {
  const { t } = useTranslation();

  return (
    <div className="pt-32 pb-24 bg-white min-h-screen font-gordita">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Title */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-secondary tracking-wider uppercase text-sm font-bold mb-4">{t('give.tag')}</h2>
          <h1 className="text-5xl md:text-6xl font-kenao text-primary mb-6">{t('give.title')}</h1>
          <p className="text-primary/70 text-xl max-w-3xl mx-auto leading-relaxed">
            {t('give.desc')}
          </p>
        </motion.div>

        {/* ¿Por qué damos? Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto mb-20 text-center bg-slate-50/60 border border-slate-100 rounded-[2.5rem] p-8 sm:p-12 shadow-sm"
        >
          <h3 className="text-3xl sm:text-4xl font-kenao text-primary mb-6">{t('give.whyTitle')}</h3>
          <p className="text-primary/80 text-base sm:text-lg mb-4 leading-relaxed max-w-3xl mx-auto">
            {t('give.whyDesc1')}
          </p>
          <p className="text-primary/80 text-base sm:text-lg mb-8 leading-relaxed max-w-3xl mx-auto">
            {t('give.whyDesc2')}
          </p>
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 italic text-primary/80 max-w-2xl mx-auto shadow-sm">
            "{t('give.verse')}"
            <p className="mt-3 font-bold text-secondary not-italic uppercase tracking-wider text-xs font-mono">{t('give.verseRef')}</p>
          </div>
        </motion.div>

        {/* 2 Column Layout: Left (Transferencia Bancaria), Right (Diezmos/PayPal + Bizum) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Column 1: Transferencia Bancaria */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#2D4B73] p-8 sm:p-10 rounded-[2.5rem] text-white shadow-lg relative overflow-hidden flex flex-col justify-between h-full"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div>
              <div className="w-14 h-14 bg-white/10 text-amber-400 rounded-2xl flex items-center justify-center mb-6">
                <Landmark className="w-7 h-7" />
              </div>
              <div className="inline-block px-3.5 py-1 rounded-full bg-white/10 text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-3">
                {t('give.bankTransfer')}
              </div>
              <h4 className="text-3xl font-kenao mb-8">{t('give.bankTransfer')}</h4>
              
              <div className="space-y-6 text-sm">
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wider font-bold mb-1.5">{t('give.holder')}</p>
                  <p className="text-lg font-bold text-white">Iglesia Bautista de Huelva</p>
                </div>
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wider font-bold mb-1.5">IBAN</p>
                  <div className="bg-white/10 p-3.5 sm:p-5 rounded-2xl border border-white/15 shadow-inner">
                    <p className="text-[12px] min-[380px]:text-[13px] min-[440px]:text-sm sm:text-base md:text-lg lg:text-lg xl:text-2xl 2xl:text-3xl font-mono font-bold tracking-tight min-[380px]:tracking-normal sm:tracking-wider lg:tracking-tight xl:tracking-wider text-white select-all whitespace-nowrap overflow-x-auto">
                      ES48 0182 3273 6602 0157 7885
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wider font-bold mb-1.5">{t('give.concept')}</p>
                  <p className="text-lg font-bold text-amber-300">{t('give.conceptValues')}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 text-sm sm:text-base text-white/80 italic leading-relaxed">
              Puedes realizar una transferencia bancaria directa o programar un traspaso periódico en tu banca online.
            </div>
          </motion.div>

          {/* Column 2: Diezmos (PayPal) + Bizum Stacked */}
          <div className="flex flex-col gap-8 justify-between">
            
            {/* Top: Diezmos, Ofrendas y Misiones (Dar / PayPal) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/80 hover:shadow-md transition-all group flex flex-col justify-between flex-1"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-secondary/15 text-primary rounded-2xl flex items-center justify-center group-hover:bg-secondary transition-colors">
                    <Heart className="w-6 h-6 fill-current text-primary" />
                  </div>
                  <span className="px-3.5 py-1 rounded-full bg-secondary/20 text-primary text-[11px] font-bold uppercase tracking-wider">
                    {t('give.badgeShort', 'Dar')}
                  </span>
                </div>
                
                <h4 className="text-2xl font-kenao text-primary mb-3">{t('give.projectDarTitle')}</h4>
                <p className="text-primary/70 text-sm mb-3 leading-relaxed font-medium">
                  {t('give.projectDarDesc')}
                </p>
                <p className="text-xs text-primary/50 mb-6 italic">
                  {t('give.projectDarSub')}
                </p>
              </div>

              <a
                href="https://www.paypal.com/donate/?hosted_button_id=VLQYBZWTXGVFN"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-[#0070BA] hover:bg-[#005ea6] text-white p-4 rounded-2xl font-bold transition-all cursor-pointer shadow-md text-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <Heart className="w-4 h-4 text-secondary fill-secondary" />
                <span>{t('give.donatePayPal')}</span>
              </a>
            </motion.div>

            {/* Bottom: Donar con Bizum */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/80 hover:shadow-md transition-all group flex flex-col justify-between flex-1"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center group-hover:bg-secondary group-hover:text-primary transition-colors">
                    <Coins className="w-6 h-6" />
                  </div>
                  <span className="px-3.5 py-1 rounded-full bg-slate-100 text-primary/70 text-[11px] font-bold uppercase tracking-wider">
                    Bizum Directo
                  </span>
                </div>
                
                <h4 className="text-2xl font-kenao text-primary mb-3">{t('give.bizumTitle')}</h4>
                <p className="text-primary/70 text-sm mb-4 leading-relaxed font-medium">{t('give.bizumDesc')}</p>
              </div>

              <div className="text-primary font-bold text-lg bg-slate-50 p-4 sm:p-5 rounded-2xl border border-dashed border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary/60 font-medium uppercase tracking-wider">{t('give.code')}:</span>
                  <span className="text-secondary font-mono text-2xl font-bold tracking-wider">09377</span>
                </div>
                <div className="text-xs text-primary/50 font-normal mt-2 pt-2 border-t border-slate-200/60">{t('give.bizumOption')}</div>
              </div>
            </motion.div>

          </div>

        </div>

      </div>
    </div>
  );
}
