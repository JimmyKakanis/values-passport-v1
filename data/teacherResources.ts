import { CoreValue } from '../types';

export interface ValueDeepDiveContent {
  id: CoreValue;
  title: string;
  tagline: string;
  observableBehaviors: string[];
  teachingPrompts: string[];
  curriculumLinks: { subject: string; idea: string }[];
}

export const VALUE_DEEP_DIVES: Record<CoreValue, ValueDeepDiveContent> = {
  [CoreValue.TRUTH]: {
    id: CoreValue.TRUTH,
    title: 'Truth (Satya)',
    tagline: 'Love in Speech',
    observableBehaviors: [
      'Admits to mistakes without being prompted.',
      'Gives honest feedback to peers in a constructive way.',
      'Does their own work during assessments.',
      'Keeps promises and commitments made to teachers or classmates.',
      'Speaks up when they see something unfair (Upstander behavior).'
    ],
    teachingPrompts: [
      'Is there a difference between "facts" and "truth"?',
      'Why is it sometimes hard to tell the truth? How does it feel after you do?',
      'Can you think of a character in our book who showed integrity?',
      'How does being truthful build trust in our classroom?'
    ],
    curriculumLinks: [
      { subject: 'Science', idea: 'Discuss the importance of accurate data recording and reporting findings honestly, even if they contradict the hypothesis.' },
      { subject: 'History', idea: 'Analyze historical sources: Who wrote this? Is it the whole truth? What perspectives are missing?' },
      { subject: 'Math', idea: 'Show your working out. The "truth" of the process is as important as the correct answer.' }
    ]
  },
  [CoreValue.LOVE]: {
    id: CoreValue.LOVE,
    title: 'Love (Prema)',
    tagline: 'Love in Action',
    observableBehaviors: [
      'Consistently includes others in group activities.',
      'Shares resources (pens, books) willingly.',
      'Uses kind words even when frustrated.',
      'Shows genuine concern when a classmate is upset.',
      'Practices selfless service (helping without expecting a reward).'
    ],
    teachingPrompts: [
      'What does "Love in Action" look like in this classroom?',
      'How can we show respect for our learning materials?',
      'How does it feel when someone helps you without being asked?',
      'Can we disagree with someone while still showing them love and respect?'
    ],
    curriculumLinks: [
      { subject: 'English', idea: 'Explore themes of empathy and compassion in literature. Write from another character\'s perspective.' },
      { subject: 'PDHPE', idea: 'Practice sportsmanship. Shaking hands, encouraging teammates, and respecting the referee.' },
      { subject: 'Art', idea: 'Create art that expresses gratitude for someone or something in their life.' }
    ]
  },
  [CoreValue.PEACE]: {
    id: CoreValue.PEACE,
    title: 'Peace (Shanti)',
    tagline: 'Love in Thought',
    observableBehaviors: [
      'Remains calm during stressful situations or conflicts.',
      'Practices "Silent Sitting" effectively.',
      'Moves through the classroom/corridors quietly.',
      'Waits patiently for their turn to speak.',
      'Helps de-escalate conflicts between peers.'
    ],
    teachingPrompts: [
      'What helps you find your "quiet center" when things get noisy?',
      'How does a peaceful mind help us learn better?',
      'What is the difference between "peace" and just "quiet"?',
      'How can we make our classroom a more peaceful place today?'
    ],
    curriculumLinks: [
      { subject: 'Music', idea: 'Listen to calming music. Discuss how different tempos and rhythms affect our mood and heart rate.' },
      { subject: 'Geography', idea: 'Study peace treaties or conflict resolution strategies between nations.' },
      { subject: 'Homeroom', idea: 'Start the day with a generic mindfulness or silent sitting exercise.' }
    ]
  },
  [CoreValue.RIGHT_CONDUCT]: {
    id: CoreValue.RIGHT_CONDUCT,
    title: 'Right Conduct (Dharma)',
    tagline: 'Love in Action',
    observableBehaviors: [
      'Follows instructions the first time they are given.',
      'Completes homework and assignments on time.',
      'Wears the correct uniform with pride.',
      'Returns borrowed items in good condition.',
      'Takes initiative to clean up or organize without being asked.'
    ],
    teachingPrompts: [
      'Why do we have rules? Who do they protect?',
      'What is the "right thing to do" in this situation, even if no one is watching?',
      'How does doing your duty (like homework) help your future self?',
      'What happens to a community when people ignore "Right Conduct"?'
    ],
    curriculumLinks: [
      { subject: 'Science', idea: 'Follow safety procedures in the lab strictly. Discuss why these protocols (Dharma) exist.' },
      { subject: 'Technology', idea: 'Discuss digital citizenship and responsible use of the internet.' },
      { subject: 'Sport', idea: 'Follow the rules of the game. Discuss fairness and integrity in competition.' }
    ]
  },
  [CoreValue.NON_VIOLENCE]: {
    id: CoreValue.NON_VIOLENCE,
    title: 'Non-Violence (Ahimsa)',
    tagline: 'Love in Understanding',
    observableBehaviors: [
      'Resolves conflicts with words, not hands.',
      'Protects the environment (recycling, not littering).',
      'Stands up against bullying (is an Upstander).',
      'Shows care for animals and plants.',
      'Avoids gossiping or speaking ill of others.'
    ],
    teachingPrompts: [
      'How can words be violent? How can they be healing?',
      'What does "Violence towards the environment" look like?',
      'How can we disagree without being disagreeable?',
      'Why is it important to care for things that cannot speak for themselves (animals, nature)?'
    ],
    curriculumLinks: [
      { subject: 'Geography', idea: 'Study sustainability and the impact of human activity on the environment.' },
      { subject: 'History', idea: 'Examine non-violent movements (e.g., Gandhi, MLK) and their impact.' },
      { subject: 'Science', idea: 'Biology: Study ecosystems and how harming one part affects the whole.' }
    ]
  }
};

