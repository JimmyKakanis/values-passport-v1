import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { TypingRaceParticipant } from '../../types';

interface Props {
  participants: TypingRaceParticipant[];
  currentStudentId?: string;
}

export const TypingRaceLive: React.FC<Props> = ({ participants, currentStudentId }) => {
  const sorted = useMemo(() => {
    return [...participants].sort((a, b) => {
      if (a.status === 'finished' && b.status !== 'finished') return -1;
      if (b.status === 'finished' && a.status !== 'finished') return 1;
      if (a.status === 'finished' && b.status === 'finished') {
        return (b.adjustedWpm ?? 0) - (a.adjustedWpm ?? 0);
      }
      return b.progress - a.progress;
    });
  }, [participants]);

  if (participants.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold text-blue-900">Live standings</h3>
        <span className="text-xs text-gray-400 ml-auto">{participants.length} racing</span>
      </div>
      <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
        {sorted.map((p, i) => {
          const isYou = currentStudentId === p.studentId;
          return (
            <div
              key={p.studentId}
              className={`flex items-center gap-3 p-3 text-sm ${
                isYou ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200' : ''
              }`}
            >
              <span className="w-6 text-center font-bold text-gray-400">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-blue-900 truncate">
                  {p.displayName}
                  {isYou && (
                    <span className="ml-1 text-xs text-emerald-600 uppercase">You</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">{p.grade}</div>
              </div>
              {p.status === 'finished' ? (
                <div className="text-right tabular-nums">
                  <div className="font-bold text-emerald-600">{p.adjustedWpm?.toFixed(1)} adj</div>
                  <div className="text-xs text-gray-400">
                    {p.wpm} wpm · {p.accuracy}%
                  </div>
                </div>
              ) : (
                <div className="w-20">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 text-right mt-0.5">{p.progress}%</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
