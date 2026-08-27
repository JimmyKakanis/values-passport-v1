import React, { useEffect, useState } from 'react';
import { Loader2, Users, Timer } from 'lucide-react';
import { Student } from '../../types';
import {
  getNextRaceId,
  getNextRaceStartsAt,
  joinRace,
  leaveRace,
  subscribeToRaceParticipants,
  ensureRaceDoc,
  getFortnightLabel,
} from '../../services/typingGame';

interface Props {
  student: Student;
  onRaceReady: (raceId: string, startsAt: number) => void;
  onCancel: () => void;
}

export const TypingRaceLobby: React.FC<Props> = ({ student, onRaceReady, onCancel }) => {
  const [raceId, setRaceId] = useState(() => String(getNextRaceId()));
  const [, setStartsAt] = useState(() => getNextRaceStartsAt());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const nextId = String(getNextRaceId(now));
      const nextStart = getNextRaceStartsAt(now);
      setRaceId(nextId);
      setStartsAt(nextStart);
      setSecondsLeft(Math.max(0, Math.ceil((nextStart - now) / 1000)));

      if (joined && nextStart - now <= 3000) {
        onRaceReady(nextId, nextStart);
      }
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => clearInterval(id);
  }, [joined, onRaceReady]);

  useEffect(() => {
    if (!joined) return;
    const unsub = subscribeToRaceParticipants(raceId, (participants) => {
      setParticipantCount(participants.length);
    });
    return unsub;
  }, [joined, raceId]);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      await ensureRaceDoc(raceId);
      await joinRace(raceId, student);
      setJoined(true);
    } catch (e) {
      console.error(e);
      setError('Could not join the race. Try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveRace(raceId, student.id);
    } catch (e) {
      console.error(e);
    }
    setJoined(false);
    onCancel();
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[400px] space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-blue-900">Join the next race</h2>
        <p className="text-gray-500">{getFortnightLabel()} — value-themed passage</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md text-center space-y-6">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Timer className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-wide">Next race in</span>
        </div>
        <div className="text-5xl font-bold text-blue-900 tabular-nums">{secondsLeft}s</div>

        <div className="flex items-center justify-center gap-2 text-emerald-700">
          <Users className="w-5 h-5" />
          <span className="font-bold">
            {joined ? participantCount : '—'} student{participantCount !== 1 ? 's' : ''} joined
          </span>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!joined ? (
          <button
            type="button"
            onClick={handleJoin}
            disabled={joining || secondsLeft <= 3}
            className="w-full px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Join race
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-emerald-700 font-medium">You are in! Wait for the countdown…</p>
            <button
              type="button"
              onClick={handleLeave}
              className="text-sm text-gray-500 hover:text-red-600 underline"
            >
              Leave lobby
            </button>
          </div>
        )}

        {secondsLeft <= 3 && !joined && (
          <p className="text-xs text-amber-600">Too late for this race — wait for the next minute.</p>
        )}
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="text-gray-500 hover:text-gray-700 text-sm font-medium"
      >
        Back to menu
      </button>
    </div>
  );
};
