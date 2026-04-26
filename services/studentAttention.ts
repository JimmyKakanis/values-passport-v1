import { CoreValue, Signature, Student, Subject } from '../types';
import { SUBJECTS } from '../constants';
import {
  getCurrentTermForDate,
  getLast7DaysRange,
  isTimestampInRange,
  isTimestampInSchoolTerm,
  type SchoolTerm,
} from '../schoolCalendar';
import { startOfDay, differenceInCalendarDays } from 'date-fns';

const ALL_CORE_VALUES = Object.values(CoreValue) as CoreValue[];

/** Display names omitted from the attention dashboard (e.g. demo / QA). Matched case-insensitively on trimmed `Student.name`. */
const STUDENT_NAMES_EXCLUDED_FROM_ATTENTION: readonly string[] = ['Student Test'];

export function isIncludedInStudentAttentionRoster(s: Student): boolean {
  const key = s.name.trim().toLowerCase();
  return !STUDENT_NAMES_EXCLUDED_FROM_ATTENTION.some(
    (n) => n.trim().toLowerCase() === key
  );
}

export interface StudentAttentionConfig {
  /** Flag rows where days since last stamp is at least this (if they have at least one stamp). */
  staleDays: number;
  /** Minimum students in a year group before peer-median flags apply. */
  minCohortForPeer: number;
}

export const DEFAULT_STUDENT_ATTENTION_CONFIG: StudentAttentionConfig = {
  staleDays: 14,
  minCohortForPeer: 2,
};

export interface StudentAttentionRow {
  student: Student;
  lastStampAt: number | null;
  /** Large number when the student has never received a stamp. */
  daysSinceLastStamp: number;
  neverStamped: boolean;
  /** All-time count of signature rows for this student. */
  totalStamps: number;
  stamps7d: number;
  stampsThisTerm: number;
  gradeCohortSize: number;
  /** Median 7-day stamp count for this student's grade; 0 if alone in cohort. */
  gradeMedian7d: number;
  isBelowPeerMedian7d: boolean;
  isStale: boolean;
  hasNoStampThisTerm: boolean;
  /** Subjects (from `SUBJECTS`) with no stamp in the current term (empty if not in a term). */
  missingSubjectsThisTerm: Subject[];
  /** Core values with no stamp in the current term. */
  missingValuesThisTerm: CoreValue[];
  /** Subjects never stamped (all time). */
  missingSubjectsEver: Subject[];
  /** Core values never stamped (all time). */
  missingValuesEver: CoreValue[];
  /** Legacy tie-breaker: raw last-stamp ms, or -1 if never. Prefer `sortAttentionRowsByPriority` for ordering. */
  sortKeyLastStamp: number;
  suggestionLines: string[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 === 1) return s[mid]!;
  return (s[mid - 1]! + s[mid]!) / 2;
}

function signaturesForStudent(signatures: Signature[], studentId: string): Signature[] {
  return signatures.filter((sig) => sig.studentId === studentId);
}

function countInRange(sigs: Signature[], start: Date, end: Date): number {
  return sigs.filter((s) => isTimestampInRange(s.timestamp, start, end)).length;
}

function countThisTerm(
  sigs: Signature[],
  now: Date
): { count: number; term: SchoolTerm | null } {
  const term = getCurrentTermForDate(now);
  if (!term) return { count: 0, term: null };
  return {
    count: sigs.filter((s) => isTimestampInSchoolTerm(s.timestamp, term)).length,
    term,
  };
}

function collectSubjects(sigs: Signature[]): Set<Subject> {
  return new Set(sigs.map((s) => s.subject as Subject));
}

function collectValues(sigs: Signature[]): Set<CoreValue> {
  return new Set(sigs.map((s) => s.value));
}

function collectSubjectsThisTerm(
  sigs: Signature[],
  term: SchoolTerm
): Set<Subject> {
  return new Set(
    sigs
      .filter((s) => isTimestampInSchoolTerm(s.timestamp, term))
      .map((s) => s.subject as Subject)
  );
}

function collectValuesThisTerm(
  sigs: Signature[],
  term: SchoolTerm
): Set<CoreValue> {
  return new Set(
    sigs
      .filter((s) => isTimestampInSchoolTerm(s.timestamp, term))
      .map((s) => s.value)
  );
}

