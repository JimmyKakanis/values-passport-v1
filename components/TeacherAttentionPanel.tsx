import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, UserSearch, PenLine, ChevronRight, ExternalLink } from 'lucide-react';
import { CoreValue, Subject, Teacher } from '../types';
import {
  getAllSignatures,
  getStudents,
  reloadStudentsCacheFromFirestore,
} from '../services/dataService';
import {
  buildStudentAttentionRows,
  filterStudentsByTeacherGrades,
  sortAttentionRowsByPriority,
  type StudentAttentionRow,
} from '../services/studentAttention';
import { getCurrentTermForDate } from '../schoolCalendar';
import { format } from 'date-fns';

type ViewMode = 'priority' | 'stale' | 'peers' | 'gaps';

const SCHOOL_TOP_N = 20;
const GRADE_TOP_N = 5;

function sortForViewMode(rows: StudentAttentionRow[], mode: ViewMode): StudentAttentionRow[] {
  const copy = [...rows];
  switch (mode) {
    case 'priority':
      return sortAttentionRowsByPriority(copy);
    case 'stale':
      return copy.sort(
        (a, b) => b.daysSinceLastStamp - a.daysSinceLastStamp
      );
    case 'peers': {
      return copy.sort((a, b) => {
        const ap = a.isBelowPeerMedian7d ? 0 : 1;
        const bp = b.isBelowPeerMedian7d ? 0 : 1;
        if (ap !== bp) return ap - bp;
        if (a.stamps7d !== b.stamps7d) return a.stamps7d - b.stamps7d;
        return a.student.name.localeCompare(b.student.name, undefined, { sensitivity: 'base' });
      });
    }
    case 'gaps': {
      const gapCount = (r: StudentAttentionRow) =>
        r.missingSubjectsThisTerm.length +
        r.missingValuesThisTerm.length +
        (r.missingSubjectsThisTerm.length === 0 && r.missingValuesThisTerm.length === 0
          ? r.missingSubjectsEver.length + r.missingValuesEver.length
          : 0);
      return copy.sort((a, b) => gapCount(b) - gapCount(a));
    }
    default:
      return copy;
  }
}

