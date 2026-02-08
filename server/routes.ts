import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertSubjectSchema, insertChapterSchema, insertLessonSchema, insertExamPaperSchema } from "@shared/schema";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { z } from "zod";
import pgSession from "connect-pg-simple";
import OpenAI from "openai";
import { chatStorage } from "./replit_integrations/chat/storage";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = pgSession(session);

  const isProduction = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1";

  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "bacmr-dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      proxy: isProduction,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
      },
    })
  );

  // ═══════════════════════════════════════════════
  // AUTH ROUTES
  // ═══════════════════════════════════════════════

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, fullName, streamId, sessionYear, language } = req.body;

      if (!email || !password || !fullName) {
        return res.status(400).json({ message: "Email, password and full name are required" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }

      const hashed = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashed,
        fullName,
        role: "student",
        streamId: streamId || null,
        sessionYear: sessionYear || 2026,
        language: language || "fr",
      });

      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      return res.status(201).json(safeUser);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !(await comparePasswords(password, user.password))) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.isActive === false) {
        return res.status(403).json({ message: "Your account has been disabled. Please contact an administrator." });
      }

      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      return res.json(safeUser);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Failed to log out" });
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    if (user.isActive === false) {
      req.session.destroy(() => {});
      return res.status(403).json({ message: "Your account has been disabled" });
    }
    const { password: _, ...safeUser } = user;
    return res.json(safeUser);
  });

  // ═══════════════════════════════════════════════
  // PUBLIC CONTENT ROUTES
  // ═══════════════════════════════════════════════

  app.get("/api/streams", async (_req, res) => {
    const data = await storage.getStreams();
    res.json(data);
  });

  app.get("/api/subjects", async (req, res) => {
    const streamId = req.query.streamId ? Number(req.query.streamId) : undefined;
    const data = await storage.getSubjects(streamId);
    res.json(data);
  });

  app.get("/api/subjects/:id", async (req, res) => {
    const subject = await storage.getSubject(Number(req.params.id));
    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.json(subject);
  });

  app.get("/api/subjects/:id/chapters", async (req, res) => {
    const data = await storage.getChapters(Number(req.params.id));
    res.json(data);
  });

  app.get("/api/chapters/:id/lessons", async (req, res) => {
    const data = await storage.getLessons(Number(req.params.id));
    res.json(data);
  });

  app.get("/api/lessons/:id", async (req, res) => {
    const lesson = await storage.getLesson(Number(req.params.id));
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    res.json(lesson);
  });

  app.get("/api/exams", async (req, res) => {
    const streamId = req.query.streamId ? Number(req.query.streamId) : undefined;
    const subjectId = req.query.subjectId ? Number(req.query.subjectId) : undefined;
    const data = await storage.getExamPapers(streamId, subjectId);
    res.json(data);
  });

  app.get("/api/exams/:id", async (req, res) => {
    const exam = await storage.getExamPaper(Number(req.params.id));
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json(exam);
  });

  // ═══════════════════════════════════════════════
  // STUDENT PROGRESS ROUTES (Auth Required)
  // ═══════════════════════════════════════════════

  app.get("/api/progress", requireAuth, async (req, res) => {
    const data = await storage.getLessonProgress(req.session.userId!);
    res.json(data);
  });

  app.post("/api/progress", requireAuth, async (req, res) => {
    const { lessonId, completed } = req.body;
    if (!lessonId) return res.status(400).json({ message: "lessonId required" });
    const progress = await storage.upsertLessonProgress({
      userId: req.session.userId!,
      lessonId,
      completed: completed ?? true,
    });
    res.json(progress);
  });

  // ═══════════════════════════════════════════════
  // ADMIN ROUTES (Admin Only)
  // ═══════════════════════════════════════════════

  // Subjects CRUD
  app.post("/api/admin/subjects", requireAdmin, async (req, res) => {
    try {
      const parsed = insertSubjectSchema.parse(req.body);
      const created = await storage.createSubject(parsed);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/admin/subjects/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateSubject(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/admin/subjects/:id", requireAdmin, async (req, res) => {
    await storage.deleteSubject(Number(req.params.id));
    res.json({ message: "Deleted" });
  });

  // Chapters CRUD
  app.post("/api/admin/chapters", requireAdmin, async (req, res) => {
    try {
      const parsed = insertChapterSchema.parse(req.body);
      const created = await storage.createChapter(parsed);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/admin/chapters/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateChapter(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/admin/chapters/:id", requireAdmin, async (req, res) => {
    await storage.deleteChapter(Number(req.params.id));
    res.json({ message: "Deleted" });
  });

  // Lessons CRUD
  app.post("/api/admin/lessons", requireAdmin, async (req, res) => {
    try {
      const parsed = insertLessonSchema.parse(req.body);
      const created = await storage.createLesson(parsed);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/admin/lessons/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateLesson(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/admin/lessons/:id", requireAdmin, async (req, res) => {
    await storage.deleteLesson(Number(req.params.id));
    res.json({ message: "Deleted" });
  });

  // Exams CRUD
  app.post("/api/admin/exams", requireAdmin, async (req, res) => {
    try {
      const parsed = insertExamPaperSchema.parse(req.body);
      const created = await storage.createExamPaper(parsed);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/admin/exams/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateExamPaper(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/admin/exams/:id", requireAdmin, async (req, res) => {
    await storage.deleteExamPaper(Number(req.params.id));
    res.json({ message: "Deleted" });
  });

  // Users Management
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const allUsers = await storage.getAllUsers();
    const safeUsers = allUsers.map(({ password, ...u }) => u);
    res.json(safeUsers);
  });

  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const targetId = Number(req.params.id);
    const adminId = req.session.userId!;
    const { isActive, role } = req.body;

    if (typeof isActive !== "boolean" && !["admin", "student"].includes(role)) {
      return res.status(400).json({ message: "Must provide isActive (boolean) or role ('admin'|'student')" });
    }

    if (targetId === adminId && isActive === false) {
      return res.status(400).json({ message: "You cannot disable your own account" });
    }
    if (targetId === adminId && role === "student") {
      return res.status(400).json({ message: "You cannot remove your own admin role" });
    }

    const updates: any = {};
    if (typeof isActive === "boolean") updates.isActive = isActive;
    if (role === "admin" || role === "student") updates.role = role;
    const updated = await storage.updateUser(targetId, updates);
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safeUser } = updated;
    res.json(safeUser);
  });

  // Streams CRUD
  app.post("/api/admin/streams", requireAdmin, async (req, res) => {
    try {
      const parsed = insertSubjectSchema.parse(req.body); // reuse validation
      const created = await storage.createStream(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // LANGUAGE PREFERENCE
  // ═══════════════════════════════════════════════

  app.post("/api/auth/language", requireAuth, async (req, res) => {
    try {
      const { language } = req.body;
      if (!["en", "ar", "fr"].includes(language)) {
        return res.status(400).json({ message: "Invalid language" });
      }
      await storage.updateUser(req.session.userId!, { language });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // AI TUTOR CHAT ROUTES (Auth Required)
  // ═══════════════════════════════════════════════

  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  app.get("/api/ai/conversations", requireAuth, async (req, res) => {
    try {
      const lessonId = req.query.lessonId ? Number(req.query.lessonId) : undefined;
      const conversations = await chatStorage.getConversationsByUser(req.session.userId!, lessonId);
      res.json(conversations);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/ai/conversations", requireAuth, async (req, res) => {
    try {
      const { lessonId } = req.body;
      const conv = await chatStorage.createConversation(req.session.userId!, lessonId || null);
      res.status(201).json(conv);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/ai/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const conv = await chatStorage.getConversation(Number(req.params.id));
      if (!conv || conv.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const messages = await chatStorage.getMessagesByConversation(conv.id);
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/ai/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const conversationId = Number(req.params.id);
      const { content, lessonContent, lessonTitle, language } = req.body;

      const conv = await chatStorage.getConversation(conversationId);
      if (!conv || conv.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }

      await chatStorage.createMessage(conversationId, "user", content);

      const existingMessages = await chatStorage.getMessagesByConversation(conversationId);
      const chatHistory = existingMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const langName = language === "ar" ? "Arabic" : language === "fr" ? "French" : "English";
      const arabicTermRule = language === "ar"
        ? `\n\nCRITICAL RULE FOR ARABIC RESPONSES: When responding in Arabic, do NOT translate technical, scientific, or academic terminology into Arabic. These terms must remain in French (preferred) or English, since the Mauritanian education system uses French for technical vocabulary. For example: keep terms like "nombre complexe", "dérivée", "intégrale", "probabilité", "module", "argument", "équation", "fonction", "vecteur", "matrice", "théorème", "coefficient", etc. in French. Write the explanations and sentences in Arabic, but embed the technical terms in their French form.`
        : "";

      const systemPrompt = `You are BACMR Tutor, a patient and encouraging AI tutor for Mauritanian high school students preparing for the Baccalaureate exam.

LANGUAGE: You MUST respond in ${langName}. The student has selected ${langName} as their preferred language.

Your role:
- Help students understand concepts from their lessons
- Explain in clear, simple language
- Use examples relevant to Mauritanian students when possible
- Guide students to find answers rather than giving direct solutions
- Be supportive and reduce exam anxiety
- Keep responses concise but thorough${arabicTermRule}

${lessonTitle ? `Current lesson: "${lessonTitle}"` : ""}
${lessonContent ? `\nLesson content for context:\n${lessonContent}` : ""}`;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
        ],
        stream: true,
        max_completion_tokens: 1024,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          fullResponse += text;
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        }
      }

      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: any) {
      console.error("AI tutor error:", err);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: err.message });
      }
    }
  });

  // Voice transcription endpoint
  app.post("/api/ai/transcribe", requireAuth, express.json({ limit: "50mb" }), async (req, res) => {
    try {
      const { audio } = req.body;
      if (!audio) {
        return res.status(400).json({ message: "Audio data is required" });
      }
      const { ensureCompatibleFormat, speechToText } = await import("./replit_integrations/audio/client");
      const rawBuffer = Buffer.from(audio, "base64");
      const { buffer: audioBuffer, format } = await ensureCompatibleFormat(rawBuffer);
      const transcript = await speechToText(audioBuffer, format);
      res.json({ transcript });
    } catch (err: any) {
      console.error("Transcription error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