function buildSuggestions(row: StudentAttentionRow, config: StudentAttentionConfig): string[] {
  const lines: string[] = [];
  if (row.neverStamped) {
    lines.push('No stamps yet — consider recognising something they already do well.');
  } else if (row.isStale) {
    lines.push(
      `No stamp in the last ${config.staleDays} days — a small acknowledgement can go a long way.`
    );
  }
  if (row.isBelowPeerMedian7d && row.gradeCohortSize >= config.minCohortForPeer) {
    lines.push(
      `Fewer stamps than most of ${row.student.grade} in the last 7 days (peer median: ${row.gradeMedian7d === Math.floor(row.gradeMedian7d) ? row.gradeMedian7d : row.gradeMedian7d.toFixed(1)}).`
    );
  }
  if (row.hasNoStampThisTerm) {
    lines.push('No recognition logged this term yet.');
  }
  if (row.missingValuesThisTerm.length > 0) {
    const v = row.missingValuesThisTerm.slice(0, 3);
    const more =
      row.missingValuesThisTerm.length > 3
        ? ` +${row.missingValuesThisTerm.length - 3} more`
        : '';
    lines.push(`Haven’t been recognised for: ${v.join(', ')}${more} (this term).`);
  }
  if (row.missingSubjectsThisTerm.length > 0) {
    const v = row.missingSubjectsThisTerm.slice(0, 4);
    const more =
      row.missingSubjectsThisTerm.length > 4
        ? ` +${row.missingSubjectsThisTerm.length - 4} more`
        : '';
    lines.push(`No stamp yet in: ${v.join(', ')}${more} (this term).`);
  }
  if (
    !row.neverStamped &&
    row.missingValuesEver.length > 0 &&
    row.missingValuesThisTerm.length === 0
  ) {
    const v = row.missingValuesEver.slice(0, 3);
    lines.push(`Not yet recognised for: ${v.join(', ')} (all time).`);
  }
  if (
    !row.neverStamped &&
    row.missingSubjectsEver.length > 0 &&
    row.missingSubjectsThisTerm.length === 0
  ) {
    const v = row.missingSubjectsEver.slice(0, 4);
    lines.push(`Not yet recognised in: ${v.join(', ')} (all time).`);
  }
  return lines;
}

/**
 * If `assignedGrades` is non-empty, only students in those grades; otherwise the full roster.
 */
export function filterStudentsByTeacherGrades(
  students: Student[],
  assignedGrades?: string[] | null
): Student[] {
  if (!assignedGrades || assignedGrades.length === 0) return students;
  const g = new Set(assignedGrades);
  return students.filter((s) => g.has(s.grade));
}

/**
 * In-memory attention metrics for the staff dashboard (MVP: full signature list, ~school scale).
 */
