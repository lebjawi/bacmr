import { db } from "../../db";
import { aiConversations, aiMessages } from "@shared/schema";
import { eq, desc, asc } from "drizzle-orm";

export interface IChatStorage {
  getConversation(id: number): Promise<typeof aiConversations.$inferSelect | undefined>;
  getConversationsByUser(userId: number, lessonId?: number): Promise<(typeof aiConversations.$inferSelect)[]>;
  createConversation(userId: number, lessonId?: number | null): Promise<typeof aiConversations.$inferSelect>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<(typeof aiMessages.$inferSelect)[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<typeof aiMessages.$inferSelect>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const [conversation] = await db.select().from(aiConversations).where(eq(aiConversations.id, id));
    return conversation;
  },

  async getConversationsByUser(userId: number, lessonId?: number) {
    if (lessonId) {
      const { and } = await import("drizzle-orm");
      return db.select().from(aiConversations)
        .where(and(eq(aiConversations.userId, userId), eq(aiConversations.lessonId, lessonId)))
        .orderBy(desc(aiConversations.createdAt));
    }
    return db.select().from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.createdAt));
  },

  async createConversation(userId: number, lessonId?: number | null) {
    const [conversation] = await db.insert(aiConversations)
      .values({ userId, lessonId: lessonId ?? null })
      .returning();
    return conversation;
  },

  async deleteConversation(id: number) {
    await db.delete(aiMessages).where(eq(aiMessages.conversationId, id));
    await db.delete(aiConversations).where(eq(aiConversations.id, id));
  },

  async getMessagesByConversation(conversationId: number) {
    return db.select().from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(asc(aiMessages.createdAt));
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const [message] = await db.insert(aiMessages)
      .values({ conversationId, role, content })
      .returning();
    return message;
  },
};
