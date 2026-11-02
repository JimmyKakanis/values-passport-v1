import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Heart,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  Tag,
  User,
} from 'lucide-react';
import { CORE_VALUES, SCHOOL_GRADES } from '../constants';
import {
  getAllSignatures,
  getSchoolStudents,
  reloadStudentsCacheFromFirestore,
} from '../services/dataService';
import { CoreValue, Signature, Student } from '../types';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface CommentFeedRow {
  signature: Signature;
  student: Student;
}

const formatCommentDate = (timestamp: number): string => {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
};

export const ViewerCommentsFeed: React.FC = () => {
  const [rows, setRows] = useState<CommentFeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<'ALL' | CoreValue>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await reloadStudentsCacheFromFirestore();
        const students = getSchoolStudents();
        const studentById = new Map(students.map((s) => [s.id, s]));
        const allSigs = await getAllSignatures();

        const commentRows: CommentFeedRow[] = [];
        for (const sig of allSigs) {
          const note = sig.note?.trim();
          if (!note) continue;
          const student = studentById.get(sig.studentId);
          if (!student) continue;
          commentRows.push({ signature: sig, student });
        }

        commentRows.sort((a, b) => b.signature.timestamp - a.signature.timestamp);
        if (!cancelled) setRows(commentRows);
      } catch (e) {
        console.error('Failed to load viewer comments feed:', e);
        if (!cancelled) {
          setError('Could not load student comments. Please try again later.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    const recentCount = rows.filter((r) => r.signature.timestamp >= cutoff).length;
    const uniqueValues = new Set(rows.map((r) => r.signature.value)).size;
    return {
      totalComments: rows.length,
      recentCount,
      uniqueValues,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(({ signature, student }) => {
      if (selectedValue !== 'ALL' && signature.value !== selectedValue) return false;
      if (selectedGrade !== 'ALL' && student.grade !== selectedGrade) return false;
      if (!q) return true;
      const haystack = [
        signature.note || '',
        signature.subject || '',
        signature.subValue || '',
        signature.teacherName || '',
        student.name || '',
        student.grade || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, selectedValue, selectedGrade, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-gray-600">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 rounded-2xl p-6 md:p-8 text-white shadow-lg border-b-4 border-yellow-400">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/60 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} className="text-yellow-300" />
              Community Recognition Wall
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Positive Student Comments
            </h1>
            <p className="text-emerald-100 text-sm max-w-2xl">
              Celebrate the moments our teachers have noticed and recorded across Sathya Sai College as students live out our five human values.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/15">
              <div className="text-2xl font-extrabold text-white tabular-nums">
                {summary.totalComments}
              </div>
              <div className="text-[11px] text-emerald-100 font-medium">Total Comments</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/15">
              <div className="text-2xl font-extrabold text-yellow-300 tabular-nums">
                {summary.recentCount}
              </div>
              <div className="text-[11px] text-emerald-100 font-medium">Last 7 Days</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/15">
              <div className="text-2xl font-extrabold text-white tabular-nums">
                {summary.uniqueValues}/5
              </div>
              <div className="text-[11px] text-emerald-100 font-medium">Values Lived</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search comments, students, subjects, or teachers..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            aria-label="Filter by year group"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Year Groups</option>
            {SCHOOL_GRADES.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedValue('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              selectedValue === 'ALL'
                ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Values
          </button>
          {Object.values(CoreValue).map((val) => {
            const def = CORE_VALUES[val];
            const active = selectedValue === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => setSelectedValue(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  active
                    ? `${def.color} ring-2 ring-offset-1 ring-emerald-600 shadow-sm`
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {val}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs font-semibold text-gray-500 px-1">
        <span>
          Showing {filteredRows.length} positive comment{filteredRows.length === 1 ? '' : 's'}
        </span>
        {(selectedValue !== 'ALL' || selectedGrade !== 'ALL' || searchQuery.trim()) && (
          <button
            type="button"
            onClick={() => {
              setSelectedValue('ALL');
              setSelectedGrade('ALL');
              setSearchQuery('');
            }}
            className="text-emerald-700 hover:underline font-bold"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Comments List */}
      {filteredRows.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-bold">No matching comments found</p>
          <p className="text-sm text-gray-500 mt-1">
            Try adjusting your search or filter selections above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRows.map(({ signature, student }) => {
            const valueDef = CORE_VALUES[signature.value];
            return (
              <article
                key={signature.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-11 h-11 rounded-full bg-gray-100 border border-gray-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <h2 className="font-bold text-gray-900 truncate">{student.name}</h2>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {student.grade}
                          </span>
                          <span className="text-xs font-medium text-gray-500">
                            &bull; {signature.subject}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                      <Calendar size={12} />
                      {formatCommentDate(signature.timestamp)}
                    </span>
                  </div>

                  <div className="bg-emerald-50/60 border-l-4 border-emerald-500 rounded-r-xl p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/80 mb-1 flex items-center gap-1">
                      <MessageSquare size={11} /> Teacher recognition
                    </p>
                    <p className="text-sm text-gray-800 leading-relaxed italic">
                      &ldquo;{signature.note?.trim()}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${valueDef.color}`}>
                      {signature.value}
                    </span>
                    {signature.subValue && (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-100 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        <Tag size={10} />
                        {signature.subValue}
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                    <User size={12} className="text-gray-400" />
                    {signature.teacherName}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
