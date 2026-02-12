import {
  type User, type UpsertUser,
  type PdfFile, type InsertPdfFile, pdfFiles,
  type IngestionJob, type InsertIngestionJob, ingestionJobs,
  type PdfChunk, type InsertPdfChunk, pdfChunks,
  users,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, lt } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: { username: string; passwordHash: string; email?: string; firstName?: string; lastName?: string; role: string }): Promise<User>;
  updateUser(id: string, updates: { username?: string; email?: string; firstName?: string; lastName?: string; role?: string; isActive?: boolean }): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  resetUserPassword(id: string, passwordHash: string): Promise<User | undefined>;

  createPdfFile(data: InsertPdfFile): Promise<PdfFile>;
  getPdfFile(id: string): Promise<PdfFile | undefined>;
  listPdfFiles(): Promise<PdfFile[]>;
  updatePdfFileStatus(id: string, status: string): Promise<PdfFile | undefined>;
  getPdfFileByChecksum(checksum: string): Promise<PdfFile | undefined>;
  getPdfFileBySourceUrl(sourceUrl: string): Promise<PdfFile | undefined>;

  createIngestionJob(data: InsertIngestionJob): Promise<IngestionJob>;
  getIngestionJob(id: string): Promise<IngestionJob | undefined>;
  getJobsForPdf(pdfFileId: string): Promise<IngestionJob[]>;
  listIngestionJobs(): Promise<IngestionJob[]>;
  claimQueuedJob(): Promise<IngestionJob | undefined>;
  updateJobProgress(id: string, updates: Partial<IngestionJob>): Promise<IngestionJob | undefined>;
  markStalledJobs(timeoutMinutes: number): Promise<number>;
  requeueJob(id: string): Promise<IngestionJob | undefined>;

  createPdfChunk(data: InsertPdfChunk): Promise<PdfChunk>;
  createPdfChunks(data: InsertPdfChunk[]): Promise<PdfChunk[]>;
  getChunksForPdf(pdfFileId: string): Promise<PdfChunk[]>;
  searchChunksByVector(embedding: number[], limit?: number, filters?: { pdfFileId?: string; educationLevel?: string; pageStart?: number; pageEnd?: number }): Promise<(PdfChunk & { distance: number; pdfTitle: string })[]>;
  getChunkCount(pdfFileId: string): Promise<number>;
  deleteChunksFromIndex(pdfFileId: string, fromIndex: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: { ...userData, updatedAt: new Date() },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async createUser(userData: { username: string; passwordHash: string; email?: string; firstName?: string; lastName?: string; role: string }): Promise<User> {
    const [user] = await db.insert(users).values({
      username: userData.username,
      passwordHash: userData.passwordHash,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      role: userData.role,
    }).returning();
    return user;
  }

  async updateUser(id: string, updates: { username?: string; email?: string; firstName?: string; lastName?: string; role?: string; isActive?: boolean }): Promise<User | undefined> {
    const setObj: Record<string, any> = { updatedAt: new Date() };
    if (updates.username !== undefined) setObj.username = updates.username;
    if (updates.email !== undefined) setObj.email = updates.email;
    if (updates.firstName !== undefined) setObj.firstName = updates.firstName;
    if (updates.lastName !== undefined) setObj.lastName = updates.lastName;
    if (updates.role !== undefined) setObj.role = updates.role;
    if (updates.isActive !== undefined) setObj.isActive = updates.isActive;
    const [user] = await db.update(users).set(setObj).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async resetUserPassword(id: string, passwordHash: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async createPdfFile(data: InsertPdfFile): Promise<PdfFile> {
    const [file] = await db.insert(pdfFiles).values(data).returning();
    return file;
  }

  async getPdfFile(id: string): Promise<PdfFile | undefined> {
    const [file] = await db.select().from(pdfFiles).where(eq(pdfFiles.id, id));
    return file || undefined;
  }

  async listPdfFiles(): Promise<PdfFile[]> {
    return db.select().from(pdfFiles).orderBy(desc(pdfFiles.uploadedAt));
  }

  async updatePdfFileStatus(id: string, status: string): Promise<PdfFile | undefined> {
    const [file] = await db
      .update(pdfFiles)
      .set({ status, updatedAt: new Date() })
      .where(eq(pdfFiles.id, id))
      .returning();
    return file || undefined;
  }

  async getPdfFileByChecksum(checksum: string): Promise<PdfFile | undefined> {
    const [file] = await db
      .select()
      .from(pdfFiles)
      .where(eq(pdfFiles.checksum, checksum));
    return file || undefined;
  }

  async getPdfFileBySourceUrl(sourceUrl: string): Promise<PdfFile | undefined> {
    const [file] = await db
      .select()
      .from(pdfFiles)
      .where(eq(pdfFiles.sourceUrl, sourceUrl));
    return file || undefined;
  }

  async createIngestionJob(data: InsertIngestionJob): Promise<IngestionJob> {
    const [job] = await db.insert(ingestionJobs).values(data).returning();
    return job;
  }

  async getIngestionJob(id: string): Promise<IngestionJob | undefined> {
    const [job] = await db
      .select()
      .from(ingestionJobs)
      .where(eq(ingestionJobs.id, id));
    return job || undefined;
  }

  async getJobsForPdf(pdfFileId: string): Promise<IngestionJob[]> {
    return db
      .select()
      .from(ingestionJobs)
      .where(eq(ingestionJobs.pdfFileId, pdfFileId))
      .orderBy(desc(ingestionJobs.createdAt));
  }

  async listIngestionJobs(): Promise<IngestionJob[]> {
    return db
      .select()
      .from(ingestionJobs)
      .orderBy(desc(ingestionJobs.createdAt));
  }

  async claimQueuedJob(): Promise<IngestionJob | undefined> {
    const result = await db.execute(sql`
      UPDATE ingestion_jobs 
      SET status = 'RUNNING', 
          started_at = NOW(),
          last_heartbeat_at = NOW(),
          updated_at = NOW()
      WHERE id = (
        SELECT id FROM ingestion_jobs 
        WHERE status = 'QUEUED' 
        ORDER BY created_at ASC 
        LIMIT 1 
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);
    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any;
      return {
        id: row.id,
        pdfFileId: row.pdf_file_id,
        status: row.status,
        totalPages: row.total_pages,
        pagesDone: row.pages_done,
        totalChunks: row.total_chunks,
        chunksDone: row.chunks_done,
        nextPageToProcess: row.next_page_to_process,
        nextChunkIndex: row.next_chunk_index,
        errorMessage: row.error_message,
        lastHeartbeatAt: row.last_heartbeat_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
    return undefined;
  }

  async updateJobProgress(id: string, updates: Partial<IngestionJob>): Promise<IngestionJob | undefined> {
    const setObj: Record<string, any> = { updatedAt: new Date() };
    if (updates.status !== undefined) setObj.status = updates.status;
    if (updates.totalPages !== undefined) setObj.totalPages = updates.totalPages;
    if (updates.pagesDone !== undefined) setObj.pagesDone = updates.pagesDone;
    if (updates.totalChunks !== undefined) setObj.totalChunks = updates.totalChunks;
    if (updates.chunksDone !== undefined) setObj.chunksDone = updates.chunksDone;
    if (updates.nextPageToProcess !== undefined) setObj.nextPageToProcess = updates.nextPageToProcess;
    if (updates.nextChunkIndex !== undefined) setObj.nextChunkIndex = updates.nextChunkIndex;
    if (updates.errorMessage !== undefined) setObj.errorMessage = updates.errorMessage;
    if (updates.lastHeartbeatAt !== undefined) setObj.lastHeartbeatAt = updates.lastHeartbeatAt;
    if (updates.completedAt !== undefined) setObj.completedAt = updates.completedAt;

    const [job] = await db
      .update(ingestionJobs)
      .set(setObj)
      .where(eq(ingestionJobs.id, id))
      .returning();
    return job || undefined;
  }

  async markStalledJobs(timeoutMinutes: number): Promise<number> {
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    const result = await db
      .update(ingestionJobs)
      .set({
        status: "PAUSED",
        errorMessage: `Job timed out: no heartbeat for ${timeoutMinutes} minutes`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ingestionJobs.status, "RUNNING"),
          lt(ingestionJobs.lastHeartbeatAt, cutoff)
        )
      )
      .returning();
    return result.length;
  }

  async requeueJob(id: string): Promise<IngestionJob | undefined> {
    const [job] = await db
      .update(ingestionJobs)
      .set({
        status: "QUEUED",
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ingestionJobs.id, id),
          sql`status IN ('PAUSED', 'FAILED')`
        )
      )
      .returning();
    return job || undefined;
  }

  async createPdfChunk(data: InsertPdfChunk): Promise<PdfChunk> {
    const [chunk] = await db.insert(pdfChunks).values(data as any).returning();
    return chunk;
  }

  async createPdfChunks(data: InsertPdfChunk[]): Promise<PdfChunk[]> {
    if (data.length === 0) return [];
    return db.insert(pdfChunks).values(data as any).returning();
  }

  async getChunksForPdf(pdfFileId: string): Promise<PdfChunk[]> {
    return db
      .select()
      .from(pdfChunks)
      .where(eq(pdfChunks.pdfFileId, pdfFileId))
      .orderBy(pdfChunks.chunkIndex);
  }

  async searchChunksByVector(
    embedding: number[],
    limit: number = 8,
    filters?: { pdfFileId?: string; educationLevel?: string; pageStart?: number; pageEnd?: number }
  ): Promise<(PdfChunk & { distance: number; pdfTitle: string })[]> {
    const vectorStr = `[${embedding.join(",")}]`;

    let filterClause = sql``;
    if (filters?.pageStart !== undefined && filters?.pageEnd !== undefined && filters?.pdfFileId) {
      filterClause = sql`AND pc.pdf_file_id = ${filters.pdfFileId} AND pc.page_start >= ${filters.pageStart} AND pc.page_end <= ${filters.pageEnd}`;
    } else if (filters?.pdfFileId) {
      filterClause = sql`AND pc.pdf_file_id = ${filters.pdfFileId}`;
    } else if (filters?.educationLevel) {
      filterClause = sql`AND pf.education_level = ${filters.educationLevel}`;
    }

    const result = await db.execute(sql`
      SELECT pc.*, 
             pc.embedding <=> ${vectorStr}::vector AS distance,
             pf.title AS pdf_title
      FROM pdf_chunks pc
      JOIN pdf_files pf ON pc.pdf_file_id = pf.id
      WHERE pc.embedding IS NOT NULL
      AND pf.status = 'READY'
      ${filterClause}
      ORDER BY pc.embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `);
    return (result.rows as any[]).map(row => ({
      id: row.id,
      pdfFileId: row.pdf_file_id,
      chunkIndex: row.chunk_index,
      pageStart: row.page_start,
      pageEnd: row.page_end,
      text: row.text,
      embedding: row.embedding,
      tokenCount: row.token_count,
      sourceRef: row.source_ref,
      createdAt: row.created_at,
      distance: parseFloat(row.distance),
      pdfTitle: row.pdf_title,
    }));
  }

  async getChunkCount(pdfFileId: string): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM pdf_chunks WHERE pdf_file_id = ${pdfFileId}
    `);
    return parseInt((result.rows[0] as any).count, 10);
  }

  async deleteChunksFromIndex(pdfFileId: string, fromIndex: number): Promise<void> {
    await db.execute(sql`
      DELETE FROM pdf_chunks 
      WHERE pdf_file_id = ${pdfFileId} 
      AND chunk_index >= ${fromIndex}
    `);
  }
}

export const storage = new DatabaseStorage();
