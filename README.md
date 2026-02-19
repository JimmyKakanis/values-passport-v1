# Values Passport

## Overview

The **Values Passport** is a gamified positive behaviour support system for Sathya Sai College. It replaces traditional paper-based "values passports" with an engaging, interactive digital web application.

- **For Students:** A digital "Passport" that tracks signatures (stamps) for demonstrating core values (Truth, Love, Peace, Right Conduct, Non-Violence). It features real-time updates, achievement unlocking, leaderboards, and a learning lab.
- **For Teachers:** A powerful console to award stamps, manage nominations, view student progress, and access professional development resources regarding values education.

## Features

### 🌟 Real-Time Gamification
- **Instant Feedback:** Students receive a "New Stamp" notification the moment a teacher awards it, complete with the teacher's note and specific sub-value focus.
- **Achievements:** An automated system tracks progress and unlocks badges (e.g., "The Optimist", "Subject Explorer") when milestones are met.
- **Celebrations:** Full-screen celebratory animations and confetti when students unlock major achievements or earn rewards.
- **Welcome Back Summaries:** If a student is offline, the app summarizes what they earned while away upon their next login.

### 📚 Student Portal
- **My Passport:** A visual grid showing mastery levels across all subjects and values. Click any cell to see the full history of stamps and teacher comments.
- **Values Lab:** A learning hub with definitions, sub-values, and resources.
- **Leaderboard:** A friendly competition tracker (optional/configurable).

### 👨‍🏫 Teacher Console
- **Quick Awarding:** Award stamps to individual students or bulk groups in seconds.
- **Nomination Review:** Approve or reject self/peer nominations from students.
- **Teacher Corner:** A dedicated professional development section with:
  - **Scenario Simulator:** Practise handling classroom situations.
  - **Value Deep Dives:** Resources and discussion prompts.
  - **Insights:** Track your own awarding habits.
- **Student Details:** View any student's full profile, passport, and achievement history.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/values-passport-v1.git
    cd values-passport-v1
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Firebase:**
    - Create a file `firebaseConfig.ts` in the `src` folder (or root, depending on structure).
    - Paste your Firebase configuration keys.

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```

## Project Structure
- `components/`: React UI components (Dashboard, Passport, Console, Notifications, etc.)
- `services/`: Data handling and Firebase integration (`dataService.ts`).
- `data/`: Static content resources.
- `docs/`: Comprehensive documentation.

## Technologies
- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Firebase (Auth, Firestore)
- **Libraries:** Framer Motion (Animations), React Confetti, Lucide React (Icons)

## License
[License Name]
