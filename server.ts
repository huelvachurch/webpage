import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Stripe from "stripe";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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

      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const from = process.env.SMTP_FROM || user || 'Huelva Church <noreply@huelvachurch.com>';

      console.log(`Petición para enviar correo. Destinatario: ${to}`);

      if (host && port && user && pass) {
        // Real SMTP Delivery
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
          host,
          port: parseInt(port),
          secure: parseInt(port) === 465, // true for 465, false for others
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

        console.log("Correo enviado de forma real:", info.messageId);
        return res.json({ 
          success: true, 
          realDelivery: true, 
          messageId: info.messageId,
          details: `Enviado con éxito a través de SMTP (${host})` 
        });
      } else {
        // Simulated Sandbox Mode
        console.log("Servidor SMTP no configurado o incompleto. Simulando envío...");
        return res.json({ 
          success: true, 
          realDelivery: false, 
          details: "Simulado con éxito (Modo Sandbox activo. Configura las variables SMTP en el archivo .env para envíos reales)." 
        });
      }
    } catch (error: any) {
      console.error("Error en Newsletter Mailer:", error);
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
