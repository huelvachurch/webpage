import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = fs.existsSync(firebaseConfigPath) ? JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8")) : null;

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Initialize Firebase client on the server
let db: any = null;
if (firebaseConfig) {
  const firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
}

// Shared helper to send a single HTML email (real or simulated)
async function sendSingleEmail(to: string, subject: string, contentHtml: string): Promise<{ success: boolean; realDelivery: boolean; messageId?: string; error?: string }> {
  try {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user || 'Huelva Church <noreply@huelvachurch.com>';

    if (host && port && user && pass) {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: parseInt(port) === 465,
        auth: {
          user,
          pass,
        },
      });

      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html: contentHtml,
      });

      console.log(`[SMTP] Correo enviado real a: ${to} | Asunto: ${subject} | ID: ${info.messageId}`);
      return { success: true, realDelivery: true, messageId: info.messageId };
    } else {
      console.log(`[Simulado] Correo para: ${to} | Asunto: ${subject}`);
      return { success: true, realDelivery: false };
    }
  } catch (error: any) {
    console.error(`Error enviando correo a ${to}:`, error);
    return { success: false, realDelivery: false, error: error.message };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Image proxy for Google Drive and other external images
  app.get("/api/image-proxy", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).json({ error: "Missing url parameter" });
      }

      // Basic validation
      const parsedUrl = new URL(imageUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
         return res.status(400).json({ error: "Invalid URL protocol" });
      }

      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch image" });
      }

      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      
      // Cache the image for 1 hour to reduce bandwidth
      res.setHeader("Cache-Control", "public, max-age=3600");

      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error("Image Proxy Error:", error.message);
      res.status(500).json({ error: "Internal server proxy error", details: error.message });
    }
  });

  // Generate Post with AI endpoint
  app.post("/api/gemini/generate-post", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "Gemini API integration missing." });
      }

      const { prompt, imageData, imageMimeType } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt" });
      }

      const instruction = `Eres un redactor de contenido experto para la sección de blog del sitio web de la Iglesia Cristiana Evangélica "Huelva Church". Tu rol es redactar publicaciones orientadas a nuestra comunidad cristiana. El tono debe ser motivador, alegre, fiel y entusiasta, usando versículos bíblicos enfocados en la edificación y la fe. Evita temas controversiales. Integra 1 a 2 versículos bíblicos clave.

Genera el contenido para 3 idiomas: Español (ES), Inglés (EN) y Portugués (PT). Devuelve el resultado en formato JSON con la siguiente estructura exacta:
{
  "es": {
    "title": "...",
    "slug": "...",
    "category": "...",
    "tags": "...",
    "excerpt": "...",
    "content": "..."
  },
  "en": {
    "title": "...",
    "excerpt": "...",
    "content": "..."
  },
  "pt": {
    "title": "...",
    "excerpt": "...",
    "content": "..."
  }
}

Notas sobre los campos:
- El 'slug' solo va en Español (minúsculas, con guiones, sin acentos).
- 'tags' va solo en Español (etiquetas separadas por comas).
- Para 'category', usa una de las siguientes si aplica, o "Noticias" por defecto.
- 'excerpt' debe ser un resumen breve (2-3 líneas).
- 'content' debe estar en Markdown (usa ## para subtítulos, **negritas**, etc.). Mantén párrafos cortos e incluye versículos bíblicos fluidamente.`;

      const contents: any[] = [];
      contents.push(instruction);
      contents.push(`Aquí están las instrucciones o el evento del que hacer la publicación:\n${prompt}`);

      if (imageData && imageMimeType) {
        contents.push({
          inlineData: {
            data: imageData,
            mimeType: imageMimeType
          }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);

    } catch (error: any) {
      console.error("Gemini Post Generation Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate Newsletter with AI endpoint
  app.post("/api/gemini/generate-newsletter", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "Gemini API integration missing." });
      }

      const { prompt, hasPostContext } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt" });
      }

      const instruction = `Eres un redactor de contenido experto para comunicados de la Iglesia Cristiana Evangélica "Huelva Church". Tu rol es redactar un comunicado especial para ser enviado por correo electrónico a la congregación. El tono debe ser cálido, claro, pastoral y al mismo tiempo directo y fácil de leer.

Instrucciones:
${hasPostContext ? '- Usa el contexto provisto para redactar el evento/noticia, animando a la iglesia a participar.' : '- Redacta un correo completo basado exclusivamente en el texto provisto. Desarrolla la idea con un lenguaje cordial y familiar.'}
- Devuelve un único objeto JSON con dos campos: "subject" (el asunto del correo) y "content" (el cuerpo del correo).
- El "subject" debe ser breve e invitador.
- El "content" debe usar formato HTML básico o texto plano con retornos de carro. Usa etiquetas HTML como <br/> o <p> o <b> si usas formato, pero mantén un aspecto limpio y directo.

Genera el resultado en formato JSON con la siguiente estructura exacta:
{
  "subject": "...",
  "content": "..."
}`;

      const contents: any[] = [];
      contents.push(instruction);
      contents.push(`Aquí están las instrucciones o el evento del que hacer el comunicado:\n${prompt}`);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);

    } catch (error: any) {
      console.error("Gemini Newsletter Generation Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Translation Endpoint
  app.post("/api/translate", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "Gemini API integration missing." });
      }
      
      const { title, excerpt, content, targetLanguage } = req.body;
      const prompt = `Translate the following blog post details to ${targetLanguage}. Maintain the original markdown formatting for the content. Return the results in JSON format with three exact keys: "title", "excerpt", and "content".
      
      --- Title:
      ${title}
      
      --- Excerpt:
      ${excerpt}
      
      --- Content:
      ${content}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });
      
      let parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (error: any) {
      console.error("Translation Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe Checkout Session Endpoint
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { amount, type, description } = req.body;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: type || "Donación",
                description: description || "Ofrenda / Diezmo / Proyecto",
              },
              unit_amount: Math.round(amount * 100), // Amount in cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.APP_URL || "http://localhost:3000"}/dar?success=true`,
        cancel_url: `${process.env.APP_URL || "http://localhost:3000"}/dar?canceled=true`,
      });

      res.json({ id: session.id });
    } catch (error: any) {
      console.error("Stripe Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Newsletter Sending Endpoint (Real & Simulated)
  app.post("/api/newsletter/send", async (req, res) => {
    try {
      const { to, subject, contentHtml } = req.body;

      if (!to || !subject || !contentHtml) {
        return res.status(400).json({ error: "Faltan campos obligatorios (to, subject, contentHtml)" });
      }

      console.log(`Petición para enviar correo individual a: ${to}`);
      const result = await sendSingleEmail(to, subject, contentHtml);
      
      if (result.success) {
        res.json({
          success: true,
          realDelivery: result.realDelivery,
          messageId: result.messageId,
          details: result.realDelivery 
            ? `Enviado con éxito a través de SMTP` 
            : `Simulado con éxito (Modo Sandbox activo. Configura las variables SMTP en el archivo .env para envíos reales).`
        });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error: any) {
      console.error("Error en Newsletter Mailer Endpoint:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Email Notification for User Role / Status change
  app.post("/api/admin/notify-role-change", async (req, res) => {
    try {
      const { email, displayName, roles, status } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Faltan campos obligatorios (email)" });
      }

      const formattedRoles = Array.isArray(roles) 
        ? roles.map((r: string) => r.toUpperCase()).join(", ") 
        : typeof roles === "string" ? roles : "ALUMNO";

      const subject = `Actualización de tu cuenta en Huelva Church`;
      
      const contentHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0c1a30; font-size: 24px; margin: 0;">Huelva Church</h1>
            <p style="color: #b59410; font-size: 14px; margin: 4px 0 0 0; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Comunidad & Formación</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
            <p style="font-size: 16px; color: #334155; margin-top: 0;">¡Hola <strong>${displayName || 'Miembro'}</strong>!</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Te escribimos para informarte que un administrador ha actualizado los detalles de tu cuenta en el portal de nuestra iglesia.
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 0; font-size: 14px; color: #64748b; font-weight: bold;">Estado del Perfil:</td>
                <td style="padding: 10px 0; font-size: 14px; color: #0f172a; text-align: right; font-weight: bold;">
                  <span style="background-color: ${status === 'active' ? '#d1fae5' : '#fef3c7'}; color: ${status === 'active' ? '#065f46' : '#92400e'}; padding: 4px 10px; border-radius: 6px; font-size: 12px;">
                    ${status === 'active' ? 'ACTIVO' : status === 'pending' ? 'PENDIENTE' : 'BLOQUEADO'}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-size: 14px; color: #64748b; font-weight: bold;">Roles Asignados:</td>
                <td style="padding: 10px 0; font-size: 14px; color: #b59410; text-align: right; font-weight: bold;">
                  ${formattedRoles}
                </td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Si tienes dudas o deseas solicitar cambios adicionales, no dudes en ponerte en contacto con nosotros. Puedes empezar a disfrutar de nuestros servicios comunitarios e inscribirte a tus cursos ahora mismo.
          </p>
          
          <div style="text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 24px;">
            <a href="${process.env.APP_URL || 'https://huelvachurch.com'}" style="background-color: #0c1a30; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">
              Acceder al Portal
            </a>
            <p style="color: #94a3b8; font-size: 11px; margin-top: 20px;">
              Este es un correo electrónico de Huelva Church (huelvachurch@gmail.com).
            </p>
          </div>
        </div>
      `;

      const result = await sendSingleEmail(email, subject, contentHtml);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Error sending role notification:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // YouTube Latest Video Endpoint
  app.get("/api/youtube/latest", async (req, res) => {
    try {
      const apiKey = process.env.VITE_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
      const channelHandle = '@huelvachurch';
      
      if (!apiKey) {
        return res.status(200).json({ id: null, title: null, thumbnail: null });
      }

      const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${channelHandle}&key=${apiKey}`);
      const channelData = await channelRes.json();
      const channelId = channelData.items?.[0]?.id;

      if (!channelId) {
         return res.status(200).json({ id: null, title: null, thumbnail: null });
      }

      const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=1&type=video&key=${apiKey}`);
      const videoData = await videoRes.json();
      const video = videoData.items?.[0];
      
      if (video) {
        res.json({
          id: video.id.videoId,
          title: video.snippet.title,
          thumbnail: video.snippet.thumbnails.high.url
        });
      } else {
        res.status(200).json({ id: null, title: null, thumbnail: null });
      }
    } catch (error: any) {
      console.error("Error fetching YouTube video server-side:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // RSS Feed for Featured Posts (Publicaciones Destacadas)
  async function generateRssFeed(req: express.Request, res: express.Response) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (!db) {
      return res.status(500).send("Base de datos no inicializada");
    }

    try {
      const lang = (req.query.lang as string || 'es').toLowerCase();
      
      // Query "featured == true" posts
      const postsCol = collection(db, 'posts');
      const q = query(postsCol, where("featured", "==", true));
      const querySnapshot = await getDocs(q);
      
      const posts: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        posts.push({ id: doc.id, ...data });
      });

      // Filter in memory for safety (preventing composite index failures if 'status' filter is direct)
      // and sort descending by publishedAt
      const publishedFeatured = posts
        .filter(post => post.status === 'published')
        .sort((a, b) => {
          const tA = a.publishedAt?.toDate ? a.publishedAt.toDate().getTime() : (a.publishedAt?.seconds ? a.publishedAt.seconds * 1000 : 0);
          const tB = b.publishedAt?.toDate ? b.publishedAt.toDate().getTime() : (b.publishedAt?.seconds ? b.publishedAt.seconds * 1000 : 0);
          return tB - tA;
        });

      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;

      let xml = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
      xml += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
      xml += `<channel>\n`;
      xml += `  <title>Huelva Church - Publicaciones Destacadas</title>\n`;
      xml += `  <link>${baseUrl}</link>\n`;
      xml += `  <description>Boletín de publicaciones destacadas de la Iglesia Cristiana Evangélica en Huelva</description>\n`;
      xml += `  <language>${lang}</language>\n`;
      
      const lastBuildDate = publishedFeatured.length > 0 
        ? (publishedFeatured[0].publishedAt?.toDate ? publishedFeatured[0].publishedAt.toDate().toUTCString() : new Date().toUTCString())
        : new Date().toUTCString();
      xml += `  <lastBuildDate>${lastBuildDate}</lastBuildDate>\n`;
      xml += `  <atom:link href="${baseUrl}${req.originalUrl}" rel="self" type="application/rss+xml" />\n`;

      publishedFeatured.forEach(post => {
        // Form the localized text
        let title = post.title;
        let excerpt = post.excerpt;
        let content = post.content;

        if (lang === 'en') {
          title = post.title_en || post.title;
          excerpt = post.excerpt_en || post.excerpt;
          content = post.content_en || post.content;
        } else if (lang === 'pt') {
          title = post.title_pt || post.title;
          excerpt = post.excerpt_pt || post.excerpt;
          content = post.content_pt || post.content;
        }

        const postUrl = `${baseUrl}/actividades/${post.id}`;
        const pubDate = post.publishedAt?.toDate 
          ? post.publishedAt.toDate().toUTCString() 
          : (post.publishedAt?.seconds ? new Date(post.publishedAt.seconds * 1000).toUTCString() : new Date().toUTCString());

        xml += `  <item>\n`;
        xml += `    <title><![CDATA[${title || ''}]]></title>\n`;
        xml += `    <link>${postUrl}</link>\n`;
        xml += `    <guid isPermaLink="true">${postUrl}</guid>\n`;
        xml += `    <pubDate>${pubDate}</pubDate>\n`;
        if (excerpt) {
          xml += `    <description><![CDATA[${excerpt}]]></description>\n`;
        } else {
          xml += `    <description><![CDATA[${content ? content.substring(0, 200) + '...' : ''}]]></description>\n`;
        }
        
        // Add image as enclosure if present (amazing for other app reading/previewing)
        if (post.imageUrl) {
          xml += `    <enclosure url="${post.imageUrl}" type="image/jpeg" />\n`;
        }
        xml += `  </item>\n`;
      });

      xml += `</channel>\n`;
      xml += `</rss>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=1800'); // Cache for 30 minutes
      res.send(xml);

    } catch (error: any) {
      console.error("Error generating RSS Feed:", error);
      res.status(500).send("Error generating RSS Feed: " + error.message);
    }
  }

  // JSON API with CORS support for other sites to consume easily without RSS parsing limits
  app.get("/api/posts/featured", async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (!db) {
      return res.status(500).json({ error: "Base de datos no inicializada" });
    }

    try {
      const lang = (req.query.lang as string || 'es').toLowerCase();
      
      const postsCol = collection(db, 'posts');
      const q = query(postsCol, where("featured", "==", true));
      const querySnapshot = await getDocs(q);
      
      const posts: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        posts.push({ id: doc.id, ...data });
      });

      const publishedFeatured = posts
        .filter(post => post.status === 'published')
        .sort((a, b) => {
          const tA = a.publishedAt?.toDate ? a.publishedAt.toDate().getTime() : (a.publishedAt?.seconds ? a.publishedAt.seconds * 1000 : 0);
          const tB = b.publishedAt?.toDate ? b.publishedAt.toDate().getTime() : (b.publishedAt?.seconds ? b.publishedAt.seconds * 1000 : 0);
          return tB - tA;
        });

      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;

      const responseData = publishedFeatured.map(post => {
        let title = post.title;
        let excerpt = post.excerpt;
        let content = post.content;

        if (lang === 'en') {
          title = post.title_en || post.title;
          excerpt = post.excerpt_en || post.excerpt;
          content = post.content_en || post.content;
        } else if (lang === 'pt') {
          title = post.title_pt || post.title;
          excerpt = post.excerpt_pt || post.excerpt;
          content = post.content_pt || post.content;
        }

        return {
          id: post.id,
          title: title || "",
          category: post.category || "Noticias",
          link: `${baseUrl}/actividades/${post.id}`,
          excerpt: excerpt || (content ? content.substring(0, 160) + '...' : ""),
          imageUrl: post.imageUrl || "",
          publishedAt: post.publishedAt?.toDate ? post.publishedAt.toDate().toISOString() : (post.publishedAt?.seconds ? new Date(post.publishedAt.seconds * 1000).toISOString() : new Date().toISOString())
        };
      });

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=1800'); // Cache for 30 minutes
      res.json(responseData);

    } catch (error: any) {
      console.error("Error generating featured posts JSON:", error);
      res.status(500).json({ error: "Error fetching featured posts: " + error.message });
    }
  });

  app.get("/api/rss/featured", generateRssFeed);
  app.get("/rss.xml", generateRssFeed);
  app.get("/feed.xml", generateRssFeed);

  // Dynamic Open Graph Tags for Social Sharing (Facebook, WhatsApp, etc.)
  app.get("/actividades/:id", async (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const isBot = /bot|facebookexternalhit|whatsapp|telegram|twitter|linkedin|skype/i.test(userAgent);

    if (isBot && db) {
      try {
        const docRef = doc(db, 'posts', req.params.id);
        const postSnap = await getDoc(docRef);

        if (postSnap.exists()) {
          const data = postSnap.data();
          const title = `${data.title} | Huelva Church`;
          const excerpt = data.excerpt || "Iglesia Cristiana Evangélica en Huelva dedicada a compartir el amor de Jesús.";
          let imageUrl = data.imageUrl || "";

          if (imageUrl) {
            const match = imageUrl.match(/id=(.*?)(?:&|$)/) || imageUrl.match(/\/d\/(.*?)\//) || imageUrl.match(/\/d\/(.*?)$/);
            if (match && match[1]) {
                const driveId = match[1].split('&')[0];
                imageUrl = `https://lh3.googleusercontent.com/d/${driveId}`;
            } else if (/^[a-zA-Z0-9_-]{25,40}$/.test(imageUrl)) {
                imageUrl = `https://lh3.googleusercontent.com/d/${imageUrl}`;
            }
          }

          const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="${excerpt}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${excerpt}" />
  ${imageUrl ? `<meta property="og:image" content="${imageUrl}" />` : ''}
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image">
</head>
<body></body>
</html>`;
          return res.send(html);
        }
      } catch (err) {
        console.error("Error fetching post for social tags:", err);
      }
    }
    
    // Fall back to Vite/SPA
    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
