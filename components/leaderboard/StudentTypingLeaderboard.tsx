import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Trophy, Crown, Search, X, Keyboard } from 'lucide-react';
import { fetchTypingLeaderboard, getFortnightLabel } from '../../services/typingGame';
import { STAFF_PARTICIPANT_GRADE } from '../../services/dataService';
import { TypingLeaderboardEntry } from '../../types';
import { LeaderboardFace } from './LeaderboardFace';

/**
 * Student-facing typing high-score leaderboard (adjusted WPM for current fortnight).
 */
export const StudentTypingLeaderboard: React.FC<{
  studentId?: string | null;
}> = ({ studentId }) => {
  const [leaderboard, setLeaderboard] = useState<TypingLeaderboardEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<'ALL' | '7' | '8' | '9' | '10' | '11' | '12' | 'STAFF'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchTypingLeaderboard();
      setLeaderboard(data);
      setLoading(false);
    };
    load();
  }, []);

  const filteredLeaderboard = useMemo(
    () =>
      leaderboard.filter((entry) => {
        const matchesSearch = entry.student.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGrade =
          selectedGrade === 'ALL' ||
          (selectedGrade === 'STAFF' && entry.student.grade === STAFF_PARTICIPANT_GRADE) ||
          entry.student.grade.startsWith(`Year ${selectedGrade}`);
        return matchesSearch && matchesGrade;
      }),
    [leaderboard, searchTerm, selectedGrade]
  );

  const topThree = filteredLeaderboard.slice(0, 3);
  const totalStudentLimit = selectedGrade === 'ALL' ? 20 : 10;
  const runnersUp = filteredLeaderboard.slice(3, totalStudentLimit);

  const isSearching = searchTerm.length > 0;
  const listToDisplay = isSearching ? filteredLeaderboard : runnersUp;
  const showPodium = !isSearching;

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-violet-600 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center text-sm text-gray-500">
        <Keyboard className="w-5 h-5 inline-block mr-1 text-violet-600" />
        {getFortnightLabel()} — ranked by adjusted WPM (speed × accuracy)
      </div>

      <div className="max-w-md mx-auto relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 group-focus-within:text-violet-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search by name…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-2xl leading-normal bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent sm:text-sm shadow-sm transition-all"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-red-500 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
        <span className="w-full text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
          Filter by year
        </span>
        {(['ALL', '7', '8', '9', '10', '11', '12', 'STAFF'] as const).map((grade) => (
          <button
            key={grade}
            type="button"
            onClick={() => setSelectedGrade(grade)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${
              selectedGrade === grade
                ? 'bg-violet-600 border-violet-600 text-white shadow-md scale-105'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {grade === 'ALL' ? 'All years' : grade === 'STAFF' ? 'Staff' : `Year ${grade}`}
          </button>
        ))}
      </div>

      {showPodium && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end justify-center py-6 min-h-[300px]">
          {topThree[1] && (
            <div className="order-2 md:order-1 flex flex-col items-center group">
              <div className="relative">
                <LeaderboardFace
                  student={topThree[1].student}
                  className="w-20 h-20 rounded-full border-4 border-gray-300 shadow-lg"
                />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white">
                  2nd
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-md border-t-4 border-gray-300 mt-5 w-full text-center">
                <h3 className="font-bold text-blue-900 truncate">{topThree[1].student.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{topThree[1].student.grade}</p>
                <div className="text-2xl font-bold text-gray-700 tabular-nums">
                  {topThree[1].adjustedWpm.toFixed(1)}
                  <span className="text-xs font-normal text-gray-400 ml-1">adj</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {topThree[1].wpm} wpm · {topThree[1].accuracy}%
                </p>
              </div>
            </div>
          )}

          {topThree[0] && (
            <div className="order-1 md:order-2 flex flex-col items-center z-10 transform md:-translate-y-4 group">
              <div className="relative">
                <Crown className="absolute -top-10 left-1/2 -translate-x-1/2 w-12 h-12 text-yellow-500" />
                <LeaderboardFace
                  student={topThree[0].student}
                  className="w-28 h-28 rounded-full border-4 border-yellow-400 shadow-xl"
                />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-white">
                  1st
                </div>
              </div>
              <div className="bg-gradient-to-b from-yellow-50 to-white p-6 rounded-xl shadow-lg border-t-4 border-yellow-400 mt-5 w-full text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 opacity-10">
                  <Trophy size={48} />
                </div>
                <h3 className="font-bold text-xl text-blue-900 truncate">{topThree[0].student.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{topThree[0].student.grade}</p>
                <div className="text-4xl font-bold text-yellow-600 tabular-nums">
                  {topThree[0].adjustedWpm.toFixed(1)}
                  <span className="text-sm font-normal text-gray-400 ml-1">adj</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {topThree[0].wpm} wpm · {topThree[0].accuracy}%
                </p>
              </div>
            </div>
          )}

          {topThree[2] && (
            <div className="order-3 flex flex-col items-center group">
              <div className="relative">
                <LeaderboardFace
                  student={topThree[2].student}
                  className="w-20 h-20 rounded-full border-4 border-orange-300 shadow-lg"
                />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white">
                  3rd
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-md border-t-4 border-orange-300 mt-5 w-full text-center">
                <h3 className="font-bold text-blue-900 truncate">{topThree[2].student.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{topThree[2].student.grade}</p>
                <div className="text-2xl font-bold text-gray-700 tabular-nums">
                  {topThree[2].adjustedWpm.toFixed(1)}
                  <span className="text-xs font-normal text-gray-400 ml-1">adj</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {topThree[2].wpm} wpm · {topThree[2].accuracy}%
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-bold text-blue-900">
            {isSearching
              ? `Search results (${listToDisplay.length})`
              : 'More top typists'}
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {listToDisplay.length > 0 ? (
            listToDisplay.map((entry, index) => {
              const tableRank = showPodium ? index + 4 : index + 1;
              const isYou = studentId && entry.student.id === studentId;
              return (
                <div
                  key={entry.student.id}
                  className={`flex items-center p-4 transition-colors ${
                    isYou ? 'bg-violet-50/90 ring-1 ring-inset ring-violet-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-8 font-bold text-gray-400 text-center">{tableRank}</div>
                  <LeaderboardFace student={entry.student} className="w-10 h-10 rounded-full ml-4" />
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="font-bold text-blue-900 truncate">
                      {entry.student.name}
                      {isYou && (
                        <span className="ml-2 text-xs font-bold uppercase text-violet-600">You</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{entry.student.grade}</div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-full text-sm">
                      {entry.adjustedWpm.toFixed(1)} adj
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {entry.wpm} wpm · {entry.accuracy}%
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-400">
              {isSearching
                ? 'No students match that name.'
                : 'No scores yet — head to Values Lab → Speed Type to set the first record!'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
