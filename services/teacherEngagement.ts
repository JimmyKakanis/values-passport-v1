import { CoreValue, Signature } from '../types';
import {
  getCurrentTermForDate,
  getFortnightRange,
  getLast7DaysRange,
  getLocalWeekRange,
  getSchoolDaysInInterval,
  isTimestampInRange,
  isTimestampInSchoolTerm,
} from '../schoolCalendar';
import { startOfDay, endOfDay, getISOWeek, getISOWeekYear } from 'date-fns';
import {
  getValuesIntegrationFocus,
  type ValuesIntegrationFocus,
} from '../valuesIntegrationCalendar2026';

export { getValuesIntegrationFocus } from '../valuesIntegrationCalendar2026';
export type { ValuesIntegrationFocus } from '../valuesIntegrationCalendar2026';

const BATCH_WINDOW_MS = 2 * 60 * 1000;

export type TeacherEngagementBadgeCategory =
  | 'first_steps'
  | 'breadth'
  | 'reach'
  | 'quality'
  | 'streak';

export interface TeacherEngagementBadgeDef {
  id: string;
  title: string;
  description: string;
  category: TeacherEngagementBadgeCategory;
}

export const TEACHER_ENGAGEMENT_BADGES: TeacherEngagementBadgeDef[] = [
  {
    id: 'first_stamp_term',
    title: 'Term underway',
    description: 'Gave your first stamp this term.',
    category: 'first_steps',
  },
  {
    id: 'first_bulk',
    title: 'Batch star',
    description: 'Awarded stamps to more than one student in a single batch.',
    category: 'first_steps',
  },
  {
    id: 'first_nomination_approved',
    title: 'Request champion',
    description: 'Approved your first student nomination.',
    category: 'first_steps',
  },
  {
    id: 'all_five_values_week',
    title: 'Full values spread',
    description: 'This week, awarded stamps in all five core values.',
    category: 'breadth',
  },
  {
    id: 'three_subjects_week',
    title: 'Across contexts',
    description: 'This week, used three or more different subjects/contexts.',
    category: 'breadth',
  },
  {
    id: 'ten_students_fortnight',
    title: 'Wide reach',
    description: 'In the last 14 days, recognised 10 or more different students.',
    category: 'reach',
  },
  {
    id: 'five_notes_week',
    title: 'Thoughtful notes',
    description: 'This week, left a note on five or more stamps.',
    category: 'quality',
  },
  {
    id: 'three_school_days_active_week',
    title: 'Steady rhythm',
    description: 'This week, awarded on at least three school days (Mon–Fri).',
    category: 'streak',
  },
  {
    id: 'values_variety_week',
    title: 'Fresh lens',
    description:
      'On each day you stamped this week, you used at least one value you had not used earlier in the week.',
    category: 'streak',
  },
];

export interface TeacherEngagementStats {
  firstStampThisTerm: boolean;
  hadBulkAward: boolean;
  hadNominationApproved: boolean;
  allFiveValuesThisWeek: boolean;
  threeSubjectsThisWeek: boolean;
  tenStudentsFortnight: boolean;
  fiveNotesThisWeek: boolean;
  threeSchoolDaysActiveThisWeek: boolean;
  valuesVarietyThisWeek: boolean;
  isComebackEligible: boolean;
  activeSchoolDaysThisWeek: number;
  impactUniqueStudents7d: number;
  impactNewStudentRelationships7d: number;
}

function isNominationSignature(s: Signature): boolean {
  if (s.source === 'NOMINATION') return true;
  const n = (s.note || '').trim();
  return n.startsWith('Self-Advocacy') || n.startsWith('Nominated by');
}

function isSameBatch(a: Signature, b: Signature): boolean {
  return (
    a.subject === b.subject &&
    a.value === b.value &&
    (a.subValue || '') === (b.subValue || '') &&
    (a.note || '') === (b.note || '') &&
    Math.abs(a.timestamp - b.timestamp) < BATCH_WINDOW_MS
  );
}

/** True if any batch of 2+ stamps shares subject/value/note within 2 minutes. */
export function detectHadBulkAward(signatures: Signature[]): boolean {
  if (signatures.length < 2) return false;
  const sorted = [...signatures].sort((a, b) => a.timestamp - b.timestamp);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && isSameBatch(sorted[j], sorted[j + 1])) {
      j++;
    }
    if (j - i + 1 >= 2) return true;
    i = j + 1;
  }
  return false;
}

