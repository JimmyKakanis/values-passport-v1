import { format } from 'date-fns';
import { CoreValue } from '../types';
import type {
  DailyIntention,
  GoalCheckIn,
  StudentEngagementStats,
  ValueReflection,
} from '../types';
import { getTermAndWeekInTerm } from '../schoolCalendar';

export const INTENTION_TEXT_MAX = 280;
export const REFLECTION_TEXT_MAX = 2000;
export const GOAL_CHECKIN_TEXT_MAX = 500;

export function getDateKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export interface FortnightPeriod {
  periodKey: string;
  termName: string;
  fortnightLabel: string;
  weekFrom: number;
  weekTo: number;
}

/** School-term fortnight: weeks 1–2 → F1, 3–4 → F2, etc. */
export function getFortnightPeriodKey(date: Date = new Date()): FortnightPeriod | null {
  const tw = getTermAndWeekInTerm(date);
  if (!tw) return null;
  const fortnightIndex = Math.ceil(tw.weekInTerm / 2);
  const weekFrom = (fortnightIndex - 1) * 2 + 1;
  const weekTo = weekFrom + 1;
  const year = date.getFullYear();
  return {
    periodKey: `${year}-T${tw.term.id}-F${fortnightIndex}`,
    termName: tw.term.name,
    fortnightLabel: `${tw.term.name}, weeks ${weekFrom}–${weekTo}`,
    weekFrom,
    weekTo,
  };
}

/** True when date falls inside a school term (check-in available any day in the fortnight). */
export function isGoalCheckInWindowOpen(date: Date = new Date()): boolean {
  return getFortnightPeriodKey(date) !== null;
}

export function computeEngagementStats(
  intentions: DailyIntention[],
  reflections: ValueReflection[],
  checkIns: GoalCheckIn[]
): StudentEngagementStats {
  const valuesWithReflection = new Set<CoreValue>(
    reflections.map((r) => r.coreValue)
  );
  return {
    intentionCount: intentions.length,
    reflectionCount: reflections.length,
    totalReflectionWords: reflections.reduce((sum, r) => sum + (r.wordCount || 0), 0),
    coreValuesReflected: valuesWithReflection.size,
    goalCheckInCount: checkIns.length,
  };
}

export function dailyIntentionDocId(studentId: string, dateKey: string): string {
  return `${studentId}_${dateKey}`.replace(/[/.#$\[\]]/g, '_');
}

export function goalCheckInDocId(
  goalId: string,
  studentId: string,
  periodKey: string
): string {
  return `${studentId}_${goalId}_${periodKey}`.replace(/[/.#$\[\]]/g, '_');
}

export interface StudentReflectionPrompt {
  /** Text before the bold sub-value name. */
  prefix: string;
  /** Text after the bold sub-value name. */
  suffix: string;
  /** Textarea placeholder for this lens. */
  placeholder: string;
}

function hashToIndex(seed: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % modulo;
}

/** Rotating reflection lenses for Values Lab (stable per student + day + sub-value). */
const STUDENT_REFLECTION_PROMPTS: Array<(subValue: string) => StudentReflectionPrompt> = [
  () => ({
    prefix: 'When did you last demonstrate ',
    suffix: '? How did it make you feel?',
    placeholder: 'Describe a real moment when you lived this value...',
  }),
  () => ({
    prefix: 'Describe a time you showed ',
    suffix: '. What were you doing, and what happened next?',
    placeholder: 'Set the scene, then what you did...',
  }),
  () => ({
    prefix: 'Where could you practise ',
    suffix: ' tomorrow—at school, home, or with friends?',
    placeholder: 'One small, realistic action you could take...',
  }),
  () => ({
    prefix: 'What is one way you could show ',
    suffix: ' this week, even in a small way?',
    placeholder: 'Think of a specific place, time, or person...',
  }),
  () => ({
    prefix: 'When do you find it hardest to live ',
    suffix: '? What makes it difficult?',
    placeholder: 'Be honest—this is private to you...',
  }),
  () => ({
    prefix: 'How did ',
    suffix: ' show up in how you treated someone recently?',
    placeholder: 'It could be a kind act, patience, or a tough moment...',
  }),
  () => ({
    prefix: 'Who helps you grow in ',
    suffix: '? What do they do that you appreciate?',
    placeholder: 'A friend, family member, teacher, or teammate...',
  }),
  () => ({
    prefix: 'Think of a moment you missed a chance for ',
    suffix: '. What would you try differently next time?',
    placeholder: 'No judgement—reflection is about learning...',
  }),
  () => ({
    prefix: 'How did showing ',
    suffix: ' affect someone else, even in a small way?',
    placeholder: 'Someone who benefited, noticed, or was hurt...',
  }),
  () => ({
    prefix: 'What would “one step better” with ',
    suffix: ' look like for you—not perfect, just progress?',
    placeholder: 'A concrete step you could actually do...',
  }),
  () => ({
    prefix: 'When during a normal school day do you feel most ',
    suffix: '?',
    placeholder: 'A class, break, sport, or journey home...',
  }),
  () => ({
    prefix: 'Finish this thought: “',
    suffix: ' matters to me because…”',
    placeholder: 'Write the rest in your own words...',
  }),
];

/**
 * Picks one reflection question for today. Changes daily and when the sub-value changes.
 */
export function pickStudentReflectionPrompt(
  studentKey: string,
  subValue: string,
  now: Date = new Date()
): StudentReflectionPrompt {
  const sub = subValue.trim() || 'this value';
  const dateKey = getDateKey(now);
  const seed = `${studentKey}|${dateKey}|${sub}`;
  const idx = hashToIndex(seed, STUDENT_REFLECTION_PROMPTS.length);
  return STUDENT_REFLECTION_PROMPTS[idx](sub);
}