const AttentionSpotlightTable: React.FC<{
  title: string;
  description: string;
  rows: StudentAttentionRow[];
  inTerm: boolean;
  onJumpToAward: (opts: { studentId: string; subject?: Subject; value?: CoreValue }) => void;
  pickPrefill: (row: StudentAttentionRow) => { subject?: Subject; value?: CoreValue };
  emptyMessage: string;
  keyPrefix: string;
}> = ({ title, description, rows, inTerm, onJumpToAward, pickPrefill, emptyMessage, keyPrefix }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="px-4 py-3 border-b border-gray-100 bg-slate-50/80">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-600 mt-0.5">{description}</p>
    </div>
    {rows.length === 0 ? (
      <div className="p-8 text-center text-gray-500 text-sm">{emptyMessage}</div>
    ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left min-w-[800px]">
        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
          <tr>
            <th className="p-3 font-bold">Student</th>
            <th className="p-3 font-bold whitespace-nowrap">Total</th>
            <th className="p-3 font-bold">Last stamp</th>
            <th className="p-3 font-bold">7d / median (year)</th>
            <th className="p-3 font-bold">Flags</th>
            <th className="p-3 font-bold min-w-[12rem]">Ideas</th>
            <th className="p-3 font-bold w-36">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { subject: preSub, value: preVal } = pickPrefill(row);
            const last =
              row.lastStampAt == null
                ? '—'
                : format(new Date(row.lastStampAt), 'd MMM yyyy');
            return (
              <tr
                key={`${keyPrefix}-${row.student.id}`}
                className="border-b border-gray-100 hover:bg-violet-50/40"
              >
                <td className="p-3 align-top">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={row.student.avatar}
                      alt=""
                      className="w-8 h-8 rounded-full bg-gray-100 shrink-0"
                    />
                    <div className="min-w-0">
                      <Link
                        to={`/student/${row.student.id}?tab=passport`}
                        title="Open this student’s Values Passport"
                        className="font-bold text-violet-800 hover:text-violet-950 hover:underline inline-flex items-center gap-1 group"
                      >
                        <span className="truncate">{row.student.name}</span>
                        <ExternalLink
                          className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100"
                          aria-hidden
                        />
                      </Link>
                      <div className="text-xs text-gray-500">{row.student.grade}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 align-top whitespace-nowrap tabular-nums">
                  <span className="font-bold text-gray-900">{row.totalStamps}</span>
                  <div className="text-[10px] text-gray-500">all time</div>
                </td>
                <td className="p-3 align-top whitespace-nowrap">
                  {row.neverStamped ? (
                    <span className="text-amber-700 font-medium">No stamps yet</span>
                  ) : (
                    <>
                      <div>{last}</div>
                      <div className="text-xs text-gray-500">
                        {row.daysSinceLastStamp} days ago
                      </div>
                    </>
                  )}
                </td>
                <td className="p-3 align-top">
                  {row.gradeCohortSize >= 2 ? (
                    <>
                      <div>
                        {row.stamps7d} /{' '}
                        {row.gradeMedian7d === Math.floor(row.gradeMedian7d)
                          ? row.gradeMedian7d
                          : row.gradeMedian7d.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">stamps (7d)</div>
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="p-3 align-top min-w-[7.5rem]">
                  <div className="flex flex-wrap content-start gap-1.5">
                    {row.isStale && (
                      <span className="inline-flex items-center text-[10px] font-bold leading-none whitespace-nowrap shrink-0 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">
                        Stale
                      </span>
                    )}
                    {row.isBelowPeerMedian7d && (
                      <span className="inline-flex items-center text-[10px] font-bold leading-none whitespace-nowrap shrink-0 px-2.5 py-1 rounded-full bg-orange-100 text-orange-900">
                        Below peers
                      </span>
                    )}
                    {row.hasNoStampThisTerm && inTerm && (
                      <span className="inline-flex items-center text-[10px] font-bold leading-none whitespace-nowrap shrink-0 px-2.5 py-1 rounded-full bg-violet-100 text-violet-900">
                        None this term
                      </span>
                    )}
                    {(row.missingSubjectsThisTerm.length > 0 ||
                      row.missingValuesThisTerm.length > 0) && (
                      <span className="inline-flex items-center text-[10px] font-bold leading-none whitespace-nowrap shrink-0 px-2.5 py-1 rounded-full bg-sky-100 text-sky-900">
                        Gaps
                      </span>
                    )}
                    {!row.isStale &&
                      !row.isBelowPeerMedian7d &&
                      !row.hasNoStampThisTerm &&
                      !row.missingSubjectsThisTerm.length &&
                      !row.missingValuesThisTerm.length && <span className="text-gray-400">—</span>}
                  </div>
                </td>
                <td className="p-3 align-top text-gray-700 text-xs leading-snug max-w-md">
                  <ul className="list-disc pl-4 space-y-0.5">
                    {row.suggestionLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </td>
                <td className="p-3 align-top">
                  <button
                    type="button"
                    onClick={() =>
                      onJumpToAward({
                        studentId: row.student.id,
                        subject: preSub,
                        value: preVal,
                      })
                    }
                    className="w-full flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2 py-2 rounded-lg"
                  >
                    <PenLine className="w-3.5 h-3.5" />
                    Award
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    )}
  </div>
);

export interface TeacherAttentionPanelProps {
  currentTeacher: Teacher | null;
  onJumpToAward: (opts: { studentId: string; subject?: Subject; value?: CoreValue }) => void;
}

export const TeacherAttentionPanel: React.FC<TeacherAttentionPanelProps> = ({
  currentTeacher,
  onJumpToAward,
}) => {
  const [rawRows, setRawRows] = useState<StudentAttentionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('priority');
  const [search, setSearch] = useState('');
  /** 'school' = whole-school top 20; otherwise a `Student.grade` string for that year’s top 5. */
  const [viewScope, setViewScope] = useState<'school' | string>('school');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await reloadStudentsCacheFromFirestore();
      const roster = getStudents();
      const scoped = filterStudentsByTeacherGrades(
        roster,
        currentTeacher?.assignedGrades
      );
      const sigs = await getAllSignatures();
      setRawRows(
        buildStudentAttentionRows(
          scoped,
          sigs,
          new Date(),
        )
      );
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load data.');
    } finally {
      setLoading(false);
    }
  }, [currentTeacher?.assignedGrades, currentTeacher?.email]);

  useEffect(() => {
    void load();
  }, [load]);

  /** After optional search, full list in the active sort order (for deriving top N lists). */
  const sortedForMode = useMemo(() => {
    let r = rawRows;
    const q = search.trim().toLowerCase();
    if (q) {
      r = r.filter(
        (row) =>
          row.student.name.toLowerCase().includes(q) ||
          row.student.email.toLowerCase().includes(q)
      );
    }
    return sortForViewMode(r, viewMode);
  }, [rawRows, search, viewMode]);

  const schoolTop = useMemo(
    () => sortedForMode.slice(0, SCHOOL_TOP_N),
    [sortedForMode]
  );

  const rosterGrades = useMemo(() => {
    const g = new Set<string>();
    rawRows.forEach((r) => g.add(r.student.grade));
    return Array.from(g).sort((a, b) => {
      const an = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const bn = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return an - bn;
    });
  }, [rawRows]);

  useEffect(() => {
    if (viewScope !== 'school' && !rosterGrades.includes(viewScope)) {
      setViewScope('school');
    }
  }, [viewScope, rosterGrades]);

  const topPerGrade = useMemo(() => {
    const map = new Map<string, StudentAttentionRow[]>();
    for (const row of sortedForMode) {
      const g = row.student.grade;
      if (!map.has(g)) {
        map.set(g, []);
      }
      const list = map.get(g)!;
      if (list.length < GRADE_TOP_N) {
        list.push(row);
      }
    }
    return map;
  }, [sortedForMode]);

  const now = new Date();
  const inTerm = Boolean(getCurrentTermForDate(now));
  const scopeNote =
    currentTeacher?.assignedGrades && currentTeacher.assignedGrades.length > 0
      ? `Showing ${currentTeacher.assignedGrades.join(', ')} only (your assigned grades).`
      : 'Showing all students on the active roster.';

  const spotlightForScope = useMemo(() => {
    if (viewScope === 'school') {
      return {
        title: 'Whole school',
        description: `Top ${SCHOOL_TOP_N} using the current sort.`,
        rows: schoolTop,
        emptyMessage: 'No students in scope, or no matches for your search.',
        keyPrefix: 'school',
      };
    }
    return {
      title: viewScope,
      description: `Top ${GRADE_TOP_N} in this year (same sort).`,
      rows: topPerGrade.get(viewScope) ?? [],
      emptyMessage: 'No one in this year for the current search.',
      keyPrefix: `g-${viewScope}`,
    };
  }, [viewScope, schoolTop, topPerGrade]);

  const pickPrefill = (row: StudentAttentionRow): { subject?: Subject; value?: CoreValue } => {
    const subject =
      row.missingSubjectsThisTerm[0] ??
      row.missingSubjectsEver[0] ??
      undefined;
    const value =
      row.missingValuesThisTerm[0] ?? row.missingValuesEver[0] ?? undefined;
    return { subject, value };
  };

  if (loading && rawRows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 flex flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <p className="text-sm">Loading attention metrics…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
        <p className="font-bold mb-2">Could not load</p>
        <p className="text-sm mb-4">{loadError}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-bold"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="bg-violet-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserSearch className="w-8 h-8 text-violet-200" />
            Student attention
          </h2>
          <p className="text-violet-100 mt-1 text-sm max-w-2xl">
            Fair recognition: switch between whole school (up to 20) or one year at a time (up to 5).
            Use the sort you choose. Spot who has not been noticed lately, fewer stamps than peers,
            or subject/value gaps.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[12rem]">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or email…"
              className="mt-1 w-full p-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sort by</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="mt-1 w-full md:w-52 p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="priority">Needs attention (default)</option>
              <option value="stale">Longest since last stamp</option>
              <option value="peers">Below peer median (7 days)</option>
              <option value="gaps">Most subject/value gaps</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-sm font-bold disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500">{scopeNote}</p>
        <p className="text-xs text-gray-500">
          Pick a view below: whole school shows up to {SCHOOL_TOP_N} students; a single year shows
          up to {GRADE_TOP_N} (using the sort above).
        </p>
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">View</div>
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Attention scope: whole school or year"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewScope === 'school'}
              onClick={() => setViewScope('school')}
              className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all ${
                viewScope === 'school'
                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-violet-300 hover:bg-violet-50/50'
              }`}
            >
              Whole school
            </button>
            {rosterGrades.map((g) => (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={viewScope === g}
                onClick={() => setViewScope(g)}
                className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all ${
                  viewScope === g
                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-violet-300 hover:bg-violet-50/50'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        {!inTerm && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Outside term time: 7-day recency and peer medians still apply. Subject/value
            &quot;this term&quot; gaps are hidden until a term is in session.
          </p>
        )}
      </div>

      <AttentionSpotlightTable
        key={viewScope}
        title={spotlightForScope.title}
        description={spotlightForScope.description}
        rows={spotlightForScope.rows}
        inTerm={inTerm}
        onJumpToAward={onJumpToAward}
        pickPrefill={pickPrefill}
        emptyMessage={spotlightForScope.emptyMessage}
        keyPrefix={spotlightForScope.keyPrefix}
      />

      <p className="text-xs text-gray-500 text-center px-2 pb-4">
        Staff only. Use this view to support students in private; it is not a public label.
      </p>
    </div>
  );
};
