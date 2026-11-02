import { format } from 'date-fns';
import { CORE_VALUES } from '../constants';
import { CoreValue, Signature, Student } from '../types';

export type RecapTier = 'HIGH' | 'MODERATE' | 'LIGHT' | 'NONE';
export type RecapTemplateMode = 'AUTO' | 'HIGH' | 'MODERATE' | 'LIGHT' | 'UNIVERSAL';
export type CommentNominationKind = 'TEACHER' | 'SELF' | 'PEER';

export const DEFAULT_SENDER_EMAIL = 'noreply-VP@sathyasai.nsw.edu.au';
export const DEFAULT_SECONDARY_REPLY_TO_EMAIL = 'schooloffice_d@sathyasai.nsw.edu.au';

export const MAX_RECAP_COMMENTS = 10;
export const MAX_SELF_NOMINATED_COMMENTS = 1;
export const MAX_PEER_NOMINATED_COMMENTS = 2;

export interface RecapEmailOptions {
  templateMode: RecapTemplateMode;
  includeStampCounts: boolean;
  prioritizeIndividualNotes: boolean;
  excludedCommentIds?: Set<string>;
  replyToEmail?: string;
}

export interface StudentRecapSummary {
  student: Student;
  firstName: string;
  parentSalutation: string;
  parentEmail: string;
  senderEmail: string;
  replyToEmail: string;
  tier: RecapTier;
  effectiveTier: Exclude<RecapTier, 'NONE'> | 'UNIVERSAL';
  totalStamps: number;
  valueCounts: { value: CoreValue; count: number }[];
  subjects: string[];
  comments: Signature[];
  allCommentsNewestFirst: Signature[];
  subjectLine: string;
  introParagraphs: string[];
  closingParagraphs: string[];
  plainText: string;
  inlineHtml: string;
}

const VALUE_HEX: Record<
  CoreValue,
  { bg: string; text: string; border: string }
> = {
  [CoreValue.TRUTH]: { bg: '#dbeafe', text: '#1e3a8a', border: '#bfdbfe' },
  [CoreValue.LOVE]: { bg: '#fce7f3', text: '#831843', border: '#fbcfe8' },
  [CoreValue.PEACE]: { bg: '#ccfbf1', text: '#134e4a', border: '#99f6e4' },
  [CoreValue.RIGHT_CONDUCT]: { bg: '#d1fae5', text: '#064e3b', border: '#a7f3d0' },
  [CoreValue.NON_VIOLENCE]: { bg: '#ffedd5', text: '#7c2d12', border: '#fed7aa' },
};

export function getRecapTier(stampCount: number): RecapTier {
  if (stampCount >= 25) return 'HIGH';
  if (stampCount >= 8) return 'MODERATE';
  if (stampCount >= 1) return 'LIGHT';
  return 'NONE';
}

export function getRecapTierLabel(tier: RecapTier): string {
  switch (tier) {
    case 'HIGH':
      return 'Tier 1: High (25+ stamps)';
    case 'MODERATE':
      return 'Tier 2: Moderate (8–24)';
    case 'LIGHT':
      return 'Tier 3: Light (1–7)';
    case 'NONE':
      return 'No stamps yet';
  }
}

/**
 * Detects whether a stamp note came from a Self-Advocacy request, a Peer Nomination, or directly from a Teacher.
 */
export function getCommentNominationKind(sig: Signature): CommentNominationKind {
  const note = (sig.note || '').trim();
  if (/^self-advocacy\s*:/i.test(note)) return 'SELF';
  if (/^nominated by\s+/i.test(note)) return 'PEER';
  return 'TEACHER';
}

function getStudentFirstName(fullName: string): string {
  const trimmed = (fullName || '').trim();
  const spaceIdx = trimmed.indexOf(' ');
  return spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
}

