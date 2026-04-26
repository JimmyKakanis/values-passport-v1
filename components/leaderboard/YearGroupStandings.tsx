import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Crown, Trophy } from 'lucide-react';
import {
  fetchLeaderboardData,
  LeaderboardEntry,
  buildYearGroupLeaderboard,
  YearGroupLeaderboardRow,
} from '../../services/dataService';

type Place = '1st' | '2nd' | '3rd' | '4th' | '5th' | '6th';

/** Every student avatar in the year; scrolls when there are many. */
const YearGroupAvatarWall: React.FC<{
  avatars: string[];
  isHighlight?: boolean;
}> = ({ avatars, isHighlight }) => {
  if (avatars.length === 0) return null;
  const size = isHighlight ? 'h-8 w-8' : 'h-6 w-6';
  return (
    <div
      className="mt-3 max-h-40 w-full overflow-y-auto rounded-lg bg-slate-50/90 px-1.5 py-2 ring-1 ring-slate-100"
      aria-label="Students in this year group"
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {avatars.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            className={`${size} shrink-0 rounded-full border border-white object-cover shadow-sm ring-1 ring-slate-200/80`}
            loading="lazy"
          />
        ))}
      </div>
    </div>
  );
};

const podiumVisuals = (place: Place) => {
  const isFirst = place === '1st';
  const isSecond = place === '2nd';
  const isThird = place === '3rd';
  const cardTop = isFirst
    ? 'border-amber-300/90'
    : isSecond
      ? 'border-slate-200'
      : isThird
        ? 'border-amber-600/35'
        : 'border-slate-200/90';
  const plinthH = isFirst ? 'h-20' : isSecond || isThird ? 'h-12' : 'h-9';
  const plinthBg = isFirst
    ? 'bg-gradient-to-b from-amber-200/90 via-amber-300/70 to-amber-400/50'
    : isSecond
      ? 'bg-gradient-to-b from-slate-200/80 to-slate-300/60'
      : isThird
        ? 'bg-gradient-to-b from-amber-800/20 via-amber-800/30 to-amber-900/35'
        : 'bg-gradient-to-b from-slate-200/50 to-slate-300/40';
  const placeBadge = isFirst
    ? 'from-amber-400 to-amber-500 text-amber-950'
    : isSecond
      ? 'from-slate-400 to-slate-500 text-white'
      : isThird
        ? 'from-amber-700/90 to-amber-800 text-amber-50'
        : 'from-slate-500/85 to-slate-600 text-white';
  return { isFirst, cardTop, plinthH, plinthBg, placeBadge, elevate: isFirst };
};

const PodiumYearCard: React.FC<{
  row: YearGroupLeaderboardRow;
  place: Place;
  yourStamps?: number | null;
  memberAvatars: string[];
}> = ({ row, place, yourStamps, memberAvatars }) => {
  const { isFirst, cardTop, plinthH, plinthBg, placeBadge, elevate } = podiumVisuals(place);
  return (
    <div
      className={`mx-auto flex w-full max-w-[18rem] flex-col items-stretch ${elevate ? 'z-10 md:-translate-y-1' : ''}`}
    >
      <div
        className={`flex min-h-[3rem] w-full flex-1 flex-col rounded-2xl border border-slate-200/90 bg-white/95 p-3 text-center shadow-md ring-1 ring-slate-900/5 backdrop-blur-sm md:p-4 ${
          isFirst ? 'shadow-xl' : ''
        } relative overflow-hidden border-t-4 ${cardTop}`}
      >
        {isFirst && (
          <>
            <Crown
              className="pointer-events-none absolute left-1/2 top-1 h-5 w-5 -translate-x-1/2 text-amber-500/90"
              strokeWidth={1.5}
              aria-hidden
            />
            <Trophy
              className="pointer-events-none absolute -right-1 -top-1 h-14 w-14 text-amber-400/12"
              strokeWidth={1}
              aria-hidden
            />
          </>
        )}

        <div className="mb-0.5 flex flex-wrap items-center justify-center gap-2 pt-1">
          <span
            className={`inline-flex rounded-full bg-gradient-to-b px-2.5 py-0.5 text-[0.65rem] font-bold shadow-sm ${placeBadge} border border-white/50`}
          >
            {place}
          </span>
        </div>

        <h3 className={`font-bold tracking-tight text-slate-800 ${isFirst ? 'text-lg' : 'text-sm'}`}>
          {row.grade}
        </h3>

        <YearGroupAvatarWall avatars={memberAvatars} isHighlight={isFirst} />

        {yourStamps != null && (
          <div
            className="mt-2 rounded-lg bg-gradient-to-b from-emerald-50/95 to-white px-2.5 py-2 text-left ring-1 ring-emerald-200/60"
            aria-label="Your values passport stamps in this year group"
          >
            <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-emerald-800/80">Your stamps</p>
            <p className={`font-bold tabular-nums text-emerald-800 ${isFirst ? 'text-xl' : 'text-lg'}`}>
              {yourStamps}
            </p>
            <p className="text-[0.6rem] leading-snug text-emerald-800/50">Only you see this for your year.</p>
          </div>
        )}
      </div>

      <div
        className={`${plinthH} ${plinthBg} w-full rounded-b-xl border-x border-b border-slate-900/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]`}
        aria-hidden
      />
    </div>
  );
};

interface YearGroupProps {
  studentId?: string | null;
}

