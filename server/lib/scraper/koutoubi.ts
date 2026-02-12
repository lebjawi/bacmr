export interface DiscoveredBook {
  title: string;
  pdfUrl: string;
  educationLevel: "elementary" | "secondary" | "high_school";
  yearNumber: number;
  subject: string;
  specialization: string | null;
  edition: string | null;
  sourcePageUrl: string;
}

const BASE_URL = "https://www.koutoubi.mr";
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;

const YEAR_MAP: Record<string, number> = {
  "1ere": 1,
  "2eme": 2,
  "3eme": 3,
  "4eme": 4,
  "5eme": 5,
  "6eme": 6,
  "7eme": 7,
};

const SPECIALIZATION_PATTERNS = ["TM", "C", "D", "A", "O"];

function parseEducationLevel(path: string): "elementary" | "secondary" | "high_school" | null {
  if (path.includes("fondamentals/")) return "elementary";
  if (path.includes("secondaire1/")) return "secondary";
  if (path.includes("secondaire2/")) return "high_school";
  return null;
}

function parseYearNumber(path: string): number | null {
  for (const [key, value] of Object.entries(YEAR_MAP)) {
    if (path.includes(`/${key}/`) || path.includes(`/${key}`)) {
      return value;
    }
  }
  return null;
}

function parseSubject(path: string): string | null {
  const levelPrefixes = ["fondamentals/", "secondaire1/", "secondaire2/"];
  for (const prefix of levelPrefixes) {
    const idx = path.indexOf(prefix);
    if (idx === -1) continue;
    const rest = path.slice(idx + prefix.length);
    const parts = rest.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return parts[1];
    }
  }
  return null;
}

function parseSpecialization(pdfUrl: string, title: string): string | null {
  const combined = `${pdfUrl} ${title}`;
  for (const spec of SPECIALIZATION_PATTERNS) {
    const regex = new RegExp(`[_\\s-]${spec}[_\\s.-]|[_\\s-]${spec}$|\\b${spec}\\b`, "i");
    if (regex.test(combined)) {
      return spec.toUpperCase();
    }
  }
  return null;
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "BacMR-Bot/1.0",
        },
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return res;
      if (res.status === 403 || res.status === 404) return null;
    } catch (err) {
      if (i === retries) return null;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return null;
}

async function fetchSitemapUrls(): Promise<string[]> {
  const res = await fetchWithRetry(SITEMAP_URL);
  if (!res) throw new Error("Failed to fetch sitemap from " + SITEMAP_URL);

  const xml = await res.text();
  const urls: string[] = [];
  const locRegex = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    let url = match[1].trim();
    url = url.replace("koutoubi.netlify.app", "www.koutoubi.mr");
    urls.push(url);
  }
  return urls;
}

function isTextbookPageUrl(url: string): boolean {
  return (
    url.includes("fondamentals/") ||
    url.includes("secondaire1/") ||
    url.includes("secondaire2/")
  );
}

function extractBooksFromHtml(html: string, pageUrl: string): DiscoveredBook[] {
  const books: DiscoveredBook[] = [];

  const educationLevel = parseEducationLevel(pageUrl);
  const yearNumber = parseYearNumber(pageUrl);
  const subject = parseSubject(pageUrl);

  if (!educationLevel || !yearNumber || !subject) return books;

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1].trim());
    }

    if (cells.length < 2) continue;

    const pdfUrlRegex = /href=["'](https?:\/\/docs\.bsimr\.com\/[^"']*\.pdf)["']/i;
    let pdfUrl: string | null = null;
    let title: string | null = null;

    for (const cell of cells) {
      const pdfMatch = cell.match(pdfUrlRegex);
      if (pdfMatch) {
        pdfUrl = pdfMatch[1];
        const titleMatch = cell.match(/>([^<]+)</);
        if (titleMatch && !title) {
          title = titleMatch[1].trim();
        }
      }
    }

    if (!pdfUrl) continue;
    if (!title) {
      const anyTextMatch = cells[0].match(/>([^<]+)</);
      title = anyTextMatch ? anyTextMatch[1].trim() : "Unknown";
    }

    if (title === "Download" || title === "Télécharger") {
      const firstCellText = cells[0].match(/>([^<]+)</);
      if (firstCellText) {
        title = firstCellText[1].trim();
      }
    }

    let edition: string | null = null;
    for (const cell of cells) {
      const stripped = cell.replace(/<[^>]+>/g, "").trim();
      const yearMatch = stripped.match(/^(20\d{2})$/);
      if (yearMatch) {
        edition = yearMatch[1];
        break;
      }
    }

    const specialization = parseSpecialization(pdfUrl, title);

    books.push({
      title,
      pdfUrl,
      educationLevel,
      yearNumber,
      subject,
      specialization,
      edition,
      sourcePageUrl: pageUrl,
    });
  }

  return books;
}

export async function discoverBooks(): Promise<DiscoveredBook[]> {
  console.log("[koutoubi] Fetching sitemap...");
  const allUrls = await fetchSitemapUrls();
  const pageUrls = allUrls.filter(isTextbookPageUrl);
  console.log(`[koutoubi] Found ${pageUrls.length} textbook page URLs in sitemap`);

  const allBooks: DiscoveredBook[] = [];
  const seen = new Set<string>();

  for (const pageUrl of pageUrls) {
    try {
      console.log(`[koutoubi] Scraping ${pageUrl}...`);
      const res = await fetchWithRetry(pageUrl);
      if (!res) {
        console.log(`[koutoubi] Skipping ${pageUrl} (fetch failed or 403/404)`);
        continue;
      }

      const html = await res.text();
      const books = extractBooksFromHtml(html, pageUrl);

      for (const book of books) {
        if (!seen.has(book.pdfUrl)) {
          seen.add(book.pdfUrl);
          allBooks.push(book);
        }
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`[koutoubi] Error scraping ${pageUrl}:`, err);
    }
  }

  console.log(`[koutoubi] Discovered ${allBooks.length} unique books`);
  return allBooks;
}