/**
 * Each stamped calendar day (chronological) must introduce at least one core value
 * not seen on any earlier stamped day this week. Requires at least two stamped days.
 */
export function valuesVarietyWeekMet(signaturesInWeek: Signature[]): boolean {
  const byDay = new Map<number, Set<CoreValue>>();
  for (const s of signaturesInWeek) {
    const k = startOfDay(new Date(s.timestamp)).getTime();
    if (!byDay.has(k)) byDay.set(k, new Set());
    byDay.get(k)!.add(s.value);
  }
  const dayKeys = [...byDay.keys()].sort((a, b) => a - b);
  if (dayKeys.length < 2) return false;
  const cumulative = new Set<CoreValue>();
  for (const dayTs of dayKeys) {
    const today = byDay.get(dayTs)!;
    let introduced = false;
    for (const v of today) {
      if (!cumulative.has(v)) {
        introduced = true;
        cumulative.add(v);
      }
    }
    if (!introduced) return false;
  }
  return true;
}

export function computeTeacherEngagementStats(
  signatures: Signature[],
  now: Date = new Date()
): TeacherEngagementStats {
  const term = getCurrentTermForDate(now);
  const firstStampThisTerm = term
    ? signatures.some((s) => isTimestampInSchoolTerm(s.timestamp, term))
    : false;

  const hadBulkAward = detectHadBulkAward(signatures);
  const hadNominationApproved = signatures.some(isNominationSignature);

  const { start: wStart, end: wEnd } = getLocalWeekRange(now);
  const sigsThisWeek = signatures.filter((s) =>
    isTimestampInRange(s.timestamp, wStart, wEnd)
  );

  const distinctValues = new Set(sigsThisWeek.map((s) => s.value));
  const allFiveValuesThisWeek = distinctValues.size >= 5;

  const distinctSubjects = new Set(sigsThisWeek.map((s) => s.subject));
  const threeSubjectsThisWeek = distinctSubjects.size >= 3;

  const notesThisWeek = sigsThisWeek.filter((s) => (s.note || '').trim().length > 0).length;
  const fiveNotesThisWeek = notesThisWeek >= 5;

  const { start: fStart, end: fEnd } = getFortnightRange(now);
  const sigsFortnight = signatures.filter((s) =>
    isTimestampInRange(s.timestamp, fStart, fEnd)
  );
  const distinctStudentsFortnight = new Set(sigsFortnight.map((s) => s.studentId));
  const tenStudentsFortnight = distinctStudentsFortnight.size >= 10;

  const schoolDays = getSchoolDaysInInterval(wStart, wEnd);
  let activeSchoolDaysThisWeek = 0;
  for (const day of schoolDays) {
    const ds = startOfDay(day).getTime();
    const de = endOfDay(day).getTime();
    if (signatures.some((s) => s.timestamp >= ds && s.timestamp <= de)) {
      activeSchoolDaysThisWeek++;
    }
  }
  const threeSchoolDaysActiveThisWeek = activeSchoolDaysThisWeek >= 3;
  const valuesVarietyThisWeek = valuesVarietyWeekMet(sigsThisWeek);

  const lastTs = signatures.reduce((max, s) => Math.max(max, s.timestamp), 0);
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const isComebackEligible =
    signatures.length > 0 && now.getTime() - lastTs >= sevenDaysMs;

  const { start: iStart, end: iEnd } = getLast7DaysRange(now);
  const sigs7 = signatures.filter((s) => isTimestampInRange(s.timestamp, iStart, iEnd));
  const impactUniqueStudents7d = new Set(sigs7.map((s) => s.studentId)).size;

  const firstStampByStudent = new Map<string, number>();
  for (const s of signatures) {
    const prev = firstStampByStudent.get(s.studentId);
    if (prev === undefined || s.timestamp < prev) {
      firstStampByStudent.set(s.studentId, s.timestamp);
    }
  }
  let impactNewStudentRelationships7d = 0;
  const seenNew = new Set<string>();
  for (const s of sigs7) {
    const first = firstStampByStudent.get(s.studentId);
    if (
      first !== undefined &&
      first >= iStart.getTime() &&
      first <= iEnd.getTime() &&
      !seenNew.has(s.studentId)
    ) {
      seenNew.add(s.studentId);
      impactNewStudentRelationships7d++;
    }
  }

  return {
    firstStampThisTerm,
    hadBulkAward,
    hadNominationApproved,
    allFiveValuesThisWeek,
    threeSubjectsThisWeek,
    tenStudentsFortnight,
    fiveNotesThisWeek,
    threeSchoolDaysActiveThisWeek,
    valuesVarietyThisWeek,
    isComebackEligible,
    activeSchoolDaysThisWeek,
    impactUniqueStudents7d,
    impactNewStudentRelationships7d,
  };
}

