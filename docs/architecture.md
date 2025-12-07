# Application Architecture
...
## Component Structure

The application's UI is built from a set of modular React components located in the `components/` directory.

- **`App.tsx`**: The root component that handles routing, authentication state, and the main layout.
- **`Layout` (within `App.tsx`)**: A wrapper component that provides the consistent navigation bar and footer across the application.
- **`Login.tsx`**: The sign-in page, which handles user authentication against Firebase Auth.
- **`Dashboard.tsx`**: The main view for students, showing their progress and passport.
- **`StudentPassport.tsx`**: The core grid view of the values and subjects.
- **`TeacherConsole.tsx`**: The main interface for teachers to award signatures and review nominations.
- **`TeacherCorner/`**: A directory containing components for the "Values Development" section:
    - **`TeacherCorner.tsx`**: The main container for the Values Development page.
    - **`ValueDeepDive.tsx`**: Detailed resources and prompts for each value.
    - **`ScenarioSimulator.tsx`**: Interactive classroom scenarios for teacher training.
    - **`TeacherInsights.tsx`**: A personal dashboard for teachers to track their awarding habits.
- **`Leaderboard.tsx`**: Displays student rankings.
- **`StudentDetailView.tsx`**: A tabbed view for teachers to see a specific student's Achievements and Values Passport.
- **`Achievements.tsx`**: Shows a student's earned achievements.
...
