import { eq, and, asc } from "drizzle-orm";
import { db } from "./db";
import {
  users, type User, type InsertUser,
  streams, type Stream, type InsertStream,
  subjects, type Subject, type InsertSubject,
  chapters, type Chapter, type InsertChapter,
  lessons, type Lesson, type InsertLesson,
  examPapers, type ExamPaper, type InsertExamPaper,
  lessonProgress, type LessonProgress, type InsertLessonProgress,
  examAttempts, type ExamAttempt, type InsertExamAttempt,
  aiConversations, type AiConversation, type InsertAiConversation,
  aiMessages, type AiMessage, type InsertAiMessage,
  subscriptions, type Subscription, type InsertSubscription,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;

  // Streams
  getStreams(): Promise<Stream[]>;
  getStream(id: number): Promise<Stream | undefined>;
  createStream(stream: InsertStream): Promise<Stream>;

  // Subjects
  getSubjects(streamId?: number): Promise<Subject[]>;
  getSubject(id: number): Promise<Subject | undefined>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: number, data: Partial<InsertSubject>): Promise<Subject | undefined>;
  deleteSubject(id: number): Promise<void>;

  // Chapters
  getChapters(subjectId: number): Promise<Chapter[]>;
  getChapter(id: number): Promise<Chapter | undefined>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  updateChapter(id: number, data: Partial<InsertChapter>): Promise<Chapter | undefined>;
  deleteChapter(id: number): Promise<void>;

  // Lessons
  getLessons(chapterId: number): Promise<Lesson[]>;
  getLesson(id: number): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: number, data: Partial<InsertLesson>): Promise<Lesson | undefined>;
  deleteLesson(id: number): Promise<void>;

  // Exam Papers
  getExamPapers(streamId?: number, subjectId?: number): Promise<ExamPaper[]>;
  getExamPaper(id: number): Promise<ExamPaper | undefined>;
  createExamPaper(exam: InsertExamPaper): Promise<ExamPaper>;
  updateExamPaper(id: number, data: Partial<InsertExamPaper>): Promise<ExamPaper | undefined>;
  deleteExamPaper(id: number): Promise<void>;

  // Progress
  getLessonProgress(userId: number, lessonId?: number): Promise<LessonProgress[]>;
  upsertLessonProgress(data: InsertLessonProgress): Promise<LessonProgress>;

  // Exam Attempts
  getExamAttempts(userId: number): Promise<ExamAttempt[]>;
  createExamAttempt(attempt: InsertExamAttempt): Promise<ExamAttempt>;

  // AI Conversations
  getConversations(userId: number, lessonId?: number): Promise<AiConversation[]>;
  createConversation(conv: InsertAiConversation): Promise<AiConversation>;
  getMessages(conversationId: number): Promise<AiMessage[]>;
  createMessage(msg: InsertAiMessage): Promise<AiMessage>;
}

export class DatabaseStorage implements IStorage {
  // ─── Users ───
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  // ─── Streams ───
  async getStreams(): Promise<Stream[]> {
    return db.select().from(streams);
  }

  async getStream(id: number): Promise<Stream | undefined> {
    const [stream] = await db.select().from(streams).where(eq(streams.id, id));
    return stream;
  }

  async createStream(stream: InsertStream): Promise<Stream> {
    const [created] = await db.insert(streams).values(stream).returning();
    return created;
  }

  // ─── Subjects ───
  async getSubjects(streamId?: number): Promise<Subject[]> {
    if (streamId) {
      return db.select().from(subjects).where(eq(subjects.streamId, streamId)).orderBy(asc(subjects.order));
    }
    return db.select().from(subjects).orderBy(asc(subjects.order));
  }

