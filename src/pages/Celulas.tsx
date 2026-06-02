import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Users, Heart, BookOpen, Music, Target, FileText, Map, Smile } from 'lucide-react';
import { Celula } from './admin/AdminCelulas';
import { useTranslation } from 'react-i18next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function Celulas() {
  const { t } = useTranslation();

  const steps = [
    {
      id: 'comunion',
      title: t('cells.cellFeatures.commTitle'),
      icon: <Users className="w-6 h-6" />,
      heading: t('cells.cellFeatures.commTitle'),
      description: t('cells.cellFeatures.commDesc'),
      image: '/images/Celula%20Comunion.jpg'
    },
    {
      id: 'rompehielo',
      title: t('cells.cellFeatures.icebreakerTitle'),
      icon: <Smile className="w-6 h-6" />,
      heading: t('cells.cellFeatures.icebreakerTitle'),
      description: t('cells.cellFeatures.icebreakerDesc'),
      image: '/images/Celula%20Rompehielo.jpg'
    },
    {
      id: 'alabanza',
      title: t('cells.cellFeatures.worshipTitle'),
      icon: <Music className="w-6 h-6" />,
      heading: t('cells.cellFeatures.worshipTitle'),
      description: t('cells.cellFeatures.worshipDesc'),
      image: '/images/Celula%20Alabanza.jpg'
    },
    {
      id: 'estudio',
      title: t('cells.cellFeatures.studyTitle'),
      icon: <BookOpen className="w-6 h-6" />,
      heading: t('cells.cellFeatures.studyTitle'),
      description: t('cells.cellFeatures.studyDesc'),
      image: '/images/Celula%20Estudio.jpg'
    },
    {
      id: 'oracion',
      title: t('cells.cellFeatures.prayerTitle'),
      icon: <Heart className="w-6 h-6" />,
      heading: t('cells.cellFeatures.prayerTitle'),
      description: t('cells.cellFeatures.prayerDesc'),
      image: '/images/Celula%20Oracion.jpg'
    },
    {
      id: 'desafio',
      title: t('cells.cellFeatures.challengeTitle'),
      icon: <Target className="w-6 h-6" />,
      heading: t('cells.cellFeatures.challengeTitle'),
      description: t('cells.cellFeatures.challengeDesc'),
      image: '/images/Celula%20Desafio.jpg'
    }
  ];

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
    setActiveStep(steps[0]);
  }, [t]);

  useEffect(() => {
    const fetchCelulas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'celulas'));
        const list: Celula[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Celula);
        });
        if (list.length > 0) {
          setCelulas(list);
        } else {
          // Default fallback data if empty in DB
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
      } catch (err) {
        console.error("Error loading celulas from Firestore:", err);
      }
    };
    fetchCelulas();
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
        <h1 className="text-5xl md:text-7xl font-kenao text-primary mb-8">{t('about.visionTitle')}</h1>
        <h2 className="text-2xl md:text-3xl text-primary mb-8 font-medium">{t('about.visionQuote')}</h2>
        <p className="text-lg md:text-xl text-primary/70 italic max-w-3xl mx-auto leading-relaxed">
          {t('about.visionVerse')}
          <br/><span className="font-bold block mt-4 not-italic">{t('about.visionVerseRef')}</span>
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
        <h2 className="text-4xl md:text-5xl font-kenao text-primary mb-8">{t('cells.whatIsCellTitle')}</h2>
        <div className="w-16 h-1 bg-secondary mx-auto mb-10"></div>
        <div className="space-y-6 text-lg md:text-xl text-primary/80 leading-relaxed font-gordita">
          <p>
            {t('cells.desc')}
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
          <p className="text-lg md:text-xl text-primary/70 italic max-w-3xl mx-auto leading-relaxed">
            {t('cells.actsVerse')}
            <br/><span className="font-bold block mt-4 not-italic">{t('cells.actsVerseRef')}</span>
          </p>
        </div>
      </div>

      {/* What happens in a cell */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-32">
        <h2 className="text-4xl md:text-5xl font-kenao text-primary mb-8 text-center">{t('cells.whatHappensTitle')}</h2>
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
              className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center"
            >
              <div className="md:col-span-5 w-full aspect-[3/4] bg-slate-200 lg:aspect-[2/3] rounded-2xl overflow-hidden grayscale hover:grayscale-0 transition-all duration-700 shadow-sm shrink-0">
                <img src={activeStep.image} alt={activeStep.title} className="w-full h-full object-cover" />
              </div>
              <div className="md:col-span-7 text-center md:text-left">
                <h3 className="text-3xl md:text-4xl font-kenao text-primary mb-4">{activeStep.heading}</h3>
                <p className="text-lg md:text-xl text-primary/80 leading-relaxed font-gordita">
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
            <h2 className="text-4xl md:text-5xl font-kenao text-primary mb-8 relative z-10 pt-4 md:pt-12">{t('cells.locationsTitle')}</h2>
            <div className="w-16 h-1 bg-secondary mx-auto mb-10 relative z-10"></div>
          </div>

          {celulas.length === 0 ? (
            <p className="text-center text-primary/60 text-lg">{t('cells.noLocations')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {celulas.map((celula) => (
                <div key={celula.id} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-200 flex flex-col items-center text-center group">
                  <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center text-secondary mb-4 group-hover:bg-secondary group-hover:text-primary transition-colors">
                    <MapPin className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-2">{celula.name}</h3>
                  <div className="space-y-1 mb-6 text-primary/70">
                    <p className="font-semibold text-primary">{t('cells.leader')}: {celula.leader}</p>
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
                      {t('cells.viewMaps')}
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
            <h2 className="text-4xl md:text-5xl font-kenao mb-6">{t('cells.joinTitle')}</h2>
            <div className="w-16 h-1 bg-secondary mx-auto mb-8"></div>
            <p className="text-lg text-white/80">
              {t('cells.joinDesc')}
            </p>
          </div>

          <div className="bg-white text-primary p-8 md:p-12 rounded-[2rem] shadow-xl">
            {submitted ? (
              <div className="bg-green-50 text-green-800 p-8 rounded-2xl text-center">
                <p className="font-bold text-xl mb-2">{t('cells.formGenerated')}</p>
                <p>{t('cells.formGeneratedDesc')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">{t('cells.formName')}</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-secondary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">{t('cells.formSurname')}</label>
                  <input 
                    type="text" 
                    value={formData.apellidos}
                    onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-secondary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">{t('cells.formWhatsapp')}</label>
                  <input 
                    type="tel" 
                    required 
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-secondary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">{t('cells.formEmail')}</label>
                  <input 
                    type="email" 
                    required 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-secondary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">{t('cells.formZone')}</label>
                  <select 
                    value={formData.zona}
                    onChange={(e) => setFormData({...formData, zona: e.target.value})}
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-secondary outline-none transition-all appearance-none"
                  >
                    <option value="">{t('cells.formSelectZone')}</option>
                    {celulas.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    <option value={t('cells.formOtherZone')} >{t('cells.formOtherZone')}</option>
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
                    {t('cells.formAccept')} <a href="#" className="underline">{t('common.readMore')}</a>
                  </label>
                </div>
                <button 
                  type="submit" 
                  disabled={!formData.acepta}
                  className="w-full bg-slate-500 hover:bg-slate-600 active:bg-slate-700 text-white font-bold py-5 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {t('cells.formSend')}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
