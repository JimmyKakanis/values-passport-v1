# Application Architecture

This document outlines the architecture of the Values Passport application, a React-based single-page application (SPA) built with Vite and TypeScript.

## High-Level Overview

The application is structured as a classic client-side SPA with Firebase acting as the backend for authentication and data storage.

- **Frontend:** Built with React and TypeScript.
- **Backend:** Firebase (Authentication, Firestore Database).
- **Deployment:** Vercel, connected to a GitHub repository.

## Component Structure

The application's UI is built from a set of modular React components located in the `components/` directory.

- **`App.tsx`**: The root component that handles routing, authentication state, and the main layout.
- **`Layout` (within `App.tsx`)**: A wrapper component that provides the consistent navigation bar and footer across the application.
- **`Login.tsx`**: The sign-in page, which handles user authentication against Firebase Auth.
- **`Dashboard.tsx`**: The main view for students, showing their progress and passport.
- **`StudentPassport.tsx`**: The core grid view of the values and subjects.
- **`TeacherConsole.tsx`**: The main interface for teachers to award signatures and review nominations.
- **`Leaderboard.tsx`**: Displays student rankings.
- **`StudentDetailView.tsx`**: A tabbed view for teachers to see a specific student's Achievements and Values Passport.
- **`Achievements.tsx`**: Shows a student's earned achievements.

## Routing

Routing is managed by `react-router-dom` within `App.tsx`. The application uses a `HashRouter` and defines different routes based on the user's role (Student or Teacher), which is determined upon login.

## Data Flow and State Management

- **Authentication:** `App.tsx` listens for authentication state changes from Firebase Auth. The logged-in user's information and role are stored in the component's state.
- **Data Fetching:** All interactions with the Firestore database are abstracted into the `services/dataService.ts` module. This service handles fetching signatures, nominations, and other data.
- **Static Data:** Core application data that does not change often (e.g., student lists, teacher lists, definitions of values and achievements) is stored in `constants.ts`. The student data is currently mocked and seeded into Firestore.
- **Component State:** Most state is managed locally within components using React hooks (`useState`, `useEffect`). There is no global state management library like Redux or Zustand.
