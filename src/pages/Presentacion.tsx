import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Layout, Globe, Users, Bell, Mail, Radio, Home as HomeIcon, CheckCircle2, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const contentData = {
  es: [
    {
      title: 'Nuestra Identidad Visual',
      description: 'Hemos incorporado la misma identidad visual, estética y colores de nuestra iglesia para transmitir coherencia, modernidad y familiaridad en cada rincón de esta plataforma.',
      bullets: [
        'Fuentes premium (Kenao, Gordita) que mantienen nuestra identidad.',
        'Elementos visuales cálidos, con un diseño limpio y enfocado.',
        'Alineación total con lo que comunicamos los domingos.'
      ]
    },
    {
      title: 'Iglesia sin Fronteras: Multilenguaje',
      description: 'Pensando en la alta influencia y cercanía con nuestros hermanos portugueses, y los muchos estudiantes de Inglaterra y Estados Unidos, toda la plataforma habla su idioma.',
      bullets: [
        'Soporte completo en Español, Inglés y Portugués.',
        'Menos barreras idiomáticas, mayor alcance y comunión.',
        'Transición fácil y en tiempo real.'
      ]
    },
    {
      title: 'Plataforma para dinámica celular',
      description: 'Hemos diseñado un espacio personalizado para cada persona dentro de nuestra forma de vivir la iglesia: La Iglesia en Células.',
      bullets: [
        'Mi Célula: Descarga de estudios, anotaciones y envío de peticiones de oración y notificaciones.',
        'Liderazgo: Portal especializado para administrar la célula, asistencias y seguimiento.',
        'Supervisión: Herramientas dedicadas para el cuidado y acompañamiento de los líderes.'
      ]
    },
    {
      title: 'Tablero de Anuncios y Cursos',
      description: 'Más allá de las células, es una plataforma integral para capacitar a la iglesia y mantenerla siempre informada.',
      bullets: [
        'Tablero centralizado de anuncios y noticias de Huelva Church.',
        'Plataforma integrada de cursos (Escuela de Líderes, Bautismo, etc.).',
        'Dar de forma fácil, segura y transparente a los ministerios.'
      ]
    },
    {
      title: 'Suscríbete y no te pierdas nada',
      description: 'Hemos añadido un sistema donde cada miembro puede suscribirse a nuestro boletín. Así aseguramos que la iglesia está informada a lo largo de la semana.',
      bullets: [
        'Boletines informativos directos a su correo.',
        'Control de suscripción desde su propio perfil.',
        'Comunicación constante, masiva o segmentada.'
      ]
    },
    {
      title: 'Conexión a un clic',
      description: 'Todo el ecosistema de Huelva Church conectado. Las celebraciones, la radio y eventos especiales, a un clic de distancia.',
      bullets: [
        'Celebraciones en vivo accesibles desde la plataforma.',
        'Radio Online y música que edifica todo el día.',
        'Noches de Oración, reuniones de jóvenes y acceso directo a redes sociales.'
      ]
    }
  ],
  en: [
    {
      title: 'Our Visual Identity',
      description: 'We have incorporated the same visual identity, aesthetics, and colors of our church to convey coherence, modernity, and familiarity in every corner of this platform.',
      bullets: [
        'Premium fonts (Kenao, Gordita) that keep our identity.',
        'Warm visual elements with a clean and focused design.',
        'Total alignment with what we communicate on Sundays.'
      ]
    },
    {
      title: 'Church Without Borders: Multilanguage',
      description: 'Thinking of our high influence and closeness with our Portuguese brothers, and the many students from England and the United States, the entire platform speaks your language.',
      bullets: [
        'Full support in Spanish, English, and Portuguese.',
        'Fewer language barriers, greater reach and communion.',
        'Easy transition in real-time.'
      ]
    },
    {
      title: 'Platform for our cell dynamic',
      description: 'We have designed a personalized space for each person within our way of living the church: The Cell Church.',
      bullets: [
        'My Cell: Members can download studies, take notes, send prayer requests, and receive notifications.',
        'Leadership: A specialized portal to manage the cell, attendance, and follow-up.',
        'Supervision: Dedicated tools for the care and support of leaders.'
      ]
    },
    {
      title: 'Notice Board and Courses',
      description: 'Beyond cells, it is a comprehensive platform to train the church and keep it always informed.',
      bullets: [
        'Centralized notice board and news from Huelva Church.',
        'Integrated course platform (School of Leaders, Baptism, etc.).',
        'Give easily, safely, and transparently to ministries.'
      ]
    },
    {
      title: 'Subscribe and miss nothing',
      description: 'We have added a system where each member can subscribe to our newsletter. This ensures the church is informed throughout the week.',
      bullets: [
        'Direct newsletters straight to your email.',
        'Subscription control from your own profile.',
        'Constant, massive or segmented communication.'
      ]
    },
    {
      title: 'One Click Connection',
      description: 'The entire Huelva Church ecosystem connected. Celebrations in live, radio, and special events, just a click away.',
      bullets: [
        'Live celebrations accessible from the platform.',
        'Online Radio and uplifting music all day.',
        'Prayer Nights, youth meetings, and direct access to social networks.'
      ]
    }
  ],
  pt: [
    {
      title: 'Nossa Identidade Visual',
      description: 'Incorporamos a mesma identidade visual, estética e cores de nossa igreja para transmitir coerência, modernidade e familiaridade em cada canto desta plataforma.',
      bullets: [
        'Fontes premium (Kenao, Gordita) que mantêm nossa identidade.',
        'Elementos visuais aconchegantes com um design limpo e focado.',
        'Alinhamento total com o que comunicamos aos domingos.'
      ]
    },
    {
      title: 'Igreja Sem Fronteiras: Multilíngue',
      description: 'Pensando na alta influência e proximidade com nossos irmãos portugueses, e nos muitos estudantes da Inglaterra e dos Estados Unidos, toda a plataforma fala o seu idioma.',
      bullets: [
        'Suporte completo em Espanhol, Inglês e Português.',
        'Menos barreiras linguísticas, maior alcance e comunhão.',
        'Transição fácil e em tempo real.'
      ]
    },
    {
      title: 'Plataforma para dinâmica celular',
      description: 'Projetamos um espaço personalizado para cada pessoa dentro do nosso modo de viver a igreja: A Igreja em Células.',
      bullets: [
        'Minha Célula: O membro pode baixar estudos, fazer anotações, pedir orações e receber notificações.',
        'Liderança: Um portal especializado para administrar a célula, frequências e acompanhamento.',
        'Supervisão: Ferramentas dedicadas para o cuidado e acompanhamento de líderes.'
      ]
    },
    {
      title: 'Quadro de Avisos e Cursos',
      description: 'Além das células, é uma plataforma integral para capacitar a igreja e mantê-la sempre informada.',
      bullets: [
        'Quadro centralizado de avisos e notícias da Huelva Church.',
        'Plataforma integrada de cursos (Escola de Líderes, Batismo, etc.).',
        'Contribuir de forma simples, segura e transparente aos ministérios.'
      ]
    },
    {
      title: 'Inscreva-se e não perca nada',
      description: 'Adicionamos um sistema onde cada membro pode se inscrever em nosso boletim. Isso garante que a igreja esteja informada durante toda a semana.',
      bullets: [
        'Boletins informativos diretos no seu e-mail.',
        'Controle flexível de assinatura no seu perfil.',
        'Comunicação constante, massiva ou segmentada.'
      ]
    },
    {
      title: 'Conexão a um clique',
      description: 'Todo o ecossistema da Huelva Church conectado. Cultos ao vivo, rádio e eventos especiais, a um clique de distância.',
      bullets: [
        'Celebrações ao vivo acessíveis pela plataforma.',
        'Rádio Online e músicas edificantes durante todo o dia.',
        'Noites de Oração, encontros de jovens e acesso direto às redes sociais.'
      ]
    }
  ]
};

