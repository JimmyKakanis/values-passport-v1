import React from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '../types';

interface Props {
  userRole: UserRole;
}

/** Legacy URL: sends users to Settings and scrolls to the feedback section. */
export const FeedbackPage: React.FC<Props> = ({ userRole }) => {
  if (userRole !== 'STUDENT' && userRole !== 'TEACHER' && userRole !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return (
    <Navigate
      to="/settings"
      replace
      state={{ focusFeedback: true }}
    />
  );
};