export const YearGroupStandings: React.FC<YearGroupProps> = ({ studentId }) => {
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
  const topSix = yearGroupRows.slice(0, 6);
  const rest = yearGroupRows.slice(6);

  const viewerEntry = useMemo(
    () => (studentId ? leaderboard.find((e) => e.student.id === studentId) : undefined),
    [leaderboard, studentId]
  );
  const viewerYearGrade = viewerEntry?.student.grade;
  const viewerStamps = viewerEntry != null ? viewerEntry.total : null;

  const avatarsByGrade = useMemo(() => {
    const by = new Map<string, LeaderboardEntry[]>();
    for (const e of leaderboard) {
      const g = e.student.grade;
      if (!by.has(g)) by.set(g, []);
      by.get(g)!.push(e);
    }
    const urls = new Map<string, string[]>();
    for (const [g, list] of by) {
      list.sort((a, b) => a.student.id.localeCompare(b.student.id));
      urls.set(
        g,
        list.map((x) => x.student.avatar)
      );
    }
    return urls;
  }, [leaderboard]);

  const commonCardProps = (row: YearGroupLeaderboardRow) => ({
    yourStamps: viewerYearGrade === row.grade ? viewerStamps : null,
    memberAvatars: avatarsByGrade.get(row.grade) ?? [],
  });

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {yearGroupRows.length > 0 ? (
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 via-white to-sky-50/30 p-4 shadow-sm ring-1 ring-slate-900/5 sm:p-6 md:p-8">
          <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Year group standings
          </p>

          {topSix.length > 0 && (
            <div className="space-y-5 md:space-y-6">
              {/* Medals row: 2nd — 1st — 3rd */}
              {topSix.length >= 3 && (
                <div className="mx-auto grid max-w-4xl grid-cols-1 items-end gap-5 sm:grid-cols-3 sm:gap-4">
                  <PodiumYearCard
                    row={topSix[1]}
                    place="2nd"
                    {...commonCardProps(topSix[1])}
                    key={topSix[1].grade}
                  />
                  <PodiumYearCard
                    row={topSix[0]}
                    place="1st"
                    {...commonCardProps(topSix[0])}
                    key={topSix[0].grade}
                  />
                  <PodiumYearCard
                    row={topSix[2]}
                    place="3rd"
                    {...commonCardProps(topSix[2])}
                    key={topSix[2].grade}
                  />
                </div>
              )}

              {topSix.length === 2 && (
                <div className="mx-auto grid max-w-2xl grid-cols-1 items-end gap-5 sm:grid-cols-2">
                  <PodiumYearCard row={topSix[1]} place="2nd" {...commonCardProps(topSix[1])} />
                  <PodiumYearCard row={topSix[0]} place="1st" {...commonCardProps(topSix[0])} />
                </div>
              )}

              {topSix.length === 1 && (
                <div className="mx-auto max-w-sm">
                  <PodiumYearCard row={topSix[0]} place="1st" {...commonCardProps(topSix[0])} />
                </div>
              )}

              {/* Places 4–6 */}
              {topSix.length > 3 && (
                <div className="mx-auto flex max-w-4xl flex-wrap items-end justify-center gap-5">
                  {topSix[3] && (
                    <div className="w-full min-w-[12rem] max-w-[18rem] flex-1 sm:w-auto sm:flex-initial">
                      <PodiumYearCard row={topSix[3]} place="4th" {...commonCardProps(topSix[3])} />
                    </div>
                  )}
                  {topSix[4] && (
                    <div className="w-full min-w-[12rem] max-w-[18rem] flex-1 sm:w-auto sm:flex-initial">
                      <PodiumYearCard row={topSix[4]} place="5th" {...commonCardProps(topSix[4])} />
                    </div>
                  )}
                  {topSix[5] && (
                    <div className="w-full min-w-[12rem] max-w-[18rem] flex-1 sm:w-auto sm:flex-initial">
                      <PodiumYearCard row={topSix[5]} place="6th" {...commonCardProps(topSix[5])} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {rest.length > 0 && (
            <div className="mt-8 border-t border-slate-200/80 pt-6">
              <h2 className="text-center text-base font-bold text-slate-800">Other year groups</h2>
              <p className="mb-3 text-center text-xs text-slate-500">From 7th place</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white/70">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-slate-700">
                      <th className="w-12 px-3 py-2.5 font-semibold">#</th>
                      <th className="px-3 py-2.5 font-semibold">Year</th>
                      {studentId && <th className="w-32 px-3 py-2.5 text-right font-semibold">Your stamps</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rest.map((row, i) => (
                      <tr key={row.grade} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2.5 font-bold text-slate-500">{i + 7}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <span className="shrink-0 font-bold text-blue-900">{row.grade}</span>
                            <div className="inline-flex max-w-full flex-wrap gap-1">
                              {(avatarsByGrade.get(row.grade) ?? []).map((src, j) => (
                                <img
                                  key={j}
                                  src={src}
                                  alt=""
                                  className="h-5 w-5 rounded-full border border-white object-cover ring-1 ring-slate-200/80"
                                  loading="lazy"
                                />
                              ))}
                            </div>
                          </div>
                        </td>
                        {studentId && (
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {viewerYearGrade === row.grade ? (
                              <span className="font-bold text-emerald-700">{viewerStamps}</span>
                            ) : (
                              <span className="text-slate-300" aria-hidden>
                                &mdash;
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">No year group data yet.</p>
      )}
    </div>
  );
};
