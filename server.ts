import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import fs from "fs";
import { GoogleAuth } from "google-auth-library";

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
  let vite: any = null;

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

      const instruction = `Eres un redactor de contenido experto para la sección de blog del sitio web de la Iglesia Cristiana Evangélica "Huelva Church". Tu rol es redactar publicaciones orientadas a nuestra comunidad cristiana. El tono debe ser motivador, alegre, fiel y entusiasta, usando versículos bíblicos enfocados en la edificación y la fe. Evita temas controversiales. Integra 1 a 2 versículos bíblicos clave. IMPORTANTE: Redacta siempre en primera persona del plural (nosotros, nuestro), hablando como iglesia o equipo pastoral, nunca como un individuo en singular (yo).

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
        model: 'gemini-3.1-flash-lite',
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

      const { prompt, hasPostContext, scheduledDate } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt" });
      }

      const dayContext = scheduledDate ? `Este correo se enviará el ${new Date(scheduledDate).toLocaleDateString('es-ES', { weekday: 'long' })}.` : '';

      const instruction = `Eres un redactor de contenido experto para comunicados de la Iglesia Cristiana Evangélica "Huelva Church". Tu rol es redactar un comunicado especial para ser enviado por correo electrónico a la congregación. El tono debe ser cálido, claro, pastoral y al mismo tiempo directo y fácil de leer. ${dayContext} IMPORTANTE: Redacta siempre en primera persona del plural (nosotros, nuestro), hablando como iglesia o equipo pastoral, nunca como un individuo en singular (yo).

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
        model: 'gemini-3.1-flash-lite',
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

  // Generate short text with AI endpoint
  app.post("/api/gemini/generate-short-text", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "Gemini API integration missing." });
      }

      const { promptType, context, scheduledDate } = req.body;
      let instruction = "";
      
      const dayContext = scheduledDate ? `Este boletín está programado para enviarse el ${new Date(scheduledDate).toLocaleDateString('es-ES', { weekday: 'long' })}.` : 'El día de envío es genérico o indefinido.';

      if (promptType === 'greeting') {
         instruction = `Eres el equipo pastoral de la iglesia 'Huelva Church'. Redacta UN solo párrafo (no más de 4 o 5 líneas) como un saludo muy cálido, amoroso y alegre para iniciar el boletín semanal de la iglesia. ${dayContext} Transmite gozo por nuestra comunión y anima a observar todas las secciones de este boletín para estar al tanto de lo nuevo. Motiva indirectamente a permanecer conectados mediante nuestras actividades semanales (células o grupos pequeños, noches de oración, radio Huelva Church, y redes sociales). Varía las palabras para que suene muy natural, inspirador y cercano. SIEMPRE ten en cuenta el día de la semana del envío para no decir 'feliz domingo' si se envía otro día. IMPORTANTE: Redacta siempre en primera persona del plural (nosotros, nuestro), hablando como iglesia o equipo pastoral, nunca como un individuo en singular (yo). No uses comillas.`;
      } else if (promptType === 'sermonDescription') {
         let contextText = context ? ` Contexto a tener en cuenta: ${context}.` : '';
         instruction = `Eres el equipo pastoral de la iglesia 'Huelva Church'. Redacta UN solo párrafo corto (2-3 líneas) invitando y animando con entusiasmo a la congregación a venir a la reunión general familiar de este fin de semana para adorar al Señor y recibir una palabra fresca de parte de Dios. ${dayContext} Varía el mensaje, que no suene repetitivo.${contextText} IMPORTANTE: Redacta siempre en primera persona del plural (nosotros, nuestro), nunca como un individuo en singular (yo). No uses comillas al principio o al final.`;
      } else if (promptType === 'cenaDescription') {
         instruction = `Eres el equipo pastoral de la iglesia 'Huelva Church'. Redacta una descripción muy breve (máximo 2 oraciones cortas) invitando a la iglesia a participar a la mesa de la Cena del Señor en la reunión general próxima. ${dayContext} IMPORTANTE: Redacta siempre en primera persona del plural (nosotros, nuestro). No uses comillas al principio o al final.`;
      } else {
         return res.status(400).json({ error: "Invalid prompt type" });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: instruction,
      });

      res.json({ text: (response.text || "").trim() });
    } catch (error: any) {
      console.error("Gemini Generation Error:", error);
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
        model: 'gemini-3.1-flash-lite',
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

  // Newsletter Bulk Sending Endpoint (Real & Simulated)
  app.post("/api/newsletter/send-bulk", async (req, res) => {
    try {
      const { toList, subject, contentHtml } = req.body;
      if (!Array.isArray(toList) || !subject || !contentHtml) {
         return res.status(400).json({ error: "Faltan campos obligatorios (toList debe ser un array, subject, contentHtml)" });
      }

      console.log(`Petición para enviar correos en masa a ${toList.length} destinatarios`);
      let sentCount = 0;
      let hadRealDelivery = false;

      // Envía emails en chunks en paralelo para no colapsar la conexión SMTP,
      // y procesa cada chunk consecutivamente.
      const CHUNK_SIZE = 20;
      for (let i = 0; i < toList.length; i += CHUNK_SIZE) {
        const chunk = toList.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (email) => {
          try {
            const result = await sendSingleEmail(email, subject, contentHtml);
            if (result.success) {
              sentCount++;
              if (result.realDelivery) hadRealDelivery = true;
            }
          } catch (e) {
            console.error(`Error enviando a ${email}: `, e);
          }
        }));
      }

      res.json({
        success: true,
        sentCount,
        realDelivery: hadRealDelivery
      });
    } catch (error: any) {
      console.error("Error en Newsletter Bulk Endpoint:", error);
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
          
          ${(roles || []).includes('lider') ? `
          <div style="background-color: #f1f5f9; border-left: 4px solid #b59410; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
            <p style="font-size: 14px; color: #334155; margin-top: 0; font-weight: bold;">🌟 ¡Felicidades por tu nuevo rol de Líder de Célula!</p>
            <p style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 0;">
              Al iniciar sesión con tu cuenta de Gmail, ahora tendrás acceso al <strong>menú exclusivo para Líderes</strong> en el portal.
              Desde allí podrás rellenar rápidamente el Formulario semanal de tu grupo, acceder a la Biblioteca de Lecciones en PDF para compartirlas, visualizar estadísticas y modificar los datos de tu célula.
            </p>
          </div>
          ` : ''}

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

  // Reusable server-side helper to send real push notifications using FCM v1 REST API
  async function sendFcmNotification(tokens: string[], title: string, body: string, clickActionUrl?: string) {
    if (!firebaseConfig || !firebaseConfig.projectId) {
      console.warn("[FCM] No se pudo enviar notificación: Falta configuración del proyecto.");
      return { success: false, error: "Falta configuración de Firebase" };
    }

    const projectId = firebaseConfig.projectId;

    try {
      // Obtenemos las credenciales por defecto de la instancia (ADC - de Cloud Run)
      const auth = new GoogleAuth({
        scopes: [
          'https://www.googleapis.com/auth/firebase.messaging',
          'https://www.googleapis.com/auth/cloud-platform'
        ]
      });
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      const accessToken = tokenResponse.token;

      if (!accessToken) {
        throw new Error("No se pudo obtener el Token OAuth 2.0 de la cuenta de servicio local");
      }

      console.log(`[FCM] Enviando notificación push real a ${tokens.length} tokens.`);

      const results = await Promise.all(tokens.map(async (token) => {
        try {
          let resolvedClickUrl = clickActionUrl || "https://huelvachurch.com/micelula";
          if (resolvedClickUrl.includes("run.app") || resolvedClickUrl.includes("localhost") || resolvedClickUrl.includes("ais-dev")) {
            try {
              const parsedUrl = new URL(resolvedClickUrl);
              resolvedClickUrl = `https://huelvachurch.com${parsedUrl.pathname}${parsedUrl.search}`;
            } catch (e) {
              resolvedClickUrl = "https://huelvachurch.com/micelula";
            }
          }

          const payload = {
            message: {
              token: token,
              notification: {
                title: title,
                body: body
              },
              webpush: {
                headers: {
                  Urgency: "high"
                },
                fcm_options: {
                  link: resolvedClickUrl
                }
              }
            }
          };

          const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          const resData = await res.json();
          if (!res.ok) {
            console.error(`[FCM] Error enviando a token ${token.substring(0, 10)}...:`, resData);
            return { token, success: false, error: resData };
          }
          return { token, success: true, messageId: resData.name };
        } catch (err: any) {
          console.error(`[FCM] Error de transporte en token ${token.substring(0, 10)}...:`, err.message);
          return { token, success: false, error: err.message };
        }
      }));

      return { success: true, results };
    } catch (err: any) {
      console.error("[FCM Root Error] Error al enviar notificaciones:", err);
      return { success: false, error: err.message };
    }
  }

  // Helper to parse Firestore REST fields representation recursively
  function parseFirestoreFields(fields: any): any {
    if (!fields) return {};
    const result: any = {};
    for (const key of Object.keys(fields)) {
      const valObj = fields[key];
      if (!valObj) continue;
      const type = Object.keys(valObj)[0];
      const rawVal = valObj[type];
      
      if (type === 'stringValue') {
        result[key] = rawVal;
      } else if (type === 'integerValue') {
        result[key] = parseInt(rawVal, 10);
      } else if (type === 'doubleValue') {
        result[key] = parseFloat(rawVal);
      } else if (type === 'booleanValue') {
        result[key] = rawVal;
      } else if (type === 'arrayValue') {
        const arr = rawVal.values || [];
        result[key] = arr.map((item: any) => {
          const itemType = Object.keys(item)[0];
          const itemVal = item[itemType];
          if (itemType === 'integerValue' || itemType === 'doubleValue') {
            return Number(itemVal);
          } else if (itemType === 'mapValue') {
            return parseFirestoreFields(itemVal.fields);
          } else {
            return itemVal;
          }
        });
      } else if (type === 'mapValue') {
        result[key] = parseFirestoreFields(rawVal.fields);
      } else {
        result[key] = rawVal;
      }
    }
    return result;
  }

  // Reusable admin helper to fetch a single user document bypassing security rules using REST + ADC
  async function adminGetDoc(collectionName: string, docId: string): Promise<any | null> {
    if (!firebaseConfig || !firebaseConfig.projectId) return null;
    const projectId = firebaseConfig.projectId;
    const dbId = firebaseConfig.firestoreDatabaseId || "(default)";

    try {
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      const accessToken = tokenResponse.token;

      if (!accessToken) {
        throw new Error("No access token found");
      }

      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/${collectionName}/${docId}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!res.ok) {
        if (res.status === 404) return null;
        console.error(`[adminGetDoc] REST API Error for ${collectionName}/${docId} (${res.status})`);
        return null;
      }

      const docData = await res.json();
      return {
        id: docId,
        ...parseFirestoreFields(docData.fields)
      };
    } catch (err) {
      console.error(`[adminGetDoc] Error:`, err);
      return null;
    }
  }

  // Reusable admin helper to query a collection bypassing security rules using REST + ADC
  async function adminQueryUsers(filterField: string, filterValue: string): Promise<any[]> {
    if (!firebaseConfig || !firebaseConfig.projectId) return [];
    const projectId = firebaseConfig.projectId;
    const dbId = firebaseConfig.firestoreDatabaseId || "(default)";

    try {
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      const accessToken = tokenResponse.token;

      if (!accessToken) {
        throw new Error("No access token found");
      }

      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents:runQuery`;
      const queryPayload = {
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            fieldFilter: {
              field: { fieldPath: filterField },
              op: "EQUAL",
              value: { stringValue: filterValue }
            }
          }
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryPayload)
      });

      if (!res.ok) {
        console.error(`[adminQueryUsers] REST runQuery Error for ${filterField}=${filterValue} (${res.status})`);
        return [];
      }

      const rawResults = await res.json();
      const list: any[] = [];
      if (Array.isArray(rawResults)) {
        for (const item of rawResults) {
          if (item && item.document && item.document.fields) {
            const documentPath = item.document.name || "";
            const matches = documentPath.match(/\/documents\/users\/([^/]+)$/);
            const docId = matches ? matches[1] : "";
            list.push({
              id: docId,
              ...parseFirestoreFields(item.document.fields)
            });
          }
        }
      }
      return list;
    } catch (err) {
      console.error(`[adminQueryUsers] Error:`, err);
      return [];
    }
  }

  // API Route to dispatch push notifications and SMTP emails to cell members, leaders, and supervisors
  app.post("/api/notifications/send-cell-notice", async (req, res) => {
    try {
      const { leaderId, celulaId, title, message } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: "Faltan campos obligatorios (title, message)" });
      }

      if (!db) {
        return res.status(500).json({ error: "Base de datos Firestore no inicializada" });
      }

      console.log(`[FCM API] Procesando notificación de célula. Leader: ${leaderId} | Célula: ${celulaId}`);

      const tokens: string[] = [];
      const recipientEmails: string[] = [];

      const onlyDirectUsers = req.body.onlyDirectUsers === true;

      if (!onlyDirectUsers) {
        // 1. Buscar tokens y emails de usuarios asociados a la Célula (Administrativamente)
        if (celulaId) {
          console.log(`[FCM/SMTP API] Consultando usuarios de celulaId: ${celulaId}`);
          const cellUsers = await adminQueryUsers('celulaId', celulaId);
          cellUsers.forEach(u => {
            if (Array.isArray(u.fcmTokens)) {
              tokens.push(...u.fcmTokens);
            }
            if (u.email && typeof u.email === 'string' && u.email.trim() !== '') {
              recipientEmails.push(u.email.trim());
            }
          });
        }

        // 2. Buscar tokens y emails de usuarios asociados al Líder (Administrativamente)
        if (leaderId) {
          console.log(`[FCM/SMTP API] Consultando usuarios asociados al leaderId: ${leaderId}`);
          const leaderUsers = await adminQueryUsers('leaderId', leaderId);
          leaderUsers.forEach(u => {
            if (Array.isArray(u.fcmTokens)) {
              tokens.push(...u.fcmTokens);
            }
            if (u.email && typeof u.email === 'string' && u.email.trim() !== '') {
              recipientEmails.push(u.email.trim());
            }
          });

          // TAMBIÉN: Buscar usuarios asociados a este ID como Supervisor (en caso de que leaderId sea un Supervisor)
          console.log(`[FCM/SMTP API] Consultando usuarios asociados al supervisorId: ${leaderId}`);
          const supervisorUsers = await adminQueryUsers('supervisorId', leaderId);
          supervisorUsers.forEach(u => {
            if (Array.isArray(u.fcmTokens)) {
              tokens.push(...u.fcmTokens);
            }
            if (u.email && typeof u.email === 'string' && u.email.trim() !== '') {
              recipientEmails.push(u.email.trim());
            }
          });
        }
      }

      // 3. Buscar del propio Líder y de IDs de usuario directos pasados en la petición (como supervisores o administradores)
      const directUserIds: string[] = [];
      if (leaderId) directUserIds.push(leaderId);
      if (req.body.userIds && Array.isArray(req.body.userIds)) {
        directUserIds.push(...req.body.userIds);
      }

      const processedUids = new Set<string>();
      const uidsToProcess = Array.from(new Set(directUserIds.filter(id => id && id.trim() !== '')));

      for (let i = 0; i < uidsToProcess.length; i++) {
        const uidVal = uidsToProcess[i];
        if (processedUids.has(uidVal)) continue;
        processedUids.add(uidVal);

        try {
          console.log(`[FCM/SMTP API] Consultando información del usuario directo: ${uidVal}`);
          const u = await adminGetDoc('users', uidVal);
          if (u) {
            if (Array.isArray(u.fcmTokens)) {
              tokens.push(...u.fcmTokens);
            }
            if (u.email && typeof u.email === 'string' && u.email.trim() !== '') {
              recipientEmails.push(u.email.trim());
            }
            // Descubrir automáticamente el supervisor del líder e incluir sus tokens y email
            if (u.supervisorId && typeof u.supervisorId === 'string' && u.supervisorId.trim() !== '') {
              const supervisorId = u.supervisorId.trim();
              if (!processedUids.has(supervisorId) && !uidsToProcess.includes(supervisorId)) {
                uidsToProcess.push(supervisorId);
              }
            }
          }
        } catch (docErr) {
          console.error(`Error buscando info de usuario directo ${uidVal}:`, docErr);
        }
      }

      // Filtrar tokens nulos, duplicados y vacíos
      const uniqueTokens = Array.from(new Set(tokens.filter(t => typeof t === 'string' && t.trim() !== '')));
      // Filtrar correos válidos y únicos
      const uniqueEmails = Array.from(new Set(recipientEmails.filter(e => typeof e === 'string' && e.trim() !== '' && e.includes('@'))));

      console.log(`[FCM/SMTP API] Destinatarios resueltos: ${uniqueTokens.length} tokens push | ${uniqueEmails.length} correos electrónicos`);

      // Determinar la redirección óptima basada en el remitente o título de la notificación
      let redirectPath = "/micelula";
      if (req.body.targetPath) {
        redirectPath = req.body.targetPath;
      } else if (
        title.toLowerCase().includes("solicitud") || 
        title.toLowerCase().includes("supervisor") || 
        title.toLowerCase().includes("difusión") || 
        title.toLowerCase().includes("liderazgo")
      ) {
        redirectPath = "/lideres";
      }

      const clickUrl = `https://huelvachurch.com${redirectPath}`;

      // 1. Enviar NOTIFICACIÓN PUSH
      let fcmSent = false;
      let fcmResult = null;
      if (uniqueTokens.length > 0) {
        try {
          fcmResult = await sendFcmNotification(uniqueTokens, title, message, clickUrl);
          fcmSent = true;
        } catch (fcmErr) {
          console.error("[FCM API Error al enviar Push]:", fcmErr);
        }
      }

      // 2. Enviar NOTIFICACIÓN POR EMAIL (SMTP real o simulado)
      let emailsSentCount = 0;
      if (uniqueEmails.length > 0) {
        const emailSubject = `🔔 Notificación Huelva Church: ${title}`;
        const contentHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #0c1a30; font-size: 24px; margin: 0;">Huelva Church</h1>
              <p style="color: #b59410; font-size: 14px; margin: 4px 0 0 0; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Notificación del Portal</p>
            </div>
            
            <div style="background-color: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #b59410;">
              <p style="font-size: 16px; color: #0c1a30; margin-top: 0; font-weight: bold;">
                ${title}
              </p>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; white-space: pre-wrap; margin-bottom: 0;">
                ${message}
              </p>
            </div>

            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Hemos enviado esta notificación para asegurarnos de que estés al día con tus avisos semanales, solicitudes de célula o actualizaciones pastorales incluso si no tienes abierta la aplicación de Huelva Church.
            </p>
            
            <div style="text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 24px;">
              <a href="${clickUrl}" style="background-color: #0c1a30; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">
                ${redirectPath.includes('/lideres') ? 'Abrir Portal de Líderes' : (redirectPath.includes('/micelula') ? 'Abrir Mi Célula' : 'Abrir Portal')}
              </a>
              <p style="color: #94a3b8; font-size: 11px; margin-top: 20px;">
                Este es un correo electrónico enviado automáticamente por el portal de Huelva Church.
              </p>
            </div>
          </div>
        `;

        try {
          await Promise.allSettled(uniqueEmails.map(async (email) => {
            const resEmail = await sendSingleEmail(email, emailSubject, contentHtml);
            if (resEmail.success) {
              emailsSentCount++;
            }
          }));
        } catch (emailErr) {
          console.error("Error enviando notificaciones por email:", emailErr);
        }
      }

      res.json({
        success: true,
        fcmSent,
        tokensCount: uniqueTokens.length,
        results: fcmResult,
        emailsSentCount,
        uniqueEmailsCount: uniqueEmails.length
      });

    } catch (error: any) {
      console.error("[FCM API Error]:", error);
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

  // Dynamic Open Graph Tags for Newsletter/Bulletin Social Sharing
  app.get(["/boletin", "/boletin/:date", "/boletin/web", "/boletin/web/:date", "/boletin/folleto", "/boletin/folleto/:date"], async (req, res, next) => {
    if (!db) {
      return next();
    }

    try {
      const newslettersCol = collection(db, "newsletters");
      const querySnapshot = await getDocs(newslettersCol);
      const campaignsList = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as any[];

      // Sort by date (createdAt or sentAt) descending
      campaignsList.sort((a, b) => {
        const tA = a.createdAt || a.sentAt;
        const tB = b.createdAt || b.sentAt;
        if (!tA) return 1;
        if (!tB) return -1;
        const dA = tA.toDate ? tA.toDate().getTime() : new Date(tA).getTime();
        const dB = tB.toDate ? tB.toDate().getTime() : new Date(tB).getTime();
        return dB - dA;
      });

      let targetCampaign: any | null = null;
      const date = req.params.date;

      if (date && date !== "latest") {
        targetCampaign = campaignsList.find(camp => {
          const ts = camp.createdAt || camp.sentAt;
          if (!ts) return false;
          const d = ts.toDate ? ts.toDate() : new Date(ts);
          
          // Format 1: UTC / general iso string
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const campDateStr = `${year}-${month}-${day}`;
          if (campDateStr === date) return true;

          // Format 2: UTC timezone
          const uYear = d.getUTCFullYear();
          const uMonth = String(d.getUTCMonth() + 1).padStart(2, "0");
          const uDay = String(d.getUTCDate()).padStart(2, "0");
          const campDateStrUTC = `${uYear}-${uMonth}-${uDay}`;
          if (campDateStrUTC === date) return true;

          // Format 3: Spain Timezone (Madrid) offset-based
          try {
            const formatter = new Intl.DateTimeFormat("en-US", {
              timeZone: "Europe/Madrid",
              year: "numeric",
              month: "2-digit",
              day: "2-digit"
            });
            const parts = formatter.formatToParts(d);
            const mPart = parts.find(p => p.type === "month")?.value;
            const dPart = parts.find(p => p.type === "day")?.value;
            const yPart = parts.find(p => p.type === "year")?.value;
            if (mPart && dPart && yPart) {
              const campDateStrMadrid = `${yPart}-${mPart}-${dPart}`;
              if (campDateStrMadrid === date) return true;
            }
          } catch (e) {
            console.error("Madrid formatter error", e);
          }

          // Format 4: Check if it is within 36 hours of the target date start
          try {
            const targetTime = new Date(`${date}T00:00:00`).getTime();
            const campTime = d.getTime();
            const diffHours = Math.abs(campTime - targetTime) / (1000 * 60 * 60);
            if (diffHours <= 36) {
              return true;
            }
          } catch (e) {
            console.error("Date diff calculation error", e);
          }

          return false;
        }) || null;
      }

      // Fallback: Use the latest sent/scheduled/draft if no specific date is matched or if date param is "latest"
      if (!targetCampaign && campaignsList.length > 0) {
        targetCampaign = campaignsList[0];
      }

      if (targetCampaign) {
        let displayDate = "";
        const ts = targetCampaign.createdAt || targetCampaign.sentAt;
        if (ts) {
          const d = ts.toDate ? ts.toDate() : new Date(ts);
          const day = String(d.getDate()).padStart(2, "0");
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const year = d.getFullYear();
          displayDate = `${day}/${month}/${year}`;
        } else if (date && date !== "latest") {
          const parts = date.split("-");
          if (parts.length === 3) {
            displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
          } else {
            displayDate = date;
          }
        } else {
          const d = new Date();
          const day = String(d.getDate()).padStart(2, "0");
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const year = d.getFullYear();
          displayDate = `${day}/${month}/${year}`;
        }

        const title = `Huelva Church - Boletín informativo del ${displayDate}`;
        const description = targetCampaign.config?.greetingText || "Somos Huelva Church, una Iglesia Cristiana Evangélica en Huelva dedicada a compartir el amor de Jesús.";
        
        const protocol = "https"; // Force HTTPS for stable public social sharing previews
        const host = req.get("host");
        
        let imageUrl = "";
        const coverUrl = targetCampaign.config?.coverImageUrl;
        if (coverUrl && typeof coverUrl === "string" && coverUrl.trim() !== "" && coverUrl !== "null" && coverUrl !== "undefined") {
          imageUrl = coverUrl.trim();
          
          if (imageUrl.includes("drive.google.com")) {
            const match = imageUrl.match(/id=(.*?)(?:&|$)/) || imageUrl.match(/\/d\/(.*?)\//) || imageUrl.match(/\/d\/(.*?)$/);
            if (match && match[1]) {
              const driveId = match[1].split("&")[0];
              imageUrl = `https://lh3.googleusercontent.com/d/${driveId}`;
            }
          } else if (imageUrl.startsWith("/public/")) {
            imageUrl = imageUrl.replace("/public/", "/");
          } else if (imageUrl.startsWith("public/")) {
            imageUrl = imageUrl.replace("public/", "/");
          }

          if (imageUrl.startsWith("/")) {
            imageUrl = `${protocol}://${host}${imageUrl}`;
          } else if (!imageUrl.startsWith("http") && !imageUrl.includes("drive.google.com")) {
            if (/^[a-zA-Z0-9_-]{25,48}$/.test(imageUrl)) {
              imageUrl = `https://lh3.googleusercontent.com/d/${imageUrl}`;
            }
          }

          // Constrain Google Drive images to 1000px max width for optimal file size (typically <150KB)
          // This avoids exceeding WhatsApp's strict 300KB image limit for link previews.
          if (imageUrl.includes("lh3.googleusercontent.com/d/") && !imageUrl.includes("=")) {
            imageUrl = `${imageUrl}=w1000`;
          }
        } else {
          imageUrl = `${protocol}://${host}/images/Boletin%20Caratula%20Generica.png`;
        }

        // Ensure spaces are properly URL-encoded for social network crawlers
        imageUrl = imageUrl.replace(/ /g, "%20");

        // Read SPA index.html to inject values
        const isProd = process.env.NODE_ENV === "production";
        const htmlPath = isProd 
          ? path.join(process.cwd(), "dist", "index.html")
          : path.join(process.cwd(), "index.html");

        if (fs.existsSync(htmlPath)) {
          let html = fs.readFileSync(htmlPath, "utf8");

          // Safely replace title & meta variables avoiding regex substitution wildcards
          html = html.replace(/<title>.*?<\/title>/, () => `<title>${title}</title>`);
          html = html.replace(/<meta name="description"[\s\S]*?\/>/, () => `<meta name="description" content="${description}" />`);
          html = html.replace(/<meta property="og:title"[\s\S]*?\/>/, () => `<meta property="og:title" content="${title}" />`);
          html = html.replace(/<meta property="og:description"[\s\S]*?\/>/, () => `<meta property="og:description" content="${description}" />`);
          html = html.replace(/<meta property="og:type"[\s\S]*?\/>/, () => `<meta property="og:type" content="article" />`);

          const extraTags = `
    <meta property="og:url" content="${protocol}://${host}${req.originalUrl || req.url}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
          `;

          html = html.replace("</head>", () => `${extraTags}\n  </head>`);

          // Apply Vite HMR transforms if in development
          if (!isProd && vite) {
            html = await vite.transformIndexHtml(req.originalUrl || req.url, html);
          }

          res.setHeader("Content-Type", "text/html; charset=utf-8");
          return res.send(html);
        }
      }
    } catch (err) {
      console.error("Error generating dynamic tags newsletter preview:", err);
    }

    // Default SPA fallback if anything fails
    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
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