export function buildStudentAttentionRows(
  students: Student[],
  signatures: Signature[],
  now: Date = new Date(),
  config: StudentAttentionConfig = DEFAULT_STUDENT_ATTENTION_CONFIG
): StudentAttentionRow[] {
  const roster = students.filter(isIncludedInStudentAttentionRoster);
  const range7d = getLast7DaysRange(now);

  const byGrade = new Map<string, Student[]>();
  for (const s of roster) {
    const g = s.grade;
    if (!byGrade.has(g)) byGrade.set(g, []);
    byGrade.get(g)!.push(s);
  }

  const count7dByStudentId = new Map<string, number>();
  for (const s of roster) {
    const sigs = signaturesForStudent(signatures, s.id);
    count7dByStudentId.set(s.id, countInRange(sigs, range7d.start, range7d.end));
  }

  const median7dByGrade = new Map<string, number>();
  for (const [grade, group] of byGrade) {
    const counts = group.map((st) => count7dByStudentId.get(st.id) ?? 0);
    median7dByGrade.set(grade, median(counts));
  }

  const rows: StudentAttentionRow[] = [];

  for (const student of roster) {
    const sigs = signaturesForStudent(signatures, student.id);
    const lastStampAt =
      sigs.length > 0 ? Math.max(...sigs.map((s) => s.timestamp)) : null;
    const neverStamped = lastStampAt === null;

    let daysSinceLastStamp: number;
    if (neverStamped) {
      daysSinceLastStamp = 99999;
    } else {
      daysSinceLastStamp = differenceInCalendarDays(startOfDay(now), startOfDay(new Date(lastStampAt!)));
    }

    const stamps7d = count7dByStudentId.get(student.id) ?? 0;
    const { count: stampsThisTerm, term: activeTerm } = countThisTerm(sigs, now);

    const gradeGroup = byGrade.get(student.grade) ?? [student];
    const gradeCohortSize = gradeGroup.length;
    const gradeMedian7d = median7dByGrade.get(student.grade) ?? 0;
    const isBelowPeerMedian7d =
      gradeCohortSize >= config.minCohortForPeer && stamps7d < gradeMedian7d;

    const isStale = !neverStamped && daysSinceLastStamp >= config.staleDays;
    const hasNoStampThisTerm = activeTerm ? stampsThisTerm === 0 : false;

    const subjEver = collectSubjects(sigs);
    const valEver = collectValues(sigs);
    const missingSubjectsEver = SUBJECTS.filter((x) => !subjEver.has(x));
    const missingValuesEver = ALL_CORE_VALUES.filter((v) => !valEver.has(v));

    let missingSubjectsThisTerm: Subject[] = [];
    let missingValuesThisTerm: CoreValue[] = [];
    if (activeTerm) {
      const st = activeTerm;
      const subjTerm = collectSubjectsThisTerm(sigs, st);
      const valTerm = collectValuesThisTerm(sigs, st);
      missingSubjectsThisTerm = SUBJECTS.filter((x) => !subjTerm.has(x));
      missingValuesThisTerm = ALL_CORE_VALUES.filter((v) => !valTerm.has(v));
    }

    const sortKeyLastStamp: number = lastStampAt === null ? -1 : lastStampAt;

    const row: StudentAttentionRow = {
      student,
      lastStampAt,
      daysSinceLastStamp,
      neverStamped,
      totalStamps: sigs.length,
      stamps7d,
      stampsThisTerm,
      gradeCohortSize,
      gradeMedian7d,
      isBelowPeerMedian7d,
      isStale,
      hasNoStampThisTerm,
      missingSubjectsThisTerm,
      missingValuesThisTerm,
      missingSubjectsEver,
      missingValuesEver,
      sortKeyLastStamp,
      suggestionLines: [],
    };
    row.suggestionLines = buildSuggestions(row, config);
    rows.push(row);
  }

  return rows;
}

function gapCountForTieBreak(r: StudentAttentionRow): number {
  const thisTerm = r.missingSubjectsThisTerm.length + r.missingValuesThisTerm.length;
  if (thisTerm > 0) return thisTerm;
  return r.missingSubjectsEver.length + r.missingValuesEver.length;
}

/**
 * Default “needs attention” order:
 * 1. No stamps ever (first).
 * 2. More **calendar days** since last stamp (stale first; ignores time-of-day within a day).
 * 3. Fewer stamps in the last 7 days (peer comparison matters at the same recency).
 * 4. Below year-level 7d median before at/above median.
 * 5. More subject/value gaps (this term, else all-time).
 * 6. Name (stable).
 */
export function sortAttentionRowsByPriority(rows: StudentAttentionRow[]): StudentAttentionRow[] {
  return [...rows].sort((a, b) => {
    if (a.neverStamped !== b.neverStamped) {
      return a.neverStamped ? -1 : 1;
    }
    if (a.neverStamped && b.neverStamped) {
      return a.student.name.localeCompare(b.student.name, undefined, { sensitivity: 'base' });
    }
    if (a.daysSinceLastStamp !== b.daysSinceLastStamp) {
      return b.daysSinceLastStamp - a.daysSinceLastStamp;
    }
    if (a.stamps7d !== b.stamps7d) {
      return a.stamps7d - b.stamps7d;
    }
    const ap = a.isBelowPeerMedian7d ? 0 : 1;
    const bp = b.isBelowPeerMedian7d ? 0 : 1;
    if (ap !== bp) return ap - bp;
    const ga = gapCountForTieBreak(a);
    const gb = gapCountForTieBreak(b);
    if (ga !== gb) {
      return gb - ga;
    }
    return a.student.name.localeCompare(b.student.name, undefined, { sensitivity: 'base' });
  });
}
