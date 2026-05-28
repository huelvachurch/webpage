import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Coins, CreditCard, Landmark, ArrowRight, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { useTranslation } from 'react-i18next';

const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export default function Dar() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useTranslation();

  const handleStripeCheckout = async () => {
    setIsProcessing(true);
    try {
      // Direct redirect to Stripe Donation Link
      window.open('https://donate.stripe.com/cN20043tF2Eb2nm8wx', '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      console.error("Error redirecting to Stripe:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="pt-32 pb-24 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-3xl font-kenao text-primary mb-6">{t('give.whyTitle')}</h3>
            <p className="text-primary/80 text-lg mb-6 leading-relaxed">
              {t('give.whyDesc1')}
            </p>
            <p className="text-primary/80 text-lg mb-8 leading-relaxed">
              {t('give.whyDesc2')}
            </p>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 italic text-primary/60">
              "{t('give.verse')}"
              <p className="mt-4 font-bold text-secondary not-italic uppercase tracking-wider text-sm">{t('give.verseRef')}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="bg-primary p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <h4 className="text-2xl font-kenao mb-6 flex items-center gap-3">
                <Landmark className="w-6 h-6 text-secondary" /> {t('give.bankTransfer')}
              </h4>
              <div className="space-y-4">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider font-bold mb-1">{t('give.holder')}</p>
                  <p className="text-lg font-bold">Iglesia Bautista de Huelva</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider font-bold mb-1">IBAN</p>
                  <p className="text-xl font-mono tracking-widest sm:text-2xl break-all">ES48 0182 3273 6602 0157 7885</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider font-bold mb-1">{t('give.concept')}</p>
                  <p className="text-lg font-bold">{t('give.conceptValues')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6 group-hover:bg-secondary group-hover:text-primary transition-colors">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-kenao text-primary mb-2">{t('give.card')}</h4>
                  <p className="text-primary/60 text-sm mb-8 leading-relaxed">
                    {t('give.cardDesc')}
                  </p>
                </div>

                <button 
                  onClick={handleStripeCheckout}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white p-4 rounded-xl font-bold hover:bg-secondary hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> {t('give.processing')}
                    </>
                  ) : (
                    <>
                      {t('give.donateNow')} <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6 group-hover:bg-secondary group-hover:text-primary transition-colors">
                  <Coins className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-kenao text-primary mb-2">Bizum</h4>
                <p className="text-primary/60 text-sm mb-6">{t('give.bizumDesc')}</p>
                <div className="text-primary font-bold text-lg bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
                  {t('give.code')}: <span className="text-secondary font-mono text-xl tracking-wider">09377</span>
                  <div className="text-xs text-primary/40 font-normal mt-1">{t('give.bizumOption')}</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
