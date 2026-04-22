import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { UserRole } from '../types';
import { LeaderboardLayout } from './leaderboard/LeaderboardLayout';
import { StudentLeaderboard } from './leaderboard/StudentLeaderboard';
import { YearGroupStandings } from './leaderboard/YearGroupStandings';

interface Props {
  userRole?: UserRole | null;
}

export const Leaderboard: React.FC<Props> = ({ userRole }) => (
  <Routes>
    <Route element={<LeaderboardLayout userRole={userRole} />}>
      <Route index element={<StudentLeaderboard userRole={userRole} />} />
      <Route path="year-groups" element={<YearGroupStandings />} />
    </Route>
  </Routes>
);
