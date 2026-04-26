import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Trophy, Crown, Search, X } from 'lucide-react';
import { fetchLeaderboardData, LeaderboardEntry, getLeaderboardEntryScore } from '../../services/dataService';
import { getLeaderboardMetricUnit } from './LeaderboardShared';

const FILTER: 'POP_QUIZ' = 'POP_QUIZ';

/**
 * Student-facing quiz high-score leaderboard (same ordering as staff “Quiz” filter).
 * No value/stamp/badges filters — quiz only.
 */
export const StudentQuizLeaderboard: React.FC<{
  /** When set, the row for this student is visually highlighted. */
  studentId?: string | null;
}> = ({ studentId }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<'ALL' | '7' | '8' | '9' | '10' | '11' | '12'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchLeaderboardData('POP_QUIZ');
      setLeaderboard(data);
      setLoading(false);
    };
    load();
  }, []);

  const filteredLeaderboard = useMemo(
    () =>
      leaderboard.filter((entry) => {
        const matchesSearch = entry.student.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGrade = selectedGrade === 'ALL' || entry.student.grade.startsWith(`Year ${selectedGrade}`);
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

  const getScore = (entry: LeaderboardEntry) => getLeaderboardEntryScore(entry, FILTER);
  const unit = getLeaderboardMetricUnit(FILTER);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="max-w-md mx-auto relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search by name…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-2xl leading-normal bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent sm:text-sm shadow-sm transition-all"
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
        {(['ALL', '7', '8', '9', '10', '11', '12'] as const).map((grade) => (
          <button
            key={grade}
            type="button"
            onClick={() => setSelectedGrade(grade)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${
              selectedGrade === grade
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md scale-105'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {grade === 'ALL' ? 'All years' : `Year ${grade}`}
          </button>
        ))}
      </div>

      {showPodium && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end justify-center py-6 min-h-[300px]">
          {topThree[1] && (
            <div className="order-2 md:order-1 flex flex-col items-center group">
              <div className="relative">
                <img
                  src={topThree[1].student.avatar}
                  alt=""
                  className="w-20 h-20 rounded-full border-4 border-gray-300 shadow-lg"
                />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white">
                  2nd
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-md border-t-4 border-gray-300 mt-5 w-full text-center">
                <h3 className="font-bold text-blue-900 truncate">{topThree[1].student.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{topThree[1].student.grade}</p>
                <div className="text-2xl font-bold text-gray-700">
                  {getScore(topThree[1])}
                  <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>
                </div>
              </div>
            </div>
          )}

          {topThree[0] && (
            <div className="order-1 md:order-2 flex flex-col items-center z-10 transform md:-translate-y-4 group">
              <div className="relative">
                <Crown className="absolute -top-10 left-1/2 -translate-x-1/2 w-12 h-12 text-yellow-500" />
                <img
                  src={topThree[0].student.avatar}
                  alt=""
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
                <div className="text-4xl font-bold text-yellow-600">
                  {getScore(topThree[0])}
                  <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
                </div>
              </div>
            </div>
          )}

          {topThree[2] && (
            <div className="order-3 flex flex-col items-center group">
              <div className="relative">
                <img
                  src={topThree[2].student.avatar}
                  alt=""
                  className="w-20 h-20 rounded-full border-4 border-orange-300 shadow-lg"
                />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white">
                  3rd
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-md border-t-4 border-orange-300 mt-5 w-full text-center">
                <h3 className="font-bold text-blue-900 truncate">{topThree[2].student.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{topThree[2].student.grade}</p>
                <div className="text-2xl font-bold text-gray-700">
                  {getScore(topThree[2])}
                  <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>
                </div>
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
              : 'More top scores'}
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
                    isYou ? 'bg-emerald-50/90 ring-1 ring-inset ring-emerald-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-8 font-bold text-gray-400 text-center">{tableRank}</div>
                  <img src={entry.student.avatar} alt="" className="w-10 h-10 rounded-full ml-4" />
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="font-bold text-blue-900 truncate">
                      {entry.student.name}
                      {isYou && (
                        <span className="ml-2 text-xs font-bold uppercase text-emerald-600">You</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{entry.student.grade}</div>
                  </div>
                  <div className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm tabular-nums">
                    {getScore(entry)} {unit}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-400">
              {isSearching ? 'No students match that name.' : 'No more scores in this list yet — keep learning!'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
