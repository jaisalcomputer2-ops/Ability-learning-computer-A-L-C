import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Generation Endpoints
  app.post("/api/ai/generate-exam", async (req, res) => {
    try {
      const { input, language } = req.body;
      if (!input) return res.status(400).json({ error: "Input is required" });

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });

      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({
        model: "gemini-1.5-flash", // Using a more stable model name
      });

      const prompt = `Convert the following text into a structured JSON array of quiz questions. 
        The text contains multiple choice questions with their answers. 
        
        Rules for parsing:
        1. CLEANING: Completely ignore and remove all tags like [span_...], (start_span), (end_span) before parsing. They are noise.
        2. IDENTIFICATION: Identify each question block. A block consists of a question text, a set of options, and a correct answer indicator.
        3. ROBUSTNESS: Skip any leading or trailing text that doesn't belong to a complete question block.
        4. OPTIONS: Options can be on separate lines or the same line. Split them by looking for markers like A), B), C), D) or 1), 2), 3), 4). A question can have 2 to 6 options.
        5. CORRECT ANSWER: Map the identified correct answer (e.g., "Answer: C") to the corresponding 0-based index of the options array.
        6. LANGUAGE: Maintain the original language of the questions (Malayalam or English).
        
        Text: ${input}`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array" as any,
            items: {
              type: "object" as any,
              properties: {
                question: { type: "string" as any },
                options: { 
                  type: "array" as any, 
                  items: { type: "string" as any },
                  minItems: 2,
                  maxItems: 6
                },
                correctAnswer: { type: "integer" as any }
              },
              required: ["question", "options", "correctAnswer"]
            }
          }
        }
      });

      res.json(JSON.parse(result.response.text()));
    } catch (error: any) {
      console.error("Server AI Error (Exam):", error);
      res.status(500).json({ error: error.message || "Failed to generate exam questions" });
    }
  });

  app.post("/api/ai/generate-spelling", async (req, res) => {
    try {
      const { category } = req.body;
      if (!category) return res.status(400).json({ error: "Category is required" });

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });

      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      const prompt = `Generate 10 English words for the category: "${category}". 
        Return only a JSON array of strings. 
        Example: ["Apple", "Banana", "Cherry"]`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array" as any,
            items: { type: "string" as any }
          }
        }
      });

      res.json(JSON.parse(result.response.text()));
    } catch (error: any) {
      console.error("Server AI Error (Spelling):", error);
      res.status(500).json({ error: error.message || "Failed to generate spelling words" });
    }
  });

  app.post("/api/ai/generate-quiz", async (req, res) => {
    try {
      const { textContent, language } = req.body;
      if (!textContent) return res.status(400).json({ error: "Text content is required" });

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });

      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      const prompt = `Generate 5 multiple choice questions based on this text: "${textContent}". 
        The questions should be in ${language === 'en' ? 'English' : 'Malayalam'}.
        Return only a JSON array of objects with:
        - "question": The question text.
        - "options": An array of 3 to 4 strings.
        - "correctAnswer": The 0-based index of the correct option.`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array" as any,
            items: {
              type: "object" as any,
              properties: {
                question: { type: "string" as any },
                options: { type: "array" as any, items: { type: "string" as any } },
                correctAnswer: { type: "integer" as any }
              },
              required: ["question", "options", "correctAnswer"]
            }
          }
        }
      });

      res.json(JSON.parse(result.response.text()));
    } catch (error: any) {
      console.error("Server AI Error (Quiz):", error);
      res.status(500).json({ error: error.message || "Failed to generate quiz" });
    }
  });

  app.post("/api/ai/seed-lessons", async (req, res) => {
    try {
      const { language } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });

      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      const prompt = `Generate 3 high-quality computer lessons for visually impaired students in ${language === 'en' ? 'English' : 'Malayalam'}.
      Topics: 1. Keyboard Basics, 2. Desktop Navigation, 3. Using Screen Readers.
      For each lesson, provide:
      - title
      - category (e.g., 'Basics')
      - textContent (Detailed, descriptive text that explains concepts clearly for someone who cannot see the screen)
      - quiz (5 multiple choice questions with 3 to 4 options each and correct index)
      Return as a JSON array of objects.`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array" as any,
            items: {
              type: "object" as any,
              properties: {
                title: { type: "string" as any },
                category: { type: "string" as any },
                textContent: { type: "string" as any },
                quiz: {
                  type: "array" as any,
                  items: {
                    type: "object" as any,
                    properties: {
                      question: { type: "string" as any },
                      options: { type: "array" as any, items: { type: "string" as any } },
                      correctAnswer: { type: "integer" as any }
                    }
                  }
                }
              }
            }
          }
        }
      });

      res.json(JSON.parse(result.response.text()));
    } catch (error: any) {
      console.error("Server AI Error (Seed):", error);
      res.status(500).json({ error: error.message || "Failed to seed AI lessons" });
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
