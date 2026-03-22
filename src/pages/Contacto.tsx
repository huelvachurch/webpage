import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Phone, Mail, Clock, MessageCircle, Instagram, Facebook, Youtube } from 'lucide-react';

export default function Contacto() {
  return (
    <div className="pt-32 pb-24 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-secondary tracking-wider uppercase text-sm font-bold mb-4">Contacto</h2>
          <h1 className="text-5xl md:text-6xl font-kenao text-primary mb-6">Estamos aquí para ti</h1>
          <p className="text-primary/70 text-xl max-w-3xl mx-auto leading-relaxed">
            Si tienes alguna pregunta, necesitas oración o simplemente quieres saber más sobre nuestra iglesia, no dudes en contactarnos.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start mb-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mt-1">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-kenao text-primary mb-2">Dirección</h4>
                  <p className="text-primary/70 leading-relaxed">
                    Calle De Los Marismeños, 6, Huelva<br/>
                    (arriba del Supermercado El Jamón)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mt-1">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-kenao text-primary mb-2">Teléfono</h4>
                  <p className="text-primary/70 leading-relaxed">
                    +34 959 00 00 00<br/>
                    +34 600 00 00 00
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mt-1">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-kenao text-primary mb-2">Email</h4>
                  <p className="text-primary/70 leading-relaxed">
                    info@huelvachurch.com<br/>
                    contacto@huelvachurch.com
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mt-1">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-kenao text-primary mb-2">Horarios de Oficina</h4>
                  <p className="text-primary/70 leading-relaxed">
                    Lunes a Viernes<br/>
                    10:00h - 14:00h
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xl font-kenao text-primary mb-6">Nuestras Redes Sociales</h4>
              <div className="flex gap-4">
                <a href="https://www.instagram.com/huelvachurch/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary/40 hover:bg-secondary hover:text-primary transition-all shadow-sm">
                  <Instagram className="w-6 h-6" />
                </a>
                <a href="https://www.facebook.com/huelvachurch" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary/40 hover:bg-secondary hover:text-primary transition-all shadow-sm">
                  <Facebook className="w-6 h-6" />
                </a>
                <a href="https://www.youtube.com/@huelvachurch" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary/40 hover:bg-secondary hover:text-primary transition-all shadow-sm">
                  <Youtube className="w-6 h-6" />
                </a>
                <a href="https://chat.whatsapp.com/KYIoRdfL0lI5TlKKW5o8nN" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary/40 hover:bg-secondary hover:text-primary transition-all shadow-sm">
                  <MessageCircle className="w-6 h-6" />
                </a>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-slate-50 p-12 rounded-[3rem] border border-slate-100 shadow-sm"
          >
            <h4 className="text-3xl font-kenao text-primary mb-8">Envíanos un mensaje</h4>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-primary/80 mb-2">Nombre</label>
                  <input type="text" id="name" className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all bg-white" placeholder="Tu nombre" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-primary/80 mb-2">Email</label>
                  <input type="email" id="email" className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all bg-white" placeholder="tu@email.com" />
                </div>
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-bold text-primary/80 mb-2">Asunto</label>
                <select id="subject" className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all bg-white appearance-none">
                  <option>Información General</option>
                  <option>Petición de Oración</option>
                  <option>Obra Social</option>
                  <option>Células</option>
                  <option>Otro</option>
                </select>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-bold text-primary/80 mb-2">Mensaje</label>
                <textarea id="message" rows={5} className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all bg-white" placeholder="¿En qué podemos ayudarte?"></textarea>
              </div>
              <button type="submit" className="w-full bg-primary text-white font-bold py-5 px-8 rounded-2xl hover:bg-secondary hover:text-primary transition-all transform hover:-translate-y-1 shadow-lg">
                Enviar Mensaje
              </button>
            </form>
          </motion.div>
        </div>

        {/* Map Placeholder */}
        <div className="aspect-[21/9] rounded-[3rem] overflow-hidden shadow-2xl bg-slate-200 relative">
          <div className="absolute inset-0 flex items-center justify-center text-primary/20 font-kenao text-3xl">
            Mapa de Ubicación
          </div>
          {/* Real map would go here */}
        </div>
      </div>
    </div>
  );
}
