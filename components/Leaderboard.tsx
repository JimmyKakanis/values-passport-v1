import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { UserRole } from '../types';
import { LeaderboardLayout } from './leaderboard/LeaderboardLayout';
import { StudentLeaderboard } from './leaderboard/StudentLeaderboard';
import { YearGroupStandings } from './leaderboard/YearGroupStandings';
import { SchoolHighlights } from './leaderboard/SchoolHighlights';
import { StudentQuizLeaderboard } from './leaderboard/StudentQuizLeaderboard';

interface Props {
  userRole?: UserRole | null;
  /** Set for students so School highlights can show a personal 7-day strip */
  studentId?: string | null;
}

const isStaff = (role: UserRole | null | undefined) => role === 'TEACHER' || role === 'ADMIN';

export const Leaderboard: React.FC<Props> = ({ userRole, studentId }) => (
  <Routes>
    <Route element={<LeaderboardLayout userRole={userRole} />}>
      <Route
        index
        element={
          isStaff(userRole) ? (
            <StudentLeaderboard userRole={userRole} />
          ) : (
            <SchoolHighlights studentId={studentId} />
          )
        }
      />
      <Route
        path="year-groups"
        element={<YearGroupStandings studentId={userRole === 'STUDENT' ? studentId : null} />}
      />
      <Route
        path="quiz"
        element={
          isStaff(userRole) ? (
            <Navigate to="/leaderboard" replace />
          ) : (
            <StudentQuizLeaderboard studentId={studentId} />
          )
        }
      />
    </Route>
  </Routes>
);
