# Technical Specifications

This document details the technologies, patterns, and conventions used in the Values Passport application.

## Technology Stack

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router (`react-router-dom`)
- **Backend:**
  - **Authentication:** Firebase Authentication
  - **Database:** Firestore
- **Icons:** Lucide React

## Key Patterns and Conventions

### 1. Data Service Abstraction

All interactions with the backend (Firestore) are centralized in `services/dataService.ts`. This pattern decouples the UI components from the data source, making the code cleaner and easier to maintain. Components do not directly call Firestore functions; instead, they call functions from the data service (e.g., `getSignaturesForStudent`, `addSignature`).

### 2. Constants for Core Data

Static, foundational data such as the list of subjects, core values, and achievement definitions are stored in `constants.ts`. This centralizes the application's core "business logic" and makes it easy to update these values without searching through multiple components. The initial student and teacher lists are also stored here and are used to seed the database.

### 3. Role-Based Routing and UI

The application determines the user's role (`STUDENT` or `TEACHER`) upon login by checking their email against the list of students in `constants.ts`. This role is then stored in the state of the `App.tsx` component and used to:
- Render different navigation links.
- Control access to routes (e.g., students cannot access the `/teacher` console).
- Conditionally render UI elements.

### 4. Component-Scoped State

The application exclusively uses local component state managed by React hooks (`useState`, `useEffect`). There is no global state management library. Data is passed down from parent to child components via props. This keeps the state management simple and easy to trace for the current scale of the application.

### 5. Styling with Tailwind CSS

All styling is done using Tailwind CSS utility classes directly in the JSX. This approach keeps the markup, logic, and styling co-located within the component file, making components self-contained and easy to work with. There are no separate `.css` files for individual components.

### 6. Environment and Configuration

- **Firebase Config:** All Firebase connection details are stored in `firebaseConfig.ts`.
- **School-Specific Constants:** The school's domain and logo URL are stored in `constants.ts` for easy configuration.
