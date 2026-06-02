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
- **`EmailNotificationPreferences`**: Shape stored at `email_preferences/{authEmailLower}` (`role`, digest toggles, `achievementEmailEnabled`, `unseenStampsEmailEnabled`, `frequency`).
- **`Signature`**: Represents a "Stamp". Contains `studentId`, `teacherName`, `subject`, `value`, `subValue` (optional), `note` (optional), `timestamp`, and optional `source` (`DIRECT` | `NOMINATION`) for stamps created from nomination approval.
- **`Achievement`**: Defines milestones. Types include `TOTAL`, `VALUE`, `SUBJECT_MASTERY`, `FULL_PASSPORT`, and `CUSTOM`.
- **`Nomination`**: A request for a stamp (Self or Peer). Has a status of `PENDING`, `APPROVED`, or `REJECTED`.
- **`PlannerItem`**: Represents a task or event in the student planner. Contains `studentId`, `title`, `dueDate` (timestamp), `category` (TASK, HOMEWORK, ASSIGNMENT), and `isCompleted`.
- **`DailyIntention`**: Private one-per-day note (`dateKey` `YYYY-MM-DD`, `text` max 280 chars, optional `coreValue` / `subValue`, `ownerEmail`, `createdAt`, `updatedAt`). Doc id `{studentId}_{dateKey}` (sanitized). **Writes only for today’s `dateKey`** ([`upsertDailyIntention`](../services/dataService.ts)).
- **`ValueReflection`**: Private Values Lab entry (`ownerEmail`, `coreValue`, `subValue`, `text` max 2000, `wordCount`, `createdAt`). Created via `addDoc`; no client update/delete.
- **`GoalCheckIn`**: Private fortnightly progress note (`goalId`, `ownerEmail`, `periodKey` e.g. `2026-T1-F3`, `progressText` max 500, `createdAt`, `updatedAt`). One per goal per period.
- **`StudentEngagementStats`**: Client-computed counts for achievement progress (not stored).

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
- **Server**: [`functions/src/index.ts`](../functions/src/index.ts) — `onAchievementEmailQueued`, `onSignatureRecordDigestEvent`, `sendWeeklyDigestEmails`, `sendUnseenStampsEmails` (schedules). Mail is sent as **HTML** via **Microsoft Graph** [`sendMail`](https://learn.microsoft.com/en-us/graph/api/user-sendmail) from [`functions/src/graphMail.ts`](../functions/src/graphMail.ts).
- **Stamps waiting reminder** ([`functions/src/unseenStampsEmail.ts`](../functions/src/unseenStampsEmail.ts)): Daily **16:00 Australia/Sydney**, emails students who have **≥ 5** signatures with `timestamp > students/{id}.lastLoginAt` (same rule as in-app Welcome Back). **Opt-in** via Settings → **Stamps waiting reminder** (`unseenStampsEmailEnabled`). Idempotency: one email per login period in `unseen_stamps_email_sent/{studentId}_{lastLoginAt}`. Requires Firestore composite index on `signatures` (`studentId` + `timestamp`) — see [`firestore.indexes.json`](../firestore.indexes.json).
- **One-off blast (all eligible, ignore opt-in)**: Call `runUnseenStampsEmails(ctx, { requireOptIn: false })` from a secured admin path (e.g. temporary HTTP function with a Secret Manager key, then delete). Returns send/skip counts. Uses the same idempotency collection so recipients are not emailed again until they log in and accumulate another 5+ unseen stamps.
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
- **Deploy**: From the repo root, `firebase deploy --only functions,firestore` after `npm --prefix functions run build` (includes rules and indexes).
- **Rules**: [`firestore.rules`](../firestore.rules) — users may only create their own `achievement_email_queue` rows (studentId must match `students/{id}.email`); server-only collections (`achievement_email_sent`, `digest_*`, `unseen_stamps_email_sent`) are denied to clients.

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

### Leaderboard, School highlights, and Wall of Fame
- **Nav**: In [`App.tsx`](../App.tsx), the link label is **School** (Building icon) for **students** and **Students** (Bar chart icon) for **teachers and admins**; both target **`/leaderboard`**. The nested route [`Leaderboard.tsx`](../components/Leaderboard.tsx) passes **`studentId`** to **`SchoolHighlights`**, **`YearGroupStandings`**, and **`StudentQuizLeaderboard`** when the user is a **STUDENT**.
- **File map (leaderboard folder)**: `Leaderboard.tsx` (routes) · `LeaderboardLayout.tsx` (tabs + chrome) · `SchoolHighlights.tsx` · `GoodNewsFeedList.tsx` · `YearLevelSnapshotCard.tsx` · `YearGroupStandings.tsx` · `StudentQuizLeaderboard.tsx` · `StudentLeaderboard.tsx` (staff WOF) · `LeaderboardShared.tsx` (filter cards, `getLeaderboardMetricUnit` — `POP_QUIZ` → **pts**, others as documented).

- **Layout** ([`LeaderboardLayout.tsx`](../components/leaderboard/LeaderboardLayout.tsx)): **Students** get tab-specific titles/subtitles (highlights, year groups, or **Quiz**). **Staff** see **Wall of Fame** and **TEACHER VIEW** badge. Tabs: **Highlights** / **Year groups** / **Quiz** (students) or **Students** / **Year groups** (staff; quiz is inside **Students** filters, not a separate tab).
- **Student quiz leaderboard** (`#/leaderboard/quiz`, students only; staff are redirected to `#/leaderboard`): [`StudentQuizLeaderboard.tsx`](../components/leaderboard/StudentQuizLeaderboard.tsx) — [`fetchLeaderboardData('POP_QUIZ')`](../services/dataService.ts) (high score from `quiz_scores` / `LeaderboardEntry.quizScore`), podium + **Honorable-mentions**-style list with search and year filter; same **pts** label as in [`getLeaderboardMetricUnit`](../components/leaderboard/LeaderboardShared.tsx) for `POP_QUIZ`. The logged-in student’s row is **highlighted** when `studentId` matches.

- **Student index route** (`#/leaderboard`): **Not** the individual Wall of Fame. [`SchoolHighlights.tsx`](../components/leaderboard/SchoolHighlights.tsx) calls **`getSchoolHighlightsPageData(studentId)`** ([`dataService`](../services/dataService.ts)) — one read of `getAllSignatures` + `getAllClaimedRewards` and roster reload.
  - **Snapshot boards**: Two cards via [`YearLevelSnapshotCard`](../components/leaderboard/YearLevelSnapshotCard.tsx) — **my year** (violet border) when the student’s grade normalises to `Year 7`–`Year 12`, and **Whole school** (blue border). Each card shows the **grade label**, optional **all-time shared stamps total** for that scope (not “on roll” headcount), and **milestone** bullet lines from `milestoneLines` (7-day and cohort story copy). Styling is **larger, higher-contrast type** for titles, stamp line, bullets, and bold numerals. There is no separate “Your year and whole school” page title, no **Each year level** grid on this page, and no 7-day stamp/claim **stat boxes** on these cards.
  - **Feed** ([`GoodNewsFeedList`](../components/leaderboard/GoodNewsFeedList.tsx)): Interleaved list (no names) mixing **7-day** teacher **stamps** and **claimed achievements**, plus **synthetic** rows — **school-wide milestones** and **my year** milestones (from the same `YearLevelSnapshot` logic) and **fun stats** (e.g. highlight value, school totals). Item kinds include `stamp`, `claim`, `schoolMilestone`, `yearMilestone`, `funStat` ([`GoodNewsFeedItem`](../services/dataService.ts), [`getSchoolHighlightsPageData`](../services/dataService.ts)). Section heading: **What is happening at school** (newspaper icon).
  - **Other blocks** on the same page: **Values in focus (school, 7 days)** (horizontal bars by value), **Goals the school worked toward (7 days)** (top claimed types + link to achievements when `studentId` is set), optional empty/highlight footers — as implemented in the component. Earlier **intro paragraphs**, **Values / Goals** subtitle lines, **gentle invitation** strip, and **Each year level** copy were **removed** from this screen.

- **Staff index route** (`#/leaderboard`): Unchanged **Wall of Fame** — [`StudentLeaderboard.tsx`](../components/leaderboard/StudentLeaderboard.tsx) (filters, podium, list); filters in [`leaderboard/LeaderboardShared.tsx`](../components/leaderboard/LeaderboardShared.tsx). **Avatars** on the staff podium and list use [`LeaderboardFace`](../components/leaderboard/LeaderboardFace.tsx): [`resolveStudentAvatarUrl`](../services/avatarUrl.ts) for the `src`, plus `onError` to a name-based DiceBear URL so a missing or broken Firestore `avatar` does not show a broken image. The same component is used on the **student** [`StudentQuizLeaderboard`](../components/leaderboard/StudentQuizLeaderboard.tsx) podium and list. ([`YearGroupStandings`](../components/leaderboard/YearGroupStandings.tsx) avatar wall still uses raw `student.avatar` strings.)

- **Year groups** (`#/leaderboard/year-groups`): [`YearGroupStandings.tsx`](../components/leaderboard/YearGroupStandings.tsx) for all roles. **Rank only** in the public UI — no cohort **average** or **total** stamp numbers for ordering. **Sorting** uses **mean** stamps per student per year in [`buildYearGroupLeaderboard`](../services/dataService.ts) (see `YearGroupLeaderboardRow`: `meanStamps`, plus `totalStamps` / `studentCount` on the row for data/reuse); the mean is **not shown**. **Top six** year groups: **two-row podium** (2nd / 1st / 3rd, then 4th / 5th / 6th). Cards: **place chip** (1st–6th), year name, **full avatar wall** for that year (all students on the roster in leaderboard data, scrollable; [`fetchLeaderboardData`](../services/dataService.ts)), optional **Your stamps** for the logged-in student’s year only, coloured **plinth**; no large **Y7-style** ring badges above the card and no **group/users** icon in the card. **7th place onward**: **Other year groups** table in the same panel, rank + year + **avatar strip**; **Your stamps** column for **students** on their year only. **No** long explanatory **intro** paragraph. [`Leaderboard.tsx`](../components/Leaderboard.tsx) passes **`studentId`** only for **STUDENT** role.

- **Rank display** (staff Wall of Fame only): Table rank reflects the **current filter** (e.g. a value or year), not a single global position.

- **Podium + list**: **Staff** Wall of Fame ([`StudentLeaderboard.tsx`](../components/leaderboard/StudentLeaderboard.tsx)): top 3, then list from rank 4. **Students** on **Quiz** ([`StudentQuizLeaderboard.tsx`](../components/leaderboard/StudentQuizLeaderboard.tsx)): same pattern for quiz scores only.

- **Visibility**: Student **School** view has no per-student Wall of Fame. **Archived** / **excluded** students: see [`fetchLeaderboardData`](../services/dataService.ts) and **`isStudentShownOnLeaderboard`**; **`reloadStudentsCacheFromFirestore`** before fetch; `initializeData` loads students from Firestore.

### Student attention (teacher dashboard)
- **Location**: **Teacher Console** → **Student attention** tab ([`TeacherAttentionPanel`](../components/TeacherAttentionPanel.tsx)), next to **Award** so staff can move from “who to notice” to awarding quickly.
- **Data**: **No new collections.** On load, **`reloadStudentsCacheFromFirestore`** + **`getAllSignatures`**, then [`buildStudentAttentionRows`](../services/studentAttention.ts)(`students`, `signatures`, `now`). At ~school scale, full-signature read matches the same pattern as [`fetchLeaderboardData`](../services/dataService.ts) (client-side aggregate).
- **Roster scope**: All active `getStudents()` by default, or only grades in the teacher’s Firestore **`assignedGrades`** when that array is non-empty.
- **Limits**: **Whole school** view shows up to **20** students; **per-year** view (Year 7, Year 8, …) shows up to **5** in that year. A **View** control switches one screen at a time. **Search** filters before the limits are applied.
- **Sort modes**: “Needs attention” (composite: never stamped / days since last stamp / 7d count / below peer median / gaps, then name) plus alternatives (stale, peers, gaps) — all client-side.
- **Actions**: **Award** uses current gap heuristics to prefill subject/value when possible; **student name** links to `#/student/:id?tab=passport` (Values Passport) — see **Student profile (deep link)** below.
- **Exclusions**: Display names in [`STUDENT_NAMES_EXCLUDED_FROM_ATTENTION`](../services/studentAttention.ts) (e.g. **Student Test**) are filtered out of attention rows and cohort stats for this feature.

### Student profile (deep link)
- **Route**: `#/student/:id` — [`StudentDetailView`](../components/StudentDetailView.tsx).
- **Tab query**: **`?tab=passport`** selects **Values Passport**; no `tab` (or a value other than `passport`) defaults to **Achievements**. Tab buttons update the query with `setSearchParams` so refresh and deep links stay consistent.

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

### Student engagement achievements
- **CUSTOM** ids (private practice, not stamps): `intention-first`, `intention-5`, `intention-10`, `intention-25`, `intention-50`; `reflection-first`, `reflection-5`, `reflection-10`, `reflection-25`, `reflection-words-250`, `reflection-words-1000`, `reflection-five-values`; `goal-checkin-first`, `goal-checkin-5`, `goal-checkin-10`.
- **Sub-value collectors** (stamps, IMPOSSIBLE): `subvalues-truth`, `subvalues-love`, `subvalues-peace`, `subvalues-right-conduct`, `subvalues-non-violence` — unlock when the student has at least one stamp in that core value for **each** catalog sub-value in `CORE_VALUES` (case-insensitive tag match on `signature.subValue`). Progress shows `covered / total` (e.g. 12/21 Truth sub-values). Logic: [`countStampedSubValuesForCoreValue`](../services/studentEngagement.ts).
- **Fortnight key**: `{year}-T{termId}-F{ceil(weekInTerm/2)}` via [`getFortnightPeriodKey`](../services/studentEngagement.ts).
- **Reset progress**: `resetStudentProgress` / `resetAllProgress` delete all three engagement collections for affected students.

### Statistics & Achievements
- **Client-Side Calculation**: Given the dataset size (~150 students, ~1000s of signatures), statistics and achievement progress are calculated client-side in `dataService.ts`. Pass optional **`StudentEngagementStats`** into `calculateStudentAchievements` for engagement badges.
- **Efficiency**: Calculations are memoized or run only on data updates to prevent performance bottlenecks.

### Student Planner & Goals
- **View Logic**: Supported views include `Term`, `Month`, and `Week`.
- **Modes**: `Calendar`, **My Tasks**, and **My Goals** (top-level tabs in [`StudentPlanner.tsx`](../components/StudentPlanner.tsx)).
- **My Tasks**: [`PlannerTasksView.tsx`](../components/PlannerTasksView.tsx) — all planner items in three sections (Tasks, Homework, Assignments) via [`groupPlannerItemsByCategory`](../utils/plannerDisplay.ts); incomplete sorted by due date; per-section **Completed (N)** collapse; section **+** opens add modal with category preset.
- **Add item**: [`PlannerAddItemModal.tsx`](../components/PlannerAddItemModal.tsx) — title, due date (`type="date"`), category; calendar defaults to selected day, tasks tab defaults to today.
- **Goals Integration**: Students switch to **My Goals** for yearly/subject/life goals.
    - **Goal Types**: `YEARLY`, `SUBJECT`, and `LIFE` goals.
    - **Persistence**: Goals are stored in the `goals` collection in Firestore, linked by `studentId`.
- **Daily intentions on planner**: [`subscribeToDailyIntentions`](../services/dataService.ts) (composite query `studentId` + `ownerEmail`). Sidebar behaviour by selected date:
    - **Today**: Edit text and Save; optional value/sub-value tags shown if set from dashboard; server rejects non-today `dateKey`.
    - **Past**: Read-only display (tags + bordered quote text); message that past intentions cannot be changed.
    - **Future**: No editor; message that future intentions are not allowed.
- **Dashboard intentions**: [`DailyIntentionCard.tsx`](../components/DailyIntentionCard.tsx) — full value/sub-value pickers, saved-state card UI, link to planner. Same Firestore doc as planner for today.
- **Term Navigation**: The planner defaults to the current term based on `SCHOOL_TERMS` from [`schoolCalendar.ts`](../schoolCalendar.ts).
- **Data Fetching**: Real-time subscription to `planner`, `goals`, and `daily_intentions` in Firestore.
- **Dashboard Next Up**: [`Dashboard.tsx`](../components/Dashboard.tsx) subscribes via `subscribeToPlannerItems`. Up to three incomplete items from [`getNextUpItems`](../utils/plannerDisplay.ts) — overdue first, then due today or this calendar week (Mon–Sun via [`getLocalWeekRange`](../schoolCalendar.ts)), then soonest due. Rows use [`PlannerItemRow`](../components/PlannerItemRow.tsx) with circle checkboxes (`updatePlannerItem` toggles `isCompleted`); due pills from [`formatPlannerDueLabel`](../utils/plannerDisplay.ts) (`Overdue`, `Today`, `Tomorrow`, or `EEE d MMM`).
- **Planner day list**: Same `PlannerItemRow`; incomplete items above completed on the selected day; due pill + category label.
- **UI Architecture**: Uses a Flexbox layout with a fixed sidebar for navigation and a main content area that expands to fit the screen height.

### Stamp history (dashboard)
- [`StampHistorySection`](../components/StampActivityFeed.tsx) on [`Dashboard.tsx`](../components/Dashboard.tsx): all signatures for the student, sorted newest first, with subject, value, sub-value, teacher name, date/time, and teacher comment (or “No comment on this stamp”). Scrollable (`max-h` ~32rem). Empty state when no stamps.
- Per-cell history remains in [`StudentPassport`](../components/StudentPassport.tsx) via `StampHistoryModal`.

### Student engagement (Firestore client)
- **`getEngagementOwnerEmail()`**: `auth.currentUser.email` or first `providerData` email (lowercase); must align with rules `authEmailLower()`.
- **Subscriptions**: `subscribeToDailyIntentions`, `subscribeToValueReflections`, `subscribeToGoalCheckIns` — permission-denied falls back to empty list in callbacks.
- **`getEngagementDataForStudent`**: Used on dashboard load for achievements; catches errors and returns empty stats so loading never hangs.
- **Mutations**: `upsertDailyIntention`, `addValueReflection`, `upsertGoalCheckIn` return `{ ok, userMessage }` or `{ ok, intention }` with permission-denied hints referencing rules deploy.
- **Admin reset**: `resetStudentProgress` / `resetAllProgress` delete engagement docs for affected students.

### School Analytics (Admin)
- **Aggregated Stats**: Calculates school-wide metrics (total stamps, participation rate, value distribution) by fetching all signatures.
- **Visualizations**: Uses `recharts` for data visualization (Bar charts for values, Line charts for trends).
- **Performance**: Fetches all data on load. For larger datasets (>5000 signatures), this should be migrated to server-side aggregation or Firebase Extensions (e.g., "Aggregate Counters").

## Security Rules (Firestore)
- **Engagement collections** (`daily_intentions`, `value_reflections`, `goal_check_ins`): Student-only read/write via `ownerEmail` and/or `isOwnStudentData(studentId)`. Field validators (`validDailyIntentionData`, etc.) enforce sizes and required keys. **`authEmailLower()`** supports Microsoft tokens where email is on `preferred_username`.
- **General (stamps, planner, goals, etc.)**: Authenticated read/write as documented in [`firestore.rules`](../firestore.rules); teachers award stamps; students write planner/goals.
- **Email / digest collections**: Client create rules for queues/preferences; server-only sent/digest collections denied to clients.
- **Deploy**: After rule or index changes, run `firebase deploy --only firestore:rules,firestore:indexes` before testing saves in production.

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
- **Sort**: Click **Name** (first-name order), **Grade** (numeric from grade string), or **Last login** (`lastLoginAt`; students who have never signed in sort as `0`); click again to reverse. Inactive columns participate as secondary sort.
- **Last login**: Read-only column from `Student.lastLoginAt` (Unix ms on the Firestore student doc). Updated when a student opens the app via [`updateLastLogin`](../services/dataService.ts) from [`NotificationSystem.tsx`](../components/NotificationSystem.tsx) after the Welcome Back check. Shows **Never** when unset; otherwise relative text (e.g. “3 days ago”) with full datetime on hover. **Emerald** styling when login was within the last **14 days** (same window as Analytics **logged in recently**).
- **Selection**: Per-row checkbox; header selects/deselects all **currently visible** rows (respects search + **Show archived**). Bulk **Archive** / **Restore** counts only rows that are active vs archived.
- **Permanent delete**: Removes the Firestore `students` document; distinct from archive. Confirmation copy directs admins to prefer archive when removing access only.
