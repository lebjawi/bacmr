# BACMR - AI Tutor for Mauritanian BAC

## Overview

BACMR is an AI-powered tutoring platform for Mauritanian Baccalaureate (BAC) students. It uses Retrieval-Augmented Generation (RAG) to answer student questions based on officially uploaded curriculum PDFs. The system has two main user roles:

- **Admin**: Uploads curriculum PDFs, monitors ingestion progress, manages content, and manages users (create accounts, assign roles).
- **Student**: Asks questions via an AI chat interface that retrieves relevant chunks from ingested PDFs and provides cited answers.

The core workflow is: Admin uploads PDF (or scrapes from koutoubi.mr) → PDF is parsed and chunked → Chunks are embedded via Gemini → Embeddings stored in PostgreSQL with pgvector → Student asks question → Question is embedded → Vector similarity search finds relevant chunks → Gemini chat completion generates an answer with citations.

**Security**: Admin dashboard (`/admin`) is hidden - no navigation links point to it. Only accessible by those who know the URL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React + Vite)

- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router)
- **State/Data fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS with CSS custom properties for theming (green/teal Mauritanian-inspired palette), supports light/dark mode
- **Fonts**: Space Grotesk (display), Tajawal (Arabic support), Fira Code (monospace)
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

**Key Pages**:
- `/` — Landing page (public)
- `/login` — Username/password login page
- `/chat` — AI Tutor chat interface (student)
- `/admin` — PDF upload, ingestion monitoring, user management, admin dashboard

### Backend (Express + Node.js)

- **Framework**: Express.js running on Node.js with TypeScript (via tsx)
- **API pattern**: REST API under `/api/` prefix
- **Authentication**: Dual auth support — custom username/password login (bcryptjs) alongside Replit OIDC. Sessions stored in PostgreSQL via connect-pg-simple. Login page at `/login`.
- **Authorization**: Role-based (student/admin) with middleware checks (`requireAdmin`, `requireStudent`, `requireAuthenticated`)
- **File uploads**: Multer with memory storage, 50MB limit
- **Build**: esbuild for server bundling, Vite for client bundling (see `script/build.ts`)

**Key API Routes**:
- `POST /api/admin/pdfs` — Upload PDF with curriculum labels (admin only)
- `GET /api/admin/pdfs` — List PDFs
- `GET /api/admin/jobs` — List ingestion jobs
- `GET /api/admin/koutoubi/discover` — Scrape koutoubi.mr sitemap and discover available textbooks
- `POST /api/admin/koutoubi/import` — Import selected koutoubi books (download, store, create ingestion jobs)
- `POST /api/chat` — RAG chat endpoint
- `GET /api/auth/me` — Current user info
- `POST /api/auth/login` — Username/password login
- `POST /api/auth/logout` — Session logout
- `GET /api/admin/users` — List all users (admin only)
- `POST /api/admin/users` — Create new user (admin only)

### Koutoubi.mr Curriculum Scraper

- **Module**: `server/lib/scraper/koutoubi.ts`
- **Source**: Official Mauritanian education library at koutoubi.mr (Institut Pedagogique National)
- **Method**: Parses sitemap XML → fetches each textbook page → extracts PDF links and metadata from HTML tables
- **Auto-labeling**: Education level, year number, subject, and specialization parsed from URL structure
- **PDF CDN**: Books hosted at `docs.bsimr.com` (Amazon S3/CloudFront), freely downloadable
- **Education system mapping**:
  - `fondamentals/` (1ere-6eme) → Elementary (ends with concours)
  - `secondaire1/` (1ere-3eme) → Secondary/College (ends with brevet)
  - `secondaire2/` (4eme-7eme) → High School/Lycee (7eme = BAC year, specializations: C/D/A/O/TM)

### Database (PostgreSQL + pgvector)

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema location**: `shared/schema.ts` and `shared/models/auth.ts`
- **Migrations**: Drizzle Kit with `drizzle-kit push` for schema sync
- **Vector extension**: pgvector with 1536-dimension vectors (matching OpenAI text-embedding-3-small output)

**Core Tables**:
- `users` — User accounts with role field (student/admin), integrated with Replit Auth
- `sessions` — Express session storage (required for Replit Auth)
- `pdf_files` — PDF metadata (title, subject, stream, year, storage key, checksum, status, page count, education_level, year_number, specialization, source_type, source_url, edition)
- `ingestion_jobs` — Job tracking with resumability (status: QUEUED/RUNNING/PAUSED/COMPLETED/FAILED, checkpoint fields: pages_done, chunks_done, next_page_to_process, next_chunk_index, heartbeat)
- `pdf_chunks` — Text chunks with vector embeddings, page references, and PDF file association

