import React from 'react';
import { motion } from 'motion/react';
import { Heart, Coins, CreditCard, Landmark, ArrowRight } from 'lucide-react';

export default function Dar() {
  return (
    <div className="pt-32 pb-24 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-secondary tracking-wider uppercase text-sm font-bold mb-4">Generosidad</h2>
          <h1 className="text-5xl md:text-6xl font-kenao text-primary mb-6">Colabora con la obra</h1>
          <p className="text-primary/70 text-xl max-w-3xl mx-auto leading-relaxed">
            Tu generosidad nos permite seguir llevando el evangelio a Huelva, mantener nuestras instalaciones y ayudar a los más necesitados.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-3xl font-kenao text-primary mb-6">¿Por qué damos?</h3>
            <p className="text-primary/80 text-lg mb-6 leading-relaxed">
              Creemos que dar es un acto de adoración y gratitud a Dios por todo lo que Él nos ha dado. No se trata de una obligación, sino de un privilegio de participar en la extensión de Su Reino.
            </p>
            <p className="text-primary/80 text-lg mb-8 leading-relaxed">
              Gracias a tus diezmos y ofrendas, podemos sostener proyectos sociales, misiones, y el mantenimiento de nuestra casa espiritual para que siga siendo un lugar de refugio y esperanza para muchos.
            </p>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 italic text-primary/60">
              "Cada uno dé como propuso en su corazón: no con tristeza, ni por necesidad, porque Dios ama al dador alegre."
              <p className="mt-4 font-bold text-secondary not-italic uppercase tracking-wider text-sm">2 Corintios 9:7</p>
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
                <Landmark className="w-6 h-6 text-secondary" /> Transferencia Bancaria
              </h4>
              <div className="space-y-4">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider font-bold mb-1">Titular</p>
                  <p className="text-lg font-bold">Iglesia Cristiana Huelva Church</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider font-bold mb-1">IBAN</p>
                  <p className="text-xl font-mono tracking-widest">ES00 0000 0000 0000 0000 0000</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider font-bold mb-1">Concepto</p>
                  <p className="text-lg font-bold">Diezmo / Ofrenda / Obra Social</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6 group-hover:bg-secondary group-hover:text-primary transition-colors">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-kenao text-primary mb-2">Tarjeta</h4>
                <p className="text-primary/60 text-sm mb-6">Donación segura con tarjeta de crédito o débito.</p>
                <button className="flex items-center gap-2 text-primary font-bold hover:text-secondary transition-colors">
                  Donar ahora <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-6 group-hover:bg-secondary group-hover:text-primary transition-colors">
                  <Coins className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-kenao text-primary mb-2">Bizum</h4>
                <p className="text-primary/60 text-sm mb-6">Utiliza nuestro código de comercio para donar rápidamente.</p>
                <div className="text-primary font-bold text-lg">Código: 00000</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
