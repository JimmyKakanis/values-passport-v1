import React, { useCallback, useEffect, useState } from 'react';
import { Keyboard, Trophy, User, Users, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Student, TypingPassage, TypingRaceParticipant, TypingRunResult } from '../../types';
import { getStudent } from '../../services/dataService';
import { TypingTest } from './TypingTest';
import { TypingRaceLobby } from './TypingRaceLobby';
import { TypingRaceLive } from './TypingRaceLive';
import { getActivePeriodKey, pickRacePassage, getPassagesForPeriod } from '../../data/typingPassages';
import {
  advanceTypingProgress,
  finishRace,
  getFortnightLabel,
  getSoloPassageForStudent,
  getTypingHighScore,
  getTypingProgressVariantIndex,
  subscribeToRaceParticipants,
  updateRaceProgress,
  updateTypingHighScore,
} from '../../services/typingGame';
import { getValuesIntegrationFocus } from '../../valuesIntegrationCalendar2026';

interface Props {
  studentId?: string | null;
}

type Mode = 'menu' | 'solo' | 'lobby' | 'race' | 'results';

export const ValuesTypingGame: React.FC<Props> = ({ studentId }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [mode, setMode] = useState<Mode>('menu');
  const [raceId, setRaceId] = useState<string | null>(null);
  const [raceStartsAt, setRaceStartsAt] = useState<number | null>(null);
  const [participants, setParticipants] = useState<TypingRaceParticipant[]>([]);
  const [result, setResult] = useState<TypingRunResult | null>(null);
  const [newHighScore, setNewHighScore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [soloVariantIndex, setSoloVariantIndex] = useState(0);
  const [soloPassage, setSoloPassage] = useState<TypingPassage | null>(null);

  const periodKey = getActivePeriodKey();
  const integrationFocus = getValuesIntegrationFocus(new Date());
  const passageCount = getPassagesForPeriod(periodKey).length;

  const activePassage =
    mode === 'race' && raceId
      ? pickRacePassage(periodKey, parseInt(raceId, 10))
      : soloPassage;

  const loadSoloPassage = useCallback(async () => {
    if (!studentId) return;
    try {
      const variantIndex = await getTypingProgressVariantIndex(studentId, periodKey);
      setSoloVariantIndex(variantIndex);
      setSoloPassage(getSoloPassageForStudent(studentId, variantIndex, periodKey));
    } catch (e) {
      console.error('Failed to load solo passage progress', e);
      setSoloPassage(getSoloPassageForStudent(studentId, 0, periodKey));
      setSoloVariantIndex(0);
    }
  }, [studentId, periodKey]);

  useEffect(() => {
    if (!studentId) {
      setStudent(null);
      return;
    }
    setStudent(getStudent(studentId) ?? null);
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    getTypingHighScore(studentId).then((score) => {
      if (score && score.periodKey === periodKey) {
        setBestScore(score.adjustedWpm);
      }
    });
    getTypingProgressVariantIndex(studentId, periodKey).then(setSoloVariantIndex);
  }, [studentId, periodKey]);

  useEffect(() => {
    if (!raceId || mode !== 'race') return;
    const unsub = subscribeToRaceParticipants(raceId, setParticipants);
    return unsub;
  }, [raceId, mode]);

  const startSolo = () => {
    if (!studentId) return;
    setSoloPassage(getSoloPassageForStudent(studentId, soloVariantIndex, periodKey));
    setMode('solo');
    void loadSoloPassage();
  };

  const handleSoloComplete = useCallback(
    async (runResult: TypingRunResult) => {
      setResult(runResult);
      setMode('results');
      if (!studentId) return;
      setSaving(true);
      setSaveError(null);

      let scoreSaved = false;
      let progressError: string | null = null;

      try {
        const isNew = await updateTypingHighScore(studentId, runResult);
        scoreSaved = true;
        setNewHighScore(isNew);
        if (isNew) setBestScore(runResult.adjustedWpm);
      } catch (e) {
        console.error('Failed to save typing score', e);
      }

      try {
        const nextVariant = await advanceTypingProgress(studentId, periodKey);
        setSoloVariantIndex(nextVariant);
        setSoloPassage(getSoloPassageForStudent(studentId, nextVariant, periodKey));
      } catch (e) {
        console.error('Failed to advance typing story', e);
        progressError = 'Could not sync story progress.';
        const nextVariant = (soloVariantIndex + 1) % passageCount;
        setSoloVariantIndex(nextVariant);
        setSoloPassage(getSoloPassageForStudent(studentId, nextVariant, periodKey));
      }

      if (!scoreSaved) {
        setSaveError(
          progressError
            ? 'Could not save your score or sync story progress. Try again in a moment.'
            : 'Could not save your score. Try again in a moment.'
        );
      } else if (progressError) {
        setSaveError('Score saved. Story progress is saved on this device only for now.');
      }

      setSaving(false);
    },
    [studentId, periodKey, soloVariantIndex, passageCount]
  );

  const handleRaceComplete = useCallback(
    async (runResult: TypingRunResult) => {
      setResult(runResult);
      setMode('results');
      if (!studentId || !raceId) return;
      setSaving(true);
      try {
        await finishRace(raceId, studentId, runResult);
        const isNew = runResult.adjustedWpm > (bestScore ?? 0);
        setNewHighScore(isNew);
        if (isNew) setBestScore(runResult.adjustedWpm);
      } finally {
        setSaving(false);
      }
    },
    [studentId, raceId, bestScore]
  );

  const handleRaceProgress = useCallback(
    (progress: number) => {
      if (!studentId || !raceId) return;
      updateRaceProgress(raceId, studentId, progress, progress >= 100 ? 'finished' : 'typing');
    },
    [studentId, raceId]
  );

  const handleRaceReady = (id: string, startsAt: number) => {
    setRaceId(id);
    setRaceStartsAt(startsAt);
    setMode('race');
  };

  const resetToMenu = () => {
    setMode('menu');
    setResult(null);
    setNewHighScore(false);
    setRaceId(null);
    setRaceStartsAt(null);
    setParticipants([]);
    setSoloPassage(null);
  };

  const playAgain = () => {
    if (!studentId) return;
    setResult(null);
    setNewHighScore(false);
    setSaveError(null);
    setSoloPassage(getSoloPassageForStudent(studentId, soloVariantIndex, periodKey));
    setMode('solo');
  };

  if (!studentId || !student) {
    return (
      <div className="p-12 text-center text-gray-500">
        Sign in as a student to play Speed Type.
      </div>
    );
  }

  if (mode === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[500px] space-y-8">
        <div className="text-center space-y-2 max-w-lg">
          <h2 className="text-2xl font-bold text-blue-900">Speed Type</h2>
          <p className="text-gray-600">
            Type value-themed passages and earn your adjusted WPM score (speed × accuracy).
          </p>
          {integrationFocus && (
            <p className="text-sm text-emerald-700 font-medium">
              This fortnight: {integrationFocus.coreValue} — {integrationFocus.subValueLabel}
            </p>
          )}
          <p className="text-xs text-gray-400">{getFortnightLabel()}</p>
          <p className="text-sm text-violet-700">
            Story {soloVariantIndex + 1} of {passageCount} — finish it to unlock the next
          </p>
          {bestScore !== null && (
            <p className="text-sm text-blue-800">
              Your best this fortnight: <strong>{bestScore.toFixed(1)}</strong> adjusted WPM
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          <button
            type="button"
            onClick={startSolo}
            className="p-6 bg-white rounded-2xl shadow-lg border-2 border-blue-100 hover:border-blue-300 transition-all text-left group"
          >
            <User className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-blue-900 text-lg">Practice solo</h3>
            <p className="text-sm text-gray-500 mt-1">
              Three stories this fortnight — complete each to see the next.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode('lobby')}
            className="p-6 bg-white rounded-2xl shadow-lg border-2 border-emerald-100 hover:border-emerald-300 transition-all text-left group"
          >
            <Users className="w-8 h-8 text-emerald-600 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-blue-900 text-lg">Join a race</h3>
            <p className="text-sm text-gray-500 mt-1">New race every minute. Compete live with classmates.</p>
          </button>
        </div>

        <Link
          to="/leaderboard/typing"
          className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800"
        >
          <Trophy className="w-4 h-4" />
          View typing leaderboard
        </Link>
      </div>
    );
  }

  if (mode === 'lobby') {
    return (
      <TypingRaceLobby
        student={student}
        onRaceReady={handleRaceReady}
        onCancel={resetToMenu}
      />
    );
  }

  if (mode === 'results' && result) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[500px] space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-md w-full space-y-4">
          <Keyboard className="w-12 h-12 text-blue-600 mx-auto" />
          <h2 className="text-3xl font-bold text-blue-900">Run complete!</h2>

          <div className="grid grid-cols-3 gap-4 py-4">
            <div>
              <div className="text-xs text-gray-400 uppercase font-bold">WPM</div>
              <div className="text-2xl font-bold text-blue-900">{result.wpm}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-bold">Accuracy</div>
              <div className="text-2xl font-bold text-emerald-600">{result.accuracy}%</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-bold">Adjusted</div>
              <div className="text-2xl font-bold text-amber-600">{result.adjustedWpm}</div>
            </div>
          </div>

          {saving && (
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Saving…
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {saveError}
            </div>
          )}

          {newHighScore && !saving && !saveError && (
            <div className="bg-yellow-100 text-yellow-800 text-sm font-bold px-3 py-2 rounded-full inline-block animate-bounce">
              New fortnight high score!
            </div>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <button
              type="button"
              onClick={playAgain}
              className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700"
            >
              Next story
            </button>
            <button
              type="button"
              onClick={resetToMenu}
              className="px-6 py-3 text-gray-600 font-medium hover:text-gray-800"
            >
              Back to menu
            </button>
            <Link
              to="/leaderboard/typing"
              className="text-sm font-bold text-emerald-700 hover:underline"
            >
              See leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'solo' && !activePassage) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!activePassage) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-blue-900">{activePassage.title}</h2>
          <p className="text-sm text-gray-500">
            {activePassage.coreValue} ·{' '}
            {mode === 'race'
              ? 'Live race'
              : `Story ${soloVariantIndex + 1} of ${passageCount}`}
          </p>
        </div>
        <button
          type="button"
          onClick={resetToMenu}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Exit
        </button>
      </div>

      <div className={mode === 'race' ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : ''}>
        <div className={mode === 'race' ? 'lg:col-span-2' : ''}>
          <TypingTest
            key={activePassage.id}
            passage={activePassage}
            periodKey={periodKey}
            startAt={mode === 'race' ? raceStartsAt ?? undefined : undefined}
            onProgress={mode === 'race' ? handleRaceProgress : undefined}
            onComplete={mode === 'race' ? handleRaceComplete : handleSoloComplete}
          />
        </div>
        {mode === 'race' && (
          <div>
            <TypingRaceLive participants={participants} currentStudentId={studentId} />
          </div>
        )}
      </div>
    </div>
  );
};
