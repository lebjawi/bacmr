import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import crypto from "crypto";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { loadDbUser, requireAdmin, requireAuthenticated, requireStudent } from "./lib/auth/middleware";
import { storage } from "./storage";
import { getStorage } from "./lib/storage";
import { generateEmbedding, chatCompletion } from "./lib/ai/openai";
import { dispatchNextJob } from "./lib/ingestion/runner";
import { discoverBooks, type DiscoveredBook } from "./lib/scraper/koutoubi";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  app.use(loadDbUser);

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const user = await storage.getUserByUsername(username);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "Account is deactivated. Contact an administrator." });
    }

    const bcrypt = await import("bcryptjs");
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    (req as any).session.userId = user.id;
    res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, profileImageUrl: user.profileImageUrl } });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.dbUser) {
      return res.json({ user: null });
    }
    res.json({ user: req.dbUser });
  });

  app.post(
    "/api/admin/pdfs",
    requireAdmin,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const { title, subject, stream, year, educationLevel, yearNumber, specialization } = req.body;
        if (!title) {
          return res.status(400).json({ message: "Title is required" });
        }

        const buffer = req.file.buffer;
        const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

        const existing = await storage.getPdfFileByChecksum(checksum);
        if (existing) {
          return res.status(409).json({ message: "This PDF has already been uploaded", existingId: existing.id });
        }

        const storageKey = `pdfs/${Date.now()}-${req.file.originalname}`;
        const fileStorage = getStorage();
        await fileStorage.save(storageKey, buffer);

        const pdfFile = await storage.createPdfFile({
          title,
          subject: subject || null,
          stream: stream || null,
          year: year ? parseInt(year, 10) : null,
          educationLevel: educationLevel || null,
          yearNumber: yearNumber ? parseInt(yearNumber, 10) : null,
          specialization: specialization || null,
          sourceType: "manual",
          storageKey,
          checksum,
          status: "UPLOADED",
          fileSizeBytes: buffer.length,
          uploadedBy: req.dbUser!.id,
        });

        const job = await storage.createIngestionJob({
          pdfFileId: pdfFile.id,
          status: "QUEUED",
        });

        res.status(201).json({ pdfFile, job });
      } catch (error: any) {
        console.error("Upload error:", error);
        res.status(500).json({ message: error.message || "Upload failed" });
      }
    }
  );

  app.get("/api/admin/pdfs", requireAdmin, async (_req: Request, res: Response) => {
    const pdfs = await storage.listPdfFiles();
    res.json(pdfs);
  });

  app.get("/api/admin/pdfs/:id", requireAdmin, async (req: Request, res: Response) => {
    const pdf = await storage.getPdfFile(req.params.id as string);
    if (!pdf) return res.status(404).json({ message: "PDF not found" });
    const jobs = await storage.getJobsForPdf(pdf.id);
    const chunkCount = await storage.getChunkCount(pdf.id);
    res.json({ ...pdf, jobs, chunkCount });
  });

  app.get("/api/admin/jobs", requireAdmin, async (_req: Request, res: Response) => {
    const jobs = await storage.listIngestionJobs();
    res.json(jobs);
  });

  app.get("/api/admin/jobs/:id", requireAdmin, async (req: Request, res: Response) => {
    const job = await storage.getIngestionJob(req.params.id as string);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  });

  app.post("/api/admin/jobs/dispatch", requireAdmin, async (_req: Request, res: Response) => {
    const job = await dispatchNextJob();
    if (!job) {
      return res.json({ message: "No queued jobs available" });
    }
    res.json({ message: "Processing started — remaining queued jobs will follow automatically", job });
  });

  app.post("/api/admin/jobs/:id/requeue", requireAdmin, async (req: Request, res: Response) => {
    const job = await storage.requeueJob(req.params.id as string);
    if (!job) {
      return res.status(404).json({ message: "Job not found or not in requeueable state" });
    }
    res.json(job);
  });

  app.patch("/api/admin/users/:id/role", requireAdmin, async (req: Request, res: Response) => {
    const { role } = req.body;
    if (!role || !["admin", "student"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const user = await storage.updateUserRole(req.params.id as string, role);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.get("/api/admin/users", requireAdmin, async (_req: Request, res: Response) => {
    const allUsers = await storage.getAllUsers();
    const sanitized = allUsers.map(u => ({ id: u.id, username: u.username, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role, isActive: u.isActive, createdAt: u.createdAt }));
    res.json(sanitized);
  });

  app.post("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    const { username, password, email, firstName, lastName, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await storage.createUser({
      username,
      passwordHash,
      email: email || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      role: role || "student",
    });

    res.json({ id: user.id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role });
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    const { username, email, firstName, lastName, role, isActive } = req.body;
    if (role !== undefined && !["admin", "student"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const updates: Record<string, any> = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    const user = await storage.updateUser(req.params.id as string, updates);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ id: user.id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, isActive: user.isActive, createdAt: user.createdAt });
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    if (req.dbUser!.id === req.params.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }
    const deleted = await storage.deleteUser(req.params.id as string);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.json({ success: true });
  });

  app.post("/api/admin/users/:id/reset-password", requireAdmin, async (req: Request, res: Response) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await storage.resetUserPassword(req.params.id as string, passwordHash);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ success: true });
  });

  app.post("/api/chat", requireAuthenticated, async (req: Request, res: Response) => {
    try {
      const { message, language, pdfFileId, educationLevel, pageStart, pageEnd } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }

      const questionEmbedding = await generateEmbedding(message);

      const filters: { pdfFileId?: string; educationLevel?: string; pageStart?: number; pageEnd?: number } = {};
      if (pdfFileId) filters.pdfFileId = pdfFileId;
      if (pageStart !== undefined) filters.pageStart = pageStart;
      if (pageEnd !== undefined) filters.pageEnd = pageEnd;
      if (!pdfFileId && educationLevel) filters.educationLevel = educationLevel;

      const relevantChunks = await storage.searchChunksByVector(questionEmbedding, 6, Object.keys(filters).length > 0 ? filters : undefined);

      const context = relevantChunks
        .map(
          (chunk, i) =>
            `[Source ${i + 1}: ${chunk.pdfTitle}, pages ${chunk.pageStart}-${chunk.pageEnd}]\n${chunk.text}`
        )
        .join("\n\n---\n\n");

      const citations = relevantChunks.map((chunk) => ({
        pdfTitle: chunk.pdfTitle,
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        sourceRef: chunk.sourceRef,
        distance: chunk.distance,
      }));

      const languageInstructions: Record<string, string> = {
        fr: "Réponds en français. Tu es un tuteur expert aidant les élèves mauritaniens à préparer leur BAC.",
        en: "Respond in English. You are an expert tutor helping Mauritanian BAC students prepare for their exams.",
        ar: "أجب باللغة العربية. أنت مدرس خبير يساعد الطلاب الموريتانيين في التحضير لامتحان الباكالوريا.",
      };

      const langKey = (language === "fr" || language === "ar") ? language : "en";
      const langInstruction = languageInstructions[langKey];

      const systemPrompt = `${langInstruction}

RULES:
- Use the provided context from official textbooks to answer questions accurately.
- Structure your response with numbered steps when explaining procedures or derivations.
- Use proper mathematical notation.
- If the context doesn't contain enough information, still try to help using your general curriculum knowledge, but clearly indicate when you're going beyond the textbook content.
- When context is available, reference which source/page your answer comes from.
- Be encouraging and pedagogical.
- Keep responses focused and exam-relevant.
- If the student asks a follow-up question like "explain more" or "give me an example", use the previous context and your knowledge to provide a helpful response.

CONTEXT FROM OFFICIAL TEXTBOOKS:
${context || "No relevant context found in the knowledge base. Use your general knowledge of the Mauritanian BAC curriculum to help the student, but mention that you're not citing from a specific textbook."}`;

      const answer = await chatCompletion(systemPrompt, message);

      res.json({
        answer,
        citations,
        hasContext: relevantChunks.length > 0,
      });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ message: error.message || "Chat failed" });
    }
  });

  app.get("/api/subjects", async (_req: Request, res: Response) => {
    const pdfs = await storage.listPdfFiles();
    const readyPdfs = pdfs.filter(p => p.status === "READY");
    const subjects = Array.from(new Set(readyPdfs.map(p => p.subject).filter(Boolean)));
    res.json({ subjects, totalPdfs: readyPdfs.length });
  });

  app.get("/api/textbooks", async (_req: Request, res: Response) => {
    const pdfs = await storage.listPdfFiles();
    const readyPdfs = pdfs.filter(p => p.status === "READY");

    const levels = Array.from(new Set(readyPdfs.map(p => p.educationLevel).filter(Boolean)));

    const textbooks = readyPdfs.map(p => ({
      id: p.id,
      title: p.title,
      subject: p.subject,
      educationLevel: p.educationLevel,
      yearNumber: p.yearNumber,
      specialization: p.specialization,
    }));

    res.json({ levels, textbooks });
  });

  app.get("/api/textbooks/:id/chapters", async (req: Request, res: Response) => {
    const pdfFileId = req.params.id as string;
    const chunks = await storage.getChunksForPdf(pdfFileId);
    if (chunks.length === 0) {
      return res.json({ chapters: [] });
    }

    const maxPage = Math.max(...chunks.map(c => c.pageEnd));
    const chapterSize = Math.ceil(maxPage / Math.min(Math.ceil(maxPage / 20), 10));
    const chapters: { id: string; label: string; pageStart: number; pageEnd: number }[] = [];

    for (let start = 1; start <= maxPage; start += chapterSize) {
      const end = Math.min(start + chapterSize - 1, maxPage);
      chapters.push({
        id: `${start}-${end}`,
        label: `Pages ${start}\u2013${end}`,
        pageStart: start,
        pageEnd: end,
      });
    }

    res.json({ chapters });
  });

  app.get("/api/admin/koutoubi/discover", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const books = await discoverBooks();
      res.json({ books, total: books.length });
    } catch (error: any) {
      console.error("Koutoubi discover error:", error);
      res.status(500).json({ message: error.message || "Discovery failed" });
    }
  });

  app.post("/api/admin/koutoubi/import", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { books } = req.body as { books: DiscoveredBook[] };
      if (!books || !Array.isArray(books) || books.length === 0) {
        return res.status(400).json({ message: "books array is required" });
      }

      const results: Array<{
        pdfUrl: string;
        status: "imported" | "duplicate" | "error";
        pdfFileId?: string;
        jobId?: string;
        message?: string;
      }> = [];

      for (const book of books) {
        try {
          const existingByUrl = await storage.getPdfFileBySourceUrl(book.pdfUrl);
          if (existingByUrl) {
            results.push({ pdfUrl: book.pdfUrl, status: "duplicate", message: "Already imported (source URL match)", pdfFileId: existingByUrl.id });
            continue;
          }

          const pdfRes = await fetch(book.pdfUrl, {
            headers: { "User-Agent": "BacMR-Bot/1.0" },
            signal: AbortSignal.timeout(120000),
          });

          if (!pdfRes.ok) {
            results.push({ pdfUrl: book.pdfUrl, status: "error", message: `Download failed: HTTP ${pdfRes.status}` });
            continue;
          }

          const arrayBuffer = await pdfRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

          const existingByChecksum = await storage.getPdfFileByChecksum(checksum);
          if (existingByChecksum) {
            results.push({ pdfUrl: book.pdfUrl, status: "duplicate", message: "Already imported (checksum match)", pdfFileId: existingByChecksum.id });
            continue;
          }

          const filename = book.pdfUrl.split("/").pop() || `koutoubi-${Date.now()}.pdf`;
          const storageKey = `pdfs/koutoubi/${filename}`;
          const fileStorage = getStorage();
          await fileStorage.save(storageKey, buffer);

          const pdfFile = await storage.createPdfFile({
            title: book.title,
            subject: book.subject,
            educationLevel: book.educationLevel,
            yearNumber: book.yearNumber,
            specialization: book.specialization,
            sourceType: "koutoubi",
            sourceUrl: book.pdfUrl,
            edition: book.edition,
            storageKey,
            checksum,
            status: "UPLOADED",
            fileSizeBytes: buffer.length,
            uploadedBy: req.dbUser!.id,
          });

          const job = await storage.createIngestionJob({
            pdfFileId: pdfFile.id,
            status: "QUEUED",
          });

          results.push({ pdfUrl: book.pdfUrl, status: "imported", pdfFileId: pdfFile.id, jobId: job.id });
        } catch (error: any) {
          console.error(`Failed to import ${book.pdfUrl}:`, error);
          results.push({ pdfUrl: book.pdfUrl, status: "error", message: error.message || "Unknown error" });
        }
      }

      const imported = results.filter(r => r.status === "imported").length;
      const duplicates = results.filter(r => r.status === "duplicate").length;
      const errors = results.filter(r => r.status === "error").length;

      res.json({ results, summary: { total: results.length, imported, duplicates, errors } });
    } catch (error: any) {
      console.error("Koutoubi import error:", error);
      res.status(500).json({ message: error.message || "Import failed" });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (_req: Request, res: Response) => {
    const pdfs = await storage.listPdfFiles();
    const jobs = await storage.listIngestionJobs();

    const stats = {
      totalPdfs: pdfs.length,
      readyPdfs: pdfs.filter(p => p.status === "READY").length,
      ingestingPdfs: pdfs.filter(p => p.status === "INGESTING").length,
      failedPdfs: pdfs.filter(p => p.status === "FAILED").length,
      totalJobs: jobs.length,
      queuedJobs: jobs.filter(j => j.status === "QUEUED").length,
      runningJobs: jobs.filter(j => j.status === "RUNNING").length,
      completedJobs: jobs.filter(j => j.status === "COMPLETED").length,
      failedJobs: jobs.filter(j => j.status === "FAILED").length,
    };

    res.json(stats);
  });

  return httpServer;
}
