import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Users, Heart, BookOpen, Music, Target, FileText, Map } from 'lucide-react';
import { Celula } from './admin/AdminCelulas';

const steps = [
  {
    id: 'comunion',
    title: 'Comunión',
    icon: <Users className="w-6 h-6" />,
    heading: 'Comunión y Merienda',
    description: 'Un momento de relajación en el que nos ponemos al día, conocemos mejor a los visitantes y compartimos la merienda.',
    image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'rompehielos',
    title: 'Rompehielo',
    icon: <Heart className="w-6 h-6" />,
    heading: 'Rompehielos',
    description: 'Una dinámica rápida que ocurre antes de la Palabra para introducir el tema y dejar a todos más a gusto, más familiarizados con el tema.',
    image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'alabanza',
    title: 'Alabanza',
    icon: <Music className="w-6 h-6" />,
    heading: 'Alabanza',
    description: 'La música es un poderoso instrumento de adoración. Ella habla a los corazones de una manera especial y nos conecta con Dios, por eso es tan importante.',
    image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'estudio',
    title: 'Estudio',
    icon: <BookOpen className="w-6 h-6" />,
    heading: 'Estudio',
    description: 'El líder estará listo para abordar el tema de la semana y transmitir a los participantes una Palabra inspirada por Dios.',
    image: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'oracion',
    title: 'Oración',
    icon: <Heart className="w-6 h-6" />,
    heading: 'Oración',
    description: 'Por eso la célula es un lugar para orar a Dios, buscar intimidad con Él e interceder unos por otros.',
    image: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'desafio',
    title: 'Desafío',
    icon: <Target className="w-6 h-6" />,
    heading: 'Desafío',
    description: 'Al final de cada lección, se le inspirará para cumplir un desafío diseñado para motivarlo y acercarlo aún más a Dios.',
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=1200'
  }
];

