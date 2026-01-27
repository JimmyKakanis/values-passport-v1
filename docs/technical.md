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
- **`Signature`**: Represents a "Stamp". Contains `studentId`, `teacherName`, `subject`, `value`, `subValue` (optional), `note` (optional), and `timestamp`.
- **`Achievement`**: Defines milestones. Types include `TOTAL`, `VALUE`, `SUBJECT_MASTERY`, `FULL_PASSPORT`, and `CUSTOM`.
- **`Nomination`**: A request for a stamp (Self or Peer). Has a status of `PENDING`, `APPROVED`, or `REJECTED`.
- **`PlannerItem`**: Represents a task or event in the student planner. Contains `studentId`, `title`, `dueDate` (timestamp), `category` (TASK, HOMEWORK, ASSIGNMENT), and `isCompleted`.

### 2. Constants for Core Data
Static, foundational data such as the list of subjects, core values, achievement definitions, and **School Term Dates** are stored in `constants.ts` (or local constants within components for specific configurations like `SCHOOL_TERMS`).

## Feature Implementations

### Notification System
The notification system is designed to be unobtrusive yet celebratory.
- **Architecture**: It uses a **Context API** (`NotificationProvider`) to manage the global state of notifications. This allows any component in the app to trigger a notification via `useNotification()`.
- **Controller Pattern**: The `NotificationController` component handles the business logic. It sits at the top level (inside `App.tsx`) and manages Firestore subscriptions.
    - **Diffing**: It maintains `useRef` caches of the previous data state. When new data arrives from Firestore, it calculates the difference (A - B) to identify *new* items.
    - **Debouncing**: Small timeouts are used to stagger notifications if multiple stamps arrive simultaneously (e.g., from a bulk award action).
- **Offline Handling**: On initialization, it compares `signature.timestamp` > `student.lastLoginAt` to determine if a "Welcome Back" summary is needed.

### Real-Time Passport
- **Subscriptions**: The `StudentPassport` component uses `onSnapshot` from Firestore. This opens a WebSocket connection that pushes changes immediately.
- **Optimistic UI**: While not strictly "optimistic" (since we wait for the server push), the latency is low enough (~100ms) that it feels instant.
- **Stamp History**: Clicking a cell opens a modal that filters the local signatures state by `subject` and `value`. This avoids an additional network request.

### Statistics & Achievements
- **Client-Side Calculation**: Given the dataset size (~150 students, ~1000s of signatures), statistics and achievement progress are calculated client-side in `dataService.ts`.
- **Efficiency**: Calculations are memoized or run only on data updates to prevent performance bottlenecks.

### Student Planner
- **View Logic**: Supported views include `Term`, `Month`, and `Week`.
- **Term Navigation**: The planner defaults to the current term based on `SCHOOL_TERMS` configuration.
- **Data Fetching**: Real-time subscription to `planner` collection in Firestore, filtered by `studentId`.
- **UI Architecture**: Uses a Flexbox layout with a fixed sidebar for navigation and a main content area that expands to fit the screen height, avoiding internal scrollbars where possible.

## Security Rules (Firestore)
*Current Implementation assumes a trusted environment or prototype phase. For production:*
- **Read**: Students can read their own data; Teachers can read all data.
- **Write**: Only authenticated Teachers should be able to write to the `signatures` collection.
- **Validation**: Cloud Functions or Security Rules should validate that `subject` and `value` match the allowed enums.

## Deployment
- The app is built via `npm run build` which runs `tsc` (TypeScript Compiler) and `vite build`.
- The output `dist` folder is static and can be deployed to any static host (Vercel, Netlify, Firebase Hosting).
