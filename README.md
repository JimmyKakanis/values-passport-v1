# Values Passport

## Overview

The **Values Passport** is a gamified positive behaviour support system for Sathya Sai College. It replaces traditional paper-based "values passports" with an engaging, interactive digital web application.

- **For Students:** A digital "Passport" that tracks signatures (stamps) for demonstrating core values (Truth, Love, Peace, Right Conduct, Non-Violence). It features real-time updates, achievement unlocking, leaderboards, and a learning lab.
- **For Teachers:** A powerful console to award stamps, manage nominations, view student progress, and access professional development resources regarding values education.
- **Security:** Integrated with Microsoft 365 Authentication and Firebase for secure, domain-locked access.
- **Admin:** Student directory with search, sort by grade or first name, multi-select, **archive** (soft-remove from lists and sign-in) vs **permanent delete**, and optional **Show archived** to restore.
- **Settings:** In-app **Settings** (`#/settings`) for email notification preferences, student avatar customization, and feedback—see `docs/architecture.md` and `docs/technical.md`.

## Features

### 📌 Student dashboard (2026)
- When the device date is in **2026** and a school integration theme applies, students may see a **This week at school** card aligned with the college’s printed values-integration calendar.

### 🌟 Real-Time Gamification
- **Instant Feedback:** Students receive a "New Stamp" notification the moment a teacher awards it, complete with the teacher's note and specific sub-value focus.
- **Achievements:** An automated system tracks progress and unlocks badges (e.g., "The Optimist", "Subject Explorer") when milestones are met.
- **Celebrations:** Full-screen celebratory animations and confetti when students unlock major achievements or earn rewards.
- **Welcome Back Summaries:** If a student is offline, the app summarizes what they earned while away upon their next login.

### 📚 Student Portal
- **My Passport:** A visual grid showing mastery levels across Academic Subjects and Locations & Events (including Camp, Excursions, Sports Carnivals). Click any cell to see the full history of stamps and teacher comments.
- **My Goals:** A goal-setting area where students can create and track Yearly, Subject-specific, and Personal Life goals.
- **Values Lab:** A learning hub with definitions, sub-values, and resources.
- **Leaderboard / School:** **Students** — **`#/leaderboard`** (**School highlights**), **`#/leaderboard/year-groups`** (**Year group standings**; podium + your-year stamp), **`#/leaderboard/quiz`** (**Quiz leaderboard**; pop-quiz high scores, search/year filters, your row highlighted). **Teachers/admins** — **`#/leaderboard`** is the **Wall of Fame** (includes **Quiz** as a sort mode; no separate quiz tab). Roster is refreshed from Firestore when the leaderboard loads. Optional **hide from leaderboard only** for test accounts (`excludeFromLeaderboard` or `LEADERBOARD_HIDDEN_STUDENT_EMAILS` in `constants.ts`). See `docs/technical.md` for details.

### 👨‍🏫 Teacher Console
- **Quick Awarding:** Award stamps to individual students or bulk groups in seconds.
- **Activity Feed:** View all recent stamps or filter to "My Activity" (stamps you awarded). Teacher avatars show initials (e.g., JK).
- **Nomination Review:** Approve or reject self/peer nominations from students.
- **Teacher Corner:** A dedicated professional development section with:
  - **Scenario Simulator:** Practise handling classroom situations.
  - **Value Deep Dives:** Resources and discussion prompts.
  - **Insights:** Track your own awarding habits, plus **Your week & milestones** (private prompts, impact summary, engagement badges, and optional **2026 whole-school values integration** theme when the date falls in a mapped term week).
- **Student Details:** View any student's full profile, passport, and achievement history. Archived students show an explanatory banner when opened by staff.

### Admin Console
- **Student directory:** Search, sort, bulk or single **Archive** / **Restore**, parent fields for weekly digests, reset progress, and permanent delete when required.
- **Teachers & subjects:** Authorize staff and maintain the subject list used on stamps.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/JimmyKakanis/values-passport-v1.git
    cd values-passport-v1
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Firebase:**
    - Create a file `firebaseConfig.ts` in the `src` folder (or root, depending on structure).
    - Paste your Firebase configuration keys.

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```

## Project Structure
- `components/`: React UI components (Dashboard, Passport, Console, Notifications, Settings, etc.)
- `services/`: Data handling and Firebase integration (`dataService.ts`), **`emailNotificationService.ts`** (preferences + achievement email queue), plus **`teacherEngagement.ts`** (teacher-only metrics, copy, and badges).
- `functions/`: **Firebase Cloud Functions** (weekly digests, achievement email worker, Microsoft Graph). Built separately from the SPA; excluded from root `tsc`—see `docs/technical.md`.
- `schoolCalendar.ts`: Shared term dates and helpers (planner week index vs **integration** week index for the 2026 calendar).
- `valuesIntegrationCalendar2026.ts`: Whole-school integration themes by term week (2026).
- `data/`: Static content resources.
- `docs/`: Comprehensive documentation.

## Build & deploy (quick)
- **Frontend (Vercel / static host):** `npm install` then `npm run build` → `dist/`.
- **Functions:** `cd functions && npm install && npm run build`; deploy with Firebase CLI as needed.

## Technologies
- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Firebase (Auth, Firestore), optional **Cloud Functions** + Microsoft Graph for mail
- **Libraries:** Framer Motion (Animations), React Confetti, Lucide React (Icons)

## License
[License Name]
