import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
import { users } from "./models/auth";

const vector = customType<{ data: number[]; driverValue: string }>({
  dataType() {
    return "vector(3072)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown): number[] {
    return (value as string)
      .slice(1, -1)
      .split(",")
      .map(Number);
  },
});

export const educationLevels = ["elementary", "secondary", "high_school"] as const;
export type EducationLevel = typeof educationLevels[number];

export const specializations = ["C", "D", "A", "O", "TM"] as const;
export type Specialization = typeof specializations[number];

export const sourceTypes = ["manual", "koutoubi"] as const;
export type SourceType = typeof sourceTypes[number];

export const pdfFiles = pgTable("pdf_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 500 }).notNull(),
  subject: varchar("subject", { length: 100 }),
  stream: varchar("stream", { length: 50 }),
  year: integer("year"),
  educationLevel: varchar("education_level", { length: 20 }),
  yearNumber: integer("year_number"),
  specialization: varchar("specialization", { length: 10 }),
  sourceType: varchar("source_type", { length: 20 }).default("manual"),
  sourceUrl: varchar("source_url", { length: 1000 }),
  edition: varchar("edition", { length: 10 }),
  storageKey: varchar("storage_key", { length: 500 }).notNull(),
  checksum: varchar("checksum", { length: 64 }),
  status: varchar("status", { length: 20 }).notNull().default("UPLOADED"),
  pageCount: integer("page_count"),
  fileSizeBytes: integer("file_size_bytes"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ingestionJobs = pgTable("ingestion_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pdfFileId: varchar("pdf_file_id").notNull().references(() => pdfFiles.id),
  status: varchar("status", { length: 20 }).notNull().default("QUEUED"),
  totalPages: integer("total_pages").default(0),
  pagesDone: integer("pages_done").default(0),
  totalChunks: integer("total_chunks").default(0),
  chunksDone: integer("chunks_done").default(0),
  nextPageToProcess: integer("next_page_to_process").default(0),
  nextChunkIndex: integer("next_chunk_index").default(0),
  errorMessage: text("error_message"),
  lastHeartbeatAt: timestamp("last_heartbeat_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pdfChunks = pgTable("pdf_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pdfFileId: varchar("pdf_file_id").notNull().references(() => pdfFiles.id),
  chunkIndex: integer("chunk_index").notNull(),
  pageStart: integer("page_start").notNull(),
  pageEnd: integer("page_end").notNull(),
  text: text("text").notNull(),
  embedding: vector("embedding"),
  tokenCount: integer("token_count"),
  sourceRef: varchar("source_ref", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  pdfFiles: many(pdfFiles),
}));

export const pdfFilesRelations = relations(pdfFiles, ({ one, many }) => ({
  uploader: one(users, {
    fields: [pdfFiles.uploadedBy],
    references: [users.id],
  }),
  ingestionJobs: many(ingestionJobs),
  chunks: many(pdfChunks),
}));

export const ingestionJobsRelations = relations(ingestionJobs, ({ one }) => ({
  pdfFile: one(pdfFiles, {
    fields: [ingestionJobs.pdfFileId],
    references: [pdfFiles.id],
  }),
}));

export const pdfChunksRelations = relations(pdfChunks, ({ one }) => ({
  pdfFile: one(pdfFiles, {
    fields: [pdfChunks.pdfFileId],
    references: [pdfFiles.id],
  }),
}));

export const insertPdfFileSchema = createInsertSchema(pdfFiles).omit({
  id: true,
  uploadedAt: true,
  updatedAt: true,
});

export const insertIngestionJobSchema = createInsertSchema(ingestionJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPdfChunkSchema = createInsertSchema(pdfChunks).omit({
  id: true,
  createdAt: true,
});

export type InsertPdfFile = z.infer<typeof insertPdfFileSchema>;
export type PdfFile = typeof pdfFiles.$inferSelect;

export type InsertIngestionJob = z.infer<typeof insertIngestionJobSchema>;
export type IngestionJob = typeof ingestionJobs.$inferSelect;

export type InsertPdfChunk = z.infer<typeof insertPdfChunkSchema>;
export type PdfChunk = typeof pdfChunks.$inferSelect;
