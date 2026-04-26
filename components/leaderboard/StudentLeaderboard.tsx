import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Crown,
  Loader2,
  Award,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  Heart,
  Sun,
  Scale,
  Hand,
  Search,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchLeaderboardData, LeaderboardEntry, getLeaderboardEntryScore } from '../../services/dataService';
import { CORE_VALUES } from '../../constants';
import { CoreValue, UserRole } from '../../types';
import { FilterCard, getLeaderboardMetricUnit } from './LeaderboardShared';
import { LeaderboardFace } from './LeaderboardFace';

interface Props {
  userRole?: UserRole | null;
}

export const StudentLeaderboard: React.FC<Props> = ({ userRole }) => {
  const [filter, setFilter] = useState<CoreValue | 'ALL' | 'ACHIEVEMENTS' | 'POP_QUIZ'>('ALL');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<'ALL' | '7' | '8' | '9' | '10' | '11' | '12'>('ALL');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isTeacher = userRole === 'TEACHER' || userRole === 'ADMIN';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchLeaderboardData(filter === 'ALL' ? undefined : filter);
      setLeaderboard(data);
      setLoading(false);
    };
    load();
  }, [filter]);

  const filteredLeaderboard = leaderboard.filter((entry) => {
    const matchesSearch = entry.student.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = selectedGrade === 'ALL' || entry.student.grade.startsWith(`Year ${selectedGrade}`);
    return matchesSearch && matchesGrade;
  });

  const topThree = filteredLeaderboard.slice(0, 3);
  const totalStudentLimit = filter === 'ALL' && selectedGrade === 'ALL' ? 20 : 10;
  const runnersUp = isTeacher ? filteredLeaderboard.slice(3) : filteredLeaderboard.slice(3, totalStudentLimit);

  const isSearching = searchTerm.length > 0;
  const listToDisplay = isSearching ? filteredLeaderboard : runnersUp;
  const showPodium = !isSearching;

  const getScore = (entry: LeaderboardEntry) => getLeaderboardEntryScore(entry, filter);
  const getUnit = () => getLeaderboardMetricUnit(filter);

  const handleRowClick = (studentId: string) => {
    if (isTeacher) {
      navigate(`/student/${studentId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600 w-10 h-10" />
      </div>
    );
  }

  const iconMap: Record<string, React.ReactNode> = {
    [CoreValue.TRUTH]: <ShieldCheck />,
    [CoreValue.LOVE]: <Heart />,
    [CoreValue.PEACE]: <Sun />,
    [CoreValue.RIGHT_CONDUCT]: <Scale />,
    [CoreValue.NON_VIOLENCE]: <Hand />,
  };

  return (
    <div className="space-y-8">
      <div className="max-w-md mx-auto relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search students by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-2xl leading-normal bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm shadow-sm transition-all"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-red-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
        <span className="w-full text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
          Filter by Grade
        </span>
        {(['ALL', '7', '8', '9', '10', '11', '12'] as const).map((grade) => (
          <button
            key={grade}
            type="button"
            onClick={() => setSelectedGrade(grade)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${
              selectedGrade === grade
                ? 'bg-blue-900 border-blue-900 text-white shadow-md scale-105'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {grade === 'ALL' ? 'All Grades' : `Year ${grade}`}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <FilterCard
            id="ALL"
            title="Overall"
            icon={<Crown />}
            isActive={filter === 'ALL'}
            onClick={() => setFilter('ALL')}
          />
          <FilterCard
            id="ACHIEVEMENTS"
            title="Badges"
            icon={<Award />}
            isActive={filter === 'ACHIEVEMENTS'}
            onClick={() => setFilter('ACHIEVEMENTS')}
          />
          <FilterCard
            id="POP_QUIZ"
            title="Quiz"
            icon={<GraduationCap />}
            isActive={filter === 'POP_QUIZ'}
            onClick={() => setFilter('POP_QUIZ')}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-8">
          {Object.values(CORE_VALUES).map((val) => (
            <FilterCard
              key={val.id}
              id={val.id}
              title={val.id}
              icon={iconMap[val.id]}
              isActive={filter === val.id}
              onClick={() => setFilter(val.id)}
            />
          ))}
        </div>
      </div>

      {showPodium && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end justify-center py-6 min-h-[300px]">
          {topThree[1] && (
            <div
              className={`order-2 md:order-1 flex flex-col items-center group ${isTeacher ? 'cursor-pointer' : ''}`}
              onClick={() => handleRowClick(topThree[1].student.id)}
            >
              <div className="relative">
                <LeaderboardFace
                  student={topThree[1].student}
                  className="w-20 h-20 rounded-full border-4 border-gray-300 shadow-lg group-hover:scale-110 transition-transform"
                />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white">
                  2nd
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-md border-t-4 border-gray-300 mt-5 w-full text-center group-hover:bg-gray-50">
                <h3 className="font-bold text-blue-900 truncate">{topThree[1].student.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{topThree[1].student.grade}</p>
                <div className="text-2xl font-bold text-gray-700">
                  {getScore(topThree[1])}
                  <span className="text-xs font-normal text-gray-400 ml-1">{getUnit()}</span>
                </div>
              </div>
            </div>
          )}

          {topThree[0] && (
            <div
              className={`order-1 md:order-2 flex flex-col items-center z-10 transform md:-translate-y-4 group ${isTeacher ? 'cursor-pointer' : ''}`}
              onClick={() => handleRowClick(topThree[0].student.id)}
            >
              <div className="relative">
                <Crown className="absolute -top-10 left-1/2 -translate-x-1/2 w-12 h-12 text-yellow-500 animate-bounce" />
                <LeaderboardFace
                  student={topThree[0].student}
                  className="w-28 h-28 rounded-full border-4 border-yellow-400 shadow-xl group-hover:scale-110 transition-transform"
                />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-white">
                  1st
                </div>
              </div>
              <div className="bg-gradient-to-b from-yellow-50 to-white p-6 rounded-xl shadow-lg border-t-4 border-yellow-400 mt-5 w-full text-center relative overflow-hidden group-hover:to-yellow-50">
                <div className="absolute top-0 right-0 p-1 opacity-10">
                  <Trophy size={48} />
                </div>
                <h3 className="font-bold text-xl text-blue-900 truncate">{topThree[0].student.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{topThree[0].student.grade}</p>
                <div className="text-4xl font-bold text-yellow-600">
                  {getScore(topThree[0])}
                  <span className="text-sm font-normal text-gray-400 ml-1">{getUnit()}</span>
                </div>
              </div>
            </div>
          )}

          {topThree[2] && (
            <div
              className={`order-3 md:order-3 flex flex-col items-center group ${isTeacher ? 'cursor-pointer' : ''}`}
              onClick={() => handleRowClick(topThree[2].student.id)}
            >
              <div className="relative">
                <LeaderboardFace
                  student={topThree[2].student}
                  className="w-20 h-20 rounded-full border-4 border-orange-300 shadow-lg group-hover:scale-110 transition-transform"
                />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white">
                  3rd
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-md border-t-4 border-orange-300 mt-5 w-full text-center group-hover:bg-gray-50">
                <h3 className="font-bold text-blue-900 truncate">{topThree[2].student.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{topThree[2].student.grade}</p>
                <div className="text-2xl font-bold text-gray-700">
                  {getScore(topThree[2])}
                  <span className="text-xs font-normal text-gray-400 ml-1">{getUnit()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-bold text-blue-900">
            {isSearching
              ? `Search Results (${listToDisplay.length})`
              : isTeacher
                ? 'Full Student Rankings'
                : 'Honorable Mentions'}
          </h3>
          {isTeacher && <span className="text-xs text-emerald-600 italic">Click row to view profile</span>}
        </div>
        <div className="divide-y divide-gray-100">
          {listToDisplay.length > 0 ? (
            listToDisplay.map((entry, index) => {
              const tableRank = showPodium ? index + 4 : index + 1;

              return (
                <div
                  key={entry.student.id}
                  onClick={() => handleRowClick(entry.student.id)}
                  className={`flex items-center p-4 transition-colors ${
                    isTeacher ? 'cursor-pointer hover:bg-emerald-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-8 font-bold text-gray-400 text-center">{tableRank}</div>
                  <LeaderboardFace student={entry.student} className="w-10 h-10 rounded-full ml-4" />
                  <div className="ml-4 flex-1">
                    <div className="font-bold text-blue-900 flex items-center gap-2">
                      {entry.student.name}
                      {isTeacher && <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 text-emerald-500" />}
                    </div>
                    <div className="text-xs text-gray-500">{entry.student.grade}</div>
                  </div>
                  <div className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm">
                    {getScore(entry)} {getUnit()}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-400">
              {isSearching ? 'No students found matching that name.' : 'No other students ranked yet. Keep earning points!'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
