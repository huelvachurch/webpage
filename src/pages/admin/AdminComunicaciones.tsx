import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, X, Save, Image as ImageIcon, Search, Filter, Eye, Layout } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';

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
}

export default function AdminComunicaciones() {
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    imageUrl: '',
    category: 'Noticias',
    featured: false,
    tags: '',
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
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        imageUrl: post.imageUrl,
        category: post.category,
        featured: post.featured,
        tags: post.tags?.join(', ') || '',
      });
    } else {
      setEditingPost(null);
      setFormData({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        imageUrl: '',
        category: 'Noticias',
        featured: false,
        tags: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    
    try {
      if (editingPost) {
        const postRef = doc(db, 'posts', editingPost.id);
        await updateDoc(postRef, {
          ...formData,
          tags: tagsArray,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'posts'), {
          ...formData,
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
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || !isAuthReady) return <div className="pt-32 text-center">Cargando...</div>;

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-kenao text-primary mb-2">Portal de Comunicaciones</h1>
            <p className="text-primary/60">Gestiona las noticias y actividades de la iglesia</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-secondary hover:text-primary transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Nueva Publicación
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-3xl shadow-sm mb-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar publicaciones..." 
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
              <div className="p-8 md:p-12 pb-4 flex justify-between items-center border-b border-slate-100">
                <h2 className="text-3xl font-kenao text-primary">
                  {editingPost ? 'Editar Publicación' : 'Nueva Publicación'}
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setActiveTab('edit')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'edit' ? 'bg-white text-primary shadow-sm' : 'text-primary/40'}`}
                    >
                      <Layout className="w-4 h-4" />
                      Editor
                    </button>
                    <button 
                      onClick={() => setActiveTab('preview')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'preview' ? 'bg-white text-primary shadow-sm' : 'text-primary/40'}`}
                    >
                      <Eye className="w-4 h-4" />
                      Vista Previa
                    </button>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-8 md:p-12 pt-6">
                {activeTab === 'edit' ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-primary/60 ml-2">Título</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all"
                          placeholder="Título de la noticia"
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, '-')})}
                        />
                      </div>
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
                    </div>

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

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-primary/60 ml-2">Sinopsis (Resumen corto)</label>
                      <textarea 
                        rows={2}
                        className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all"
                        placeholder="Un breve resumen para el listado..."
                        value={formData.excerpt}
                        onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-primary/60 ml-2">Contenido (Markdown)</label>
                      <textarea 
                        required
                        rows={12}
                        className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all font-mono text-sm"
                        placeholder="Escribe el contenido aquí usando Markdown..."
                        value={formData.content}
                        onChange={(e) => setFormData({...formData, content: e.target.value})}
                      />
                    </div>

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
                      </div>
                      <h1 className="text-4xl font-kenao text-primary mb-4">{formData.title || 'Título de la publicación'}</h1>
                      {formData.imageUrl && (
                        <div className="aspect-video rounded-3xl overflow-hidden mb-8 bg-slate-100">
                          <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <div className="text-primary/80 leading-relaxed">
                        <Markdown>{formData.content || '*Sin contenido aún*'}</Markdown>
                      </div>
                      {formData.tags && (
                        <div className="mt-8 flex flex-wrap gap-2">
                          {formData.tags.split(',').map((tag, i) => (
                            <span key={i} className="text-xs font-bold text-primary/40 bg-slate-100 px-3 py-1 rounded-full">
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
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
