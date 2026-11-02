import { format } from 'date-fns';
import { CoreValue, Signature } from '../types';
import { DEFAULT_SECONDARY_REPLY_TO_EMAIL } from './familyRecapEmail';

export const UNSEEN_STAMPS_EMAIL_THRESHOLD = 5;
export const MAX_TEASER_COMMENTS = 2;

const VALUE_HEX: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  [CoreValue.TRUTH]: { bg: '#dbeafe', text: '#1e3a8a', border: '#bfdbfe' },
  [CoreValue.LOVE]: { bg: '#fce7f3', text: '#831843', border: '#fbcfe8' },
  [CoreValue.PEACE]: { bg: '#ccfbf1', text: '#134e4a', border: '#99f6e4' },
  [CoreValue.RIGHT_CONDUCT]: { bg: '#d1fae5', text: '#064e3b', border: '#a7f3d0' },
  [CoreValue.NON_VIOLENCE]: { bg: '#ffedd5', text: '#7c2d12', border: '#fed7aa' },
};

function escapeHtmlStr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getStudentFirstName(fullName: string): string {
  const trimmed = (fullName || '').trim();
  const spaceIdx = trimmed.indexOf(' ');
  return spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
}

function formatShortDate(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return 'Recently';
  try {
    return format(new Date(timestamp), 'd MMM yyyy');
  } catch {
    return 'Recently';
  }
}

export interface UnseenStampsEmailPreviewData {
  studentId: string;
  studentName: string;
  firstName: string;
  studentEmail: string;
  studentGrade: string;
  lastLoginAt: number;
  unseenCount: number;
  unseenCommentsCount: number;
  teaserComments: Signature[];
  valueCounts: { value: string; count: number }[];
  subjects: string[];
  subjectLine: string;
  htmlBody: string;
}

