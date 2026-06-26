import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'motion/react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
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
  Pause,
  Volume2,
  VolumeX,
  ArrowRight,
  Video
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useGlobalSettings } from '../utils/useSettings';
import { getOptimizedImageUrl } from '../utils/drive';

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
  const { t, i18n } = useTranslation();
  const { meetingTime } = useGlobalSettings();
  const currentLang = i18n.language.substring(0, 2);

  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
  const [prayerStatus, setPrayerStatus] = useState({ status: 'inactive', textKey: 'home.prayerStatusInactive' });

  const [subEmail, setSubEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subSuccess, setSubSuccess] = useState(false);
  const [subError, setSubError] = useState('');

  // Audio state for native live streaming
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [playerError, setPlayerError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamUrl = "https://servidor36-2.brlogic.com:7028/live?identifier=Streaming%20del%20sitio%20web&source=6408";

  const handlePlayPause = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(streamUrl);
      audioRef.current.crossOrigin = "anonymous";
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setPlayerError(false);
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("Audio playback error:", err);
          setPlayerError(true);
          setIsPlaying(false);
        });
    }
  };

  const handleMuteToggle = () => {
    if (audioRef.current) {
      const nextMuted = !isMuted;
      audioRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val > 0 && isMuted) {
        audioRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail.trim()) return;
    setSubscribing(true);
    setSubError('');
    try {
      await addDoc(collection(db, 'subscribers'), {
        email: subEmail.toLowerCase().trim(),
        active: true,
        subscribedAt: serverTimestamp()
      });

      setSubSuccess(true);
      setSubEmail('');
    } catch (err) {
      console.error(err);
      setSubError('Error al completar la suscripción. Inténtalo de nuevo.');
    } finally {
      setSubscribing(false);
    }
  };

  useEffect(() => {
    const checkPrayerStatus = () => {
      const now = new Date();
      try {
        const huelvasTimeString = now.toLocaleString("en-US", { timeZone: "Europe/Madrid" });
        const huelvaDate = new Date(huelvasTimeString);
        
        const dayOfWeek = huelvaDate.getDay(); // 0 is Sunday, 1 is Monday, ..., 4 is Thursday, 5 is Friday, 6 is Saturday
        const hours = huelvaDate.getHours();
        const minutes = huelvaDate.getMinutes();
        const totalMinutes = hours * 60 + minutes;
        
        const isPrayerDay = dayOfWeek >= 1 && dayOfWeek <= 4; // Monday to Thursday
        
        // Start: 23:00 = 1380
        // End: 23:30 = 1410
        // Soon reminder: 22:30 = 1350
        
        if (!isPrayerDay) {
          setPrayerStatus({ status: 'inactive', textKey: 'home.prayerStatusInactive' });
          return;
        }
        
        if (totalMinutes >= 1380 && totalMinutes < 1410) {
          setPrayerStatus({ status: 'active', textKey: 'home.prayerStatusActive' });
        } else if (totalMinutes >= 1350 && totalMinutes < 1380) {
          setPrayerStatus({ status: 'soon', textKey: 'home.prayerStatusSoon' });
        } else {
          setPrayerStatus({ status: 'inactive', textKey: 'home.prayerStatusInactive' });
        }
      } catch (e) {
        console.error("Error setting prayer status:", e);
        const dayOfWeek = now.getDay();
        const isPrayerDay = dayOfWeek >= 1 && dayOfWeek <= 4;
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const totalMinutes = hours * 60 + minutes;
        if (!isPrayerDay) {
          setPrayerStatus({ status: 'inactive', textKey: 'home.prayerStatusInactive' });
          return;
        }
        if (totalMinutes >= 1380 && totalMinutes < 1410) {
          setPrayerStatus({ status: 'active', textKey: 'home.prayerStatusActive' });
        } else if (totalMinutes >= 1350 && totalMinutes < 1380) {
          setPrayerStatus({ status: 'soon', textKey: 'home.prayerStatusSoon' });
        } else {
          setPrayerStatus({ status: 'inactive', textKey: 'home.prayerStatusInactive' });
        }
      }
    };

    checkPrayerStatus();
    const interval = setInterval(checkPrayerStatus, 30000);
    return () => clearInterval(interval);
  }, []);
  const [latestVideo, setLatestVideo] = useState<any>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);

  useEffect(() => {
    const fetchLatestVideo = async () => {
      try {
        const res = await axios.get('/api/youtube/latest');
        if (res.data && res.data.id) {
          setLatestVideo({
            id: res.data.id,
            title: res.data.title,
            thumbnail: res.data.thumbnail
          });
        }
      } catch (error) {
        console.error("Error fetching YouTube video:", error);
      } finally {
        setIsLoadingVideo(false);
      }
    };

    fetchLatestVideo();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'posts'), 
      where('featured', '==', true),
      orderBy('publishedAt', 'desc'),
      limit(6) // Fetch a few more to safely filter out drafts client-side
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setFeaturedPosts(postsData.filter(p => (p as any).status !== 'draft').slice(0, 3));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return () => unsubscribe();
  }, []);

  const [contactData, setContactData] = useState({ name: '', email: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoSubject = encodeURIComponent(`[Contacto Web] Mensaje de ${contactData.name}`);
    const mailtoBody = encodeURIComponent(
      `Nombre: ${contactData.name}\n` +
      `Email: ${contactData.email}\n\n` +
      `Mensaje:\n${contactData.message}`
    );
    window.location.href = `mailto:huelvachurch@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactData({ name: '', email: '', message: '' });
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-gordita text-primary">
      <Helmet>
        <title>Huelva Church - Iglesia Cristiana Evangélica en Huelva</title>
        <meta name="description" content="Bienvenido a Huelva Church (Iglesia Bautista de Huelva), una Iglesia Cristiana Evangélica en Huelva. Descubre nuestro horario, eventos y ministerios." />
      </Helmet>
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
              <h2 className="text-secondary tracking-wider uppercase text-sm mb-3">{t('home.welcomeTag')}</h2>
              <h3 className="text-4xl md:text-5xl font-kenao text-primary mb-6 leading-tight">
                {t('home.welcomeTitle')}
              </h3>
              <p className="text-primary/80 text-lg mb-6 leading-relaxed">
                {t('home.welcomeDesc1')}
              </p>
              <p 
                className="text-primary/80 text-lg mb-6 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: t('home.welcomeDesc2') }}
              ></p>
              <p className="text-primary/80 text-lg mb-8 leading-relaxed">
                {t('home.welcomeDesc3')}
              </p>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-kenao text-xl text-primary">{t('home.loveActionTitle')}</h4>
                  <p className="text-primary/60 text-sm">{t('home.loveActionDesc')}</p>
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
                  src="/images/Imagen Bienvenida.png" 
                  alt="Bienvenido a casa" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-white p-6 rounded-xl shadow-xl max-w-xs hidden md:block border-t-4 border-secondary">
                <p className="font-kenao text-2xl text-primary mb-2">{t('home.verseText')}</p>
                <p className="text-secondary text-sm font-medium uppercase tracking-wider">{t('home.verseRef')}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Celebraciones - First Visit */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl">
              <h3 className="text-3xl font-kenao mb-2">{t('home.firstVisitTitle')}</h3>
              <p className="text-white/80 text-lg leading-relaxed">{t('home.firstVisitDesc')}</p>
            </div>
            
            {/* Card: Reunión Presencial */}
            <div className="flex items-center space-x-4 bg-white/10 p-6 rounded-2xl backdrop-blur-sm border border-white/10 shrink-0 w-full md:w-auto min-w-[280px]">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-secondary uppercase tracking-wider font-bold mb-1">{t('home.mainMeeting')}</p>
                <p className="text-xl font-kenao leading-tight">{meetingTime}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Noches de Oración - Virtual prayer gatherings */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`border p-8 md:p-12 rounded-3xl flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden transition-all duration-300 bg-slate-50 ${
            prayerStatus.status === 'active'
              ? 'border-emerald-200 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/10'
              : prayerStatus.status === 'soon'
              ? 'border-amber-200 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/10'
              : 'border-slate-100'
          }`}>
            {/* Live Indicator tag */}
            <div className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold border tracking-wider uppercase transition-all duration-300 ${
              prayerStatus.status === 'active' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm' 
                : prayerStatus.status === 'soon'
                ? 'bg-amber-50 text-amber-700 border-amber-100 shadow-sm'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                prayerStatus.status === 'active' 
                  ? 'bg-emerald-500 animate-pulse' 
                  : prayerStatus.status === 'soon'
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-slate-400'
              }`}></span>
              <span>{t(prayerStatus.textKey)}</span>
            </div>
            
            <div className="max-w-2xl">
              <span className="text-secondary text-xs font-bold uppercase tracking-widest block mb-2">
                {t('home.prayerNightsTitle')}
              </span>
              <h3 className="text-3xl md:text-4xl font-kenao text-primary mb-4">
                {t('home.prayerNightsTitle')}
              </h3>
              <p className="text-primary/70 text-base md:text-lg leading-relaxed">
                {t('home.prayerNightsDesc')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 shrink-0 w-full lg:w-auto">
              <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-primary/40 uppercase tracking-wider font-bold">{t('home.prayerNightsTitle')}</p>
                  <p className="text-base font-bold text-primary">{t('home.prayerNightsTime')}</p>
                </div>
              </div>

              <a 
                href="https://meet.google.com/qhu-fktd-ejh"
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold transition-all shadow-md hover:shadow-lg uppercase tracking-wider ${
                  prayerStatus.status === 'active'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : prayerStatus.status === 'soon'
                    ? 'bg-amber-500 text-primary hover:bg-amber-600'
                    : 'bg-secondary text-primary hover:bg-primary hover:text-white'
                }`}
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                {t('home.prayerNightsBtn')}
              </a>
            </div>
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
                <h2 className="text-secondary tracking-wider uppercase text-sm font-medium">{t('home.liveTag')}</h2>
              </div>
              <h3 className="text-4xl font-kenao text-primary mb-6">{t('home.liveTitle')}</h3>
              <p className="text-primary/80 text-lg mb-8 leading-relaxed">
                {t('home.liveDesc')}
              </p>
              <div className="flex flex-wrap gap-4">
                <a 
                  href="https://www.youtube.com/@huelvachurch/streams" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-red-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg shadow-red-600/20"
                >
                  <Play className="w-5 h-5 fill-current" />
                  {t('home.liveBtn')}
                </a>
                <a 
                  href="https://www.youtube.com/@huelvachurch" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white text-primary border-2 border-slate-100 px-8 py-4 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                >
                  {t('home.subscribeBtn')}
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
                {latestVideo ? (
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${latestVideo.id}`}
                    title={latestVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <>
                    <img 
                      src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=1000" 
                      alt="YouTube Stream Preview" 
                      className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <a 
                        href="https://www.youtube.com/@huelvachurch/streams" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform"
                      >
                        <Play className="w-8 h-8 fill-current ml-1" />
                      </a>
                    </div>
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10">
                        <p className="text-white font-medium">{t('home.latestStream')}</p>
                        <p className="text-white/70 text-sm">{t('home.latestStreamDesc')}</p>
                      </div>
                    </div>
                  </>
                )}
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
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 p-6 sm:p-12 lg:p-20 items-center">
              <div>
                <h2 className="text-secondary tracking-wider uppercase text-sm font-bold mb-4">{t('home.cellsTag')}</h2>
                <h3 className="text-4xl md:text-5xl font-kenao text-white mb-6">{t('home.cellsTitle')}</h3>
                <p className="text-white/80 text-lg mb-8 leading-relaxed">
                  {t('home.cellsDesc')}
                </p>
                <a 
                  href="https://www.huelvachurch.com/celulas" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-secondary text-primary px-8 py-4 rounded-xl font-bold hover:bg-[#c2a30b] transition-all transform hover:-translate-y-1 shadow-lg shadow-secondary/20"
                >
                  {t('home.cellsBtn')} <ChevronRight className="w-5 h-5 ml-2" />
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                    <Users className="w-8 h-8 text-secondary mb-4" />
                    <h4 className="text-white font-kenao text-xl mb-1">{t('home.cellsCommunity')}</h4>
                    <p className="text-white/60 text-sm">{t('home.cellsCommunityDesc')}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                    <BookOpen className="w-8 h-8 text-secondary mb-4" />
                    <h4 className="text-white font-kenao text-xl mb-1">{t('home.cellsGrowth')}</h4>
                    <p className="text-white/60 text-sm">{t('home.cellsGrowthDesc')}</p>
                  </div>
                </div>
                <div className="space-y-4 sm:mt-8 mt-0">
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                    <Heart className="w-8 h-8 text-secondary mb-4" />
                    <h4 className="text-white font-kenao text-xl mb-1">{t('home.cellsCare')}</h4>
                    <p className="text-white/60 text-sm">{t('home.cellsCareDesc')}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                    <MapPin className="w-8 h-8 text-secondary mb-4" />
                    <h4 className="text-white font-kenao text-xl mb-1">{t('home.cellsClose')}</h4>
                    <p className="text-white/60 text-sm">{t('home.cellsCloseDesc')}</p>
                  </div>
                </div>
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
              <h2 className="text-secondary tracking-wider uppercase text-sm mb-3">{t('home.activitiesTag')}</h2>
              <h3 className="text-4xl font-kenao text-primary">{t('home.activitiesTitle')}</h3>
            </div>
            <Link to="/avisos" className="hidden md:flex items-center text-secondary hover:text-primary transition-colors font-medium">
              {t('home.activitiesViewAll')} <ChevronRight className="w-5 h-5 ml-1" />
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
                <div className="h-56 overflow-hidden relative bg-slate-100 flex items-center justify-center">
                  {post.imageUrl ? (
                    <img 
                      src={getOptimizedImageUrl(post.imageUrl)} 
                      alt={(post as any)[`title_${currentLang}`] || post.title} 
                      className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500"
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
                    {post.publishedAt?.toDate ? post.publishedAt.toDate().toLocaleDateString() : t('home.recent')}
                  </div>
                  <h4 className="text-xl font-kenao text-primary mb-3 group-hover:text-secondary transition-colors">{(post as any)[`title_${currentLang}`] || post.title}</h4>
                  <p className="text-primary/70 leading-relaxed mb-6 flex-grow">
                    {(post as any)[`excerpt_${currentLang}`] || post.excerpt}
                  </p>
                  <Link to={`/avisos/${post.id}`} className="flex items-center text-primary font-semibold hover:text-secondary transition-colors group/btn">
                    {t('common.readMore')} <ArrowRight className="w-4 h-4 ml-2 transform group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-12 text-center md:hidden">
            <Link to="/avisos" className="inline-flex items-center text-secondary font-medium">
              {t('home.activitiesViewAll')} <ChevronRight className="w-5 h-5 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Subscription Section */}
      <section className="py-20 bg-primary relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-950/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2.5 bg-secondary/20 border border-secondary/30 px-4 py-1.5 rounded-full text-secondary text-xs font-bold uppercase tracking-wider">
              <Mail className="w-4 h-4" />
              <span>Boletín de Noticias</span>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl font-kenao text-white">Únete a nuestro boletín semanal</h2>
              <p className="text-white/70 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
                Recibe semanalmente los avisos destacados, recordatorios de la reunión de domingo, actividades especiales y la vida de nuestra iglesia directamente en tu buzón de correo.
              </p>
            </div>

            {subSuccess ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-secondary/10 border border-secondary/20 p-6 rounded-2xl max-w-md mx-auto"
              >
                <span className="text-2xl">🎉</span>
                <h4 className="text-white font-bold text-lg mt-2 font-kenao">¡Suscrito con éxito!</h4>
                <p className="text-white/60 text-xs mt-1">Gracias por unirte a nuestro boletín. Te mantendremos informado.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleNewsletterSubscribe} className="max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="email" 
                    required
                    value={subEmail}
                    onChange={(e) => setSubEmail(e.target.value)}
                    placeholder="Introduce tu correo electrónico" 
                    className="flex-grow px-5 py-4 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 outline-none focus:ring-2 focus:ring-secondary focus:border-transparent text-sm transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={subscribing}
                    className="bg-secondary text-primary font-bold px-6 py-4 rounded-xl hover:bg-[#c2a30b] transition-all text-xs uppercase tracking-wider shrink-0 duration-300 flex items-center justify-center gap-2"
                  >
                    {subscribing ? (
                      <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>Suscribirme</span>
                    )}
                  </button>
                </div>
                {subError && <p className="text-red-400 text-xs mt-3 text-left">{subError}</p>}
                <p className="text-[10px] text-white/40 mt-3 leading-tight">
                  Al suscribirte, aceptas recibir comunicaciones de Huelva Church. Tu privacidad es sagrada y puedes darte de baja en cualquier momento.
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      {/* Radio & App Section */}
      <section id="radio" className="py-24 bg-slate-50 font-gordita">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Live Streaming Deck */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1 bg-[#2D4B73] text-white rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col justify-between shadow-2xl border border-[#2D4B73]/10 min-h-[420px]"
            >
              {/* Ambient Background Glow */}
              <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-[#D9B70D]/10 blur-2xl pointer-events-none" />
              
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-300 font-bold bg-white/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full bg-emerald-400 ${isPlaying ? 'animate-ping' : ''}`} />
                    {isPlaying ? 'AL AIRE' : 'CONECTAR SEÑAL'}
                  </span>
                  <span className="text-xs text-[#D9B70D] font-mono font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D9B70D]" /> Directo
                  </span>
                </div>

                <div className="flex items-center gap-5 my-6">
                  <div className="relative">
                    <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-inner">
                      <Radio className={`w-8 h-8 text-[#D9B70D] ${isPlaying ? 'scale-110 rotate-3' : ''} transition-all`} />
                    </div>
                    {isPlaying && (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D9B70D] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-[#D9B70D]"></span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-gordita font-bold text-2xl text-white">Reproductor en Vivo</h4>
                    <p className="text-xs text-slate-300 font-gordita mt-0.5">Señal de alta fidelidad 128kbps</p>
                  </div>
                </div>

                {/* Sound Wave Animation if playing */}
                <div className="h-12 flex items-end justify-center gap-1 my-6 px-4">
                  {Array.from({ length: 16 }).map((_, idx) => (
                    <motion.div
                      key={idx}
                      className="w-1 bg-[#D9B70D] rounded-full"
                      animate={{
                        height: isPlaying 
                          ? [12, Math.floor(Math.random() * 32) + 12, 12] 
                          : 8
                      }}
                      transition={{
                        duration: isPlaying ? (0.5 + idx * 0.05) : 0,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>

                {playerError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2 mb-4">
                    <span className="text-rose-400">⚠️</span>
                    <span>Error al cargar el streaming. Intenta de nuevo.</span>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* Controls */}
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={handlePlayPause}
                    className="w-16 h-16 rounded-full bg-[#D9B70D] text-[#2D4B73] flex items-center justify-center hover:scale-105 active:scale-95 cursor-pointer shadow-lg transition-all focus:outline-none shrink-0"
                  >
                    {isPlaying ? (
                      <Pause className="w-7 h-7 text-[#2D4B73] fill-[#2D4B73]" />
                    ) : (
                      <Play className="w-7 h-7 text-[#2D4B73] fill-[#2D4B73] translate-x-0.5" />
                    )}
                  </button>

                  <div className="flex-grow flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl">
                    <button
                      onClick={handleMuteToggle}
                      className="text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-full accent-[#D9B70D] bg-white/20 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                  <span>FORMAT: MP3 STREAM</span>
                  <span>BITRATE: 128KBPS</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <h2 className="text-[#D9B70D] tracking-wider uppercase text-sm font-bold mb-4">{t('home.radioTag')}</h2>
              <h3 className="text-4xl font-gordita font-bold text-[#2D4B73] mb-6">{t('home.radioMainTitle')}</h3>
              <p className="text-[#2D4B73]/80 text-lg mb-8 leading-relaxed font-gordita">
                {t('home.radioDesc')}
              </p>
              <div className="space-y-6 font-gordita">
                <a 
                  href="https://www.radiohuelvachurch.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 group"
                >
                  <div className="w-12 h-12 bg-[#2D4B73]/10 rounded-xl flex items-center justify-center text-[#2D4B73] group-hover:bg-[#2D4B73] group-hover:text-white transition-colors">
                    <Radio className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#2D4B73]">{t('home.listenOnline')}</h4>
                    <p className="text-[#2D4B73]/60 text-sm">radiohuelvachurch.com</p>
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
                    <h4 className="font-bold text-[#2D4B73]">{t('home.downloadApp')}</h4>
                    <p className="text-[#2D4B73]/60 text-sm">{t('home.availablePlay')}</p>
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
            className="relative block rounded-[3rem] overflow-hidden group shadow-2xl bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] transition-transform hover:scale-[1.01] duration-500"
          >
            {/* Background Watermark Logo */}
            <div className="absolute -right-20 -bottom-20 opacity-10 pointer-events-none transform -rotate-12">
              <Instagram className="w-[500px] h-[500px] text-white" />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between p-12 lg:p-20 gap-12">
              <div className="text-white max-w-2xl">
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center shadow-inner">
                    <Instagram className="w-12 h-12 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white/80 tracking-wider uppercase text-xs font-bold mb-1">{t('home.instaTag')}</h2>
                    <h3 className="text-4xl md:text-5xl font-kenao">{t('home.instaTitle')}</h3>
                  </div>
                </div>
                <p className="text-xl md:text-2xl text-white/90 leading-relaxed font-medium">
                  {t('home.instaDesc')}
                </p>
              </div>
              
              <div className="flex-shrink-0 w-full lg:w-auto">
                <span className="w-full lg:w-auto inline-flex items-center justify-center gap-3 bg-white text-[#fd1d1d] px-12 py-6 rounded-2xl font-bold hover:bg-slate-50 transition-all transform hover:-translate-y-1 shadow-2xl text-xl">
                  {t('home.joinCommunity')} <ExternalLink className="w-6 h-6" />
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
              <h2 className="text-secondary tracking-wider uppercase text-sm font-bold mb-4">{t('home.cafeTag')}</h2>
              <h3 className="text-4xl md:text-5xl font-kenao text-primary mb-6">{t('home.cafeTitle')}</h3>
              <p className="text-primary/80 text-lg mb-8 leading-relaxed">
                {t('home.cafeDesc')}
              </p>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 inline-flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-primary/50 uppercase tracking-wider font-bold">{t('home.cafeScheduleTitle')}</p>
                  <p className="text-xl font-kenao text-primary">{t('home.cafeSchedule')}</p>
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
                  src="/images/Imagen Cafeteria.png" 
                  alt="Cafetería" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
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
                  src="/images/Imagen Libreria.png" 
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
              <h2 className="text-secondary tracking-wider uppercase text-sm font-bold mb-4">{t('home.libraryTag')}</h2>
              <h3 className="text-4xl md:text-5xl font-kenao text-primary mb-6">{t('home.libraryTitle')}</h3>
              <p className="text-primary/80 text-lg mb-8 leading-relaxed">
                {t('home.libraryDesc')}
              </p>
              <ul className="space-y-4 mb-8">
                {[t('home.libraryItem1'), t('home.libraryItem2'), t('home.libraryItem3'), t('home.libraryItem4')].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-primary/80">
                    <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-secondary font-bold text-lg">{t('home.libraryStand')}</p>
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
                  <span>{t('home.giveTag')}</span>
                </div>
                <h3 className="text-4xl md:text-5xl font-kenao text-white mb-6">{t('home.giveTitle')}</h3>
                <p className="text-white/70 text-lg mb-8 leading-relaxed max-w-2xl">
                  {t('home.giveDesc')}
                </p>
                <Link 
                  to="/dar" 
                  className="inline-flex items-center bg-white text-primary px-10 py-5 rounded-2xl font-bold hover:bg-secondary transition-all transform hover:-translate-y-1 shadow-xl"
                >
                  {t('home.giveBtn')} <Heart className="w-5 h-5 ml-2 text-red-500" />
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
      <section id="whatsapp" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.a 
            href="https://chat.whatsapp.com/KYIoRdfL0lI5TlKKW5o8nN"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative block rounded-[3rem] overflow-hidden group shadow-2xl bg-[#25D366] transition-transform hover:scale-[1.01] duration-500"
          >
            {/* Background Watermark Logo */}
            <div className="absolute -right-20 -bottom-20 opacity-10 pointer-events-none transform rotate-12">
              <MessageCircle className="w-[500px] h-[500px] text-white" />
            </div>
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between p-12 lg:p-20 gap-12">
              <div className="text-white max-w-2xl">
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center shadow-inner">
                    <MessageCircle className="w-12 h-12 text-white fill-current" />
                  </div>
                  <div>
                    <h2 className="text-white/80 tracking-wider uppercase text-xs font-bold mb-1">{t('home.wpTag')}</h2>
                    <h3 className="text-4xl md:text-5xl font-kenao">{t('home.wpTitle')}</h3>
                  </div>
                </div>
                <p className="text-xl md:text-2xl text-white/90 leading-relaxed font-medium">
                  {t('home.wpDesc')}
                </p>
              </div>
              
              <div className="flex-shrink-0 w-full lg:w-auto">
                <span className="w-full lg:w-auto inline-flex items-center justify-center gap-3 bg-white text-[#25D366] px-12 py-6 rounded-2xl font-bold hover:bg-slate-50 transition-all transform hover:-translate-y-1 shadow-2xl text-xl">
                  {t('home.wpBtn')} <ExternalLink className="w-6 h-6" />
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
              <h2 className="text-secondary tracking-wider uppercase text-sm mb-3">{t('home.contactTag')}</h2>
              <h3 className="text-4xl font-kenao text-primary mb-6">{t('home.contactTitle')}</h3>
              <p className="text-primary/80 text-lg mb-8">
                {t('home.contactDesc')}
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center mt-1">
                    <MapPin className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-primary">{t('home.contactAddress')}</h4>
                    <p className="text-primary/70">
                      <a 
                        href="https://maps.app.goo.gl/WPjd55a8XpctoAgS7" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:text-secondary underline decoration-dotted transition-colors"
                      >
                        {t('home.contactAddressVal1')}<br/>{t('home.contactAddressVal2')}
                      </a>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center mt-1">
                    <Phone className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-primary">{t('home.contactPhone')}</h4>
                    <p className="text-primary/70">(+34) 621 34 77 21</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center mt-1">
                    <Mail className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-primary">{t('home.contactEmail')}</h4>
                    <p className="text-primary/70">huelvachurch@gmail.com</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-2xl shadow-sm border border-slate-100 font-sans">
              <h4 className="text-2xl font-kenao text-primary mb-6">{t('home.contactSendMsg')}</h4>
              {contactSubmitted ? (
                <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-xl text-center">
                  <p className="font-bold text-lg mb-2">{t('home.contactFormGenerated')}</p>
                  <p className="text-sm mb-4">{t('home.contactFormGeneratedDesc')} <strong>huelvachurch@gmail.com</strong>.</p>
                  <p className="text-xs text-green-700">{t('home.contactFormGeneratedDesc2')}</p>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleContactSubmit}>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-primary/80 mb-1">{t('home.formName')}</label>
                    <input 
                      type="text" 
                      id="name" 
                      required
                      value={contactData.name}
                      onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all bg-white" 
                      placeholder={t('home.formNamePh')} 
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-primary/80 mb-1">{t('home.formEmail')}</label>
                    <input 
                      type="email" 
                      id="email" 
                      required
                      value={contactData.email}
                      onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all bg-white" 
                      placeholder="tu@email.com" 
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-primary/80 mb-1">{t('home.formMsg')}</label>
                    <textarea 
                      id="message" 
                      rows={4} 
                      required
                      value={contactData.message}
                      onChange={(e) => setContactData({ ...contactData, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all bg-white" 
                      placeholder={t('home.formMsgPh')}
                    ></textarea>
                  </div>
                  <button type="submit" className="w-full bg-secondary text-primary font-semibold py-3 px-4 rounded-lg hover:bg-[#c2a30b] transition-colors">
                    {t('home.formBtn')}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
