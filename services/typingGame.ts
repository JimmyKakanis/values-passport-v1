import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
  Student,
  TypingLeaderboardEntry,
  TypingRace,
  TypingRaceParticipant,
  TypingRunResult,
  TypingScore,
  KeystrokeLogEntry,
  TypingProgress,
} from '../types';
import { getActivePeriodKey, pickRacePassage, getPassageForVariant, getPassagesForPeriod } from '../data/typingPassages';
import {
  getFortnightPeriodKey,
  computeTypingEngagementSnapshot,
  type TypingEngagementSnapshot,
} from './studentEngagement';
import { getStudents, isStudentShownOnLeaderboard, reloadStudentsCacheFromFirestore } from './dataService';

export type { TypingEngagementSnapshot } from './studentEngagement';

const TYPING_PROGRESS_STORAGE_KEY = 'values_passport_typing_progress';

function readLocalTypingProgress(studentId: string): TypingProgress | null {
  try {
    const raw = localStorage.getItem(TYPING_PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, TypingProgress>;
    return map[studentId] ?? null;
  } catch {
    return null;
  }
}

function writeLocalTypingProgress(progress: TypingProgress): void {
  try {
    const raw = localStorage.getItem(TYPING_PROGRESS_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, TypingProgress>) : {};
    map[progress.studentId] = progress;
    localStorage.setItem(TYPING_PROGRESS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

function progressVariantForPeriod(progress: TypingProgress | null, periodKey: string): number | null {
  if (!progress || progress.periodKey !== periodKey) return null;
  const idx = progress.variantIndex ?? 0;
  return Math.min(2, Math.max(0, idx));
}

const RACE_MS = 60_000;
const COUNTDOWN_MS = 3_000;
const MAX_WPM = 180;
const MIN_MS_PER_CHAR = 50;
const PROGRESS_THROTTLE_MS = 1500;

export { COUNTDOWN_MS, RACE_MS, PROGRESS_THROTTLE_MS };

export interface TypingStats {
  wpm: number;
  accuracy: number;
  adjustedWpm: number;
  correctCharacters: number;
  totalTypedCharacters: number;
}

export function getCurrentRaceId(now: number = Date.now()): number {
  return Math.floor(now / RACE_MS);
}

export function getNextRaceId(now: number = Date.now()): number {
  return getCurrentRaceId(now) + 1;
}

export function getNextRaceStartsAt(now: number = Date.now()): number {
  return getNextRaceId(now) * RACE_MS;
}

export function getRacePhase(
  startsAt: number,
  now: number = Date.now()
): 'lobby' | 'countdown' | 'active' | 'finished' {
  if (now < startsAt - COUNTDOWN_MS) return 'lobby';
  if (now < startsAt) return 'countdown';
  if (now < startsAt + 10 * RACE_MS) return 'active';
  return 'finished';
}

export function computeTypingStats(
  _passageText: string,
  typed: string,
  startMs: number,
  endMs: number,
  errorCount: number
): TypingStats {
  const durationMs = Math.max(endMs - startMs, 1);
  const minutes = durationMs / 60_000;
  const correctCharacters = typed.length;
  const totalTypedCharacters = typed.length + errorCount;
  const wpm = minutes > 0 ? (correctCharacters / 5) / minutes : 0;
  const accuracy =
    totalTypedCharacters > 0 ? (correctCharacters / totalTypedCharacters) * 100 : 100;
  const adjustedWpm = wpm * (accuracy / 100);

  return {
    wpm: Math.round(wpm * 10) / 10,
    accuracy: Math.round(accuracy * 10) / 10,
    adjustedWpm: Math.round(adjustedWpm * 10) / 10,
    correctCharacters,
    totalTypedCharacters,
  };
}

export function validateKeystrokeSequence(
  expectedText: string,
  typed: string,
  keystrokeLog: KeystrokeLogEntry[]
): { valid: boolean; reason?: string } {
  if (typed.length > expectedText.length) {
    return { valid: false, reason: 'Typed length exceeds passage' };
  }

  for (let i = 0; i < keystrokeLog.length; i++) {
    const prev = keystrokeLog[i - 1];
    if (prev && keystrokeLog[i].at < prev.at) {
      return { valid: false, reason: 'Non-monotonic keystroke timestamps' };
    }
  }

  const bulkThreshold = 3;
  for (let i = 1; i < keystrokeLog.length; i++) {
    const gap = keystrokeLog[i].at - keystrokeLog[i - 1].at;
    if (gap === 0 && keystrokeLog[i].key.length > 1) {
      return { valid: false, reason: 'Bulk input detected' };
    }
  }

  if (keystrokeLog.length >= bulkThreshold) {
    const firstAt = keystrokeLog[0].at;
    const burstEnd = keystrokeLog[bulkThreshold - 1].at;
    if (burstEnd - firstAt < 20) {
      return { valid: false, reason: 'Impossibly fast burst' };
    }
  }

  return { valid: true };
}

export function validateTypingResult(
  passageText: string,
  result: TypingRunResult
): { valid: boolean; reason?: string } {
  if (result.correctCharacters !== passageText.length) {
    return { valid: false, reason: 'Incomplete passage' };
  }

  const keystrokeCheck = validateKeystrokeSequence(passageText, passageText, result.keystrokeLog);
  if (!keystrokeCheck.valid) return keystrokeCheck;

  const minDuration = passageText.length * MIN_MS_PER_CHAR;
  if (result.durationMs < minDuration) {
    return { valid: false, reason: 'Duration too short for passage length' };
  }

  if (result.wpm > MAX_WPM) {
    return { valid: false, reason: 'WPM exceeds maximum' };
  }

  if (result.accuracy < 0 || result.accuracy > 100) {
    return { valid: false, reason: 'Invalid accuracy' };
  }

  const expectedAdjusted = result.wpm * (result.accuracy / 100);
  if (Math.abs(expectedAdjusted - result.adjustedWpm) > 1) {
    return { valid: false, reason: 'Adjusted WPM mismatch' };
  }

  return { valid: true };
}

function raceDocRef(raceId: string) {
  return doc(db, 'typing_races', raceId);
}

function participantDocRef(raceId: string, studentId: string) {
  return doc(db, 'typing_races', raceId, 'participants', studentId);
}

export async function ensureRaceDoc(raceId: string, periodKey?: string): Promise<TypingRace> {
  const key = periodKey ?? getActivePeriodKey();
  const numericId = parseInt(raceId, 10);
  const passage = pickRacePassage(key, numericId);
  const startsAt = numericId * RACE_MS;
  const ref = raceDocRef(raceId);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    return { raceId, ...existing.data() } as TypingRace;
  }

  const race: TypingRace = {
    raceId,
    periodKey: key,
    passageId: passage.id,
    status: 'lobby',
    startsAt,
    createdAt: Date.now(),
  };

  await setDoc(ref, race, { merge: true });
  return race;
}

export async function joinRace(
  raceId: string,
  student: Student
): Promise<void> {
  await ensureRaceDoc(raceId);
  const participant: TypingRaceParticipant = {
    studentId: student.id,
    displayName: student.name,
    grade: student.grade,
    status: 'joined',
    progress: 0,
  };
  await setDoc(participantDocRef(raceId, student.id), participant, { merge: true });
}

export async function leaveRace(raceId: string, studentId: string): Promise<void> {
  await deleteDoc(participantDocRef(raceId, studentId));
}

let lastProgressWriteByStudent = new Map<string, number>();

export async function updateRaceProgress(
  raceId: string,
  studentId: string,
  progress: number,
  status: TypingRaceParticipant['status'] = 'typing'
): Promise<void> {
  const now = Date.now();
  const last = lastProgressWriteByStudent.get(studentId) ?? 0;
  if (now - last < PROGRESS_THROTTLE_MS && progress < 100) return;
  lastProgressWriteByStudent.set(studentId, now);

  await setDoc(
    participantDocRef(raceId, studentId),
    {
      status,
      progress: Math.min(100, Math.round(progress)),
      lastProgressAt: now,
    },
    { merge: true }
  );
}

export async function finishRace(
  raceId: string,
  studentId: string,
  result: TypingRunResult
): Promise<void> {
  await setDoc(
    participantDocRef(raceId, studentId),
    {
      status: 'finished',
      progress: 100,
      wpm: result.wpm,
      accuracy: result.accuracy,
      adjustedWpm: result.adjustedWpm,
      finishedAt: result.completedAt,
      lastProgressAt: result.completedAt,
    },
    { merge: true }
  );

  await updateTypingHighScore(studentId, result);
}

export function subscribeToRace(
  raceId: string,
  callback: (race: TypingRace | null) => void
): Unsubscribe {
  return onSnapshot(raceDocRef(raceId), (snap) => {
    callback(snap.exists() ? ({ raceId, ...snap.data() } as TypingRace) : null);
  });
}

export function subscribeToRaceParticipants(
  raceId: string,
  callback: (participants: TypingRaceParticipant[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'typing_races', raceId, 'participants'), (snap) => {
    const list = snap.docs.map((d) => d.data() as TypingRaceParticipant);
    callback(list);
  });
}

export async function updateTypingHighScore(
  studentId: string,
  result: TypingRunResult
): Promise<boolean> {
  const ref = doc(db, 'typing_scores', studentId);
  const existing = await getDoc(ref);
  const current = existing.exists() ? (existing.data() as TypingScore) : null;

  if (current && current.periodKey === result.periodKey && current.adjustedWpm >= result.adjustedWpm) {
    return false;
  }

  if (current && current.periodKey !== result.periodKey && result.adjustedWpm <= 0) {
    return false;
  }

  const score: TypingScore = {
    studentId,
    periodKey: result.periodKey,
    passageId: result.passageId,
    wpm: result.wpm,
    accuracy: result.accuracy,
    adjustedWpm: result.adjustedWpm,
    durationMs: result.durationMs,
    completedAt: result.completedAt,
  };

  await setDoc(ref, score, { merge: true });
  return true;
}

export async function getTypingHighScore(studentId: string): Promise<TypingScore | null> {
  const snap = await getDoc(doc(db, 'typing_scores', studentId));
  return snap.exists() ? (snap.data() as TypingScore) : null;
}

/** Which passage variant (0–2) the student should see next in solo mode this fortnight. */
export async function getTypingProgressVariantIndex(
  studentId: string,
  periodKey?: string
): Promise<number> {
  const key = periodKey ?? getActivePeriodKey();
  const localIdx = progressVariantForPeriod(readLocalTypingProgress(studentId), key);
  try {
    const snap = await getDoc(doc(db, 'typing_progress', studentId));
    if (!snap.exists()) return localIdx ?? 0;
    const data = snap.data() as TypingProgress;
    const remoteIdx = progressVariantForPeriod(data, key);
    if (remoteIdx !== null) {
      writeLocalTypingProgress(data);
      return remoteIdx;
    }
    return localIdx ?? 0;
  } catch (e) {
    console.warn('Could not load typing progress from Firestore', e);
    return localIdx ?? 0;
  }
}

export function getSoloPassageForStudent(
  _studentId: string,
  variantIndex: number,
  periodKey?: string
) {
  const key = periodKey ?? getActivePeriodKey();
  return getPassageForVariant(key, variantIndex);
}

/** Advance to the next story after a completed solo run (wraps 2 → 0). */
export async function advanceTypingProgress(
  studentId: string,
  periodKey?: string
): Promise<number> {
  const key = periodKey ?? getActivePeriodKey();
  const current = await getTypingProgressVariantIndex(studentId, key);
  const poolSize = getPassagesForPeriod(key).length;
  const next = (current + 1) % poolSize;

  let storiesCompleted = 1;
  try {
    const snap = await getDoc(doc(db, 'typing_progress', studentId));
    if (snap.exists()) {
      const data = snap.data() as TypingProgress;
      if (data.periodKey === key) {
        storiesCompleted = (data.storiesCompleted ?? 0) + 1;
      }
    } else {
      const local = readLocalTypingProgress(studentId);
      if (local?.periodKey === key) {
        storiesCompleted = (local.storiesCompleted ?? 0) + 1;
      }
    }
  } catch {
    const local = readLocalTypingProgress(studentId);
    if (local?.periodKey === key) {
      storiesCompleted = (local.storiesCompleted ?? 0) + 1;
    }
  }

  const progress: TypingProgress = {
    studentId,
    periodKey: key,
    variantIndex: next,
    storiesCompleted,
    updatedAt: Date.now(),
  };
  writeLocalTypingProgress(progress);
  try {
    await setDoc(doc(db, 'typing_progress', studentId), progress, { merge: true });
  } catch (e) {
    console.warn('Could not sync typing progress to Firestore', e);
  }
  return next;
}

export async function getTypingEngagementSnapshot(
  studentId: string,
  periodKey?: string
): Promise<TypingEngagementSnapshot> {
  const key = periodKey ?? getActivePeriodKey();
  let score: TypingScore | null = null;
  let progress: TypingProgress | null = readLocalTypingProgress(studentId);
  try {
    const [scoreSnap, progressSnap] = await Promise.all([
      getDoc(doc(db, 'typing_scores', studentId)),
      getDoc(doc(db, 'typing_progress', studentId)),
    ]);
    score = scoreSnap.exists() ? (scoreSnap.data() as TypingScore) : null;
    if (progressSnap.exists()) {
      progress = progressSnap.data() as TypingProgress;
      writeLocalTypingProgress(progress);
    }
  } catch (e) {
    console.warn('Could not load typing engagement snapshot', e);
  }
  return computeTypingEngagementSnapshot(score, progress, key);
}

export function subscribeToTypingEngagement(
  studentId: string,
  callback: (snapshot: TypingEngagementSnapshot) => void
): Unsubscribe {
  let score: TypingScore | null = null;
  let progress: TypingProgress | null = null;
  const emit = () => callback(computeTypingEngagementSnapshot(score, progress));
  const unsubScore = onSnapshot(
    doc(db, 'typing_scores', studentId),
    (snap) => {
      score = snap.exists() ? (snap.data() as TypingScore) : null;
      emit();
    },
    () => emit()
  );
  const unsubProgress = onSnapshot(
    doc(db, 'typing_progress', studentId),
    (snap) => {
      progress = snap.exists() ? (snap.data() as TypingProgress) : null;
      if (progress) writeLocalTypingProgress(progress);
      emit();
    },
    () => emit()
  );
  return () => {
    unsubScore();
    unsubProgress();
  };
}

export async function fetchTypingLeaderboard(
  periodKey?: string
): Promise<TypingLeaderboardEntry[]> {
  const key = periodKey ?? getActivePeriodKey();
  await reloadStudentsCacheFromFirestore();

  const snap = await getDocs(
    query(collection(db, 'typing_scores'), where('periodKey', '==', key))
  );

  const scoreByStudent = new Map<string, TypingScore>();
  snap.forEach((d) => {
    scoreByStudent.set(d.id, d.data() as TypingScore);
  });

  const entries: TypingLeaderboardEntry[] = getStudents()
    .filter(isStudentShownOnLeaderboard)
    .map((student) => {
      const score = scoreByStudent.get(student.id);
      if (!score) return null;
      return {
        student,
        wpm: score.wpm,
        accuracy: score.accuracy,
        adjustedWpm: score.adjustedWpm,
        periodKey: score.periodKey,
      };
    })
    .filter((e): e is TypingLeaderboardEntry => e !== null)
    .sort((a, b) => b.adjustedWpm - a.adjustedWpm);

  return entries;
}

export function getFortnightLabel(date: Date = new Date()): string {
  const period = getFortnightPeriodKey(date);
  return period?.fortnightLabel ?? 'Practice passages';
}

export function buildRunResult(
  passageId: string,
  periodKey: string,
  passageText: string,
  typed: string,
  errorCount: number,
  startMs: number,
  endMs: number,
  keystrokeLog: KeystrokeLogEntry[]
): TypingRunResult {
  const stats = computeTypingStats(passageText, typed, startMs, endMs, errorCount);
  return {
    passageId,
    periodKey,
    ...stats,
    durationMs: endMs - startMs,
    keystrokeLog,
    completedAt: endMs,
  };
}
