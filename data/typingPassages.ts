import { CoreValue, TypingPassage } from '../types';
import { getFortnightPeriodKey } from '../services/studentEngagement';

function hashToIndex(seed: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % modulo;
}

/** 2026 school-term fortnights — three variants each, themed to values integration. */
export const TYPING_PASSAGES: TypingPassage[] = [
  // 2026-T1-F1 — Truth / Concentration
  {
    id: '2026-T1-F1-v0',
    periodKey: '2026-T1-F1',
    variantIndex: 0,
    coreValue: CoreValue.TRUTH,
    title: 'One task at a time',
    text: 'Concentration means giving your full attention to what is in front of you. When your mind wanders during a lesson, gently bring it back without criticising yourself. Put your phone away, close extra tabs, and listen to the person speaking. Small choices like these build the habit of truthfulness with yourself about where your focus really is.',
  },
  {
    id: '2026-T1-F1-v1',
    periodKey: '2026-T1-F1',
    variantIndex: 1,
    coreValue: CoreValue.TRUTH,
    title: 'Honest effort',
    text: 'Truth is not only about words. It is also about doing your own work and admitting when you need help. When you concentrate on a problem instead of copying an answer, you learn something real. Teachers notice genuine effort, and more importantly, you notice it in yourself. That quiet pride is worth more than a quick shortcut.',
  },
  {
    id: '2026-T1-F1-v2',
    periodKey: '2026-T1-F1',
    variantIndex: 2,
    coreValue: CoreValue.TRUTH,
    title: 'Stillness before speaking',
    text: 'Before you reply in a discussion, pause for one breath. Concentration helps you hear what was actually said instead of what you expected. Truthful listening means you might change your mind, and that is a strength. In a noisy world, the student who can focus and respond thoughtfully stands out for the right reasons.',
  },
  // 2026-T1-F2 — Right Conduct / Perseverance
  {
    id: '2026-T1-F2-v0',
    periodKey: '2026-T1-F2',
    variantIndex: 0,
    coreValue: CoreValue.RIGHT_CONDUCT,
    title: 'Keep going',
    text: 'Perseverance is showing up again after something feels hard. You might not master a skill on the first try, or the fifth. Right conduct means choosing to try once more instead of giving up or blaming others. Each small step forward counts. Progress is rarely dramatic; it is built from ordinary days when you refuse to quit.',
  },
  {
    id: '2026-T1-F2-v1',
    periodKey: '2026-T1-F2',
    variantIndex: 1,
    coreValue: CoreValue.RIGHT_CONDUCT,
    title: 'Discipline in small things',
    text: 'Being on time, wearing the correct uniform, and finishing what you start are simple acts of perseverance. They train your will for bigger challenges later. When you keep a promise to yourself, you prove that your actions match your values. Right conduct is not perfection; it is steady effort in the direction of what is good.',
  },
  {
    id: '2026-T1-F2-v2',
    periodKey: '2026-T1-F2',
    variantIndex: 2,
    coreValue: CoreValue.RIGHT_CONDUCT,
    title: 'Learning from setbacks',
    text: 'A low mark or a missed goal can feel discouraging, but perseverance turns setbacks into lessons. Ask what you can adjust next time instead of deciding you are not capable. Right conduct includes treating yourself with fairness: expect effort, not instant success. The students who improve most are often those who kept going when others stopped.',
  },
  // 2026-T1-F3 — Love / Sacrifice
  {
    id: '2026-T1-F3-v0',
    periodKey: '2026-T1-F3',
    variantIndex: 0,
    coreValue: CoreValue.LOVE,
    title: 'Putting others first',
    text: 'Sacrifice sounds dramatic, but at school it often looks ordinary. You let someone else speak first, share equipment, or give up your seat. Love in action means noticing when another person needs support and offering it without keeping score. These small sacrifices build a community where everyone feels they belong.',
  },
  {
    id: '2026-T1-F3-v1',
    periodKey: '2026-T1-F3',
    variantIndex: 1,
    coreValue: CoreValue.LOVE,
    title: 'Time given freely',
    text: 'Helping a classmate understand a concept costs you a few minutes, but it can change their whole week. Sacrifice is giving something you value, like time or comfort, for someone else benefit. Love grows when we act beyond what is required. You do not need a special occasion to be the person who shows up for others.',
  },
  {
    id: '2026-T1-F3-v2',
    periodKey: '2026-T1-F3',
    variantIndex: 2,
    coreValue: CoreValue.LOVE,
    title: 'Celebrating together',
    text: 'When the school marks a special day, love means joining in with a generous spirit. Sacrifice might mean helping set up instead of standing aside, or including someone who usually sits alone. Shared joy is doubled when no one is left out. The birthday of a community is a reminder that we rise together.',
  },
  // 2026-T1-F4 — Peace / Contentment
  {
    id: '2026-T1-F4-v0',
    periodKey: '2026-T1-F4',
    variantIndex: 0,
    coreValue: CoreValue.PEACE,
    title: 'Enough for today',
    text: 'Contentment is being at peace with what you have while still working toward your goals. Comparing yourself to others on social media can steal that peace. Notice what is going well in your own life: a friend, a skill you are building, a teacher who believes in you. Gratitude quietens the restless mind.',
  },
  {
    id: '2026-T1-F4-v1',
    periodKey: '2026-T1-F4',
    variantIndex: 1,
    coreValue: CoreValue.PEACE,
    title: 'Harmony in difference',
    text: 'Harmony Day reminds us that peace grows when we respect people whose backgrounds differ from our own. Contentment does not mean ignoring injustice; it means responding without hatred. Listen to learn, not to win. A peaceful community welcomes many voices and still finds ways to move forward together.',
  },
  {
    id: '2026-T1-F4-v2',
    periodKey: '2026-T1-F4',
    variantIndex: 2,
    coreValue: CoreValue.PEACE,
    title: 'Calm under pressure',
    text: 'Before a test or performance, take three slow breaths. Peace is not the absence of nerves but the ability to stay steady inside them. Contentment comes from knowing you prepared honestly and will accept the outcome. When you model calm, you help everyone around you feel safer too.',
  },
  // 2026-T1-F5 — Non-Violence / Tolerance
  {
    id: '2026-T1-F5-v0',
    periodKey: '2026-T1-F5',
    variantIndex: 0,
    coreValue: CoreValue.NON_VIOLENCE,
    title: 'Words that heal',
    text: 'Non-violence begins with how we speak. A sharp comment can hurt long after a bruise would fade. Tolerance means pausing when you disagree and choosing words that do not attack the person. You can stand firm in your views while still treating others with dignity. That balance is a skill worth practising.',
  },
  {
    id: '2026-T1-F5-v1',
    periodKey: '2026-T1-F5',
    variantIndex: 1,
    coreValue: CoreValue.NON_VIOLENCE,
    title: 'Room for disagreement',
    text: 'Tolerance is not pretending everyone thinks alike. It is making space for different opinions without mockery or exclusion. Non-violence includes walking away from a fight and refusing to spread rumours. Courage sometimes looks like being the one who says stop when a joke goes too far.',
  },
  {
    id: '2026-T1-F5-v2',
    periodKey: '2026-T1-F5',
    variantIndex: 2,
    coreValue: CoreValue.NON_VIOLENCE,
    title: 'Compassion in action',
    text: 'When someone is struggling, tolerance means patience instead of judgement. Non-violence is active care: reporting bullying, sitting with the new student, or asking a friend if they are okay. Small acts of compassion ripple outward. A school where everyone feels safe to learn is built one choice at a time.',
  },
  // 2026-T3-F3 — Love / Friendliness
  {
    id: '2026-T3-F3-v0',
    periodKey: '2026-T3-F3',
    variantIndex: 0,
    coreValue: CoreValue.LOVE,
    title: 'A million little things',
    text: 'Friendliness is not one grand gesture; it is a million little things. A smile in the corridor, remembering someone\'s name, or asking how their weekend was. Love shows up in ordinary politeness that makes school feel human. You never know who needed that brief moment of warmth. Friendliness costs little and returns much.',
  },
  {
    id: '2026-T3-F3-v1',
    periodKey: '2026-T3-F3',
    variantIndex: 1,
    coreValue: CoreValue.LOVE,
    title: 'Including the quiet ones',
    text: 'Some students find it hard to start conversations. Friendliness means initiating kindly instead of waiting for them to approach you. Love notices who sits alone at lunch and offers company without pity. You do not need to become best friends with everyone; you only need to be approachable. That openness changes a person\'s whole day.',
  },
  {
    id: '2026-T3-F3-v2',
    periodKey: '2026-T3-F3',
    variantIndex: 2,
    coreValue: CoreValue.LOVE,
    title: 'Repair after conflict',
    text: 'Even good friends argue. Friendliness after conflict means saying sorry when you were wrong and accepting apology when it is sincere. Love keeps relationships workable instead of perfect. A short note or message can reopen a door that pride closed. Maintaining peace with people matters as much as winning debates.',
  },
  // 2026-T3-F4 — Peace / Freedom
  {
    id: '2026-T3-F4-v0',
    periodKey: '2026-T3-F4',
    variantIndex: 0,
    coreValue: CoreValue.PEACE,
    title: 'Freedom with boundaries',
    text: 'Freedom does not mean doing whatever you want whenever you want. Peaceful freedom understands that your choices affect others. Boundaries like phone rules in class protect everyone\'s right to learn. When you accept limits with grace, you show maturity. True freedom is choosing well within the structure that keeps us safe.',
  },
  {
    id: '2026-T3-F4-v1',
    periodKey: '2026-T3-F4',
    variantIndex: 1,
    coreValue: CoreValue.PEACE,
    title: 'Responsible choices',
    text: 'You are growing into more independence each year. Freedom includes managing time, homework, and friendships without someone hovering over you. Peace comes when you use that independence responsibly rather than testing how far you can push rules. Ask for help before small problems become large ones. Freedom works best with honesty.',
  },
  {
    id: '2026-T3-F4-v2',
    periodKey: '2026-T3-F4',
    variantIndex: 2,
    coreValue: CoreValue.PEACE,
    title: 'Gratitude for guidance',
    text: 'Parents, carers, and teachers often sacrifice to give you opportunities. Freedom to learn is a gift maintained by many adults working together. Peace includes appreciating that support instead of treating it as interference. A thank you or a patient conversation honours the people who help you grow.',
  },
  // 2026-T3-F5 — Non-Violence / Humility
  {
    id: '2026-T3-F5-v0',
    periodKey: '2026-T3-F5',
    variantIndex: 0,
    coreValue: CoreValue.NON_VIOLENCE,
    title: 'Learning from others',
    text: 'Humility means accepting that you do not know everything yet. Non-violence includes refusing to mock someone who is struggling to learn. When a classmate explains something you missed, receive it with gratitude instead of embarrassment. The humble student improves fastest because they keep listening. Pride blocks growth; humility opens doors.',
  },
  {
    id: '2026-T3-F5-v1',
    periodKey: '2026-T3-F5',
    variantIndex: 1,
    coreValue: CoreValue.NON_VIOLENCE,
    title: 'Sharing credit',
    text: 'Group work succeeds when no one hogs the spotlight. Humility is naming what others contributed instead of claiming the whole project. Non-violence rejects put-downs disguised as jokes about someone\'s effort. Celebrate the team result. Leaders who share credit earn respect that lasts longer than boasting.',
  },
  {
    id: '2026-T3-F5-v2',
    periodKey: '2026-T3-F5',
    variantIndex: 2,
    coreValue: CoreValue.NON_VIOLENCE,
    title: 'Admitting mistakes',
    text: 'Owning an error quickly is a form of humility that prevents bigger harm. Non-violence means apologising when your words or actions hurt someone, without excuses. Humility is not thinking less of yourself; it is thinking of yourself less. People trust those who can say I was wrong and mean it.',
  },
  // 2026-T4-F1 — Non-Violence / Independence
  {
    id: '2026-T4-F1-v0',
    periodKey: '2026-T4-F1',
    variantIndex: 0,
    coreValue: CoreValue.NON_VIOLENCE,
    title: 'Standing on your own feet',
    text: 'Independence begins with small responsibilities: packing your bag, tracking due dates, and speaking up when you need clarification. Non-violence includes not relying on intimidation to get others to do your work. Before you can help others well, learn to manage your own tasks honestly. Self-reliance built on integrity is strength, not selfishness.',
  },
  {
    id: '2026-T4-F1-v1',
    periodKey: '2026-T4-F1',
    variantIndex: 1,
    coreValue: CoreValue.NON_VIOLENCE,
    title: 'Asking without demanding',
    text: 'Independent students still ask for help, but they do so respectfully and at the right time. Non-violence rejects manipulating friends or parents with anger. Prepare what you tried before you say you are stuck. Teachers respond better to effort plus a question than to a blank page and an excuse. Independence and community support each other.',
  },
  {
    id: '2026-T4-F1-v2',
    periodKey: '2026-T4-F1',
    variantIndex: 2,
    coreValue: CoreValue.NON_VIOLENCE,
    title: 'Choosing your path',
    text: 'As senior years approach, independence means thinking about your values, not only your grades. Non-violence includes walking away from peers who pressure you toward cruelty or cheating. You can respect others while still making your own choices. The person you become is shaped by thousands of independent decisions no one else can make for you.',
  },
  // 2026-T4-F2 — Right Conduct / Discipline
  {
    id: '2026-T4-F2-v0',
    periodKey: '2026-T4-F2',
    variantIndex: 0,
    coreValue: CoreValue.RIGHT_CONDUCT,
    title: 'Choosing what is right',
    text: 'Self-discipline means choosing to do what you feel is right even when no one is watching. Right conduct is finishing homework before scrolling, or telling the truth when a lie would be easier. Discipline builds freedom because you trust yourself to follow through. Small daily habits matter more than rare bursts of motivation.',
  },
  {
    id: '2026-T4-F2-v1',
    periodKey: '2026-T4-F2',
    variantIndex: 1,
    coreValue: CoreValue.RIGHT_CONDUCT,
    title: 'Training your attention',
    text: 'Distraction is everywhere. Discipline is returning to the task you committed to, again and again. Right conduct in study blocks might mean twenty focused minutes without switching apps. You will not always feel like starting; discipline starts anyway. Over a term, those focused minutes compound into real skill.',
  },
  {
    id: '2026-T4-F2-v2',
    periodKey: '2026-T4-F2',
    variantIndex: 2,
    coreValue: CoreValue.RIGHT_CONDUCT,
    title: 'Discipline with kindness',
    text: 'Discipline is not punishing yourself for being human. Right conduct includes rest, food, and friendship as part of a sustainable routine. Push hard when it counts, then recover without guilt. The goal is steady growth, not burnout disguised as dedication. Treat yourself with the same fairness you offer others.',
  },
  // 2026-T4-F3 — Love / Kindness
  {
    id: '2026-T4-F3-v0',
    periodKey: '2026-T4-F3',
    variantIndex: 0,
    coreValue: CoreValue.LOVE,
    title: 'Always possible',
    text: 'Kindness is always possible, even on a bad day. Love shows it in tiny acts: holding a door, thanking a cleaner, or texting a friend who seemed down. You do not need a reason beyond someone is human like you. Kindness is not weakness; it is choosing care when indifference would be easier.',
  },
  {
    id: '2026-T4-F3-v1',
    periodKey: '2026-T4-F3',
    variantIndex: 1,
    coreValue: CoreValue.LOVE,
    title: 'Remembering sacrifice',
    text: 'Remembrance Day calls us to honour those who served and those who suffered in war. Kindness toward veterans and newcomers alike reflects that memory. Love extends to people whose experiences differ from yours. A moment of silence can be matched by a lifetime of peaceful words. Remember, and let that memory make you gentler.',
  },
  {
    id: '2026-T4-F3-v2',
    periodKey: '2026-T4-F3',
    variantIndex: 2,
    coreValue: CoreValue.LOVE,
    title: 'Kindness online',
    text: 'Screens do not remove the human on the other side. Love means pausing before you post or comment. Kindness rejects pile-ons and public shaming. If you would not say it face to face, do not type it. Digital kindness protects reputations and mental health. Your online self is still you.',
  },
  // 2026-T4-F4 — Peace / Reflection
  {
    id: '2026-T4-F4-v0',
    periodKey: '2026-T4-F4',
    variantIndex: 0,
    coreValue: CoreValue.PEACE,
    title: 'Who am I becoming',
    text: 'Reflection asks who you are, what you can be, and where you are going. Peace grows when you pause to notice patterns in your choices. Are you proud of how you treated people this term? What would you change with a fresh week? Honest reflection is not self-criticism; it is steering your life with open eyes.',
  },
  {
    id: '2026-T4-F4-v1',
    periodKey: '2026-T4-F4',
    variantIndex: 1,
    coreValue: CoreValue.PEACE,
    title: 'Gratitude for foundations',
    text: "Founder's Day invites us to remember those who built the school we inherit. Reflection connects you to a story larger than one year level. Peace includes appreciating traditions without treating them as empty routine. What values from the past do you want to carry forward? Gratitude turns history into responsibility.",
  },
  {
    id: '2026-T4-F4-v2',
    periodKey: '2026-T4-F4',
    variantIndex: 2,
    coreValue: CoreValue.PEACE,
    title: 'Quiet before the finish',
    text: 'Term 4 accelerates toward exams and farewells. Reflection creates space to prioritise instead of panic. Peaceful students review what they know and what still needs work without catastrophising. Ten minutes of honest planning beats an hour of anxious scrolling. Reflect, then act.',
  },
  // 2026-T4-F5 — Truth / Integrity
  {
    id: '2026-T4-F5-v0',
    periodKey: '2026-T4-F5',
    variantIndex: 0,
    coreValue: CoreValue.TRUTH,
    title: 'Say what you mean',
    text: 'Integrity is alignment between your words and your actions. Truth means saying what you mean and meaning what you say. Promises about group work, honesty in exams, and truthful answers to parents all belong to integrity. People remember who they can trust. That reputation is built slowly and lost quickly.',
  },
  {
    id: '2026-T4-F5-v1',
    periodKey: '2026-T4-F5',
    variantIndex: 1,
    coreValue: CoreValue.TRUTH,
    title: 'The hard truth',
    text: 'Sometimes integrity requires a difficult conversation: returning something lost, admitting you copied, or telling a friend their behaviour is harmful. Truth is not cruelty when it is spoken with care. Integrity chooses the harder right over the easier wrong. You sleep better when your outward life matches your inner values.',
  },
  {
    id: '2026-T4-F5-v2',
    periodKey: '2026-T4-F5',
    variantIndex: 2,
    coreValue: CoreValue.TRUTH,
    title: 'Leaving well',
    text: 'As the school year ends, integrity means finishing commitments and thanking people who helped you. Truth includes an honest effort on final tasks rather than cutting corners because graduation feels close. How you leave a team or a class says as much about you as how you joined. End with the same respect you hoped for at the start.',
  },
];

