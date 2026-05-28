import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, Mail, Users, History, Send, Eye, Image as ImageIcon, Check, AlertCircle, Sparkles, BookOpen, 
  ExternalLink, Video, Radio, Youtube, Instagram, MessageCircle, FileText, Loader2, ArrowRight, Settings 
} from 'lucide-react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, 
  serverTimestamp, getDocs, where, setDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
}

interface Post {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  imageUrl?: string;
  featured?: boolean;
  publishedAt?: any;
}

export default function AdminNewsletter() {
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

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
  const [sermonImageUrl, setSermonImageUrl] = useState('https://images.unsplash.com/photo-1544427928-c49cddeb8976?q=80&w=1200');
  const [sermonDescription, setSermonDescription] = useState('Te invitamos a nuestra reunión de este domingo. Continuamos con nuestra serie mensual. ¡Ven con expectativa de adorar y recibir una palabra fresca de parte de Dios!');
  const [isSantaCena, setIsSantaCena] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  
  // Custom Special Newsletter Fields
  const [specialSubject, setSpecialSubject] = useState('Aviso importante: Campamento Familiar Huelva Church 2026');
  const [specialContent, setSpecialContent] = useState('¡Hola familia Huelva Church!\n\nNos complace mucho anunciar que ya están abiertas las inscripciones para el próximo Campamento Familiar de este verano. \n\nSerá un tiempo inolvidable de comunión, recreación, talleres específicos para matrimonios y jóvenes, y noches especiales de adoración.\n\n### Detalles Clave:\n- 📅 **Fechas**: 15 al 18 de Julio de 2026\n- 📍 **Lugar**: Albergue de la Sierra de Aracena, Huelva\n- 💰 **Precio**: 120€ por persona (con descuentos especiales para familias numerosas)\n\nPara inscribirte, haz clic en el botón inferior o ponte en contacto con los coordinadores de células.\n\n¡No te quedes fuera!');
  const [specialButtonText, setSpecialButtonText] = useState('Inscribirme Ahora');
  const [specialButtonUrl, setSpecialButtonUrl] = useState('https://huelvachurch.com/inscripciones');

  // Preview / Sending Actions
  const [previewHtml, setPreviewHtml] = useState('');
  const [sendTestEmail, setSendTestEmail] = useState(user?.email || 'huelvachurch@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
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

      // 3. Sent Campaigns History
      const qCampaigns = query(collection(db, 'newsletters'), orderBy('sentAt', 'desc'));
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
        ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.title}" style="width: 100%; max-height: 200px; object-fit: cover; display: block;" />` : ''}
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
                    <div style="font-size: 28px; font-weight: bold; letter-spacing: -0.5px; margin-bottom: 4px; font-family: 'Helvetica Neue', Arial, sans-serif;">
                      <span style="color: #ffffff;">Huelva</span><span style="color: #dfb23f; font-weight: 300;">Church</span>
                    </div>
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
                      ${config.sermonImageUrl ? `<img src="${config.sermonImageUrl}" alt="Reunión del Domingo" style="width: 100%; height: auto; display: block;" />` : ''}
                      <div style="padding: 24px;">
                        <h3 style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 18px; color: #162a45; margin-top: 0; margin-bottom: 8px;">Reunión General Familiar</h3>
                        <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: bold; font-size: 14px; color: #dfb23f; margin-top: 0; margin-bottom: 12px;">📅 Domingos a las 18:30h (Presencial)</p>
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
                    <h2 style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 18px; color: #162a45; margin-top: 16px; margin-bottom: 16px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Nuestra Vida como Iglesia</h2>
                    
                    <!-- Grid promos -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <!-- Celulas -->
                        <td width="50%" style="padding-right: 8px; padding-bottom: 16px; vertical-align: top;">
                          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 16px; min-height: 110px;">
                            <span style="font-size: 18px;">🏠</span>
                            <h4 style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #162a45; margin: 6px 0 2px 0; font-weight: bold;">Células de Hogar</h4>
                            <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #64748b; margin: 0; line-height: 1.3;">Familias e iglesias en las casas en toda la provincia de Huelva.</p>
                          </div>
                        </td>
                        <!-- Noches de oracion -->
                        <td width="50%" style="padding-left: 8px; padding-bottom: 16px; vertical-align: top;">
                          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 16px; min-height: 110px;">
                            <span style="font-size: 18px;">🙏</span>
                            <h4 style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #162a45; margin: 6px 0 2px 0; font-weight: bold;">Noches de Oración</h4>
                            <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #64748b; margin: 0; line-height: 1.3;">Reuniones virtuales de clamor. Lu - Ju 23:00h en Google Meet.</p>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <!-- Radio huelva church -->
                        <td width="50%" style="padding-right: 8px; vertical-align: top;">
                          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 16px; min-height: 110px;">
                            <span style="font-size: 18px;">📻</span>
                            <h4 style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #162a45; margin: 6px 0 2px 0; font-weight: bold;">Radio Online</h4>
                            <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #64748b; margin: 0; line-height: 1.3;">Sintoniza alabanzas y mensajes de fe las 24 horas del día.</p>
                          </div>
                        </td>
                        <!-- Youtube & Redes -->
                        <td width="50%" style="padding-left: 8px; vertical-align: top;">
                          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 16px; min-height: 110px;">
                            <span style="font-size: 18px;">🎬</span>
                            <h4 style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #162a45; margin: 6px 0 2px 0; font-weight: bold;">Canales de Medios</h4>
                            <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #64748b; margin: 0; line-height: 1.3;">Accede a todas las prédicas archivadas en YouTube, Instagram y WhatsApp.</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Contact Footer Links -->
                <tr>
                  <td style="background-color: #f8fafc; border-top: 1px solid #edf2f7; padding: 32px; text-align: center;">
                    <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0 0 16px 0;">
                      HuelvaChurch &copy; ${new Date().getFullYear()}<br>
                      Calle San Marcos s/n, CP 21005, Huelva, España<br>
                      Has recibido este email porque te suscribiste a las comunicaciones informativas de nuestra congregación.
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
        <title>${config.subject}</title>
      </head>
      <body style="background-color: #f8fafc; margin: 0; padding: 0; -webkit-text-size-adjust: 100%;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.02); border: 1px solid #edf2f7;">
                <!-- Header Logo -->
                <tr>
                  <td style="background-color: #162a45; padding: 32px 40px; text-align: left; color: #ffffff; border-bottom: 4px solid #dfb23f;">
                    <div style="font-size: 24px; font-weight: bold; font-family: 'Helvetica Neue', Arial, sans-serif;">
                      <span style="color: #ffffff;">Huelva</span><span style="color: #dfb23f; font-weight: 300;">Church</span>
                    </div>
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
                      <strong>Equipo de Medios • Huelva Church</strong>
                    </p>
                  </td>
                </tr>

                <!-- Contact Footer Links -->
                <tr>
                  <td style="background-color: #f8fafc; border-top: 1px solid #edf2f7; padding: 32px; text-align: center;">
                    <p style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #94a3b8; line-height: 1.6; margin: 0 0 16px 0;">
                      HuelvaChurch &copy; ${new Date().getFullYear()}<br>
                      Calle San Marcos s/n, CP 21005, Huelva, España<br>
                      Has recibido este email porque te suscribiste a las comunicaciones de nuestra congregación.
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
      // Check if email already exists
      const q = query(collection(db, 'subscribers'), where('email', '==', newEmail.toLowerCase().trim()));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        alert('Este correo eléctrico ya está registrado como suscriptor.');
        setSubmittingSub(false);
        return;
      }

      await addDoc(collection(db, 'subscribers'), {
        email: newEmail.toLowerCase().trim(),
        active: true,
        subscribedAt: serverTimestamp()
      });
      setNewEmail('');
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
        sentAt: serverTimestamp(),
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
        <div className="flex border-b border-slate-200 mb-8 overflow-x-auto gap-2">
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
                      Boletín Semanal (Sábados)
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
                      <label className="text-xs font-bold text-primary/60 block">Contenido del Comunicado (Soporta Markdown)</label>
                      <textarea 
                        rows={8}
                        className="w-full px-4 py-3 text-xs md:text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-secondary outline-none transition-all font-mono leading-relaxed"
                        placeholder="Redacta el contenido principal del email aquí..."
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

                  {/* Broadcast button */}
                  <button
                    type="button"
                    onClick={handleBroadcast}
                    disabled={isBroadcasting || subscribers.length === 0}
                    className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-all shadow flex items-center justify-center gap-2 uppercase text-xs tracking-wider"
                  >
                    {isBroadcasting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Enviar a todos los Suscriptores ({subscribers.filter(s => s.active).length} activos)
                  </button>
                  
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
                      sandbox="allow-popups allow-popups-to-escape-sandbox"
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
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h3 className="text-xl font-kenao text-primary">Añadir Suscriptor Manualmente</h3>
                  <p className="text-primary/60 text-xs">Agrega nuevas direcciones de correo a la base de datos de envíos de boletines.</p>
                </div>
                <form onSubmit={handleAddSubscriber} className="flex gap-2 w-full md:w-auto shrink-0">
                  <input 
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    className="px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-secondary min-w-[260px]"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={submittingSub}
                    className="bg-primary text-white font-bold px-6 py-3 rounded-xl hover:bg-secondary hover:text-primary transition-all uppercase text-xs tracking-wider flex items-center gap-2 disabled:opacity-50"
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
                  <h3 className="font-kenao text-lg text-primary">Histórico de Boletines Enviados</h3>
                  <p className="text-xs text-primary/60 mt-1">Consulta las campañas enviadas con anterioridad y sus volúmenes de entrega.</p>
                </div>
                
                {history.length === 0 ? (
                  <div className="p-16 text-center text-primary/40 italic">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    No hay campañas de boletines enviadas anteriormente en el registro histórico.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50 text-primary/50 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="p-6">Asunto Campaña</th>
                          <th className="p-6">Formato</th>
                          <th className="p-6">Fecha Envío</th>
                          <th className="p-6">Receptores</th>
                          <th className="p-6">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {history.map(camp => (
                          <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-6 font-bold text-primary max-w-xs truncate">{camp.subject}</td>
                            <td className="p-6">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${camp.type === 'semanal' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-pink-50 text-pink-700 border-pink-100'}`}>
                                {camp.type === 'semanal' ? 'Semanal' : 'Especial'}
                              </span>
                            </td>
                            <td className="p-6 text-primary/60 font-medium">
                              {camp.sentAt?.toDate 
                                ? camp.sentAt.toDate().toLocaleString() 
                                : 'Registrado recientemente'}
                            </td>
                            <td className="p-6 font-bold text-primary font-mono">{camp.sentCount || 0} emails</td>
                            <td className="p-6">
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                Procesado
                              </span>
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

        </AnimatePresence>

      </div>
    </div>
  );
}
