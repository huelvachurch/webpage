import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Users, BookOpen, MapPin, ArrowRight } from 'lucide-react';

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
            <p className="text-primary/80 text-lg mb-6 leading-relaxed font-semibold italic text-secondary">
              "Somos una iglesia en células que se multiplican cumpliendo el mandato de Jesús."
            </p>
            <p className="text-primary/80 text-lg mb-8 leading-relaxed">
              Creemos que cada hogar puede convertirse en un faro de esperanza en su barrio. A través de grupos pequeños o células, podemos vivir una fe cercana y dinámica, multiplicando el amor de Dios y haciendo discípulos tal como Jesús nos encomendó.
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
          </motion.div>
        </div>

        {/* Células CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 md:p-16 text-center max-w-4xl mx-auto mt-16"
        >
          <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center text-secondary mx-auto mb-6">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-4xl font-kenao text-primary mb-4">Descubre Nuestras Células</h2>
          <p className="text-lg text-primary/70 mb-8 max-w-2xl mx-auto font-gordita">
            Nuestros grupos pequeños son el corazón de la iglesia. Encuentra una célula cerca de ti, conoce gente nueva y crece en tu fe.
          </p>
          <Link 
            to="/celulas"
            className="inline-flex items-center gap-2 bg-primary text-white font-bold py-4 px-8 rounded-xl hover:bg-secondary hover:text-primary transition-colors text-lg"
          >
            Conocer más
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