/** Evergreen passages used outside school term or unknown period. */
export const EVERGREEN_TYPING_PASSAGES: TypingPassage[] = [
  {
    id: 'evergreen-v0',
    periodKey: 'evergreen',
    variantIndex: 0,
    coreValue: CoreValue.TRUTH,
    title: 'Values in daily life',
    text: 'Our school values are not ideas for assemblies alone. Truth, love, peace, right conduct, and non-violence show up in how we treat friends, complete homework, and respond when things go wrong. Each day offers small chances to practise. Over time, those choices shape who we become.',
  },
  {
    id: 'evergreen-v1',
    periodKey: 'evergreen',
    variantIndex: 1,
    coreValue: CoreValue.LOVE,
    title: 'Community matters',
    text: 'A strong community depends on people who look out for one another. Love means noticing when someone is left out and including them. It means celebrating classmates successes without envy. When we act with care, the whole school feels warmer and safer for everyone who walks through the gates.',
  },
  {
    id: 'evergreen-v2',
    periodKey: 'evergreen',
    variantIndex: 2,
    coreValue: CoreValue.PEACE,
    title: 'Growing together',
    text: 'Learning is a journey shared with teachers, friends, and family. Peace comes from accepting that we grow at different speeds and in different ways. Be patient with yourself and generous with others. The goal is not to be perfect but to keep improving while helping those around you do the same.',
  },
];