export function buildUnseenStampsEmailContent(params: {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentGrade: string;
  lastLoginAt: number;
  unseenSignatures: Signature[];
  appUrl?: string;
  replyToEmail?: string;
}): UnseenStampsEmailPreviewData {
  const {
    studentId,
    studentName,
    studentEmail,
    studentGrade,
    lastLoginAt,
    unseenSignatures,
    appUrl = 'https://sathyasai-valuespassport.com',
    replyToEmail = DEFAULT_SECONDARY_REPLY_TO_EMAIL,
  } = params;

  const firstName = getStudentFirstName(studentName || 'there');
  const sortedNewestFirst = [...unseenSignatures].sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  );
  const unseenCount = sortedNewestFirst.length;

  const valueMap = new Map<string, number>();
  const subjectSet = new Set<string>();
  for (const sig of sortedNewestFirst) {
    if (sig.value) {
      valueMap.set(sig.value, (valueMap.get(sig.value) ?? 0) + 1);
    }
    if (sig.subject) {
      subjectSet.add(sig.subject);
    }
  }

  const valueCounts = [...valueMap.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  const subjects = [...subjectSet];

  const withNotes = sortedNewestFirst.filter((s) => Boolean(s.note && s.note.trim()));
  const unseenCommentsCount = withNotes.length;

  // Prefer teacher-written notes over self-advocacy for the 2 teasers
  const teacherNotes = withNotes.filter(
    (s) => !/^self-advocacy\s*:/i.test((s.note || '').trim())
  );
  const selfNotes = withNotes.filter((s) =>
    /^self-advocacy\s*:/i.test((s.note || '').trim())
  );
  const teaserComments = [...teacherNotes, ...selfNotes].slice(0, MAX_TEASER_COMMENTS);

  const remainingComments = Math.max(0, unseenCommentsCount - teaserComments.length);
  const remainingStamps = Math.max(0, unseenCount - teaserComments.length);

  const passportLink = `${appUrl.replace(/\/$/, '')}/#/passport`;

  const subjectLine =
    unseenCommentsCount > 0
      ? `${firstName}, you have ${unseenCount} new stamps & teacher comments waiting in Values Passport!`
      : `${firstName}, you have ${unseenCount} new stamps waiting in your Values Passport!`;

  const valuePillsHtml = valueCounts
    .map(({ value, count }) => {
      const palette = VALUE_HEX[value] || {
        bg: '#f3f4f6',
        text: '#1f2937',
        border: '#e5e7eb',
      };
      return `<span style="display:inline-block;margin:3px 6px 3px 0;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:700;background:${palette.bg};color:${palette.text};border:1px solid ${palette.border};">${escapeHtmlStr(
        `${value}: +${count}`
      )}</span>`;
    })
    .join('');

  const teaserCardsHtml = teaserComments
    .map((c) => {
      const palette = VALUE_HEX[c.value] || {
        bg: '#f3f4f6',
        text: '#1f2937',
        border: '#e5e7eb',
      };
      return `<div style="margin-bottom:12px;padding:14px 16px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;"><div style="margin-bottom:6px;"><span style="font-weight:700;color:#111827;font-size:14px;">${escapeHtmlStr(
        c.subject || 'School'
      )}</span><span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:${
        palette.bg
      };color:${palette.text};border:1px solid ${palette.border};">${escapeHtmlStr(
        c.value || ''
      )}</span>${
        c.subValue
          ? `<span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#eff6ff;color:#1e40af;">${escapeHtmlStr(
              c.subValue
            )}</span>`
          : ''
      }<span style="float:right;font-size:12px;color:#6b7280;">${escapeHtmlStr(
        formatShortDate(c.timestamp)
      )}</span></div><div style="font-size:12px;color:#4b5563;margin-bottom:8px;">Awarded by <strong>${escapeHtmlStr(
        c.teacherName || 'Teacher'
      )}</strong></div><div style="background:#ffffff;border-left:3px solid #10b981;padding:10px 12px;border-radius:0 8px 8px 0;font-size:14px;color:#374151;line-height:1.5;">&ldquo;${escapeHtmlStr(
        (c.note || '').trim()
      )}&rdquo;</div></div>`;
    })
    .join('');

  const moreWaitingHtml =
    remainingComments > 0
      ? `<div style="margin:14px 0 20px 0;padding:14px 16px;border-radius:12px;background:#ecfdf5;border:1px dashed #10b981;text-align:center;"><div style="font-size:14px;font-weight:800;color:#065f46;">+ ${remainingComments} more teacher comment${
          remainingComments === 1 ? '' : 's'
        } and ${remainingStamps} stamp${
          remainingStamps === 1 ? '' : 's'
        } waiting inside!</div><div style="font-size:13px;color:#047857;margin-top:4px;">Sign in to your Values Passport to read every comment and check your Achievement progress.</div></div>`
      : remainingStamps > 0
      ? `<div style="margin:14px 0 20px 0;padding:14px 16px;border-radius:12px;background:#ecfdf5;border:1px dashed #10b981;text-align:center;"><div style="font-size:14px;font-weight:800;color:#065f46;">+ ${remainingStamps} more new stamp${
          remainingStamps === 1 ? '' : 's'
        } waiting in your Passport grid!</div><div style="font-size:13px;color:#047857;margin-top:4px;">Log back in to see which subjects and values you unlocked.</div></div>`
      : '';

  const htmlBody = `<div style="max-width:640px;margin:0 auto;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;"><div style="background:#065f46;color:#ffffff;padding:22px 28px;border-bottom:4px solid #facc15;"><div style="font-size:20px;font-weight:800;letter-spacing:-0.01em;">Sathya Sai College</div><div style="font-size:11px;color:#a7f3d0;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;margin-top:2px;">Values Passport &bull; Stamps Waiting For You</div></div><div style="padding:28px;"><p style="font-size:16px;margin:0 0 14px 0;">Hi <strong>${escapeHtmlStr(
    firstName
  )}</strong>,</p><p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 18px 0;">While you&rsquo;ve been away from the app, your teachers have been noticing and celebrating the positive values you bring to school. You have <strong>${unseenCount} new Values Passport stamps</strong>${
    unseenCommentsCount > 0
      ? ` (including <strong>${unseenCommentsCount} personal comment${
          unseenCommentsCount === 1 ? '' : 's'
        }</strong>)`
      : ''
  } waiting for you!</p><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin:20px 0;"><div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#065f46;margin-bottom:8px;">New Recognition Since Your Last Visit</div><div style="font-size:24px;font-weight:900;color:#111827;margin-bottom:10px;">${unseenCount} New Stamps Earned</div>${
    valuePillsHtml ? `<div style="margin-bottom:10px;">${valuePillsHtml}</div>` : ''
  }${
    subjects.length > 0
      ? `<div style="font-size:13px;color:#4b5563;"><strong>Recognised in:</strong> ${escapeHtmlStr(
          subjects.join(', ')
        )}</div>`
      : ''
  }</div>${
    teaserComments.length > 0
      ? `<h3 style="font-size:15px;font-weight:800;color:#1e3a8a;margin:22px 0 10px 0;">Sneak Peek at Your Teacher Comments</h3>${teaserCardsHtml}`
      : ''
  }${moreWaitingHtml}<div style="text-align:center;margin:26px 0 22px 0;"><a href="${escapeHtmlStr(
    passportLink
  )}" style="display:inline-block;background:#059669;color:#ffffff;font-weight:800;font-size:15px;padding:14px 28px;border-radius:999px;text-decoration:none;border-bottom:3px solid #047857;">Open My Values Passport &rarr;</a><div style="font-size:12px;color:#6b7280;margin-top:8px;">Sign in with your school Microsoft 365 account to view your full passport, claim rewards, and play Values Lab games.</div></div><div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#4b5563;">Keep up the great work,<br/><strong style="color:#065f46;">Sathya Sai College Secondary Team</strong><div style="font-size:11px;color:#6b7280;margin-top:6px;">Questions? Contact the Secondary School office: <a href="mailto:${escapeHtmlStr(
    replyToEmail
  )}" style="color:#065f46;">${escapeHtmlStr(replyToEmail)}</a></div></div></div></div>`;

  return {
    studentId,
    studentName,
    firstName,
    studentEmail,
    studentGrade,
    lastLoginAt,
    unseenCount,
    unseenCommentsCount,
    teaserComments,
    valueCounts,
    subjects,
    subjectLine,
    htmlBody,
  };
}
