# Technical Specifications

## Technology Stack
- **Frontend**: React (v18) with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Backend / Database**: Firebase (Auth & Firestore)
- **Routing**: React Router DOM (HashRouter)
- **Animations**: Framer Motion
- **Visual Effects**: React Confetti
- **Icons**: Lucide React
- **Date Handling**: date-fns (v3)

## Data Models

### 1. Core Types (`types.ts`)
- **`Student`**: Basic profile info + `lastLoginAt` (timestamp). Optional **parent / guardian** fields: `parentEmail`, `parentName`, `parentDigestEnabled`, `parentConsentRecordedAt` (used by weekly parent digests when consent is recorded in Admin Console). Optional **`archived`** (boolean) and **`archivedAt`** (Unix ms): when `archived` is true, the account is **soft-retired**—hidden from `getStudents()` / teacher pickers / leaderboard inputs, excluded from student login resolution, and blocked from auto-provisioning a second record for the same email (see **Archived students** below). New students created via `addStudent` persist `archived: false`.
- **`EmailNotificationPreferences`**: Shape stored at `email_preferences/{authEmailLower}` (`role`, digest toggles, `achievementEmailEnabled`, `frequency`).
- **`Signature`**: Represents a "Stamp". Contains `studentId`, `teacherName`, `subject`, `value`, `subValue` (optional), `note` (optional), `timestamp`, and optional `source` (`DIRECT` | `NOMINATION`) for stamps created from nomination approval.
- **`Achievement`**: Defines milestones. Types include `TOTAL`, `VALUE`, `SUBJECT_MASTERY`, `FULL_PASSPORT`, and `CUSTOM`.
- **`Nomination`**: A request for a stamp (Self or Peer). Has a status of `PENDING`, `APPROVED`, or `REJECTED`.
- **`PlannerItem`**: Represents a task or event in the student planner. Contains `studentId`, `title`, `dueDate` (timestamp), `category` (TASK, HOMEWORK, ASSIGNMENT), and `isCompleted`.

### 2. Constants for Core Data
Static, foundational data such as the list of subjects, core values, and achievement definitions live in `constants.ts`. **School term calendar** (`SCHOOL_TERMS`) is shared from [`schoolCalendar.ts`](../schoolCalendar.ts) for the student planner and teacher engagement logic.

## Feature Implementations

### Notification System
The notification system is designed to be unobtrusive yet celebratory.
- **Architecture**: It uses a **Context API** (`NotificationProvider`) to manage the global state of notifications. This allows any component in the app to trigger a notification via `useNotification()`.
- **Controller Pattern**: The `NotificationController` component handles the business logic. It sits at the top level (inside `App.tsx`) and manages Firestore subscriptions.
    - **Diffing**: It maintains `useRef` caches of the previous data state. When new data arrives from Firestore, it calculates the difference (A - B) to identify *new* items.
    - **Debouncing**: Small timeouts are used to stagger notifications if multiple stamps arrive simultaneously (e.g., from a bulk award action).
- **Offline Handling**: On initialization, it compares `signature.timestamp` > `student.lastLoginAt` to determine if a "Welcome Back" summary is needed.
- **Email (achievements)**: The same diff that drives achievement toasts enqueues [`achievement_email_queue`](../services/emailNotificationService.ts) with `serverTimestamp()`. Custom rewards for the student’s grade are loaded so unlock detection matches the Achievements page.