  async getSubject(id: number): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
    return subject;
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const [created] = await db.insert(subjects).values(subject).returning();
    return created;
  }

  async updateSubject(id: number, data: Partial<InsertSubject>): Promise<Subject | undefined> {
    const [updated] = await db.update(subjects).set(data).where(eq(subjects.id, id)).returning();
    return updated;
  }

  async deleteSubject(id: number): Promise<void> {
    await db.delete(subjects).where(eq(subjects.id, id));
  }

  // ─── Chapters ───
  async getChapters(subjectId: number): Promise<Chapter[]> {
    return db.select().from(chapters).where(eq(chapters.subjectId, subjectId)).orderBy(asc(chapters.order));
  }

  async getChapter(id: number): Promise<Chapter | undefined> {
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, id));
    return chapter;
  }

  async createChapter(chapter: InsertChapter): Promise<Chapter> {
    const [created] = await db.insert(chapters).values(chapter).returning();
    return created;
  }

  async updateChapter(id: number, data: Partial<InsertChapter>): Promise<Chapter | undefined> {
    const [updated] = await db.update(chapters).set(data).where(eq(chapters.id, id)).returning();
    return updated;
  }

  async deleteChapter(id: number): Promise<void> {
    await db.delete(chapters).where(eq(chapters.id, id));
  }

  // ─── Lessons ───
  async getLessons(chapterId: number): Promise<Lesson[]> {
    return db.select().from(lessons).where(eq(lessons.chapterId, chapterId)).orderBy(asc(lessons.order));
  }

  async getLesson(id: number): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
    return lesson;
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const [created] = await db.insert(lessons).values(lesson).returning();
    return created;
  }

  async updateLesson(id: number, data: Partial<InsertLesson>): Promise<Lesson | undefined> {
    const [updated] = await db.update(lessons).set(data).where(eq(lessons.id, id)).returning();
    return updated;
  }

  async deleteLesson(id: number): Promise<void> {
    await db.delete(lessons).where(eq(lessons.id, id));
  }

  // ─── Exam Papers ───
  async getExamPapers(streamId?: number, subjectId?: number): Promise<ExamPaper[]> {
    const conditions = [];
    if (streamId) conditions.push(eq(examPapers.streamId, streamId));
    if (subjectId) conditions.push(eq(examPapers.subjectId, subjectId));
    
    if (conditions.length > 0) {
      return db.select().from(examPapers).where(and(...conditions));
    }
    return db.select().from(examPapers);
  }

  async getExamPaper(id: number): Promise<ExamPaper | undefined> {
    const [exam] = await db.select().from(examPapers).where(eq(examPapers.id, id));
    return exam;
  }

  async createExamPaper(exam: InsertExamPaper): Promise<ExamPaper> {
    const [created] = await db.insert(examPapers).values(exam).returning();
    return created;
  }

  async updateExamPaper(id: number, data: Partial<InsertExamPaper>): Promise<ExamPaper | undefined> {
    const [updated] = await db.update(examPapers).set(data).where(eq(examPapers.id, id)).returning();
    return updated;
  }

  async deleteExamPaper(id: number): Promise<void> {
    await db.delete(examPapers).where(eq(examPapers.id, id));
  }

  // ─── Progress ───
  async getLessonProgress(userId: number, lessonId?: number): Promise<LessonProgress[]> {
    if (lessonId) {
      return db.select().from(lessonProgress)
        .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
    }
    return db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId));
  }

  async upsertLessonProgress(data: InsertLessonProgress): Promise<LessonProgress> {
    const existing = await db.select().from(lessonProgress)
      .where(and(eq(lessonProgress.userId, data.userId), eq(lessonProgress.lessonId, data.lessonId)));
    
    if (existing.length > 0) {
      const [updated] = await db.update(lessonProgress)
        .set({ completed: data.completed, completedAt: data.completed ? new Date() : null })
        .where(eq(lessonProgress.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(lessonProgress).values({
      ...data,
      completedAt: data.completed ? new Date() : null,
    }).returning();
    return created;
  }

  // ─── Exam Attempts ───
  async getExamAttempts(userId: number): Promise<ExamAttempt[]> {
    return db.select().from(examAttempts).where(eq(examAttempts.userId, userId));
  }

  async createExamAttempt(attempt: InsertExamAttempt): Promise<ExamAttempt> {
    const [created] = await db.insert(examAttempts).values(attempt).returning();
    return created;
  }

  // ─── AI Conversations ───
  async getConversations(userId: number, lessonId?: number): Promise<AiConversation[]> {
    if (lessonId) {
      return db.select().from(aiConversations)
        .where(and(eq(aiConversations.userId, userId), eq(aiConversations.lessonId, lessonId)));
    }
    return db.select().from(aiConversations).where(eq(aiConversations.userId, userId));
  }

  async createConversation(conv: InsertAiConversation): Promise<AiConversation> {
    const [created] = await db.insert(aiConversations).values(conv).returning();
    return created;
  }

  async getMessages(conversationId: number): Promise<AiMessage[]> {
    return db.select().from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(asc(aiMessages.createdAt));
  }

  async createMessage(msg: InsertAiMessage): Promise<AiMessage> {
    const [created] = await db.insert(aiMessages).values(msg).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
