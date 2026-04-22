import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Crown, Trophy, Users } from 'lucide-react';
import {
  fetchLeaderboardData,
  LeaderboardEntry,
  buildYearGroupLeaderboard,
  YearGroupLeaderboardRow,
} from '../../services/dataService';

const formatYearShort = (grade: string): string => grade.replace(/^Year\s+/i, 'Y').trim();

const PodiumYearCard: React.FC<{
  row: YearGroupLeaderboardRow;
  place: '1st' | '2nd' | '3rd';
  orderMobile: string;
  orderMd: string;
  elevate?: boolean;
}> = ({ row, place, orderMobile, orderMd, elevate }) => {
  const isFirst = place === '1st';
  const isSecond = place === '2nd';
  const circleSize = isFirst ? 'w-28 h-28 text-2xl' : 'w-20 h-20 text-lg';
  const borderClass = isFirst ? 'border-yellow-400' : isSecond ? 'border-gray-300' : 'border-orange-300';
  const badgeBg = isFirst ? 'bg-yellow-500' : isSecond ? 'bg-gray-500' : 'bg-orange-500';
  const scoreSize = isFirst ? 'text-4xl text-yellow-600' : 'text-2xl text-gray-700';

  return (
    <div
      className={`${orderMobile} ${orderMd} flex flex-col items-center group ${elevate ? 'z-10 transform md:-translate-y-4' : ''}`}
    >
      <div className="relative">
        {isFirst && (
          <Crown className="absolute -top-10 left-1/2 -translate-x-1/2 w-12 h-12 text-yellow-500 animate-bounce z-10" />
        )}
        <div
          className={`rounded-full border-4 ${borderClass} shadow-lg flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 ${circleSize} font-black text-blue-900`}
        >
          <span className="leading-none px-1 text-center">{formatYearShort(row.grade)}</span>
        </div>
        <div
          className={`absolute -bottom-3 left-1/2 -translate-x-1/2 ${badgeBg} text-white text-xs font-bold py-1 rounded-full border-2 border-white whitespace-nowrap ${isFirst ? 'px-3' : 'px-2'}`}
        >
          {place}
        </div>
      </div>
      <div
        className={`mt-5 w-full text-center rounded-xl shadow-md ${
          isFirst
            ? 'bg-gradient-to-b from-yellow-50 to-white border-t-4 border-yellow-400 p-6 shadow-lg relative overflow-hidden'
            : isSecond
              ? 'bg-white border-t-4 border-gray-300 p-4'
              : 'bg-white border-t-4 border-orange-300 p-4'
        }`}
      >
        {isFirst && (
          <div className="absolute top-0 right-0 p-1 opacity-10 pointer-events-none">
            <Trophy size={48} />
          </div>
        )}
        <div className={`flex items-center justify-center gap-2 ${isFirst ? 'mb-1' : 'mb-2'}`}>
          <Users className={`text-blue-800 opacity-70 ${isFirst ? 'w-5 h-5' : 'w-4 h-4'}`} />
          <h3 className={`font-bold text-blue-900 ${isFirst ? 'text-xl' : ''}`}>{row.grade}</h3>
        </div>
        <p className="text-xs text-gray-500 mb-2">Avg stamps / student</p>
        <div className={`font-bold ${scoreSize}`}>
          {row.meanStamps.toFixed(1)}
          <span className={`font-normal text-gray-400 ml-1 ${isFirst ? 'text-sm' : 'text-xs'}`}>stamps</span>
        </div>
      </div>
    </div>
  );
};

export const YearGroupStandings: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchLeaderboardData();
      setLeaderboard(data);
      setLoading(false);
    };
    load();
  }, []);

  const yearGroupRows = useMemo(() => buildYearGroupLeaderboard(leaderboard), [leaderboard]);
  const topThree = yearGroupRows.slice(0, 3);
  const rest = yearGroupRows.slice(3);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-center text-sm text-gray-600 max-w-2xl mx-auto">
        Overall values passport stamps only. Each year is ranked by <strong>average stamps per student</strong> (every
        enrolled student counts). Smaller cohorts are not penalised for headcount.
      </p>

      {yearGroupRows.length > 0 ? (
        <>
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end justify-center py-6 min-h-[300px] max-w-4xl mx-auto">
              {topThree[1] && (
                <PodiumYearCard row={topThree[1]} place="2nd" orderMobile="order-2" orderMd="md:order-1" />
              )}
              {topThree[0] && (
                <PodiumYearCard row={topThree[0]} place="1st" orderMobile="order-1" orderMd="md:order-2" elevate />
              )}
              {topThree[2] && (
                <PodiumYearCard row={topThree[2]} place="3rd" orderMobile="order-3" orderMd="md:order-3" />
              )}
            </div>
          )}

          {rest.length > 0 && (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="p-4 md:p-5 border-b border-blue-100/80 bg-white/60">
                <h2 className="text-lg font-bold text-blue-900 text-center">Full year group rankings</h2>
                <p className="text-center text-xs text-gray-500 mt-1">Continuing from 4th place</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-900/90 text-white text-left">
                      <th className="px-3 py-2.5 font-semibold w-12">#</th>
                      <th className="px-3 py-2.5 font-semibold">Year</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Avg stamps</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white/80">
                    {rest.map((row, i) => (
                      <tr key={row.grade} className="hover:bg-blue-50/50">
                        <td className="px-3 py-2.5 font-bold text-gray-500">{i + 4}</td>
                        <td className="px-3 py-2.5 font-bold text-blue-900">{row.grade}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{row.meanStamps.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-gray-500 py-8">No year group data yet.</p>
      )}
    </div>
  );
};
