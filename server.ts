import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
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

  app.use(express.json());

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
        model: 'gemini-3.1-pro-preview',
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
