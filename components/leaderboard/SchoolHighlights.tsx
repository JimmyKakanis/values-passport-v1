import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookHeart, ArrowRight, Loader2, Newspaper } from 'lucide-react';
import { CORE_VALUES } from '../../constants';
import { getSchoolHighlightsPageData, SchoolHighlightsPageData } from '../../services/dataService';
import { GoodNewsFeedList } from './GoodNewsFeedList';
import { YearLevelSnapshotCard } from './YearLevelSnapshotCard';

interface Props {
  studentId?: string | null;
}

export const SchoolHighlights: React.FC<Props> = ({ studentId }) => {
  const [data, setData] = useState<SchoolHighlightsPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const page = await getSchoolHighlightsPageData(studentId ?? null);
        if (!cancelled) setData(page);
      } catch (e) {
        if (!cancelled) setError('Could not load school highlights. Try again later.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600 w-10 h-10" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center text-center text-gray-600 px-4">
        {error ?? 'Something went wrong.'}
      </div>
    );
  }

  const { stats, myYearSnapshot, schoolWideSnapshot, feed } = data;
  const maxValueCount = Math.max(1, ...stats.valueSlicesLast7Days.map((v) => v.count));
  const highlightName = stats.highlightValue ? CORE_VALUES[stats.highlightValue].id : null;

  return (
    <div className="space-y-8">
      <div className={`grid grid-cols-1 gap-4 max-w-5xl mx-auto ${myYearSnapshot ? 'md:grid-cols-2' : ''}`}>
        {myYearSnapshot && (
            <YearLevelSnapshotCard snap={myYearSnapshot} borderAccent="violet" />
        )}
        <div className={myYearSnapshot ? '' : 'max-w-xl mx-auto w-full'}>
          <YearLevelSnapshotCard snap={schoolWideSnapshot} borderAccent="blue" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg font-bold text-blue-900 flex items-center justify-center gap-2 mb-3">
          <Newspaper className="w-6 h-6 text-amber-600" />
          What is happening at school
        </h2>
        <GoodNewsFeedList items={feed} />
      </div>

      {stats.valueSlicesLast7Days.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow overflow-hidden max-w-4xl mx-auto">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-bold text-blue-900 flex items-center gap-2">
              <BookHeart className="w-5 h-5 text-emerald-600" />
              Values in focus (school, 7 days)
            </h3>
          </div>
          <ul className="divide-y divide-gray-100 p-2">
            {stats.valueSlicesLast7Days.map(({ value, count }) => {
              const def = CORE_VALUES[value];
              const widthPct = Math.round((count / maxValueCount) * 100);
              return (
                <li key={value} className="py-3 px-3">
                  <div className="flex justify-between items-baseline gap-2 mb-1">
                    <span className={`text-sm font-bold px-2 py-0.5 rounded border ${def.color}`}>{def.id}</span>
                    <span className="text-sm text-gray-600 tabular-nums">{count} stamps</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/80 rounded-full transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {stats.topClaimedTypesLast7Days.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow overflow-hidden max-w-4xl mx-auto">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-bold text-blue-900">Goals the school worked toward (7 days)</h3>
            <p className="text-xs text-gray-500 mt-1">Types of achievements claimed &mdash; explore your own in Achievements</p>
          </div>
          <ol className="p-4 space-y-2">
            {stats.topClaimedTypesLast7Days.map((row, i) => (
              <li
                key={`${row.title}-${i}`}
                className="flex justify-between items-center text-sm border border-gray-100 rounded-lg px-3 py-2 gap-2"
              >
                <span className="font-medium text-blue-900 pr-2">{row.title}</span>
                <span className="text-gray-600 tabular-nums shrink-0">{row.count}×</span>
              </li>
            ))}
          </ol>
          {studentId && (
            <div className="px-4 pb-4">
              <Link
                to="/achievements"
                className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
              >
                See your achievements <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}

      {stats.stampsLast7Days === 0 && stats.valueSlicesLast7Days.length === 0 && (
        <p className="text-center text-gray-500 text-sm max-w-md mx-auto">
          No stamps in the last week yet. As teachers record values, you will see the whole school story grow here.
        </p>
      )}

      {stats.highlightValue && highlightName && (
        <p className="text-center text-sm text-gray-600 max-w-lg mx-auto italic">
          This week, &ldquo;{highlightName}&rdquo; has the broadest share of new stamps at school &mdash; a window into
          what we are celebrating together.
        </p>
      )}
    </div>
  );
};