export function getUnlockedTeacherBadgeIds(stats: TeacherEngagementStats): string[] {
  const ids: string[] = [];
  if (stats.firstStampThisTerm) ids.push('first_stamp_term');
  if (stats.hadBulkAward) ids.push('first_bulk');
  if (stats.hadNominationApproved) ids.push('first_nomination_approved');
  if (stats.allFiveValuesThisWeek) ids.push('all_five_values_week');
  if (stats.threeSubjectsThisWeek) ids.push('three_subjects_week');
  if (stats.tenStudentsFortnight) ids.push('ten_students_fortnight');
  if (stats.fiveNotesThisWeek) ids.push('five_notes_week');
  if (stats.threeSchoolDaysActiveThisWeek) ids.push('three_school_days_active_week');
  if (stats.valuesVarietyThisWeek) ids.push('values_variety_week');
  return ids;
}

const CORE_VALUE_ORDER: CoreValue[] = [
  CoreValue.TRUTH,
  CoreValue.LOVE,
  CoreValue.PEACE,
  CoreValue.RIGHT_CONDUCT,
  CoreValue.NON_VIOLENCE,
];

function hashToIndex(seed: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % modulo;
}

export const DAILY_NUDGE_TEMPLATES: string[] = [
  'Today: catch someone showing **Peace** outside your main subject area.',
  'Today: nominate or award **Right Conduct** for a small act of responsibility.',
  'Today: recognise **Truth**—honest effort on a tricky task counts.',
  'Today: look for **Love** in the yard: inclusion, patience, or helping a peer.',
  'Today: award **Non-Violence** for calming words or walking away from conflict.',
  'Today: use a location context (Playground, Homeroom) for your stamp.',
  'Today: add a short note so the student knows exactly what you saw.',
  'Today: recognise improvement, not only top marks.',
  'Today: spotlight a quiet student who rarely asks for attention.',
  'Today: pair a stamp with homework effort or class participation.',
  'Today: approve a pending nomination if it meets your bar—students notice.',
  'Today: try a value you have not used yet this week.',
  'Today: bulk-award the same value to a group who met a shared goal.',
  'Today: celebrate kindness in the corridor or at the door.',
  'Today: use **Excursions** or **Sport** if the moment happened there.',
];

export const AWARD_EMPTY_PROMPTS: string[] = [
  'Stuck? Try recognising effort on homework, not only perfect scores.',
  'Stuck? Kindness in the yard or corridor counts—use a location subject.',
  'Stuck? Improvement over time is worth a stamp.',
  'Stuck? A short note makes the stamp memorable for the student.',
  'Stuck? Quiet students who do the right thing are easy to overlook—watch for them.',
  'Stuck? Batch-select a group that met a class goal together.',
  'Stuck? Self- and peer nominations in the inbox are prompts from students themselves.',
];

export function pickAwardEmptyPrompt(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const seed = `empty|${y}-${m}-${d}`;
  return AWARD_EMPTY_PROMPTS[hashToIndex(seed, AWARD_EMPTY_PROMPTS.length)];
}

const INTEGRATION_DAILY_VARIANTS: ((f: ValuesIntegrationFocus) => string)[] = [
  (f) =>
    `Spot ${f.coreValue} lived as ${f.subValueLabel} today—in class, the yard, or the corridor.`,
  (f) =>
    `The school focus is ${f.coreValue} (${f.subValueLabel}). A short note on the stamp makes it stick.`,
  (f) =>
    `Look for small wins that show ${f.subValueLabel} under ${f.coreValue}, and recognise them.`,
  (f) =>
    `Tie a stamp to this fortnight's theme: ${f.coreValue} as ${f.subValueLabel}.`,
];

