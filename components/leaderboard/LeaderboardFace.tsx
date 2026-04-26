import React from 'react';
import { Student } from '../../types';
import { defaultAvatarUrlForName, resolveStudentAvatarUrl } from '../../services/avatarUrl';

/**
 * Student portrait for leaderboard lists/podium. Uses a safe `avatar` URL and falls back if the
 * image fails to load (e.g. bad or missing value in Firestore, or a broken remote URL).
 */
export const LeaderboardFace: React.FC<{ student: Student; className: string }> = ({
  student,
  className,
}) => {
  const fallback = defaultAvatarUrlForName(student.name);
  return (
    <img
      src={resolveStudentAvatarUrl(student)}
      alt=""
      className={className}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = fallback;
      }}
    />
  );
};
