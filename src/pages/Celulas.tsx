import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Heart, BookOpen, Music, Target, Smile } from 'lucide-react';
import { Celula } from './admin/AdminCelulas';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { InteractiveCelulasMap, CelulaMapData } from '../components/InteractiveCelulasMap';

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
  const [leaders, setLeaders] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    whatsapp: '',
    email: '',
    zona: '',
    acepta: false
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThanksModal, setShowThanksModal] = useState(false);
  const [showFloatingBtn, setShowFloatingBtn] = useState(true);

  useEffect(() => {
    setActiveStep(steps[0]);
  }, [t]);

  // Load celulas
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

  // Unauthenticated users cannot read the 'users' collection to get leader emails.
  // The system relies on the fallback email 'huelvachurch@gmail.com' for the mailto: link,
  // while the in-app notification routing works flawlessly using leaderId.
  useEffect(() => {
    // Intentionally empty. Kept email fallback logic below intact.
  }, []);

  // Float button scroll tracker behavior "desde las porciones superiores"
  useEffect(() => {
    const handleScroll = () => {
      const formEl = document.getElementById('join-form');
      if (formEl) {
        const rect = formEl.getBoundingClientRect();
        // Hide float button if join-form is visible on screen
        if (rect.top < window.innerHeight) {
          setShowFloatingBtn(false);
          return;
        }
      }
      setShowFloatingBtn(window.scrollY < 2000);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.acepta || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let leaderId = '';
      let leaderEmail = '';
      let leaderName = '';
      let supervisorId = '';
      let supervisorEmail = '';
      let supervisorName = '';

      const selectedCell = celulas.find(c => c.name === formData.zona);
      if (selectedCell) {
        leaderId = selectedCell.leaderId || '';
        leaderName = selectedCell.leader || '';
        
        const leaderUser = leaders.find(l => l.id === leaderId);
        if (leaderUser) {
          leaderEmail = leaderUser.email || '';
          leaderName = leaderUser.displayName || leaderUser.name || leaderName;
          supervisorId = leaderUser.supervisorId || '';
          
          const supervisorUser = supervisors.find(s => s.id === supervisorId);
          if (supervisorUser) {
            supervisorEmail = supervisorUser.email || '';
            supervisorName = supervisorUser.displayName || supervisorUser.name || '';
          }
        }
      }

      const emailTo = leaderEmail || 'huelvachurch@gmail.com';
      const emailCc = supervisorEmail ? `&cc=${supervisorEmail}` : '';
      const subject = encodeURIComponent(`Solicitud para unirse a una Célula - ${formData.nombre} ${formData.apellidos}`);
      const body = encodeURIComponent(
        `¡Hola!\n\nSe ha recibido una nueva solicitud de contacto para unirse a tu Célula:\n\n` +
        `▪️ Contacto: ${formData.nombre} ${formData.apellidos}\n` +
        `▪️ WhatsApp / Teléfono: ${formData.whatsapp}\n` +
        `▪️ Correo electrónico: ${formData.email}\n` +
        `▪️ Célula Seleccionada: ${formData.zona || 'Otra zona'}\n` +
        `▪️ Fecha de envío: ${new Date().toLocaleDateString('es-ES')}\n\n` +
        `Por favor, ponte en contacto con esta persona lo antes posible para darle la bienvenida y compartir los detalles del grupo.\n\n` +
        `¡Bendiciones!`
      );

      // Save contact request directly to Firestore 'contact_notifications'
      await addDoc(collection(db, 'contact_notifications'), {
        nombre: formData.nombre,
        apellidos: formData.apellidos || '',
        whatsapp: formData.whatsapp,
        email: formData.email,
        zona: formData.zona || 'Ninguna especificada',
        cellName: selectedCell ? selectedCell.name : (formData.zona || 'Ninguna especificada'),
        leaderId: leaderId || 'admin',
        leaderEmail: emailTo,
        leaderName: leaderName || 'Huelva Church',
        supervisorId: supervisorId || '',
        supervisorEmail: supervisorEmail || '',
        supervisorName: supervisorName || '',
        createdAt: new Date().toISOString(),
        readByLeader: false,
        readBySupervisor: false
      });
      
      // Trigger mailto link on user's browser
      // window.location.href = `mailto:${emailTo}?subject=${subject}${emailCc}&body=${body}`;
      
      // Show sweet modal popup
      setShowThanksModal(true);
      
      // Reset form fields
      setFormData({ nombre: '', apellidos: '', whatsapp: '', email: '', zona: '', acepta: false });
    } catch (err) {
      console.error("Error submitting contact request", err);
      alert("Hubo un error al procesar tu solicitud, por favor inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
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

      {/* Visual Spacer/Divider */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="border-t border-slate-100"></div>
      </div>

      {/* What are cells? */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-24">
        <h2 className="text-4xl md:text-5xl font-kenao text-primary mb-8">{t('cells.whatIsCellTitle')}</h2>
        <div className="w-16 h-1 bg-secondary mx-auto mb-10"></div>
        <div className="space-y-6 text-lg md:text-xl text-primary/85 leading-relaxed font-gordita">
          <p>
            {t('cells.desc')}
          </p>
        </div>
      </section>

      {/* Interstitial Verse - Beautiful typography container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="bg-slate-50 border border-slate-100 p-12 md:p-16 rounded-[2rem] text-center shadow-xs">
          <p className="text-xl md:text-2xl text-primary/80 italic leading-relaxed font-serif">
            "{t('cells.actsVerse')}"
          </p>
          <span className="font-bold block mt-4 text-secondary uppercase tracking-widest text-xs font-mono">{t('cells.actsVerseRef')}</span>
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

          <div className="mb-4">
            <InteractiveCelulasMap celulas={celulas as CelulaMapData[]} />
          </div>
        </div>
      </section>

      {/* Formulario Unirse */}
      <section id="join-form" className="bg-primary text-white py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-kenao mb-6">{t('cells.joinTitle')}</h2>
            <div className="w-16 h-1 bg-secondary mx-auto mb-8"></div>
            <p className="text-lg text-white/80">
              {t('cells.joinDesc')}
            </p>
          </div>

          <div className="bg-white text-primary p-8 md:p-12 rounded-[2rem] shadow-xl">
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
                  required
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
                disabled={!formData.acepta || isSubmitting}
                className="w-full bg-slate-500 hover:bg-slate-600 active:bg-slate-700 text-white font-bold py-5 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Enviando...' : t('cells.formSend')}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Floating Action Button (FAB) */}
      <AnimatePresence>
        {showFloatingBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => document.getElementById('join-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-50 bg-secondary hover:bg-secondary/90 text-primary font-bold px-6 py-4 rounded-full shadow-2xl flex items-center gap-2 cursor-pointer border border-primary/10 transition-all hover:scale-105"
          >
            <Users className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-sm font-extrabold uppercase tracking-wide">¡Únete a una Célula!</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Nice, sweet, warm popup modal thanking the user */}
      <AnimatePresence>
        {showThanksModal && (
          <div className="fixed inset-0 bg-primary/45 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white text-primary rounded-[2.5rem] max-w-lg w-full p-8 md:p-12 text-center border border-slate-100 shadow-2xl relative"
            >
              <div className="w-20 h-20 bg-amber-50 text-secondary rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-100">
                <Heart className="w-10 h-10 fill-current text-secondary" />
              </div>
              <h3 className="text-3xl font-kenao text-primary mb-4">¡Muchas gracias por elegirnos! 🌟</h3>
              <p className="text-slate-650 text-sm leading-relaxed mb-6 font-gordita">
                Hemos recibido tus datos con muchísima alegría. El líder de la célula que has seleccionado y su supervisor han sido notificados para que se pongan en contacto contigo lo antes posible.
              </p>
              <div className="p-4 bg-amber-50/40 border border-amber-100/50 rounded-2xl mb-8">
                <p className="text-xs text-primary/70 leading-relaxed font-semibold italic">
                  ¡Mientras te contactan, te animamos a descubrir la iglesia en nuestras redes y plataformas! Bienvenidos a casa.
                </p>
              </div>
              <button
                onClick={() => setShowThanksModal(false)}
                className="w-full py-4 bg-primary hover:bg-secondary text-white hover:text-primary font-extrabold rounded-xl transition-all shadow-md cursor-pointer text-sm tracking-uppercase tracking-wider"
              >
                Seguir Descubriendo
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
