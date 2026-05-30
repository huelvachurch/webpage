import { GoogleGenAI } from "@google/genai";

async function testai() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: "Say hello",
    });
    console.log("Success:", response.text);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
testai();
