import {
  format,
  isToday,
  isTomorrow,
  isWithinInterval,
  startOfDay,
} from 'date-fns';
import type { PlannerCategory, PlannerItem } from '../types';
import { getLocalWeekRange } from '../schoolCalendar';

export type PlannerDueTone = 'overdue' | 'today' | 'soon' | 'normal';

export interface PlannerDueLabel {
  label: string;
  tone: PlannerDueTone;
}

function getUrgencyBucket(dueDate: number): number {
  const due = startOfDay(new Date(dueDate));
  const today = startOfDay(new Date());

  if (due < today) return 0;

  if (isToday(due)) return 1;

  const { start, end } = getLocalWeekRange(new Date());
  if (isWithinInterval(due, { start: startOfDay(start), end: startOfDay(end) })) {
    return 2;
  }

  return 3;
}

/** Incomplete items for dashboard Next Up: overdue, then this week, then soonest due. */
export function getNextUpItems(items: PlannerItem[], limit = 3): PlannerItem[] {
  return items
    .filter((item) => !item.isCompleted)
    .sort((a, b) => {
      const bucketDiff = getUrgencyBucket(a.dueDate) - getUrgencyBucket(b.dueDate);
      if (bucketDiff !== 0) return bucketDiff;
      return a.dueDate - b.dueDate;
    })
    .slice(0, limit);
}

export function formatPlannerDueLabel(dueDate: number): PlannerDueLabel {
  const due = new Date(dueDate);
  const today = startOfDay(new Date());
  const dueDay = startOfDay(due);

  if (dueDay < today) {
    return { label: 'Overdue', tone: 'overdue' };
  }
  if (isToday(due)) {
    return { label: 'Today', tone: 'today' };
  }
  if (isTomorrow(due)) {
    return { label: 'Tomorrow', tone: 'soon' };
  }

  const { start, end } = getLocalWeekRange(new Date());
  if (isWithinInterval(dueDay, { start: startOfDay(start), end: startOfDay(end) })) {
    return { label: format(due, 'EEE d MMM'), tone: 'soon' };
  }

  return { label: format(due, 'EEE d MMM'), tone: 'normal' };
}

export const PLANNER_DUE_TONE_CLASSES: Record<PlannerDueTone, string> = {
  overdue: 'bg-red-50 text-red-700 ring-red-100',
  today: 'bg-amber-50 text-amber-800 ring-amber-100',
  soon: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  normal: 'bg-gray-100 text-gray-600 ring-gray-200/80',
};

export const PLANNER_CATEGORY_DOT: Record<PlannerItem['category'], string> = {
  ASSIGNMENT: 'bg-red-500',
  HOMEWORK: 'bg-blue-500',
  TASK: 'bg-emerald-500',
};

export const PLANNER_CATEGORY_TEXT: Record<PlannerItem['category'], string> = {
  ASSIGNMENT: 'text-red-700',
  HOMEWORK: 'text-blue-700',
  TASK: 'text-emerald-700',
};

export const PLANNER_CATEGORY_BG: Record<PlannerItem['category'], string> = {
  ASSIGNMENT: 'bg-red-50',
  HOMEWORK: 'bg-blue-50',
  TASK: 'bg-emerald-50',
};

export const PLANNER_CATEGORY_ORDER: PlannerCategory[] = ['TASK', 'HOMEWORK', 'ASSIGNMENT'];

export const PLANNER_CATEGORY_LABELS: Record<PlannerCategory, string> = {
  TASK: 'Tasks',
  HOMEWORK: 'Homework',
  ASSIGNMENT: 'Assignments',
};

export const PLANNER_CATEGORY_EMPTY_HINT: Record<PlannerCategory, string> = {
  TASK: 'No tasks yet — tap + to add',
  HOMEWORK: 'No homework yet — tap + to add',
  ASSIGNMENT: 'No assignments yet — tap + to add',
};

/** Incomplete first, then earliest due date. */
export function sortPlannerItemsForList(items: PlannerItem[]): PlannerItem[] {
  return [...items].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return a.dueDate - b.dueDate;
  });
}

export function groupPlannerItemsByCategory(
  items: PlannerItem[]
): Record<PlannerCategory, PlannerItem[]> {
  const grouped: Record<PlannerCategory, PlannerItem[]> = {
    TASK: [],
    HOMEWORK: [],
    ASSIGNMENT: [],
  };
  items.forEach((item) => {
    grouped[item.category].push(item);
  });
  PLANNER_CATEGORY_ORDER.forEach((cat) => {
    grouped[cat] = sortPlannerItemsForList(grouped[cat]);
  });
  return grouped;
}
