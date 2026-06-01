import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, Mail, Users, History, Send, Eye, Image as ImageIcon, Check, AlertCircle, Sparkles, BookOpen, 
  ExternalLink, Video, Radio, Youtube, Instagram, MessageCircle, FileText, Loader2, ArrowRight, Settings, Clock 
} from 'lucide-react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, 
  serverTimestamp, getDocs, where, setDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getOptimizedImageUrl } from '../../utils/drive';
import { useGlobalSettings } from '../../utils/useSettings';

interface Subscriber {
  id: string;
  email: string;
  subscribedAt: any;
  active: boolean;
}

interface NewsletterCampaign {
  id: string;
  type: 'semanal' | 'especial';
  subject: string;
  sentAt: any;
  sentCount: number;
  config: any;
  status?: 'sent' | 'scheduled' | 'draft';
  scheduledAt?: any;
  contentHtml?: string;
  createdAt?: any;
}

interface Post {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  imageUrl?: string;
  featured?: boolean;
  publishedAt?: any;
  content?: string;
  slug?: string;
}

export default function AdminNewsletter() {
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { meetingTime } = useGlobalSettings();

  // Tabs
  const [activeTab, setActiveTab] = useState<'build' | 'subscribers' | 'history'>('build');
  
  // Data State
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [history, setHistory] = useState<NewsletterCampaign[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);

  // Form State - Subscribers
  const [newEmail, setNewEmail] = useState('');
  const [submittingSub, setSubmittingSub] = useState(false);

  // Form State - Newsletter Builder
  const [campaignType, setCampaignType] = useState<'semanal' | 'especial'>('semanal');
  const [sermonImageUrl, setSermonImageUrl] = useState('');
  const [sermonDescription, setSermonDescription] = useState('Te invitamos a nuestra reunión de este domingo. ¡Ven con expectativa de adorar y recibir una palabra fresca de parte de Dios!');
  const [isSantaCena, setIsSantaCena] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  
  // Custom Special Newsletter Fields
  const [specialSubject, setSpecialSubject] = useState('Aviso importante: Campamento Familiar Huelva Church 2026');
  const [specialContent, setSpecialContent] = useState('¡Hola familia Huelva Church!\n\nNos complace mucho anunciar que ya están abiertas las inscripciones para el próximo Campamento Familiar de este verano. \n\nSerá un tiempo inolvidable de comunión, recreación, talleres específicos para matrimonios y jóvenes, y noches especiales de adoración.\n\n### Detalles Clave:\n- 📅 **Fechas**: 15 al 18 de Julio de 2026\n- 📍 **Lugar**: Albergue de la Sierra de Aracena, Huelva\n- 💰 **Precio**: 120€ por persona (con descuentos especiales para familias numerosas)\n\nPara inscribirte, haz clic en el botón inferior o ponte en contacto con los coordinadores de células.\n\n¡No te quedes fuera!');
  const [specialButtonText, setSpecialButtonText] = useState('Inscribirme Ahora');
  const [specialButtonUrl, setSpecialButtonUrl] = useState('https://huelvachurch.com/inscripciones');

  // Saving states and action indicators
  const [isSaving, setIsSaving] = useState(false);
  const [isActionCampaignId, setIsActionCampaignId] = useState<string | null>(null);

  // Future scheduling states
  const [shouldSchedule, setShouldSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => {
    const now = new Date();
    const result = new Date(now);
    const day = now.getDay();
    const daysToSaturday = (6 - day + 7) % 7;
    result.setDate(now.getDate() + daysToSaturday);
    result.setHours(20, 0, 0, 0);
    if (day === 6 && now.getHours() >= 20) {
      result.setDate(result.getDate() + 7);
    }
    const year = result.getFullYear();
    const month = String(result.getMonth() + 1).padStart(2, '0');
    const date = String(result.getDate()).padStart(2, '0');
    const hours = String(result.getHours()).padStart(2, '0');
    const minutes = String(result.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${date}T${hours}:${minutes}`;
  });
  
  // Selected post to import for Special newsletter
  const [selectedPostToImport, setSelectedPostToImport] = useState<string>('');

  // Preview / Sending Actions
  const [previewHtml, setPreviewHtml] = useState('');
  const [sendTestEmail, setSendTestEmail] = useState(user?.email || 'huelvachurch@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [apiResponse, setApiResponse] = useState<{ success: boolean; realDelivery: boolean; details: string; messageId?: string } | null>(null);

  const isAdmin = roles.includes('admin');
  const isComunicador = roles.includes('comunicador') || isAdmin;

  // Security Guard Direct
  useEffect(() => {
    if (isAuthReady && !loading) {
      if (!user || !isComunicador) {
        navigate('/');
      }
    }
  }, [user, isComunicador, loading, isAuthReady, navigate]);

  // Handle Santa Cena auto-toggle (checks if tomorrow is first Sunday of the month on mount)
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Check if tomorrow is Sunday (0) and date is <= 7 (first Sunday)
    if (tomorrow.getDay() === 0 && tomorrow.getDate() <= 7) {
      setIsSantaCena(true);
    }
  }, []);

  // Fetch Subscribers & Campaigns & Featured Posts
  useEffect(() => {
    if (isAuthReady && user && isComunicador) {
      // 1. Subscribers
      const qSub = query(collection(db, 'subscribers'), orderBy('subscribedAt', 'desc'));
      const unsubSub = onSnapshot(qSub, (snapshot) => {
        const subs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Subscriber[];
        setSubscribers(subs);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'subscribers');
      });

      // 2. Announcements list to select from
      const qPosts = query(collection(db, 'posts'), orderBy('publishedAt', 'desc'));
      const unsubPosts = onSnapshot(qPosts, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];
        setPosts(items);
        const featured = items.filter(p => p.featured === true);
        setFeaturedPosts(featured);
        // Pre-select featured posts inside weekly config
        setSelectedPostIds(featured.map(fp => fp.id));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'posts');
      });

      // 3. Sent Campaigns History - sorted by createdAt desc to include drafts and scheduled
      const qCampaigns = query(collection(db, 'newsletters'), orderBy('createdAt', 'desc'));
      const unsubCampaigns = onSnapshot(qCampaigns, (snapshot) => {
        const camps = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as NewsletterCampaign[];
        setHistory(camps);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'newsletters');
      });

      return () => {
        unsubSub();
        unsubPosts();
        unsubCampaigns();
      };
    }
  }, [isAuthReady, user, isComunicador]);

  // Frontend Scheduler: process scheduled campaigns when they reach their time
  useEffect(() => {
    if (!isAuthReady || !user || !isComunicador || !history.length || !subscribers.length) return;

    const interval = setInterval(async () => {
      const now = new Date();
      const scheduledCampaigns = history.filter(c => c.status === 'scheduled' && c.scheduledAt);
      
      for (const campaign of scheduledCampaigns) {
        let scheduledDate = null;
        if (campaign.scheduledAt?.toDate) {
          scheduledDate = campaign.scheduledAt.toDate();
        } else {
          scheduledDate = new Date(campaign.scheduledAt);
        }

        if (scheduledDate && scheduledDate <= now) {
          console.log(`[Frontend Scheduler] Procesando campaña programada ID: ${campaign.id}`);
          
          try {
            await updateDoc(doc(db, 'newsletters', campaign.id), {
              status: 'sending',
              updatedAt: serverTimestamp()
            });

            const activeSubs = subscribers.filter(s => s.active);
            let sentCount = 0;
            
            for (const subscriber of activeSubs) {
              try {
                 await fetch('/api/newsletter/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: subscriber.email,
                    subject: campaign.subject,
                    contentHtml: campaign.contentHtml || ''
                  })
                });
                sentCount++;
              } catch (e) {
                console.error(e);
              }
            }

            await updateDoc(doc(db, 'newsletters', campaign.id), {
              status: 'sent',
              sentAt: serverTimestamp(),
              sentCount,
              updatedAt: serverTimestamp()
            });
            console.log(`[Frontend Scheduler] Campaña completada: ${sentCount} correos enviados.`);
          } catch (e) {
            console.error('[Frontend Scheduler] Error al procesar:', e);
          }
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [history, subscribers, isAuthReady, user, isComunicador]);

  // Generate Special Newsletter content with AI
  const handleGenerateSpecialAI = async () => {
    if (!specialContent.trim()) {
      alert("Por favor, ingresa un contexto básico en el campo de 'Contenido' o selecciona una publicación para generar el comunicado.");
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      let promptText = specialContent;
      let hasPostContext = false;
      
      // If there are selected posts, extract their text to feed as context
      if (selectedPostIds.length > 0) {
        hasPostContext = true;
        const postsContext = selectedPostIds.map(id => {
          const post = posts.find(p => p.id === id);
          return post ? `[Noticia Titulo: "${post.title}"] Contenido: ${post.content || ''}` : '';
        }).join('\n\n');
        promptText = `${specialContent}\n\n=== Contexto de Publicaciones Seleccionadas ===\n${postsContext}`;
        
        // Auto-fill button with the first post URL if empty
        if (!specialButtonUrl) {
          const firstPost = posts.find(p => p.id === selectedPostIds[0]);
          if (firstPost) {
             setSpecialButtonUrl(`${window.location.origin}/actividades/${firstPost.id}`);
             if (!specialButtonText) setSpecialButtonText('Leer más');
          }
        }
      }

      const response = await fetch('/api/gemini/generate-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, hasPostContext })
      });

      if (!response.ok) {
        throw new Error('Error al generar el comunicado con IA');
      }

      const data = await response.json();
      
      if (data.subject) setSpecialSubject(data.subject);
      if (data.content) setSpecialContent(data.content);

    } catch (error) {
      console.error(error);
      alert("Hubo un error al generar el comunicado especial. Inténtalo de nuevo.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Autofill test email once user object loads
  useEffect(() => {
    if (user?.email) {
      setSendTestEmail(user.email);
    }
  }, [user]);

  // Generate Email HTML Output on change
  useEffect(() => {
    if (campaignType === 'semanal') {
      const activeArticles = posts.filter(p => selectedPostIds.includes(p.id));
      const html = compileWeeklyEmail({
        sermonImageUrl,
        sermonDescription,
        isSantaCena,
        articles: activeArticles
      });
      setPreviewHtml(html);
    } else {
      const html = compileSpecialEmail({
        subject: specialSubject,
        content: specialContent,
        btnText: specialButtonText,
        btnUrl: specialButtonUrl
      });
      setPreviewHtml(html);
    }
  }, [campaignType, sermonImageUrl, sermonDescription, isSantaCena, selectedPostIds, posts, specialSubject, specialContent, specialButtonText, specialButtonUrl]);

  // HTML Compiler: Weekly Sunday Reminders
  function compileWeeklyEmail(config: { sermonImageUrl: string; sermonDescription: string; isSantaCena: boolean; articles: Post[] }) {
    const articlesHtml = config.articles.map(p => `
      <div style="background-color: #ffffff; border-radius: 16px; border: 1px solid #f1f5f9; overflow: hidden; margin-bottom: 24px;">
        ${p.imageUrl ? `<img src="${getOptimizedImageUrl(p.imageUrl)}" alt="${p.title}" style="width: 100%; max-height: 200px; object-fit: cover; display: block;" />` : ''}
        <div style="padding: 20px;">
          <span style="background-color: #dfb23f; color: #162a45; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 99px; text-transform: uppercase;">${p.category || 'Anuncio'}</span>
          <h3 style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 18px; color: #162a45; margin-top: 12px; margin-bottom: 8px;">${p.title}</h3>
          <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 16px 0;">${p.excerpt}</p>
          <a href="https://huelvachurch.com/actividades/${p.id}" target="_blank" style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; font-weight: bold; color: #162a45; text-decoration: none;">Leer más e inscribirse &rarr;</a>
        </div>
      </div>
    `).join('');

    const santaCenaAlert = config.isSantaCena ? `
      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 28px;">
        <span style="font-size: 24px;">🍷🍞</span>
        <h4 style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 16px; color: #b45309; margin: 8px 0 4px 0; font-weight: bold;">Celebración de la Santa Cena</h4>
        <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #78350f; line-height: 1.4; margin: 0;">Este domingo participaremos juntos en la mesa del Señor como familia espiritual. Prepara tu corazón.</p>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <base href="${window.location.origin}/" />
        <title>Huelva Church • Boletín Semanal</title>
      </head>
      <body style="background-color: #f8fafc; margin: 0; padding: 0; -webkit-text-size-adjust: 100%;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.02); border: 1px solid #edf2f7;">
                <!-- Header Banner -->
                <tr>
                  <td style="background-color: #162a45; padding: 40px; text-align: center; color: #ffffff;">
                    <!-- Logo Header -->
                    <img src="${window.location.origin}/images/Logotipo%20Blanco.png" alt="Huelva Church" style="max-height: 50px; margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto;" />
                    <p style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.6); margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif;">Boletín de Fin de Semana</p>
                  </td>
                </tr>
                
                <!-- Body Main -->
                <tr>
                  <td style="padding: 32px 32px 0 32px;">
                    <h2 style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 20px; color: #162a45; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Te Esperamos Este Domingo</h2>
                    <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">¡Hola familia! Qué gozo encontrarnos una vez más. Queremos animarte a sumarte con alegría a nuestra Celebración Principal del Fin de Semana.</p>
                    
                    <!-- Reunion Card -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; margin-bottom: 28px;">
                      ${config.sermonImageUrl ? `<img src="${getOptimizedImageUrl(config.sermonImageUrl)}" alt="Reunión del Domingo" style="width: 100%; height: auto; display: block;" />` : ''}
                      <div style="padding: 24px;">
                        <h3 style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 18px; color: #162a45; margin-top: 0; margin-bottom: 8px;">Reunión General Familiar</h3>
                        <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: bold; font-size: 14px; color: #dfb23f; margin-top: 0; margin-bottom: 12px;">📅 ${meetingTime}</p>
                        <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #475569; line-height: 1.6; margin: 0;">${config.sermonDescription}</p>
                      </div>
                    </div>
                    
                    <!-- Santa Cena alert -->
                    ${santaCenaAlert}
                    
                    <!-- Featured Articles Section -->
                    ${config.articles.length > 0 ? `
                      <h2 style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 18px; color: #162a45; margin-top: 10px; margin-bottom: 16px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Avisos Destacados</h2>
                      ${articlesHtml}
                    ` : ''}
                  </td>
                </tr>

                <!-- Permanent Promos (Social Life) Section -->
                <tr>
                  <td style="padding: 0 32px 32px 32px;">
                    <h2 style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 18px; color: #162a45; margin-top: 16px; margin-bottom: 16px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; text-align: center;">Nuestra Vida como Iglesia</h2>
                    
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td width="33%" valign="top"><![endif]-->
                          <div style="display:inline-block; width:100%; max-width:180px; vertical-align:top; margin-bottom:16px;">
                            <div style="background-color:#f8fafc; border:1px solid #edf2f7; padding:16px; border-radius:16px; margin:0 4px; position:relative;">
                              <span style="font-size:24px; display:block; margin-bottom:8px;">🏠</span>
                              <h4 style="font-family:'Helvetica Neue', Arial, sans-serif; font-size:13px; color:#162a45; margin:0 0 4px 0; font-weight:bold;">Células de Hogar</h4>
                              <p style="font-family:'Helvetica Neue', Arial, sans-serif; font-size:11px; color:#64748b; margin:0 0 12px 0; line-height:1.4;">Conéctate con una familia de fe cerca de ti en Huelva.</p>
                              <a href="https://huelvachurch.com/celulas" target="_blank" style="text-decoration:none; display:inline-block; background-color:#dfb23f; color:#ffffff; font-family:'Helvetica Neue', Arial, sans-serif; font-size:11px; font-weight:bold; padding:6px 12px; border-radius:6px;">Ver Células</a>
                            </div>
                          </div>
                          <!--[if mso]></td><td width="33%" valign="top"><![endif]-->
                          <div style="display:inline-block; width:100%; max-width:180px; vertical-align:top; margin-bottom:16px;">
                            <div style="background-color:#f8fafc; border:1px solid #edf2f7; padding:16px; border-radius:16px; margin:0 4px; position:relative;">
                              <span style="font-size:24px; display:block; margin-bottom:8px;">🙏</span>
                              <h4 style="font-family:'Helvetica Neue', Arial, sans-serif; font-size:13px; color:#162a45; margin:0 0 4px 0; font-weight:bold;">Noches de Oración</h4>
                              <p style="font-family:'Helvetica Neue', Arial, sans-serif; font-size:11px; color:#64748b; margin:0 0 12px 0; line-height:1.4;">Únete de lunes a jueves a las 23:00h vía Google Meet.</p>
                              <a href="https://meet.google.com/huelva" target="_blank" style="text-decoration:none; display:inline-block; background-color:#dfb23f; color:#ffffff; font-family:'Helvetica Neue', Arial, sans-serif; font-size:11px; font-weight:bold; padding:6px 12px; border-radius:6px;">Conectar Meet</a>
                            </div>
                          </div>
                          <!--[if mso]></td><td width="33%" valign="top"><![endif]-->
                          <div style="display:inline-block; width:100%; max-width:180px; vertical-align:top; margin-bottom:16px;">
                            <div style="background-color:#f8fafc; border:1px solid #edf2f7; padding:16px; border-radius:16px; margin:0 4px; position:relative;">
                              <span style="font-size:24px; display:block; margin-bottom:8px;">📻</span>
                              <h4 style="font-family:'Helvetica Neue', Arial, sans-serif; font-size:13px; color:#162a45; margin:0 0 4px 0; font-weight:bold;">Radio Online</h4>
                              <p style="font-family:'Helvetica Neue', Arial, sans-serif; font-size:11px; color:#64748b; margin:0 0 12px 0; line-height:1.4;">Sintoniza y descarga la App en tu dispositivo Android.</p>
                              <a href="https://play.google.com/store/apps/details?id=com.huelvachurch.radio" target="_blank" style="text-decoration:none; display:inline-block; background-color:#dfb23f; color:#ffffff; font-family:'Helvetica Neue', Arial, sans-serif; font-size:11px; font-weight:bold; padding:6px 12px; border-radius:6px;">Escuchar Ahora</a>
                            </div>
                          </div>
                          <!--[if mso]></td></tr></table><![endif]-->
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Contact Footer Links -->
                <tr>
                  <td style="background-color: #f8fafc; border-top: 1px solid #edf2f7; padding: 32px; text-align: center;">
                    <!-- Social Media Icons -->
                    <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 0 6px;">
                          <a href="https://www.instagram.com/huelvachurch/" target="_blank" style="text-decoration: none;">
                            <table border="0" cellpadding="0" cellspacing="0" width="44" height="44" style="background-color: #ffffff; border: 1px solid #edf2f7; border-radius: 12px;">
                              <tr><td align="center" valign="middle"><img src="https://img.icons8.com/ios-glyphs/30/94a3b8/instagram-new.png" alt="Instagram" width="20" height="20" style="display: block;" /></td></tr>
                            </table>
                          </a>
                        </td>
                        <td style="padding: 0 6px;">
                          <a href="https://www.facebook.com/huelvachurch" target="_blank" style="text-decoration: none;">
                            <table border="0" cellpadding="0" cellspacing="0" width="44" height="44" style="background-color: #ffffff; border: 1px solid #edf2f7; border-radius: 12px;">
                              <tr><td align="center" valign="middle"><img src="https://img.icons8.com/ios-glyphs/30/94a3b8/facebook-new.png" alt="Facebook" width="20" height="20" style="display: block;" /></td></tr>
                            </table>
                          </a>
                        </td>
                        <td style="padding: 0 6px;">
                          <a href="https://www.youtube.com/@huelvachurch" target="_blank" style="text-decoration: none;">
                            <table border="0" cellpadding="0" cellspacing="0" width="44" height="44" style="background-color: #ffffff; border: 1px solid #edf2f7; border-radius: 12px;">
                              <tr><td align="center" valign="middle"><img src="https://img.icons8.com/ios-glyphs/30/94a3b8/youtube-play.png" alt="YouTube" width="20" height="20" style="display: block;" /></td></tr>
                            </table>
                          </a>
                        </td>
                        <td style="padding: 0 6px;">
                          <a href="https://wa.me/34600000000" target="_blank" style="text-decoration: none;">
                            <table border="0" cellpadding="0" cellspacing="0" width="44" height="44" style="background-color: #ffffff; border: 1px solid #edf2f7; border-radius: 12px;">
                              <tr><td align="center" valign="middle"><img src="https://img.icons8.com/ios-glyphs/30/94a3b8/whatsapp.png" alt="WhatsApp" width="20" height="20" style="display: block;" /></td></tr>
                            </table>
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0 0 16px 0;">
                      HuelvaChurch &copy; ${new Date().getFullYear()}<br>
                      Calle de Los Marismeños, 6, Huelva<br>
                      Has recibido este email porque estás suscrito a las comunicaciones informativas de nuestra congregación.
                    </p>
                    <p style="margin: 0;">
                      <a href="#" style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #162a45; font-weight: bold; text-decoration: underline; margin: 0 8px;">Administrar Suscripción</a> • 
                      <a href="#" style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #dfb23f; font-weight: bold; text-decoration: underline; margin: 0 8px;">Darse de Baja</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  // HTML Compiler: Special Announcement on the Fly
  function compileSpecialEmail(config: { subject: string; content: string; btnText?: string; btnUrl?: string }) {
    // Basic Markdown to Mail html replacements
    let styledBody = config.content
      .replace(/\n\n/g, '</p><p style="font-family: \'Helvetica Neue\', Arial, sans-serif; font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/### (.*?)(<br>|<\/p>|$)/g, '<h3 style="font-family: \'Helvetica Neue\', Arial, sans-serif; font-size: 18px; color: #162a45; margin-top: 24px; margin-bottom: 12px; font-weight: bold;">$1</h3>')
      .replace(/- \*\*(.*?)\*\*/g, '<li style="margin-bottom: 8px;"><strong>$1</strong>')
      .replace(/- (.*?)(<br>|<\/p>|$)/g, '<li style="font-family: \'Helvetica Neue\', Arial, sans-serif; font-size: 14px; color: #475569; margin-bottom: 8px;">$1</li>');

    // Wrap list items
    if (styledBody.includes('<li')) {
      // Very simple wrapping logic
      styledBody = styledBody.replace(/(<li.*?<\/li>)/gs, '<ul style="padding-left: 20px; margin-top: 8px; margin-bottom: 16px;">$1</ul>');
    }

    const buttonHtml = (config.btnText && config.btnUrl) ? `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${config.btnUrl}" target="_blank" style="background-color: #dfb23f; color: #162a45; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px rgba(223,178,63,0.15); text-transform: uppercase; letter-spacing: 0.5px;">
          ${config.btnText}
        </a>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <base href="${window.location.origin}/" />
        <title>${config.subject}</title>
      </head>
      <body style="background-color: #f8fafc; margin: 0; padding: 0; -webkit-text-size-adjust: 100%;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.02); border: 1px solid #edf2f7;">
                <!-- Header Logo -->
                <tr>
                  <td style="background-color: #162a45; padding: 40px; text-align: center; color: #ffffff; border-bottom: 4px solid #dfb23f;">
                    <img src="${window.location.origin}/images/Logotipo%20Blanco.png" alt="Huelva Church" style="max-height: 50px; display: block; margin-left: auto; margin-right: auto;" />
                  </td>
                </tr>
                
                <!-- Body Main -->
                <tr>
                  <td style="padding: 40px;">
                    <span style="color: #dfb23f; font-size: 11px; font-weight: bold; text-transform: uppercase; tracking-spacing: 1.5px; display: block; margin-bottom: 8px; font-family: 'Helvetica Neue', Arial, sans-serif;">Comunicado Especial</span>
                    <h1 style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 22px; color: #162a45; margin-top: 0; margin-bottom: 24px; line-height: 1.3; font-weight: 800;">${config.subject}</h1>
                    
                    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #475569; line-height: 1.6;">
                      <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 15px; color: #475569; line-height: 1.6; margin: 0px 0px 16px 0px;">${styledBody}</p>
                    </div>

                    ${buttonHtml}
                    
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
                    <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #475569; font-style: italic; margin: 0; line-height: 1.5;">
                      Atentamente,<br>
                      <strong>Equipo de Comunicaciones</strong><br>
                      <strong>Huelva Church</strong>
                    </p>
                  </td>
                </tr>

                <!-- Contact Footer Links -->
                <tr>
                  <td style="background-color: #f8fafc; border-top: 1px solid #edf2f7; padding: 32px; text-align: center;">
                    <!-- Social Media Icons -->
                    <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 0 6px;">
                          <a href="https://www.instagram.com/huelvachurch/" target="_blank" style="text-decoration: none;">
                            <table border="0" cellpadding="0" cellspacing="0" width="44" height="44" style="background-color: #ffffff; border: 1px solid #edf2f7; border-radius: 12px;">
                              <tr><td align="center" valign="middle"><img src="https://img.icons8.com/ios-glyphs/30/94a3b8/instagram-new.png" alt="Instagram" width="20" height="20" style="display: block;" /></td></tr>
                            </table>
                          </a>
                        </td>
                        <td style="padding: 0 6px;">
                          <a href="https://www.facebook.com/huelvachurch" target="_blank" style="text-decoration: none;">
                            <table border="0" cellpadding="0" cellspacing="0" width="44" height="44" style="background-color: #ffffff; border: 1px solid #edf2f7; border-radius: 12px;">
                              <tr><td align="center" valign="middle"><img src="https://img.icons8.com/ios-glyphs/30/94a3b8/facebook-new.png" alt="Facebook" width="20" height="20" style="display: block;" /></td></tr>
                            </table>
                          </a>
                        </td>
                        <td style="padding: 0 6px;">
                          <a href="https://www.youtube.com/@huelvachurch" target="_blank" style="text-decoration: none;">
                            <table border="0" cellpadding="0" cellspacing="0" width="44" height="44" style="background-color: #ffffff; border: 1px solid #edf2f7; border-radius: 12px;">
                              <tr><td align="center" valign="middle"><img src="https://img.icons8.com/ios-glyphs/30/94a3b8/youtube-play.png" alt="YouTube" width="20" height="20" style="display: block;" /></td></tr>
                            </table>
                          </a>
                        </td>
                        <td style="padding: 0 6px;">
                          <a href="https://wa.me/34600000000" target="_blank" style="text-decoration: none;">
                            <table border="0" cellpadding="0" cellspacing="0" width="44" height="44" style="background-color: #ffffff; border: 1px solid #edf2f7; border-radius: 12px;">
                              <tr><td align="center" valign="middle"><img src="https://img.icons8.com/ios-glyphs/30/94a3b8/whatsapp.png" alt="WhatsApp" width="20" height="20" style="display: block;" /></td></tr>
                            </table>
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0 0 16px 0;">
                      HuelvaChurch &copy; ${new Date().getFullYear()}<br>
                      Calle de Los Marismeños, 6, Huelva<br>
                      Has recibido este email porque estás suscrito a las comunicaciones de nuestra congregación.
                    </p>
                    <p style="margin: 0;">
                      <a href="#" style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #162a45; font-weight: bold; text-decoration: underline; margin: 0 8px;">Administrar Suscripción</a> • 
                      <a href="#" style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #dfb23f; font-weight: bold; text-decoration: underline; margin: 0 8px;">Darse de Baja</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  // Handle subscriber submit
  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setSubmittingSub(true);
    try {
      const emails = newEmail.split(/[\n,;]+/).map(em => em.trim().toLowerCase()).filter(em => em && em.includes('@'));
      if (emails.length === 0) {
        alert('No se encontraron correos electrónicos válidos.');
        setSubmittingSub(false);
        return;
      }

      let addedCount = 0;
      let existingCount = 0;

      for (const email of emails) {
        // Check if email already exists
        const q = query(collection(db, 'subscribers'), where('email', '==', email));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          existingCount++;
          continue;
        }

        await addDoc(collection(db, 'subscribers'), {
          email: email,
          active: true,
          subscribedAt: serverTimestamp()
        });
        addedCount++;
      }
      
      setNewEmail('');
      if (emails.length === 1 && existingCount === 1) {
        alert('Este correo electrónico ya está registrado como suscriptor.');
      } else if (emails.length > 1) {
        alert(`Se han añadido ${addedCount} nuevos suscriptores. ${existingCount > 0 ? `(${existingCount} ya estaban registrados o eran inválidos)` : ''}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error al añadir suscritor en Firestore.');
    } finally {
      setSubmittingSub(false);
    }
  };

  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (window.confirm(`¿Estás seguro de eliminar a ${email} como suscriptor?`)) {
      try {
        await deleteDoc(doc(db, 'subscribers', id));
      } catch (error) {
        console.error(error);
        alert('Error al eliminar suscritor.');
      }
    }
  };

  // Run Test Email Sending
  const handleSendTest = async () => {
    if (!sendTestEmail.trim()) {
      alert('Por favor introduce un correo de destino.');
      return;
    }
    setIsSendingTest(true);
    setApiResponse(null);

    const subject = campaignType === 'semanal' 
      ? 'Huelva Church • Boletín Semanal (Prueba)' 
      : specialSubject;

    try {
      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: sendTestEmail.trim(),
          subject,
          contentHtml: previewHtml
        })
      });

      const data = await res.json();
      setApiResponse(data);
      if (data.success) {
        alert(data.realDelivery 
          ? `¡Email de prueba enviado con éxito a ${sendTestEmail}!` 
          : `Simulación completada con éxito. El HTML fue construido de forma óptima.`
        );
      } else {
        alert(`Error al enviar correo: ${data.error || 'Desconocido'}`);
      }
    } catch (e: any) {
      console.error(e);
      alert('Error llamando a la API del Mailer del servidor.');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Broadcast campaign to all subscribers
  const handleBroadcast = async () => {
    const activeSubs = subscribers.filter(s => s.active);
    if (activeSubs.length === 0) {
      alert('No tienes ningún suscriptor activo en la base de datos.');
      return;
    }

    if (!window.confirm(`Estás a punto de enviar este boletín a ${activeSubs.length} suscriptores. ¿Quieres continuar?`)) {
      return;
    }

    setIsBroadcasting(false);
    setIsBroadcasting(true);
    setApiResponse(null);

    const subject = campaignType === 'semanal' 
      ? 'Huelva Church • Boletín Semanal' 
      : specialSubject;

    try {
      let sentCount = 0;
      let hadRealDelivery = false;
      let logs = '';

      // Loop through subscribers and dispatch sending
      for (const subscriber of activeSubs) {
        try {
          const res = await fetch('/api/newsletter/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: subscriber.email,
              subject,
              contentHtml: previewHtml
            })
          });
          const data = await res.json();
          if (data.success) {
            sentCount++;
            if (data.realDelivery) hadRealDelivery = true;
          }
        } catch (e) {
          console.error(`Error enviando correo a ${subscriber.email}:`, e);
        }
      }

      // Record campaign in historical databases
      await addDoc(collection(db, 'newsletters'), {
        type: campaignType,
        subject,
        contentHtml: previewHtml,
        status: 'sent',
        sentAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        sentCount,
        config: campaignType === 'semanal' ? {
          sermonImageUrl,
          sermonDescription,
          isSantaCena,
          selectedPostIds
        } : {
          specialSubject,
          specialContent,
          specialButtonText,
          specialButtonUrl
        }
      });

      alert(`Boletín enviado con éxito. Envíos procesados: ${sentCount}/${activeSubs.length}.`);
      setApiResponse({
        success: true,
        realDelivery: hadRealDelivery,
        details: `Campaña completada. Se guardó el registro de envío (Historial). Recipientes: ${sentCount}`
      });
    } catch (e: any) {
      console.error(e);
      alert('Error durante el proceso de difusión masiva.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Helper to Import content from a Blog Post for the Special format
  const handleImportPost = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      setSpecialSubject(`Novedad: ${post.title}`);
      setSpecialContent(`¡Hola familia Huelva Church!\n\nQueremos compartir con vosotros esta interesante publicación:\n\n### ${post.title}\n\n${post.excerpt || ''}\n\nPara ver vuestra participación, horarios o más detalles, pulsad el botón de abajo.\n\n¡Os enviamos un fuerte abrazo!`);
      setSpecialButtonText('Leer Publicación');
      setSpecialButtonUrl(`${window.location.origin}/actividades/${post.id}`);
      setSelectedPostToImport('');
      alert('Se han importado los campos desde la publicación correctamente.');
    }
  };

  // Helper to save current campaign as draft or scheduled
  const handleSaveCampaign = async (status: 'draft' | 'scheduled') => {
    const subject = campaignType === 'semanal' 
      ? 'Huelva Church • Boletín Semanal' 
      : specialSubject;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'newsletters'), {
        type: campaignType,
        subject,
        contentHtml: previewHtml,
        status,
        sentCount: 0,
        createdAt: serverTimestamp(),
        scheduledAt: status === 'scheduled' ? new Date(scheduledAt) : null,
        config: campaignType === 'semanal' ? {
          sermonImageUrl,
          sermonDescription,
          isSantaCena,
          selectedPostIds
        } : {
          specialSubject,
          specialContent,
          specialButtonText,
          specialButtonUrl
        }
      });

      if (status === 'scheduled') {
        alert(`¡Boletín programado con éxito! Se enviará de forma automática el ${new Date(scheduledAt).toLocaleString()}`);
      } else {
        alert('¡Borrador guardado con éxito!');
      }

      setActiveTab('history');
    } catch (err) {
      console.error('Error al guardar boletín:', err);
      alert('Ocurrió un error al guardar el boletín en la base de datos.');
    } finally {
      setIsSaving(false);
    }
  };

  // Dispatch sending of an existing saved draft campaign immediately
  const handleDirectSend = async (campaign: NewsletterCampaign) => {
    const activeSubs = subscribers.filter(s => s.active);
    if (activeSubs.length === 0) {
      alert('No hay suscriptores habilitados en la base de datos.');
      return;
    }

    if (!window.confirm(`¿Quieres enviar esta campaña de borrador a ${activeSubs.length} suscriptores ahora mismo?`)) {
      return;
    }

    setIsActionCampaignId(campaign.id);
    try {
      let sentCount = 0;
      for (const subscriber of activeSubs) {
        try {
          const res = await fetch('/api/newsletter/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: subscriber.email,
              subject: campaign.subject,
              contentHtml: campaign.contentHtml || ''
            })
          });
          const data = await res.json();
          if (data.success) {
            sentCount++;
          }
        } catch (e) {
          console.error(e);
        }
      }

      await updateDoc(doc(db, 'newsletters', campaign.id), {
        status: 'sent',
        sentAt: serverTimestamp(),
        sentCount,
        updatedAt: serverTimestamp()
      });

      alert(`Campaña enviada con éxito a ${sentCount} personas.`);
    } catch (e) {
      console.error(e);
      alert('Error enviando boletín.');
    } finally {
      setIsActionCampaignId(null);
    }
  };

  // Cancel delivery of a scheduled campaign and save it as draft
  const handleCancelScheduled = async (id: string) => {
    if (window.confirm('¿Quieres cancelar la programación de este envío y pasarlo a borrador?')) {
      try {
        await updateDoc(doc(db, 'newsletters', id), {
          status: 'draft',
          scheduledAt: null,
          updatedAt: serverTimestamp()
        });
        alert('Se ha cancelado la programación. El boletín ahora se encuentra como borrador.');
      } catch (err) {
        console.error(err);
        alert('Error al desprogramar la campaña.');
      }
    }
  };

  // Remove a campaign or draft from DB
  const handleDeleteCampaign = async (id: string) => {
    if (window.confirm('¿Deseas eliminar este borrador o registro de campaña definitivamente?')) {
      try {
        await deleteDoc(doc(db, 'newsletters', id));
        alert('Boletín eliminado correctamente.');
      } catch (err) {
        console.error(err);
        alert('Error al eliminar boletín.');
      }
    }
  };

  // Toggle selection inside lists
  const handleTogglePostId = (id: string) => {
    if (selectedPostIds.includes(id)) {
      setSelectedPostIds(selectedPostIds.filter(item => item !== id));
    } else {
      setSelectedPostIds([...selectedPostIds, id]);
    }
  };

  if (loading || !isAuthReady) return <div className="pt-32 text-center">Cargando...</div>;

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-kenao text-primary mb-2">Boletín e Informativos (Newsletter)</h1>
            <p className="text-primary/60">Gestiona tus suscriptores, diseña correos semanales o comunicados especiales y envíalos con formato profesional.</p>
          </div>
        </div>

        {/* Administration Tabs */}
        <div className="flex flex-col md:flex-row border-b border-slate-200 mb-8 gap-2">
          <button 
            onClick={() => setActiveTab('build')}
            className={`flex items-center gap-2 py-4 px-6 border-b-2 font-bold text-sm tracking-wide uppercase transition-all whitespace-nowrap ${activeTab === 'build' ? 'border-secondary text-secondary' : 'border-transparent text-primary/50 hover:text-primary'}`}
          >
            <Sparkles className="w-4 h-4" />
            Diseñar Boletín
          </button>
          
          <button 
            onClick={() => setActiveTab('subscribers')}
            className={`flex items-center gap-2 py-4 px-6 border-b-2 font-bold text-sm tracking-wide uppercase transition-all whitespace-nowrap ${activeTab === 'subscribers' ? 'border-secondary text-secondary' : 'border-transparent text-primary/50 hover:text-primary'}`}
          >
            <Users className="w-4 h-4" />
            Suscriptores ({subscribers.length})
          </button>

          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-4 px-6 border-b-2 font-bold text-sm tracking-wide uppercase transition-all whitespace-nowrap ${activeTab === 'history' ? 'border-secondary text-secondary' : 'border-transparent text-primary/50 hover:text-primary'}`}
          >
            <History className="w-4 h-4" />
            Historial de Envíos
          </button>
        </div>

        {/* --- TABS RENDERING --- */}
        <AnimatePresence mode="wait">
          
          {/* BUILDER TAB */}
          {activeTab === 'build' && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Form Config Left Panel */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Type Selection Box */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-xs text-secondary font-bold uppercase tracking-wider mb-4">Formato del Boletín</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCampaignType('semanal')}
                      className={`py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${campaignType === 'semanal' ? 'bg-primary text-white border-primary shadow' : 'bg-slate-50 text-primary border-slate-200/60 hover:bg-slate-100'}`}
                    >
                      Boletín Semanal
                    </button>
                    <button
                      type="button"
                      onClick={() => setCampaignType('especial')}
                      className={`py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${campaignType === 'especial' ? 'bg-primary text-white border-primary shadow' : 'bg-slate-50 text-primary border-slate-200/60 hover:bg-slate-100'}`}
                    >
                      Comunicado Especial
                    </button>
                  </div>
                </div>

                {/* Conditional Fields: WEEKLY */}
                {campaignType === 'semanal' ? (
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-lg font-kenao text-primary border-b border-slate-100 pb-3">Detalles de Próxima Reunión</h3>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-primary/60 block">Imagen Carátula de la Prédica (URL)</label>
                      <input 
                        type="url"
                        className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all"
                        placeholder="https://ejemplo.com/predica.jpg"
                        value={sermonImageUrl}
                        onChange={(e) => setSermonImageUrl(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-primary/60 block">Mensaje de Invitación / Resumen</label>
                      <textarea 
                        rows={4}
                        className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all leading-relaxed"
                        placeholder="Mensaje o título de la serie bíblica para animar a la congregación..."
                        value={sermonDescription}
                        onChange={(e) => setSermonDescription(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                      <input 
                        type="checkbox"
                        id="form-cena"
                        className="w-5 h-5 rounded border-slate-300 text-secondary focus:ring-secondary cursor-pointer"
                        checked={isSantaCena}
                        onChange={(e) => setIsSantaCena(e.target.checked)}
                      />
                      <label htmlFor="form-cena" className="text-xs font-bold text-amber-900 cursor-pointer">
                        ¿Celebración de la Santa Cena este Domingo? (Añade un banner recordatorio oportuno)
                      </label>
                    </div>

                    {/* Featured Posts Selector */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-primary/60 uppercase tracking-wide">Incluir Avisos Destacados</label>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-primary/40 font-bold">Actividades Destacadas</span>
                      </div>
                      
                      {posts.length === 0 ? (
                        <p className="text-xs text-primary/40 italic">No hay publicaciones registradas.</p>
                      ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                          {posts.map(post => {
                            const isSelected = selectedPostIds.includes(post.id);
                            return (
                              <div 
                                key={post.id}
                                onClick={() => handleTogglePostId(post.id)}
                                className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${isSelected ? 'bg-secondary/10 border-secondary' : 'bg-slate-50 border-slate-200/50 hover:bg-slate-100'}`}
                              >
                                <div className="truncate">
                                  <p className="text-xs font-bold text-primary truncate leading-tight">{post.title}</p>
                                  <p className="text-[10px] text-primary/50 mt-1 uppercase font-bold">{post.category}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'bg-secondary border-secondary text-primary' : 'border-slate-300 bg-white'}`}>
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      <p className="text-[10px] text-primary/40 leading-relaxed italic">Puedes activar el interruptor &quot;Destacado&quot; en cualquier anuncio dentro de la sección de Comunicaciones para listarlo aquí por defecto.</p>
                    </div>
                  </div>
                ) : (
                  
                  /* Conditional Fields: SPECIAL */
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-lg font-kenao text-primary border-b border-slate-100 pb-3">Detalles del Comunicado</h3>
                    
                    <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
                      <label className="text-xs font-bold text-primary/60 block">Importar desde una Publicación / Anuncio</label>
                      <select 
                        className="w-full px-4 py-3 text-xs bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all cursor-pointer"
                        value={selectedPostToImport}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedPostToImport(val);
                          if (val) handleImportPost(val);
                        }}
                      >
                        <option value="">-- Selecciona un anuncio para autorellenar campos --</option>
                        {posts.map(post => (
                          <option key={post.id} value={post.id}>{post.title} [{post.category}]</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-primary/45">
                        Al elegir una publicación, rellenaremos de forma instantánea el asunto, contenido general y crearemos un enlace directo al artículo en la web.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-primary/60 block">Asunto / Título del Correo</label>
                      <input 
                        type="text"
                        required
                        className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all"
                        placeholder="Ej. Cambio de horario o invitación especial..."
                        value={specialSubject}
                        onChange={(e) => setSpecialSubject(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <label className="text-xs font-bold text-primary/60 block">Contenido del Comunicado (Soporta Markdown)</label>
                        <button
                          type="button"
                          onClick={handleGenerateSpecialAI}
                          disabled={isGeneratingAI}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:shadow-md transition-all self-start md:self-auto disabled:opacity-70"
                        >
                          {isGeneratingAI ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          Generar con IA
                        </button>
                      </div>
                      <textarea 
                        rows={8}
                        className="w-full px-4 py-3 text-xs md:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all font-mono leading-relaxed"
                        placeholder="Redacta el contenido principal del email aquí. O si deseas, escribe un contexto básico (ej. 'Recuerda que este sábado habrá evento de comida') y presiona 'Generar con IA'."
                        value={specialContent}
                        onChange={(e) => setSpecialContent(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-primary/60 block">Texto del Botón Acción</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all"
                          placeholder="Saber más"
                          value={specialButtonText}
                          onChange={(e) => setSpecialButtonText(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-primary/60 block">Enlace del Botón (URL)</label>
                        <input 
                          type="url"
                          className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all"
                          placeholder="https://huelvachurch.com/ejemplo"
                          value={specialButtonUrl}
                          onChange={(e) => setSpecialButtonUrl(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Broadcast controls */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-xs text-secondary font-bold uppercase tracking-wider mb-2">Prueba y Envío Difusión</h4>
                  
                  {/* Test Mail Form */}
                  <div className="flex gap-2">
                    <input 
                      type="email"
                      className="flex-grow px-4 py-3 text-xs rounded-xl border border-slate-200 outline-none"
                      placeholder="Correo de prueba"
                      value={sendTestEmail}
                      onChange={(e) => setSendTestEmail(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleSendTest}
                      disabled={isSendingTest}
                      className="bg-slate-100 text-primary border border-slate-200/50 hover:bg-slate-200 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2"
                    >
                      {isSendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      Test
                    </button>
                  </div>

                  {/* Save Draft / Schedule Controls */}
                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        id="should-schedule"
                        className="w-5 h-5 rounded border-slate-300 text-secondary focus:ring-secondary cursor-pointer"
                        checked={shouldSchedule}
                        onChange={(e) => setShouldSchedule(e.target.checked)}
                      />
                      <label htmlFor="should-schedule" className="text-xs font-bold text-primary/60 cursor-pointer">
                        Programar este boletín para más tarde
                      </label>
                    </div>

                    {shouldSchedule && (
                      <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-2xl space-y-2">
                        <label className="text-xs font-bold text-primary/60 block">Fecha y Hora de Envío</label>
                        <input 
                          type="datetime-local"
                          className="w-full px-4 py-3 text-xs bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all cursor-pointer"
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                        />
                        <p className="text-[10px] text-primary/45">
                          Por defecto se selecciona el próximo sábado a las 20:00 (hora local de preparación). Puedes modificarlo según las necesidades.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleSaveCampaign('draft')}
                        disabled={isSaving}
                        className="bg-slate-100 hover:bg-slate-200 text-primary border border-slate-200/50 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                      >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Guardar Borrador
                      </button>

                      <button
                        type="button"
                        onClick={() => shouldSchedule ? handleSaveCampaign('scheduled') : handleBroadcast()}
                        disabled={isSaving || isBroadcasting || (shouldSchedule && !scheduledAt)}
                        className={`text-white font-bold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 uppercase text-xs tracking-wider ${shouldSchedule ? 'bg-[#dfb23f] hover:bg-[#c99e32] text-primary' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                      >
                        {(isSaving || isBroadcasting) && <Loader2 className="w-4 h-4 animate-spin" />}
                        {shouldSchedule ? 'Programar Envío' : `Enviar Ahora (${subscribers.filter(s => s.active).length})`}
                      </button>
                    </div>
                  </div>
                  
                  {/* Sandbox Info Alert */}
                  <div className="p-4 rounded-2xl bg-amber-50 text-amber-800 text-[11px] leading-relaxed border border-amber-100 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <strong>Aviso para Administradores</strong> <br />
                      Si la configuración SMTP no está declarada en el archivo de entorno (`.env`), el sistema simulará el envío masivo renderizando todo adecuadamente por el canal local. Si deseas vincular la cuenta real de vuestro correo electrónico, rellena el archivo con vuestros datos de servidor de salida.
                    </div>
                  </div>
                </div>

              </div>

              {/* Dynamic live html render review inside an iframe */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 flex flex-col h-[700px]">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      <span className="text-[11px] text-primary/40 font-mono font-bold ml-2">vista-previa-del-correo.html</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded tracking-wider">Visualización En Tiempo Real</span>
                  </div>
                  <div className="flex-grow bg-slate-100 p-2 relative">
                    <iframe 
                      title="Newsletter HTML Preview"
                      srcDoc={previewHtml}
                      className="w-full h-full bg-white rounded-2xl border border-slate-200/50 shadow-inner"
                      sandbox="allow-same-origin allow-scripts allow-popups"
                    />
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* SUBSCRIBERS TAB */}
          {activeTab === 'subscribers' && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="space-y-6"
            >
              
              {/* Form Manual Add */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-xl font-kenao text-primary">Añadir Suscriptores Manualmente</h3>
                  <p className="text-primary/60 text-xs mt-2">Agrega nuevas direcciones de correo a la base de datos de envíos. Puedes añadir varios correos separados por comas o líneas (ej. para importar 60 correos masivamente).</p>
                </div>
                <form onSubmit={handleAddSubscriber} className="flex flex-col md:flex-row gap-4 w-full md:w-2/3 shrink-0 items-end md:items-start">
                  <textarea 
                    required
                    placeholder="ejemplo1@correo.com, ejemplo2@correo.com..."
                    className="px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-secondary w-full min-h-[100px] resize-y"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  ></textarea>
                  <button 
                    type="submit"
                    disabled={submittingSub}
                    className="bg-primary text-white shrink-0 font-bold px-6 py-4 rounded-xl hover:bg-secondary hover:text-primary transition-all uppercase text-xs tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 w-full md:w-auto"
                  >
                    {submittingSub ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Registrar
                  </button>
                </form>
              </div>

              {/* Subscribers list details Table */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-kenao text-lg text-primary">Listado de Emails de Suscriptores</h3>
                  <span className="bg-secondary/10 text-secondary text-xs font-bold px-3 py-1 rounded-full">{subscribers.length} en total</span>
                </div>
                
                {subscribers.length === 0 ? (
                  <div className="p-12 text-center text-primary/40 italic">
                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    No hay ningún suscriptor registrado en este momento.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50 text-primary/50 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="p-6">Correo Electrónico</th>
                          <th className="p-6">Fecha Registro</th>
                          <th className="p-6">Estado</th>
                          <th className="p-6 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subscribers.map(sub => (
                          <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-6 font-bold text-primary font-mono">{sub.email}</td>
                            <td className="p-6 text-primary/60 font-medium">
                              {sub.subscribedAt?.toDate 
                                ? sub.subscribedAt.toDate().toLocaleString() 
                                : 'Recién incorporado'}
                            </td>
                            <td className="p-6">
                              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-100">
                                Activo
                              </span>
                            </td>
                            <td className="p-6 text-right">
                              <button
                                onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2.5 rounded-lg transition-all inline-flex items-center"
                                title="Eliminar suscriptor"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {/* CAMPAIGN HISTORY TAB */}
          {activeTab === 'history' && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="font-kenao text-lg text-primary">Histórico de Boletines, Borradores y Planificación</h3>
                  <p className="text-xs text-primary/60 mt-1">Consulta los borradores guardados, boletines planificados en la cola y campañas enviadas previamente.</p>
                </div>
                
                {history.length === 0 ? (
                  <div className="p-16 text-center text-primary/40 italic">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    No hay campañas, borradores ni programaciones registradas en este momento.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50 text-primary/50 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="p-6">Asunto / Título</th>
                          <th className="p-6">Formato</th>
                          <th className="p-6">Fecha / Planificación</th>
                          <th className="p-6">Receptores</th>
                          <th className="p-6 font-semibold text-center">Estado</th>
                          <th className="p-6 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {history.map(camp => {
                          const status = camp.status || 'sent';
                          return (
                            <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-6 font-bold text-primary max-w-xs truncate">{camp.subject}</td>
                              <td className="p-6">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${camp.type === 'semanal' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-pink-50 text-pink-700 border-pink-100'}`}>
                                  {camp.type === 'semanal' ? 'Semanal' : 'Especial'}
                                </span>
                              </td>
                              <td className="p-6 text-primary/60 font-medium">
                                {status === 'scheduled' ? (
                                  <span className="text-[#dfb23f] font-bold inline-flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                                    <Clock className="w-3.5 h-3.5" />
                                    {camp.scheduledAt?.toDate 
                                      ? camp.scheduledAt.toDate().toLocaleString() 
                                      : camp.scheduledAt instanceof Date
                                        ? camp.scheduledAt.toLocaleString()
                                        : new Date(camp.scheduledAt).toLocaleString()}
                                  </span>
                                ) : status === 'draft' ? (
                                  <span className="text-slate-400 font-medium italic">Borrador Guardado</span>
                                ) : (
                                  camp.sentAt?.toDate 
                                    ? camp.sentAt.toDate().toLocaleString() 
                                    : 'Recién emitido'
                                )}
                              </td>
                              <td className="p-6 font-bold text-primary font-mono text-xs">
                                {status === 'sent' ? `${camp.sentCount || 0} personas` : '—'}
                              </td>
                              <td className="p-6 text-center">
                                {status === 'sent' ? (
                                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-100">
                                    Completado
                                  </span>
                                ) : status === 'scheduled' ? (
                                  <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-amber-100 animate-pulse">
                                    Programado
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-slate-200">
                                    Borrador
                                  </span>
                                )}
                              </td>
                              <td className="p-6 text-right">
                                <div className="flex justify-end items-center gap-2">
                                  {(status === 'draft' || status === 'scheduled') && (
                                    <>
                                      <button
                                        onClick={() => handleDirectSend(camp)}
                                        disabled={isActionCampaignId === camp.id}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                                        title="Enviar inmediatamente"
                                      >
                                        {isActionCampaignId === camp.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Send className="w-3 h-3" />
                                        )}
                                        Enviar Ya
                                      </button>
                                      
                                      <button
                                        onClick={() => {
                                          setCampaignType(camp.type);
                                          if (camp.type === 'semanal') {
                                            setSermonImageUrl(camp.config?.sermonImageUrl || '');
                                            setSermonDescription(camp.config?.sermonDescription || '');
                                            setIsSantaCena(camp.config?.isSantaCena || false);
                                            setSelectedPostIds(camp.config?.selectedPostIds || []);
                                          } else {
                                            setSpecialSubject(camp.config?.specialSubject || '');
                                            setSpecialContent(camp.config?.specialContent || '');
                                            setSpecialButtonText(camp.config?.specialButtonText || '');
                                            setSpecialButtonUrl(camp.config?.specialButtonUrl || '');
                                          }
                                          setActiveTab('build');
                                          alert('Datos del borrador cargados con éxito en la sección Diseñar Boletín.');
                                        }}
                                        className="bg-slate-50 hover:bg-slate-100 text-primary border border-slate-200/50 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
                                        title="Cargar borrador en el editor"
                                      >
                                        Editar
                                      </button>
                                    </>
                                  )}

                                  {status === 'scheduled' && (
                                    <button
                                      onClick={() => handleCancelScheduled(camp.id)}
                                      className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200/50 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
                                      title="Desprogramar y volver a borrador"
                                    >
                                      Cancelar
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleDeleteCampaign(camp.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all inline-flex items-center"
                                    title="Eliminar borrador o registro definitivo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </motion.div>
          )}

        </AnimatePresence>

      </div>
    </div>
  );
}
