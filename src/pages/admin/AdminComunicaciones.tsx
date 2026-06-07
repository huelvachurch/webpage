import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, X, Save, Image as ImageIcon, Search, Filter, Eye, Layout, Globe, Loader2, Star, Bold, Italic, Heading1, Heading2, Quote, List, Link as LinkIcon, Sparkles } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { getOptimizedImageUrl } from '../../utils/drive';

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
  status?: 'published' | 'draft';
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

  // AI Content Generator states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [aiImageMimeType, setAiImageMimeType] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    imageUrl: '',
    category: 'Noticias',
    featured: false,
    status: 'published' as 'published' | 'draft',
    tags: '',
    title_en: '',
    excerpt_en: '',
    content_en: '',
    title_pt: '',
    excerpt_pt: '',
    content_pt: '',
  });

  const intentRef = React.useRef<'published' | 'draft'>('published');

  const isSuperAdmin = roles.includes('superadmin');
  const isComunicador = roles.includes('comunicador') || isSuperAdmin;

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
        status: post.status || 'published',
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
        status: 'published',
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

  const handleGenerateAI = async () => {
    if (!aiPrompt) {
      alert("Por favor, ingresa los detalles del evento para que la IA pueda generar la publicación.");
      return;
    }
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/gemini/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          imageData: aiImagePreview ? aiImagePreview.split(',')[1] : null,
          imageMimeType: aiImageMimeType
        })
      });

      if (!response.ok) {
        throw new Error('Error al generar con IA');
      }

      const generated = await response.json();

      if (generated.es) {
        setFormData(prev => ({
          ...prev,
          title: generated.es.title || prev.title,
          slug: generated.es.slug || prev.slug,
          category: generated.es.category || prev.category,
          tags: generated.es.tags || prev.tags,
          excerpt: generated.es.excerpt || prev.excerpt,
          content: generated.es.content || prev.content,
        }));
      }

      if (generated.en) {
        setEnableEn(true);
        setFormData(prev => ({
          ...prev,
          title_en: generated.en.title || prev.title_en,
          excerpt_en: generated.en.excerpt || prev.excerpt_en,
          content_en: generated.en.content || prev.content_en,
        }));
      }

      if (generated.pt) {
        setEnablePt(true);
        setFormData(prev => ({
          ...prev,
          title_pt: generated.pt.title || prev.title_pt,
          excerpt_pt: generated.pt.excerpt || prev.excerpt_pt,
          content_pt: generated.pt.content || prev.content_pt,
        }));
      }

      setActiveLang('es');

    } catch (e) {
      console.error(e);
      alert('Hubo un error al generar contenido con la IA.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAiImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAiImageMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAiImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const insertTextAtCursor = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // figure out which property to update based on activeLang
    const contentKey = activeLang === 'es' ? 'content' : activeLang === 'en' ? 'content_en' : 'content_pt';
    const currentText = formData[contentKey as keyof typeof formData] as string;
    
    const selectedText = currentText.substring(start, end);
    const newText = currentText.substring(0, start) + prefix + selectedText + suffix + currentText.substring(end);

    setFormData(prev => ({ ...prev, [contentKey]: newText }));

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    
    // Clean unselected languages
    const submissionData = { ...formData, status: intentRef.current };
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

    // Transform Google Drive links if present
    submissionData.imageUrl = getOptimizedImageUrl(submissionData.imageUrl);

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

  const handleToggleFeatured = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'posts', id), {
        featured: !currentStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${id}`);
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
                  onClick={() => handleToggleFeatured(post.id, !!post.featured)}
                  className={`p-3 rounded-xl transition-all ${post.featured ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-slate-50 text-primary/30 hover:bg-slate-100'}`}
                  title={post.featured ? "Quitar de destacados" : "Marcar como destacado"}
                >
                  <Star className={`w-5 h-5 ${post.featured ? 'fill-current' : ''}`} />
                </button>
                <div className="flex flex-col items-center justify-center px-3 bg-slate-50 text-primary/30 rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-widest">{post.status === 'draft' ? 'Borrador' : 'Público'}</span>
                </div>
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
                    
                    {/* Generador de contenido IA */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100 flex flex-col gap-4">
                      <div className="flex items-center gap-2 text-indigo-600 font-kenao text-xl">
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                        Asistente IA de Redacción
                      </div>
                      <p className="text-sm text-indigo-800/70">
                        Escribe aquí las instrucciones de tu evento o sube una imagen de promoción para que nuestro asistente 
                        genere automáticamente el título, sinopsis, y el contenido en Español, Inglés y Portugués utilizando versículos bíblicos y un tono amigable.
                      </p>
                      
                      <textarea 
                        rows={3}
                        className="w-full px-6 py-4 rounded-2xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-indigo-300"
                        placeholder="De qué trata el evento, qué quieres enseñar..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                      />
                      
                      <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                          <label className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-xl cursor-pointer hover:bg-indigo-50 transition-all font-bold text-sm shrink-0">
                            <ImageIcon className="w-4 h-4" />
                            {aiImagePreview ? 'Cambiar Imagen' : 'Subir Promoción'}
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleAiImageUpload}
                            />
                          </label>
                          {aiImagePreview && (
                            <div className="relative">
                              <img src={aiImagePreview} alt="AI Context" className="h-10 w-10 object-cover rounded shadow" />
                              <button
                                type="button"
                                onClick={() => { setAiImagePreview(null); setAiImageMimeType(null); }}
                                className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full shadow hover:bg-red-200 transition-all"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <button
                          type="button"
                          onClick={handleGenerateAI}
                          disabled={isGeneratingAI || !aiPrompt}
                          className="w-full md:w-auto bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                          {isGeneratingAI ? 'Generando Contenido...' : 'Autocompletar con IA'}
                        </button>
                      </div>
                    </div>

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
                          <p className="text-[11px] text-primary/45 mt-2">
                            Puedes pegar un enlace de archivo compartido de Google Drive y se convertirá automáticamente.
                          </p>
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

                    <div className="space-y-4">
                      <div className="flex justify-between items-center ml-2">
                        <label className="text-sm font-bold text-primary/60">Contenido ({activeLang.toUpperCase()})</label>
                      </div>
                      
                      <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-secondary focus-within:border-transparent transition-all">
                        {/* Markdown Toolbar */}
                        <div className="flex flex-wrap items-center bg-slate-50 border-b border-slate-200 p-2 gap-1 touch-auto">
                          <button type="button" onClick={() => insertTextAtCursor('## ', '')} className="p-2 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Título">
                            <Heading1 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => insertTextAtCursor('### ', '')} className="p-2 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Subtítulo">
                            <Heading2 className="w-4 h-4" />
                          </button>
                          <div className="w-px h-5 bg-slate-300 mx-1"></div>
                          <button type="button" onClick={() => insertTextAtCursor('**', '**')} className="p-2 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Negrita">
                            <Bold className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => insertTextAtCursor('*', '*')} className="p-2 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Cursiva">
                            <Italic className="w-4 h-4" />
                          </button>
                          <div className="w-px h-5 bg-slate-300 mx-1"></div>
                          <button type="button" onClick={() => insertTextAtCursor('> ', '')} className="p-2 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Cita Bíblica">
                            <Quote className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => insertTextAtCursor('- ', '')} className="p-2 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Lista">
                            <List className="w-4 h-4" />
                          </button>
                          <div className="w-px h-5 bg-slate-300 mx-1"></div>
                          <button type="button" onClick={() => insertTextAtCursor('[', '](url)')} className="p-2 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Enlace">
                            <LinkIcon className="w-4 h-4" />
                          </button>
                        </div>

                        <textarea 
                          id="markdown-editor"
                          required
                          rows={12}
                          className="w-full px-6 py-4 outline-none font-mono text-sm resize-y"
                          placeholder="Escribe el contenido aquí. Selecciona texto y usa los botones de arriba para dar formato..."
                          value={activeLang === 'es' ? formData.content : (activeLang === 'en' ? formData.content_en : formData.content_pt)}
                          onChange={(e) => {
                            if (activeLang === 'es') setFormData({...formData, content: e.target.value});
                            if (activeLang === 'en') setFormData({...formData, content_en: e.target.value});
                            if (activeLang === 'pt') setFormData({...formData, content_pt: e.target.value});
                          }}
                        />
                      </div>
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

                    <div className="pt-4 grid grid-cols-2 gap-3">
                      <button 
                        type="submit"
                        onClick={() => { intentRef.current = 'draft'; }}
                        className="bg-slate-100 text-primary font-bold py-5 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center"
                      >
                        Guardar Borrador
                      </button>
                      <button 
                        type="submit"
                        onClick={() => { intentRef.current = 'published'; }}
                        className="bg-primary text-white font-bold py-5 rounded-2xl hover:bg-secondary hover:text-primary transition-all flex items-center justify-center shadow-lg"
                      >
                        {editingPost ? 'Publicar Cambios' : 'Publicar Ahora'}
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
                      <h1 className="text-3xl md:text-5xl font-kenao text-primary mb-4">{currentTitle || 'Título de la publicación'}</h1>
                      {formData.imageUrl && (
                        <div className="aspect-video rounded-3xl overflow-hidden mb-8 bg-slate-100">
                          <img src={getOptimizedImageUrl(formData.imageUrl)} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <div className="prose max-w-none text-primary/80 leading-relaxed prose-headings:text-primary prose-a:text-secondary prose-blockquote:text-primary prose-blockquote:border-l-primary prose-strong:text-primary">
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
