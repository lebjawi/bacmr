# BACMR — Baccalauréat Mauritanien

## Overview
BACMR is an AI-assisted learning companion for Mauritanian high school students preparing for the Baccalaureate (BAC). It provides curriculum-aligned lessons, exam archives, and an AI tutor interface.

## Current State
- Full-stack application with real database
- Authentication (register/login with sessions)
- Curriculum browsing (Streams → Subjects → Chapters → Lessons)
- Exam archive
- Progress tracking
- Admin dashboard for content management
- AI tutor chat interface (UI only, no AI integration yet)

## Architecture
- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui + wouter (routing) + TanStack Query
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Session-based with scrypt password hashing

## Key Files
- `shared/schema.ts` — Data models (Drizzle schema)
- `server/routes.ts` — All API routes (auth, content, admin CRUD)
- `server/storage.ts` — Database operations (IStorage interface)
- `server/db.ts` — Database connection
- `server/seed.ts` — Initial data seeding
- `client/src/App.tsx` — Frontend router
- `client/src/lib/api.ts` — API client functions
- `client/src/components/layout.tsx` — Student app layout
- `client/src/components/admin-layout.tsx` — Admin layout

## Routes
### Public
- `/` — Landing page
- `/auth/login` — Login
- `/auth/signup` — Registration with stream selection

### Student App
- `/app` — Dashboard
- `/app/subjects` — Subject grid
- `/app/subjects/:id` — Subject chapters/lessons
- `/app/lesson/:id` — Lesson study view with AI chat
- `/app/exams` — Exam archive
- `/app/profile` — User profile

### Admin (role-protected)
- `/admin` — Admin dashboard
- `/admin/subjects` — Manage subjects
- `/admin/lessons` — Manage lessons
- `/admin/exams` — Manage exams

### API
- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current user
- `GET /api/streams` — List streams
- `GET /api/subjects` — List subjects
- `GET /api/subjects/:id/chapters` — Chapters for subject
- `GET /api/chapters/:id/lessons` — Lessons for chapter
- `GET /api/lessons/:id` — Single lesson
- `GET /api/exams` — List exams
- `GET/POST /api/progress` — Progress tracking
- Admin CRUD: `/api/admin/subjects|chapters|lessons|exams`

## Demo Accounts
- Admin: `admin@bacmr.mr` / `admin123`

## Design
- Palette: Deep Teal (primary), Paper White (background), Warm Sand (secondary)
- Typography: Libre Baskerville (headings) + Inter (body)
- Mobile-first, calm & academic aesthetic

## User Preferences
- Mauritanian cultural context (Arabic/French support planned)
- No gamification overload
- Focus on clarity and reducing anxiety