/** When the integration card already names the theme; keeps the milestone strip short. */
const INTEGRATION_DAILY_COMPACT: string[] = [
  'A short note on the stamp helps students remember what you saw.',
  'Look in class, the yard, and the corridor for small wins to recognise.',
  'When it fits, tie a stamp to the whole-school theme shown above.',
  'Prefer a specific behaviour over a generic “good job”—students notice the difference.',
  'Quiet students who do the right thing are easy to overlook—watch for them today.',
];

export interface PickDailyNudgeOptions {
  /** Use with dashboard integration card: no repeat of core/sub value names. */
  compactSchoolFocus?: boolean;
}

export function pickDailyNudge(
  teacherKey: string,
  now: Date = new Date(),
  options?: PickDailyNudgeOptions
): string {
  const focus = getValuesIntegrationFocus(now);
  if (focus) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    if (options?.compactSchoolFocus) {
      const seed = `${teacherKey}|${y}-${m}-${d}|ic`;
      return INTEGRATION_DAILY_COMPACT[hashToIndex(seed, INTEGRATION_DAILY_COMPACT.length)];
    }
    const seed = `${teacherKey}|${y}-${m}-${d}`;
    const idx = hashToIndex(seed, INTEGRATION_DAILY_VARIANTS.length);
    return INTEGRATION_DAILY_VARIANTS[idx](focus);
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seed = `${teacherKey}|${y}-${m}-${d}`;
  const raw = DAILY_NUDGE_TEMPLATES[hashToIndex(seed, DAILY_NUDGE_TEMPLATES.length)];
  return raw.replace(/\*\*(.+?)\*\*/g, '$1');
}

export function pickWeeklyThemeValue(now: Date = new Date()): CoreValue {
  const focus = getValuesIntegrationFocus(now);
  if (focus) return focus.coreValue;
  const idx = (getISOWeekYear(now) * 53 + getISOWeek(now)) % CORE_VALUE_ORDER.length;
  return CORE_VALUE_ORDER[idx];
}

const WEEKLY_THEME_COPY: Record<CoreValue, string> = {
  [CoreValue.TRUTH]: "This week's optional focus: **Truth**—effort, honesty, and curiosity.",
  [CoreValue.LOVE]: "This week's optional focus: **Love**—care, inclusion, and patience.",
  [CoreValue.PEACE]: "This week's optional focus: **Peace**—calm, composure, and regulation.",
  [CoreValue.RIGHT_CONDUCT]: "This week's optional focus: **Right Conduct**—responsibility and integrity.",
  [CoreValue.NON_VIOLENCE]: "This week's optional focus: **Non-Violence**—words and actions that reduce harm.",
};

export function getWeeklyThemeLine(now: Date = new Date()): string {
  const focus = getValuesIntegrationFocus(now);
  if (focus) {
    let line = `School values focus: ${focus.coreValue} lived as ${focus.subValueLabel}. "${focus.quote}"`;
    if (focus.events) {
      line += ` Coming up: ${focus.events}.`;
    }
    return line;
  }
  const v = pickWeeklyThemeValue(now);
  return WEEKLY_THEME_COPY[v].replace(/\*\*(.+?)\*\*/g, '$1');
}

const REFLECTION_PROMPTS = [
  'Who might still need a stamp from you this week—even for something small?',
  'Is there a student you have not recognised yet this term?',
];

export function pickReflectionPrompt(teacherKey: string, now: Date = new Date()): string {
  const y = now.getFullYear();
  const w = getISOWeek(now);
  const seed = `${teacherKey}|${y}-W${w}`;
  return REFLECTION_PROMPTS[hashToIndex(seed, REFLECTION_PROMPTS.length)];
}

const TOAST_STORAGE_KEY = 'vp_teacher_badge_toasts_v1';

function readToastMap(): Record<string, Record<string, boolean>> {
  try {
    const raw = localStorage.getItem(TOAST_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Record<string, boolean>>;
  } catch {
    return {};
  }
}

export function markTeacherBadgeToastSeen(teacherKey: string, badgeId: string): void {
  const map = readToastMap();
  if (!map[teacherKey]) map[teacherKey] = {};
  map[teacherKey][badgeId] = true;
  localStorage.setItem(TOAST_STORAGE_KEY, JSON.stringify(map));
}

export function filterNewBadgeIdsForToast(teacherKey: string, unlockedIds: string[]): string[] {
  const map = readToastMap();
  const seen = map[teacherKey] || {};
  return unlockedIds.filter((id) => !seen[id]);
}
