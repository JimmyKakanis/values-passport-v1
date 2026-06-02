import React, { useEffect, useState } from 'react';
import { Mail, Loader2, AlertTriangle } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import {
  subscribeEmailPreferences,
  saveEmailPreferences,
} from '../services/emailNotificationService';
import type { EmailNotificationPreferences } from '../types';

function defaultPrefsFallback(
  emailLower: string,
  role: 'STUDENT' | 'TEACHER'
): EmailNotificationPreferences {
  return {
    email: emailLower,
    role,
    achievementEmailEnabled: false,
    unseenStampsEmailEnabled: false,
    studentDigestEnabled: false,
    teacherDigestEnabled: false,
    frequency: 'WEEKLY',
    updatedAt: Date.now(),
  };
}

interface Props {
  /** Firestore role stored on preferences (student vs staff). */
  preferenceRole: 'STUDENT' | 'TEACHER';
}

export const EmailNotificationsSettings: React.FC<Props> = ({ preferenceRole }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => auth.currentUser);
  const emailLower = firebaseUser?.email?.toLowerCase() ?? '';
  const [prefs, setPrefs] = useState<EmailNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    setLoadError(null);
    if (!emailLower) {
      setLoading(false);
      setPrefs(null);
      return;
    }
    setLoading(true);
    const unsub = subscribeEmailPreferences(
      emailLower,
      preferenceRole,
      (p) => {
        setPrefs({
          ...p,
          role: preferenceRole,
          email: emailLower,
        });
        setLoading(false);
        setLoadError(null);
      },
      () => {
        setLoading(false);
        setPrefs(defaultPrefsFallback(emailLower, preferenceRole));
        setLoadError(
          'Could not load saved preferences (permission or network). Using defaults below — if this persists, ask IT that Firestore rules allow reads on email_preferences for signed-in users.'
        );
      }
    );
    return () => unsub();
  }, [emailLower, preferenceRole]);

  const updateLocal = (partial: Partial<EmailNotificationPreferences>) => {
    if (!prefs) return;
    setPrefs({ ...prefs, ...partial });
  };

  const handleSave = async () => {
    if (!prefs || !emailLower) return;
    setSaving(true);
    setMessage('');
    try {
      await saveEmailPreferences({
        ...prefs,
        email: emailLower,
        role: preferenceRole,
        updatedAt: Date.now(),
      });
      setMessage('Saved.');
    } catch (e) {
      console.error(e);
      setMessage('Could not save. Try again or contact support.');
    } finally {
      setSaving(false);
    }
  };

  if (!firebaseUser?.email) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200">
        <p className="text-gray-600">Sign in to manage email notifications.</p>
      </div>
    );
  }

  if (loading || !prefs) {
    return (
      <div className="flex justify-center py-16 text-emerald-800">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Mail className="w-6 h-6 text-emerald-800" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Email notifications</h2>
          <p className="text-sm text-gray-500">Using {firebaseUser.email}</p>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm flex gap-2 items-start">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      <p className="text-sm text-gray-600 mb-6">
        Choose what we may send via email. Messages are sent through the school’s Microsoft 365 mail system. Digests run on
        a schedule (currently weekly on Friday afternoon, Sydney time). Achievement emails are sent shortly after you unlock
        an achievement in the app. The &ldquo;stamps waiting&rdquo; reminder runs daily at 4pm if you have five or more new
        stamps since your last visit.
      </p>

      <div className="space-y-4 mb-6">
        {preferenceRole === 'STUDENT' && (
          <>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                checked={prefs.achievementEmailEnabled}
                onChange={(e) => updateLocal({ achievementEmailEnabled: e.target.checked })}
              />
              <span>
                <span className="font-semibold text-gray-900">Achievement unlocked</span>
                <span className="block text-sm text-gray-600">Email when you earn a new achievement badge.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                checked={prefs.unseenStampsEmailEnabled}
                onChange={(e) => updateLocal({ unseenStampsEmailEnabled: e.target.checked })}
              />
              <span>
                <span className="font-semibold text-gray-900">Stamps waiting reminder</span>
                <span className="block text-sm text-gray-600">
                  Email if you have 5 or more new stamps and have not opened the app since they were awarded.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                checked={prefs.studentDigestEnabled}
                onChange={(e) => updateLocal({ studentDigestEnabled: e.target.checked })}
              />
              <span>
                <span className="font-semibold text-gray-900">Weekly stamp summary</span>
                <span className="block text-sm text-gray-600">Summary of new stamps for the week.</span>
              </span>
            </label>
          </>
        )}

        {preferenceRole === 'TEACHER' && (
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              checked={prefs.teacherDigestEnabled}
              onChange={(e) => updateLocal({ teacherDigestEnabled: e.target.checked })}
            />
            <span>
              <span className="font-semibold text-gray-900">Weekly teacher digest</span>
              <span className="block text-sm text-gray-600">
                Stamps you awarded in the last 7 days and how many stamp requests are awaiting your review.
              </span>
            </span>
          </label>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Digest frequency (reserved)</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={prefs.frequency}
            onChange={(e) =>
              updateLocal({ frequency: e.target.value as EmailNotificationPreferences['frequency'] })
            }
          >
            <option value="WEEKLY">Weekly</option>
            <option value="DAILY">Daily (coming soon)</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
    </div>
  );
};
