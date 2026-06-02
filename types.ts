
export enum CoreValue {
  TRUTH = 'Truth',
  LOVE = 'Love',
  PEACE = 'Peace',
  RIGHT_CONDUCT = 'Right Conduct',
  NON_VIOLENCE = 'Non-Violence'
}

export interface ValueDefinition {
  id: CoreValue;
  color: string;
  icon: string; // Lucide icon name
  description: string;
  behaviours: string[];
  subValues: string[]; // Added sub-values list
}

export type Subject = 
  | 'English' 
  | 'Math' 
  | 'Science' 
  | 'Art' 
  | 'Music' 
  | 'Japanese' 
  | 'History' 
  | 'Geography' 
  | 'Technology' 
  | 'PDHPE'
  | 'EHV'
  | 'Study Period'
  | 'Electives'
  | 'Library'
  | 'Playground' 
  | 'Homeroom'
  | 'Sport'
  | 'Excursions'
  | 'Assembly'
  | 'Sports Carnivals'
  | 'Camp'
  | string;

export interface Student {
  id: string;
  name: string;
  email: string;
  grade: string;
  avatar: string;
  avatarConfig?: {
    seed: string;
    backgroundColor?: string;
    [key: string]: any; // Allow other properties for DiceBear config
  };
  lastLoginAt?: number;
  /** Parent / guardian (email-only; no app login) */
  parentEmail?: string;
  parentName?: string;
  /** When set with parentEmail, weekly parent digest may be sent (Cloud Function). */
  parentDigestEnabled?: boolean;
  /** Unix ms when school recorded consent to contact this parent. */
  parentConsentRecordedAt?: number;
  /** When true, hidden from teacher pickers and leaderboard; student cannot sign in as active. */
  archived?: boolean;
  /** Unix ms when the account was archived (optional audit). */
  archivedAt?: number;
  /** When true, still appears in teacher pickers but is omitted from Wall of Fame / year-group standings. */
  excludeFromLeaderboard?: boolean;
}

/** Firestore `email_preferences/{emailLower}` — doc id = auth email lowercased */
export interface EmailNotificationPreferences {
  email: string;
  role: 'STUDENT' | 'TEACHER';
  achievementEmailEnabled: boolean;
  /** Email when 5+ stamps exist since the student's last login (scheduled job). */
  unseenStampsEmailEnabled: boolean;
  studentDigestEnabled: boolean;
  teacherDigestEnabled: boolean;
  /** Reserved for future daily digests; weekly job uses studentDigestEnabled / teacherDigestEnabled. */
  frequency: 'WEEKLY' | 'DAILY';
  updatedAt: number;
}

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type FeedbackKind = 'feedback' | 'suggestion';

export interface FeedbackSubmission {
  id: string;
  submitterRole: UserRole;
  submitterEmail: string;
  kind: FeedbackKind;
  message: string;
  createdAt: number;
}

export interface Teacher {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  assignedGrades?: string[]; // Grades this teacher is responsible for (Student Attention scope)
  /** Academic subjects this teacher receives stamp requests for (school-wide). */
  assignedSubjects?: Subject[];
  /** Year levels this teacher receives location/event stamp requests for. */
  homeroomGrades?: string[];
}

export interface CustomReward {
  id: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description: string;
  reward: string;
  targetGrades: string[];
  targetSubject?: Subject; // Optional: Only applies to this subject
  criteria: {
    type: 'TOTAL' | 'VALUE' | 'SUBJECT_MASTERY'; // Added SUBJECT_MASTERY support
    threshold: number;
    value?: CoreValue;
    subject?: Subject; // Used if type is SUBJECT_MASTERY
    subValue?: string; // Optional sub-value
  };
  isActive: boolean;
  createdAt: number;
}


export interface SystemSettings {
  id: string; // usually 'global-settings'
  subjects: string[];
}

export type SignatureSource = 'DIRECT' | 'NOMINATION';

export interface Signature {
  id: string;
  studentId: string;
  teacherName: string;
  subject: Subject;
  value: CoreValue;
  subValue?: string; // Added optional sub-value tag
  timestamp: number;
  note?: string;
  /** Set for new stamps; older rows may omit (use note heuristics for nominations). */
  source?: SignatureSource;
}

export type NominationType = 'SELF' | 'PEER';
export type NominationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Nomination {
  id: string;
  studentId: string; // Who receives the point
  nominatorId: string; // Who asked for it
  nominatorName: string;
  type: NominationType;
  subject: Subject;
  value: CoreValue;
  subValue?: string;
  reason: string;
  status: NominationStatus;
  timestamp: number;
  /** Nominee's grade at submit time — used for homeroom routing. */
  studentGrade?: string;
  /** Lowercase teacher emails who should review this request. */
  reviewerEmails?: string[];
}

export type AchievementType = 'TOTAL' | 'VALUE' | 'SUBJECT_MASTERY' | 'FULL_PASSPORT' | 'CUSTOM';
export type AchievementDifficulty = 'BEGINNER' | 'EASY' | 'MEDIUM' | 'CHALLENGING' | 'IMPOSSIBLE' | 'LEGEND';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  reward: string;
  icon: string;
  type: AchievementType;
  difficulty: AchievementDifficulty;
  target?: string | number; // Threshold for TOTAL, Subject Name for SUBJECT_MASTERY, Value Name for VALUE
  threshold?: number; // Count required for VALUE, TOTAL, or Mastery Level
}

export interface ClaimedReward {
  id: string;
  studentId: string;
  achievementId: string;
  teacherName: string;
  timestamp: number;
}

export interface StudentAchievement extends AchievementDefinition {
  isUnlocked: boolean;
  currentProgress: number;
  maxProgress: number;
  unlockedAt?: number;
  isClaimed?: boolean;
}

export type PlannerCategory = 'ASSIGNMENT' | 'HOMEWORK' | 'TASK';

export interface PlannerItem {
  id: string;
  studentId: string;
  title: string;
  dueDate: number; // timestamp
  category: PlannerCategory;
  isCompleted: boolean;
  createdAt: number;
}

export type GoalType = 'YEARLY' | 'SUBJECT' | 'LIFE';

export interface Goal {
  id: string;
  studentId: string;
  type: GoalType;
  title: string;
  subject?: string;
  isCompleted: boolean;
  createdAt: number;
}

/** One private intention per calendar day (local dateKey). */
export interface DailyIntention {
  id: string;
  studentId: string;
  /** Lowercase auth email — used by Firestore rules for private access. */
  ownerEmail: string;
  dateKey: string;
  text: string;
  coreValue?: CoreValue;
  subValue?: string;
  createdAt: number;
  updatedAt: number;
}

/** Private Values Lab reflection entry. */
export interface ValueReflection {
  id: string;
  studentId: string;
  ownerEmail: string;
  coreValue: CoreValue;
  subValue: string;
  text: string;
  wordCount: number;
  createdAt: number;
}

/** Fortnightly goal progress note (school-term aligned periodKey). */
export interface GoalCheckIn {
  id: string;
  goalId: string;
  studentId: string;
  ownerEmail: string;
  periodKey: string;
  progressText: string;
  createdAt: number;
  updatedAt: number;
}

/** Aggregated counts for engagement achievements (computed client-side). */
export interface StudentEngagementStats {
  intentionCount: number;
  reflectionCount: number;
  totalReflectionWords: number;
  coreValuesReflected: number;
  goalCheckInCount: number;
}
