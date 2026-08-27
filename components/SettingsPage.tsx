import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { EmailNotificationsSettings } from './EmailNotificationsSettings';
import { AvatarSettingsSection } from './AvatarSettingsSection';
import { FeedbackSettingsSection } from './FeedbackSettingsSection';
import type { UserRole } from '../types';

interface Props {
  preferenceRole: 'STUDENT' | 'TEACHER';
  /** When set (signed-in student or linked staff profile), show avatar customization. */
  studentId?: string | null;
  userRole: UserRole;
}

export const SettingsPage: React.FC<Props> = ({ preferenceRole, studentId, userRole }) => {
  const location = useLocation();
  const feedbackAnchorRef = useRef<HTMLDivElement>(null);

  const subtitle = studentId
    ? 'Account, avatar, notifications, and feedback'
    : 'Account, notifications, and feedback';

  useEffect(() => {
    const state = location.state as { focusFeedback?: boolean } | null;
    if (state?.focusFeedback && feedbackAnchorRef.current) {
      feedbackAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.state]);

  const showFeedback =
    userRole === 'STUDENT' || userRole === 'TEACHER' || userRole === 'ADMIN';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <header className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-emerald-100 rounded-xl">
          <Settings className="w-7 h-7 text-emerald-800" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </header>
      <div className="space-y-8">
        {studentId ? <AvatarSettingsSection studentId={studentId} /> : null}
        <EmailNotificationsSettings preferenceRole={preferenceRole} />
        {showFeedback ? (
          <div ref={feedbackAnchorRef}>
            <FeedbackSettingsSection userRole={userRole} />
          </div>
        ) : null}
      </div>
    </div>
  );
};
