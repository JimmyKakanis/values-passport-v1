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

### Authentication & Teacher Provisioning
- **Domain Locking**: Only emails ending in `@sathyasai.nsw.edu.au` are permitted.
- **Just-in-Time Provisioning**: If a user logs in with a valid school email but does not exist in the `teachers` collection, the system automatically creates a `TEACHER` profile for them in Firestore. This ensures the Admin Console list stays up-to-date without manual data entry.

### Real-Time Passport
- **Subscriptions**: The `StudentPassport` component uses `onSnapshot` from Firestore. This opens a WebSocket connection that pushes changes immediately.
- **Optimistic UI**: While not strictly "optimistic" (since we wait for the server push), the latency is low enough (~100ms) that it feels instant.
- **Stamp History**: Clicking a cell opens a modal that filters the local signatures state by `subject` and `value`. This avoids an additional network request.

### Statistics & Achievements
- **Client-Side Calculation**: Given the dataset size (~150 students, ~1000s of signatures), statistics and achievement progress are calculated client-side in `dataService.ts`.
- **Efficiency**: Calculations are memoized or run only on data updates to prevent performance bottlenecks.

### Student Planner & Goals
- **View Logic**: Supported views include `Term`, `Month`, and `Week`.
- **Goals Integration**: Students can switch between `Calendar` and `My Goals` modes.
    - **Goal Types**: `YEARLY`, `SUBJECT`, and `LIFE` goals.
    - **Persistence**: Goals are stored in the `goals` collection in Firestore, linked by `studentId`.
- **Term Navigation**: The planner defaults to the current term based on `SCHOOL_TERMS` configuration.
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
