import { Signature, SignatureSource, Student, Subject, CoreValue, StudentAchievement, Nomination, NominationType, ClaimedReward, PlannerItem, PlannerCategory, Teacher, SystemSettings, CustomReward, AchievementDefinition, AchievementType, AchievementDifficulty, Goal, GoalType, FeedbackSubmission, FeedbackKind, UserRole } from '../types';
import { MOCK_STUDENTS, SUBJECTS, ACHIEVEMENTS, CORE_VALUES, TEACHERS, LEADERBOARD_HIDDEN_STUDENT_EMAILS } from '../constants';
import { db } from '../firebaseConfig';
import { FirebaseError } from 'firebase/app';
import { 
  collection, 
  addDoc, 
  getDocs,
  getDoc, 
  query, 
  where, 
  doc, 
  updateDoc,
  setDoc,
  onSnapshot,
  orderBy,
  limit,
  deleteDoc,
  deleteField
} from 'firebase/firestore';

// --- CACHE & SYNC HELPERS ---
// In a real app, use a Context or Redux. For now, we'll keep a local cache to support legacy sync calls.
let cachedStudents: Student[] = [...MOCK_STUDENTS];
let cachedTeachers: Teacher[] = [...TEACHERS];

/** Active, non-archived students for pickers, leaderboard, and year-group maths (matches Firestore `archived`). */
const isActiveRosterStudent = (s: Student): boolean =>
  !s.grade.trim().toLowerCase().startsWith('graduated') && !Boolean(s.archived);

const LEADERBOARD_HIDDEN_EMAILS_LOWER = new Set(
  LEADERBOARD_HIDDEN_STUDENT_EMAILS.map((e) => e.toLowerCase())
);

/** False for QA / test accounts hidden from Wall of Fame only (still in teacher pickers). */
export const isStudentShownOnLeaderboard = (s: Student): boolean => {
  if (Boolean(s.excludeFromLeaderboard)) return false;
  const email = (s.email || '').toLowerCase().trim();
  if (email && LEADERBOARD_HIDDEN_EMAILS_LOWER.has(email)) return false;
  return true;
};

export const getStudents = (): Student[] => cachedStudents.filter(isActiveRosterStudent);

/** Entire cached roster including archived (for Admin Console). Prefer after `reloadStudentsCacheFromFirestore`. */
export const getAllStudentsFromCache = (): Student[] => [...cachedStudents];

export const getStudent = (id: string): Student | undefined => cachedStudents.find(s => s.id === id);
export const getStudentByEmail = (email: string): Student | undefined => {
  const s = cachedStudents.find((e) => e.email.toLowerCase() === email.toLowerCase());
  if (!s || Boolean(s.archived)) return undefined;
  return s;
};

/** For auth: true if this email belongs to an archived student record (blocks re-provisioning). */
export const isArchivedStudentEmail = (email: string): boolean => {
  const s = cachedStudents.find((e) => e.email.toLowerCase() === email.toLowerCase());
  return Boolean(s?.archived);
};

/**
 * Replaces `cachedStudents` with the latest `students` collection. Call after admin roster changes
 * or before leaderboard aggregation so archived/deleted rows match Firestore.
 * Returns false on error (cache left unchanged).
 */
export const reloadStudentsCacheFromFirestore = async (): Promise<boolean> => {
  try {
    const snapshot = await getDocs(collection(db, 'students'));
    cachedStudents = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
    return true;
  } catch (error) {
    console.error('Error reloading students cache:', error);
    return false;
  }
};

export const isApprovedTeacher = (email: string): boolean => {
  return cachedTeachers.some(t => t.email.toLowerCase() === email.toLowerCase());
};

// Initialize Cache from Firestore
export const initializeData = async () => {
  try {
    await reloadStudentsCacheFromFirestore();
    const teachers = await getAllTeachers();
    if (teachers.length > 0) cachedTeachers = teachers;
  } catch (e) {
    console.error('Failed to initialize data cache', e);
  }
};

// --- CRUD OPERATIONS ---

