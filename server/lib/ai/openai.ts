import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnv } from "../env";

let _client: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!_client) {
    const env = getEnv();
    _client = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
  }
  return _client;
}

export function getEmbeddingModel(): string {
  return getEnv().GEMINI_EMBEDDING_MODEL;
}

export function getChatModel(): string {
  return getEnv().GEMINI_CHAT_MODEL;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: getEmbeddingModel() });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function chatCompletion(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: getChatModel(),
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(userMessage);
  return result.response.text();
}
