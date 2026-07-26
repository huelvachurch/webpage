import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useTranslation } from 'react-i18next';
import { getOptimizedImageUrl } from '../utils/drive';
import { 
  Calendar, 
  Award, 
  BookOpen, 
  ExternalLink, 
  Heart, 
  Sparkles, 
  Image as ImageIcon, 
  ChevronRight, 
  Filter, 
  Clock, 
  Flame, 
  User, 
  Smile, 
  ArrowUpRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface KidsProgram {
  id: string;
  teachingTitle: string;
  teachingLink: string;
  teacherId: string;
  teacherName: string;
  date: string;
}

interface KidsPhoto {
  id: string;
  url: string;
  dateTaken: string;
  uploadedById: string;
  uploadedByName: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  publishedAt: any;
  status?: 'published' | 'draft';
  isInfantil?: boolean;
  featured?: boolean;
  title_en?: string;
  excerpt_en?: string;
  title_pt?: string;
  excerpt_pt?: string;
}

export default function Ninos() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2);

  const [programs, setPrograms] = useState<KidsProgram[]>([]);
  const [photos, setPhotos] = useState<KidsPhoto[]>([]);
  const [news, setNews] = useState<Post[]>([]);
  
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);

  // Gallery Month Filter: Year-Month string (e.g. "2026-07")
  const [selectedMonth, setSelectedMonth] = useState<string>('Todas');

  useEffect(() => {
    // 1. Fetch Kids Sunday Programs
    const programsQuery = query(collection(db, 'kids_programs'), orderBy('date', 'asc'));
    const unsubscribePrograms = onSnapshot(programsQuery, (snapshot) => {
      const programsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as KidsProgram[];
      setPrograms(programsData);
      setLoadingPrograms(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'kids_programs');
      setLoadingPrograms(false);
    });

    // 2. Fetch Gallery Photos
    const photosQuery = query(collection(db, 'kids_photos'), orderBy('dateTaken', 'desc'));
    const unsubscribePhotos = onSnapshot(photosQuery, (snapshot) => {
      const photosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as KidsPhoto[];
      setPhotos(photosData);
      setLoadingPhotos(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'kids_photos');
      setLoadingPhotos(false);
    });

    // 3. Fetch Featured Kids Ministry Announcements/News
    const newsQuery = query(
      collection(db, 'posts'), 
      where('isInfantil', '==', true),
      orderBy('publishedAt', 'desc')
    );
    const unsubscribeNews = onSnapshot(newsQuery, (snapshot) => {
      const newsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setNews(newsData.filter(post => post.status !== 'draft'));
      setLoadingNews(false);
    }, (error) => {
      console.warn("Fallo al consultar avisos con indexes filtrados. Consultando todo y filtrando en cliente para evitar fallos de indexación:", error);
      // Fallback query matching standard order and filtering clientside to bypass potential indexing errors
      const fallbackQuery = query(collection(db, 'posts'), orderBy('publishedAt', 'desc'));
      const unsubFallback = onSnapshot(fallbackQuery, (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];
        const filtered = postsData.filter(p => p.isInfantil === true && p.status !== 'draft');
        setNews(filtered);
        setLoadingNews(false);
      }, () => {
        setLoadingNews(false);
      });
      return () => unsubFallback();
    });

    return () => {
      unsubscribePrograms();
      unsubscribePhotos();
      unsubscribeNews();
    };
  }, []);

  // Filter Sunday programs for the current month
  const getCurrentMonthPrograms = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const currentYearMonth = `${year}-${month}`;

    return programs.filter(prog => prog.date.startsWith(currentYearMonth));
  };

  const currentMonthPrograms = getCurrentMonthPrograms();

  // Get list of months present in photos to populate the filter dropdown
  const getPhotoMonths = () => {
    const monthsSet = new Set<string>();
    photos.forEach(photo => {
      if (photo.dateTaken) {
        // Expected format "YYYY-MM-DD" or similar, extract "YYYY-MM"
        const yearMonth = photo.dateTaken.substring(0, 7);
        if (yearMonth.match(/^\d{4}-\d{2}$/)) {
          monthsSet.add(yearMonth);
        }
      }
    });
    return Array.from(monthsSet).sort().reverse();
  };

  const availablePhotoMonths = getPhotoMonths();

  const filteredPhotos = selectedMonth === 'Todas' 
    ? photos 
    : photos.filter(photo => photo.dateTaken && photo.dateTaken.startsWith(selectedMonth));

  const formatYearMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-');
    const index = parseInt(month, 10) - 1;

    const monthsEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthsPt = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthsEs = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const months = currentLang === 'en' ? monthsEn : currentLang === 'pt' ? monthsPt : monthsEs;
    return `${months[index]} ${year}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const locale = currentLang === 'en' ? 'en-US' : currentLang === 'pt' ? 'pt-PT' : 'es-ES';
      return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getPostTitle = (post: Post) => {
    if (currentLang === 'en' && post.title_en) return post.title_en;
    if (currentLang === 'pt' && post.title_pt) return post.title_pt;
    return post.title;
  };

  const getPostExcerpt = (post: Post) => {
    if (currentLang === 'en' && post.excerpt_en) return post.excerpt_en;
    if (currentLang === 'pt' && post.excerpt_pt) return post.excerpt_pt;
    return post.excerpt;
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* 1. Colorful Promotional Hero Banner */}
      <div className="relative pt-32 pb-24 md:pb-32 overflow-hidden bg-gradient-to-b from-primary/10 via-secondary/5 to-slate-50">
        {/* Animated background bubbles/elements */}
        <div className="absolute top-1/4 left-10 w-24 h-24 rounded-full bg-secondary/10 blur-xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-36 h-36 rounded-full bg-primary/5 blur-2xl animate-bounce duration-[10s]" />
        <div className="absolute top-1/3 right-1/4 w-16 h-16 rounded-full bg-secondary/20 blur-lg animate-pulse duration-[4s]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Typography/Texts */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-kenao text-primary leading-tight">
                {currentLang === 'en' ? (
                  <>The perfect place to <span className="text-secondary">Grow in Jesus</span> and have fun while doing so</>
                ) : currentLang === 'pt' ? (
                  <>O lugar perfeito para <span className="text-secondary">Crescer em Jesus</span> e divertir-se enquanto o fazem</>
                ) : (
                  <>El lugar perfecto para <span className="text-secondary">Crecer en Jesús</span> y divertirse mientras lo hacen</>
                )}
              </h1>
              
              <p className="text-lg text-primary/70 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {t('kids.heroDesc')}
              </p>

              {/* Core value tags with visual rhythm */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
                <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-secondary/20 shadow-sm">
                  <span className="text-xl">🎨</span>
                  <span className="text-sm font-bold text-primary">{t('kids.tagGamesArt')}</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-secondary/20 shadow-sm">
                  <span className="text-xl">📖</span>
                  <span className="text-sm font-bold text-primary">{t('kids.tagBibleTeaching')}</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-secondary/20 shadow-sm">
                  <span className="text-xl">🤗</span>
                  <span className="text-sm font-bold text-primary">{t('kids.tagQualityCare')}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Illustration/Layout (Aesthetic & playful) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative">
                {/* Decorative Frame */}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary to-secondary rounded-[3rem] rotate-3 scale-105 opacity-10" />
                
                {/* Image Showcase */}
                <div className="relative bg-white p-4 rounded-[2.5rem] shadow-2xl border border-secondary/20 w-full max-w-md overflow-hidden aspect-square flex flex-col justify-between items-center text-center">
                  <div className="w-full h-[70%] rounded-2xl overflow-hidden relative group bg-slate-50">
                    <img 
                      src="https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=600&auto=format&fit=crop" 
                      alt="Kids Ministry" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="py-4">
                    <h4 className="text-lg font-kenao text-primary">{t('kids.sundayWaiting')}</h4>
                    <p className="text-xs text-primary/60 mt-1 flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5 text-secondary" />
                      {t('kids.sundaySchedule')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Age Groups & Services Section */}
      <div className="py-16 bg-white border-t border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Escuela Dominical Card */}
            <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="absolute top-0 left-0 w-2 h-full bg-secondary" />
              <div className="flex items-start gap-4">
                <div className="p-4 bg-amber-50 rounded-2xl text-secondary shrink-0">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-bold text-secondary uppercase tracking-widest bg-amber-100/50 px-3 py-1 rounded-full">
                    {t('kids.schoolDominicalAge')}
                  </span>
                  <h3 className="text-2xl font-kenao text-primary font-bold mt-3 mb-2">{t('kids.schoolDominicalTitle')}</h3>
                  <p className="text-primary/70 text-sm leading-relaxed">
                    {t('kids.schoolDominicalDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Guardería Card */}
            <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
              <div className="flex items-start gap-4">
                <div className="p-4 bg-sky-50 rounded-2xl text-primary shrink-0">
                  <Heart className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-widest bg-sky-100/50 px-3 py-1 rounded-full">
                    {t('kids.nurseryAge')}
                  </span>
                  <h3 className="text-2xl font-kenao text-primary font-bold mt-3 mb-2">{t('kids.nurseryTitle')}</h3>
                  <p className="text-primary/70 text-sm leading-relaxed">
                    {t('kids.nurseryDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. "Este mes en HC Kids" Section */}
      <div className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-primary font-bold uppercase text-xs tracking-widest bg-secondary/15 px-4 py-2 rounded-full">{t('kids.monthlyPlanTag')}</span>
            <h2 className="text-3xl md:text-4xl font-kenao text-primary mt-4">{t('kids.monthlyPlanTitle')}</h2>
            <p className="text-primary/60 text-sm mt-3 max-w-2xl mx-auto">
              {t('kids.monthlyPlanDesc')}
            </p>
          </div>

          {loadingPrograms ? (
            <div className="text-center text-primary/45 font-medium py-12">{t('kids.loadingPlanning')}</div>
          ) : currentMonthPrograms.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 p-12 rounded-[2rem] text-center max-w-2xl mx-auto">
              <Smile className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-kenao text-primary mb-2">{t('kids.planningInProcessTitle')}</h3>
              <p className="text-sm text-primary/60 leading-relaxed">
                {t('kids.planningInProcessDesc')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {currentMonthPrograms.map((prog, idx) => (
                <motion.div
                  key={prog.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-slate-50 border border-slate-100 p-6 rounded-3xl flex flex-col justify-between hover:shadow-xl hover:border-secondary/40 transition-all group"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary bg-secondary/15 px-3 py-1 rounded-full">
                        {t('kids.sundayDay')} {idx + 1}
                      </span>
                      <span className="text-xs text-primary/45 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-secondary" />
                        {prog.date.split('-')[2]}/{prog.date.split('-')[1]}
                      </span>
                    </div>

                    <h3 className="text-lg font-kenao text-primary group-hover:text-secondary transition-colors">
                      {prog.teachingTitle}
                    </h3>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200/60 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-secondary/10 text-primary flex items-center justify-center font-bold text-xs shadow-inner">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-primary/40 font-bold uppercase tracking-wider leading-none">{t('kids.teacherImparts')}</p>
                        <p className="text-xs font-bold text-primary mt-0.5">{prog.teacherName}</p>
                      </div>
                    </div>

                    {prog.teachingLink && (
                      <a
                        href={prog.teachingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-secondary transition-colors uppercase tracking-wider"
                      >
                        {t('kids.classMaterial')}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. News Section: "Avisos" filtered by isInfantil & featured flags */}
      {news.length > 0 && (
        <div className="py-20 bg-slate-50 border-t border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-12">
              <div className="text-center md:text-left">
                <span className="text-primary font-bold uppercase text-xs tracking-widest bg-secondary/15 px-4 py-2 rounded-full">{t('kids.newsBadge')}</span>
                <h2 className="text-3xl md:text-4xl font-kenao text-primary mt-4">{t('kids.newsTitle')}</h2>
              </div>
              <Link
                to="/avisos"
                className="mt-4 md:mt-0 inline-flex items-center gap-2 text-primary/60 hover:text-primary font-bold text-sm uppercase tracking-wider transition-all"
              >
                {t('kids.newsWallBtn')}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {news.map((post) => (
                <motion.article 
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-lg hover:shadow-xl transition-all group flex flex-col justify-between"
                >
                  <div className="p-6">
                    {post.imageUrl && (
                      <div className="aspect-video rounded-3xl overflow-hidden mb-6 bg-slate-100 relative">
                        <img 
                          src={getOptimizedImageUrl(post.imageUrl)} 
                          alt={getPostTitle(post)} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute top-4 left-4 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                          {post.category}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs font-bold text-primary/45 uppercase tracking-wider mb-3">
                      <Calendar className="w-3.5 h-3.5 text-secondary" />
                      {post.publishedAt ? formatDate(post.publishedAt.toDate ? post.publishedAt.toDate() : post.publishedAt) : ''}
                    </div>

                    <h3 className="text-xl font-kenao text-primary mb-3 line-clamp-2 group-hover:text-secondary transition-colors">
                      {getPostTitle(post)}
                    </h3>

                    <p className="text-sm text-primary/70 leading-relaxed line-clamp-3">
                      {getPostExcerpt(post)}
                    </p>
                  </div>

                  <div className="p-6 pt-0 border-t border-slate-50 mt-4">
                    <Link 
                      to={`/avisos/${post.id}`}
                      className="w-full py-4 bg-slate-50 hover:bg-secondary hover:text-primary transition-all text-primary rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                    >
                      {t('kids.newsDetailsBtn')}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Photo Gallery Section with Month Filter */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            <div className="text-center md:text-left">
              <span className="text-primary font-bold uppercase text-xs tracking-widest bg-secondary/15 px-4 py-2 rounded-full">{t('kids.galleryTag')}</span>
              <h2 className="text-3xl md:text-4xl font-kenao text-primary mt-4">{t('kids.galleryTitle')}</h2>
              <p className="text-sm text-primary/60 mt-2">
                {t('kids.galleryDesc')}
              </p>
            </div>

            {/* Filter Dropdown */}
            {availablePhotoMonths.length > 0 && (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl shadow-sm mt-6 md:mt-0">
                <Filter className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary/60 uppercase tracking-wider">{t('kids.filterMonth')}</span>
                <select 
                  className="bg-transparent border-none outline-none font-bold text-sm text-primary cursor-pointer focus:ring-0"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="Todas">{t('kids.filterShowAll')}</option>
                  {availablePhotoMonths.map(ym => (
                    <option key={ym} value={ym}>{formatYearMonth(ym)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loadingPhotos ? (
            <div className="text-center text-primary/45 font-medium py-12">{t('kids.loadingPhotos')}</div>
          ) : filteredPhotos.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 p-12 rounded-[2rem] text-center max-w-lg mx-auto">
              <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-kenao text-primary mb-2">{t('kids.noPhotosTitle')}</h3>
              <p className="text-sm text-primary/60 leading-relaxed">
                {t('kids.noPhotosDesc')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredPhotos.map((photo) => (
                  <motion.div
                    key={photo.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative rounded-[2rem] overflow-hidden aspect-square shadow-md border border-slate-100 bg-slate-50 group hover:shadow-2xl transition-all"
                  >
                    <img 
                      src={getOptimizedImageUrl(photo.url)} 
                      alt="Recuerdo Kids" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Dark gradient on hover to showcase details */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                      <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest block mb-1">{t('kids.photoActivityDate')}</span>
                      <p className="text-sm font-bold text-white mb-2">{formatDate(photo.dateTaken)}</p>
                      
                      <div className="flex items-center gap-1 text-[11px] text-white/80 border-t border-white/10 pt-2">
                        <User className="w-3.5 h-3.5 text-secondary" />
                        <span>{t('kids.photoUploadedBy')} {photo.uploadedByName}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
