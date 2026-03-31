import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isWithinInterval,
  endOfDay,
  startOfDay,
  subDays,
  differenceInCalendarWeeks,
} from 'date-fns';

/** NSW school year term boundaries (2026). Same dates as the student planner. */
export interface SchoolTerm {
  id: number;
  name: string;
  start: Date;
  end: Date;
}

export const SCHOOL_TERMS: SchoolTerm[] = [
  { id: 1, name: 'Term 1', start: new Date(2026, 1, 2), end: new Date(2026, 3, 2) },
  { id: 2, name: 'Term 2', start: new Date(2026, 3, 21), end: new Date(2026, 6, 3) },
  { id: 3, name: 'Term 3', start: new Date(2026, 6, 21), end: new Date(2026, 8, 25) },
  { id: 4, name: 'Term 4', start: new Date(2026, 9, 13), end: new Date(2026, 11, 11) },
];

/**
 * Calendar week Mon–Sun in the browser's local timezone.
 * For NSW staff this is typically aligned with the school week.
 */
export function getLocalWeekRange(d: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(d, { weekStartsOn: 1 }),
    end: endOfWeek(d, { weekStartsOn: 1 }),
  };
}

/** Monday–Friday dates that fall inside [weekStart, weekEnd]. */
export function getSchoolDaysInInterval(weekStart: Date, weekEnd: Date): Date[] {
  return eachDayOfInterval({ start: weekStart, end: weekEnd }).filter((day) => {
    const dow = day.getDay();
    return dow >= 1 && dow <= 5;
  });
}

/** Term that contains this calendar date (planner-aligned interval). */
export function getCurrentTermForDate(date: Date): SchoolTerm | undefined {
  return SCHOOL_TERMS.find((term) =>
    isWithinInterval(date, { start: term.start, end: term.end })
  );
}

/**
 * Which school term contains `date`, and the 1-based week index within that term
 * (same rule as the student planner: Monday-start weeks, week 1 contains term.start).
 * Also matches the week that contains term.start when `date` is just before term.start
 * but in the same calendar week.
 */
export function getTermAndWeekInTerm(date: Date): { term: SchoolTerm; weekInTerm: number } | null {
  const term = SCHOOL_TERMS.find((t) => {
    if (isWithinInterval(date, { start: t.start, end: endOfDay(t.end) })) return true;
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    return isWithinInterval(t.start, { start: weekStart, end: weekEnd });
  });
  if (!term) return null;
  const raw = differenceInCalendarWeeks(date, term.start, { weekStartsOn: 1 }) + 1;
  const weekInTerm = Math.max(1, raw);
  return { term, weekInTerm };
}

/**
 * Monday of the first "values integration" week for a term.
 * Term 1 published calendar labels include "Week 0, 1 & 2" before the official term start date;
 * counting from the official term.start Monday runs one week behind that calendar (e.g. late March
 * is school "Week 9" / Non-Violence, but diff from Feb 2 gives week 9 = Peace block). We shift
 * Term 1 back one Monday so week indices align with the printed integration grid.
 */
export function getValuesIntegrationWeekAnchor(term: SchoolTerm): Date {
  const mondayOfOfficialStartWeek = startOfWeek(term.start, { weekStartsOn: 1 });
  if (term.id === 1) {
    return subDays(mondayOfOfficialStartWeek, 7);
  }
  return mondayOfOfficialStartWeek;
}

/** Same term resolution as getTermAndWeekInTerm; week index uses getValuesIntegrationWeekAnchor. */
export function getTermAndIntegrationWeekInTerm(date: Date): { term: SchoolTerm; weekInTerm: number } | null {
  const term = SCHOOL_TERMS.find((t) => {
    if (isWithinInterval(date, { start: t.start, end: endOfDay(t.end) })) return true;
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    return isWithinInterval(t.start, { start: weekStart, end: weekEnd });
  });
  if (!term) return null;
  const anchor = getValuesIntegrationWeekAnchor(term);
  const raw = differenceInCalendarWeeks(date, anchor, { weekStartsOn: 1 }) + 1;
  const weekInTerm = Math.max(1, raw);
  return { term, weekInTerm };
}

/** True if stamp time falls inside the term, including the full end calendar day. */
export function isTimestampInSchoolTerm(ts: number, term: SchoolTerm): boolean {
  const d = new Date(ts);
  return isWithinInterval(d, { start: term.start, end: endOfDay(term.end) });
}

/** Rolling 14 calendar days ending at end of `now` (inclusive). */
export function getFortnightRange(now: Date): { start: Date; end: Date } {
  return { start: startOfDay(subDays(now, 13)), end: endOfDay(now) };
}

/** Last 7 calendar days ending at end of `now` (inclusive). */
export function getLast7DaysRange(now: Date): { start: Date; end: Date } {
  return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
}

export function isTimestampInRange(ts: number, start: Date, end: Date): boolean {
  return ts >= start.getTime() && ts <= end.getTime();
}
