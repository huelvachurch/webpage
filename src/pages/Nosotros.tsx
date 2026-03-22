import React from 'react';
import { motion } from 'motion/react';
import { Heart, Users, BookOpen, MapPin } from 'lucide-react';

export default function Nosotros() {
  return (
    <div className="pt-32 pb-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-secondary tracking-wider uppercase text-sm font-bold mb-4">Nuestra Historia</h2>
          <h1 className="text-5xl md:text-6xl font-kenao text-primary mb-6">Conócenos mejor</h1>
          <p className="text-primary/70 text-xl max-w-3xl mx-auto leading-relaxed">
            Somos una familia espiritual en Huelva, comprometida con vivir y compartir el mensaje transformador de Jesús.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-3xl font-kenao text-primary mb-6">Nuestra Visión</h3>
            <p className="text-primary/80 text-lg mb-6 leading-relaxed">
              Nuestra visión es ser una iglesia relevante en la ciudad de Huelva, donde cada persona pueda encontrar un lugar para creer en Dios, pertenecer a una familia y servir a los demás con sus talentos.
            </p>
            <p className="text-primary/80 text-lg mb-8 leading-relaxed">
              Creemos que la iglesia no es un edificio, sino las personas. Por eso, nos esforzamos por crear un ambiente donde el amor de Dios sea tangible y donde todos se sientan bienvenidos, sin importar su trasfondo.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <Heart className="w-5 h-5" />
                </div>
                <span className="font-bold text-primary">Amor</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <Users className="w-5 h-5" />
                </div>
                <span className="font-bold text-primary">Comunidad</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="font-bold text-primary">Verdad</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="font-bold text-primary">Servicio</span>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=1000" 
                alt="Comunidad" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-8 -left-8 bg-primary p-8 rounded-3xl shadow-xl hidden md:block border-t-4 border-secondary">
              <p className="text-white font-kenao text-2xl">"Somos uno en Cristo"</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