### AI / RAG Pipeline

- **Provider**: Google Gemini API via user-provided `GOOGLE_API_KEY` (never exposed to browser)
- **Embedding model**: `gemini-embedding-001` (3072 dimensions, configurable via env)
- **Chat model**: `gemini-2.0-flash` (configurable via env)
- **RAG flow**: Embed user question → pgvector similarity search for top-K chunks (with optional filtering by PDF/level/chapter) → Assemble context with citations → Chat completion with language-aware system prompt
- **Language support**: System prompt adapts to selected language (en/fr/ar) from the website's language toggle
- **Hierarchical filtering**: Chat supports cascading filters: Education Level → Textbook → Chapter (page range). Vector search is scoped to the selected filter level.
- **Fallback behavior**: When no matching context is found, the AI uses general curriculum knowledge (clearly indicated to the student)
- **Citations**: Responses include PDF name, page numbers, chunk IDs, and distance scores
- **AI client**: Centralized in `server/lib/ai/openai.ts` (uses @google/generative-ai SDK)

### PDF Ingestion System

- **Parser**: `unpdf` library for text extraction (`server/lib/ingestion/parser.ts`) - modern replacement for pdf-parse, supports per-page extraction from buffers
- **Chunker**: Sentence-boundary chunking with configurable max tokens (500) and overlap (50 tokens) (`server/lib/ingestion/chunker.ts`)
- **Runner**: In-process job runner with heartbeat, batch embedding (5 chunks at a time), checkpoint persistence (`server/lib/ingestion/runner.ts`)
- **Resumability**: Jobs checkpoint every batch; on restart, uses `SELECT ... FOR UPDATE SKIP LOCKED` to claim queued jobs; designed to move to external worker without schema changes
- **Stalled job detection**: Heartbeat-based with configurable timeout

### File Storage

- **Adapter pattern**: `StorageAdapter` interface (`server/lib/storage/adapter.ts`)
- **Local adapter**: Filesystem storage for development (`server/lib/storage/local.ts`)
- **S3 adapter**: Stub for production (not yet implemented) (`server/lib/storage/s3.ts`)
- **Configuration**: `STORAGE_TYPE` env var switches between `local` and `s3`

### Environment Validation

- **Zod schema** in `server/lib/env.ts` validates all required env vars at startup
- Required: `DATABASE_URL`, `GOOGLE_API_KEY`, `SESSION_SECRET`
- Optional with defaults: `GEMINI_EMBEDDING_MODEL`, `GEMINI_CHAT_MODEL`, `STORAGE_TYPE`, `STORAGE_PATH`

## External Dependencies

### Required Services
- **PostgreSQL** with **pgvector extension** — Primary database for all data including vector embeddings. Must have pgvector installed and enabled.
- **Google Gemini API** — Used for both text embeddings (gemini-embedding-001, 3072 dimensions) and chat completions (gemini-2.0-flash). API key stored as `GOOGLE_API_KEY` in Replit Secrets / environment variables. Server-side only.
- **Replit Auth (OIDC)** — Authentication provider using OpenID Connect. Handles user login/signup automatically. Requires `REPL_ID` and `ISSUER_URL` environment variables (set automatically by Replit).

### Required Environment Variables
| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `GOOGLE_API_KEY` | Yes | — | Google Gemini API key for embeddings and chat |
| `SESSION_SECRET` | Yes | — | Express session encryption secret |
| `GEMINI_EMBEDDING_MODEL` | No | `gemini-embedding-001` | Gemini embedding model name |
| `GEMINI_CHAT_MODEL` | No | `gemini-2.0-flash` | Gemini chat model name |
| `STORAGE_TYPE` | No | `local` | File storage backend (`local` or `s3`) |
| `STORAGE_PATH` | No | `./storage/uploads` | Local file storage directory |

### Key NPM Packages
- **Server**: express, drizzle-orm, pg, @google/generative-ai, pdf-parse, multer, passport, express-session, connect-pg-simple, zod
- **Client**: react, @tanstack/react-query, wouter, shadcn/ui (Radix primitives), tailwindcss, lucide-react
- **Build**: vite, esbuild, tsx, typescript