export function getActivePeriodKey(date: Date = new Date()): string {
  return getFortnightPeriodKey(date)?.periodKey ?? 'evergreen';
}

export function getPassagesForPeriod(periodKey: string): TypingPassage[] {
  const pool =
    periodKey === 'evergreen'
      ? EVERGREEN_TYPING_PASSAGES
      : TYPING_PASSAGES.filter((p) => p.periodKey === periodKey);
  if (pool.length >= 3) return pool.slice(0, 3);
  if (pool.length > 0) return pool;
  return EVERGREEN_TYPING_PASSAGES;
}

export function getPassageById(passageId: string): TypingPassage | undefined {
  return [...TYPING_PASSAGES, ...EVERGREEN_TYPING_PASSAGES].find((p) => p.id === passageId);
}

/** Solo passage for a fixed variant index (0–2) within the fortnight. */
export function getPassageForVariant(periodKey: string, variantIndex: number): TypingPassage {
  const passages = getPassagesForPeriod(periodKey);
  const idx = ((variantIndex % passages.length) + passages.length) % passages.length;
  return passages[idx];
}

/** @deprecated Use getPassageForVariant with stored progress instead. */
export function pickSoloPassage(studentId: string, periodKey?: string, date: Date = new Date()): TypingPassage {
  const key = periodKey ?? getActivePeriodKey(date);
  const passages = getPassagesForPeriod(key);
  const idx = hashToIndex(`${studentId}|${key}|solo`, passages.length);
  return passages[idx];
}

export function pickRacePassage(periodKey: string, raceId: number): TypingPassage {
  const passages = getPassagesForPeriod(periodKey);
  const idx = Math.abs(raceId) % passages.length;
  return passages[idx];
}
