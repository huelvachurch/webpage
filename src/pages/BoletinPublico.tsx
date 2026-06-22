import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { 
  collection, getDocs, query, orderBy, getDocFromServer, doc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { getOptimizedImageUrl } from '../utils/drive';
import { 
  BookOpen, Calendar, Clock, Share2, Printer, ArrowLeft, ExternalLink, 
  ChevronLeft, ChevronRight, Sparkles, Radio, Heart, Phone, MessageSquare, MessageCircle, Mail, MapPin, Check,
  Instagram, Facebook, Youtube, Coffee
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { useGlobalSettings } from '../utils/useSettings';

interface Post {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  imageUrl?: string;
  featured?: boolean;
  publishedAt?: any;
  content?: string;
}

interface NewsletterCampaign {
  id: string;
  type: 'semanal' | 'especial';
  subject: string;
  createdAt?: any;
  sentAt?: any;
  config: {
    greetingText?: string;
    sermonImageUrl?: string;
    sermonDescription?: string;
    isCenaBanner?: boolean;
    cenaDescription?: string;
    selectedPostIds?: string[];
    specialSubject?: string;
    specialContent?: string;
    specialButtonText?: string;
    specialButtonUrl?: string;
    coverImageUrl?: string;
  };
}

interface BoletinPublicoProps {
  forcedViewMode?: 'web' | 'revista';
}

export default function BoletinPublico({ forcedViewMode }: BoletinPublicoProps = {}) {
  const { date } = useParams<{ date: string }>();
  const [searchParams] = useSearchParams();
  const formatParam = searchParams.get('format');
  const { meetingTime } = useGlobalSettings();
  
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<NewsletterCampaign | null>(null);
  const [articles, setArticles] = useState<Post[]>([]);
  const [viewMode, setViewMode] = useState<'web' | 'revista'>(() => {
    if (forcedViewMode) return forcedViewMode;
    return formatParam === 'revista' ? 'revista' : 'web';
  });
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isInsideIframe, setIsInsideIframe] = useState(false);

  useEffect(() => {
    if (forcedViewMode) {
      setViewMode(forcedViewMode);
    } else if (formatParam === 'revista') {
      setViewMode('revista');
    } else if (formatParam === 'web') {
      setViewMode('web');
    }
  }, [formatParam, forcedViewMode]);
  
  // Interactive brochure/magazine page control state (1 to 4 pages)
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsInsideIframe(window.self !== window.top);
      setIsMobile(window.innerWidth < 768);
      const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Validate Firestore Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    async function fetchNewsletter() {
      setLoading(true);
      setErrorMsg('');
      try {
        // Fetch all newsletters to find the one matching the YYYY-MM-DD date in url.
        // We query without 'orderBy' for maximum robustness to avoid missing composite/custom index issues,
        // and sort them manually in JS.
        const querySnapshot = await getDocs(collection(db, 'newsletters'));
        const campaignsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as NewsletterCampaign[];

        // Sort by date (createdAt or sentAt) descending
        campaignsList.sort((a, b) => {
          const tA = a.createdAt || a.sentAt;
          const tB = b.createdAt || b.sentAt;
          if (!tA) return 1;
          if (!tB) return -1;
          const dA = tA.toDate ? tA.toDate().getTime() : new Date(tA).getTime();
          const dB = tB.toDate ? tB.toDate().getTime() : new Date(tB).getTime();
          return dB - dA;
        });

        let targetCampaign: NewsletterCampaign | null = null;

        if (date) {
          targetCampaign = campaignsList.find(camp => {
            const ts = camp.createdAt || camp.sentAt;
            if (!ts) return false;
            const d = ts.toDate ? ts.toDate() : new Date(ts);
            
            // Format 1: Local timezone of browser
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const campDateStr = `${year}-${month}-${day}`;
            if (campDateStr === date) return true;

            // Format 2: UTC timezone
            const uYear = d.getUTCFullYear();
            const uMonth = String(d.getUTCMonth() + 1).padStart(2, '0');
            const uDay = String(d.getUTCDate()).padStart(2, '0');
            const campDateStrUTC = `${uYear}-${uMonth}-${uDay}`;
            if (campDateStrUTC === date) return true;

            // Format 3: Spain Timezone (Madrid) offset-based
            try {
              const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Europe/Madrid',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              });
              const parts = formatter.formatToParts(d);
              const mPart = parts.find(p => p.type === 'month')?.value;
              const dPart = parts.find(p => p.type === 'day')?.value;
              const yPart = parts.find(p => p.type === 'year')?.value;
              if (mPart && dPart && yPart) {
                const campDateStrMadrid = `${yPart}-${mPart}-${dPart}`;
                if (campDateStrMadrid === date) return true;
              }
            } catch (e) {
              console.error("Madrid formatter error", e);
            }

            // Format 4: Check if it is within 36 hours of the target date start
            try {
              const targetTime = new Date(`${date}T00:00:00`).getTime();
              const campTime = d.getTime();
              const diffHours = Math.abs(campTime - targetTime) / (1000 * 60 * 60);
              if (diffHours <= 36) {
                return true;
              }
            } catch (e) {
              console.error("Date diff calculation error", e);
            }

            return false;
          }) || null;
        }

        // Fallback: Use the latest sent/scheduled/draft if no specific date is matched or if date param is 'latest'
        if (!targetCampaign && campaignsList.length > 0) {
          targetCampaign = campaignsList[0];
        }

        if (targetCampaign) {
          setCampaign(targetCampaign);

          let displayDate = "";
          const ts = targetCampaign.createdAt || targetCampaign.sentAt;
          if (ts) {
            const d = ts.toDate ? ts.toDate() : new Date(ts);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            displayDate = `${day}/${month}/${year}`;
          } else if (date && date !== 'latest') {
            const parts = date.split('-');
            if (parts.length === 3) {
              displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else {
              displayDate = date;
            }
          } else {
            const d = new Date();
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            displayDate = `${day}/${month}/${year}`;
          }
          document.title = `Huelva Church - Boletín informativo del ${displayDate}`;

          // If it's a weekly newsletter, let's load selected articles
          if (targetCampaign.type === 'semanal' && targetCampaign.config?.selectedPostIds?.length) {
            const postsSnapshot = await getDocs(collection(db, 'posts'));
            const allPosts = postsSnapshot.docs.map(d => ({
              id: d.id,
              ...d.data()
            })) as Post[];
            
            const selectedArticles = allPosts.filter(p => 
              targetCampaign?.config?.selectedPostIds?.includes(p.id)
            );
            setArticles(selectedArticles);
          }
        } else {
          setErrorMsg('No se ha encontrado ningún boletín publicado aún.');
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg(`Error al obtener el boletín: ${err?.message || err || 'Inténtalo de nuevo más tarde.'}`);
      } finally {
        setLoading(false);
      }
    }

    fetchNewsletter();
  }, [date]);

  const handleShare = async () => {
    if (!campaign) return;
    const url = window.location.href;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: campaign.subject || 'Boletín Huelva Church',
          text: `Lee nuestro boletín oficial interactivo:`,
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      }
    } catch (err) {
      console.error(err);
      // Fallback copy
      try {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      } catch (e) {
        alert('Enlace del boletín: ' + url);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNext = () => {
    if (isMobile) {
      if (currentPage < 4) setCurrentPage(p => p + 1);
    } else {
      if (currentPage === 1) setCurrentPage(2);
      else if (currentPage === 2 || currentPage === 3) setCurrentPage(4);
    }
  };

  const handlePrev = () => {
    if (isMobile) {
      if (currentPage > 1) setCurrentPage(p => p - 1);
    } else {
      if (currentPage === 4) setCurrentPage(3);
      else if (currentPage === 2 || currentPage === 3) setCurrentPage(1);
    }
  };

  if (loading) {
    return (
      <div className="pt-40 pb-24 text-center min-h-screen flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
        <p className="text-primary/70 font-semibold">Cargando boletín informativo...</p>
      </div>
    );
  }

  if (errorMsg || !campaign) {
    return (
      <div className="pt-40 pb-24 text-center min-h-screen max-w-xl mx-auto px-4 flex flex-col justify-center items-center">
        <div className="bg-red-50 text-red-800 p-6 rounded-3xl border border-red-200/50 mb-6 text-left">
          <h3 className="font-kenao text-lg mb-2">¡Boletín no encontrado!</h3>
          <p className="text-sm text-red-800/80 leading-relaxed">
            {errorMsg || 'No hemos podido localizar la publicación solicitada. Por favor, verifica la URL o vuelve a intentarlo.'}
          </p>
        </div>
        <Link to="/" className="inline-flex items-center gap-2 bg-primary text-white font-bold px-6 py-3 rounded-xl hover:bg-secondary hover:text-primary transition-colors uppercase text-xs tracking-wider">
          <ArrowLeft className="w-4 h-4" /> Volver al Inicio
        </Link>
      </div>
    );
  }

  // Get date for display
  const campTs = campaign.createdAt || campaign.sentAt;
  const campDate = campTs ? (campTs.toDate ? campTs.toDate() : new Date(campTs)) : new Date();
  const formattedDisplayDate = campDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Extract special formatted message if markdown exists
  const formatSpecialContent = (text: string) => {
    return text.split('\n\n').map((paragraph, i) => {
      // Very basic paragraph parsing for headlines & lists
      if (paragraph.startsWith('### ')) {
        return <h4 key={i} className="font-kenao text-lg text-primary mt-6 mb-2 font-bold">{paragraph.replace('### ', '')}</h4>;
      }
      if (paragraph.includes('- ')) {
        const items = paragraph.split('\n').filter(line => line.trim().length > 0);
        return (
          <ul key={i} className="list-disc pl-5 my-4 space-y-1 text-slate-600 text-sm">
            {items.map((it, idx) => {
              const cleanItem = it.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '$1');
              return <li key={idx}>{cleanItem}</li>;
            })}
          </ul>
        );
      }
      // Replace **bold**
      let cleanText: React.ReactNode = paragraph;
      if (paragraph.includes('**')) {
        const parts = paragraph.split('**');
        cleanText = parts.map((part, index) => index % 2 === 1 ? <strong key={index} className="font-bold text-primary">{part}</strong> : part);
      }
      return <p key={i} className="leading-relaxed text-sm text-slate-600 mb-4 whitespace-pre-line">{cleanText}</p>;
    });
  };

  return (
    <div className="pt-6 pb-12 bg-slate-100 min-h-screen">
      
      {/* Custom Stylesheet injection for print purposes */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #2D4B73 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, footer, .no-print, .welcome-popup, .cookie-banner, .pwa-alert {
            display: none !important;
          }
          .pt-28 {
            padding-top: 0 !important;
          }
          .pb-20 {
            padding-bottom: 0 !important;
          }
          .bg-slate-100 {
            background-color: #ffffff !important;
          }
          /* Grid print container forces stacked page breaks */
          .print-magazine {
            display: block !important;
            width: auto !important;
            height: auto !important;
            box-shadow: none !important;
            border: none !important;
            background-color: #ffffff !important;
          }
          .print-page-A4 {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            padding: 24mm 20mm !important;
            margin: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background-color: #ffffff !important;
            overflow: hidden !important;
            position: relative !important;
          }
          .print-page-A4-last {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {/* Iframe sandbox helper warning */}
      {isInsideIframe && (
        <div className="max-w-4xl mx-auto px-4 mb-6 no-print">
          <div className="bg-amber-50 text-amber-950 border border-amber-200/80 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <div className="flex items-start gap-3 text-left">
              <span className="text-lg leading-none shrink-0 pt-0.5">⚠️</span>
              <div className="space-y-1">
                <p className="font-bold text-amber-900">Entorno en Vista Previa (IFrame)</p>
                <p className="text-amber-800 leading-normal">
                  Las medidas de seguridad de tu navegador dentro de este marco pueden bloquear la descarga del PDF de Barriadas, limitar la funcionalidad de la revista interactiva o mostrar enlaces vacíos si intentas navegar directamente. Por favor, abre el boletín en una nueva pestaña para disfrutar de la experiencia al 100%.
                </p>
              </div>
            </div>
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold shrink-0 px-4 py-2 border border-amber-300 rounded-xl transition-colors inline-flex items-center gap-1.5 leading-none shadow-sm cursor-pointer whitespace-nowrap"
            >
              Abrir Boletín Completo <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Minimalistic Header */}
      <div className="max-w-4xl mx-auto px-4 mt-2 mb-6 text-center no-print flex flex-col items-center justify-center gap-1.5">
        <h2 className="text-[#2D4B73] text-[13px] font-bold uppercase tracking-widest leading-none">
          Boletín Semanal
        </h2>
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
          {formattedDisplayDate}
        </p>
      </div>

      {campaign.type === 'semanal' ? (
        /* ==================== WEEKLY FORMAT ==================== */
        viewMode === 'web' ? (
          /* DIGITAL RESPONSIVE VIEW */
          <div className="max-w-2xl mx-auto px-4 space-y-8 no-print">
            
            {/* Header branding */}
            <div className="py-6 text-center flex flex-col items-center justify-center">
              <img src="/images/Logotipo%20Azul.png" alt="Huelva Church" className="max-h-21 h-[84px] mx-auto mb-3" />
            </div>

            <div className="w-full rounded-3xl overflow-hidden border border-slate-200/60 shadow-sm bg-white p-2">
              <img 
                src={campaign.config?.coverImageUrl ? getOptimizedImageUrl(campaign.config.coverImageUrl) : "/images/Boletin%20Caratula%20Generica.png"} 
                alt="Carátula de Boletín" 
                className="w-full h-auto object-cover rounded-2xl max-h-[500px]" 
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Greeting */}
            {campaign.config?.greetingText && (
              <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm relative text-left">
                <div className="absolute top-6 right-6 w-10 h-10 bg-secondary/5 rounded-full flex items-center justify-center text-secondary border border-secondary/10">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-kenao text-lg text-primary mb-3 font-bold">¡Bienvenidos!</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{campaign.config.greetingText}</p>
              </div>
            )}

            {/* Section Title: Celebración en streaming */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-4 mt-8">
              <Radio className="w-5 h-5 text-secondary" />
              <h2 className="font-kenao text-xl text-primary font-bold">Celebración en streaming</h2>
            </div>

            {/* Main Sermon / Sunday Gathering */}
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden text-left">
              {campaign.config?.sermonImageUrl && (
                <img 
                  src={getOptimizedImageUrl(campaign.config.sermonImageUrl)} 
                  alt="Reunión del Domingo" 
                  className="w-full max-h-[300px] object-cover" 
                />
              )}
              <div className="p-8">
                <h3 className="font-kenao text-xl text-primary font-bold mb-1">Celebración Dominical</h3>
                <p className="text-xs font-bold text-[#D9B70D] mb-4 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {(meetingTime || 'Domingo a las 19:30H').replace(/Domingos/i, 'Domingo').replace(/hrs/i, 'h')}
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">{campaign.config?.sermonDescription}</p>
              </div>
            </div>

            {/* Invitación Especial (Santa Cena) */}
            {campaign.config?.isCenaBanner && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2 mt-4">
                  <Sparkles className="w-5 h-5 text-secondary" />
                  <h2 className="font-kenao text-xl text-primary font-bold">Invitación Especial</h2>
                </div>
                <div className="bg-[#2D4B73] rounded-3xl overflow-hidden relative shadow-sm text-left">
                  <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/images/Banner%20Cena.png')" }}></div>
                  <div className="relative p-8 md:p-10 flex flex-col justify-end text-white min-h-[160px] z-10">
                    <span className="text-secondary font-mono text-[10px] uppercase font-bold tracking-wider mb-2">Sacramento</span>
                    <h3 className="font-kenao text-xl font-bold mb-2">Cena del Señor</h3>
                    <p className="text-sm text-slate-200 leading-relaxed">{campaign.config.cenaDescription || 'Este domingo participaremos juntos en la mesa de comunión familiar.'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sección Auxiliar: A la salida */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2 mt-4">
                <Coffee className="w-5 h-5 text-secondary" />
                <h2 className="font-kenao text-xl text-primary font-bold">A la salida</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cafetería */}
                <div className="bg-[#2D4B73] rounded-3xl overflow-hidden relative shadow-sm min-h-[140px] flex flex-col justify-end p-6 text-white text-left">
                  <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/images/Imagen%20Cafeteria.png')" }}></div>
                  <div className="relative z-10">
                    <span className="text-secondary font-mono text-[10px] uppercase font-bold tracking-wider mb-1 block">Cafetería</span>
                    <h3 className="font-kenao text-lg font-bold mb-1">Café & Comunión</h3>
                    <p className="text-xs text-slate-200 leading-relaxed">Comparte un tiempo dulce y café con la familia de fe al terminar la celebración.</p>
                  </div>
                </div>

                {/* Librería */}
                <div className="bg-[#2D4B73] rounded-3xl overflow-hidden relative shadow-sm min-h-[140px] flex flex-col justify-end p-6 text-white text-left">
                  <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/images/Imagen%20Libreria.png')" }}></div>
                  <div className="relative z-10">
                    <span className="text-secondary font-mono text-[10px] uppercase font-bold tracking-wider mb-1 block">Librería</span>
                    <h3 className="font-kenao text-lg font-bold mb-1">Recursos Bíblicos</h3>
                    <p className="text-xs text-slate-200 leading-relaxed">Adquiere libros y materiales edificantes para cultivar tu vida de fe.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Articles Section */}
            {articles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <BookOpen className="w-5 h-5 text-secondary" />
                  <h2 className="font-kenao text-xl text-primary font-bold">Avisos Destacados</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {articles.map(p => (
                    <div key={p.id} className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col text-left hover:border-primary/20 transition-all max-w-lg mx-auto md:mx-0 w-full">
                      {p.imageUrl && (
                        <img 
                          src={getOptimizedImageUrl(p.imageUrl)} 
                          alt={p.title} 
                          className="w-full h-48 md:h-52 object-cover shrink-0" 
                        />
                      )}
                      <div className="p-6 flex flex-col justify-between flex-grow">
                        <div>
                          <span className="text-[10px] uppercase font-extrabold text-[#D9B70D] font-mono">{p.category || 'Aviso'}</span>
                          <h4 className="font-kenao text-base text-primary font-bold mt-1 mb-2 leading-snug">{p.title}</h4>
                          <p className="text-slate-600 text-xs line-clamp-3 leading-relaxed mb-4">{p.excerpt}</p>
                        </div>
                        <a 
                          href={`/actividades/${p.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-[#D9B70D] transition-colors uppercase tracking-wider mt-auto"
                        >
                          Leer más <ChevronRight className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Permanents Promos / Corporate Life */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Heart className="w-5 h-5 text-secondary" />
                <h2 className="font-kenao text-xl text-primary font-bold">Nuestra Vida como Iglesia</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a href="/celulas" target="_blank" className="bg-[#2D4B73] rounded-2xl overflow-hidden relative block h-32 hover:opacity-95 transition-opacity text-left shadow-sm">
                  <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/images/Banner%20Celulas.png')" }}></div>
                  <div className="relative p-6 flex flex-col justify-end text-white h-full z-10">
                    <h4 className="text-base font-kenao font-bold leading-tight">Células</h4>
                    <p className="text-xs text-slate-300">Conéctate en un hogar de fe cerca de ti</p>
                  </div>
                </a>

                <a href="https://meet.google.com/qhu-fktd-ejh" target="_blank" className="bg-[#2D4B73] rounded-2xl overflow-hidden relative block h-32 hover:opacity-95 transition-opacity text-left shadow-sm">
                  <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/images/Banner%20Oracion.png')" }}></div>
                  <div className="relative p-6 flex flex-col justify-end text-white h-full z-10">
                    <h4 className="text-base font-kenao font-bold leading-tight">Noches de Oración</h4>
                    <p className="text-xs text-slate-300">Lunes a Jueves 23:00h vía Meet</p>
                  </div>
                </a>

                <a href="https://www.radiohuelvachurch.com/" target="_blank" className="bg-[#2D4B73] rounded-2xl overflow-hidden relative block h-32 hover:opacity-95 transition-opacity text-left md:col-span-2 shadow-sm">
                  <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/images/Banner%20Radio.png')" }}></div>
                  <div className="relative p-6 flex flex-col justify-end text-white h-full z-10">
                    <h4 className="text-base font-kenao font-bold leading-tight">Radio Online</h4>
                    <p className="text-xs text-slate-300">Sintoniza adoración fresca las 24 horas y descarga nuestra App</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Footer with socials */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-8 text-center text-slate-500 text-xs shadow-xs">
              <div className="flex justify-center gap-3 mb-4">
                <a 
                  href="https://www.instagram.com/huelvachurch/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-10 h-10 bg-white rounded-xl border border-slate-200/85 flex items-center justify-center text-[#2D4B73] hover:bg-[#2D4B73] hover:text-white hover:border-[#2D4B73] transition-all shadow-xs"
                  title="Instagram"
                >
                  <Instagram className="w-5 h-5 shrink-0" />
                </a>

                <a 
                  href="https://www.facebook.com/huelvachurch" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-10 h-10 bg-white rounded-xl border border-slate-200/85 flex items-center justify-center text-[#2D4B73] hover:bg-[#2D4B73] hover:text-white hover:border-[#2D4B73] transition-all shadow-xs"
                  title="Facebook"
                >
                  <Facebook className="w-5 h-5 shrink-0" />
                </a>

                <a 
                  href="https://www.youtube.com/@huelvachurch" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-10 h-10 bg-white rounded-xl border border-slate-200/85 flex items-center justify-center text-[#2D4B73] hover:bg-[#2D4B73] hover:text-white hover:border-[#2D4B73] transition-all shadow-xs"
                  title="YouTube"
                >
                  <Youtube className="w-5 h-5 shrink-0" />
                </a>

                <a 
                  href="https://chat.whatsapp.com/KYIoRdfL0lI5TlKKW5o8nN" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-10 h-10 bg-white rounded-xl border border-slate-200/85 flex items-center justify-center text-[#2D4B73] hover:bg-[#2D4B73] hover:text-white hover:border-[#2D4B73] transition-all shadow-xs"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-5 h-5 shrink-0" />
                </a>
              </div>
              <p className="font-bold text-slate-600 mb-1">Huelva Church</p>
              <p className="text-slate-400">Calle de Los Marismeños, 6, Huelva</p>
              <p className="mt-4 text-[10px] text-slate-400 leading-normal">
                Has recibido este boletín porque estás inscrito en la lista de difusión informativa oficial.
              </p>
            </div>

          </div>
        ) : (() => {
          // Dynamic article distribution to prevent any white-space gaps
          const cenaEnabled = !!campaign.config?.isCenaBanner;

          // Shared helper component for corporate church life links with background image and text in bottom left corner
          const NuestraVidaSection = () => (
            <div className="shrink-0 w-full h-full flex flex-col justify-between min-h-0">
              <div className="shrink-0 mb-1 flex items-center gap-1.5 text-left justify-start">
                <span className="w-1.5 h-1.5 bg-[#2D4B73] rounded-full"></span>
                <h4 className="font-kenao text-[8px] text-[#2D4B73] font-bold uppercase tracking-wider">Nuestra Vida como Iglesia</h4>
              </div>

              <div className="grid grid-rows-3 gap-1 w-full flex-grow min-h-0">
                {/* Células */}
                <a 
                  href={`${window.location.origin}/celulas`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-[#2D4B73] rounded-lg overflow-hidden relative block h-full hover:opacity-95 transition-opacity text-left shadow-xs"
                >
                  <div className="absolute inset-0 bg-cover bg-center opacity-30 z-0" style={{ backgroundImage: "url('/images/Banner%20Celulas.png')" }}></div>
                  <div className="relative px-2.5 z-10 flex flex-col justify-center text-white h-full">
                    <h5 className="font-kenao text-[7.5px] font-bold leading-none uppercase tracking-wider text-white">Células</h5>
                    <p className="text-[6.5px] text-slate-200 leading-none mt-0.5">Hogares de fe por todo Huelva</p>
                  </div>
                </a>

                {/* Noches de Oración */}
                <a 
                  href="https://meet.google.com/qhu-fktd-ejh" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-[#2D4B73] rounded-lg overflow-hidden relative block h-full hover:opacity-95 transition-opacity text-left shadow-xs"
                >
                  <div className="absolute inset-0 bg-cover bg-center opacity-30 z-0" style={{ backgroundImage: "url('/images/Banner%20Oracion.png')" }}></div>
                  <div className="relative px-2.5 z-10 flex flex-col justify-center text-white h-full">
                    <h5 className="font-kenao text-[7.5px] font-bold leading-none uppercase tracking-wider text-white">Noches de Oración</h5>
                    <p className="text-[6.5px] text-slate-200 leading-none mt-0.5">Lunes a Jueves a las 23:00h vía Meet</p>
                  </div>
                </a>

                {/* Radio */}
                <a 
                  href="https://www.radiohuelvachurch.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-[#2D4B73] rounded-lg overflow-hidden relative block h-full hover:opacity-95 transition-opacity text-left shadow-xs"
                >
                  <div className="absolute inset-0 bg-cover bg-center opacity-30 z-0" style={{ backgroundImage: "url('/images/Banner%20Radio.png')" }}></div>
                  <div className="relative px-2.5 z-10 flex flex-col justify-center text-white h-full">
                    <h5 className="font-kenao text-[7.5px] font-bold leading-none uppercase tracking-wider text-white">Radio Online</h5>
                    <p className="text-[6.5px] text-slate-200 leading-none mt-0.5">Música y edificación las 24 horas</p>
                  </div>
                </a>
              </div>
            </div>
          );

          // Interactive 3D drag-to-flip page turn wrapper (Option 2: Native 3D swiveling page turn)
          const InteractivePageTurn = ({
            children,
            onFlipNext,
            onFlipPrev,
            className = "",
            pageStyle = "",
            hasCornerNext = false,
            hasCornerPrev = false
          }: {
            children: React.ReactNode;
            onFlipNext?: () => void;
            onFlipPrev?: () => void;
            className?: string;
            pageStyle?: string;
            hasCornerNext?: boolean;
            hasCornerPrev?: boolean;
          }) => {
            const dragX = useMotionValue(0);

            // Calculate precise vertical axis hinge rotation (left hinge/origin for NEXT, right hinge/origin for PREV)
            // When NEXT is possible and dragged left (dragX negative): rotates up to -45deg
            // When PREV is possible and dragged right (dragX positive): rotates up to 45deg
            const rotateY = useTransform(
              dragX,
              [-180, 0, 180],
              [hasCornerNext ? -45 : 0, 0, hasCornerPrev ? 45 : 0]
            );

            // Perspective scale adjustment to reinforce natural 3D depth of book leaves during swipe
            const scale = useTransform(dragX, [-180, 0, 180], [0.96, 1, 0.96]);

            // Realistic spine shading shadow overlay
            const shadowOpacity = useTransform(
              dragX,
              [-180, 0, 180],
              [hasCornerNext ? 0.35 : 0, 0, hasCornerPrev ? 0.35 : 0]
            );

            const handleDragEnd = (_event: any, info: any) => {
              const threshold = 55; // Gesture drag threshold
              if (hasCornerNext && info.offset.x < -threshold) {
                if (onFlipNext) onFlipNext();
              } else if (hasCornerPrev && info.offset.x > threshold) {
                if (onFlipPrev) onFlipPrev();
              }
              dragX.set(0); // Safely snap back to resting angle
            };

            return (
              <div 
                className={`relative ${className}`}
                style={{ perspective: 1800, transformStyle: "preserve-3d" }}
              >
                <motion.div
                  className={`w-full h-full relative ${pageStyle}`}
                  style={{
                    rotateY: rotateY,
                    scale: scale,
                    transformOrigin: hasCornerNext ? "left center" : "right center",
                    transformStyle: "preserve-3d"
                  }}
                  drag="x"
                  dragConstraints={{ left: hasCornerNext ? -200 : 0, right: hasCornerPrev ? 200 : 0 }}
                  dragElastic={0.12}
                  onDragEnd={handleDragEnd}
                >
                  {/* Page main content container (keeps visual lines flat and readable with no distortion) */}
                  <div className="w-full h-full backface-hidden" style={{ backfaceVisibility: "hidden" }}>
                    {children}
                  </div>

                  {/* Real-time ambient multiply lighting shadow layer */}
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-black/0 via-black/[0.15] to-black/0 pointer-events-none z-30 transition-opacity rounded-2xl"
                    style={{ 
                      opacity: shadowOpacity,
                      mixBlendMode: "multiply"
                    }}
                  />
                </motion.div>
              </div>
            );
          };

          // Subcomponents for the booklet pages so they are identical in both screen & print versions
          const Page1Content = () => (
            <div className="flex flex-col justify-between h-full bg-white relative overflow-hidden">
              {/* 15% Space: Header Blue Strip with Centered Logo */}
              <div className="bg-[#2D4B73] h-[15%] text-center flex items-center justify-center relative border-b border-[#2D4B73]/10 shrink-0">
                <img src="/images/Logotipo%20Blanco.png" alt="Huelva Church" className="h-[30px] max-h-10 object-contain block" />
              </div>
              
              <div className="p-4 flex-grow flex flex-col justify-between min-h-0 space-y-3">
                {/* Cover Image - positioned between the blue header and the greeting message card */}
                <div className="flex-grow flex items-center justify-center bg-slate-50 border border-slate-200/50 rounded-xl overflow-hidden relative shadow-xs min-h-0">
                  <img 
                    src={campaign.config?.coverImageUrl ? getOptimizedImageUrl(campaign.config.coverImageUrl) : "/images/Boletin%20Caratula%20Generica.png"} 
                    alt="Carátula" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Greeting message - now a lower / shorter gray card with clean gray styling, no title or line */}
                {campaign.config?.greetingText && (
                  <div className="text-center rounded-xl p-3 border border-slate-200/50 bg-slate-50 shadow-2xs relative overflow-hidden shrink-0">
                    <p className="text-[9.5px] text-slate-600 leading-normal font-medium whitespace-pre-line italic">
                      "{campaign.config.greetingText}"
                    </p>
                  </div>
                )}

                {/* 10% Space: Gray/Silver Badge/Button to read online */}
                <div className="h-[10%] flex items-center justify-center shrink-0">
                  <button 
                    onClick={() => setViewMode('web')}
                    className="bg-slate-100 hover:bg-slate-150 text-[#2D4B73] border border-slate-200/60 text-[7.5px] font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-[#D9B70D]" /> Ver en Formato Web &rarr;
                  </button>
                </div>

                {/* Elegant Footer Area - Visible for Page 1 */}
                <div className="border-t border-slate-100 pt-1.5 flex justify-between items-center text-[7px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mt-3">
                  <span>{formattedDisplayDate}</span>
                  <span>Pág. 1 / 4</span>
                </div>
              </div>
            </div>
          );

          const Page2Content = () => {
            const cleanMeetingTime = (meetingTime || 'Domingos a las 19:30h')
               .replace(/Domingos/i, 'Domingo')
               .replace(/hrs/i, 'h')
               .toUpperCase();

            return (
              <div className="flex flex-col justify-between h-full bg-white relative">
                <div className="text-left flex-grow flex flex-col justify-between min-h-0">
                  {/* Page Header */}
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1 mb-2 shrink-0">
                    <h3 className="font-kenao text-[9px] text-[#2D4B73] uppercase tracking-wider font-bold">Próxima Celebración</h3>
                  </div>

                  {/* Grid of 3 rows matching Page 3 perfectly to align bottom cards */}
                  <div className="grid grid-rows-3 gap-2 flex-grow min-h-0 py-0.5">
                    
                    {/* Rows 1 and 2 (2/3 height): Celebración en streaming */}
                    <div className="row-span-2 min-h-0 flex flex-col justify-start">
                      {/* Section Title: Celebración en streaming */}
                      <div className="shrink-0 mb-1 flex items-center gap-1.5 text-left justify-start">
                        <span className="w-1.5 h-1.5 bg-[#D9B70D] rounded-full"></span>
                        <h4 className="font-kenao text-[8px] text-[#2D4B73] font-bold uppercase tracking-wider">Celebración en streaming</h4>
                      </div>

                      <div className="bg-[#2D4B73]/5 border border-[#2D4B73]/10 rounded-xl p-2.5 flex flex-col justify-between flex-grow min-h-0">
                        <div className="min-h-0 flex-grow flex flex-col justify-start">
                          
                          {/* Sermon Image at the Top - increased from h-26 to h-32 */}
                          {campaign.config?.sermonImageUrl && (
                            <div className="w-full h-32 mb-2 rounded-lg overflow-hidden border border-slate-150 shrink-0 shadow-xs relative">
                              <img 
                                src={getOptimizedImageUrl(campaign.config.sermonImageUrl)} 
                                alt="Sermón" 
                                className="w-full h-full object-cover pb-0" 
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-1 mb-2 shrink-0">
                            <div className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200/50 text-[6.5px] font-extrabold px-1.5 py-0.5 rounded w-fit">
                              <Calendar className="w-2.5 h-2.5" /> {cleanMeetingTime}
                            </div>
                          </div>
                          
                          <div className="min-h-0 overflow-y-auto flex-grow text-left mt-1">
                            <p className="text-[7.2px] text-slate-600 leading-normal font-gordita">
                              {campaign.config?.sermonDescription || 'Te invitamos a unirte en nuestra reunión general para adorar, orar y aprender juntos de la Palabra de Dios en comunidad.'}
                            </p>
                          </div>
                        </div>

                        {/* Ver en YouTube link perfectly pinned inside the bottom-left of the card */}
                        <div className="shrink-0 pt-1.5 border-t border-[#2D4B73]/10 mt-2 text-left w-full">
                          <a 
                            href="https://youtube.com/@HuelvaChurch" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#2D4B73] hover:text-[#d4af0b] text-[7.5px] font-bold flex items-center gap-1 hover:underline w-fit"
                          >
                            <Youtube className="w-3 h-3 text-red-600" /> Ver en YouTube &rarr;
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Row 3 (1/3 height): Cena del Señor OR Cafetería/Librería Promotional Cards */}
                    <div className="row-span-1 min-h-0 flex flex-col justify-end">
                      {cenaEnabled ? (
                        <div className="h-full flex flex-col justify-end min-h-0">
                          <div className="shrink-0 mb-1 flex items-center gap-1.5 text-left justify-start">
                            <span className="w-1.5 h-1.5 bg-[#D9B70D] rounded-full"></span>
                            <h4 className="font-kenao text-[8px] text-[#2D4B73] font-bold uppercase tracking-wider">Invitación Especial</h4>
                          </div>
                          <div className="bg-[#2D4B73] rounded-lg p-2.5 overflow-hidden relative shadow-xs text-white flex-grow flex flex-col justify-end text-left h-full min-h-0 pb-2.5">
                            <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/images/Banner%20Cena.png')" }}></div>
                            <div className="relative z-10 w-full text-left flex flex-col justify-end max-h-full min-h-0">
                              <span className="text-[7.5px] font-mono text-[#D9B70D] uppercase font-bold tracking-widest block mb-0.5">Cena del Señor</span>
                              <div className="min-h-0 overflow-y-auto">
                                <p className="text-[7.5px] text-slate-200 leading-normal font-gordita">
                                  {campaign.config.cenaDescription || 'Unidad de adoración y comunión espiritual en la mesa dominical. Compartiremos el pan y la copa recordando el sacrificio de Jesús.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col justify-end min-h-0 text-left">
                          <div className="shrink-0 mb-1 flex items-center gap-1.5 text-left justify-start">
                            <span className="w-1.5 h-1.5 bg-[#D9B70D] rounded-full"></span>
                            <h4 className="font-kenao text-[8px] text-[#2D4B73] font-bold uppercase tracking-wider">A la salida</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-2 flex-grow h-full min-h-0">
                            {/* Cafetería Card */}
                            <div className="bg-[#2D4B73] rounded-lg p-2 flex flex-col justify-end text-left h-full min-h-0 pb-2 overflow-hidden relative shadow-xs text-white">
                              <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/images/Imagen%20Cafeteria.png')" }}></div>
                              <div className="relative z-10 w-full text-left">
                                <span className="text-[7px] font-mono text-[#D9B70D] uppercase font-bold tracking-widest block mb-0.5">Cafetería</span>
                                <p className="text-[6.5px] text-slate-200 leading-normal font-gordita line-clamp-2">
                                  Comparte un tiempo dulce y café con la familia de fe al terminar.
                                </p>
                              </div>
                            </div>

                            {/* Librería Card */}
                            <div className="bg-[#2D4B73] rounded-lg p-2 flex flex-col justify-end text-left h-full min-h-0 pb-2 overflow-hidden relative shadow-xs text-white">
                              <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/images/Imagen%20Libreria.png')" }}></div>
                              <div className="relative z-10 w-full text-left">
                                <span className="text-[7px] font-mono text-[#D9B70D] uppercase font-bold tracking-widest block mb-0.5">Librería</span>
                                <p className="text-[6.5px] text-slate-200 leading-normal font-gordita line-clamp-2">
                                  Adquiere libros y recursos bíblicos para edificar tu fe.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                <div className="border-t border-slate-100 pt-1.5 flex justify-between items-center text-[7.5px] text-slate-400 font-bold uppercase tracking-wider mt-2 shrink-0">
                  <span>{formattedDisplayDate}</span>
                  <span>Pág. 2 / 4</span>
                </div>
              </div>
            );
          };

          const Page3Content = () => {
            const articlesCount = articles.length;
            const showNuestraVidaOnPage3 = articlesCount <= 4;

            const ArticleCard = ({ article }: { article: any }) => {
              const [isFlipped, setIsFlipped] = useState(false);
              
              return (
                <div 
                  onClick={() => setIsFlipped(!isFlipped)} 
                  className="bg-[#2D4B73]/5 border border-[#2D4B73]/10 rounded-lg overflow-hidden flex flex-col h-full bg-white relative shadow-xs text-left cursor-pointer select-none group transition-all duration-350 hover:scale-[1.015] hover:shadow-sm"
                >
                  {/* Front/Image and title */}
                  <div className={`flex flex-col h-full w-full transition-opacity duration-300 ${isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    {article.imageUrl && (
                      <div className="w-full aspect-video overflow-hidden shrink-0 relative bg-slate-100 border-b border-slate-100/50">
                        <img 
                          src={getOptimizedImageUrl(article.imageUrl)} 
                          alt={article.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                      </div>
                    )}
                    <div className="p-1.5 px-2 flex-grow flex flex-col justify-between min-h-0 bg-white">
                      <h5 className="font-kenao text-[7.5px] text-[#2D4B73] font-bold leading-tight uppercase tracking-wide">
                        {article.title}
                      </h5>
                      <div className="flex items-center justify-between shrink-0 pt-1 mt-auto">
                        <a 
                          href={`/actividades/${article.id}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation(); // Avoid flipping when clicking the link
                          }}
                          className="text-[5.5px] text-[#D9B70D] hover:text-[#2D4B73] font-mono font-extrabold uppercase tracking-widest hover:underline flex items-center gap-0.5"
                        >
                          Leer en Web ➔
                        </a>
                        <span className="text-[5px] text-slate-400 font-mono font-medium uppercase tracking-wider">
                          Resumen ⟳
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Back/Summary (Centered horizontally and vertically, only the summary text) */}
                  <div className={`absolute inset-0 bg-[#2D4B73] text-white p-3 flex flex-col justify-center items-center text-center transition-all duration-350 z-10 ${isFlipped ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'}`}>
                    <div className="min-h-0 max-h-full overflow-y-auto flex flex-col justify-center items-center w-full">
                      <p className="text-[6.2px] text-slate-100 leading-normal font-gordita max-w-[145px] whitespace-pre-line px-1 text-center font-medium">
                        {article.excerpt}
                      </p>
                    </div>
                  </div>
                </div>
              );
            };

            const AuxiliaryBanner = () => (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 rounded-lg p-1.5 py-2 flex flex-col justify-center items-center text-center h-[90%] my-auto shadow-xs w-full">
                <Sparkles className="w-3 h-3 text-[#D9B70D] mb-0.5 shrink-0" />
                <h5 className="font-kenao text-[7.5px] text-[#2D4B73] font-bold leading-none">Tenemos más avisos en nuestra página web</h5>
                <p className="text-[6.5px] text-slate-450 leading-normal max-w-[240px] mt-0.5">
                  Consulta de manera interactiva todas las actividades y novedades semanales en la web.
                </p>
              </div>
            );

            const Slot1 = () => {
              if (articlesCount === 0) {
                return (
                  <div className="p-2 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-[7.5px] text-slate-400 italic flex items-center justify-center h-full">
                    No hay artículos destacados registrados para esta semana.
                  </div>
                );
              }
              if (articlesCount === 1) {
                return (
                  <div className="flex justify-center items-center h-full w-full">
                    <div className="w-[calc(50%-4px)] h-full">
                      <ArticleCard article={articles[0]} />
                    </div>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-2 gap-2 h-full">
                  <ArticleCard article={articles[0]} />
                  <ArticleCard article={articles[1]} />
                </div>
              );
            };

            const Slot2 = () => {
              if (articlesCount <= 2) {
                return (
                  <div className="max-w-[240px] mx-auto h-full w-full flex items-center justify-center">
                    <AuxiliaryBanner />
                  </div>
                );
              }
              if (articlesCount === 3) {
                return (
                  <div className="flex justify-center items-center h-full w-full">
                    <div className="w-[calc(50%-4px)] h-full">
                      <ArticleCard article={articles[2]} />
                    </div>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-2 gap-2 h-full">
                  <ArticleCard article={articles[2]} />
                  <ArticleCard article={articles[3]} />
                </div>
              );
            };

            const Slot3 = () => {
              if (showNuestraVidaOnPage3) {
                return <NuestraVidaSection />;
              }
              if (articlesCount === 5) {
                return (
                  <div className="flex justify-center items-center h-full w-full">
                    <div className="w-[calc(50%-4px)] h-full">
                      <ArticleCard article={articles[4]} />
                    </div>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-2 gap-2 h-full">
                  <ArticleCard article={articles[4]} />
                  <ArticleCard article={articles[5]} />
                </div>
              );
            };

            return (
              <div className="flex flex-col justify-between h-full bg-white relative">
                <div className="text-left flex-grow flex flex-col justify-between min-h-0">
                  {/* Page Header */}
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1 mb-1.5 shrink-0">
                    <h3 className="font-kenao text-[9px] text-[#2D4B73] uppercase tracking-wider font-bold">Resumen Informativo</h3>
                  </div>

                  {/* Section Title: Avisos Destacados */}
                  <div className="shrink-0 mb-1 flex items-center gap-1.5 text-left justify-start">
                    <span className="w-1.5 h-1.5 bg-[#D9B70D] rounded-full"></span>
                    <h4 className="font-kenao text-[8px] text-[#2D4B73] font-bold uppercase tracking-wider">Avisos Destacados</h4>
                  </div>

                  {/* The 3 slots stacked vertically with equal distribution inside the 550px viewport */}
                  <div className="grid grid-rows-3 gap-2 flex-grow min-h-0 py-0.5">
                    {/* Slot 1 (Tercio 1) */}
                    <div className="min-h-0">
                      <Slot1 />
                    </div>

                    {/* Slot 2 (Tercio 2) */}
                    <div className="min-h-0">
                      <Slot2 />
                    </div>

                    {/* Slot 3 (Tercio 3) - Either Nuestra Vida or articles 5/6 */}
                    <div className="min-h-0">
                      <Slot3 />
                    </div>
                  </div>
                </div>

                {/* Page Footer */}
                <div className="border-t border-slate-100 pt-1.5 flex justify-between items-center text-[7.5px] text-slate-400 font-bold uppercase tracking-wider mt-2 shrink-0">
                  <span>{formattedDisplayDate}</span>
                  <span>Pág. 3 / 4</span>
                </div>
              </div>
            );
          };

          const Page4Content = () => {
            const showNuestraVidaOnPage4 = articles.length >= 5;

            return (
              <div className="flex flex-col h-full bg-white relative overflow-hidden select-none">
                {/* 40% Space: Section Nuestra Vida como Iglesia if pushed here */}
                {showNuestraVidaOnPage4 ? (
                  <>
                    <div className="h-[40%] p-4 pb-3 bg-white shrink-0 flex flex-col justify-center">
                      <NuestraVidaSection />
                    </div>
                    {/* Divider spacing */}
                    <div className="h-[1px] bg-slate-100 shrink-0 w-full"></div>
                  </>
                ) : null}

                {/* 60% or 100% Space: Big Blue Strip */}
                <div className={`bg-[#2D4B73] text-white flex-grow flex flex-col justify-center items-center text-center relative ${
                  showNuestraVidaOnPage4 ? 'h-[59%]' : 'h-full py-12 px-6'
                }`}>
                  <div className="space-y-4 w-full max-w-xs mx-auto flex flex-col items-center">
                    {/* Centered White Logo */}
                    <img src="/images/Logotipo%20Blanco.png" alt="Huelva Church Logo" className="max-h-10 object-contain block mx-auto" />
                    
                    {/* Small Divider */}
                    <div className="w-12 h-[1px] bg-white/30 mx-auto"></div>
                    
                    {/* Social Network Icons horizontally matching Contacto layout */}
                    <div className="flex gap-3 justify-center pt-1.5">
                      <a 
                        href="https://www.instagram.com/huelvachurch/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white hover:bg-[#D9B70D] hover:text-[#2D4B73] transition-all border border-white/5 shadow-sm"
                        title="Instagram"
                      >
                        <Instagram className="w-4 h-4 shrink-0" />
                      </a>

                      <a 
                        href="https://www.facebook.com/huelvachurch" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white hover:bg-[#D9B70D] hover:text-[#2D4B73] transition-all border border-white/5 shadow-sm"
                        title="Facebook"
                      >
                        <Facebook className="w-4 h-4 shrink-0" />
                      </a>

                      <a 
                        href="https://www.youtube.com/@huelvachurch" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white hover:bg-[#D9B70D] hover:text-[#2D4B73] transition-all border border-white/5 shadow-sm"
                        title="YouTube"
                      >
                        <Youtube className="w-4 h-4 shrink-0" />
                      </a>

                      <a 
                        href="https://chat.whatsapp.com/KYIoRdfL0lI5TlKKW5o8nN" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white hover:bg-[#D9B70D] hover:text-[#2D4B73] transition-all border border-white/5 shadow-sm"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 shrink-0" />
                      </a>
                    </div>

                    {/* Address below social networks */}
                    <p className="text-[8.5px] text-slate-350 leading-normal pt-1">
                      Calle Los Marismeños, 6, Huelva
                    </p>
                  </div>
                </div>
              </div>
            );
          };

          return (
            <>
              {/* DIGITAL INTERACTIVE BOOKLET (VISIBLE ON SCREEN, HIDDEN ON PRINT) */}
              <div className="no-print w-full max-w-5xl mx-auto px-4 pb-16 flex flex-col items-center">
                {/* Booklet Case */}
                <div className="relative w-full overflow-hidden select-none mb-8 py-4">
                  <div className="flex justify-center items-stretch min-h-[550px]">
                    <AnimatePresence mode="wait">
                      {isMobile ? (
                        /* Mobile single sheet view with swipe/slide transitions */
                        <motion.div
                          key={`mobile-page-${currentPage}`}
                          initial={{ opacity: 0, x: 25 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -25 }}
                          transition={{ duration: 0.2 }}
                          className="w-full max-w-[340px] h-[550px] relative"
                        >
                          <InteractivePageTurn
                            className="w-full h-full"
                            pageStyle={`w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col justify-between h-full relative ${
                              (currentPage === 1 || currentPage === 4) ? 'p-0' : 'p-6'
                            }`}
                            hasCornerNext={currentPage < 4}
                            hasCornerPrev={currentPage > 1}
                            onFlipNext={handleNext}
                            onFlipPrev={handlePrev}
                          >
                            {currentPage === 1 && <Page1Content />}
                            {currentPage === 2 && <Page2Content />}
                            {currentPage === 3 && <Page3Content />}
                            {currentPage === 4 && <Page4Content />}
                          </InteractivePageTurn>
                        </motion.div>
                      ) : (
                        /* Desktop Book Spread Layout */
                        currentPage === 1 ? (
                          /* Page 1 (Front Cover, closed) */
                          <motion.div
                            key="desktop-cover"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="w-[380px] h-[550px] relative"
                          >
                            <InteractivePageTurn
                              className="w-full h-full"
                              pageStyle="w-full h-full bg-white rounded-2xl shadow-2xl border border-slate-200/85 p-0 overflow-hidden flex flex-col justify-between text-left relative cursor-pointer hover:shadow-primary/5 transition-all group scale-100 hover:scale-[1.005]"
                              hasCornerNext={true}
                              onFlipNext={handleNext}
                            >
                              <Page1Content />
                            </InteractivePageTurn>
                          </motion.div>
                        ) : currentPage === 4 ? (
                          /* Page 4 (Back Cover, closed) */
                          <motion.div
                            key="desktop-back-cover"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="w-[380px] h-[550px] relative"
                          >
                            <InteractivePageTurn
                              className="w-full h-full"
                              pageStyle="w-full h-full bg-[#2D4B73] rounded-2xl shadow-2xl border border-slate-700/50 p-0 overflow-hidden flex flex-col justify-between relative cursor-pointer hover:shadow-primary/5 transition-all group scale-100 hover:scale-[1.005]"
                              hasCornerPrev={true}
                              onFlipPrev={handlePrev}
                            >
                              <Page4Content />
                            </InteractivePageTurn>
                          </motion.div>
                        ) : (
                          /* Open Inner Pages 2 & 3 side-by-side with a physical binding shadow */
                          <motion.div
                            key="desktop-spread"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="w-[760px] h-[550px] flex shadow-2xl rounded-2xl overflow-hidden border border-slate-200/85 bg-white relative"
                          >
                            <InteractivePageTurn
                              className="w-1/2 h-full"
                              pageStyle="p-9 pr-11 text-left bg-white h-full pointer-events-auto cursor-pointer"
                              hasCornerPrev={true}
                              onFlipPrev={handlePrev}
                            >
                              <Page2Content />
                            </InteractivePageTurn>
 
                            {/* Center Spine Crease Simulation */}
                            <div className="absolute left-1/2 top-0 bottom-0 w-[40px] -translate-x-1/2 pointer-events-none flex select-none z-25">
                              <div className="w-1/2 bg-gradient-to-r from-transparent via-black/[0.08] to-transparent"></div>
                              <div className="w-[1px] bg-slate-200/80 h-full"></div>
                              <div className="w-1/2 bg-gradient-to-l from-transparent via-black/[0.08] to-transparent"></div>
                            </div>
 
                            <InteractivePageTurn
                              className="w-1/2 h-full"
                              pageStyle="p-9 pl-11 text-left bg-white h-full pointer-events-auto cursor-pointer"
                              hasCornerNext={true}
                              onFlipNext={handleNext}
                            >
                              <Page3Content />
                            </InteractivePageTurn>
                          </motion.div>
                        )
                      )}
                    </AnimatePresence>
                  </div>
                </div>
 
                {/* Micro controller console bars - circular arrows only, everything else removed */}
                <div className="flex items-center gap-5 mt-2 no-print select-none">
                  <button
                    onClick={handlePrev}
                    disabled={currentPage === 1}
                    className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
                      currentPage === 1 
                        ? 'border-slate-100 text-slate-300 pointer-events-none bg-slate-50' 
                        : 'border-slate-200 text-primary bg-white hover:bg-slate-50 shadow-sm cursor-pointer hover:border-primary/30'
                    }`}
                    title="Anterior"
                  >
                    <ChevronLeft className="w-5 h-5 shrink-0 -translate-x-[0.5px]" />
                  </button>
 
                  <button
                    onClick={handleNext}
                    disabled={currentPage === 4}
                    className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
                      currentPage === 4 
                        ? 'border-slate-100 text-slate-300 pointer-events-none bg-slate-50' 
                        : 'border-slate-200 text-primary bg-white hover:bg-slate-50 shadow-sm cursor-pointer hover:border-primary/30'
                    }`}
                    title="Siguiente"
                  >
                    <ChevronRight className="w-5 h-5 shrink-0 translate-x-[0.5px]" />
                  </button>
                </div>
              </div>
 
              {/* PRINT LAYOUT: 4 sequential A4 pages, hidden on screen, formatted perfectly for print exports */}
              <div className="print-magazine hidden print:flex flex-col gap-12 max-w-[210mm] mx-auto pb-12 select-none">
                <div className="print-page-A4 bg-white shadow-xl border border-slate-200 mx-auto text-left" style={{ padding: 0, overflow: 'hidden' }}>
                  <Page1Content />
                </div>
                <div className="print-page-A4 bg-white shadow-xl border border-slate-200 p-12 mx-auto text-left">
                  <Page2Content />
                </div>
                <div className="print-page-A4 bg-white shadow-xl border border-slate-200 p-12 mx-auto text-left">
                  <Page3Content />
                </div>
                <div className="print-page-A4 bg-white shadow-xl border border-slate-200 mx-auto text-left overflow-hidden" style={{ padding: 0 }}>
                  <Page4Content />
                </div>
              </div>
            </>
          );
        })()
      ) : (
        /* ==================== SPECIAL ANNOUNCEMENT FORMAT ==================== */
        viewMode === 'web' ? (
          /* DIGITAL RESPONSIVE VIEW (SPECIAL) */
          <div className="max-w-2xl mx-auto px-4 space-y-8 no-print text-left">
            
            {/* Header with logo */}
            <div className="bg-primary rounded-3xl p-8 md:p-10 text-center text-white relative overflow-hidden shadow-md">
              <img src="/images/Logotipo%20Blanco.png" alt="Huelva Church" className="max-h-12 mx-auto mb-3" />
              <p className="text-[10px] uppercase font-extrabold tracking-widest text-[#D9B70D] font-mono">Boletín Oficial • Comunicado Especial</p>
            </div>

            {/* Campaign content body */}
            <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200/60 shadow-sm relative">
              <span className="text-[#D9B70D] text-[10px] font-extrabold uppercase tracking-widest block mb-1">Importante</span>
              <h2 className="font-kenao text-xl md:text-2xl text-primary font-bold mb-6 leading-tight border-b border-slate-100 pb-4">
                {campaign.subject}
              </h2>
              
              {/* Formatted body */}
              <div className="prose max-w-none text-slate-600 text-sm leading-relaxed space-y-4">
                {campaign.config?.specialContent ? (
                  formatSpecialContent(campaign.config.specialContent)
                ) : (
                  <p>No hay contenido registrado para este comunicado.</p>
                )}
              </div>

              {/* Primary call to action button */}
              {campaign.config?.specialButtonText && campaign.config?.specialButtonUrl && (
                <div className="mt-8 text-center border-t border-slate-100 pt-6">
                  <a 
                    href={campaign.config.specialButtonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-primary hover:bg-secondary hover:text-primary text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-md uppercase text-xs tracking-wider cursor-pointer"
                  >
                    {campaign.config.specialButtonText} <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>

            {/* Simple footer */}
            <div className="text-center text-[11px] text-slate-400">
              <p className="font-bold text-slate-500">Huelva Church</p>
              <p>Calle de Los Marismeños, 6, Huelva</p>
            </div>

          </div>
        ) : (
          /* MAGAZINE CARD PRINTABLE FORMAT (SPECIAL) */
          <div className="print-magazine flex flex-col gap-12 max-w-[210mm] mx-auto pb-12 select-none">
            
            {/* PAGE 1: Introducción & Special details */}
            <div className="print-page-A4 bg-white shadow-xl border border-slate-200 p-12 md:p-14 rounded-2xl mx-auto flex flex-col justify-between text-left">
              <div>
                <div className="flex justify-between items-center border-b-2 border-primary/10 pb-6 mb-6">
                  <img src="/images/Logotipo%20Blanco.png" alt="Huelva Church" className="max-h-12 bg-primary px-3 py-1.5 rounded-xl block shadow-sm" />
                  <div className="text-right">
                    <p className="font-kenao text-sm text-[#D9B70D] font-bold tracking-wider uppercase">Comunicado Único</p>
                    <p className="text-[10px] font-mono text-slate-400 uppercase font-bold">Especial</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] uppercase font-mono font-bold text-[#D9B70D] tracking-widest block">Aviso Oficial a la Membresía</span>
                  <h2 className="font-kenao text-xl md:text-2xl text-primary font-bold leading-snug border-b border-slate-100 pb-3">{campaign.subject}</h2>
                  
                  <div className="prose max-w-none text-slate-600 text-xs leading-relaxed space-y-3.5">
                    {campaign.config?.specialContent && formatSpecialContent(campaign.config.specialContent)}
                  </div>
                </div>
              </div>

              {/* Action Button Info */}
              {campaign.config?.specialButtonText && (
                <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Acción Recomendada</span>
                    <h4 className="text-xs font-bold text-primary font-gordita">{campaign.config.specialButtonText}</h4>
                  </div>
                  <span className="text-[10px] font-bold bg-primary text-white border border-primary/20 px-3 py-1.5 rounded-lg uppercase tracking-wider block">Escanea o haz clic en la versión web</span>
                </div>
              )}

              {/* Page Numbering */}
              <div className="border-t border-slate-150 pt-4 flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Comunicación Extraordinaria • Huelva</span>
                <span>Página 1 de 2</span>
              </div>
            </div>

            {/* PAGE 2: Nuestra Vida de Iglesia & Redes Sociales */}
            <div className="print-page-A4 print-page-A4-last bg-white shadow-xl border border-slate-200 p-12 md:p-14 rounded-2xl mx-auto flex flex-col justify-between text-left">
              <div>
                <div className="flex justify-between items-center border-b-2 border-primary/10 pb-6 mb-6">
                  <h3 className="font-kenao text-2xl text-primary font-bold tracking-wide uppercase">Apéndice Congregacional</h3>
                  <p className="text-[10px] text-slate-400 font-mono text-right uppercase font-bold">Vida e Iglesia</p>
                </div>

                {/* Main corporate services */}
                <div className="mb-6 space-y-4">
                  <h3 className="font-kenao text-xl text-primary border-b border-slate-100 pb-2 mb-4 font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-primary rounded-full"></span> Servicios e Información Permanente
                  </h3>

                  <div className="grid grid-cols-1 gap-3.5">
                    <div className="bg-slate-50 border border-slate-200/80 p-4.5 rounded-2xl flex gap-4 items-center">
                      <div className="w-10 h-10 rounded-full bg-primary/5 text-primary border border-primary/10 flex items-center justify-center font-bold text-center">
                        🏠
                      </div>
                      <div>
                        <h4 className="font-kenao text-sm text-primary font-bold">La Red de Células de Huelva</h4>
                        <p className="text-xs text-slate-500">Únete a nuestra comunión semanal en hogares de la comarca llamando a las oficinas centrales o a tu líder.</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 p-4.5 rounded-2xl flex gap-4 items-center">
                      <div className="w-10 h-10 rounded-full bg-primary/5 text-primary border border-primary/10 flex items-center justify-center font-bold text-center">
                        🙏
                      </div>
                      <div>
                        <h4 className="font-kenao text-sm text-primary font-bold">Reunión de Ruego y Oración</h4>
                        <p className="text-xs text-slate-500">Cada noche de lunes a jueves nos unimos a las 23:00h para clamar juntos vía Google Meet (qhu-fktd-ejh).</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Networks info */}
                <div className="mt-8">
                  <h3 className="font-kenao text-lg text-primary border-b border-slate-100 pb-2 mb-4 font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-[#D9B70D] rounded-full"></span> Redes de Comunicación huelva
                  </h3>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-bold text-sm">📸 Instagram:</span>
                      <span className="text-xs text-slate-500">@huelvachurch</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-bold text-sm">📺 YouTube:</span>
                      <span className="text-xs text-slate-500">@huelvachurch</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page Numbering */}
              <div className="border-t border-slate-150 pt-4 flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Comunicación Extraordinaria • Huelva</span>
                <span>Página 2 de 2</span>
              </div>
            </div>

          </div>
        )
      )}

    </div>
  );
}
