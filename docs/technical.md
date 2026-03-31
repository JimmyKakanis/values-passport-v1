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
- **`Student`**: Basic profile info + `lastLoginAt` (timestamp).
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

### Authentication & Teacher Provisioning
- **Provider**: Microsoft 365 (via Firebase Authentication).
- **Security**: 
    - API Keys are stored in `import.meta.env` (Vite Environment Variables).
    - Hardcoded secrets have been removed from the codebase.
    - Fallback mechanism handles browser "Popup Blocked" scenarios gracefully.
- **Domain Locking**: Only emails ending in `@sathyasai.nsw.edu.au` are permitted.
- **Just-in-Time Provisioning**: If a user logs in with a valid school email but does not exist in the `teachers` collection, the system automatically creates a `TEACHER` profile for them in Firestore. This ensures the Admin Console list stays up-to-date without manual data entry.
- **No In-App Password Change**: With Microsoft 365 login, credential management is handled by the identity provider. The Change Password UI has been removed.

### Real-Time Passport
- **Subscriptions**: The `StudentPassport` component uses `onSnapshot` from Firestore. This opens a WebSocket connection that pushes changes immediately.
- **Optimistic UI**: While not strictly "optimistic" (since we wait for the server push), the latency is low enough (~100ms) that it feels instant.
- **Stamp History**: Clicking a cell opens a modal that filters the local signatures state by `subject` and `value`. This avoids an additional network request.

### Leaderboard
- **Rank Display**: Ranks shown in the table reflect position within the current filtered view (e.g., 1–24 for "Year 8 Truth"), not overall position across all students.
- **Podium + List**: Top 3 displayed on podium; list below continues from rank 4.
- **Visibility**: Teachers see full rankings; students see top 20 for overall all-grades, top 10 for grade/value-specific views.

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
- **UI**: [`TeacherEngagementPanel.tsx`](../components/TeacherEngagementPanel.tsx) is embedded in **Values Development → My Insights** ([`TeacherInsights.tsx`](../components/TeacherCorner/TeacherInsights.tsx)); logic in [`services/teacherEngagement.ts`](../services/teacherEngagement.ts). Optional empty-state prompt strings remain available as `pickAwardEmptyPrompt` / `AWARD_EMPTY_PROMPTS` if reused elsewhere.
- **2026 school integration themes**: When the device date is in **2026** and falls in a mapped term week, prompts use the whole-school calendar in [`valuesIntegrationCalendar2026.ts`](../valuesIntegrationCalendar2026.ts) (see below). Otherwise weekly/daily copy falls back to the generic templates.

### Values integration calendar (2026)
- **Data**: [`valuesIntegrationCalendar2026.ts`](../valuesIntegrationCalendar2026.ts) lists segments per `termId` (matching [`SCHOOL_TERMS`](../schoolCalendar.ts)) and inclusive **week-within-term** bounds. Each segment has `coreValue` ([`CoreValue`](../types.ts)), a **display-only** `subValueLabel`, `quote`, and optional `events` (e.g. public holidays or school events).
- **Week index (integration only)**: [`getTermAndIntegrationWeekInTerm(date)`](../schoolCalendar.ts) uses Monday-start weeks from [`getValuesIntegrationWeekAnchor(term)`](../schoolCalendar.ts). **Term 1** uses the Monday **one week before** the official term start week so printed labels (e.g. "Week 9" = Non-Violence in late March) line up; Terms 2–4 use the Monday of the official start week. Badges and planner-style logic still use [`getTermAndWeekInTerm`](../schoolCalendar.ts) from `term.start`.
- **Lookup**: `getValuesIntegrationFocus(date)` returns `null` outside 2026, in holidays between terms, or if `weekInTerm` is not covered by any segment (verify segment ranges against the printed calendar after the first term).
- **Teachers**: Indigo **School values integration** block at the top of [`TeacherEngagementPanel.tsx`](../components/TeacherEngagementPanel.tsx); `getWeeklyThemeLine` and `pickDailyNudge` in [`teacherEngagement.ts`](../services/teacherEngagement.ts) prefer this focus when non-null.
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
- **Configuration**:
    - `vercel.json` (if applicable) for Vercel.
    - `firebase.json` and `.firebaserc` for Firebase Hosting and CLI operations.
- The output `dist` folder is static and can be deployed to any static host.
