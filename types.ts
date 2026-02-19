
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
  behaviors: string[];
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
  | 'Library'
  | 'Technology' 
  | 'PDHPE'
  | 'EHV' 
  | 'Playground' 
  | 'Homeroom'
  | 'Sport'
  | 'Excursions'
  | 'Assembly'
  | 'Sports Carnivals'
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
}

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface Teacher {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  assignedGrades?: string[]; // Grades this teacher is responsible for
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

export interface Signature {
  id: string;
  studentId: string;
  teacherName: string;
  subject: Subject;
  value: CoreValue;
  subValue?: string; // Added optional sub-value tag
  timestamp: number;
  note?: string;
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
