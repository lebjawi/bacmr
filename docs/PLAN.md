# BACMR — Product Blueprint & Engineering Plan

## 1. Product Vision Summary
**BACMR** (Baccalauréat Mauritanien) is a digital learning companion designed to democratize access to quality BAC preparation in Mauritania. It bridges the gap between the official curriculum and student understanding by providing personalized, culturally aware, and emotionally supportive explanations.

**The Core Problem:** Students fail not because they are incapable, but because the system is rigid. Explanations are "one-size-fits-all," anxiety is high, and quality tutoring is expensive/inaccessible.

**The Solution:** An AI-assisted study platform that explains (doesn't just solve), reassures, and adapts to the student's pace. It is strictly aligned with the Mauritanian IPN curriculum.

**North Star:** Reduce anxiety, build deep understanding, and improve national success rates.

---

## 2. User Personas

### 1. The Student (Primary)
*   **Profile:** 17-19 years old, anxious, under high family pressure.
*   **Tech:** Uses a mid-to-low range Android phone. Data is precious.
*   **Behavior:** Relies on scattered WhatsApp groups/YouTube. Fears "missing out" on the "real" curriculum.
*   **Needs:** "Explain it simply," "Am I on the right track?", "Is this official?"

### 2. The Parent (Secondary - Customer)
*   **Profile:** Worried about child's future. Values education as social mobility.
*   **Needs:** Trustworthiness, visible progress, curriculum alignment.

### 3. The Content Admin (Internal)
*   **Needs:** Ability to structure the curriculum (Streams -> Subjects -> Lessons) and upload past exams.

---

## 3. MVP Scope (Phase 1)

**IN (The "Steel Thread"):**
*   **Curriculum Structure:** Browsable tree: *Stream (Series C/D/A/O) -> Subject -> Chapter -> Lesson*.
*   **The "Lesson" Experience:** A clean, readable interface for text/diagrams with an "Explain this to me" interaction.
*   **Exam Archive:** Library of past BAC papers organized by Year and Session.
*   **Basic Onboarding:** Select Stream & Session Year to personalize the dashboard.
*   **Daily Plan:** A simple dashboard widget suggesting what to study today.
*   **AI Tutor Interface (Mocked):** A chat interface scoped to the current lesson context.

**OUT (Post-MVP):**
*   Teacher/Parent specific portals.
*   Actual Payment Processing (Premium UI will exist, but no checkout).
*   Community/Social features (Forums, comments).
*   Native Mobile App (PWA only for now).
*   Voice Mode.

---

## 4. Screen-Based Route Map
*The navigation structure IS the plan.*

### Public Zone
| Route | Screen Name | Purpose |
| :--- | :--- | :--- |
| `/` | **Landing Page** | Trust signals, value prop, "Start Free" CTA. |
| `/auth/login` | **Login** | Simple phone/email entry. |
| `/auth/signup` | **Onboarding** | Registration + **Critical Step:** Select Stream (C, D, A, O). |

### Student Zone (The App)
| Route | Screen Name | Purpose |
| :--- | :--- | :--- |
| `/app` | **Dashboard** | "Hello [Name]". Daily Focus (2 suggested lessons). Recent activity. |
| `/app/subjects` | **Subject Hub** | Grid of subjects (Maths, Physique, Arabic, FR, etc.). |
| `/app/subjects/:id`| **Subject Detail** | List of Modules/Chapters. Progress bars per chapter. |
| `/app/lesson/:id` | **Study Room** | **Core Feature.** Split screen: Content (Read) + AI Companion (Ask). |
| `/app/exams` | **Exam Hall** | Archive of past papers filtered by Year/Session. |
| `/app/exams/:id` | **Exam Taker** | View PDF/Text question. Toggle "Show Solution". |
| `/app/profile` | **Profile** | Settings, Stream change, Progress stats. |

---

## 5. Design Principles
1.  **Calm & Academic:** Avoid "gamified" chaos. Use a palette of Deep Teal, Paper White, and Warm Sand. The vibe is a quiet library, not a casino.
2.  **Trustworthy Typography:** Use strong Serifs for headings (Authority) and clean Sans-Serifs for reading (Clarity).
3.  **Mobile-First:** 80% of users are on mobile. Touch targets must be large. Navigation should be bottom-based or easily accessible.
4.  **Cultural Resonance:** Interface must support RTL (Arabic) naturally (even if MVP is English/French interface, the structure must allow it).

## 6. Build Sequence
1.  **Skeleton:** Implement the Router and empty placeholder screens for the Route Map.
2.  **Mock Data:** Create a `data.ts` file with realistic IPN-aligned curriculum structure (e.g., Series C Math syllabus).
3.  **UI Shell:** Build the Navigation (Sidebar/Bottom Bar) and Layout.
4.  **Core Screens:** Build Dashboard -> Subject List -> Lesson View.
5.  **Interaction:** Implement the "AI Tutor" chat UI (visuals only).