export default function Celulas() {
  const [activeStep, setActiveStep] = useState(steps[0]);
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    whatsapp: '',
    email: '',
    zona: '',
    acepta: false
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('celulas-data');
    if (saved) {
      setCelulas(JSON.parse(saved));
    } else {
      setCelulas([
        {
          id: '1',
          name: 'Barriada Huerto Mena',
          leader: 'Fabio',
          schedule: 'Lunes, 19:30h',
          address: 'Barriada Huerto Mena, Huelva',
          googleMapsLink: 'https://maps.app.goo.gl/WPjd55a8XpctoAgS7'
        }
      ]);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.acepta) return;

    const subject = encodeURIComponent(`Solicitud para unirse a una Célula - ${formData.nombre} ${formData.apellidos}`);
    const body = encodeURIComponent(
      `Nombre: ${formData.nombre}\n` +
      `Apellidos: ${formData.apellidos}\n` +
      `WhatsApp: ${formData.whatsapp}\n` +
      `Email: ${formData.email}\n` +
      `Zona de Preferencia: ${formData.zona}\n`
    );
    
    window.location.href = `mailto:huelvachurch@gmail.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
    
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ nombre: '', apellidos: '', whatsapp: '', email: '', zona: '', acepta: false });
    }, 5000);
  };

  return (
    <div className="pt-32 pb-24 bg-white min-h-screen">
      {/* Hero / Vision */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-24">
        <h1 className="text-5xl md:text-7xl font-kenao text-primary mb-8">Nuestra Visión</h1>
        <h2 className="text-2xl md:text-3xl text-primary mb-8 font-medium">Ser una iglesia en células que<br/>cumple el mandato de Jesús</h2>
        <p className="text-lg md:text-xl text-primary/70 italic max-w-3xl mx-auto leading-relaxed">
          "Por tanto, vayan y hagan discípulos de todas las naciones, bautizándolos en el nombre del Padre y del Hijo y del Espíritu Santo, enseñándoles a obedecer todo lo que les he mandado a ustedes. Y les aseguro que estaré con ustedes siempre, hasta el fin del mundo."
          <br/><span className="font-bold block mt-4 not-italic">Mateo 28:19-20 (NVI)</span>
        </p>
      </section>

      {/* Image divider */}
      <div className="w-full h-[400px] md:h-[600px] mb-24 object-cover relative">
        <img 
          src="https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=2000" 
          alt="Grupo de personas reunidas" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-secondary/20 mix-blend-multiply"></div>
      </div>

      {/* What are cells? */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-24">
        <h2 className="text-4xl md:text-5xl font-kenao text-primary mb-8">¿Qué son las células?</h2>
        <div className="w-16 h-1 bg-secondary mx-auto mb-10"></div>
        <div className="space-y-6 text-lg md:text-xl text-primary/80 leading-relaxed font-gordita">
          <p>
            Las Células son lugares donde la gente se conecta para buscar a Dios, generar relaciones sanas y vivir la iglesia.
          </p>
          <p>
            Las células son la propia iglesia reunida en pequeños grupos en los hogares. Es allí donde estudiarás la Palabra, alabarás y adorarás a Dios, serás más edificado, orarás los unos por los otros, ejercerás tus dones y construirás lazos de amistad saludables.
          </p>
          <p>
            Todas las células tienen como objetivo la multiplicación. Anualmente, se generan cientos de nuevas Células y así otras personas tienen la oportunidad de conocer a Jesús a través de ellas y, con ello, iniciar una relación con Dios.
          </p>
        </div>
      </section>

      {/* Interstitial Verse */}
      <div className="w-full h-[400px] md:h-[500px] mb-24 relative flex items-center justify-center">
        <img 
          src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=2000" 
          alt="Biblia y amigos" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/40 backdrop-blur-[2px]"></div>
        <div className="relative z-10 bg-white/95 p-12 md:p-16 max-w-3xl mx-4 text-center">
          <p className="text-2xl md:text-3xl font-bold text-primary leading-relaxed mb-6 font-gordita">
            Todos los días, en el templo y de casa en casa, no dejaban de enseñar y proclamar que Jesús es el Cristo.
          </p>
          <p className="text-lg text-primary/60 font-medium">Hechos 5:42</p>
        </div>
      </div>

      {/* What happens in a cell */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-32">
        <h2 className="text-4xl md:text-5xl font-kenao text-primary mb-8 text-center">¿Qué sucede en una Célula?</h2>
        <div className="w-16 h-1 bg-secondary mx-auto mb-12"></div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-8">
          {steps.map(step => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step)}
              className={`py-4 px-2 md:px-6 text-center transition-all ${
                activeStep.id === step.id 
                  ? 'bg-secondary text-primary font-bold shadow-md' 
                  : 'bg-slate-50 text-primary/70 hover:bg-slate-100 font-medium border border-slate-100'
              }`}
            >
              {step.title}
            </button>
          ))}
        </div>

        <div className="bg-slate-50 p-6 md:p-12 rounded-[2rem] border border-slate-100 shadow-sm transition-all">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="aspect-[16/9] md:aspect-[21/9] w-full rounded-2xl overflow-hidden mb-8 grayscale hover:grayscale-0 transition-all duration-700">
                <img src={activeStep.image} alt={activeStep.title} className="w-full h-full object-cover" />
              </div>
              <div className="text-center max-w-3xl mx-auto">
                <h3 className="text-3xl md:text-4xl font-kenao text-primary mb-4">{activeStep.heading}</h3>
                <p className="text-lg md:text-2xl text-primary/80 leading-relaxed font-gordita">
                  {activeStep.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Ubicaciones */}
      <section className="bg-slate-100 py-24 mb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-kenao text-primary mb-8 relative z-10 pt-4 md:pt-12">Ubicaciones</h2>
            <div className="w-16 h-1 bg-secondary mx-auto mb-10 relative z-10"></div>
          </div>

          {celulas.length === 0 ? (
            <p className="text-center text-primary/60 text-lg">Actualmente no hay ubicaciones publicadas.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {celulas.map((celula) => (
                <div key={celula.id} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-200 flex flex-col items-center text-center group">
                  <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center text-secondary mb-4 group-hover:bg-secondary group-hover:text-primary transition-colors">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-2">{celula.name}</h3>
                  <div className="space-y-1 mb-6 text-primary/70">
                    <p className="font-semibold text-primary">Líder: {celula.leader}</p>
                    <p>{celula.schedule}</p>
                    <p className="text-sm">{celula.address}</p>
                  </div>
                  {celula.googleMapsLink && (
                    <a 
                      href={celula.googleMapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto px-6 py-3 w-full bg-slate-50 text-primary font-bold rounded-xl hover:bg-secondary transition-colors text-sm flex justify-center items-center gap-2"
                    >
                      <Map className="w-4 h-4" />
                      Ver en Google Maps
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Formulario Unirse */}
      <section className="bg-primary text-white py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-kenao mb-6">¡Únete a una Célula!</h2>
            <div className="w-16 h-1 bg-secondary mx-auto mb-8"></div>
            <p className="text-lg text-white/80">
              Rellena este formulario según tus datos de contacto y zona de residencia y nos contactaremos contigo para ofrecerte un grupo celular.
            </p>
          </div>

          <div className="bg-white text-primary p-8 md:p-12 rounded-[2rem] shadow-xl">
            {submitted ? (
              <div className="bg-green-50 text-green-800 p-8 rounded-2xl text-center">
                <p className="font-bold text-xl mb-2">¡Formulario Generado!</p>
                <p>Se está abriendo tu cliente de correo electrónico para enviar la solicitud.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">Nombre *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-secondary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">Apellidos</label>
                  <input 
                    type="text" 
                    value={formData.apellidos}
                    onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-secondary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">WhatsApp *</label>
                  <input 
                    type="tel" 
                    required 
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-secondary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">Correo Electrónico *</label>
                  <input 
                    type="email" 
                    required 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-secondary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">Zona de Preferencia</label>
                  <select 
                    value={formData.zona}
                    onChange={(e) => setFormData({...formData, zona: e.target.value})}
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-secondary outline-none transition-all appearance-none"
                  >
                    <option value="">Selecciona una zona...</option>
                    {celulas.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    <option value="Otra zona / Me da igual">Otra zona / Me da igual</option>
                  </select>
                </div>
                <div className="flex items-start gap-4 pt-4">
                  <div className="flex items-center h-5 mt-1">
                    <input 
                      type="checkbox" 
                      id="acepta" 
                      required
                      checked={formData.acepta}
                      onChange={(e) => setFormData({...formData, acepta: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-300 text-secondary focus:ring-secondary"
                    />
                  </div>
                  <label htmlFor="acepta" className="text-sm text-primary/70">
                    Acepto las Políticas de Privacidad <a href="#" className="underline">Ver</a>
                  </label>
                </div>
                <button 
                  type="submit" 
                  disabled={!formData.acepta}
                  className="w-full bg-slate-500 hover:bg-slate-600 active:bg-slate-700 text-white font-bold py-5 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  Enviar
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
