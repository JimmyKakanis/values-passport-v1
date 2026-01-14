
import { CoreValue, ValueDefinition, Subject, AchievementDefinition, Student, Teacher } from './types';

// Updated to a local path. Place the logo in /public/school-logo.png
export const SCHOOL_LOGO_URL = '/school-logo.png';

// Domain Locking
export const SCHOOL_EMAIL_DOMAIN = 'sathyasai.nsw.edu.au';

// Default Temporary Passwords for initial login
export const TEACHER_TEMP_PASSWORD = 'TeacherValues2025!';
export const STUDENT_TEMP_PASSWORD = 'StudentValues2025!';

// Approved Teachers List
export const TEACHERS: Teacher[] = [
  { name: 'Admin User', email: 'teacher1@sathyasai.nsw.edu.au' }, // Kept for testing
  { name: 'Ms Meredith Barrie', email: 'M.Barrie@sathyasai.nsw.edu.au' },
  { name: 'Mrs Sarah Biersteker', email: 'S.Biersteker@sathyasai.nsw.edu.au' },
  { name: 'Mrs Annette Caldicott', email: 'a.caldicott@sathyasai.nsw.edu.au' },
  { name: 'Mr Flynn Colby', email: 'f.colby@sathyasai.nsw.edu.au' },
  { name: 'Mrs Simone Coyne', email: 's.coyne@sathyasai.nsw.edu.au' },
  { name: 'Miss Amy Crossingham', email: 'a.crossingham@sathyasai.nsw.edu.au' },
  { name: 'Miss Tracey Crossingham', email: 'T.crossingham@sathyasai.nsw.edu.au' },
  { name: 'Mr Ray Farthing', email: 'itadmin@sathyasai.nsw.edu.au' },
  { name: 'Mrs Kirsty Forsyth', email: 'schooloffice_d@sathyasai.nsw.edu.au' },
  { name: 'Mr Asher Gruft', email: 'A.gruft@sathyasai.nsw.edu.au' },
  { name: 'Mrs Rebecca Hall', email: 'r.hall@sathyasai.nsw.edu.au' },
  { name: 'Mrs Joanne Hirst', email: 'j.hirst@sathyasai.nsw.edu.au' },
  { name: 'Mr Keshava Inglis', email: 'k.inglis@sathyasai.nsw.edu.au' },
  { name: 'Ms Jaime John', email: 'j.john@sathyasai.nsw.edu.au' },
  { name: 'Mrs Jenna Jones', email: 'j.jones@sathyasai.nsw.edu.au' },
  { name: 'Mr James Kakanis', email: 'j.kakanis@sathyasai.nsw.edu.au' },
  { name: 'Mr Glenn Kaminski', email: 'g.kaminski@sathyasai.nsw.edu.au' },
  { name: 'Mr Gavin Kester', email: 'g.kester@sathyasai.nsw.edu.au' },
  { name: 'Ms Rachael Lebeter', email: 'r.lebeter@sathyasai.nsw.edu.au' },
  { name: 'Mrs Michelle McLeod', email: 'M.McLeod@sathyasai.nsw.edu.au' },
  { name: 'Mr Samuel Menzies', email: 's.menzies@sathyasai.nsw.edu.au' },
  { name: 'Ms Michelle Moran', email: 'm.moran@sathyasai.nsw.edu.au' },
  { name: 'Ms Edwina Williams', email: 'e.williams@sathyasai.nsw.edu.au' },
  { name: 'Mr Clint Wilson', email: 'C.wilson@sathyasai.nsw.edu.au' },
  { name: 'Mr Aaron Shepherd', email: 'a.shepherd@sathyasai.nsw.edu.au' },
  { name: 'Mr Siva Muraliharan', email: 'businessmanager@sathyasai.nsw.edu.au' }
];

