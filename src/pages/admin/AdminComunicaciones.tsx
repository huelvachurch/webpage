import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, X, Save, Image as ImageIcon, Search, Filter, Eye, Layout, Globe, Loader2 } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';
import { useTranslation } from 'react-i18next';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  category: string;
  featured: boolean;
  tags: string[];
  publishedAt: any;
  title_en?: string;
  excerpt_en?: string;
  content_en?: string;
  title_pt?: string;
  excerpt_pt?: string;
  content_pt?: string;
}

export default function AdminComunicaciones() {
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [activeLang, setActiveLang] = useState<'es' | 'en' | 'pt'>('es');
  
  const [enableEn, setEnableEn] = useState(false);
  const [enablePt, setEnablePt] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    imageUrl: '',
    category: 'Noticias',
    featured: false,
    tags: '',
    title_en: '',
    excerpt_en: '',
    content_en: '',
    title_pt: '',
    excerpt_pt: '',
    content_pt: '',
  });

  const isAdmin = roles.includes('admin');
  const isComunicador = roles.includes('comunicador') || isAdmin;

  // Redirect if not authorized
  useEffect(() => {
    if (isAuthReady && !loading) {
      if (!user || !isComunicador) {
        navigate('/');
      }
    }
  }, [user, isComunicador, loading, isAuthReady, navigate]);

  // Fetch posts
  useEffect(() => {
    if (isAuthReady && user && isComunicador) {
      const q = query(collection(db, 'posts'), orderBy('publishedAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];
        setPosts(postsData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'posts');
      });
      return () => unsubscribe();
    }
  }, [isAuthReady, user, isComunicador]);

  const handleOpenModal = (post?: Post) => {
    setActiveTab('edit');
    setActiveLang('es');
    if (post) {
      setEditingPost(post);
      setEnableEn(!!post.title_en);
      setEnablePt(!!post.title_pt);
      setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        imageUrl: post.imageUrl || '',
        category: post.category,
        featured: post.featured || false,
        tags: post.tags?.join(', ') || '',
        title_en: post.title_en || '',
        excerpt_en: post.excerpt_en || '',
        content_en: post.content_en || '',
        title_pt: post.title_pt || '',
        excerpt_pt: post.excerpt_pt || '',
        content_pt: post.content_pt || '',
      });
    } else {
      setEditingPost(null);
      setEnableEn(false);
      setEnablePt(false);
      setFormData({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        imageUrl: '',
        category: 'Noticias',
        featured: false,
        tags: '',
        title_en: '',
        excerpt_en: '',
        content_en: '',
        title_pt: '',
        excerpt_pt: '',
        content_pt: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleTranslate = async () => {
    if (!formData.title && !formData.content) return;
    setIsTranslating(true);
    try {
      const translationsToFetch = [];
      if (enableEn && !formData.content_en && !formData.title_en) translationsToFetch.push('English');
      if (enablePt && !formData.content_pt && !formData.title_pt) translationsToFetch.push('Portuguese');

      let updatedData = { ...formData };

      for (const lang of translationsToFetch) {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            excerpt: formData.excerpt,
            content: formData.content,
            targetLanguage: lang
          })
        });

        if (!response.ok) throw new Error('Translation failed');
        const data = await response.json();
        
        if (lang === 'English') {
          updatedData.title_en = data.title;
          updatedData.excerpt_en = data.excerpt;
          updatedData.content_en = data.content;
        } else if (lang === 'Portuguese') {
          updatedData.title_pt = data.title;
          updatedData.excerpt_pt = data.excerpt;
          updatedData.content_pt = data.content;
        }
      }

      setFormData(updatedData);
    } catch (e) {
      console.error(e);
      alert('Error en la traducción automática.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    
    // Clean unselected languages
    const submissionData = { ...formData };
    if (!enableEn) {
       submissionData.title_en = '';
       submissionData.excerpt_en = '';
       submissionData.content_en = '';
    }
    if (!enablePt) {
       submissionData.title_pt = '';
       submissionData.excerpt_pt = '';
       submissionData.content_pt = '';
    }

    try {
      if (editingPost) {
        const postRef = doc(db, 'posts', editingPost.id);
        await updateDoc(postRef, {
          ...submissionData,
          tags: tagsArray,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'posts'), {
          ...submissionData,
          tags: tagsArray,
          authorId: user?.uid,
          authorName: user?.displayName,
          publishedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingPost ? OperationType.UPDATE : OperationType.CREATE, 'posts');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta publicación?')) {
      try {
        await deleteDoc(doc(db, 'posts', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `posts/${id}`);
      }
    }
  };

  const filteredPosts = posts.filter(post => 
    post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || !isAuthReady) return <div className="pt-32 text-center">Cargando...</div>;

  const currentTitle = activeLang === 'es' ? formData.title : (activeLang === 'en' ? formData.title_en : formData.title_pt);
  const currentContent = activeLang === 'es' ? formData.content : (activeLang === 'en' ? formData.content_en : formData.content_pt);

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-kenao text-primary mb-2">{t('admin.comms.title')}</h1>
            <p className="text-primary/60">{t('admin.comms.desc')}</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-secondary hover:text-primary transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            {t('admin.comms.newButton')}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-3xl shadow-sm mb-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 w-5 h-5" />
            <input 
              type="text" 
              placeholder={t('admin.comms.searchPh')}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-secondary outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Posts List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredPosts.map((post) => (
            <motion.div 
              layout
              key={post.id}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6 group"
            >
              <div className="w-full md:w-48 h-32 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary/20">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex-grow text-center md:text-left">
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-2">
                  <span className="px-3 py-1 bg-secondary/10 text-secondary text-xs font-bold rounded-full uppercase tracking-wider">
                    {post.category}
                  </span>
                  {post.featured && (
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                      Destacado
                    </span>
                  )}
                  {post.title_en && <span className="px-2 py-1 bg-slate-100 text-xs font-bold rounded">EN</span>}
                  {post.title_pt && <span className="px-2 py-1 bg-slate-100 text-xs font-bold rounded">PT</span>}
                </div>
                <h3 className="text-xl font-kenao text-primary mb-1">{post.title}</h3>
                <p className="text-primary/50 text-sm line-clamp-1">{post.excerpt}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenModal(post)}
                  className="p-3 bg-slate-50 text-primary/40 hover:bg-secondary hover:text-primary rounded-xl transition-all"
                  title="Editar"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(post.id)}
                  className="p-3 bg-slate-50 text-primary/40 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                  title="Eliminar"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
          {filteredPosts.length === 0 && (
            <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-slate-200">
              <p className="text-primary/30 font-kenao text-2xl">No se encontraron publicaciones</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[3rem] shadow-2xl flex flex-col"
            >
              <div className="p-5 sm:p-8 md:p-12 pb-4 flex flex-col gap-4 border-b border-slate-100 bg-white z-10 sticky top-0">
                <div className="flex justify-between items-center w-full">
                  <h2 className="text-2xl sm:text-3xl font-kenao text-primary">
                    {editingPost ? 'Editar Publicación' : 'Nueva Publicación'}
                  </h2>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-all shrink-0"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Editor/Preview toggles */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex bg-slate-100 p-1 rounded-xl self-start w-full sm:w-auto">
                    <button 
                      type="button"
                      onClick={() => setActiveTab('edit')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'edit' ? 'bg-white text-primary shadow-sm' : 'text-primary/40'}`}
                    >
                      <Layout className="w-4 h-4" />
                      Editor
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'preview' ? 'bg-white text-primary shadow-sm' : 'text-primary/40'}`}
                    >
                      <Eye className="w-4 h-4" />
                      Vista Previa
                    </button>
                  </div>

                  {/* Settings toggles */}
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-primary/60 uppercase tracking-wider flex items-center gap-1"><Globe className="w-3 h-3"/> Activar Idiomas</span>
                    <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                      <input type="checkbox" checked={enableEn} onChange={e => { setEnableEn(e.target.checked); if (!e.target.checked && activeLang === 'en') setActiveLang('es'); }} className="rounded border-slate-300 text-secondary focus:ring-secondary" />
                      Inglés
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                      <input type="checkbox" checked={enablePt} onChange={e => { setEnablePt(e.target.checked); if (!e.target.checked && activeLang === 'pt') setActiveLang('es'); }} className="rounded border-slate-300 text-secondary focus:ring-secondary" />
                      Portugués
                    </label>
                    
                    {(enableEn || enablePt) && formData.content && formData.title && (
                      <button 
                        onClick={handleTranslate} 
                        disabled={isTranslating}
                        className="ml-2 bg-primary text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-secondary hover:text-primary transition-all flex items-center gap-1 disabled:opacity-50"
                      >
                        {isTranslating ? <Loader2 className="w-3 h-3 animate-spin"/> : <Globe className="w-3 h-3"/>}
                        {isTranslating ? 'Traduciendo...' : 'Traducir Auto'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Language Toggles */}
                 <div className="flex gap-2">
                    <button type="button" onClick={() => setActiveLang('es')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeLang === 'es' ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-primary/40'}`}>ESPAÑOL</button>
                    {enableEn && <button type="button" onClick={() => setActiveLang('en')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeLang === 'en' ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-primary/40'}`}>INGLÉS</button>}
                    {enablePt && <button type="button" onClick={() => setActiveLang('pt')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeLang === 'pt' ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-primary/40'}`}>PORTUGUÉS</button>}
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-8 md:p-12 pt-6">
                {activeTab === 'edit' ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-primary/60 ml-2">Título ({activeLang.toUpperCase()})</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all"
                          placeholder="Título de la noticia"
                          value={activeLang === 'es' ? formData.title : (activeLang === 'en' ? formData.title_en : formData.title_pt)}
                          onChange={(e) => {
                             if (activeLang === 'es') setFormData({...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-')});
                             if (activeLang === 'en') setFormData({...formData, title_en: e.target.value});
                             if (activeLang === 'pt') setFormData({...formData, title_pt: e.target.value});
                          }}
                        />
                      </div>
                      {activeLang === 'es' && (
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-primary/60 ml-2">Slug (URL)</label>
                          <input 
                            required
                            type="text" 
                            className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all"
                            placeholder="url-de-la-noticia"
                            value={formData.slug}
                            onChange={(e) => setFormData({...formData, slug: e.target.value})}
                          />
                        </div>
                      )}
                    </div>

                    {activeLang === 'es' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-primary/60 ml-2">Categoría</label>
                          <select 
                            className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all appearance-none bg-white"
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                          >
                            <option>Noticias</option>
                            <option>Eventos</option>
                            <option>Enseñanza</option>
                            <option>Obra Social</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-primary/60 ml-2">Imagen URL</label>
                          <input 
                            type="url" 
                            className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all"
                            placeholder="https://ejemplo.com/imagen.jpg"
                            value={formData.imageUrl}
                            onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                          />
                        </div>
                      </div>
                    )}

                    {activeLang === 'es' && (
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-primary/60 ml-2">Etiquetas (separadas por comas)</label>
                        <input 
                          type="text" 
                          className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all"
                          placeholder="huelva, iglesia, evento"
                          value={formData.tags}
                          onChange={(e) => setFormData({...formData, tags: e.target.value})}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-primary/60 ml-2">Sinopsis ({activeLang.toUpperCase()})</label>
                      <textarea 
                        rows={2}
                        className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all"
                        placeholder="Un breve resumen..."
                        value={activeLang === 'es' ? formData.excerpt : (activeLang === 'en' ? formData.excerpt_en : formData.excerpt_pt)}
                        onChange={(e) => {
                          if (activeLang === 'es') setFormData({...formData, excerpt: e.target.value});
                          if (activeLang === 'en') setFormData({...formData, excerpt_en: e.target.value});
                          if (activeLang === 'pt') setFormData({...formData, excerpt_pt: e.target.value});
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-primary/60 ml-2">Contenido ({activeLang.toUpperCase()})</label>
                      <textarea 
                        required
                        rows={12}
                        className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all font-mono text-sm"
                        placeholder="Escribe el contenido aquí usando Markdown..."
                        value={activeLang === 'es' ? formData.content : (activeLang === 'en' ? formData.content_en : formData.content_pt)}
                        onChange={(e) => {
                          if (activeLang === 'es') setFormData({...formData, content: e.target.value});
                          if (activeLang === 'en') setFormData({...formData, content_en: e.target.value});
                          if (activeLang === 'pt') setFormData({...formData, content_pt: e.target.value});
                        }}
                      />
                    </div>

                    {activeLang === 'es' && (
                      <div className="flex items-center gap-3 ml-2">
                        <input 
                          type="checkbox" 
                          id="featured"
                          className="w-5 h-5 rounded border-slate-200 text-secondary focus:ring-secondary"
                          checked={formData.featured}
                          onChange={(e) => setFormData({...formData, featured: e.target.checked})}
                        />
                        <label htmlFor="featured" className="text-sm font-bold text-primary/60">Marcar como contenido destacado</label>
                      </div>
                    )}

                    <div className="pt-4">
                      <button 
                        type="submit"
                        className="w-full bg-primary text-white font-bold py-5 rounded-2xl hover:bg-secondary hover:text-primary transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Save className="w-5 h-5" />
                        {editingPost ? 'Guardar Cambios' : 'Publicar Ahora'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="prose prose-slate max-w-none">
                    <div className="mb-8">
                      <div className="flex gap-2 mb-4">
                        <span className="px-3 py-1 bg-secondary/10 text-secondary text-xs font-bold rounded-full uppercase tracking-wider">
                          {formData.category}
                        </span>
                        {formData.featured && (
                          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                            Destacado
                          </span>
                        )}
                        <span className="px-3 py-1 bg-slate-100 text-primary/60 text-xs font-bold rounded-full uppercase tracking-wider">
                          Idioma: {activeLang.toUpperCase()}
                        </span>
                      </div>
                      <h1 className="text-4xl font-kenao text-primary mb-4">{currentTitle || 'Título de la publicación'}</h1>
                      {formData.imageUrl && (
                        <div className="aspect-video rounded-3xl overflow-hidden mb-8 bg-slate-100">
                          <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <div className="text-primary/80 leading-relaxed">
                        <Markdown>{currentContent || '*Sin contenido aún*'}</Markdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
