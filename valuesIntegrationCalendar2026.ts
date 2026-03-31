/**
 * 2026 whole-school values integration themes (term + week-of-term).
 * Week numbers use getTermAndIntegrationWeekInTerm() (Monday-start; Term 1 counts from the Monday
 * before the official term start week so labels like "Week 9" match the printed grid).
 */
import { CoreValue } from './types';
import { getTermAndIntegrationWeekInTerm } from './schoolCalendar';

export interface IntegrationSegmentDef {
  termId: number;
  weekFrom: number;
  weekTo: number;
  /** Display-only label from the published calendar */
  label?: string;
  coreValue: CoreValue;
  subValueLabel: string;
  quote: string;
  events?: string;
}

export interface ValuesIntegrationFocus {
  termId: number;
  weekInTerm: number;
  label?: string;
  coreValue: CoreValue;
  subValueLabel: string;
  quote: string;
  events?: string;
}

export const VALUES_INTEGRATION_SEGMENTS_2026: IntegrationSegmentDef[] = [
  // Term 1 — "Week 0,1&2" … "Week 9" mapped to planner weeks 1–10
  {
    termId: 1,
    weekFrom: 1,
    weekTo: 3,
    label: 'Weeks 0, 1 & 2',
    coreValue: CoreValue.TRUTH,
    subValueLabel: 'Concentration',
    quote: 'Make each day your masterpiece...',
  },
  {
    termId: 1,
    weekFrom: 4,
    weekTo: 5,
    label: 'Weeks 3 & 4',
    coreValue: CoreValue.RIGHT_CONDUCT,
    subValueLabel: 'Perseverance',
    quote: "I may not be there yet but I'm closer than yesterday...",
  },
  {
    termId: 1,
    weekFrom: 6,
    weekTo: 7,
    label: 'Weeks 5 & 6',
    coreValue: CoreValue.LOVE,
    subValueLabel: 'Sacrifice',
    quote: 'Think of others before yourself...',
    events: "School's Birthday",
  },
  {
    termId: 1,
    weekFrom: 8,
    weekTo: 9,
    label: 'Weeks 7 & 8',
    coreValue: CoreValue.PEACE,
    subValueLabel: 'Contentment',
    quote: 'Most people are as happy as they make their minds up to be... — Abraham Lincoln',
    events: 'Week 8: Harmony Day',
  },
  {
    termId: 1,
    weekFrom: 10,
    weekTo: 10,
    label: 'Week 9',
    coreValue: CoreValue.NON_VIOLENCE,
    subValueLabel: 'Tolerance',
    quote: 'Compassion and tolerance make a better world...',
  },
  // Term 2
  {
    termId: 2,
    weekFrom: 1,
    weekTo: 2,
    label: 'Weeks 1 & 2',
    coreValue: CoreValue.LOVE,
    subValueLabel: 'Forgiveness',
    quote: 'Forgive and forget...',
    events: "25 Apr Anzac Day; 8 May Mother's Day",
  },
  {
    termId: 2,
    weekFrom: 3,
    weekTo: 4,
    label: 'Weeks 3 & 4',
    coreValue: CoreValue.TRUTH,
    subValueLabel: 'Quest for knowledge',
    quote: 'The more we know the more we grow...',
    events: 'NAPLAN',
  },
  {
    termId: 2,
    weekFrom: 5,
    weekTo: 6,
    label: 'Weeks 5 & 6',
    coreValue: CoreValue.NON_VIOLENCE,
    subValueLabel: 'Inclusiveness',
    quote: 'Together we can do great things...',
    events: '26 May — National Sorry Day',
  },
  {
    termId: 2,
    weekFrom: 7,
    weekTo: 8,
    label: 'Weeks 7 & 8',
    coreValue: CoreValue.RIGHT_CONDUCT,
    subValueLabel: 'Respect',
    quote: 'Treat Others the way you would like to be treated...',
    events: '5 June — World Environment Day',
  },
  {
    termId: 2,
    weekFrom: 9,
    weekTo: 11,
    label: 'Weeks 9, 10 & 11',
    coreValue: CoreValue.PEACE,
    subValueLabel: 'Doing Your Best',
    quote: 'Doing your best means never stop trying...',
  },
  // Term 3
  {
    termId: 3,
    weekFrom: 1,
    weekTo: 2,
    label: 'Weeks 1 & 2',
    coreValue: CoreValue.RIGHT_CONDUCT,
    subValueLabel: 'Equality',
    quote: 'Stand together, side by side...',
  },
  {
    termId: 3,
    weekFrom: 3,
    weekTo: 4,
    label: 'Weeks 3 & 4',
    coreValue: CoreValue.TRUTH,
    subValueLabel: 'Discrimination',
    quote: 'I choose what is right...',
  },
  {
    termId: 3,
    weekFrom: 5,
    weekTo: 6,
    label: 'Weeks 5 & 6',
    coreValue: CoreValue.LOVE,
    subValueLabel: 'Friendliness',
    quote: "Friendliness isn't a big thing; it is a million little things...",
  },
  {
    termId: 3,
    weekFrom: 7,
    weekTo: 8,
    label: 'Weeks 7 & 8',
    coreValue: CoreValue.PEACE,
    subValueLabel: 'Freedom',
    quote: 'Freedom comes with boundaries...',
    events: "Father's Day",
  },
  {
    termId: 3,
    weekFrom: 9,
    weekTo: 10,
    label: 'Weeks 9 & 10',
    coreValue: CoreValue.NON_VIOLENCE,
    subValueLabel: 'Humility',
    quote: 'Humility lets you learn from others...',
  },
  // Term 4
  {
    termId: 4,
    weekFrom: 1,
    weekTo: 2,
    label: 'Weeks 1 & 2',
    coreValue: CoreValue.NON_VIOLENCE,
    subValueLabel: 'Independence',
    quote: 'Before you can help others, learn to stand on your own two feet...',
  },
  {
    termId: 4,
    weekFrom: 3,
    weekTo: 4,
    label: 'Weeks 3 & 4',
    coreValue: CoreValue.RIGHT_CONDUCT,
    subValueLabel: 'Discipline',
    quote: 'Self-discipline means choosing to do what you feel is right...',
  },
  {
    termId: 4,
    weekFrom: 5,
    weekTo: 6,
    label: 'Weeks 5 & 6',
    coreValue: CoreValue.LOVE,
    subValueLabel: 'Kindness',
    quote: 'Be kind whenever possible. It is always possible... — Dalai Lama',
    events: '11 Nov — Remembrance Day',
  },
  {
    termId: 4,
    weekFrom: 7,
    weekTo: 8,
    label: 'Weeks 7 & 8',
    coreValue: CoreValue.PEACE,
    subValueLabel: 'Reflection',
    quote: 'Reflect on who you are, what you can be and where you are going...',
    events: "Founder's Day",
  },
  {
    termId: 4,
    weekFrom: 9,
    weekTo: 10,
    label: 'Weeks 9 & 10',
    coreValue: CoreValue.TRUTH,
    subValueLabel: 'Integrity',
    quote: 'Say what you mean, mean what you say...',
  },
];

export function getValuesIntegrationFocus(date: Date): ValuesIntegrationFocus | null {
  if (date.getFullYear() !== 2026) return null;
  const tw = getTermAndIntegrationWeekInTerm(date);
  if (!tw) return null;
  const seg = VALUES_INTEGRATION_SEGMENTS_2026.find(
    (s) => s.termId === tw.term.id && tw.weekInTerm >= s.weekFrom && tw.weekInTerm <= s.weekTo
  );
  if (!seg) return null;
  return {
    termId: tw.term.id,
    weekInTerm: tw.weekInTerm,
    label: seg.label,
    coreValue: seg.coreValue,
    subValueLabel: seg.subValueLabel,
    quote: seg.quote,
    events: seg.events,
  };
}

/** One-line summary for students (Dashboard). */
export function formatValuesIntegrationStudentLine(focus: ValuesIntegrationFocus): string {
  return `This week we are focusing on ${focus.coreValue} lived as ${focus.subValueLabel}.`;
}