export interface Scenario {
  id: string;
  title: string;
  description: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    feedback: string;
    associatedValue?: CoreValue;
  }[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'sc1',
    title: 'The Broken Equipment',
    description: 'During a science experiment, you notice a student accidentally knocks over a beaker and it breaks. No one else saw it happen.',
    options: [
      {
        id: 'opt1',
        text: 'The student quickly sweeps the glass into the bin and says nothing.',
        isCorrect: false,
        feedback: 'This avoids responsibility and could be dangerous for others using the bin.',
        associatedValue: undefined
      },
      {
        id: 'opt2',
        text: 'The student comes to you immediately, admits the mistake, and asks for help cleaning it up safely.',
        isCorrect: true,
        feedback: 'Perfect! This demonstrates Truth (honesty) and Right Conduct (safety/responsibility). Award them a signature!',
        associatedValue: CoreValue.TRUTH
      },
      {
        id: 'opt3',
        text: 'Another student sees it and yells, "Sir! They broke the beaker!"',
        isCorrect: false,
        feedback: 'While truth is involved, the delivery lacks Love/Peace. The focus should be on the student taking responsibility.',
        associatedValue: undefined
      }
    ]
  },
  {
    id: 'sc2',
    title: 'The Group Project Clash',
    description: 'Two students in a group are arguing. Student A wants to do all the work because they don\'t trust Student B. Student B feels excluded.',
    options: [
      {
        id: 'opt1',
        text: 'Tell Student A they are being bossy and need to stop.',
        isCorrect: false,
        feedback: 'This might stop the behavior momentarily but doesn\'t teach the underlying value of collaboration.',
        associatedValue: undefined
      },
      {
        id: 'opt2',
        text: 'Guide Student A to understand that "Love" means respecting others\' abilities and sharing the load.',
        isCorrect: true,
        feedback: 'Yes. Framing it around Love (Value Others/Collaboration) helps Student A see the "why" behind the behavior.',
        associatedValue: CoreValue.LOVE
      },
      {
        id: 'opt3',
        text: 'Separate them and make them work alone.',
        isCorrect: false,
        feedback: 'This solves the immediate noise but misses the learning opportunity about relationships.',
        associatedValue: undefined
      }
    ]
  },
  {
    id: 'sc3',
    title: 'The Unpopular Opinion',
    description: 'In a debate, a student expresses an opinion that is unpopular with the rest of the class. Others start to snicker.',
    options: [
      {
        id: 'opt1',
        text: 'The student sits down, looking embarrassed.',
        isCorrect: false,
        feedback: 'The situation is unresolved.',
        associatedValue: undefined
      },
      {
        id: 'opt2',
        text: 'Another student stands up and says, "Let\'s listen. Everyone deserves to be heard."',
        isCorrect: true,
        feedback: 'Excellent. This student is demonstrating Non-Violence (Upstander) and Right Conduct (Respect).',
        associatedValue: CoreValue.NON_VIOLENCE
      },
      {
        id: 'opt3',
        text: 'You quickly move to the next topic to avoid conflict.',
        isCorrect: false,
        feedback: 'This avoids the conflict but misses a chance to teach tolerance and respect.',
        associatedValue: undefined
      }
    ]
  }
];

