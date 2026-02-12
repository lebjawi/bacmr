import { extractText, getDocumentProxy } from "unpdf";

export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export async function parsePdf(buffer: Buffer): Promise<{ pages: ParsedPage[]; totalPages: number }> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const numPages = pdf.numPages;

  const { totalPages, text: pageTexts } = await extractText(pdf, { mergePages: false });

  const pages: ParsedPage[] = [];
  const textArray = pageTexts as string[];

  for (let i = 0; i < textArray.length; i++) {
    const text = textArray[i].trim();
    if (text.length > 0) {
      pages.push({ pageNumber: i + 1, text });
    }
  }

  pdf.cleanup();

  return { pages, totalPages: numPages };
}