### Email notifications (Firestore + Functions)
- **Client**: [`services/emailNotificationService.ts`](../services/emailNotificationService.ts) — subscribe/save `email_preferences`, enqueue achievement emails.
- **Server**: [`functions/src/index.ts`](../functions/src/index.ts) — `onAchievementEmailQueued`, `onSignatureRecordDigestEvent`, `sendWeeklyDigestEmails` (schedule). Mail is sent as **HTML** via **Microsoft Graph** [`sendMail`](https://learn.microsoft.com/en-us/graph/api/user-sendmail) from [`functions/src/graphMail.ts`](../functions/src/graphMail.ts).
- **Azure / Microsoft 365 setup** (one-time, with IT):
  1. In **Entra ID** (Azure Portal), register an **app** (single-tenant is typical for a school).
  2. Add an **application** permission: **Microsoft Graph → Mail.Send** (not delegated). **Grant admin consent** for the tenant.
  3. Create a **client secret** (Certificates & secrets) and store it in Firebase:  
     `firebase functions:secrets:set MICROSOFT_GRAPH_CLIENT_SECRET`
  4. Configure function **parameters** (Firebase/Google Cloud Console for each function, or first-deploy prompts):  
     - `MICROSOFT_GRAPH_TENANT_ID` — Directory (tenant) ID  
     - `MICROSOFT_GRAPH_CLIENT_ID` — Application (client) ID  
     - `MICROSOFT_GRAPH_SENDER_UPN` — Mailbox that will send mail (user UPN or shared mailbox UPN, e.g. `noreply@sathyasai.nsw.edu.au`). The mailbox must exist in the tenant; app-only send uses this account as the sender.
  5. Set `APP_PUBLIC_URL` to your live SPA base URL (for links in emails).
- **Local / emulator**: See [`functions/.env.example`](../functions/.env.example) (do not commit real secrets).
- **Deploy**: From the repo root, `firebase deploy --only functions,firestore:rules` after `npm --prefix functions run build`.
- **Rules**: [`firestore.rules`](../firestore.rules) — users may only create their own `achievement_email_queue` rows (studentId must match `students/{id}.email`); server-only collections are denied to clients.

### Authentication & roles
- **Provider**: Microsoft 365 (via Firebase Authentication).
- **Security**: 
    - API Keys are stored in `import.meta.env` (Vite Environment Variables).
    - Hardcoded secrets have been removed from the codebase.
    - Fallback mechanism handles browser "Popup Blocked" scenarios gracefully.
- **Domain Locking**: Only emails ending in `@sathyasai.nsw.edu.au` are permitted.
- **Role resolution** ([`App.tsx`](../App.tsx)): After `initializeData()` loads the student/teacher caches, order is: **super-admin bootstrap email** → **match in `teachers`** → otherwise treat as **student path**. **Teachers and admins** are added via **Admin Console → Teachers** (`addTeacher`); **`updateTeacher`** updates fields such as **`role`** (`TEACHER` | `ADMIN`) from the Teachers tab dropdown. First login does **not** auto-create a teacher document. Seeding uses each row’s **`role`** from [`constants.ts`](../constants.ts) `TEACHERS` (no longer overridden to TEACHER except where the constant says so).
- **Student login**: `getStudentByEmail` returns a record only if it exists and **`archived` is not true**. If no match, the app **auto-provisions** a new `students` document (default grade, avatar) so unknown school emails can still use the student app unless blocked below.
- **Archived students**: `isArchivedStudentEmail` detects a matching student document with `archived: true`. Those users see an **Account archived** full-screen message and cannot open student routes; this avoids treating them as “new” and creating a duplicate student row.
- **No In-App Password Change**: With Microsoft 365 login, credential management is handled by the identity provider. The Change Password UI has been removed.

### Archived students (data service)
- **`archiveStudents(ids)` / `unarchiveStudents(ids)`** ([`dataService.ts`](../services/dataService.ts)): Update Firestore and the in-memory `cachedStudents` list.
- **`getStudents()`**: Filters out `archived` (and legacy `grade` starting with `Graduated`) so **Teacher Console** pickers and any code using this helper only see active students.
- **`getStudentByEmail()`**: Returns `undefined` for archived rows (login + student resolution).
- **`getStudent(id)`**: Still returns the document if present (including archived) for **Student Detail** views and diagnostics.
- **`getAllStudents()`**: Used by **Admin Console**; returns every student document so admins can toggle **Show archived** and run bulk restore.

### Real-Time Passport
- **Subscriptions**: The `StudentPassport` component uses `onSnapshot` from Firestore. This opens a WebSocket connection that pushes changes immediately.
- **Optimistic UI**: While not strictly "optimistic" (since we wait for the server push), the latency is low enough (~100ms) that it feels instant.
- **Stamp History**: Clicking a cell opens a modal that filters the local signatures state by `subject` and `value`. This avoids an additional network request.

### Leaderboard
- **Rank Display**: Ranks shown in the table reflect position within the current filtered view (e.g., 1–24 for "Year 8 Truth"), not overall position across all students.
- **Podium + List**: Top 3 displayed on podium; list below continues from rank 4.
- **Visibility**: Teachers see full rankings; students see top 20 for overall all-grades, top 10 for grade/value-specific views.
- **Archived students**: Entries are built from **`getStudents()`**, which omits archived profiles (`archived === true` in Firestore), so archived students do not appear on the leaderboard. **`fetchLeaderboardData`** calls **`reloadStudentsCacheFromFirestore`** first so the roster matches Firestore even if another admin archived or deleted users since login (in-memory cache was previously easy to leave stale). **`initializeData`** always reloads students from Firestore on auth (no longer keeps mock data when the server returns an empty list). Admin **Students** tab load uses the same reload so the console list and app cache stay aligned.
- **Hidden from Wall of Fame only**: Students with **`excludeFromLeaderboard: true`** in Firestore, or whose email is listed in **`LEADERBOARD_HIDDEN_STUDENT_EMAILS`** in [`constants.ts`](../constants.ts), are skipped in **`fetchLeaderboardData`** (student tab + year-group tab). They remain in teacher pickers and the rest of the app.
- **Year group standings**: Tab at **`#/leaderboard/year-groups`**. **Overall passport stamps only**: mean stamps per enrolled student per year (`getStudents()`). Tie-break: year level order. Top three year groups use the same **podium layout** as the student Wall of Fame; ranks 4+ appear in a table below when applicable. Implemented by [`buildYearGroupLeaderboard`](../services/dataService.ts) and [`YearGroupStandings.tsx`](../components/leaderboard/YearGroupStandings.tsx). The **Students** tab keeps value / badges / quiz filters; leaderboard list labels use **stamps** (not “pts”) for non-badge views.

### Teacher Activity Feed
- **All Activity / My Activity**: Toggle to view all stamps or only stamps awarded by the logged-in teacher. Filtering uses `teacherName` match.
- **Teacher Initials**: Avatar circles show first + last initial (e.g., "JK" for James Kakanis). Honorifics (Mr, Mrs, Ms, Miss, Dr, Prof, Sir, Dame) are excluded.

### Teacher engagement (console)
- **Purpose**: Private, low-pressure prompts, weekly theme copy, impact summaries, and milestone badges for the logged-in teacher. There is no teacher-vs-teacher leaderboard.
- **Data**: Metrics are **derived client-side** from all signatures matching the teacher's `teacherName`, plus legacy rows where `teacherName === "Current Teacher"` (same merge as Teacher Corner insights). Uses `getAllSignatures()` when the Teacher Console loads or after awarding / approving a nomination.
- **Time zones**: Week boundaries use the **browser's local calendar** (Monday-start week via date-fns). NSW staff devices are typically aligned with the school week.
- **Term**: "First stamp this term" uses [`schoolCalendar.ts`](../schoolCalendar.ts) term ranges; stamp timestamps use an inclusive end-of-day on the term's end date.
- **Fortnight**: Rolling **14 calendar days** ending at the end of "today" for the "10 different students" reach badge.
- **Impact snippet**: Last **7 calendar days** (inclusive): unique students stamped; "first stamp from you" counts students whose **earliest** signature from this teacher falls in that window (counted once per student).
- **Bulk awards**: A bulk batch is inferred when two or more signatures share the same teacher, subject, value, optional sub-value, note, and timestamps within **2 minutes** (aligned with activity feed grouping).
- **Nomination milestone**: Prefer `source === 'NOMINATION'`; older rows use note prefixes `Self-Advocacy` or `Nominated by`.
- **Streaks**: "Steady rhythm" = at least **three Mon–Fri school days** in the current week with at least one stamp. "Fresh lens" = on **each** day you stamped this week, at least one core value appears that was not used on any **earlier** stamped day that week (requires two or more stamped days).
- **Comeback copy**: If the last stamp was **7+ days** ago, a **cosmetic** message says the next stamp counts double toward a personal engagement goal; student points are unchanged.
- **Badge celebrations**: Newly earned badges trigger short confetti once per badge per browser (localStorage under `vp_teacher_badge_toasts_v1`); first load marks existing badges as already seen (`vp_teacher_engagement_init_v1:` + teacher key) so teachers are not spammed on first visit.
- **UI**: [`TeacherEngagementPanel.tsx`](../components/TeacherEngagementPanel.tsx) is embedded in **Values Development → My Insights** ([`TeacherInsights.tsx`](../components/TeacherCorner/TeacherInsights.tsx)). [`TeacherInsights`](../components/TeacherCorner/TeacherInsights.tsx) loads [`getAllSignatures()`](../services/dataService.ts) once on mount, filters to the logged-in teacher (including legacy `Current Teacher` rows), and passes that array into the panel—same filter as the charts below. Logic lives in [`services/teacherEngagement.ts`](../services/teacherEngagement.ts). Optional empty-state prompt strings remain available as `pickAwardEmptyPrompt` / `AWARD_EMPTY_PROMPTS` if reused elsewhere.
- **Milestone strip (copy layout)**: When a **2026 integration** focus exists, the indigo **School values integration** header already shows theme, quote, and events. Inside **Your week & milestones**, the duplicate **weekly** line is omitted; [`pickDailyNudge(teacherKey, now, { compactSchoolFocus: true })`](../services/teacherEngagement.ts) uses short action-only tips so **Today** does not repeat the core/sub value names. **This week** merges 7-day unique-student reach (and optional first-stamp-from-you count) with Mon–Fri active school-day count in one paragraph, plus a single rhythm line (goal: 3+ weekdays).
- **2026 school integration themes**: When the device date is in **2026** and falls in a mapped term week, prompts use the whole-school calendar in [`valuesIntegrationCalendar2026.ts`](../valuesIntegrationCalendar2026.ts) (see below). Otherwise weekly/daily copy falls back to the generic templates.

### Values integration calendar (2026)
- **Data**: [`valuesIntegrationCalendar2026.ts`](../valuesIntegrationCalendar2026.ts) lists segments per `termId` (matching [`SCHOOL_TERMS`](../schoolCalendar.ts)) and inclusive **week-within-term** bounds. Each segment has `coreValue` ([`CoreValue`](../types.ts)), a **display-only** `subValueLabel`, `quote`, and optional `events` (e.g. public holidays or school events).
- **Week index (integration only)**: [`getTermAndIntegrationWeekInTerm(date)`](../schoolCalendar.ts) uses Monday-start weeks from [`getValuesIntegrationWeekAnchor(term)`](../schoolCalendar.ts). **Term 1** uses the Monday **one week before** the official term start week so printed labels (e.g. "Week 9" = Non-Violence in late March) line up; Terms 2–4 use the Monday of the official start week. Badges and planner-style logic still use [`getTermAndWeekInTerm`](../schoolCalendar.ts) from `term.start`.
- **Lookup**: `getValuesIntegrationFocus(date)` returns `null` outside 2026, in holidays between terms, or if `weekInTerm` is not covered by any segment (verify segment ranges against the printed calendar after the first term).
- **Teachers**: Indigo **School values integration** block at the top of [`TeacherEngagementPanel.tsx`](../components/TeacherEngagementPanel.tsx). [`getWeeklyThemeLine`](../services/teacherEngagement.ts) and [`pickDailyNudge`](../services/teacherEngagement.ts) prefer this focus when non-null; the panel suppresses the extra weekly sentence in the green section when the indigo block is shown (see **Milestone strip** above).
- **Students**: [`Dashboard.tsx`](../components/Dashboard.tsx) shows a **This week at school** card when focus exists.
- **Stamps**: Sub-value labels on the calendar are **not** auto-applied to the award form; align dropdown sub-values in `constants.ts` separately if you want exact matches.

### Passport Subjects & Locations
- **Locations and Events**: Homeroom, Playground, Sport, Excursions, Assembly, Sports Carnivals, **Camp**.
- **Academic Subjects**: Maths, English, Science, etc. Defined in `constants.ts` (`SUBJECTS`). `StudentPassport` splits these via `LOCATION_SUBJECTS` vs `ACADEMIC_SUBJECTS`.

### Statistics & Achievements
- **Client-Side Calculation**: Given the dataset size (~150 students, ~1000s of signatures), statistics and achievement progress are calculated client-side in `dataService.ts`.
- **Efficiency**: Calculations are memoized or run only on data updates to prevent performance bottlenecks.

### Student Planner & Goals
- **View Logic**: Supported views include `Term`, `Month`, and `Week`.
- **Goals Integration**: Students can switch between `Calendar` and `My Goals` modes.
    - **Goal Types**: `YEARLY`, `SUBJECT`, and `LIFE` goals.
    - **Persistence**: Goals are stored in the `goals` collection in Firestore, linked by `studentId`.
- **Term Navigation**: The planner defaults to the current term based on `SCHOOL_TERMS` from [`schoolCalendar.ts`](../schoolCalendar.ts).
- **Data Fetching**: Real-time subscription to `planner` and `goals` collections in Firestore.
- **UI Architecture**: Uses a Flexbox layout with a fixed sidebar for navigation and a main content area that expands to fit the screen height.

### School Analytics (Admin)
- **Aggregated Stats**: Calculates school-wide metrics (total stamps, participation rate, value distribution) by fetching all signatures.
- **Visualizations**: Uses `recharts` for data visualization (Bar charts for values, Line charts for trends).
- **Performance**: Fetches all data on load. For larger datasets (>5000 signatures), this should be migrated to server-side aggregation or Firebase Extensions (e.g., "Aggregate Counters").

## Security Rules (Firestore)
*Current Implementation assumes a trusted environment or prototype phase. For production:*
- **Read**: Students can read their own data; Teachers can read all data.
- **Write**: 
    - Teachers can write to `signatures`, `nominations`, and `claimed_rewards`.
    - Students can write to their own `planner` items and `goals`.
- **Validation**: Cloud Functions or Security Rules should validate that `subject` and `value` match the allowed enums.

## Deployment
- The app is configured for deployment on **Vercel** or **Firebase Hosting**.
- **Build Command**: `npm run build` (runs `tsc && vite build`).
- **Root TypeScript scope**: [`tsconfig.json`](../tsconfig.json) **`exclude`s `functions/`**. The SPA does not type-check Firebase Cloud Functions; those use [`functions/tsconfig.json`](../functions/tsconfig.json) and dependencies under **`functions/package.json`**. This prevents Vercel (or any root `tsc`) from failing on `firebase-admin` / `firebase-functions` imports.
- **Cloud Functions**: From `functions/`, run `npm run build` before `firebase deploy --only functions` (see **Email notifications** above).
- **Configuration**:
    - `vercel.json` (if applicable) for Vercel.
    - `firebase.json` and `.firebaserc` for Firebase Hosting and CLI operations.
- The output `dist` folder is static and can be deployed to any static host.

### Admin Console (student directory) — behaviour summary
- **Sort**: Click **Name** (first-name order) or **Grade** (numeric from grade string); click again to reverse. Inactive column participates as secondary sort.
- **Selection**: Per-row checkbox; header selects/deselects all **currently visible** rows (respects search + **Show archived**). Bulk **Archive** / **Restore** counts only rows that are active vs archived.
- **Permanent delete**: Removes the Firestore `students` document; distinct from archive. Confirmation copy directs admins to prefer archive when removing access only.
