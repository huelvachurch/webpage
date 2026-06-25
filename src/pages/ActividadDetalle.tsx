import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, Tag, ArrowLeft, Share2, Clock, User } from 'lucide-react';
import Markdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { getOptimizedImageUrl } from '../utils/drive';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  category: string;
  authorName: string;
  publishedAt: any;
  tags?: string[];
}

export default function ActividadDetalle() {
  const { id } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const postRef = doc(db, 'posts', id);
    const unsubscribe = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() } as Post);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `posts/${id}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  if (loading) return <div className="pt-48 text-center font-kenao text-2xl text-primary/40">Cargando...</div>;
  if (!post) return (
    <div className="pt-48 text-center">
      <h1 className="text-4xl font-kenao text-primary mb-4">Publicación no encontrada</h1>
      <Link to="/avisos" className="text-secondary font-bold hover:underline">Volver a avisos</Link>
    </div>
  );

  return (
    <div className="pt-32 pb-24 bg-white min-h-screen">
      <Helmet>
        <title>{post.title} | Huelva Church</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        {post.imageUrl && <meta property="og:image" content={post.imageUrl} />}
        <meta property="og:type" content="article" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/avisos" className="inline-flex items-center text-primary/40 hover:text-secondary font-bold mb-12 transition-colors group">
          <ArrowLeft className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" />
          Volver a avisos
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-wrap gap-4 mb-8">
            <span className="px-4 py-1 bg-secondary text-primary text-xs font-bold rounded-full uppercase tracking-wider">
              {post.category}
            </span>
            <div className="flex items-center text-primary/40 text-sm">
              <Calendar className="w-4 h-4 mr-2" />
              {post.publishedAt?.toDate ? post.publishedAt.toDate().toLocaleDateString() : 'Reciente'}
            </div>
            <div className="flex items-center text-primary/40 text-sm">
              <User className="w-4 h-4 mr-2" />
              {post.authorName || 'Iglesia'}
            </div>
          </div>

          <h1 className="text-3xl md:text-5xl font-kenao text-primary mb-8 leading-tight">
            {post.title}
          </h1>

          <p className="text-xl text-primary/60 italic mb-12 border-l-4 border-secondary pl-6">
            {post.excerpt}
          </p>

          <div className="aspect-video rounded-[3rem] overflow-hidden mb-16 shadow-2xl bg-slate-100">
            {post.imageUrl ? (
              <img src={getOptimizedImageUrl(post.imageUrl)} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary/10">
                <Tag className="w-24 h-24" />
              </div>
            )}
          </div>

          <div className="prose prose-xl max-w-none mb-16 prose-headings:text-primary prose-a:text-secondary prose-blockquote:text-primary prose-blockquote:border-l-primary prose-strong:text-primary prose-p:text-primary/90 prose-li:text-primary/90">
            <div className="markdown-body">
              <Markdown>{post.content}</Markdown>
            </div>
          </div>

          <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-wrap gap-2">
              {post.tags?.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-sm text-primary/40 bg-slate-50 px-3 py-1.5 rounded-xl">
                  <Tag className="w-4 h-4" />
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  const url = window.location.href;
                  const text = `¡Mira esta actividad de Huelva Church! ${post.title}`;
                  if (navigator.share) {
                    navigator.share({
                      title: post.title,
                      text: text,
                      url: url,
                    }).catch(console.error);
                  } else {
                    navigator.clipboard.writeText(url);
                    alert('¡Enlace copiado al portapapeles!');
                  }
                }}
                className="flex items-center gap-2 bg-slate-50 text-primary/60 px-6 py-3 rounded-2xl font-bold hover:bg-secondary hover:text-primary transition-all"
                title="Compartir (Copia el enlace o usa el menú nativo)"
              >
                <Share2 className="w-5 h-5" />
                Compartir
              </button>
              
              <a 
                href={`https://wa.me/?text=${encodeURIComponent(`¡Mira esta actividad de Huelva Church! ${post.title} - ${window.location.href}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-green-50 text-green-600 rounded-2xl hover:bg-green-500 hover:text-white transition-all hover:scale-105"
                title="Compartir en WhatsApp"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              </a>

              <a 
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all hover:scale-105"
                title="Compartir en Facebook"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
