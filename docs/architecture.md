# Application Architecture

## Overview
The Values Passport application is a Single Page Application (SPA) built with React and TypeScript. It utilizes Firebase for backend services (Authentication and Firestore Database). The architecture emphasizes modular component design, real-time data synchronization, and a clean separation of concerns between UI, data logic, and state management.

## Component Structure

The application's UI is built from a set of modular React components located in the `components/` directory.

### Core Layout & Routing
- **`App.tsx`**: The root component that handles routing, authentication state, and the main layout.
- **`Layout` (within `App.tsx`)**: A wrapper component that provides the consistent navigation bar and footer across the application.
- **`Login.tsx`**: The sign-in page, which handles user authentication against Firebase Auth.

### Student Views
- **`Dashboard.tsx`**: The main view for students, showing their progress and passport.
- **`StudentPassport.tsx`**: The core grid view of the values and subjects. It now subscribes to real-time updates, allowing students to see stamps appear instantly. It also supports interactive stamp history viewing via `StampHistoryModal`.
- **`Achievements.tsx`**: Shows a student's earned achievements and progress bars.
- **`Leaderboard.tsx`**: Nested routes under `/leaderboard/*` — **Students** (`StudentLeaderboard.tsx`) for individual rankings (filters + stamps/badges/quiz scores), **Year groups** (`YearGroupStandings.tsx`) for **overall mean stamps per year** only; shared chrome in **`leaderboard/LeaderboardLayout.tsx`** (centered **Students** / **Year groups** tabs). Shared filter UI pieces in **`leaderboard/LeaderboardShared.tsx`**.
- **`ValuesLearning.tsx`**: The "Values Lab" section containing educational resources for students.
- **`StudentPlanner.tsx`**: A comprehensive calendar and task management tool. It features Term, Month, and Week views, allowing students to track homework and assignments aligned with the school term.

### Teacher Views
- **`TeacherConsole.tsx`**: The main interface for teachers to award signatures and review nominations.
- **`TeacherRewards.tsx`**: A dashboard for teachers to view and manage unclaimed rewards.
- **`StudentDetailView.tsx`**: Tabbed Achievements and Passport for a student opened from the leaderboard or console (admins use the same route). If the student is **archived**, a banner explains limited access and sign-in restriction until an admin restores them.
- **`TeacherCorner/`**: A directory containing components for the "Values Development" section:
    - **`TeacherCorner.tsx`**: The main container for the Values Development page.
    - **`ValueDeepDive.tsx`**: Detailed resources and prompts for each value.
    - **`ScenarioSimulator.tsx`**: Interactive classroom scenarios for teacher training.
    - **`TeacherInsights.tsx`**: A personal dashboard for teachers to track their awarding habits. Embeds **`TeacherEngagementPanel`**, which shows optional **2026 school values integration** copy (from `valuesIntegrationCalendar2026.ts` + `schoolCalendar.ts`), daily/weekly-style nudges, merged “this week” stats, collapsible reflection, and engagement badges (logic in `services/teacherEngagement.ts`).

### School calendar & integration data (shared modules)
- **`schoolCalendar.ts`**: `SCHOOL_TERMS` and date helpers. **`getTermAndWeekInTerm`** drives planner-style “week in term” behaviour; **`getTermAndIntegrationWeekInTerm`** (with **`getValuesIntegrationWeekAnchor`**) aligns **Term 1** with the printed integration grid (Monday one week before official start week).
- **`valuesIntegrationCalendar2026.ts`**: Segment table and **`getValuesIntegrationFocus(date)`** for teacher copy and the student dashboard strip when the date maps to a segment.

### Admin Views
- **`AdminConsole.tsx`**: A protected dashboard for Super Admins.
    - **Student directory**: Search by name or email; **sort** by **grade** (numeric from grade text, e.g. Year 7 → 7) or **first name** (first token of full name), with the other field as tie-breaker. **Row checkboxes** and a header **select all** (visible rows only) support **bulk Archive** and **bulk Restore**. **Show archived** toggles visibility of soft-archived students (muted rows and an **Archived** badge). Per-row actions: **Edit**, **Archive** or **Restore**, **Reset progress**, and **Delete permanently** (Firestore document removed; distinct from archive).
    - **Teacher Management**: Add/Remove authorized staff; **role** per row (`TEACHER` | `ADMIN`) via [`updateTeacher`](../services/dataService.ts) (Firestore `teachers` collection).
    - **System Settings**: Manage dynamic configuration like the active Subjects list.
    - **Other tabs**: **Analytics** ([`SchoolAnalytics.tsx`](../components/SchoolAnalytics.tsx)), **Data Migration** (seed, progress reset, legacy teacher name fix), and **Feedback** (submissions list).

### Settings (all roles)
- **`SettingsPage.tsx`**: Routed at `#/settings` (gear in the header). Sections differ by role; includes **email notification preferences** ([`EmailNotificationsSettings.tsx`](../components/EmailNotificationsSettings.tsx)), student **avatar** customization ([`AvatarSettingsSection.tsx`](../components/AvatarSettingsSection.tsx)), and **feedback** entry ([`FeedbackSettingsSection.tsx`](../components/FeedbackSettingsSection.tsx)) where applicable.

