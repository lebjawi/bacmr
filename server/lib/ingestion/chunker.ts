export interface TextChunk {
  text: string;
  pageStart: number;
  pageEnd: number;
  tokenCount: number;
}

const AVG_CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / AVG_CHARS_PER_TOKEN);
}

export function chunkPages(
  pages: { pageNumber: number; text: string }[],
  maxTokens: number = 500,
  overlapTokens: number = 50
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let currentText = "";
  let currentPageStart = pages[0]?.pageNumber ?? 1;
  let currentPageEnd = currentPageStart;

  for (const page of pages) {
    const sentences = page.text.split(/(?<=[.!?\u0964\u0964\n])\s+/);

    for (const sentence of sentences) {
      const candidateText = currentText ? currentText + " " + sentence : sentence;
      const candidateTokens = estimateTokens(candidateText);

      if (candidateTokens > maxTokens && currentText.length > 0) {
        chunks.push({
          text: currentText.trim(),
          pageStart: currentPageStart,
          pageEnd: currentPageEnd,
          tokenCount: estimateTokens(currentText),
        });

        const overlapChars = overlapTokens * AVG_CHARS_PER_TOKEN;
        const overlap = currentText.slice(-overlapChars);
        currentText = overlap + " " + sentence;
        currentPageStart = page.pageNumber;
        currentPageEnd = page.pageNumber;
      } else {
        currentText = candidateText;
        currentPageEnd = page.pageNumber;
      }
    }
  }

  if (currentText.trim().length > 0) {
    chunks.push({
      text: currentText.trim(),
      pageStart: currentPageStart,
      pageEnd: currentPageEnd,
      tokenCount: estimateTokens(currentText),
    });
  }

  return chunks;
}
