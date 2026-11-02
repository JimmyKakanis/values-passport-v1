import { addDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { db } from '../firebaseConfig';
import { ACHIEVEMENTS } from '../constants';
import {
  getAllSignatures,
  getAllStudents,
  getAllTeachers,
  isStaffParticipantGrade,
} from './dataService';
import {
  buildUnseenStampsEmailContent,
  UNSEEN_STAMPS_EMAIL_THRESHOLD,
} from '../utils/unseenStampsEmailTemplate';
import type {
  CustomReward,
  EligibleUnseenRecipient,
  EmailNotificationPreferences,
  QueuedAchievementEmailEntry,
  SentEmailKind,
  SentEmailLogEntry,
  SentEmailsAdminOverview,
  Signature,
  Student,
  Teacher,
  UnseenBlastRunSummary,
} from '../types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toUnixMs(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (val && typeof val === 'object') {
    const maybeTs = val as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof maybeTs.toMillis === 'function') {
      return maybeTs.toMillis();
    }
    if (typeof maybeTs.seconds === 'number') {
      return maybeTs.seconds * 1000 + Math.floor((maybeTs.nanoseconds ?? 0) / 1_000_000);
    }
  }
  return 0;
}

function unseenSentDocId(studentId: string, lastLoginAt: number): string {
  return `${studentId}_${lastLoginAt}`.replace(/[/.#$\[\]]/g, '_');
}

function resolveAchievementMeta(
  achievementId: string,
  customRewardsById: Map<string, CustomReward>,
  storedTitle?: string
): { title: string; description: string } {
  if (storedTitle && storedTitle.trim()) {
    return { title: storedTitle.trim(), description: '' };
  }
  const builtIn = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (builtIn) {
    return { title: builtIn.title, description: builtIn.description };
  }
  const custom = customRewardsById.get(achievementId);
  if (custom) {
    return { title: custom.title, description: custom.description };
  }
  if (achievementId.startsWith('e2e-test-')) {
    return {
      title: 'E2E Email Test Badge',
      description: 'Automated end-to-end verification email.',
    };
  }
  return { title: achievementId, description: '' };
}

function extractDigestPeriodFromId(docId: string, storedPeriod?: unknown): string | undefined {
  if (typeof storedPeriod === 'string' && storedPeriod.trim()) return storedPeriod.trim();
  const match = docId.match(/(\d{4}-\d{2}-\d{2})$/);
  return match?.[1];
}

export async function fetchSentEmailsAdminOverview(): Promise<SentEmailsAdminOverview> {
  const [students, teachers, allSignatures] = await Promise.all([
    getAllStudents().catch(() => [] as Student[]),
    getAllTeachers().catch(() => [] as Teacher[]),
    getAllSignatures().catch(() => [] as Signature[]),
  ]);

  const studentById = new Map<string, Student>();
  for (const s of students) {
    studentById.set(s.id, s);
  }

  const signaturesByStudent = new Map<string, Signature[]>();
  for (const sig of allSignatures) {
    if (!sig.studentId) continue;
    const list = signaturesByStudent.get(sig.studentId) ?? [];
    list.push(sig);
    signaturesByStudent.set(sig.studentId, list);
  }

  const teacherByEmailLower = new Map<string, Teacher>();
  for (const t of teachers) {
    if (t.email) {
      teacherByEmailLower.set(t.email.toLowerCase().trim(), t);
    }
  }

  const customRewardsById = new Map<string, CustomReward>();
  try {
    const customSnap = await getDocs(collection(db, 'custom_rewards'));
    customSnap.docs.forEach((d) => {
      customRewardsById.set(d.id, { id: d.id, ...d.data() } as CustomReward);
    });
  } catch {
    // Non-fatal
  }

  let permissionDenied = false;

  const safeGetCollection = async (name: string) => {
    try {
      return await getDocs(collection(db, name));
    } catch (err) {
      if (err instanceof FirebaseError && err.code === 'permission-denied') {
        permissionDenied = true;
      }
      console.warn(`Could not read ${name}:`, err);
      return null;
    }
  };

  const [achievementSentSnap, unseenSentSnap, digestSentSnap, queueSnap, prefsSnap] =
    await Promise.all([
      safeGetCollection('achievement_email_sent'),
      safeGetCollection('unseen_stamps_email_sent'),
      safeGetCollection('digest_sent'),
      safeGetCollection('achievement_email_queue'),
      safeGetCollection('email_preferences'),
    ]);

  const unseenSentDocIds = new Set<string>();
  const sentEmails: SentEmailLogEntry[] = [];

  // 1. Unseen stamps reminder emails
  unseenSentSnap?.docs.forEach((docSnap) => {
    unseenSentDocIds.add(docSnap.id);
    const data = docSnap.data() as Record<string, unknown>;
    const studentId = typeof data.studentId === 'string' ? data.studentId : '';
    const student = studentById.get(studentId);
    const studentName =
      (typeof data.studentName === 'string' && data.studentName.trim()) ||
      student?.name ||
      'Student';
    const recipientEmail =
      (typeof data.toEmail === 'string' && data.toEmail.trim()) ||
      student?.email ||
      'Unknown email';
    const unseenCount = typeof data.unseenCount === 'number' ? data.unseenCount : 5;
    const lastLoginAt = typeof data.lastLoginAt === 'number' ? data.lastLoginAt : 0;
    const isSchoolBlast = data.blast === 'oneoff_all_eligible';
    const sentAt = toUnixMs(data.sentAt);

    const studentSigs = (signaturesByStudent.get(studentId) ?? []).filter(
      (s) => (s.timestamp || 0) > lastLoginAt
    );
    const reconstructed = buildUnseenStampsEmailContent({
      studentId,
      studentName,
      studentEmail: recipientEmail,
      studentGrade: student?.grade || 'Student',
      lastLoginAt,
      unseenSignatures: studentSigs,
    });

    const subject =
      (typeof data.subject === 'string' && data.subject.trim()) ||
      reconstructed.subjectLine;
    const htmlPreview =
      (typeof data.htmlBody === 'string' && data.htmlBody.trim()) ||
      reconstructed.htmlBody;

    const loginNote =
      lastLoginAt > 0
        ? `since last login (${new Date(lastLoginAt).toLocaleDateString()})`
        : 'since account creation';

    sentEmails.push({
      id: `unseen_${docSnap.id}`,
      kind: 'UNSEEN_STAMPS',
      sentAt,
      recipientEmail,
      recipientName: studentName,
      recipientRoleLabel: student?.grade || 'Student',
      studentId: studentId || undefined,
      studentName,
      studentGrade: student?.grade,
      subject,
      summary: `${unseenCount} unseen stamps ${loginNote}${
        isSchoolBlast ? ' • School-wide blast' : ' • Daily opt-in reminder'
      }`,
      htmlPreview,
      isSchoolBlast,
      unseenCount,
    });
  });

  // 2. Achievement unlocked emails
  achievementSentSnap?.docs.forEach((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    const studentId = typeof data.studentId === 'string' ? data.studentId : '';
    const achievementId = typeof data.achievementId === 'string' ? data.achievementId : '';
    const student = studentById.get(studentId);
    const studentName =
      (typeof data.studentName === 'string' && data.studentName.trim()) ||
      student?.name ||
      'Student';
    const recipientEmail =
      (typeof data.toEmail === 'string' && data.toEmail.trim()) ||
      student?.email ||
      'Unknown email';
    const meta = resolveAchievementMeta(
      achievementId,
      customRewardsById,
      typeof data.achievementTitle === 'string' ? data.achievementTitle : undefined
    );
    const sentAt = toUnixMs(data.sentAt);
    const subject =
      (typeof data.subject === 'string' && data.subject.trim()) ||
      `Achievement unlocked: ${meta.title}`;
    const htmlPreview =
      (typeof data.htmlBody === 'string' && data.htmlBody.trim()) ||
      `<p>Hi ${escapeHtml(studentName)},</p><p>You unlocked <strong>${escapeHtml(
        meta.title
      )}</strong> in Values Passport.</p>${
        meta.description ? `<p>${escapeHtml(meta.description)}</p>` : ''
      }<p><a href="#/achievements">View your achievements</a></p>`;

    sentEmails.push({
      id: `ach_${docSnap.id}`,
      kind: 'ACHIEVEMENT',
      sentAt,
      recipientEmail,
      recipientName: studentName,
      recipientRoleLabel: student?.grade || 'Student',
      studentId: studentId || undefined,
      studentName,
      studentGrade: student?.grade,
      subject,
      summary: `Unlocked badge: ${meta.title}${meta.description ? ` — ${meta.description}` : ''}`,
      htmlPreview,
      achievementId,
    });
  });

  // 3. Weekly digests (student, teacher, parent)
  digestSentSnap?.docs.forEach((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    const rawKind = typeof data.kind === 'string' ? data.kind : 'student_digest';
    const sentAt = toUnixMs(data.sentAt);
    const periodId = extractDigestPeriodFromId(docSnap.id, data.periodId);
    const stampCount = typeof data.stampCount === 'number' ? data.stampCount : undefined;

    if (rawKind === 'teacher_digest') {
      const email =
        (typeof data.toEmail === 'string' && data.toEmail.trim()) ||
        (typeof data.email === 'string' ? data.email : 'Unknown email');
      const teacher = teacherByEmailLower.get(email.toLowerCase().trim());
      const teacherName =
        (typeof data.recipientName === 'string' && data.recipientName.trim()) ||
        teacher?.name ||
        email;
      const pendingCount =
        typeof data.pendingNominationsCount === 'number'
          ? data.pendingNominationsCount
          : undefined;
      const subject =
        (typeof data.subject === 'string' && data.subject.trim()) ||
        'Weekly Values Passport digest (teacher)';
      const htmlPreview =
        (typeof data.htmlBody === 'string' && data.htmlBody.trim()) ||
        `<p>Hi ${escapeHtml(
          teacherName
        )},</p><p><strong>Weekly Values Passport digest</strong></p><ul><li>Stamps you awarded (last 7 days): ${
          stampCount ?? '—'
        }</li><li>Stamp requests awaiting your review: ${
          pendingCount ?? '—'
        }</li></ul><p><a href="#/teacher">Open Teacher Console</a></p>`;

      sentEmails.push({
        id: `digest_${docSnap.id}`,
        kind: 'TEACHER_DIGEST',
        sentAt,
        recipientEmail: email,
        recipientName: teacherName,
        recipientRoleLabel: teacher?.role === 'ADMIN' ? 'Admin' : 'Teacher',
        subject,
        summary: `Weekly staff digest${periodId ? ` (${periodId})` : ''}`,
        htmlPreview,
        periodId,
      });
      return;
    }

    const studentId = typeof data.studentId === 'string' ? data.studentId : '';
    const student = studentById.get(studentId);
    const studentName =
      (typeof data.studentName === 'string' && data.studentName.trim()) ||
      student?.name ||
      'Student';

    if (rawKind === 'parent_digest') {
      const parentEmail =
        (typeof data.toEmail === 'string' && data.toEmail.trim()) ||
        student?.parentEmail ||
        'Parent email';
      const parentName =
        (typeof data.recipientName === 'string' && data.recipientName.trim()) ||
        student?.parentName ||
        `Parent of ${studentName}`;
      const subject =
        (typeof data.subject === 'string' && data.subject.trim()) ||
        `Values Passport weekly update for ${studentName}`;
      const htmlPreview =
        (typeof data.htmlBody === 'string' && data.htmlBody.trim()) ||
        `<p>Hi ${escapeHtml(
          student?.parentName || 'there'
        )},</p><p>${escapeHtml(studentName)} earned ${
          stampCount !== undefined ? `<strong>${stampCount}</strong> ` : ''
        }new recognition in Values Passport this week.</p><p><em>This is an automated message from Sathya Sai College Values Passport.</em></p>`;

      sentEmails.push({
        id: `digest_${docSnap.id}`,
        kind: 'PARENT_DIGEST',
        sentAt,
        recipientEmail: parentEmail,
        recipientName: parentName,
        recipientRoleLabel: student?.grade ? `Parent (${student.grade})` : 'Parent',
        studentId: studentId || undefined,
        studentName,
        studentGrade: student?.grade,
        subject,
        summary: `Weekly parent update for ${studentName}${periodId ? ` (${periodId})` : ''}`,
        htmlPreview,
        periodId,
      });
      return;
    }

    const studentEmail =
      (typeof data.toEmail === 'string' && data.toEmail.trim()) ||
      student?.email ||
      'Unknown email';
    const subject =
      (typeof data.subject === 'string' && data.subject.trim()) ||
      'Your weekly Values Passport summary';
    const htmlPreview =
      (typeof data.htmlBody === 'string' && data.htmlBody.trim()) ||
      `<p>Hi ${escapeHtml(
        studentName
      )},</p><p>Here is your weekly Values Passport summary${
        stampCount !== undefined
          ? ` (<strong>${stampCount}</strong> new stamp${stampCount === 1 ? '' : 's'})`
          : ''
      }.</p><p><a href="#/">Open Values Passport</a></p>`;

    const kind: SentEmailKind = 'STUDENT_DIGEST';
    sentEmails.push({
      id: `digest_${docSnap.id}`,
      kind,
      sentAt,
      recipientEmail: studentEmail,
      recipientName: studentName,
      recipientRoleLabel: student?.grade || 'Student',
      studentId: studentId || undefined,
      studentName,
      studentGrade: student?.grade,
      subject,
      summary: `Weekly student summary${periodId ? ` (${periodId})` : ''}`,
      htmlPreview,
      periodId,
    });
  });

  sentEmails.sort((a, b) => b.sentAt - a.sentAt);

  // Compute eligible 5+ unseen stamps students
  const eligibleUnseenRecipients: EligibleUnseenRecipient[] = [];
  for (const s of students) {
    if (s.archived) continue;
    if (isStaffParticipantGrade(s.grade)) continue;
    if ((s.grade || '').trim().toLowerCase().startsWith('graduated')) continue;
    if (!s.email || !s.email.trim()) continue;

    const lastLoginAt =
      typeof s.lastLoginAt === 'number' && s.lastLoginAt > 0 ? s.lastLoginAt : 0;
    const unseenSigs = (signaturesByStudent.get(s.id) ?? []).filter(
      (sig) => (sig.timestamp || 0) > lastLoginAt
    );

    if (unseenSigs.length < UNSEEN_STAMPS_EMAIL_THRESHOLD) continue;

    const preview = buildUnseenStampsEmailContent({
      studentId: s.id,
      studentName: s.name,
      studentEmail: s.email,
      studentGrade: s.grade,
      lastLoginAt,
      unseenSignatures: unseenSigs,
    });

    const sentId = unseenSentDocId(s.id, lastLoginAt);
    eligibleUnseenRecipients.push({
      studentId: s.id,
      studentName: s.name,
      studentEmail: s.email,
      studentGrade: s.grade,
      lastLoginAt,
      unseenCount: preview.unseenCount,
      unseenCommentsCount: preview.unseenCommentsCount,
      alreadySentForLoginWindow: unseenSentDocIds.has(sentId),
      subjectLine: preview.subjectLine,
      htmlBody: preview.htmlBody,
    });
  }

  eligibleUnseenRecipients.sort((a, b) => {
    if (a.alreadySentForLoginWindow !== b.alreadySentForLoginWindow) {
      return a.alreadySentForLoginWindow ? 1 : -1;
    }
    if (b.unseenCount !== a.unseenCount) return b.unseenCount - a.unseenCount;
    return a.studentName.localeCompare(b.studentName);
  });

  // Queued achievement emails
  const queuedEmails: QueuedAchievementEmailEntry[] = [];
  queueSnap?.docs.forEach((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    const studentId = typeof data.studentId === 'string' ? data.studentId : '';
    const student = studentById.get(studentId);
    queuedEmails.push({
      id: docSnap.id,
      studentId,
      studentName: student?.name || studentId,
      studentEmail: student?.email || '—',
      achievementId: typeof data.achievementId === 'string' ? data.achievementId : '',
      achievementTitle:
        typeof data.achievementTitle === 'string' ? data.achievementTitle : 'Achievement',
      requestedAt: toUnixMs(data.requestedAt),
    });
  });
  queuedEmails.sort((a, b) => b.requestedAt - a.requestedAt);

  // Opt-in stats
  let achievementOptInCount = 0;
  let unseenStampsOptInCount = 0;
  let studentDigestOptInCount = 0;
  let teacherDigestOptInCount = 0;
  prefsSnap?.docs.forEach((docSnap) => {
    const p = docSnap.data() as Partial<EmailNotificationPreferences>;
    if (p.achievementEmailEnabled) achievementOptInCount++;
    if (p.unseenStampsEmailEnabled) unseenStampsOptInCount++;
    if (p.role === 'STUDENT' && p.studentDigestEnabled) studentDigestOptInCount++;
    if (p.role === 'TEACHER' && p.teacherDigestEnabled) teacherDigestOptInCount++;
  });

  const parentDigestEnabledCount = students.filter(
    (s) => !s.archived && s.parentDigestEnabled && s.parentEmail && s.parentConsentRecordedAt
  ).length;

  return {
    sentEmails,
    queuedEmails,
    eligibleUnseenRecipients,
    optInStats: {
      achievementOptInCount,
      unseenStampsOptInCount,
      studentDigestOptInCount,
      teacherDigestOptInCount,
      parentDigestEnabledCount,
    },
    permissionDenied,
  };
}

export async function triggerUnseenStampsEmailBlast(options?: {
  requireOptIn?: boolean;
}): Promise<{ ok: true; result: UnseenBlastRunSummary } | { ok: false; error: string }> {
  try {
    const reqRef = await addDoc(collection(db, 'unseen_email_blast_requests'), {
      status: 'PENDING',
      requireOptIn: options?.requireOptIn === true,
      requestedAt: Date.now(),
    });

    return await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        unsub();
        resolve({
          ok: false,
          error:
            'Timed out waiting for Cloud Function response. Check the Sent Emails log in a moment.',
        });
      }, 120_000);

      const unsub = onSnapshot(
        reqRef,
        (snap) => {
          const data = snap.data() as
            | {
                status?: string;
                result?: UnseenBlastRunSummary;
                error?: string;
              }
            | undefined;
          if (!data) return;
          if (data.status === 'COMPLETED' && data.result) {
            clearTimeout(timeout);
            unsub();
            resolve({ ok: true, result: data.result });
          } else if (data.status === 'FAILED') {
            clearTimeout(timeout);
            unsub();
            resolve({
              ok: false,
              error: data.error || 'Blast Cloud Function reported an error.',
            });
          }
        },
        (err) => {
          clearTimeout(timeout);
          unsub();
          resolve({ ok: false, error: err.message });
        }
      );
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