export const updateStudentAvatarConfig = async (studentId: string, config: any): Promise<boolean> => {
  try {
    // Generate URL
    let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${config.seed}`;
    
    // Add background color if present
    if (config.backgroundColor) {
        avatarUrl += `&backgroundColor=${config.backgroundColor.replace('#', '')}`;
    }
    
    // Add other properties
    Object.entries(config).forEach(([key, value]) => {
        if (key !== 'seed' && key !== 'backgroundColor' && value) {
            avatarUrl += `&${key}=${value}`;
        }
    });

    const docRef = doc(db, "students", studentId);
    await updateDoc(docRef, {
        avatar: avatarUrl,
        avatarConfig: config
    });

    // Update local cache
    cachedStudents = cachedStudents.map(s => 
        s.id === studentId ? { ...s, avatar: avatarUrl, avatarConfig: config } : s
    );
    
    return true;
  } catch (error) {
    console.error("Error updating avatar config:", error);
    return false;
  }
};

// STUDENTS
export const getAllStudents = async (): Promise<Student[]> => {
  try {
    const snapshot = await getDocs(collection(db, "students"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  } catch (error) {
    console.error("Error getting students:", error);
    return [];
  }
};

export const addStudent = async (student: Omit<Student, 'id'>): Promise<Student | null> => {
  try {
    const newRef = doc(collection(db, "students"));
    const newStudent = { 
        ...student, 
        id: newRef.id,
        archived: false,
        avatarConfig: {
            seed: student.name.replace(/\s+/g, ''),
            backgroundColor: 'b6e3f4'
        }
    };
    await setDoc(newRef, newStudent);
    cachedStudents.push(newStudent); // Update cache
    return newStudent;
  } catch (error) {
    console.error("Error adding student:", error);
    return null;
  }
};

/** Firestore `updateDoc` rejects `undefined` field values. */
const omitUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;

export const updateStudent = async (id: string, updates: Partial<Student>): Promise<boolean> => {
  try {
    const payload = omitUndefined(updates as Record<string, unknown>) as Partial<Student>;
    await updateDoc(doc(db, "students", id), payload);
    cachedStudents = cachedStudents.map(s => (s.id === id ? { ...s, ...payload } : s));
    return true;
  } catch (error) {
    console.error("Error updating student:", error);
    return false;
  }
};

export const deleteStudent = async (id: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, "students", id));
        cachedStudents = cachedStudents.filter(s => s.id !== id);
        return true;
    } catch (error) {
        console.error("Error deleting student:", error);
        return false;
    }
};

export const archiveStudents = async (
  ids: string[]
): Promise<{ success: boolean; error?: string }> => {
  if (ids.length === 0) return { success: true };
  try {
    const now = Date.now();
    await Promise.all(
      ids.map((id) =>
        updateDoc(doc(db, 'students', id), { archived: true, archivedAt: now })
      )
    );
    cachedStudents = cachedStudents.map((s) =>
      ids.includes(s.id) ? { ...s, archived: true, archivedAt: now } : s
    );
    return { success: true };
  } catch (error) {
    console.error('Error archiving students:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const unarchiveStudents = async (
  ids: string[]
): Promise<{ success: boolean; error?: string }> => {
  if (ids.length === 0) return { success: true };
  try {
    await Promise.all(
      ids.map((id) =>
        updateDoc(doc(db, 'students', id), {
          archived: false,
          archivedAt: deleteField(),
        })
      )
    );
    cachedStudents = cachedStudents.map((s) =>
      ids.includes(s.id) ? { ...s, archived: false, archivedAt: undefined } : s
    );
    return { success: true };
  } catch (error) {
    console.error('Error unarchiving students:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// TEACHERS
export const getAllTeachers = async (): Promise<Teacher[]> => {
    try {
        const snapshot = await getDocs(collection(db, "teachers"));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
    } catch (error) {
        console.error("Error getting teachers:", error);
        return [];
    }
};

export const addTeacher = async (teacher: Teacher): Promise<Teacher | null> => {
    try {
        const id = teacher.email.replace(/[^a-zA-Z0-9]/g, '_');
        const newTeacher = { ...teacher, id };
        await setDoc(doc(db, "teachers", id), newTeacher);
        cachedTeachers.push(newTeacher);
        return newTeacher;
    } catch (error) {
        console.error("Error adding teacher:", error);
        return null;
    }
};

export const removeTeacher = async (id: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, "teachers", id));
        cachedTeachers = cachedTeachers.filter(t => t.id !== id);
        return true;
    } catch (error) {
        console.error("Error removing teacher:", error);
        return false;
    }
};

export const updateTeacher = async (id: string, updates: Partial<Teacher>): Promise<boolean> => {
  try {
    const payload = omitUndefined(updates as Record<string, unknown>) as Partial<Teacher>;
    if (Object.keys(payload).length === 0) return true;
    await updateDoc(doc(db, 'teachers', id), payload as Record<string, unknown>);
    cachedTeachers = cachedTeachers.map((t) => (t.id === id ? { ...t, ...payload } : t));
    return true;
  } catch (error) {
    console.error('Error updating teacher:', error);
    return false;
  }
};

// SETTINGS (Subjects)
export const getSystemSettings = async (): Promise<SystemSettings | null> => {
    try {
        const docSnap = await getDoc(doc(db, "settings", "global-settings"));
        if (docSnap.exists()) {
            return docSnap.data() as SystemSettings;
        }
        return { id: "global-settings", subjects: SUBJECTS }; // Default fallback
    } catch (error) {
        console.error("Error getting settings:", error);
        return null;
    }
};

export const updateSubjects = async (subjects: string[]): Promise<boolean> => {
    try {
        await setDoc(doc(db, "settings", "global-settings"), { subjects }, { merge: true });
        return true;
    } catch (error) {
        console.error("Error updating subjects:", error);
        return false;
    }
};

export const getStudentProfile = async (studentId: string): Promise<Student | null> => {
  try {
    const docRef = doc(db, "students", studentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Student;
    }
    return null;
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return null;
  }
};

export const updateLastLogin = async (studentId: string) => {
  try {
    const docRef = doc(db, "students", studentId);
    // Use setDoc with merge to ensure it works even if doc missing
    const now = Date.now();
    await setDoc(docRef, { lastLoginAt: now }, { merge: true });
  } catch (error) {
    console.error("Error updating last login:", error);
  }
};

// --- SEED DATABASE ---
export const resetStudentProgress = async (studentId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`Starting progress reset for student ${studentId}...`);
    
    // 1. Signatures
    const signaturesSnapshot = await getDocs(query(collection(db, "signatures"), where("studentId", "==", studentId)));
    const sigPromises = signaturesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    // 2. Claimed Rewards
    const rewardsSnapshot = await getDocs(query(collection(db, "claimed_rewards"), where("studentId", "==", studentId)));
    const rewardPromises = rewardsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    // 3. Nominations
    const nominationsSnapshot = await getDocs(query(collection(db, "nominations"), where("studentId", "==", studentId)));
    const nomPromises = nominationsSnapshot.docs.map(doc => deleteDoc(doc.ref));

    // 4. Quiz Scores
    const quizDoc = await getDoc(doc(db, "quiz_scores", studentId));
    const quizPromises = quizDoc.exists() ? [deleteDoc(quizDoc.ref)] : [];
    
    await Promise.all([...sigPromises, ...rewardPromises, ...nomPromises, ...quizPromises]);
    
    console.log(`Progress reset successfully for student ${studentId}!`);
    return { success: true };
  } catch (error: any) {
    console.error(`Error resetting progress for student ${studentId}:`, error);
    return { success: false, error: error.message };
  }
};

export const resetAllProgress = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Starting progress reset...");
    
    // 1. Signatures
    const signaturesSnapshot = await getDocs(collection(db, "signatures"));
    const sigPromises = signaturesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    // 2. Claimed Rewards
    const rewardsSnapshot = await getDocs(collection(db, "claimed_rewards"));
    const rewardPromises = rewardsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    // 3. Nominations
    const nominationsSnapshot = await getDocs(collection(db, "nominations"));
    const nomPromises = nominationsSnapshot.docs.map(doc => deleteDoc(doc.ref));

    // 4. Quiz Scores
    const quizSnapshot = await getDocs(collection(db, "quiz_scores"));
    const quizPromises = quizSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    await Promise.all([...sigPromises, ...rewardPromises, ...nomPromises, ...quizPromises]);
    
    console.log("Progress reset successfully!");
    return { success: true };
  } catch (error: any) {
    console.error("Error resetting progress:", error);
    return { success: false, error: error.message };
  }
};

export const seedDatabase = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Starting seed...");
    
    // Seed Students
    const studentPromises = MOCK_STUDENTS.map(student => {
      return setDoc(doc(db, "students", student.id), student);
    });
    
    // Seed Teachers
    const teacherPromises = TEACHERS.map((teacher) => {
        const id = teacher.email.replace(/[^a-zA-Z0-9]/g, '_');
        return setDoc(doc(db, 'teachers', id), {
            ...teacher,
            id,
            role: teacher.role ?? 'TEACHER',
        });
    });

    // Seed Settings (Subjects)
    const settingsPromise = setDoc(doc(db, "settings", "global-settings"), {
        id: "global-settings",
        subjects: SUBJECTS
    });

    await Promise.all([...studentPromises, ...teacherPromises, settingsPromise]);
    
    // Refresh cache
    await initializeData();

    console.log("Database seeded successfully!");
    return { success: true };
  } catch (error: any) {
    console.error("Error seeding database:", error);
    return { success: false, error: error.message };
  }
};

// --- MIGRATION UTILS ---
export const migrateTeacherName = async (oldName: string, newName: string): Promise<{ success: boolean; count: number }> => {
  try {
    const q = query(
      collection(db, "signatures"),
      where("teacherName", "==", oldName)
    );
    const snapshot = await getDocs(q);
    const updates = snapshot.docs.map(doc => updateDoc(doc.ref, { teacherName: newName }));
    await Promise.all(updates);
    
    // Also update claimed rewards if they store teacher names
    const rewardsQ = query(
        collection(db, "claimed_rewards"),
        where("teacherName", "==", oldName)
    );
    const rewardsSnapshot = await getDocs(rewardsQ);
    const rewardUpdates = rewardsSnapshot.docs.map(doc => updateDoc(doc.ref, { teacherName: newName }));
    await Promise.all(rewardUpdates);

    return { success: true, count: updates.length + rewardUpdates.length };
  } catch (error) {
    console.error("Migration failed:", error);
    return { success: false, count: 0 };
  }
};


export const subscribeToSignatures = (studentId: string, callback: (signatures: Signature[]) => void) => {
  const q = query(
    collection(db, "signatures"), 
    where("studentId", "==", studentId)
  );

  return onSnapshot(q, (snapshot) => {
    const signatures = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Signature)).sort((a, b) => b.timestamp - a.timestamp);
    callback(signatures);
  }, (error) => {
    console.error("Error subscribing to signatures:", error);
    callback([]);
  });
};

export const subscribeToClaimedRewards = (studentId: string, callback: (rewardIds: string[]) => void) => {
  const q = query(
    collection(db, "claimed_rewards"),
    where("studentId", "==", studentId)
  );

  return onSnapshot(q, (snapshot) => {
    const ids = snapshot.docs.map(doc => doc.data().achievementId);
    callback(ids);
  }, (error) => {
    console.error("Error subscribing to claimed rewards:", error);
    callback([]);
  });
};

export const getSignaturesForStudent = async (studentId: string): Promise<Signature[]> => {
  try {
    const q = query(
      collection(db, "signatures"), 
      where("studentId", "==", studentId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Signature)).sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Error fetching signatures:", error);
    return [];
  }
};

export const getAllSignatures = async (): Promise<Signature[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "signatures"));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Signature));
  } catch (error) {
    console.error("Error fetching all signatures:", error);
    return [];
  }
};

export const addSignature = async (
  studentId: string, 
  teacherName: string, 
  subject: Subject, 
  value: CoreValue, 
  note?: string,
  subValue?: string,
  source?: SignatureSource
): Promise<Signature | null> => {
  try {
    const newSig = {
      studentId,
      teacherName,
      subject,
      value,
      subValue: subValue || undefined, // Changed from null to undefined
      timestamp: Date.now(),
      note: note || '',
      ...(source ? { source } : {}),
    };
    const docRef = await addDoc(collection(db, "signatures"), newSig);
    return { id: docRef.id, ...newSig };
  } catch (error) {
    console.error("Error adding signature:", error);
    return null;
  }
};

export const getRecentSignatures = async (limitCount: number = 50): Promise<Signature[]> => {
  try {
    const q = query(
      collection(db, "signatures"),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Signature));
  } catch (error) {
    console.error("Error fetching recent signatures:", error);
    return [];
  }
};

export const getTeacherSignatures = async (teacherName: string): Promise<Signature[]> => {
  try {
    const q = query(
      collection(db, "signatures"),
      where("teacherName", "==", teacherName)
    );
    const querySnapshot = await getDocs(q);
    const signatures = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Signature));
    
    // Sort in memory (Newest first)
    return signatures.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Error fetching teacher signatures:", error);
    return [];
  }
};

// --- NOMINATIONS (Database) ---

export const getPendingNominations = async (): Promise<Nomination[]> => {
  try {
    // FIX: Removed orderBy("timestamp", "desc") to avoid needing a composite index.
    // We sort the results client-side instead.
    const q = query(
      collection(db, "nominations"),
      where("status", "==", "PENDING")
    );
    const querySnapshot = await getDocs(q);
    const nominations = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Nomination));

    // Sort in memory (Newest first)
    return nominations.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Error fetching nominations:", error);
    return [];
  }
};

export const addNomination = async (
  studentId: string,
  nominatorId: string,
  nominatorName: string,
  type: NominationType,
  subject: Subject,
  value: CoreValue,
  reason: string,
  subValue?: string
): Promise<Nomination | null> => {
  try {
    const newNomination = {
      studentId,
      nominatorId,
      nominatorName,
      type,
      subject,
      value,
      subValue: subValue || undefined,
      reason,
      status: 'PENDING',
      timestamp: Date.now()
    };
    const docRef = await addDoc(collection(db, "nominations"), newNomination);
    return { id: docRef.id, ...newNomination } as Nomination;
  } catch (error) {
    console.error("Error adding nomination:", error);
    return null;
  }
};

export const approveNomination = async (nomination: Nomination, teacherName: string) => {
  try {
    const nomRef = doc(db, "nominations", nomination.id);
    await updateDoc(nomRef, { status: 'APPROVED' });
    
    // Convert to signature
    await addSignature(
      nomination.studentId,
      teacherName,
      nomination.subject,
      nomination.value,
      `${nomination.type === 'SELF' ? 'Self-Advocacy' : 'Nominated by ' + nomination.nominatorName}: ${nomination.reason}`,
      nomination.subValue,
      'NOMINATION'
    );
  } catch (error) {
    console.error("Error approving nomination:", error);
  }
};

export const rejectNomination = async (nominationId: string) => {
  try {
    const nomRef = doc(db, "nominations", nominationId);
    await updateDoc(nomRef, { status: 'REJECTED' });
  } catch (error) {
    console.error("Error rejecting nomination:", error);
  }
};

// --- REWARDS (Database) ---

export const getClaimedRewards = async (studentId: string): Promise<string[]> => {
  try {
    const q = query(
      collection(db, "claimed_rewards"),
      where("studentId", "==", studentId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data().achievementId);
  } catch (error) {
    console.error("Error fetching claimed rewards:", error);
    return [];
  }
};

export const getStudentClaimedRewards = async (studentId: string): Promise<ClaimedReward[]> => {
  try {
    const q = query(
      collection(db, "claimed_rewards"),
      where("studentId", "==", studentId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ClaimedReward)).sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Error fetching student claimed rewards:", error);
    return [];
  }
};

export const getAllClaimedRewards = async (): Promise<ClaimedReward[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "claimed_rewards"));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ClaimedReward));
  } catch (error) {
    console.error("Error fetching all claimed rewards:", error);
    return [];
  }
};

const ACHIEVEMENT_TITLE_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a.title] as const));
const OTHER_REWARD_LABEL = 'Other school rewards';

/** Rolling 7-day window for school highlights (aggregate only; no individual names). */
const HIGHLIGHTS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface SchoolHighlightsValueSlice {
  value: CoreValue;
  count: number;
}

export interface SchoolHighlightsTopClaim {
  title: string;
  count: number;
}

export interface SchoolHighlightsStats {
  stampsLast7Days: number;
  valueSlicesLast7Days: SchoolHighlightsValueSlice[];
  /** Value with the most stamps in the window, for display; null if none */
  highlightValue: CoreValue | null;
  /**
   * Value with the fewest school-wide stamps in the window (ties: stable order on CoreValue id).
   * For gentle "invitation" copy; not a competition.
   */
  spotlightValueLow: CoreValue | null;
  /** Min / max stamp count per value (all five values) — used to hide the nudge when all are tied */
  minSchoolValueCount7d: number;
  maxSchoolValueCount7d: number;
  rewardClaimsLast7Days: number;
  totalRewardClaimsAllTime: number;
  topClaimedTypesLast7Days: SchoolHighlightsTopClaim[];
}

const CORE_VALUE_TAB_ORDER: CoreValue[] = [
  CoreValue.TRUTH,
  CoreValue.LOVE,
  CoreValue.PEACE,
  CoreValue.RIGHT_CONDUCT,
  CoreValue.NON_VIOLENCE,
];

export interface SchoolHighlightsPersonal {
  stampsLast7Days: number;
  /** This student's most-often recognised value in the window, null if no stamps */
  topValue: CoreValue | null;
}

const computeSchoolHighlightsStats = (
  recentSigs: Signature[],
  allClaimed: ClaimedReward[],
  cutoff: number
): SchoolHighlightsStats => {
  const valueCounts: Record<CoreValue, number> = {
    [CoreValue.TRUTH]: 0,
    [CoreValue.LOVE]: 0,
    [CoreValue.PEACE]: 0,
    [CoreValue.RIGHT_CONDUCT]: 0,
    [CoreValue.NON_VIOLENCE]: 0,
  };
  for (const s of recentSigs) {
    if (valueCounts[s.value] !== undefined) {
      valueCounts[s.value] += 1;
    }
  }

  const valueSlicesLast7Days: SchoolHighlightsValueSlice[] = (Object.values(CoreValue) as CoreValue[])
    .map((value) => ({ value, count: valueCounts[value] }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const highlightValue = valueSlicesLast7Days[0]?.value ?? null;

  const minSchoolValueCount7d = Math.min(...CORE_VALUE_TAB_ORDER.map((v) => valueCounts[v]));
  const maxSchoolValueCount7d = Math.max(...CORE_VALUE_TAB_ORDER.map((v) => valueCounts[v]));
  const candidatesLow = CORE_VALUE_TAB_ORDER.filter((v) => valueCounts[v] === minSchoolValueCount7d);
  const spotlightValueLow = candidatesLow[0] ?? null;

  const recentClaims = allClaimed.filter((c) => c.timestamp >= cutoff);
  const claimCountByAchievement = new Map<string, number>();
  for (const c of recentClaims) {
    claimCountByAchievement.set(c.achievementId, (claimCountByAchievement.get(c.achievementId) || 0) + 1);
  }

  let otherCount = 0;
  const rows: SchoolHighlightsTopClaim[] = [];
  for (const [achievementId, count] of claimCountByAchievement) {
    const title = ACHIEVEMENT_TITLE_BY_ID.get(achievementId);
    if (title) {
      rows.push({ title, count });
    } else {
      otherCount += count;
    }
  }
  if (otherCount > 0) {
    rows.push({ title: OTHER_REWARD_LABEL, count: otherCount });
  }
  rows.sort((a, b) => b.count - a.count);
  const topClaimedTypesLast7Days = rows.slice(0, 5);

  return {
    stampsLast7Days: recentSigs.length,
    valueSlicesLast7Days,
    highlightValue,
    spotlightValueLow,
    minSchoolValueCount7d,
    maxSchoolValueCount7d,
    rewardClaimsLast7Days: recentClaims.length,
    totalRewardClaimsAllTime: allClaimed.length,
    topClaimedTypesLast7Days,
  };
};

/**
 * Aggregate school-wide stats for the student-facing highlights page (no per-student identifiers).
 */
export const getSchoolHighlightsStats = async (): Promise<SchoolHighlightsStats> => {
  const [sigs, claimed] = await Promise.all([getAllSignatures(), getAllClaimedRewards()]);
  const cutoff = Date.now() - HIGHLIGHTS_WINDOW_MS;
  const recentSigs = sigs.filter((s) => s.timestamp >= cutoff);
  return computeSchoolHighlightsStats(recentSigs, claimed, cutoff);
};

/** Good news (no personal names). `line` is varied copy; `detail` drives rich UI. */
export type GoodNewsFeedActivityKind = 'stamp' | 'claim';

export type GoodNewsFeedMilestoneKind = 'schoolMilestone' | 'yearMilestone' | 'funStat';

export type GoodNewsFeedItemKind = GoodNewsFeedActivityKind | GoodNewsFeedMilestoneKind;

export type GoodNewsFeedItem = {
  id: string;
  timestamp: number;
  line: string;
  kind: GoodNewsFeedItemKind;
  detail: GoodNewsFeedDetail;
};

export type GoodNewsFeedDetail =
  | {
      kind: 'stamp';
      yearLabel: string;
      value: CoreValue;
      /** Teacher-selected behaviour tag when present */
      subValue?: string;
      /**
       * e.g. "Truth lived as Honesty" when `subValue` is set, otherwise the core value name only.
       */
      livedAsLabel: string;
      place: string;
    }
  | {
      kind: 'claim';
      yearLabel: string;
      achievementTitle: string;
    }
  | { kind: 'schoolMilestone' }
  | { kind: 'yearMilestone'; yearLabel: string }
  | { kind: 'funStat' };

/** "Truth lived as Honesty" for feed copy; value-only when there is no sub-value on the stamp. */
export const formatValueLivedAs = (v: CoreValue, subValue?: string): string => {
  const t = (subValue || '').trim();
  if (!t) return v;
  return `${v} lived as ${t}`;
};

export interface YearLevelSnapshot {
  gradeLabel: string;
  /** Active students on the roll for this year */
  studentCount: number;
  stampsLast7Days: number;
  claimsLast7Days: number;
  /** How many of the five values had at least one stamp (7d) */
  valuesTouched7d: number;
  /** All-time stamps for students in this year (excludes unmapped / archived already filtered by getStudents) */
  totalStampsAllTime: number;
  milestoneLines: string[];
}

export interface SchoolHighlightsPageData {
  stats: SchoolHighlightsStats;
  personal: SchoolHighlightsPersonal | null;
  /** Active students (school) */
  totalStudentsOnRoll: number;
  myYearGroupLabel: string | null;
  myYearSnapshot: YearLevelSnapshot | null;
  /** Same shape as a year card, for all students on roll */
  schoolWideSnapshot: YearLevelSnapshot;
  yearSnapshots: YearLevelSnapshot[];
  feed: GoodNewsFeedItem[];
}

const YEAR_NUMBERS_7_12 = [7, 8, 9, 10, 11, 12] as const;

const normalizeToYearLabel = (grade: string): string | null => {
  const m = (grade || '').trim().match(/year\s*(\d{1,2})/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n < 7 || n > 12) return null;
  return `Year ${n}`;
};

const shortSubject = (s: string, max = 28): string => {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
};

/** Deterministic template pick for feed copy variety */
const hashPick = (seed: string, modulo: number): number => {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % modulo;
};

/**
 * Grammatically natural "where" fragment for student-facing feed (not "in the room" for the playground).
 */
const formatPlaceWhere = (place: string): string => {
  const t = place.trim();
  const l = t.toLowerCase();
  if (l === 'playground') return 'on the playground';
  if (l === 'assembly') return 'at assembly';
  if (l === 'homeroom') return 'in homeroom';
  if (l === 'sport') return 'in sport';
  if (l === 'excursions') return 'on an excursion';
  if (l === 'sports carnivals') return 'at the sports carnival';
  if (l === 'camp') return 'at camp';
  if (l === 'library') return 'in the library';
  // Subjects and other cells: "in Math", "in Japanese"
  return `in ${t}`;
};

const buildStampFeedLine = (
  yl: string,
  v: CoreValue,
  place: string,
  seed: string,
  subValue?: string
): string => {
  const where = formatPlaceWhere(place);
  const lived = formatValueLivedAs(v, subValue);
  const lines = [
    `Someone in ${yl} was recognised for ${lived} ${where}.`,
    `Teachers noticed ${lived} ${where} (${yl}).`,
    `Nice one: ${lived} showed up ${where} — a ${yl} moment worth sharing.`,
    `A student from ${yl} put ${lived} into action ${where}.`,
    `This week ${lived} showed up ${where} (${yl}).`,
    `Spotlight: ${lived} ${where} — thanks to someone in ${yl}.`,
  ];
  return lines[hashPick(seed, lines.length)];
};

const buildClaimFeedLine = (yl: string, title: string, seed: string): string => {
  const lines = [
    `Someone in ${yl} unlocked ${title}.`,
    `New achievement: ${title} (${yl}).`,
    `${yl} earned ${title} this week.`,
    `A student in ${yl} claimed ${title}.`,
    `Another milestone: ${title} (${yl}).`,
    `Great to see ${title} picked up in ${yl}.`,
  ];
  return lines[hashPick(seed, lines.length)];
};

const buildYearMilestones = (y: YearLevelSnapshot): string[] => {
  const m: string[] = [];
  if (y.stampsLast7Days >= 8) {
    m.push(`A strong week: ${y.stampsLast7Days} new recognitions together.`);
  } else if (y.stampsLast7Days >= 1) {
    m.push('Building the story week by week.');
  }
  if (y.valuesTouched7d >= 5) {
    m.push('All five values showed up in your year this week.');
  } else if (y.valuesTouched7d >= 3) {
    m.push(`${y.valuesTouched7d} different values in focus this week.`);
  }
  if (y.claimsLast7Days >= 2) {
    m.push(`${y.claimsLast7Days} achievement claims in your year this week.`);
  } else if (y.claimsLast7Days === 1) {
    m.push('An achievement was claimed in your year this week.');
  }
  for (const tier of [1000, 500, 250, 100] as const) {
    if (y.totalStampsAllTime >= tier) {
      m.push(`Together you have passed ${tier} shared value stamps, and counting.`);
      break;
    }
  }
  return m.slice(0, 4);
};

const interleaveFeedBuckets = (buckets: GoodNewsFeedItem[][], max: number): GoodNewsFeedItem[] => {
  const copies = buckets.map((b) => [...b]);
  const out: GoodNewsFeedItem[] = [];
  while (out.length < max) {
    let any = false;
    for (const b of copies) {
      if (b.length > 0 && out.length < max) {
        out.push(b.shift()!);
        any = true;
      }
    }
    if (!any) break;
  }
  return out;
};

const buildFunStatFeedItems = (
  stats: SchoolHighlightsStats,
  schoolWide: YearLevelSnapshot,
  myYear: YearLevelSnapshot | null,
  cutoff: number
): GoodNewsFeedItem[] => {
  const lines: string[] = [];
  if (stats.highlightValue) {
    const name = CORE_VALUES[stats.highlightValue].id;
    lines.push(`This week, “${name}” has the broadest share of new stamps at school.`);
  }
  if (stats.stampsLast7Days > 0) {
    lines.push(`${stats.stampsLast7Days} value moments were recorded school-wide in the last 7 days.`);
  }
  if (stats.rewardClaimsLast7Days > 0) {
    lines.push(`${stats.rewardClaimsLast7Days} achievement rewards were claimed across the school this week.`);
  }
  const top = stats.topClaimedTypesLast7Days[0];
  if (top) {
    lines.push(`Top school goal this week: ${top.title} (${top.count}×).`);
  }
  if (stats.valueSlicesLast7Days.length >= 5) {
    lines.push('All five values have at least one new stamp this week — a full set at school.');
  } else if (myYear && myYear.valuesTouched7d >= 3) {
    lines.push(`Your year had ${myYear.valuesTouched7d} different values in the spotlight this week.`);
  }
  if (schoolWide.totalStampsAllTime > 0) {
    lines.push(
      `Together the school has recorded ${schoolWide.totalStampsAllTime} shared value moments all time, and counting.`
    );
  }
  const picked = lines.slice(0, 5);
  return picked.map((line, i) => ({
    id: `fun-${i}-${hashPick(line, 1_000_000)}`,
    timestamp: cutoff + (i + 1) * 60_000,
    line,
    kind: 'funStat' as const,
    detail: { kind: 'funStat' as const },
  }));
};

/**
 * One Firestore read of signatures + claims; school + cohort + feed (no individual names in feed).
 */
export const getSchoolHighlightsPageData = async (studentId: string | null): Promise<SchoolHighlightsPageData> => {
  await reloadStudentsCacheFromFirestore();
  const [allSigs, allClaimed] = await Promise.all([getAllSignatures(), getAllClaimedRewards()]);
  const cutoff = Date.now() - HIGHLIGHTS_WINDOW_MS;

  const students = getStudents();
  const totalStudentsOnRoll = students.length;

  const studentById = new Map(students.map((s) => [s.id, s] as const));

  const sigs7d = allSigs.filter((s) => s.timestamp >= cutoff);
  const stats = computeSchoolHighlightsStats(sigs7d, allClaimed, cutoff);

  let personal: SchoolHighlightsPersonal | null = null;
  if (studentId) {
    const mine = allSigs.filter((s) => s.studentId === studentId && s.timestamp >= cutoff);
    if (mine.length === 0) {
      personal = { stampsLast7Days: 0, topValue: null };
    } else {
      const byValue: Record<CoreValue, number> = {
        [CoreValue.TRUTH]: 0,
        [CoreValue.LOVE]: 0,
        [CoreValue.PEACE]: 0,
        [CoreValue.RIGHT_CONDUCT]: 0,
        [CoreValue.NON_VIOLENCE]: 0,
      };
      for (const s of mine) {
        if (byValue[s.value] !== undefined) {
          byValue[s.value] += 1;
        }
      }
      let topValue: CoreValue | null = null;
      let best = 0;
      for (const v of CORE_VALUE_TAB_ORDER) {
        if (byValue[v] > best) {
          best = byValue[v];
          topValue = v;
        }
      }
      personal = { stampsLast7Days: mine.length, topValue: best > 0 ? topValue : null };
    }
  }

  const claims7d = allClaimed.filter((c) => c.timestamp >= cutoff);

  const idsByYear = new Map<string, Set<string>>();
  for (const n of YEAR_NUMBERS_7_12) {
    idsByYear.set(`Year ${n}`, new Set());
  }
  for (const st of students) {
    const yl = normalizeToYearLabel(st.grade);
    if (yl && idsByYear.has(yl)) {
      idsByYear.get(yl)!.add(st.id);
    }
  }

  const buildSnapshot = (gradeLabel: string, ids: Set<string>): YearLevelSnapshot => {
    const sigYear = allSigs.filter((s) => ids.has(s.studentId));
    const sig7d = sigYear.filter((s) => s.timestamp >= cutoff);
    const valuesSeen = new Set<CoreValue>();
    for (const s of sig7d) {
      valuesSeen.add(s.value);
    }
    const cl7 = claims7d.filter((c) => ids.has(c.studentId));
    const totalStampsAllTime = sigYear.length;
    const base: YearLevelSnapshot = {
      gradeLabel,
      studentCount: ids.size,
      stampsLast7Days: sig7d.length,
      claimsLast7Days: cl7.length,
      valuesTouched7d: valuesSeen.size,
      totalStampsAllTime,
      milestoneLines: [],
    };
    base.milestoneLines = buildYearMilestones(base);
    return base;
  };

  const yearSnapshots: YearLevelSnapshot[] = [];
  for (const n of YEAR_NUMBERS_7_12) {
    const label = `Year ${n}`;
    const ids = idsByYear.get(label)!;
    yearSnapshots.push(buildSnapshot(label, ids));
  }

  const allStudentIds = new Set(students.map((s) => s.id));
  const schoolWideSnapshot = buildSnapshot('Whole school', allStudentIds);

  let myYearGroupLabel: string | null = null;
  let myYearSnapshot: YearLevelSnapshot | null = null;
  if (studentId) {
    const st = studentById.get(studentId);
    if (st) {
      myYearGroupLabel = normalizeToYearLabel(st.grade);
      if (myYearGroupLabel) {
        myYearSnapshot = yearSnapshots.find((x) => x.gradeLabel === myYearGroupLabel) ?? null;
      }
    }
  }

  // --- Feed: name-free lines, 7d only, interleave stamps + claims ---
  const feed: GoodNewsFeedItem[] = [];
  for (const s of sigs7d) {
    const stu = studentById.get(s.studentId);
    if (!stu) continue;
    const yl = normalizeToYearLabel(stu.grade) ?? 'the school';
    const subj = shortSubject(String(s.subject));
    const seed = s.id;
    const sub = s.subValue?.trim() || undefined;
    const livedAsLabel = formatValueLivedAs(s.value, sub);
    feed.push({
      id: `s-${s.id}`,
      timestamp: s.timestamp,
      line: buildStampFeedLine(yl, s.value, subj, seed, sub),
      kind: 'stamp',
      detail: { kind: 'stamp', yearLabel: yl, value: s.value, subValue: sub, livedAsLabel, place: subj },
    });
  }
  for (const c of claims7d) {
    const stu = studentById.get(c.studentId);
    if (!stu) continue;
    const yl = normalizeToYearLabel(stu.grade) ?? 'the school';
    const title = ACHIEVEMENT_TITLE_BY_ID.get(c.achievementId) ?? OTHER_REWARD_LABEL;
    feed.push({
      id: `c-${c.id}`,
      timestamp: c.timestamp,
      line: buildClaimFeedLine(yl, title, c.id),
      kind: 'claim',
      detail: { kind: 'claim', yearLabel: yl, achievementTitle: title },
    });
  }
  feed.sort((a, b) => b.timestamp - a.timestamp);
  const seenLine = new Set<string>();
  const activityFeed: GoodNewsFeedItem[] = [];
  for (const f of feed) {
    if (seenLine.has(f.line)) continue;
    seenLine.add(f.line);
    activityFeed.push(f);
    if (activityFeed.length >= 14) break;
  }

  const schoolMilestoneFeed: GoodNewsFeedItem[] = schoolWideSnapshot.milestoneLines.slice(0, 3).map((line, i) => ({
    id: `msch-${i}`,
    timestamp: cutoff + (i + 1) * 30_000,
    line,
    kind: 'schoolMilestone' as const,
    detail: { kind: 'schoolMilestone' as const },
  }));

  const schoolMilestoneLineSet = new Set(schoolWideSnapshot.milestoneLines);
  const yearLines = (myYearSnapshot?.milestoneLines ?? []).filter((l) => !schoolMilestoneLineSet.has(l)).slice(0, 3);
  const yearMilestoneFeed: GoodNewsFeedItem[] =
    myYearSnapshot && yearLines.length > 0
      ? yearLines.map((line, i) => ({
          id: `myr-${i}`,
          timestamp: cutoff + (i + 1) * 45_000,
          line,
          kind: 'yearMilestone' as const,
          detail: { kind: 'yearMilestone' as const, yearLabel: myYearSnapshot.gradeLabel },
        }))
      : [];

  const funStatFeed = buildFunStatFeedItems(stats, schoolWideSnapshot, myYearSnapshot, cutoff).slice(0, 4);

  const feedFinal = interleaveFeedBuckets(
    [activityFeed, schoolMilestoneFeed, yearMilestoneFeed, funStatFeed],
    20
  );

  return {
    stats,
    personal,
    totalStudentsOnRoll,
    myYearGroupLabel,
    myYearSnapshot,
    schoolWideSnapshot,
    yearSnapshots,
    feed: feedFinal,
  };
};

/**
 * Logged-in student's own 7-day snapshot for School highlights (not compared to others).
 */
export const getSchoolHighlightsPersonal = async (studentId: string): Promise<SchoolHighlightsPersonal> => {
  const sigs = await getSignaturesForStudent(studentId);
  const cutoff = Date.now() - HIGHLIGHTS_WINDOW_MS;
  const recent = sigs.filter((s) => s.timestamp >= cutoff);
  if (recent.length === 0) {
    return { stampsLast7Days: 0, topValue: null };
  }
  const byValue: Record<CoreValue, number> = {
    [CoreValue.TRUTH]: 0,
    [CoreValue.LOVE]: 0,
    [CoreValue.PEACE]: 0,
    [CoreValue.RIGHT_CONDUCT]: 0,
    [CoreValue.NON_VIOLENCE]: 0,
  };
  for (const s of recent) {
    if (byValue[s.value] !== undefined) {
      byValue[s.value] += 1;
    }
  }
  let topValue: CoreValue | null = null;
  let best = 0;
  for (const v of CORE_VALUE_TAB_ORDER) {
    const c = byValue[v];
    if (c > best) {
      best = c;
      topValue = v;
    }
  }
  return { stampsLast7Days: recent.length, topValue: best > 0 ? topValue : null };
};

export const claimReward = async (studentId: string, achievementId: string, teacherName: string): Promise<boolean> => {
  try {
    const newClaim = {
      studentId,
      achievementId,
      teacherName,
      timestamp: Date.now()
    };
    await addDoc(collection(db, "claimed_rewards"), newClaim);
    return true;
  } catch (error) {
    console.error("Error claiming reward:", error);
    return false;
  }
};

// --- Stats Logic (Calculated from passed signatures) ---

export const calculateStats = (signatures: Signature[]) => {
  const total = signatures.length;
  
  const byValue: Record<string, number> = {};
  const bySubject: Record<string, number> = {};
  
  signatures.forEach(s => {
    byValue[s.value] = (byValue[s.value] || 0) + 1;
    bySubject[s.subject] = (bySubject[s.subject] || 0) + 1;
  });

  return { total, byValue, bySubject };
};

export const calculateStudentAchievements = (signatures: Signature[], claimedRewardIds: string[] = [], plannerItems: PlannerItem[] = [], customRewards: AchievementDefinition[] = []): StudentAchievement[] => {
  const stats = calculateStats(signatures);
  const sigs = signatures;

  // Helper to count signatures for a specific cell
  const getCount = (subject: Subject, value: CoreValue) => {
    return sigs.filter(s => s.subject === subject && s.value === value).length;
  };

  const allAchievements = [...ACHIEVEMENTS, ...customRewards];

  return allAchievements.map(ach => {
    let currentProgress = 0;
    let maxProgress = 0;
    let isUnlocked = false;

    switch (ach.type) {
      case 'TOTAL':
        maxProgress = ach.threshold || 0;
        currentProgress = stats.total;
        isUnlocked = currentProgress >= maxProgress;
        break;

      case 'VALUE':
        maxProgress = ach.threshold || 0;
        currentProgress = stats.byValue[ach.target as string] || 0;
        isUnlocked = currentProgress >= maxProgress;
        break;

      case 'SUBJECT_MASTERY':
        // Threshold 1 = 1 Star (1 Full Set), Threshold 5 = 5 Stars (5 Full Sets)
        maxProgress = ach.threshold || 1;
        
        // Calculate the "Min-Max" for this subject (Mastery Level)
        const counts = Object.values(CORE_VALUES).map(val => getCount(ach.target as Subject, val.id as CoreValue));
        const masteryLevel = Math.min(...counts);
        
        currentProgress = masteryLevel;
        isUnlocked = currentProgress >= maxProgress;
        break;

      case 'FULL_PASSPORT':
        maxProgress = SUBJECTS.length * 5; 
        const uniqueSlots = new Set(sigs.map(s => `${s.subject}-${s.value}`));
        currentProgress = uniqueSlots.size;
        isUnlocked = currentProgress >= maxProgress;
        break;

      case 'CUSTOM':
        // Custom logic for specific achievements
        if (ach.id.startsWith('master-')) {
          // Logic for VALUE MASTER: Get this value in EVERY subject
          // Format: master-truth, master-love, etc.
          // const valueName = ach.id.replace('master-', '').replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
          
          // Map back to CoreValue enum (Handle slightly different casing if needed, but 'Truth' -> 'Truth' works)
          // The IDs in constants are: master-truth, master-love, master-peace, master-right-conduct, master-non-violence
          // The CoreValue enum values are: Truth, Love, Peace, Right Conduct, Non-Violence
          
          let targetValue: CoreValue | undefined;
          
          if (ach.id === 'master-truth') targetValue = CoreValue.TRUTH;
          if (ach.id === 'master-love') targetValue = CoreValue.LOVE;
          if (ach.id === 'master-peace') targetValue = CoreValue.PEACE;
          if (ach.id === 'master-right-conduct') targetValue = CoreValue.RIGHT_CONDUCT;
          if (ach.id === 'master-non-violence') targetValue = CoreValue.NON_VIOLENCE;

          if (targetValue) {
             maxProgress = SUBJECTS.length; // 18 subjects
             // Get all unique subjects where this value was awarded
             const subjectsWithValue = new Set(
               sigs.filter(s => s.value === targetValue).map(s => s.subject)
             );
             currentProgress = subjectsWithValue.size;
             isUnlocked = currentProgress >= maxProgress;
             return {
                ...ach,
                currentProgress,
                maxProgress,
                isUnlocked,
                unlockedAt: isUnlocked ? Date.now() : undefined,
                isClaimed: claimedRewardIds.includes(ach.id)
              };
          }
        } else {
            switch (ach.id) {
            case 'seva-star': // 5 Love in Playground/Excursions
                maxProgress = 5;
                currentProgress = sigs.filter(s => 
                s.value === CoreValue.LOVE && 
                (s.subject === 'Playground' || s.subject === 'Excursions')
                ).length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'inner-peace': // 5 Peace/Right Conduct in Assembly/Homeroom
                maxProgress = 5;
                currentProgress = sigs.filter(s => 
                (s.value === CoreValue.PEACE || s.value === CoreValue.RIGHT_CONDUCT) && 
                (s.subject === 'Assembly' || s.subject === 'Homeroom')
                ).length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'planet-protector': // 5 Non-Violence in Playground
                maxProgress = 5;
                currentProgress = sigs.filter(s => 
                s.value === CoreValue.NON_VIOLENCE && s.subject === 'Playground'
                ).length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'upstander': // 3 Non-Violence in Sport/Playground
                maxProgress = 3;
                currentProgress = sigs.filter(s => 
                s.value === CoreValue.NON_VIOLENCE && 
                (s.subject === 'Sport' || s.subject === 'Playground')
                ).length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'head-heart-hand': // 1 in each category
                maxProgress = 3;
                const hasHead = sigs.some(s => ['Math', 'Science', 'English', 'History', 'Geography', 'Library', 'Japanese', 'Technology', 'PDHPE'].includes(s.subject));
                const hasHeart = sigs.some(s => ['Art', 'Music', 'EHV'].includes(s.subject));
                const hasHand = sigs.some(s => ['Sport', 'Playground', 'Excursions', 'Sports Carnivals', 'Assembly'].includes(s.subject));
                currentProgress = (hasHead ? 1 : 0) + (hasHeart ? 1 : 0) + (hasHand ? 1 : 0);
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'team-spirit': // 3 Peace/Right Conduct in Sport/Carnival
                maxProgress = 3;
                currentProgress = sigs.filter(s => 
                (s.value === CoreValue.PEACE || s.value === CoreValue.RIGHT_CONDUCT) && 
                (s.subject === 'Sport' || s.subject === 'Sports Carnivals')
                ).length;
                isUnlocked = currentProgress >= maxProgress;
                break;
            
            case 'early-bird': // 3 Peace in Homeroom
                maxProgress = 3;
                currentProgress = sigs.filter(s => s.value === CoreValue.PEACE && s.subject === 'Homeroom').length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'tech-virtue': // 3 Right Conduct in Technology
                maxProgress = 3;
                currentProgress = sigs.filter(s => s.value === CoreValue.RIGHT_CONDUCT && s.subject === 'Technology').length;
                isUnlocked = currentProgress >= maxProgress;
                break;
                
            case 'creative-spirit': // 3 in Art/Music (Any value)
                maxProgress = 3;
                currentProgress = sigs.filter(s => s.subject === 'Art' || s.subject === 'Music').length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'hat-trick': // 3 in a single day
                maxProgress = 1; // It's a binary "did it happen" check
                const sigsByDay: Record<string, number> = {};
                sigs.forEach(s => {
                const day = new Date(s.timestamp).toDateString();
                sigsByDay[day] = (sigsByDay[day] || 0) + 1;
                });
                const maxDaily = Math.max(0, ...Object.values(sigsByDay));
                currentProgress = maxDaily >= 3 ? 1 : 0;
                isUnlocked = maxDaily >= 3;
                break;
                
            // --- EXPLORERS ---
            case 'subject-explorer':
                maxProgress = 3;
                const uniqueSubjects = new Set(sigs.map(s => s.subject));
                currentProgress = uniqueSubjects.size;
                isUnlocked = currentProgress >= maxProgress;
                break;
                
            case 'value-explorer':
                maxProgress = 3;
                const uniqueValues = new Set(sigs.map(s => s.value));
                currentProgress = uniqueValues.size;
                isUnlocked = currentProgress >= maxProgress;
                break;

            // --- NEW SUB-VALUE LOGIC ---
            case 'the-optimist':
                maxProgress = 3;
                currentProgress = sigs.filter(s => s.subValue === 'Optimism').length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'deep-thinker':
                maxProgress = 3;
                currentProgress = sigs.filter(s => s.subValue === 'Reflection').length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'guardian-of-nature':
                maxProgress = 3;
                currentProgress = sigs.filter(s => s.subValue === 'Natural environment' || s.subValue === 'Care for the environment').length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'the-forgiver':
                maxProgress = 3;
                currentProgress = sigs.filter(s => s.subValue === 'Forgiveness').length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'true-friend':
                maxProgress = 3;
                currentProgress = sigs.filter(s => s.subValue === 'Friendship').length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'future-leader':
                maxProgress = 3;
                currentProgress = sigs.filter(s => s.subValue === 'Leadership').length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'mindful-master':
                maxProgress = 3;
                currentProgress = sigs.filter(s => s.subValue === 'Inner silence' || s.subValue === 'Concentration').length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'culture-champion':
                maxProgress = 2; // Made this slightly easier as it is specific
                currentProgress = sigs.filter(s => s.subValue === 'Appreciation of other cultures and religions').length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'planner-first':
                maxProgress = 1;
                currentProgress = plannerItems.length >= 1 ? 1 : 0;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'planner-10':
                maxProgress = 10;
                currentProgress = plannerItems.length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'planner-complete-5':
                maxProgress = 5;
                currentProgress = plannerItems.filter(item => item.isCompleted).length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'dependable-deputy':
                maxProgress = 3;
                currentProgress = sigs.filter(s => s.subValue === 'Dependability').length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            case 'compassionate-heart':
                maxProgress = 3;
                currentProgress = sigs.filter(s => s.subValue === 'Compassion').length;
                isUnlocked = currentProgress >= maxProgress;
                break;

            default:
                // Handle dynamic custom rewards
                // This is a bit of a hack: if we don't recognize the ID, check if it's in our custom rewards list passed in.
                // However, we are iterating over `allAchievements` which INCLUDES custom rewards.
                // So if we are here, it's either a global one we missed or a custom one.
                
                // Check if it's a known custom reward in the passed array
                const customMatch = customRewards.find(r => r.id === ach.id);
                if (customMatch) {
                    const calcType = (customMatch as any).criteria?.type || customMatch.type;
                    maxProgress = customMatch.threshold || 1;
                    if (calcType === 'TOTAL') {
                        currentProgress = stats.total;
                    } else if (calcType === 'VALUE') {
                        // Support for Sub-Value filtering
                        if ((customMatch as any).criteria?.subValue) {
                            currentProgress = sigs.filter(s => 
                                s.value === customMatch.target as string && 
                                s.subValue === (customMatch as any).criteria.subValue
                            ).length;
                        } else {
                            currentProgress = stats.byValue[customMatch.target as string] || 0;
                        }
                    } else if (calcType === 'SUBJECT_MASTERY') {
                        // Subject Mastery logic for custom rewards
                        const subjectTarget = customMatch.target as Subject;
                        if (subjectTarget) {
                            const counts = Object.values(CORE_VALUES).map(val => getCount(subjectTarget, val.id as CoreValue));
                            currentProgress = Math.min(...counts); // Minimum stamps across all values for this subject
                        } else {
                            currentProgress = 0;
                        }
                    } else {
                        currentProgress = 0;
                    }
                    isUnlocked = currentProgress >= maxProgress;
                } else {
                    maxProgress = 1;
                    currentProgress = 0;
                    isUnlocked = false;
                }
            }
        }
        break;
    }

    return {
      ...ach,
      currentProgress,
      maxProgress,
      isUnlocked,
      // Just a mock timestamp if unlocked
      unlockedAt: isUnlocked ? Date.now() : undefined,
      isClaimed: claimedRewardIds.includes(ach.id)
    };
  });
};

export interface RewardEntry {
  student: Student;
  achievement: StudentAchievement;
}

export const getPendingRewardsForTeacher = async (): Promise<RewardEntry[]> => {
  const allSignatures = await getAllSignatures();
  const allClaimed = await getAllClaimedRewards(); // returns ClaimedReward[]
  
    // Fetch all active custom rewards once
    const customRewardsSnapshot = await getDocs(query(collection(db, "custom_rewards"), where("isActive", "==", true)));
    const allCustomRewards = customRewardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomReward));
    const teacherCreatedRewardIds = new Set(allCustomRewards.map(r => r.id));
    
    const pendingRewards: RewardEntry[] = [];
  
    getStudents().forEach(student => {
    const studentSigs = allSignatures.filter(s => s.studentId === student.id);
    const studentClaimedIds = allClaimed
        .filter(c => c.studentId === student.id)
        .map(c => c.achievementId);
    
    // Filter custom rewards relevant to this student's grade
    const relevantCustomRewards = allCustomRewards
        .filter(r => r.targetGrades.includes(student.grade))
        // Map CustomReward to AchievementDefinition structure
        .map(r => ({
            id: r.id,
            title: r.title,
            description: r.description,
            reward: `Reward: ${r.reward}`, // Ensure consistent "Reward:" prefix if expected
            icon: 'Star', // Default icon
            type: 'CUSTOM' as AchievementType, // Explicit cast
            difficulty: 'MEDIUM' as AchievementDifficulty, // Default difficulty
            threshold: r.criteria.threshold,
            target: r.criteria.type === 'VALUE' ? r.criteria.value : 
                   r.criteria.type === 'SUBJECT_MASTERY' ? r.criteria.subject : undefined,
            // Include extra criteria for custom logic
            criteria: r.criteria
        } as AchievementDefinition));
    
    const achievements = calculateStudentAchievements(studentSigs, studentClaimedIds, [], relevantCustomRewards);
    
    achievements.forEach(ach => {
      // Filter Logic:
      // 1. Must be Unlocked and Not Claimed
      // 2. MUST be either:
      //    a. A Teacher-Created Custom Reward (ID is in teacherCreatedRewardIds)
      //    b. A Global Achievement with a "Tangible" reward (excludes generic badges/unlocks)
      
      const isTeacherCreated = teacherCreatedRewardIds.has(ach.id);
      const isTangibleGlobal = !isTeacherCreated && ach.reward && 
                               !ach.reward.includes('Achievement Unlocked') && 
                               !ach.reward.includes('Badge');
      
      if (ach.isUnlocked && !ach.isClaimed && (isTeacherCreated || isTangibleGlobal)) {
        pendingRewards.push({
          student,
          achievement: ach
        });
      }
    });
  });

  return pendingRewards;
};

// --- Leaderboard Logic ---

export interface LeaderboardEntry {
  student: Student;
  total: number;
  valueCounts: Record<CoreValue, number>;
  achievementCount: number;
  quizScore: number;
}

export type LeaderboardSortKey = CoreValue | 'ALL' | 'ACHIEVEMENTS' | 'POP_QUIZ';

/** Same numeric score used to sort the student leaderboard for the given mode. */
export const getLeaderboardEntryScore = (
  entry: LeaderboardEntry,
  sortBy: LeaderboardSortKey
): number => {
  if (sortBy === 'ACHIEVEMENTS') return entry.achievementCount;
  if (sortBy === 'POP_QUIZ') return entry.quizScore;
  if (sortBy === 'ALL') return entry.total;
  return entry.valueCounts[sortBy] || 0;
};

/** One row per year group (overall passport stamps). */
export interface YearGroupLeaderboardRow {
  grade: string;
  /**
   * Sum of all stamps in this year — what the student UI shows (cohort “together”, not a per-person
   * average in the copy).
   */
  totalStamps: number;
  /** Roster size for this year (shown lightly if needed). */
  studentCount: number;
  /**
   * Mean total stamps per enrolled student — used only to rank when cohort sizes differ, not shown
   * in the year-group view.
   */
  meanStamps: number;
}

/**
 * Ranks year groups by mean **overall** stamps per enrolled student (fair across cohort sizes).
 * The UI surfaces {@link YearGroupLeaderboardRow.totalStamps} instead. Tie-break: lower year number first.
 */
export const buildYearGroupLeaderboard = (entries: LeaderboardEntry[]): YearGroupLeaderboardRow[] => {
  const byGrade = new Map<string, LeaderboardEntry[]>();
  for (const e of entries) {
    const g = e.student.grade;
    if (!byGrade.has(g)) byGrade.set(g, []);
    byGrade.get(g)!.push(e);
  }

  const gradeYearOrder = (grade: string): number => {
    const m = grade.match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  };

  const rows: YearGroupLeaderboardRow[] = [];
  for (const [grade, group] of byGrade) {
    const totals = group.map((e) => e.total);
    const n = totals.length;
    const totalStamps = n > 0 ? totals.reduce((a, b) => a + b, 0) : 0;
    const meanStamps = n > 0 ? totalStamps / n : 0;
    rows.push({ grade, meanStamps, totalStamps, studentCount: n });
  }

  rows.sort((a, b) => {
    if (b.meanStamps !== a.meanStamps) return b.meanStamps - a.meanStamps;
    return gradeYearOrder(a.grade) - gradeYearOrder(b.grade);
  });

  return rows;
};

export const getAllQuizScores = async (): Promise<Record<string, number>> => {
  try {
    const querySnapshot = await getDocs(collection(db, "quiz_scores"));
    const scores: Record<string, number> = {};
    querySnapshot.forEach(doc => {
      scores[doc.id] = doc.data().score || 0;
    });
    return scores;
  } catch (error) {
    console.error("Error fetching quiz scores:", error);
    return {};
  }
};

export const updateQuizScore = async (studentId: string, score: number) => {
  try {
    const docRef = doc(db, "quiz_scores", studentId);
    // Only update if the new score is higher than the existing high score
    const existingDoc = await getDoc(docRef);
    const currentHighScore = existingDoc.exists() ? (existingDoc.data().score || 0) : 0;
    
    console.log(`Checking high score for ${studentId}. Current: ${currentHighScore}, New: ${score}`);

    if (score > currentHighScore) {
      // Use setDoc to overwrite or create, explicitly setting the score field
      await setDoc(docRef, { score: score }, { merge: true });
      console.log(`Updated high score for ${studentId}: ${score} (was ${currentHighScore})`);
      return true; // New high score
    } else {
        console.log(`Score ${score} did not beat high score ${currentHighScore}`);
    }
    return false;
  } catch (error) {
    console.error("Error updating quiz score:", error);
    return false;
  }
};

export const fetchLeaderboardData = async (sortByValue?: CoreValue | 'ACHIEVEMENTS' | 'POP_QUIZ'): Promise<LeaderboardEntry[]> => {
  // In a real production app, you would use Firestore Aggregation queries or Cloud Functions
  // to avoid downloading all signatures. For this scale (150 students), downloading all signatures is okay.

  await reloadStudentsCacheFromFirestore();

  const allSignatures = await getAllSignatures();
  const quizScores = await getAllQuizScores();
  
  const allEntries: LeaderboardEntry[] = getStudents()
    .filter(isStudentShownOnLeaderboard)
    .map((student) => {
    // Filter locally
    const studentSigs = allSignatures.filter(s => s.studentId === student.id);
    const stats = calculateStats(studentSigs);
    const valueCounts = stats.byValue as unknown as Record<CoreValue, number>;
    
    // Calculate achievements for sorting
    const achievements = calculateStudentAchievements(studentSigs, [], []);
    const achievementCount = achievements.filter(a => a.isUnlocked).length;

    return {
      student,
      total: stats.total,
      valueCounts,
      achievementCount,
      quizScore: quizScores[student.id] || 0
    };
  });

  if (sortByValue === 'POP_QUIZ') {
    return allEntries.sort((a, b) => b.quizScore - a.quizScore);
  }

  if (sortByValue === 'ACHIEVEMENTS') {
    return allEntries.sort((a, b) => b.achievementCount - a.achievementCount);
  }

  if (sortByValue) {
    return allEntries.sort((a, b) => (b.valueCounts[sortByValue] || 0) - (a.valueCounts[sortByValue] || 0));
  }

    return allEntries.sort((a, b) => b.total - a.total);
};

// --- PLANNER (Database) ---

export const subscribeToPlannerItems = (studentId: string, callback: (items: PlannerItem[]) => void) => {
  const q = query(
    collection(db, "planner"),
    where("studentId", "==", studentId)
  );

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PlannerItem)).sort((a, b) => a.dueDate - b.dueDate);
    callback(items);
  }, (error) => {
    console.error("Error subscribing to planner items:", error);
    callback([]);
  });
};

export const getPlannerItems = async (studentId: string): Promise<PlannerItem[]> => {
  try {
    const q = query(
      collection(db, "planner"),
      where("studentId", "==", studentId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PlannerItem)).sort((a, b) => a.dueDate - b.dueDate);
  } catch (error) {
    console.error("Error fetching planner items:", error);
    return [];
  }
};

export const addPlannerItem = async (
  studentId: string,
  title: string,
  dueDate: number,
  category: PlannerCategory
): Promise<PlannerItem | null> => {
  try {
    const newItem = {
      studentId,
      title,
      dueDate,
      category,
      isCompleted: false,
      createdAt: Date.now()
    };
    const docRef = await addDoc(collection(db, "planner"), newItem);
    return { id: docRef.id, ...newItem };
  } catch (error) {
    console.error("Error adding planner item:", error);
    return null;
  }
};

export const updatePlannerItem = async (itemId: string, updates: Partial<PlannerItem>) => {
  try {
    const itemRef = doc(db, "planner", itemId);
    await updateDoc(itemRef, updates);
    return true;
  } catch (error) {
    console.error("Error updating planner item:", error);
    return false;
  }
};

export const deletePlannerItem = async (itemId: string) => {
  try {
    const itemRef = doc(db, "planner", itemId);
    await deleteDoc(itemRef);
    return true;
  } catch (error) {
    console.error("Error deleting planner item:", error);
    return false;
  }
};

// --- CUSTOM REWARDS (Database) ---

export const addCustomReward = async (
  teacherId: string,
  teacherName: string,
  title: string,
  description: string,
  reward: string,
  targetGrades: string[],
  targetSubject: Subject | undefined,
  criteria: {
    type: 'TOTAL' | 'VALUE' | 'SUBJECT_MASTERY';
    threshold: number;
    value?: CoreValue;
    subject?: Subject;
    subValue?: string;
  }
): Promise<CustomReward | null> => {
  try {
    const newReward = {
      teacherId,
      teacherName,
      title,
      description,
      reward,
      targetGrades,
      targetSubject: targetSubject || null,
      criteria: {
          type: criteria.type,
          threshold: criteria.threshold,
          value: criteria.value || null,
          subject: criteria.subject || null,
          subValue: criteria.subValue || null
      },
      isActive: true,
      createdAt: Date.now()
    };
    const docRef = await addDoc(collection(db, "custom_rewards"), newReward);
    return { id: docRef.id, ...newReward } as CustomReward;
  } catch (error) {
    console.error("Error adding custom reward:", error);
    return null;
  }
};

export const getCustomRewardsForGrade = async (grade: string): Promise<CustomReward[]> => {
  try {
    const q = query(
      collection(db, "custom_rewards"),
      where("targetGrades", "array-contains", grade),
      where("isActive", "==", true)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CustomReward));
  } catch (error) {
    console.error("Error fetching custom rewards for grade:", error);
    return [];
  }
};

export const getCustomRewardsForTeacher = async (teacherId: string): Promise<CustomReward[]> => {
  try {
    const q = query(
      collection(db, "custom_rewards"),
      where("teacherId", "==", teacherId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CustomReward)).sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error fetching custom rewards for teacher:", error);
    return [];
  }
};

export const deleteCustomReward = async (rewardId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, "custom_rewards", rewardId));
    return true;
  } catch (error) {
    console.error("Error deleting custom reward:", error);
    return false;
  }
};


// --- GOALS (Database) ---

export const subscribeToGoals = (studentId: string, callback: (goals: Goal[]) => void) => {
  const q = query(
    collection(db, "goals"),
    where("studentId", "==", studentId)
  );

  return onSnapshot(q, (snapshot) => {
    const goals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Goal)).sort((a, b) => b.createdAt - a.createdAt);
    callback(goals);
  }, (error) => {
    console.error("Error subscribing to goals:", error);
    callback([]);
  });
};

export const addGoal = async (
  studentId: string,
  type: GoalType,
  title: string,
  subject?: string
): Promise<Goal | null> => {
  try {
    const newGoal: any = {
      studentId,
      type,
      title,
      isCompleted: false,
      createdAt: Date.now()
    };
    
    if (subject) {
      newGoal.subject = subject;
    }

    const docRef = await addDoc(collection(db, "goals"), newGoal);
    return { id: docRef.id, ...newGoal } as Goal;
  } catch (error) {
    console.error("Error adding goal:", error);
    return null;
  }
};

export const updateGoal = async (goalId: string, updates: Partial<Goal>) => {
  try {
    const goalRef = doc(db, "goals", goalId);
    await updateDoc(goalRef, updates);
    return true;
  } catch (error) {
    console.error("Error updating goal:", error);
    return false;
  }
};

export const deleteGoal = async (goalId: string) => {
  try {
    const goalRef = doc(db, "goals", goalId);
    await deleteDoc(goalRef);
    return true;
  } catch (error) {
    console.error("Error deleting goal:", error);
    return false;
  }
};

// --- FEEDBACK (students & teachers → admin console) ---

export type SubmitFeedbackResult =
  | { ok: true }
  | { ok: false; userMessage: string };

export const submitFeedback = async (params: {
  kind: FeedbackKind;
  message: string;
  submitterRole: UserRole;
  submitterEmail: string;
}): Promise<SubmitFeedbackResult> => {
  try {
    const trimmed = params.message.trim();
    if (!trimmed) {
      return { ok: false, userMessage: 'Please enter a message.' };
    }

    await addDoc(collection(db, "feedback_submissions"), {
      kind: params.kind,
      message: trimmed.slice(0, 2000),
      submitterRole: params.submitterRole,
      submitterEmail: params.submitterEmail.toLowerCase().trim(),
      createdAt: Date.now(),
    });
    return { ok: true };
  } catch (error) {
    console.error("Error submitting feedback:", error);
    if (error instanceof FirebaseError) {
      if (error.code === 'permission-denied') {
        return {
          ok: false,
          userMessage:
            'Saving was blocked by Firestore security rules. Deploy the updated rules from this project (the feedback_submissions block in firestore.rules) with: firebase deploy --only firestore:rules',
        };
      }
      return {
        ok: false,
        userMessage: `Could not save (${error.code}). If this keeps happening, contact support.`,
      };
    }
    return { ok: false, userMessage: 'Something went wrong. Please try again later.' };
  }
};

export const getAllFeedbackSubmissions = async (): Promise<FeedbackSubmission[]> => {
  try {
    const snapshot = await getDocs(collection(db, "feedback_submissions"));
    const rows = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as FeedbackSubmission)
    );
    return rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  } catch (error) {
    console.error("Error loading feedback submissions:", error);
    return [];
  }
};