export const CORE_VALUES: Record<CoreValue, ValueDefinition> = {
  [CoreValue.TRUTH]: {
    id: CoreValue.TRUTH,
    color: 'bg-blue-100 text-blue-900 border-blue-200',
    icon: 'ShieldCheck',
    description: 'Love in speech: Speak truthfully, act with integrity.',
    behaviors: [
      'Making Learning a Priority',
      'Responsibility for actions/words',
      'Honest Words',
      'Honest Deeds'
    ],
    subValues: [
      'Consciousness', 'Creativity', 'Curiosity', 'Discrimination', 'Equality', 
      'Honesty', 'Integrity', 'Intuition', 'Natural environment', 'Reflection', 
      'Quest for knowledge', 'Reason', 'Self-analysis', 'Self-knowledge', 
      'Self-worth', 'Sense control', 'Spirit of inquiry', 'Synthesis', 
      'Truthfulness', 'Unity in thought word and deed', 'Unity in diversity'
    ]
  },
  [CoreValue.LOVE]: {
    id: CoreValue.LOVE,
    color: 'bg-pink-100 text-pink-900 border-pink-200',
    icon: 'Heart',
    description: 'Love in action: Respect learning, property, and others.',
    behaviors: [
      'Respect Learning',
      'Respect Property',
      'Value Others',
      'Selfless Service'
    ],
    subValues: [
      'Bliss', 'Caring', 'Compassion', 'Dedication', 'Devotion', 'Empathy', 
      'Friendship', 'Forgiveness', 'Generosity', 'Helping', 'Human dignity', 
      'Inner happiness', 'Joy', 'Kindness', 'Patience', 'Purity', 'Sharing', 
      'Sincerity', 'Sympathy', 'Tolerance', 'Wisdom'
    ]
  },
  [CoreValue.PEACE]: {
    id: CoreValue.PEACE,
    color: 'bg-teal-100 text-teal-900 border-teal-200',
    icon: 'Sun',
    description: 'Love in thought: Polite respect, punctuality, and calm.',
    behaviors: [
      'Polite Respect',
      'Right Place (Right time)',
      'Right Time (Punctuality)',
      'Proper Uniform'
    ],
    subValues: [
      'Attention', 'Calm', 'Concentration', 'Contentment', 'Dignity', 
      'Discipline', 'Endurance', 'Focus', 'Happiness', 'Honesty', 'Optimism', 
      'Humility', 'Inner silence', 'Satisfaction', 'Self-acceptance', 
      'Self-confidence', 'Self-control', 'Self-discipline', 'Self-respect', 
      'Understanding', 'Care for the environment', 'National responsibility'
    ]
  },
  [CoreValue.RIGHT_CONDUCT]: {
    id: CoreValue.RIGHT_CONDUCT,
    color: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    icon: 'Scale',
    description: 'Love in action: Follow instructions and duty.',
    behaviors: [
      'Attend School regularly',
      'Follow Instructions',
      'Follow Seating Plan',
      'Silent Sitting'
    ],
    subValues: [
      'Cleanliness', 'Contentment', 'Courage', 'Dependability', 'Trust', 
      'Duty', 'Dedication', 'Ethics', 'Gratitude', 'Goal-oriented', 
      'Good behaviour', 'Healthy living', 'Helpfulness', 'Initiative', 
      'Leadership', 'Perseverance', 'Time management', 'Resourcefulness', 
      'Respect', 'Responsibility', 'Sacrifice', 'Self-sufficiency', 
      'Self-confidence', 'Simplicity'
    ]
  },
  [CoreValue.NON_VIOLENCE]: {
    id: CoreValue.NON_VIOLENCE,
    color: 'bg-orange-100 text-orange-900 border-orange-200',
    icon: 'Hand',
    description: 'Love in understanding: Respect, safety, and compassion.',
    behaviors: [
      'Hands to Yourself',
      'Be an Upstander',
      'Promotion of Safety',
      'Vegetarian foods at school'
    ],
    subValues: [
      'Appreciation of cultures/religions', 'Brotherhood', 'Ceiling on desires', 
      'Citizenship', 'Compassion', 'Concern for all life', 'Consideration', 
      'Co-operation', 'Forgiveness', 'Global awareness', 'Good manners', 
      'Inclusiveness', 'Loyalty', 'National awareness', 'Recycling', 
      'Respect for property', 'Service to other', 'Social justice', 
      'Sustainable growth', 'Universal love', 'Unwilling to hurt'
    ]
  }
};