const iconMapping = [
  <Layout className="w-12 h-12 md:w-16 md:h-16 text-secondary mb-4 md:mb-6" />,
  <Globe className="w-12 h-12 md:w-16 md:h-16 text-secondary mb-4 md:mb-6" />,
  <Users className="w-12 h-12 md:w-16 md:h-16 text-secondary mb-4 md:mb-6" />,
  <Bell className="w-12 h-12 md:w-16 md:h-16 text-secondary mb-4 md:mb-6" />,
  <Mail className="w-12 h-12 md:w-16 md:h-16 text-secondary mb-4 md:mb-6" />,
  <Radio className="w-12 h-12 md:w-16 md:h-16 text-secondary mb-4 md:mb-6" />,
];

const colorMapping = [
  'bg-primary text-white',
  'bg-slate-50 text-primary',
  'bg-primary text-white',
  'bg-slate-50 text-primary',
  'bg-primary text-white',
  'bg-slate-50 text-primary',
];

export default function Presentacion() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const lang = (i18n.language || 'es').startsWith('en') ? 'en' : (i18n.language || 'es').startsWith('pt') ? 'pt' : 'es';
  const displayData = contentData[lang] || contentData.es;

  const slides = displayData.map((data, index) => ({
    id: index + 1,
    ...data,
    icon: iconMapping[index],
    color: colorMapping[index]
  }));

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const isLast = currentSlide === slides.length - 1;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center overflow-hidden print:hidden">
        {/* Controls Overlay */}
        <div className="absolute top-4 right-4 md:top-8 md:right-8 flex gap-4 z-50">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all font-bold text-sm backdrop-blur-md"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full hover:bg-red-500 hover:text-white transition-all font-bold text-sm backdrop-blur-md"
          >
            x
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className={`w-full max-w-5xl h-[90vh] md:h-[80vh] mx-4 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row ${slides[currentSlide].color}`}
          >
            {/* Visual Side */}
            <div className="w-full md:w-5/12 p-6 md:p-14 flex flex-col items-start justify-center bg-black/10 border-b md:border-b-0 md:border-r border-white/10 shrink-0 h-[40%] md:h-full">
              {slides[currentSlide].icon}
              <h2 className="text-3xl md:text-5xl font-kenao leading-tight mb-2 md:mb-4">
                {slides[currentSlide].title}
              </h2>
              <div className="w-16 md:w-20 h-1 bg-secondary rounded-full mt-2 hidden md:block"></div>
              
              <div className="mt-auto pt-6 md:pt-10 flex gap-2 w-full justify-start">
                {slides.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-secondary' : 'w-2 bg-secondary/30'}`}
                  />
                ))}
              </div>
            </div>

            {/* Content Side */}
            <div className="w-full md:w-7/12 p-6 md:p-14 flex flex-col justify-center overflow-y-auto h-[60%] md:h-full">
              <p className="text-lg md:text-2xl leading-relaxed mb-6 font-light">
                {slides[currentSlide].description}
              </p>
              
              <ul className="space-y-3 md:space-y-4">
                {slides[currentSlide].bullets.map((bullet, idx) => (
                  <motion.li 
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + (idx * 0.1) }}
                    className="flex items-start gap-3 md:gap-4 text-base md:text-lg"
                  >
                    <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 shrink-0 text-secondary mt-0.5 md:mt-1" />
                    <span className="opacity-90">{bullet}</span>
                  </motion.li>
                ))}
              </ul>

              {isLast && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: 1 }}
                  className="mt-8 md:mt-12"
                >
                  <button
                    onClick={() => navigate('/')}
                    className="flex items-center justify-center w-full md:w-auto gap-2 px-8 py-4 bg-secondary text-primary font-bold rounded-full hover:scale-105 transition-transform"
                  >
                    <HomeIcon className="w-5 h-5" />
                    Ir al Inicio
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="absolute bottom-4 md:bottom-8 left-0 right-0 flex justify-center gap-4 md:gap-6 pointer-events-none">
          <button 
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="pointer-events-auto p-3 md:p-4 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-all backdrop-blur-md"
          >
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
          </button>
          <button 
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="pointer-events-auto p-3 md:p-4 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-all backdrop-blur-md"
          >
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
          </button>
        </div>
      </div>

      {/* Print View */}
      <div className="hidden print:block w-full bg-white text-black p-8 font-gordita">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-kenao font-bold text-primary mb-2">Huelva Church</h1>
          <p className="text-xl text-slate-600">Presentación de Plataforma</p>
        </div>
        
        {slides.map((slide, index) => (
          <div key={slide.id} className="mb-16 break-inside-avoid shadow-sm border border-slate-200 rounded-3xl overflow-hidden print:shadow-none print:border-none print:mb-20">
            <div className={`p-8 ${slide.color} print:bg-white print:text-black`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="print:text-black">
                  {slide.icon}
                </div>
                <h2 className="text-3xl font-kenao leading-tight">
                  {index + 1}. {slide.title}
                </h2>
              </div>
            </div>
            <div className="p-8 print:p-0 print:pt-4">
              <p className="text-xl leading-relaxed mb-6 font-light">
                {slide.description}
              </p>
              <ul className="space-y-4">
                {slide.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-4 text-lg">
                    <CheckCircle2 className="w-6 h-6 shrink-0 text-black mt-1 print:text-black" />
                    <span className="opacity-90">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

