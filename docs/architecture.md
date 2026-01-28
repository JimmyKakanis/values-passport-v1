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
- **`Leaderboard.tsx`**: Displays student rankings based on stamps or achievements.
- **`ValuesLearning.tsx`**: The "Values Lab" section containing educational resources for students.
- **`StudentPlanner.tsx`**: A comprehensive calendar and task management tool. It features Term, Month, and Week views, allowing students to track homework and assignments aligned with the school term.

### Teacher Views
- **`TeacherConsole.tsx`**: The main interface for teachers to award signatures and review nominations.
- **`TeacherRewards.tsx`**: A dashboard for teachers to view and manage unclaimed rewards.
- **`StudentDetailView.tsx`**: A tabbed view for teachers to see a specific student's Achievements and Values Passport.
- **`TeacherCorner/`**: A directory containing components for the "Values Development" section:
    - **`TeacherCorner.tsx`**: The main container for the Values Development page.
    - **`ValueDeepDive.tsx`**: Detailed resources and prompts for each value.
    - **`ScenarioSimulator.tsx`**: Interactive classroom scenarios for teacher training.
    - **`TeacherInsights.tsx`**: A personal dashboard for teachers to track their awarding habits.

### Admin Views
- **`AdminConsole.tsx`**: A protected dashboard for Super Admins.
    - **Student Management**: CRUD operations for the student directory.
    - **Teacher Management**: Add/Remove authorized teachers and admins.
    - **System Settings**: Manage dynamic configuration like the active Subjects list.
    - **Migration Tool**: Utilities to seed or migrate data from hardcoded constants to Firestore.

### Notification System
- **`NotificationSystem.tsx`**: Contains the complete logic for the notification experience.
    - **`NotificationProvider`**: A Context Provider that manages the state of active toasts and the modal queue. It exposes `addNotification`.
    - **`NotificationController`**: A "headless" logic component that bridges the Data Service and the Notification System. It subscribes to Firestore streams, calculates changes (diffs), and triggers notifications for new stamps, achievements, or rewards.
    - **`Toast`**: A lightweight, auto-dismissible notification component for stamps (built with `framer-motion`).
    - **`AchievementModal`**: A full-screen celebration modal with confetti for major milestones (Achievements/Rewards).

## Data Flow & State Management

### 1. Service Layer (`services/dataService.ts`)
All interaction with Firebase Firestore is encapsulated in `dataService.ts`. This service provides:
- **Fetch Functions**: `getDocs` wrappers for one-time data retrieval (e.g., `getStudents`, `getAllSignatures`).
- **Subscription Functions**: `onSnapshot` wrappers for real-time data streams (e.g., `subscribeToSignatures`, `subscribeToPlannerItems`).
- **Mutation Functions**: Functions to write to the database (e.g., `addSignature`, `addPlannerItem`).
- **Business Logic**: Calculations for stats, mastery levels, and achievement unlocking are performed here to ensure consistency across the app.

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
    - **Student**: Identified if their email exists in the `students` Firestore collection. Access to Passport, Learning, Achievements, Planner.
    - **Teacher**: Identified if their email exists in the `teachers` Firestore collection (with role `TEACHER`). Access to Teacher Console, Values Development, Student Details.
    - **Admin**: Identified if their email exists in the `teachers` Firestore collection (with role `ADMIN`). Full access to Teacher Console plus the **Admin Console** for managing users and settings.
