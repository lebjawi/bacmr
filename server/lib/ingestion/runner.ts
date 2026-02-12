import { storage } from "../../storage";
import { getStorage } from "../storage";
import { generateEmbedding } from "../ai/openai";
import { parsePdf } from "./parser";
import { chunkPages } from "./chunker";
import type { IngestionJob } from "@shared/schema";

const HEARTBEAT_INTERVAL_MS = 15_000;
const BATCH_SIZE = 5;

export async function runIngestionJob(jobId: string): Promise<void> {
  const job = await storage.getIngestionJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  const pdfFile = await storage.getPdfFile(job.pdfFileId);
  if (!pdfFile) throw new Error(`PDF ${job.pdfFileId} not found`);

  const heartbeatTimer = setInterval(async () => {
    try {
      await storage.updateJobProgress(jobId, { lastHeartbeatAt: new Date() });
    } catch (e) {
      console.error("Heartbeat failed:", e);
    }
  }, HEARTBEAT_INTERVAL_MS);

  try {
    await storage.updatePdfFileStatus(pdfFile.id, "INGESTING");

    const fileStorage = getStorage();
    const buffer = await fileStorage.get(pdfFile.storageKey);

    const { pages, totalPages } = await parsePdf(buffer);
    await storage.updateJobProgress(jobId, { totalPages });

    const allChunks = chunkPages(pages);
    await storage.updateJobProgress(jobId, { totalChunks: allChunks.length });

    const startIndex = job.nextChunkIndex ?? 0;

    if (startIndex > 0) {
      await storage.deleteChunksFromIndex(pdfFile.id, startIndex);
    }

    let chunksProcessed = startIndex;

    for (let i = startIndex; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE);

      const embeddedChunks = await Promise.all(
        batch.map(async (chunk, batchIdx) => {
          const embedding = await generateEmbedding(chunk.text);
          const globalIdx = i + batchIdx;
          const sourceRef = `${pdfFile.title} p${chunk.pageStart}${chunk.pageEnd !== chunk.pageStart ? `-${chunk.pageEnd}` : ""}`;

          return {
            pdfFileId: pdfFile.id,
            chunkIndex: globalIdx,
            pageStart: chunk.pageStart,
            pageEnd: chunk.pageEnd,
            text: chunk.text,
            embedding,
            tokenCount: chunk.tokenCount,
            sourceRef,
          };
        })
      );

      await storage.createPdfChunks(embeddedChunks);
      chunksProcessed = i + batch.length;

      await storage.updateJobProgress(jobId, {
        chunksDone: chunksProcessed,
        pagesDone: Math.min(totalPages, batch[batch.length - 1].pageEnd),
        nextChunkIndex: chunksProcessed,
        nextPageToProcess: batch[batch.length - 1].pageEnd,
        lastHeartbeatAt: new Date(),
      });
    }

    await storage.updateJobProgress(jobId, {
      status: "COMPLETED",
      chunksDone: allChunks.length,
      pagesDone: totalPages,
      completedAt: new Date(),
    });
    await storage.updatePdfFileStatus(pdfFile.id, "READY");

    dispatchNextJob().catch(err => {
      console.error("Auto-dispatch next job failed:", err);
    });

  } catch (error: any) {
    console.error(`Ingestion job ${jobId} failed:`, error);
    await storage.updateJobProgress(jobId, {
      status: "FAILED",
      errorMessage: error.message || "Unknown error",
    });
    await storage.updatePdfFileStatus(pdfFile.id, "FAILED");

    dispatchNextJob().catch(err => {
      console.error("Auto-dispatch next job after failure failed:", err);
    });
  } finally {
    clearInterval(heartbeatTimer);
  }
}

export async function dispatchNextJob(): Promise<IngestionJob | undefined> {
  const job = await storage.claimQueuedJob();
  if (!job) return undefined;

  runIngestionJob(job.id).catch(err => {
    console.error("Background ingestion failed:", err);
  });

  return job;
}