### Notification System
- **`NotificationSystem.tsx`**: Contains the complete logic for the notification experience.
    - **`NotificationProvider`**: A Context Provider that manages the state of active toasts and the modal queue. It exposes `addNotification`.
    - **`NotificationController`**: A "headless" logic component that bridges the Data Service and the Notification System. It subscribes to Firestore streams, calculates changes (diffs), and triggers notifications for new stamps, achievements, or rewards.
    - **`Toast`**: A lightweight, auto-dismissible notification component for stamps (built with `framer-motion`).
    - **`AchievementModal`**: A full-screen celebration modal with confetti for major milestones (Achievements/Rewards).

### Email notifications (Microsoft Graph + Cloud Functions)
- **Outbound email** is never sent from the browser. **Firebase Cloud Functions** (see [`functions/`](../functions/)) use the **Microsoft Graph** `sendMail` API with an Entra ID **app-only** token (`Mail.Send` application permission). Secrets and parameters are described in [`docs/technical.md`](technical.md).
- **Achievement unlocks**: When [`NotificationController`](../components/NotificationSystem.tsx) detects a newly unlocked achievement, it enqueues a row in Firestore `achievement_email_queue`. A function on that collection sends one transactional email if the student has opted in via `email_preferences/{emailLower}` (`achievementEmailEnabled: true`). Idempotency is stored in `achievement_email_sent`.
- **Weekly digests**: Each new row in `signatures` appends a summary row to `digest_stamp_events` (written only by the backend). A **scheduled function** (Friday 17:00 Australia/Sydney) sends student, teacher, and parent digests according to preferences and student parent fields, then clears processed stamp events. Deduping uses `digest_sent`.
- **In-app settings**: Students and staff open **Settings** (gear in the header, `#/settings`) which includes [`EmailNotificationsSettings`](../components/EmailNotificationsSettings.tsx). Admins manage parent contact fields and consent in **Admin Console → Students**.

## Data Flow & State Management

### 1. Service Layer (`services/dataService.ts` and `services/teacherEngagement.ts`)
Firestore access is encapsulated in `dataService.ts`. This service provides:
- **Fetch Functions**: `getDocs` wrappers for one-time data retrieval (e.g., `getStudents`, `getAllStudents`, `getAllSignatures`). **`getStudents()`** (and **`getStudentByEmail()`** for login) **omit archived students** so they do not appear in teacher pickers or the leaderboard cache. **`getStudent(id)`** still resolves archived records so deep links and admin views can show the profile with context. **`archiveStudents` / `unarchiveStudents`** update `archived` and `archivedAt` on student documents.
- **Subscription Functions**: `onSnapshot` wrappers for real-time data streams (e.g., `subscribeToSignatures`, `subscribeToPlannerItems`).
- **Mutation Functions**: Functions to write to the database (e.g., `addSignature`, `addPlannerItem`).
- **Business Logic**: Calculations for stats, mastery levels, and achievement unlocking are performed here to ensure consistency across the app.
- **`teacherEngagement.ts`**: Teacher-only engagement metrics, badge rules, and copy helpers. It operates on **`Signature[]` in memory** (no Firestore calls); **`TeacherInsights`** fetches signatures and passes the filtered list into **`TeacherEngagementPanel`**.

### 2. Real-Time Updates
The application leverages Firestore's real-time capabilities for key features:
- **Student Passport**: Subscribes to the signatures collection. When a teacher awards a stamp, the student's grid updates immediately without a refresh.
- **Notifications**: The `NotificationController` listens to the same streams. When it detects a new item that wasn't there before (comparing IDs against a `useRef` cache), it triggers a notification.
- **Student Planner**: Tasks added to the planner are immediately synced across devices.

### 3. "Welcome Back" Logic
To handle offline activity:
- The `Student` profile in Firestore tracks a `lastLoginAt` timestamp.
- On app load, `NotificationController` fetches this timestamp.
- It compares the timestamp of incoming signatures against `lastLoginAt`.
- If signatures exist that are newer than the last login, it aggregates them into a single "Welcome Back" summary notification instead of overwhelming the user with individual alerts.
- Finally, it updates `lastLoginAt` to the current time, switching the system to "Real-time Mode" for the rest of the session.

## Security & Access Control

- **Domain Restriction**: Access is restricted to emails ending in the school's domain (configured in `constants.ts`).
- **Role-Based Access**:
    - **Student**: Identified if their email matches a **non-archived** row in the `students` collection (or **auto-provisioned** on first login if they are not a teacher/admin and no student row exists yet—see [`App.tsx`](../App.tsx)). Access to Passport, Learning, Achievements, Planner.
    - **Archived student**: If the email matches a student document with **`archived: true`**, the app shows an **account archived** screen (no student routes); this prevents duplicate auto-provision for the same email.
    - **Teacher**: Identified if their email exists in the `teachers` Firestore collection (with role `TEACHER`). Access to Teacher Console, Values Development, Student Details.
    - **Admin**: Hardcoded bootstrap email and/or `teachers` collection with role `ADMIN`. Full access to Teacher Console plus **Admin Console**.
- **Teachers** are added through **Admin Console → Teachers**, not auto-created on first login.

## Build layout (SPA vs Cloud Functions)
- The Vite app is type-checked from the **root** [`tsconfig.json`](../tsconfig.json), which **`exclude`s the `functions/` directory**. Firebase Cloud Functions live in **`functions/`** with their own `package.json` and [`functions/tsconfig.json`](../functions/tsconfig.json); build them with `npm run build` inside `functions/` (or your Firebase deploy pipeline). This keeps `npm run build` at the repo root (e.g. **Vercel**: `tsc && vite build`) from requiring `firebase-admin` / `firebase-functions` at the app root.
