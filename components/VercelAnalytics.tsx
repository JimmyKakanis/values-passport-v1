import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useLocation } from 'react-router-dom';

/**
 * Collapse student-detail URLs so Firestore document ids are never sent to Vercel.
 * HashRouter already exposes app routes on `location.pathname` (e.g. `/teacher`).
 */
export function analyticsPath(pathname: string): string {
  if (pathname.startsWith('/student/')) {
    return '/student/:id';
  }
  return pathname;
}

export const VercelAnalytics: React.FC = () => {
  const location = useLocation();
  const path = analyticsPath(location.pathname);
  return <Analytics route={path} path={path} />;
};
