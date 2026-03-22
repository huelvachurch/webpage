import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  Users, 
  BookOpen, 
  Heart, 
  ChevronRight,
  Calendar,
  Youtube,
  Radio,
  Instagram,
  Coffee,
  Library,
  Coins,
  MessageCircle,
  ExternalLink,
  Play,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  publishedAt: any;
}

export default function Home() {
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'posts'), 
      where('featured', '==', true),
      orderBy('publishedAt', 'desc'),
      limit(3)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setFeaturedPosts(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-gordita text-primary">
      {/* Welcome / About */}
      <section id="nosotros" className="py-24 bg-white pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-secondary tracking-wider uppercase text-sm mb-3">Bienvenidos a casa</h2>
              <h3 className="text-4xl md:text-5xl font-kenao text-primary mb-6 leading-tight">
                Un lugar para creer, pertenecer y servir.
              </h3>
              <p className="text-primary/80 text-lg mb-6 leading-relaxed">
                Somos una iglesia cristiana evangélica apasionada por Dios y por las personas de Huelva. Creemos en un mensaje de esperanza, gracia y transformación a través de Jesucristo.
              </p>
              <p className="text-primary/80 text-lg mb-8 leading-relaxed">
                Nuestra congregación se caracteriza por ser alegre, acogedora y muy activa. No importa en qué etapa de la vida te encuentres o cuál sea tu trasfondo, aquí encontrarás una familia espiritual dispuesta a caminar contigo.
              </p>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-kenao text-xl text-primary">Amor en acción</h4>
                  <p className="text-primary/60 text-sm">Buscamos bendecir a nuestra ciudad.</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=1000" 
                  alt="Congregación adorando" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-xl shadow-xl max-w-xs hidden md:block border-t-4 border-secondary">
                <p className="font-kenao text-2xl text-primary mb-2">"¡Mirad cuán bueno y cuán delicioso es habitar los hermanos juntos en armonía!"</p>
                <p className="text-secondary text-sm font-medium uppercase tracking-wider">Salmo 133:1</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Celebraciones - First Visit */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-8 md:mb-0 md:mr-8">
              <h3 className="text-3xl font-kenao mb-2">¿Nos visitas por primera vez?</h3>
              <p className="text-white/80 text-lg">Te esperamos este domingo. Ven tal como eres.</p>
            </div>
            <div className="flex items-center space-x-4 bg-white/10 p-6 rounded-2xl backdrop-blur-sm border border-white/10">
              <Calendar className="w-10 h-10 text-secondary" />
              <div>
                <p className="text-sm text-secondary uppercase tracking-wider font-medium">Reunión Principal</p>
                <p className="text-2xl font-kenao">Domingos a las 18:30h</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Muro de Actividades */}
      <section id="actividades" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-secondary tracking-wider uppercase text-sm mb-3">Muro de Actividades</h2>
              <h3 className="text-4xl font-kenao text-primary">Últimas noticias</h3>
            </div>
            <Link to="/actividades" className="hidden md:flex items-center text-secondary hover:text-primary transition-colors font-medium">
              Ver todas las actividades <ChevronRight className="w-5 h-5 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredPosts.map((post, index) => (
              <motion.div 
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group border border-slate-100 flex flex-col h-full"
              >
                <div className="h-56 overflow-hidden relative bg-slate-100">
                  {post.imageUrl ? (
                    <img 
                      src={post.imageUrl} 
                      alt={post.title} 
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/10">
                      <Calendar className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-secondary text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {post.category}
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <div className="text-sm text-primary/50 mb-3 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {post.publishedAt?.toDate ? post.publishedAt.toDate().toLocaleDateString() : 'Reciente'}
                  </div>
                  <h4 className="text-xl font-kenao text-primary mb-3 group-hover:text-secondary transition-colors">{post.title}</h4>
                  <p className="text-primary/70 leading-relaxed mb-6 flex-grow">
                    {post.excerpt}
                  </p>
                  <Link to={`/actividades/${post.id}`} className="flex items-center text-primary font-semibold hover:text-secondary transition-colors group/btn">
                    Leer más <ArrowRight className="w-4 h-4 ml-2 transform group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-12 text-center md:hidden">
            <Link to="/actividades" className="inline-flex items-center text-secondary font-medium">
              Ver todas las actividades <ChevronRight className="w-5 h-5 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* YouTube Streams Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <Youtube className="w-6 h-6" />
                </div>
                <h2 className="text-secondary tracking-wider uppercase text-sm font-medium">Celebraciones en Directo</h2>
              </div>
              <h3 className="text-4xl font-kenao text-primary mb-6">Sigue nuestras reuniones desde donde estés</h3>
              <p className="text-primary/80 text-lg mb-8 leading-relaxed">
                ¿No puedes venir este domingo? No te preocupes. Retransmitimos todas nuestras celebraciones principales en directo a través de nuestro canal de YouTube. Únete a nosotros en tiempo real o disfruta de las reuniones grabadas.
              </p>
              <div className="flex flex-wrap gap-4">
                <a 
                  href="https://www.youtube.com/@huelvachurch/streams" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-red-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg shadow-red-600/20"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Ver en Directo
                </a>
                <a 
                  href="https://www.youtube.com/@huelvachurch" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white text-primary border-2 border-slate-100 px-8 py-4 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                >
                  Suscribirse al canal
                </a>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-2xl relative group cursor-pointer">
                <img 
                  src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=1000" 
                  alt="YouTube Stream Preview" 
                  className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10">
                    <p className="text-white font-medium">Última retransmisión</p>
                    <p className="text-white/70 text-sm">Culto Dominical - "Viviendo con Propósito"</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Células Section */}
      <section id="celulas" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-primary rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 opacity-10">
              <img 
                src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=1000" 
                alt="Background pattern" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 p-12 lg:p-20 items-center">
              <div>
                <h2 className="text-secondary tracking-wider uppercase text-sm font-bold mb-4">Grupos Pequeños</h2>
                <h3 className="text-4xl md:text-5xl font-kenao text-white mb-6">Células: La iglesia en las casas</h3>
                <p className="text-white/80 text-lg mb-8 leading-relaxed">
                  Creemos que el crecimiento espiritual ocurre mejor en comunidad. Nuestras células son grupos pequeños que se reúnen en hogares por toda la ciudad para compartir la vida, estudiar la Biblia y apoyarse mutuamente.
                </p>
                <a 
                  href="https://www.huelvachurch.es/celulas" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-secondary text-primary px-8 py-4 rounded-xl font-bold hover:bg-[#c2a30b] transition-all transform hover:-translate-y-1 shadow-lg shadow-secondary/20"
                >
                  Encuentra tu célula <ChevronRight className="w-5 h-5 ml-2" />
                </a>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                    <Users className="w-8 h-8 text-secondary mb-4" />
                    <h4 className="text-white font-kenao text-xl mb-1">Comunidad</h4>
                    <p className="text-white/60 text-sm">Relaciones auténticas y cercanas.</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                    <BookOpen className="w-8 h-8 text-secondary mb-4" />
                    <h4 className="text-white font-kenao text-xl mb-1">Crecimiento</h4>
                    <p className="text-white/60 text-sm">Estudio práctico de la Biblia.</p>
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                    <Heart className="w-8 h-8 text-secondary mb-4" />
                    <h4 className="text-white font-kenao text-xl mb-1">Cuidado</h4>
                    <p className="text-white/60 text-sm">Apoyo mutuo en cada etapa.</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                    <MapPin className="w-8 h-8 text-secondary mb-4" />
                    <h4 className="text-white font-kenao text-xl mb-1">Cerca de ti</h4>
                    <p className="text-white/60 text-sm">En diferentes barrios de Huelva.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Radio & App Section */}
      <section id="radio" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <div className="relative mx-auto max-w-[300px]">
                <div className="absolute -inset-4 bg-secondary/20 rounded-[3rem] blur-2xl"></div>
                <div className="relative bg-primary rounded-[2.5rem] p-4 shadow-2xl border-8 border-slate-800">
                  <div className="aspect-[9/19] rounded-[1.5rem] overflow-hidden bg-slate-900 relative">
                    <img 
                      src="https://images.unsplash.com/photo-1614102073832-030967418971?auto=format&fit=crop&q=80&w=600" 
                      alt="Radio App" 
                      className="w-full h-full object-cover opacity-80"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent"></div>
                    <div className="absolute bottom-8 left-0 right-0 text-center px-6">
                      <Radio className="w-12 h-12 text-secondary mx-auto mb-4 animate-pulse" />
                      <p className="text-white font-kenao text-2xl mb-2">Radio Huelva Church</p>
                      <p className="text-white/60 text-sm">Sintoniza la esperanza 24/7</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <h2 className="text-secondary tracking-wider uppercase text-sm font-bold mb-4">Nuestra Emisora</h2>
              <h3 className="text-4xl font-kenao text-primary mb-6">Radio Huelva Church: Sintoniza la Esperanza</h3>
              <p className="text-primary/80 text-lg mb-8 leading-relaxed">
                Acompañamos tu día con la mejor música cristiana, reflexiones y programas que edifican tu vida. Escúchanos online o descarga nuestra aplicación oficial para Android y llévanos siempre contigo.
              </p>
              <div className="space-y-6">
                <a 
                  href="https://www.radiohuelvachurch.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 group"
                >
                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                    <Radio className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-primary">Escuchar Online</h4>
                    <p className="text-primary/60 text-sm">radiohuelvachurch.com</p>
                  </div>
                  <ExternalLink className="w-5 h-5 ml-auto text-slate-300" />
                </a>
                <a 
                  href="https://play.google.com/store/apps/details?id=net.radiobroadcastapp.radiohuelvachurch&pcampaignid=web_share" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 group"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                    <Play className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-primary">Descargar App Android</h4>
                    <p className="text-primary/60 text-sm">Disponible en Google Play</p>
                  </div>
                  <ExternalLink className="w-5 h-5 ml-auto text-slate-300" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Instagram Section */}
      <section id="instagram" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.a 
            href="https://www.instagram.com/huelvachurch/"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative block h-[400px] rounded-[3rem] overflow-hidden group shadow-2xl"
          >
            <img 
              src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&q=80&w=1600" 
              alt="Instagram" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600/90 via-pink-600/40 to-transparent"></div>
            <div className="absolute inset-0 flex items-center px-12 lg:px-20">
              <div className="text-white max-w-lg">
                <Instagram className="w-16 h-16 mb-6" />
                <h3 className="text-4xl md:text-5xl font-kenao mb-4">Síguenos en Instagram</h3>
                <p className="text-xl text-white/90 mb-8">Mantente al día con nuestras fotos, historias y momentos diarios de nuestra comunidad.</p>
                <span className="inline-flex items-center gap-2 bg-white text-pink-600 px-8 py-4 rounded-xl font-bold hover:bg-pink-50 transition-colors shadow-lg">
                  Unirse a la comunidad <ExternalLink className="w-5 h-5" />
                </span>
              </div>
            </div>
          </motion.a>
        </div>
      </section>

      {/* Cafetería Section */}
      <section id="cafeteria" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-8">
                <Coffee className="w-8 h-8" />
              </div>
              <h2 className="text-secondary tracking-wider uppercase text-sm font-bold mb-4">Nuestras Instalaciones</h2>
              <h3 className="text-4xl md:text-5xl font-kenao text-primary mb-6">Cafetería: Un lugar para compartir</h3>
              <p className="text-primary/80 text-lg mb-8 leading-relaxed">
                Nuestra cafetería está abierta todos los domingos durante nuestras celebraciones. Es el espacio perfecto para conectar con otros, compartir un café y disfrutar de un tiempo de comunión antes o después del culto.
              </p>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 inline-flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-primary/50 uppercase tracking-wider font-bold">Horario de apertura</p>
                  <p className="text-xl font-kenao text-primary">Domingos 18:00h - 20:30h</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=1000" 
                  alt="Cafetería" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-secondary p-8 rounded-3xl shadow-xl hidden md:block">
                <p className="text-primary font-kenao text-2xl">¡Te invitamos a un café!</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Librería Section */}
      <section id="libreria" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <div className="aspect-[4/3] rounded-[3rem] overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=1000" 
                  alt="Librería" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-8">
                <Library className="w-8 h-8" />
              </div>
              <h2 className="text-secondary tracking-wider uppercase text-sm font-bold mb-4">Recursos Espirituales</h2>
              <h3 className="text-4xl md:text-5xl font-kenao text-primary mb-6">Librería: Alimenta tu fe</h3>
              <p className="text-primary/80 text-lg mb-8 leading-relaxed">
                En nuestra librería encontrarás una cuidada selección de materiales cristianos, Biblias de diferentes versiones y libros que te ayudarán a profundizar en tu relación con Dios y en tu crecimiento espiritual.
              </p>
              <ul className="space-y-4 mb-8">
                {['Biblias y comentarios', 'Literatura cristiana', 'Material para niños', 'Regalos y detalles'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-primary/80">
                    <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-secondary font-bold text-lg">Visita nuestro stand en el hall principal.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Colaboración Section */}
      <section id="dar" className="py-24 bg-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-[3rem] p-12 lg:p-20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-slate-800"></div>
            <div className="absolute top-0 right-0 w-1/2 h-full bg-secondary/10 skew-x-12 transform translate-x-1/4"></div>
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-2/3">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-secondary text-sm font-bold mb-6">
                  <Coins className="w-4 h-4" />
                  <span>Generosidad</span>
                </div>
                <h3 className="text-4xl md:text-5xl font-kenao text-white mb-6">Colabora con la obra de Dios</h3>
                <p className="text-white/70 text-lg mb-8 leading-relaxed max-w-2xl">
                  Tu generosidad nos permite seguir llevando el evangelio a Huelva, mantener nuestras instalaciones y ayudar a los más necesitados. Cada contribución, por pequeña que sea, marca la diferencia.
                </p>
                <Link 
                  to="/dar" 
                  className="inline-flex items-center bg-white text-primary px-10 py-5 rounded-2xl font-bold hover:bg-secondary transition-all transform hover:-translate-y-1 shadow-xl"
                >
                  Quiero Colaborar <Heart className="w-5 h-5 ml-2 text-red-500" />
                </Link>
              </div>
              <div className="lg:w-1/3 text-center">
                <div className="inline-block p-8 bg-white/5 backdrop-blur-xl rounded-full border border-white/10">
                  <div className="w-32 h-32 bg-secondary rounded-full flex items-center justify-center text-primary shadow-2xl">
                    <Coins className="w-16 h-16" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Section */}
      <section id="whatsapp" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.a 
            href="https://chat.whatsapp.com/KYIoRdfL0lI5TlKKW5o8nN"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative block h-[400px] rounded-[3rem] overflow-hidden group shadow-2xl"
          >
            <img 
              src="https://images.unsplash.com/photo-1614680376593-902f74cc0d41?auto=format&fit=crop&q=80&w=1600" 
              alt="WhatsApp" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/90 via-green-600/40 to-transparent"></div>
            <div className="absolute inset-0 flex items-center px-12 lg:px-20">
              <div className="text-white max-w-lg">
                <MessageCircle className="w-16 h-16 mb-6" />
                <h3 className="text-4xl md:text-5xl font-kenao mb-4">Canal de Noticias WhatsApp</h3>
                <p className="text-xl text-white/90 mb-8">Únete a nuestro grupo oficial para recibir anuncios importantes, devocionales y noticias de nuestra iglesia directamente en tu móvil.</p>
                <span className="inline-flex items-center gap-2 bg-white text-green-600 px-8 py-4 rounded-xl font-bold hover:bg-green-50 transition-colors shadow-lg">
                  Unirse al grupo <ExternalLink className="w-5 h-5" />
                </span>
              </div>
            </div>
          </motion.a>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contacto" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-secondary tracking-wider uppercase text-sm mb-3">Contacto</h2>
              <h3 className="text-4xl font-kenao text-primary mb-6">Estamos aquí para ti</h3>
              <p className="text-primary/80 text-lg mb-8">
                Si tienes alguna pregunta, necesitas oración o simplemente quieres saber más sobre nuestra iglesia, no dudes en contactarnos.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center mt-1">
                    <MapPin className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-primary">Nuestra Dirección</h4>
                    <p className="text-primary/70">Calle De Los Marismeños, 6, Huelva<br/>(arriba del Supermercado El Jamón)</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center mt-1">
                    <Phone className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-primary">Teléfono</h4>
                    <p className="text-primary/70">+34 959 00 00 00</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center mt-1">
                    <Mail className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-primary">Email</h4>
                    <p className="text-primary/70">info@huelvachurch.com</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-2xl shadow-sm border border-slate-100">
              <h4 className="text-2xl font-kenao text-primary mb-6">Envíanos un mensaje</h4>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-primary/80 mb-1">Nombre</label>
                  <input type="text" id="name" className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all" placeholder="Tu nombre" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-primary/80 mb-1">Email</label>
                  <input type="email" id="email" className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all" placeholder="tu@email.com" />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-primary/80 mb-1">Mensaje</label>
                  <textarea id="message" rows={4} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all" placeholder="¿En qué podemos ayudarte?"></textarea>
                </div>
                <button type="submit" className="w-full bg-secondary text-primary font-semibold py-3 px-4 rounded-lg hover:bg-[#c2a30b] transition-colors">
                  Enviar Mensaje
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
