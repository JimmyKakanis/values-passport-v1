import { Student } from '../types';

const DICEBEAR_AVATARS = 'https://api.dicebear.com/7.x/avataaars/svg';

/** Consistent with `constants` seed helper: collapse whitespace for the pixel avatar seed. */
export function defaultAvatarUrlForName(name: string): string {
  const seed = encodeURIComponent((name || 'Student').replace(/\s+/g, ''));
  return `${DICEBEAR_AVATARS}?seed=${seed}&backgroundColor=b6e3f4`;
}

/**
 * Returns the stored `avatar` when it is a plausible absolute `http(s)` URL; otherwise a
 * DiceBear URL derived from the student’s name (so missing/invalid Firestore `avatar` still renders).
 */
export function resolveStudentAvatarUrl(student: Pick<Student, 'name' | 'avatar'>): string {
  const raw = student.avatar?.trim();
  if (
    raw &&
    raw.length > 8 &&
    /^https?:\/\//i.test(raw) &&
    !/^https?:undefined$/i.test(raw)
  ) {
    return raw;
  }
  return defaultAvatarUrlForName(student.name);
}