function nextYearGradeLabel(grade: string): string | null {
  const match = grade.match(/Year\s+(\d+)/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  if (num >= 7 && num < 12) return `Year ${num + 1}`;
  return null;
}

/**
 * Identifies notes that were awarded identically to 3+ students within a 5-minute window
 * so admins can optionally prioritize 1-on-1 personal teacher comments.
 */
export function buildBulkSignatureIdSet(allSignatures: Signature[]): Set<string> {
  const groups = new Map<string, Signature[]>();
  for (const sig of allSignatures) {
    const noteKey = (sig.note || '').trim().toLowerCase();
    if (!noteKey) continue;
    const timeBucket = Math.floor((sig.timestamp || 0) / (5 * 60 * 1000));
    const key = `${sig.teacherName}|${sig.subject}|${sig.value}|${noteKey}|${timeBucket}`;
    const list = groups.get(key) ?? [];
    list.push(sig);
    groups.set(key, list);
  }
  const bulkIds = new Set<string>();
  for (const list of groups.values()) {
    if (list.length >= 3) {
      for (const s of list) bulkIds.add(s.id);
    }
  }
  return bulkIds;
}

export function formatCommentDate(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return '2026';
  return format(new Date(timestamp), 'd MMM yyyy');
}

/**
 * Selects up to MAX_RECAP_COMMENTS (10) comments ordered newest-first,
 * enforcing max 1 self-nominated comment and max 2 peer-nominated comments.
 */
export function selectRecapComments(
  allWithNotesNewestFirst: Signature[],
  bulkSignatureIds: Set<string>,
  options: Pick<RecapEmailOptions, 'prioritizeIndividualNotes' | 'excludedCommentIds'>
): Signature[] {
  const excluded = options.excludedCommentIds ?? new Set<string>();
  const available = allWithNotesNewestFirst.filter((s) => !excluded.has(s.id));

  let candidatePool = available;
  if (options.prioritizeIndividualNotes && available.length > 4) {
    const individualOnly = available.filter((s) => !bulkSignatureIds.has(s.id));
    if (individualOnly.length >= 3) {
      // Put individual notes first (newest-first), then bulk notes if still needed to fill
      const bulkOnly = available.filter((s) => bulkSignatureIds.has(s.id));
      candidatePool = [...individualOnly, ...bulkOnly];
    }
  }

  const selected: Signature[] = [];
  let selfCount = 0;
  let peerCount = 0;

  for (const sig of candidatePool) {
    if (selected.length >= MAX_RECAP_COMMENTS) break;
    const kind = getCommentNominationKind(sig);
    if (kind === 'SELF') {
      if (selfCount >= MAX_SELF_NOMINATED_COMMENTS) continue;
      selfCount++;
    } else if (kind === 'PEER') {
      if (peerCount >= MAX_PEER_NOMINATED_COMMENTS) continue;
      peerCount++;
    }
    selected.push(sig);
  }

  // Keep final selected list strictly newest-first
  return selected.sort((a, b) => b.timestamp - a.timestamp);
}

export function buildStudentRecapSummary(
  student: Student,
  studentSignatures: Signature[],
  bulkSignatureIds: Set<string>,
  options: RecapEmailOptions
): StudentRecapSummary {
  const firstName = getStudentFirstName(student.name);
  const parentSalutation = student.parentName?.trim() || `Family of ${student.name}`;
  const parentEmail = student.parentEmail?.trim() || '';
  const senderEmail = DEFAULT_SENDER_EMAIL;
  const replyToEmail = (options.replyToEmail || DEFAULT_SECONDARY_REPLY_TO_EMAIL).trim();

  // Newest first
  const sortedSigs = [...studentSignatures].sort((a, b) => b.timestamp - a.timestamp);
  const totalStamps = sortedSigs.length;
  const tier = getRecapTier(totalStamps);

  const effectiveTier: Exclude<RecapTier, 'NONE'> | 'UNIVERSAL' =
    options.templateMode === 'AUTO'
      ? tier === 'NONE'
        ? 'LIGHT'
        : tier
      : options.templateMode;

  const valueCountsMap = new Map<CoreValue, number>();
  (Object.keys(CORE_VALUES) as CoreValue[]).forEach((v) => valueCountsMap.set(v, 0));
  const subjectSet = new Set<string>();

  for (const sig of sortedSigs) {
    valueCountsMap.set(sig.value, (valueCountsMap.get(sig.value) ?? 0) + 1);
    if (sig.subject) subjectSet.add(sig.subject);
  }

  const valueCounts = [...valueCountsMap.entries()]
    .filter(([, count]) => count > 0)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  const subjects = [...subjectSet];
  const allCommentsNewestFirst = sortedSigs.filter((s) => Boolean(s.note && s.note.trim()));
  const comments = selectRecapComments(allCommentsNewestFirst, bulkSignatureIds, options);

  const topValuesNames = valueCounts.slice(0, 2).map((v) => v.value).join(' and ');
  const nextGrade = nextYearGradeLabel(student.grade);

  let subjectLine = `${firstName}’s 2026 Values Passport Year-in-Review — Sathya Sai College`;
  let introParagraphs: string[] = [];
  let closingParagraphs: string[] = [];

  if (effectiveTier === 'HIGH') {
    subjectLine = `Celebrating ${firstName}’s 2026 Values Passport Journey — Sathya Sai College`;
    introParagraphs = [
      `As we bring the 2026 school year to a close at Sathya Sai College, we want to share a special recap of ${firstName}’s progress in our Values Passport program.`,
      `Throughout ${student.grade}, teachers across the college have consistently recognised ${firstName} for living out our core Human Values — Truth, Love, Peace, Right Conduct, and Non-Violence — both in the classroom and in the wider school community.`,
    ];
    closingParagraphs = [
      `Thank you for the partnership and support you provide at home in nurturing these qualities. We encourage you to read through these comments with ${firstName} over the holidays and celebrate the character they bring to our school community every day.`,
    ];
  } else if (effectiveTier === 'MODERATE') {
    subjectLine = `${firstName}’s 2026 Values Passport Recap & Teacher Comments`;
    const countPhrase = options.includeStampCounts
      ? `earned ${totalStamps} Values Passport stamps across ${subjects.length} subjects and school settings`
      : `was recognised across ${subjects.length} subjects and school settings`;
    introParagraphs = [
      `As we wrap up the 2026 school year at Sathya Sai College, we are delighted to share a look back at ${firstName}’s journey with the Values Passport this year in ${student.grade}.`,
      `The Values Passport isn't just about counting points — it is about noticing and celebrating the everyday moments where students choose kindness, integrity, calm, and responsibility. This year, ${firstName} ${countPhrase}${topValuesNames ? `, with particular strengths in ${topValuesNames}` : ''}.`,
    ];
    closingParagraphs = [
      `Every one of these moments reflects the positive spirit ${firstName} brings to ${student.grade}. We hope you enjoy sharing these reflections together as a family and celebrating ${firstName}’s growth this year.`,
    ];
  } else if (effectiveTier === 'LIGHT') {
    subjectLine = `Moments of Character: ${firstName}’s 2026 Values Passport Reflections`;
    introParagraphs = [
      `As we conclude the 2026 school year at Sathya Sai College, we wanted to share some special reflections from ${firstName}’s teachers recorded in the Values Passport during ${student.grade}.`,
      `Throughout the year, our staff look for genuine moments where students demonstrate our core Human Values — Truth, Love, Peace, Right Conduct, and Non-Violence — whether through a quiet act of kindness, steady focus in class, or lending a hand to others.`,
    ];
    closingParagraphs = [
      nextGrade
        ? `As ${firstName} steps into ${nextGrade} next year, we look forward to seeing them continue to build confidence, use the Values Passport to set personal goals, and share their strengths across the school.`
        : `We thank ${firstName} for the positive moments shared with our school community this year and wish them every success ahead.`,
      `Thank you for your ongoing support of our school community, and we wish your family a peaceful and happy holiday break.`,
    ];
  } else {
    subjectLine = `${firstName}’s 2026 Values Passport Year-in-Review`;
    introParagraphs = [
      `As the 2026 school year comes to a close at Sathya Sai College, we would like to share a recap of ${firstName}’s Values Passport from ${student.grade}.`,
      `Over the course of the year, our teachers have awarded stamps to recognise moments where ${firstName} put our five core Human Values — Truth, Love, Peace, Right Conduct, and Non-Violence — into practice.`,
    ];
    closingParagraphs = [
      `We encourage you to share these moments with ${firstName} as you reflect on the year together. Thank you for partnering with us to nurture character, kindness, and excellence in our students.`,
    ];
  }

  const showCountsInSnapshot = options.includeStampCounts && effectiveTier !== 'LIGHT';
  const snapshotLines: string[] = [];
  if (showCountsInSnapshot) {
    snapshotLines.push(`• Total Values Stamps Earned: ${totalStamps} stamps`);
    snapshotLines.push(
      `• Values Demonstrated: ${valueCounts.map((v) => `${v.value} (${v.count})`).join(', ') || 'None yet'}`
    );
  } else {
    snapshotLines.push(
      `• Values Demonstrated: ${valueCounts.map((v) => v.value).join(', ') || 'None yet'}`
    );
  }
  snapshotLines.push(`• Subjects & Settings: ${subjects.join(', ') || 'None recorded'}`);

  const commentLines =
    comments.length > 0
      ? comments
          .map(
            (c) =>
              `• ${c.value}${c.subValue ? ` (${c.subValue})` : ''} in ${c.subject} — ${c.teacherName} (${formatCommentDate(c.timestamp)})\n  "${(c.note || '').trim()}"`
          )
          .join('\n\n')
      : '• No written teacher comments recorded for this period.';

  const plainText = [
    `From: Sathya Sai College Values Passport <${senderEmail}>`,
    `Reply-To: Sathya Sai College Secondary School <${replyToEmail}>`,
    `To: ${parentSalutation}${parentEmail ? ` <${parentEmail}>` : ''}`,
    `Subject: ${subjectLine}`,
    '',
    `Dear ${parentSalutation},`,
    '',
    ...introParagraphs.flatMap((p) => [p, '']),
    `${firstName}’s 2026 Snapshot:`,
    ...snapshotLines,
    '',
    `Teacher Comments & Recognition Notes (Newest First):`,
    '',
    commentLines,
    '',
    ...closingParagraphs.flatMap((p) => [p, '']),
    'Warm regards,',
    'Sathya Sai College Secondary Team',
    `Secondary School Office: ${replyToEmail}`,
  ].join('\n');

  const inlineHtml = buildInlineHtmlEmail({
    firstName,
    student,
    parentSalutation,
    replyToEmail,
    introParagraphs,
    closingParagraphs,
    showCountsInSnapshot,
    totalStamps,
    valueCounts,
    subjects,
    comments,
  });

  return {
    student,
    firstName,
    parentSalutation,
    parentEmail,
    senderEmail,
    replyToEmail,
    tier,
    effectiveTier,
    totalStamps,
    valueCounts,
    subjects,
    comments,
    allCommentsNewestFirst,
    subjectLine,
    introParagraphs,
    closingParagraphs,
    plainText,
    inlineHtml,
  };
}

function escapeHtmlStr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildInlineHtmlEmail(params: {
  firstName: string;
  student: Student;
  parentSalutation: string;
  replyToEmail: string;
  introParagraphs: string[];
  closingParagraphs: string[];
  showCountsInSnapshot: boolean;
  totalStamps: number;
  valueCounts: { value: CoreValue; count: number }[];
  subjects: string[];
  comments: Signature[];
}): string {
  const {
    firstName,
    student,
    parentSalutation,
    replyToEmail,
    introParagraphs,
    closingParagraphs,
    showCountsInSnapshot,
    totalStamps,
    valueCounts,
    subjects,
    comments,
  } = params;

  const valuePillsHtml = valueCounts
    .map(({ value, count }) => {
      const palette = VALUE_HEX[value] || { bg: '#f3f4f6', text: '#1f2937', border: '#e5e7eb' };
      const label = showCountsInSnapshot ? `${value}: ${count}` : value;
      return `<span style="display:inline-block;margin:3px 6px 3px 0;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:700;background:${palette.bg};color:${palette.text};border:1px solid ${palette.border};">${escapeHtmlStr(label)}</span>`;
    })
    .join('');

  const commentsHtml = comments
    .map((c) => {
      const palette = VALUE_HEX[c.value] || { bg: '#f3f4f6', text: '#1f2937', border: '#e5e7eb' };
      return `<div style="margin-bottom:14px;padding:14px 16px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;"><div style="margin-bottom:6px;"><span style="font-weight:700;color:#111827;font-size:14px;">${escapeHtmlStr(c.subject)}</span><span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:${palette.bg};color:${palette.text};border:1px solid ${palette.border};">${escapeHtmlStr(c.value)}</span>${c.subValue ? `<span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#eff6ff;color:#1e40af;">${escapeHtmlStr(c.subValue)}</span>` : ''}<span style="float:right;font-size:12px;color:#6b7280;">${escapeHtmlStr(formatCommentDate(c.timestamp))}</span></div><div style="font-size:12px;color:#4b5563;margin-bottom:8px;">Awarded by <strong>${escapeHtmlStr(c.teacherName)}</strong></div><div style="background:#ffffff;border-left:3px solid #10b981;padding:10px 12px;border-radius:0 8px 8px 0;font-size:14px;color:#374151;line-height:1.5;">&ldquo;${escapeHtmlStr((c.note || '').trim())}&rdquo;</div></div>`;
    })
    .join('');

  return `<div style="max-width:680px;margin:0 auto;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;"><div style="background:#065f46;color:#ffffff;padding:22px 28px;border-bottom:4px solid #facc15;"><div style="font-size:20px;font-weight:800;letter-spacing:-0.01em;">Sathya Sai College</div><div style="font-size:11px;color:#a7f3d0;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;margin-top:2px;">Values Passport &bull; 2026 Family Year-in-Review</div></div><div style="padding:28px;"><p style="font-size:15px;margin:0 0 16px 0;">Dear <strong>${escapeHtmlStr(parentSalutation)}</strong>,</p>${introParagraphs.map((p) => `<p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 14px 0;">${escapeHtmlStr(p)}</p>`).join('')}<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin:20px 0;"><div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:#065f46;margin-bottom:10px;">${escapeHtmlStr(firstName)}’s 2026 Values Passport (${escapeHtmlStr(student.grade)})</div>${showCountsInSnapshot ? `<div style="font-size:14px;color:#1f2937;margin-bottom:10px;"><strong>Total Stamps Earned:</strong> ${totalStamps}</div>` : ''}<div style="margin-bottom:10px;">${valuePillsHtml}</div><div style="font-size:13px;color:#4b5563;"><strong>Settings Recognised:</strong> ${escapeHtmlStr(subjects.join(', ') || 'None recorded')}</div></div><h3 style="font-size:16px;font-weight:800;color:#1e3a8a;margin:24px 0 12px 0;">Teacher Comments &amp; Recognition Notes</h3>${commentsHtml}${closingParagraphs.map((p) => `<p style="font-size:15px;line-height:1.6;color:#374151;margin:16px 0 0 0;">${escapeHtmlStr(p)}</p>`).join('')}<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:14px;color:#374151;">Warm regards,<br/><strong style="color:#065f46;">Sathya Sai College Secondary Team</strong><div style="font-size:12px;color:#6b7280;margin-top:6px;">Replies to this email are directed to the Secondary School office: <a href="mailto:${escapeHtmlStr(replyToEmail)}" style="color:#065f46;">${escapeHtmlStr(replyToEmail)}</a></div></div></div></div>`;
}
