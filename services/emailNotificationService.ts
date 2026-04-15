import {
  doc,
  setDoc,
  onSnapshot,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { EmailNotificationPreferences } from '../types';

const defaultPreferences = (
  emailLower: string,
  role: 'STUDENT' | 'TEACHER'
): EmailNotificationPreferences => ({
  email: emailLower,
  role,
  achievementEmailEnabled: false,
  studentDigestEnabled: false,
  teacherDigestEnabled: false,
  frequency: 'WEEKLY',
  updatedAt: Date.now(),
});

export function subscribeEmailPreferences(
  emailLower: string,
  role: 'STUDENT' | 'TEACHER',
  callback: (prefs: EmailNotificationPreferences) => void,
  onError?: (err: Error) => void
): () => void {
  const ref = doc(db, 'email_preferences', emailLower);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as EmailNotificationPreferences);
      } else {
        callback(defaultPreferences(emailLower, role));
      }
    },
    (err) => {
      console.error('email_preferences listener error:', err);
      onError?.(err);
    }
  );
}

export async function saveEmailPreferences(
  prefs: EmailNotificationPreferences
): Promise<void> {
  const ref = doc(db, 'email_preferences', prefs.email.toLowerCase());
  await setDoc(ref, { ...prefs, updatedAt: Date.now() }, { merge: true });
}

export async function enqueueAchievementEmailNotification(params: {
  studentId: string;
  achievementId: string;
  achievementTitle: string;
}): Promise<void> {
  await addDoc(collection(db, 'achievement_email_queue'), {
    studentId: params.studentId,
    achievementId: params.achievementId,
    achievementTitle: params.achievementTitle,
    requestedAt: serverTimestamp(),
  });
}
