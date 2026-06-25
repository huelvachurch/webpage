import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Radio, 
  Calendar, 
  MessageSquare, 
  Music, 
  User, 
  Share2, 
  Sparkles,
  ExternalLink,
  Info
} from 'lucide-react';

export default function RadioPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'es';

  // Translate titles dynamically based on current language
  const translations = {
    es: {
      tag: "SINTONIZA LA ESPERANZA",
      title: "Radio Huelva Church",
      subtitle: "Acompañamos tu día con la mejor música cristiana, reflexiones y programas que edifican tu vida. Escúchanos las 24 horas, los 7 días de la semana.",
      onAirTitle: "Locutor al Aire",
      onAirDesc: "Conoce quién te está acompañando en este momento.",
      scheduleTitle: "Parrilla de Programación",
      scheduleDesc: "Nuestros horarios y programas semanales.",
      chatTitle: "Chat de la Comunidad",
      chatDesc: "Interactúa en tiempo real con otros oyentes de la radio.",
      requestSongTitle: "Pedido de Canciones",
      requestSongDesc: "Pide tu alabanza favorita y escúchala al aire.",
      sharedSuccess: "¡Enlace de la radio copiado al portapapeles!",
      officialPlayerTitle: "Reproductor en Vivo",
      officialPlayerDesc: "Disfruta de carátulas en tiempo real, programación en curso e interacción directa.",
      backHome: "Volver al Inicio"
    },
    en: {
      tag: "TUNE INTO HOPE",
      title: "Radio Huelva Church",
      subtitle: "We accompany your day with the best Christian music, reflections, and programs that build your life. Listen to us 24 hours a day, 7 days a week.",
      onAirTitle: "Broadcaster On-Air",
      onAirDesc: "See who is accompanying you in this moment.",
      scheduleTitle: "Weekly Program Schedule",
      scheduleDesc: "Our weekly programming and times.",
      chatTitle: "Community Chat",
      chatDesc: "Interact in real-time with other radio listeners.",
      requestSongTitle: "Song Requests",
      requestSongDesc: "Request your favorite worship song and hear it on-air.",
      sharedSuccess: "Radio link copied to clipboard!",
      officialPlayerTitle: "Live Player",
      officialPlayerDesc: "Enjoy real-time covers, current programming, and direct interaction.",
      backHome: "Back to Home"
    },
    pt: {
      tag: "SINTONIZE A ESPERANÇA",
      title: "Rádio Huelva Church",
      subtitle: "Acompanhamos o seu dia com a melhor música cristã, reflexões e programas que edificam a sua vida. Ouça-nos 24 horas por dia, 7 dias por semana.",
      onAirTitle: "Locutor no Ar",
      onAirDesc: "Veja quem está acompanhando você neste momento.",
      scheduleTitle: "Grade de Programação",
      scheduleDesc: "Nossos horários e programas semanales.",
      chatTitle: "Chat da Comunidade",
      chatDesc: "Interaja em tempo real com outros ouvintes da rádio.",
      requestSongTitle: "Pedido de Músicas",
      requestSongDesc: "Peça seu louvor favorito e ouça-o no ar.",
      sharedSuccess: "Link da rádio copiado para a área de transferência!",
      officialPlayerTitle: "Reprodutor ao Vivo",
      officialPlayerDesc: "Aproveite capas em tempo real, programação atual e interação direta.",
      backHome: "Voltar ao Início"
    }
  };

  const text = translations[currentLang as 'es' | 'en' | 'pt'] || translations.es;

  // Share link copy
  const [showShareToast, setShowShareToast] = useState(false);
  const handleShare = () => {
    navigator.clipboard.writeText("https://huelvachurch.com/radio");
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  return (
    <div className="pt-32 pb-24 bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen font-gordita">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header / Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-[#2D4B73]/10 text-[#2D4B73] font-mono text-[11px] uppercase tracking-widest px-4 py-1.5 rounded-full font-bold mb-4 shadow-sm">
            <Radio className="w-3.5 h-3.5 text-secondary animate-pulse" />
            <span>{text.tag}</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-gordita font-bold text-[#2D4B73] mb-6">{text.title}</h1>
          <p className="text-[#2D4B73]/70 text-lg max-w-3xl mx-auto leading-relaxed">
            {text.subtitle}
          </p>
        </motion.div>

        {/* ROW 1: Reproductor en Vivo + Locutor al Aire */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Column 1 & 2: Interactive Player Frame Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-white rounded-[2.5rem] p-6 sm:p-8 border border-[#2D4B73]/10 shadow-md flex flex-col justify-between"
          >
            <div className="mb-6 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-gordita font-bold text-2xl text-[#2D4B73] flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-secondary" />
                  {text.officialPlayerTitle}
                </h3>
                <p className="text-sm text-[#2D4B73]/60 mt-1">{text.officialPlayerDesc}</p>
              </div>
              <button 
                onClick={handleShare}
                className="p-3 rounded-full hover:bg-slate-100 text-[#2D4B73] transition-all cursor-pointer border border-[#2D4B73]/10"
                title="Compartir Emisora"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-slate-50 border border-[#2D4B73]/10 rounded-3xl p-4 flex items-center justify-center min-h-[180px]">
              <iframe 
                src="https://public-player-widget.webradiosite.com/?cover=1&current_track=1&schedules=1&link=1&popup=1&share=1&embed=0&auto_play=0&source=6409&theme=light&color=4&link_to=https%3A%2F%2Fwww.radiohuelvachurch.com%2F&identifier=Player%20del%20sitio%20web&info=https%3A%2F%2Fpublic-player-widget.webradiosite.com%2Fapp%2Fplayer%2Finfo%2F249803%3Fhash%3D797d68787c675c6f02f14fc40e66ee687b33ac02&locale=es-es" 
                scrolling="no" 
                allow="autoplay; clipboard-write" 
                className="w-full bg-transparent"
                style={{ backgroundColor: 'unset', border: 'none' }}
                height="165"
              />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap justify-between items-center text-xs text-[#2D4B73]/60 gap-3">
              <span className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-secondary" /> Por cortesía de BR Logic WebRadios
              </span>
              <a 
                href="https://www.radiohuelvachurch.com" 
                target="_blank" 
                rel="noreferrer" 
                className="font-bold text-[#2D4B73] hover:text-secondary flex items-center gap-1 hover:underline cursor-pointer"
              >
                Sitio oficial de la Radio <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>

          {/* Column 3: Broadcaster / On Air announcer */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1 bg-white rounded-[2.5rem] p-6 border border-[#2D4B73]/10 shadow-md flex flex-col justify-between"
          >
            <div className="mb-4">
              <div className="w-10 h-10 bg-[#2D4B73]/10 rounded-xl flex items-center justify-center text-[#2D4B73] mb-3">
                <User className="w-5 h-5" />
              </div>
              <h3 className="font-gordita font-bold text-lg text-[#2D4B73]">{text.onAirTitle}</h3>
              <p className="text-xs text-[#2D4B73]/60 mt-0.5">{text.onAirDesc}</p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden p-2 flex items-center justify-center min-h-[220px]">
              <iframe 
                src="https://public-web-widget.webradiosite.com/app/widget/broadcaster/249803?hash=ffab58c556be0247fad2aa7f317e9d6145504691&theme=light&color=4" 
                style={{ width: '100%', height: '200px', borderRadius: '15px', border: 'none' }} 
                allow="autoplay; clipboard-write" 
              />
            </div>
          </motion.div>

        </div>

        {/* ROW 2: Parrilla de Programación + Pedido de Canciones + Chat de la Comunidad */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Weekly Program Schedule */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-[2rem] p-6 border border-[#2D4B73]/10 shadow-md flex flex-col justify-between"
          >
            <div className="mb-4">
              <div className="w-10 h-10 bg-[#2D4B73]/10 rounded-xl flex items-center justify-center text-[#2D4B73] mb-3">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-gordita font-bold text-lg text-[#2D4B73]">{text.scheduleTitle}</h3>
              <p className="text-xs text-[#2D4B73]/60 mt-0.5">{text.scheduleDesc}</p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden p-2 flex items-center justify-center min-h-[350px]">
              <iframe 
                src="https://public-web-widget.webradiosite.com/app/widget/schedule/249803?hash=079667fc6ccf03c7d0f4893ecb89072258f311de&theme=light&color=4" 
                style={{ width: '100%', height: '330px', borderRadius: '15px', border: 'none' }} 
                allow="autoplay; clipboard-write" 
              />
            </div>
          </motion.div>

          {/* Column 2: Song Requests */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-[2rem] p-6 border border-[#2D4B73]/10 shadow-md flex flex-col justify-between"
          >
            <div className="mb-4">
              <div className="w-10 h-10 bg-[#2D4B73]/10 rounded-xl flex items-center justify-center text-[#2D4B73] mb-3">
                <Music className="w-5 h-5" />
              </div>
              <h3 className="font-gordita font-bold text-lg text-[#2D4B73]">{text.requestSongTitle}</h3>
              <p className="text-xs text-[#2D4B73]/60 mt-0.5">{text.requestSongDesc}</p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden p-2 flex items-center justify-center min-h-[350px]">
              <iframe 
                src="https://public-web-widget.webradiosite.com/app/widget/music-request/249803?hash=bb4af1cc635440cf5913bfd55066345e182c6973&theme=light&color=4&show_title=1&title=Solicita+tu+m%C3%BAsica" 
                style={{ width: '100%', height: '330px', borderRadius: '15px', border: 'none' }} 
                allow="autoplay; clipboard-write" 
              />
            </div>
          </motion.div>

          {/* Column 3: Live Community Chat */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-2 lg:col-span-1 bg-white rounded-[2rem] p-6 border border-[#2D4B73]/10 shadow-md flex flex-col justify-between"
          >
            <div className="mb-4">
              <div className="w-10 h-10 bg-[#2D4B73]/10 rounded-xl flex items-center justify-center text-[#2D4B73] mb-3">
                <MessageSquare className="w-5 h-5 animate-bounce" />
              </div>
              <h3 className="font-gordita font-bold text-lg text-[#2D4B73]">{text.chatTitle}</h3>
              <p className="text-xs text-[#2D4B73]/60 mt-0.5">{text.chatDesc}</p>
            </div>

            {/* Chat embed */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden p-2 flex items-center justify-center min-h-[350px]">
              <iframe 
                src="https://public-web-widget.webradiosite.com/app/widget/chat/249803?hash=3c877cdfadd586e25766fdcfa2aca26e0ebf13dd&theme=light&color=4&use_player=1" 
                style={{ width: '100%', height: '330px', borderRadius: '15px', border: 'none' }} 
                allow="autoplay; clipboard-write" 
              />
            </div>
          </motion.div>

        </div>

      </div>

      {/* Share Toast Notification */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.div
          animate={{ opacity: showShareToast ? 1 : 0, y: showShareToast ? 0 : 20 }}
          transition={{ duration: 0.3 }}
          className="bg-[#2D4B73] text-white font-gordita font-bold text-xs py-3 px-6 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-2 pointer-events-none"
        >
          <Sparkles className="w-4 h-4 text-secondary" />
          <span>{text.sharedSuccess}</span>
        </motion.div>
      </div>

    </div>
  );
}