export const SUBJECTS: Subject[] = [
  'English',
  'Math',
  'Science',
  'Art',
  'Music',
  'Japanese',
  'History',
  'Geography',
  'Library',
  'Technology',
  'PDHPE',
  'EHV',
  'Homeroom',
  'Playground',
  'Sport',
  'Excursions',
  'Assembly',
  'Sports Carnivals'
];

// Helper to generate email and avatar
const createStudent = (id: string, name: string, grade: string, manualEmail?: string): Student => {
  const parts = name.split(' ');
  const first = parts[0].toLowerCase();
  const lastInitial = parts[parts.length - 1].charAt(0).toLowerCase();
  const email = manualEmail || `${first}.${lastInitial}@sathyasai.nsw.edu.au`;
  
  return {
    id,
    name,
    email,
    grade,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(' ', '')}&backgroundColor=b6e3f4`
  };
};

export const MOCK_STUDENTS: Student[] = [
  // --- TEST STUDENT ---
  createStudent('s-test-1', 'Student Test', 'Year 10', 'studenttest1@sathyasai.nsw.edu.au'),

  // Year 10
  createStudent('s1', 'Jimi Barron', 'Year 10'),
  createStudent('s2', 'Lexie Campbell', 'Year 10'),
  createStudent('s3', 'Radha Doyle', 'Year 10'),
  createStudent('s4', 'Jade Dwyer', 'Year 10'),
  createStudent('s5', 'Alfie Dyason Skelhorn', 'Year 10'),
  createStudent('s6', 'Jesse Harper', 'Year 10'),
  createStudent('s7', 'Nikita Mortimer Dafnis', 'Year 10'),
  createStudent('s8', 'Sonny Murphy', 'Year 10'),
  createStudent('s9', 'Penny O\'Brien', 'Year 10'),
  createStudent('s10', 'Finley Shore', 'Year 10'),
  createStudent('s11', 'Joseph Shore', 'Year 10'),
  createStudent('s12', 'Kai Vuurman', 'Year 10'),
  createStudent('s13', 'Asher Wagner', 'Year 10'),
  createStudent('s14', 'Bodhi Wilson', 'Year 10'),

  // Year 11
  createStudent('s15', 'Cayln Armstrong', 'Year 11'),
  createStudent('s16', 'Indira Arnold Freire', 'Year 11'),
  createStudent('s17', 'Calum Campbell', 'Year 11'),
  createStudent('s18', 'Reyannah De Guzman', 'Year 11'),
  createStudent('s19', 'Leah Ditton', 'Year 11'),
  createStudent('s20', 'Lola Dolan', 'Year 11'),
  createStudent('s21', 'Brooke Dwyer', 'Year 11'),
  createStudent('s22', 'Reuben English', 'Year 11'),
  createStudent('s23', 'Ginger Hobbins', 'Year 11'),
  createStudent('s24', 'Elliot Horvath', 'Year 11'),
  createStudent('s25', 'Odhran Ives', 'Year 11'),
  createStudent('s26', 'Jasper Pike', 'Year 11'),
  createStudent('s27', 'Thomas Spedding', 'Year 11'),
  createStudent('s28', 'Mikayla Stribling', 'Year 11'),
  createStudent('s29', 'Jacamo Symes', 'Year 11'),
  createStudent('s30', 'Charli Townsend Porter', 'Year 11'),

  // Year 12
  createStudent('s31', 'Maya Dan', 'Year 12'),
  createStudent('s32', 'Seisha Doyle', 'Year 12'),
  createStudent('s33', 'Mia Dyason Skelhorn', 'Year 12'),
  createStudent('s34', 'Tyson Evans', 'Year 12'),
  createStudent('s35', 'Jaylan Kershaw', 'Year 12'),
  createStudent('s36', 'Ambrose Maiden', 'Year 12'),
  createStudent('s37', 'Noah McInnes', 'Year 12'),
  createStudent('s38', 'Kwey Moore', 'Year 12'),
  createStudent('s39', 'Cooper Nuttall', 'Year 12'),
  createStudent('s40', 'Ariel Oczak', 'Year 12'),
  createStudent('s41', 'Nathaniel Withy', 'Year 12'),
  createStudent('s42', 'Ami Zdesar', 'Year 12'),

  // Year 7A
  createStudent('s43', 'Karmady de Graaf', 'Year 7A'),
  createStudent('s44', 'Julian Farrell', 'Year 7A'),
  createStudent('s45', 'Audrey Hilder', 'Year 7A'),
  createStudent('s46', 'Delilah Hobbins', 'Year 7A'),
  createStudent('s47', 'Dayal Johnson', 'Year 7A'),
  createStudent('s48', 'Tanika Kennedy', 'Year 7A'),
  createStudent('s49', 'Michelle Kerr', 'Year 7A'),
  createStudent('s50', 'Harry Matisons', 'Year 7A'),
  createStudent('s51', 'Spencer Mepstead', 'Year 7A'),
  createStudent('s52', 'Aimi Perrot', 'Year 7A'),
  createStudent('s53', 'Jy Pilon', 'Year 7A'),
  createStudent('s54', 'Sol Sarson', 'Year 7A'),
  createStudent('s55', 'Henry Scanlon', 'Year 7A'),
  createStudent('s56', 'Willow Smith', 'Year 7A'),
  createStudent('s57', 'Lenny Solomon', 'Year 7A'),
  createStudent('s58', 'Archie Stanbury', 'Year 7A'),
  createStudent('s59', 'Iluka Walton', 'Year 7A'),
  createStudent('s60', 'Nina White', 'Year 7A'),
  createStudent('s61', 'Sabarella Yuono', 'Year 7A'),

  // Year 7B
  createStudent('s62', 'Tobi Bartesko', 'Year 7B'),
  createStudent('s63', 'Sebastian Boudry', 'Year 7B'),
  createStudent('s64', 'Makani Carlyle', 'Year 7B'),
  createStudent('s65', 'Flynn Edmunds', 'Year 7B'),
  createStudent('s66', 'Indiana Harper', 'Year 7B'),
  createStudent('s67', 'Reggie Harrison', 'Year 7B'),
  createStudent('s68', 'Hayden Lang', 'Year 7B'),
  createStudent('s69', 'Pia Lindskog', 'Year 7B'),
  createStudent('s70', 'Kai Lowlett Richards', 'Year 7B'),
  createStudent('s71', 'Eli Macfie', 'Year 7B'),
  createStudent('s72', 'Isla Morley', 'Year 7B'),
  createStudent('s73', 'Rupert Oakman', 'Year 7B'),
  createStudent('s74', 'Riley Parker', 'Year 7B'),
  createStudent('s75', 'Lila Scapinello', 'Year 7B'),
  createStudent('s76', 'Zoe Simiana', 'Year 7B'),
  createStudent('s77', 'Ami-Ella Williams', 'Year 7B'),
  createStudent('s78', 'Finley Williams', 'Year 7B'),

  // Year 8A
  createStudent('s79', 'Ayla Barr', 'Year 8A'),
  createStudent('s80', 'Scarlett Binns', 'Year 8A'),
  createStudent('s81', 'Archie Butterworth', 'Year 8A'),
  createStudent('s82', 'Talis Cortes De Lacy', 'Year 8A'),
  createStudent('s83', 'Bella Dickinson', 'Year 8A'),
  createStudent('s84', 'Ollie Gilfillan', 'Year 8A'),
  createStudent('s85', 'Joli Hall', 'Year 8A'),
  createStudent('s86', 'Sage Hansell', 'Year 8A'),
  createStudent('s87', 'Marli Harper', 'Year 8A'),
  createStudent('s88', 'Jahzarn Johnson', 'Year 8A'),
  createStudent('s89', 'Spencer Kelly-Edwards', 'Year 8A'),
  createStudent('s90', 'Zuri Noonan', 'Year 8A'),
  createStudent('s91', 'Otis Pawson', 'Year 8A'),
  createStudent('s92', 'Sari Sarson', 'Year 8A'),
  createStudent('s93', 'Rose Trebilco', 'Year 8A'),
  createStudent('s94', 'Eva Walshe', 'Year 8A'),
  createStudent('s95', 'Kaida Watts', 'Year 8A'),
  createStudent('s96', 'Luca Zar Quin Conroy', 'Year 8A'),

  // Year 8B
  createStudent('s97', 'Tino Baggio', 'Year 8B'),
  createStudent('s98', 'Billy Bevege', 'Year 8B'),
  createStudent('s99', 'Chloe Boudry', 'Year 8B'),
  createStudent('s100', 'Hayden Bray', 'Year 8B'),
  createStudent('s101', 'Cohen Brown', 'Year 8B'),
  createStudent('s102', 'Dixie Collins', 'Year 8B'),
  createStudent('s103', 'Ether Cullen', 'Year 8B'),
  createStudent('s104', 'Karna Atua Dahl', 'Year 8B'),
  createStudent('s105', 'Flynn Day', 'Year 8B'),
  createStudent('s106', 'Ayla Edwards', 'Year 8B'),
  createStudent('s107', 'Herbie Harris', 'Year 8B'),
  createStudent('s108', 'Rosie Jones', 'Year 8B'),
  createStudent('s109', 'Marley Kershaw', 'Year 8B'),
  createStudent('s110', 'Joonatan Mansbridge', 'Year 8B'),
  createStudent('s111', 'Charlie McGregor', 'Year 8B'),
  createStudent('s112', 'Stella McVicar', 'Year 8B'),
  createStudent('s113', 'Mirabai Mitchell', 'Year 8B'),
  createStudent('s114', 'Florence Penny', 'Year 8B'),
  createStudent('s115', 'Hudson Prince', 'Year 8B'),
  createStudent('s116', 'Marlee Stayt', 'Year 8B'),
  createStudent('s117', 'Mollie Walsh', 'Year 8B'),
  createStudent('s118', 'Ayisha Williams', 'Year 8B'),

  // Year 9A
  createStudent('s119', 'Ace Carter', 'Year 9A'),
  createStudent('s120', 'Xavier Clow', 'Year 9A'),
  createStudent('s121', 'Jaci Ditton', 'Year 9A'),
  createStudent('s122', 'Willow Hall', 'Year 9A'),
  createStudent('s123', 'Joshua Hudson', 'Year 9A'),
  createStudent('s124', 'Fianaid Ives', 'Year 9A'),
  createStudent('s125', 'Jasper Pike', 'Year 9A'),
  createStudent('s126', 'Lukas Suresh', 'Year 9A'),

  // Year 9B
  createStudent('s127', 'Eden Bernard', 'Year 9B'),
  createStudent('s128', 'Layla Dart', 'Year 9B'),
  createStudent('s129', 'Ollie Davidson', 'Year 9B'),
  createStudent('s130', 'Lucian Kearns', 'Year 9B'),
  createStudent('s131', 'Izaak Law', 'Year 9B'),
  createStudent('s132', 'Anabelle McInnes', 'Year 9B'),
  createStudent('s133', 'Ebony Mepstead', 'Year 9B'),
  createStudent('s134', 'Dylan O\'Brien', 'Year 9B'),
  createStudent('s135', 'Nikolai O\'Brien', 'Year 9B'),
  createStudent('s136', 'Stella O\'Hare', 'Year 9B'),
  createStudent('s137', 'Thomas Oakman', 'Year 9B'),
  createStudent('s138', 'Azaya Plard', 'Year 9B'),
  createStudent('s139', 'Madeleine Scanlon', 'Year 9B'),
  createStudent('s140', 'Adam Shadbolt', 'Year 9B'),
  createStudent('s141', 'Jack Stanbury', 'Year 9B'),
  createStudent('s142', 'Taj Watts', 'Year 9B'),
];

// Helper to generate mastery achievements for all subjects
const generateSubjectAchievements = (): AchievementDefinition[] => {
  const achievements: AchievementDefinition[] = [];
  
  SUBJECTS.forEach(subject => {
    // Level 1: Starter
    achievements.push({
      id: `mastery-${subject.toLowerCase().replace(/ /g, '-')}-1`,
      title: `${subject} Starter`,
      description: `Earn 1 Star in ${subject} (1 stamp in all 5 values).`,
      reward: 'Reward: 10 minutes free time',
      icon: 'Star',
      type: 'SUBJECT_MASTERY',
      target: subject,
      threshold: 1,
      difficulty: 'MEDIUM'
    });

    // Level 5: Master
    achievements.push({
      id: `mastery-${subject.toLowerCase().replace(/ /g, '-')}-5`,
      title: `${subject} Master`,
      description: `Earn 5 Stars in ${subject} (5 full sets of values).`,
      reward: 'Reward: Subject Master Badge',
      icon: 'Crown',
      type: 'SUBJECT_MASTERY',
      target: subject,
      threshold: 5,
      difficulty: 'IMPOSSIBLE'
    });
  });

  return achievements;
};

// --- ACHIEVEMENTS LIST ---
export const ACHIEVEMENTS: AchievementDefinition[] = [
  // --- BEGINNER ---
  {
    id: 'milestone-10',
    title: 'Bronze Starter',
    description: 'Collect 10 total stamps.',
    reward: 'Reward: 10 minutes free time',
    icon: 'Trophy',
    type: 'TOTAL',
    threshold: 10,
    difficulty: 'BEGINNER'
  },
  {
    id: 'first-truth',
    title: 'First Truth',
    description: 'Earn your first stamp in Truth.',
    reward: 'Achievement Unlocked',
    icon: 'ShieldCheck',
    type: 'VALUE',
    target: CoreValue.TRUTH,
    threshold: 1,
    difficulty: 'BEGINNER'
  },
  {
    id: 'first-love',
    title: 'First Love',
    description: 'Earn your first stamp in Love.',
    reward: 'Achievement Unlocked',
    icon: 'Heart',
    type: 'VALUE',
    target: CoreValue.LOVE,
    threshold: 1,
    difficulty: 'BEGINNER'
  },
  {
    id: 'first-peace',
    title: 'First Peace',
    description: 'Earn your first stamp in Peace.',
    reward: 'Achievement Unlocked',
    icon: 'Sun',
    type: 'VALUE',
    target: CoreValue.PEACE,
    threshold: 1,
    difficulty: 'BEGINNER'
  },
  {
    id: 'first-right-conduct',
    title: 'First Right Conduct',
    description: 'Earn your first stamp in Right Conduct.',
    reward: 'Achievement Unlocked',
    icon: 'Scale',
    type: 'VALUE',
    target: CoreValue.RIGHT_CONDUCT,
    threshold: 1,
    difficulty: 'BEGINNER'
  },
  {
    id: 'first-non-violence',
    title: 'First Non-Violence',
    description: 'Earn your first stamp in Non-Violence.',
    reward: 'Achievement Unlocked',
    icon: 'Hand',
    type: 'VALUE',
    target: CoreValue.NON_VIOLENCE,
    threshold: 1,
    difficulty: 'BEGINNER'
  },
  {
    id: 'planner-first',
    title: 'Organizer Apprentice',
    description: 'Add your first item to the planner.',
    reward: 'Achievement Unlocked',
    icon: 'Calendar',
    type: 'CUSTOM',
    difficulty: 'BEGINNER'
  },

  // --- EASY ---
  {
    id: 'hat-trick',
    title: 'The Hat Trick',
    description: 'Earn 3 stamps in a single day.',
    reward: 'Achievement Unlocked',
    icon: 'Zap',
    type: 'CUSTOM',
    difficulty: 'EASY'
  },
  {
    id: 'planner-10',
    title: 'Master Planner',
    description: 'Add 10 items to your planner.',
    reward: 'Achievement Unlocked',
    icon: 'ListChecks',
    type: 'CUSTOM',
    difficulty: 'EASY'
  },
  {
    id: 'planner-complete-5',
    title: 'Goal Getter',
    description: 'Complete 5 tasks or assignments in your planner.',
    reward: 'Achievement Unlocked',
    icon: 'CheckCircle2',
    type: 'CUSTOM',
    difficulty: 'EASY'
  },
  {
    id: 'the-optimist',
    title: 'The Optimist',
    description: 'Recognized for "Optimism" 3 times.',
    reward: 'Achievement Unlocked',
    icon: 'Smile',
    type: 'CUSTOM',
    difficulty: 'EASY'
  },
  {
    id: 'true-friend',
    title: 'True Friend',
    description: 'Recognized for "Friendship" 3 times.',
    reward: 'Achievement Unlocked',
    icon: 'UserPlus',
    type: 'CUSTOM',
    difficulty: 'EASY'
  },
  {
    id: 'truth-collector',
    title: 'Truth Collector',
    description: 'Earn 3 stamps in Truth.',
    reward: 'Achievement Unlocked',
    icon: 'ShieldCheck',
    type: 'VALUE',
    target: CoreValue.TRUTH,
    threshold: 3,
    difficulty: 'EASY'
  },
  {
    id: 'love-collector',
    title: 'Love Collector',
    description: 'Earn 3 stamps in Love.',
    reward: 'Achievement Unlocked',
    icon: 'Heart',
    type: 'VALUE',
    target: CoreValue.LOVE,
    threshold: 3,
    difficulty: 'EASY'
  },
  {
    id: 'peace-collector',
    title: 'Peace Collector',
    description: 'Earn 3 stamps in Peace.',
    reward: 'Achievement Unlocked',
    icon: 'Sun',
    type: 'VALUE',
    target: CoreValue.PEACE,
    threshold: 3,
    difficulty: 'EASY'
  },
  {
    id: 'right-conduct-collector',
    title: 'Right Conduct Collector',
    description: 'Earn 3 stamps in Right Conduct.',
    reward: 'Achievement Unlocked',
    icon: 'Scale',
    type: 'VALUE',
    target: CoreValue.RIGHT_CONDUCT,
    threshold: 3,
    difficulty: 'EASY'
  },
  {
    id: 'non-violence-collector',
    title: 'Non-Violence Collector',
    description: 'Earn 3 stamps in Non-Violence.',
    reward: 'Achievement Unlocked',
    icon: 'Hand',
    type: 'VALUE',
    target: CoreValue.NON_VIOLENCE,
    threshold: 3,
    difficulty: 'EASY'
  },
  {
    id: 'subject-explorer',
    title: 'Subject Explorer',
    description: 'Earn stamps in 3 different subjects.',
    reward: 'Achievement Unlocked',
    icon: 'Globe',
    type: 'CUSTOM',
    difficulty: 'EASY'
  },
  {
    id: 'value-explorer',
    title: 'Value Explorer',
    description: 'Earn stamps in 3 different values.',
    reward: 'Achievement Unlocked',
    icon: 'Shapes',
    type: 'CUSTOM',
    difficulty: 'EASY'
  },
  
  // --- MEDIUM ---
  {
    id: 'milestone-25',
    title: 'Silver Collector',
    description: 'Collect 25 total stamps.',
    reward: 'Achievement Unlocked',
    icon: 'Medal',
    type: 'TOTAL',
    threshold: 25,
    difficulty: 'MEDIUM'
  },
  {
    id: 'seva-star',
    title: 'Hand of Help',
    description: 'Earn 5 Love stamps in Playground or Excursions.',
    reward: 'Achievement Unlocked',
    icon: 'HandHeart',
    type: 'CUSTOM',
    difficulty: 'MEDIUM'
  },
  {
    id: 'tech-virtue',
    title: 'Tech Virtue',
    description: 'Earn 3 Right Conduct stamps in Technology.',
    reward: 'Achievement Unlocked',
    icon: 'Laptop',
    type: 'CUSTOM',
    difficulty: 'MEDIUM'
  },
  {
    id: 'creative-spirit',
    title: 'Creative Spirit',
    description: 'Earn 3 stamps in Art or Music.',
    reward: 'Achievement Unlocked',
    icon: 'Palette',
    type: 'CUSTOM',
    difficulty: 'MEDIUM'
  },
  {
    id: 'guardian-of-nature',
    title: 'Guardian of Nature',
    description: 'Recognized for caring for the Environment 3 times.',
    reward: 'Achievement Unlocked',
    icon: 'Mountain',
    type: 'CUSTOM',
    difficulty: 'MEDIUM'
  },
  
  // Inject generated Subject Starter achievements here (MEDIUM difficulty)
  ...generateSubjectAchievements().filter(a => a.difficulty === 'MEDIUM'),

  // --- CHALLENGING ---
  {
    id: 'milestone-50',
    title: 'Gold Master',
    description: 'Collect 50 total stamps.',
    reward: 'Achievement Unlocked',
    icon: 'Gift',
    type: 'TOTAL',
    threshold: 50,
    difficulty: 'CHALLENGING'
  },
  {
    id: 'head-heart-hand',
    title: 'Head, Heart, Hand',
    description: 'Earn 1 stamp in Academic, 1 in Creative, and 1 in Active subjects.',
    reward: 'Achievement Unlocked',
    icon: 'Shapes',
    type: 'CUSTOM',
    difficulty: 'CHALLENGING'
  },
  {
    id: 'future-leader',
    title: 'Future Leader',
    description: 'Recognized for "Leadership" 3 times.',
    reward: 'Achievement Unlocked',
    icon: 'Flag',
    type: 'CUSTOM',
    difficulty: 'CHALLENGING'
  },
  {
    id: 'mindful-master',
    title: 'Mindful Master',
    description: 'Recognized for Inner Silence or Concentration 3 times.',
    reward: 'Achievement Unlocked',
    icon: 'Sparkles',
    type: 'CUSTOM',
    difficulty: 'CHALLENGING'
  },
  {
    id: 'truth-seeker',
    title: 'Truth Seeker',
    description: 'Collect 5 stamps in Truth.',
    reward: 'Achievement Unlocked',
    icon: 'ShieldCheck',
    type: 'VALUE',
    target: CoreValue.TRUTH,
    threshold: 5,
    difficulty: 'CHALLENGING'
  },
  {
    id: 'love-ambassador',
    title: 'Love Ambassador',
    description: 'Collect 5 stamps in Love.',
    reward: 'Achievement Unlocked',
    icon: 'Heart',
    type: 'VALUE',
    target: CoreValue.LOVE,
    threshold: 5,
    difficulty: 'CHALLENGING'
  },
  
  // --- VALUE MASTERS (CHALLENGING) ---
  {
    id: 'master-truth',
    title: 'Truth Master',
    description: 'Earn a Truth stamp in every subject/setting.',
    reward: 'Reward: Truth Badge',
    icon: 'ShieldCheck',
    type: 'CUSTOM',
    difficulty: 'CHALLENGING'
  },
  {
    id: 'master-love',
    title: 'Love Master',
    description: 'Earn a Love stamp in every subject/setting.',
    reward: 'Reward: Love Badge',
    icon: 'Heart',
    type: 'CUSTOM',
    difficulty: 'CHALLENGING'
  },
  {
    id: 'master-peace',
    title: 'Peace Master',
    description: 'Earn a Peace stamp in every subject/setting.',
    reward: 'Reward: Peace Badge',
    icon: 'Sun',
    type: 'CUSTOM',
    difficulty: 'CHALLENGING'
  },
  {
    id: 'master-right-conduct',
    title: 'Right Conduct Master',
    description: 'Earn a Right Conduct stamp in every subject/setting.',
    reward: 'Reward: Right Conduct Badge',
    icon: 'Scale',
    type: 'CUSTOM',
    difficulty: 'CHALLENGING'
  },
  {
    id: 'master-non-violence',
    title: 'Non-Violence Master',
    description: 'Earn a Non-Violence stamp in every subject/setting.',
    reward: 'Reward: Non-Violence Badge',
    icon: 'Hand',
    type: 'CUSTOM',
    difficulty: 'CHALLENGING'
  },

  // --- IMPOSSIBLE ---
  // Inject generated Subject Master achievements here (IMPOSSIBLE difficulty)
  ...generateSubjectAchievements().filter(a => a.difficulty === 'IMPOSSIBLE'),

  // --- ABSOLUTE LEGEND ---
  {
    id: 'milestone-100',
    title: 'Values Legend',
    description: 'Collect 100 total stamps.',
    reward: 'Achievement Unlocked',
    icon: 'Crown',
    type: 'TOTAL',
    threshold: 100,
    difficulty: 'LEGEND'
  },
  {
    id: 'full-passport',
    title: 'Passport Completed',
    description: 'Complete the entire Values Passport grid.',
    reward: 'Achievement Unlocked',
    icon: 'Trophy',
    type: 'FULL_PASSPORT',
    difficulty: 'LEGEND'
  }
];
