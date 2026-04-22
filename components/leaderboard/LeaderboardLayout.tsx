import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Trophy, Users } from 'lucide-react';
import { UserRole } from '../../types';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-bold transition-all border text-center min-w-[8.5rem] ${
    isActive
      ? 'bg-blue-900 border-blue-900 text-white shadow-md'
      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
  }`;

interface Props {
  userRole?: UserRole | null;
}

export const LeaderboardLayout: React.FC<Props> = ({ userRole }) => {
  const isTeacher = userRole === 'TEACHER' || userRole === 'ADMIN';

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="text-center space-y-4 mb-2">
        <h1 className="text-4xl font-bold text-blue-900 flex items-center justify-center gap-3">
          <Trophy className="w-10 h-10 text-yellow-500" />
          Wall of Fame
        </h1>
        <p className="text-gray-500 max-w-lg mx-auto">
          Celebrating the students who consistently embody our school values.
          {isTeacher && (
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded ml-2 font-bold">
              TEACHER VIEW
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 w-full">
        <NavLink to="/leaderboard" end className={tabClass}>
          <span className="inline-flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4 shrink-0" />
            Students
          </span>
        </NavLink>
        <NavLink to="/leaderboard/year-groups" className={tabClass}>
          <span className="inline-flex items-center justify-center gap-2">
            <Users className="w-4 h-4 shrink-0" />
            Year groups
          </span>
        </NavLink>
      </div>

      <Outlet />
    </div>
  );
};
