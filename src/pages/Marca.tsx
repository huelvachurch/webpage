import React from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Palette, Award, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Marca() {
  const manualUrl = "https://huelva-church-manual-de-marca-458081726794.us-west1.run.app";

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header section with consistent "font-kenao" and luxury padding */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <span className="text-secondary tracking-widest uppercase text-xs font-bold mb-3 block">Identidad Visual</span>
          <h1 className="text-5xl md:text-6xl font-kenao text-primary mb-6">Manual de Marca</h1>
          <p className="text-primary/70 text-lg max-w-3xl mx-auto leading-relaxed font-sans">
            Explora las directrices oficiales de diseño, colores, tipografía y elementos visuales de <strong>Huelva Church</strong>. Manteniendo la excelencia y consistencia en nuestra comunicación.
          </p>
        </motion.div>

        {/* Feature Highlights Bento Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xs flex flex-col items-center text-center group hover:shadow-md transition-all duration-300"
          >
            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-5 transition-transform group-hover:scale-110 duration-300">
              <Palette className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-primary mb-2">Paleta y Estilo</h3>
            <p className="text-primary/60 text-sm leading-relaxed">
              Descubre las fórmulas de colores primarios y secundarios, construyendo una atmósfera sofisticada y acogedora.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xs flex flex-col items-center text-center group hover:shadow-md transition-all duration-300"
          >
            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-5 transition-transform group-hover:scale-110 duration-300">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-primary mb-2">Tipografías Oficiales</h3>
            <p className="text-primary/60 text-sm leading-relaxed">
              Alineación clara con nuestra combinación tipográfica: la elegancia de "Kenao" combinada con la legibilidad moderna de "Inter".
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xs flex flex-col items-center text-center group hover:shadow-md transition-all duration-300"
          >
            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-5 transition-transform group-hover:scale-110 duration-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-primary mb-2">Uso Correcto</h3>
            <p className="text-primary/60 text-sm leading-relaxed">
              Pautas precisas para la colocación de logotipos, isotipos y márgenes de seguridad en todas nuestras plataformas.
            </p>
          </motion.div>
        </div>

        {/* Browser Mockup Wrapper for Interactive Brand Manual */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800"
        >
          {/* Top simulated browser bar */}
          <div className="px-6 py-4 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              {/* Window dots */}
              <div className="flex gap-1.5 shrink-0">
                <span className="w-3.5 h-3.5 rounded-full bg-red-500/80 block"></span>
                <span className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 block"></span>
                <span className="w-3.5 h-3.5 rounded-full bg-green-500/80 block"></span>
              </div>
              {/* Mock Address Bar */}
              <div className="bg-slate-900 px-4 py-1.5 rounded-xl text-slate-400 text-xs font-mono border border-slate-800 flex items-center gap-2 select-all sm:w-[320px] md:w-[420px] overflow-hidden whitespace-nowrap text-ellipsis">
                <span className="text-slate-600">https://</span>huelvachurch.com/marca
              </div>
            </div>

            {/* Actions for full tab opening */}
            <a 
              href={manualUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-secondary hover:bg-secondary/90 text-primary font-bold rounded-xl text-xs uppercase tracking-wider transition-colors duration-200 shadow-sm shrink-0"
            >
              <span>Abrir en otra pestaña</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Embedded Interactive Frame */}
          <div className="relative w-full aspect-video min-h-[500px] md:min-h-[750px] bg-slate-950">
            <iframe 
              src={manualUrl}
              title="Huelva Church Manual de Marca"
              className="absolute inset-0 w-full h-full border-none"
              referrerPolicy="no-referrer"
              allowFullScreen
            />
          </div>
        </motion.div>
        
        {/* Additional information or footer CTA */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12 bg-white p-8 rounded-3xl border border-slate-100 shadow-xs max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div className="text-left">
            <h4 className="text-lg font-bold text-primary mb-1">¿Necesitas materiales adicionales?</h4>
            <p className="text-sm text-primary/60">Si eres colaborador, comunicador o necesitas logotipos vectorizados (.svg / .ai), por favor contáctanos.</p>
          </div>
          <a
            href="/contacto"
            className="inline-flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-widest hover:text-primary transition-colors shrink-0 group"
          >
            <span>Preguntar al equipo</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
        </motion.div>
      </div>
    </div>
  );
}
