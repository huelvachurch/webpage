import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, Tag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useTranslation } from 'react-i18next';
import { getOptimizedImageUrl } from '../utils/drive';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  publishedAt: any;
  status?: 'published' | 'draft';
  tags?: string[];
  title_en?: string;
  excerpt_en?: string;
  title_pt?: string;
  excerpt_pt?: string;
}

export default function Actividades() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language.substring(0, 2);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('publishedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  const getCategories = () => {
    const cats = new Set(posts.map(post => post.category));
    return [t('activities.allActivities'), ...Array.from(cats)];
  }

  const categories = getCategories();

  const filteredPosts = posts.filter(post => {
    if (post.status === 'draft') return false;
    const title = getPostTitle(post);
    const excerpt = getPostExcerpt(post);
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === t('activities.allActivities') || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="pt-48 text-center font-kenao text-2xl text-primary/40">{t('common.loading')}</div>;

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-secondary tracking-wider uppercase text-sm font-bold mb-4">Blog & Noticias</h2>
          <h1 className="text-4xl md:text-5xl font-kenao text-primary mb-6">{t('activities.title')}</h1>
          <p className="text-primary/70 text-xl max-w-3xl mx-auto leading-relaxed">
            {t('activities.desc')}
          </p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-6 mb-12 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder={t('activities.searchPh')} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all bg-white"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto scrollbar-hide">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  selectedCategory === category 
                  ? 'bg-secondary text-primary shadow-lg shadow-secondary/20' 
                  : 'bg-white text-primary/60 hover:bg-slate-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post, index) => (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group border border-slate-100 flex flex-col h-full"
            >
              <div className="h-64 overflow-hidden relative bg-slate-100 flex items-center justify-center">
                {post.imageUrl ? (
                  <img 
                    src={getOptimizedImageUrl(post.imageUrl)} 
                    alt={getPostTitle(post)} 
                    className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary/10">
                    <Tag className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-secondary text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {post.category}
                </div>
              </div>
              <div className="p-8 flex flex-col flex-grow">
                <div className="text-sm text-primary/50 mb-4 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {post.publishedAt?.toDate ? post.publishedAt.toDate().toLocaleDateString() : t('home.recent')}
                </div>
                <h4 className="text-2xl font-kenao text-primary mb-4 group-hover:text-secondary transition-colors">{getPostTitle(post)}</h4>
                <p className="text-primary/70 leading-relaxed mb-8 flex-grow">
                  {getPostExcerpt(post)}
                </p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {post.tags?.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-xs text-primary/40 bg-slate-50 px-2 py-1 rounded-md">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
                <Link to={`/avisos/${post.id}`} className="flex items-center text-primary font-bold hover:text-secondary transition-colors group/btn">
                  {t('common.readMore')} <ArrowRight className="w-5 h-5 ml-2 transform group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-24">
            <p className="text-primary/40 text-xl font-kenao">{t('activities.notFound')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
