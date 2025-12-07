# Values Passport

Values Passport is a web application designed for Sathya Sai College to encourage and track positive student behavior based on the five core human values: Truth, Love, Peace, Right Conduct, and Non-Violence.

## Overview

- **For Students:** Students can view their "Values Passport," a grid that shows the signatures they have received from teachers for demonstrating positive values in different subjects. They can also track their achievements and see their position on the school-wide leaderboard.
- **For Teachers:** Teachers have a console where they can award signatures to students, review nominations for signatures, and view student profiles, including their passports and achievements.

## Technology Stack

- **Framework:** React with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Backend:** Firebase (Authentication & Firestore)
- **Routing:** React Router
- **Deployment:** Vercel

## Running Locally

**Prerequisites:** Node.js and npm.

### 1. Clone the Repository

```bash
git clone https://github.com/JimmyKakanis/values-passport-v1.git
cd values-passport-v1
```

### 2. Install Dependencies

Install the required npm packages.

```bash
npm install
```

### 3. Set Up Firebase

The application requires a Firebase project to run.

1.  The code is pre-configured to connect to a specific Firebase project. To use your own, update the configuration in `firebaseConfig.ts` with your project's credentials.
2.  **Important:** The application authenticates users and determines their roles based on a predefined list of students and teachers. For the application to work, you must seed your Firestore database with this data.

### 4. Seed the Database

The student and teacher data is stored in `constants.ts`. A function exists to push this data to Firestore, but there is no UI for it in the final app. To run the seed, you would need to temporarily add a button or a script that calls the `seedDatabase()` function from `services/dataService.ts`.

*Note: The Firestore security rules may need to be temporarily relaxed to allow the seed script to write to the `students` collection.*

### 5. Run the Development Server

Once the setup is complete, you can start the local development server.

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.
