import { Signature, Student, Subject, CoreValue, StudentAchievement, Nomination, NominationType, ClaimedReward } from '../types';
import { MOCK_STUDENTS, SUBJECTS, ACHIEVEMENTS, CORE_VALUES, TEACHERS } from '../constants';
import { db } from '../firebaseConfig';
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
  onSnapshot
} from 'firebase/firestore';

// We keep students hardcoded for now as the "Directory", 
// but signatures and nominations go to the database.
export const getStudents = (): Student[] => MOCK_STUDENTS;

export const getStudent = (id: string): Student | undefined => MOCK_STUDENTS.find(s => s.id === id);

export const getStudentByEmail = (email: string): Student | undefined => {
  return MOCK_STUDENTS.find(s => s.email.toLowerCase() === email.toLowerCase());
};

export const isApprovedTeacher = (email: string): boolean => {
  return TEACHERS.some(t => t.email.toLowerCase() === email.toLowerCase());
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
    // Use setDoc with merge to ensure it works even if doc missing (though it shouldn't be)
    // or just updateDoc if we are sure. updateDoc is safer to error if not found.
    await updateDoc(docRef, { lastLoginAt: Date.now() });
  } catch (error) {
    console.error("Error updating last login:", error);
  }
};

// --- SEED DATABASE ---
export const seedDatabase = async (): Promise<boolean> => {
  try {
    console.log("Starting seed...");
    const promises = MOCK_STUDENTS.map(student => {
      // Use setDoc to define the ID explicitly (s1, s2, etc)
      return setDoc(doc(db, "students", student.id), student);
    });
    
    await Promise.all(promises);
    console.log("Database seeded successfully with students!");
    return true;
  } catch (error) {
    console.error("Error seeding database:", error);
    return false;
  }
};

// --- SIGNATURES (Database) ---

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
  subValue?: string
): Promise<Signature | null> => {
  try {
    const newSig = {
      studentId,
      teacherName,
      subject,
      value,
      subValue: subValue || undefined, // Changed from null to undefined
      timestamp: Date.now(),
      note: note || ''
    };
    const docRef = await addDoc(collection(db, "signatures"), newSig);
    return { id: docRef.id, ...newSig };
  } catch (error) {
    console.error("Error adding signature:", error);
    return null;
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
      nomination.subValue
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

export const calculateStudentAchievements = (signatures: Signature[], claimedRewardIds: string[] = []): StudentAchievement[] => {
  const stats = calculateStats(signatures);
  const sigs = signatures;

  // Helper to count signatures for a specific cell
  const getCount = (subject: Subject, value: CoreValue) => {
    return sigs.filter(s => s.subject === subject && s.value === value).length;
  };

  return ACHIEVEMENTS.map(ach => {
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
                maxProgress = 1;
                currentProgress = 0;
                isUnlocked = false;
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
  
  const pendingRewards: RewardEntry[] = [];

  MOCK_STUDENTS.forEach(student => {
    const studentSigs = allSignatures.filter(s => s.studentId === student.id);
    const studentClaimedIds = allClaimed
        .filter(c => c.studentId === student.id)
        .map(c => c.achievementId);
    
    const achievements = calculateStudentAchievements(studentSigs, studentClaimedIds);
    
    achievements.forEach(ach => {
      // Check if unlocked, not claimed, and has a reward text
      if (ach.isUnlocked && !ach.isClaimed && ach.reward.startsWith('Reward:')) {
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
  
  const allSignatures = await getAllSignatures();
  const quizScores = await getAllQuizScores();
  
  const allEntries: LeaderboardEntry[] = MOCK_STUDENTS.map(student => {
    // Filter locally
    const studentSigs = allSignatures.filter(s => s.studentId === student.id);
    const stats = calculateStats(studentSigs);
    const valueCounts = stats.byValue as unknown as Record<CoreValue, number>;
    
    // Calculate achievements for sorting
    const achievements = calculateStudentAchievements(studentSigs);
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
