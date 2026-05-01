import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  Cell 
} from 'recharts';
import { getAllSignatures, getAllTeachers, getStudents, reloadStudentsCacheFromFirestore } from '../services/dataService';
import { Signature, CoreValue, Teacher, UserRole } from '../types';
import { CORE_VALUES } from '../constants';
import {
  Award,
  TrendingUp,
  Users,
  Star,
  CalendarClock,
  LogIn,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { startOfDay, subDays, format, isSameDay } from 'date-fns';

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

type TeacherTableSortKey = 'name' | 'stamps14d' | 'totalStamps';

export const SchoolAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherTableSort, setTeacherTableSort] = useState<{
    key: TeacherTableSortKey;
    dir: 'asc' | 'desc';
  }>({ key: 'stamps14d', dir: 'asc' });

  useEffect(() => {
    const fetchData = async () => {
      await reloadStudentsCacheFromFirestore();
      const [allSigs, allTeachers] = await Promise.all([
        getAllSignatures(),
        getAllTeachers()
      ]);

      setSignatures(allSigs);
      setTeachers(allTeachers);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading analytics data...
      </div>
    );
  }

  // --- CALCULATIONS ---

  // 1. Overview Stats
  const rosterStudents = getStudents();
  const rosterIds = new Set(rosterStudents.map((s) => s.id));
  const rosterSize = rosterStudents.length;

  const totalStamps = signatures.length;
  const stampsToday = signatures.filter(s => isSameDay(new Date(s.timestamp), new Date())).length;

  const stampedRosterIdsEver = new Set<string>();
  const stampedRosterIdsLast2Weeks = new Set<string>();
  const nowMs = Date.now();
  const twoWeekCutoff = nowMs - TWO_WEEKS_MS;

  for (const s of signatures) {
    if (!rosterIds.has(s.studentId)) continue;
    stampedRosterIdsEver.add(s.studentId);
    if (s.timestamp >= twoWeekCutoff) {
      stampedRosterIdsLast2Weeks.add(s.studentId);
    }
  }

  const participationCount = stampedRosterIdsEver.size;
  const participationRate =
    rosterSize > 0 ? (participationCount / rosterSize) * 100 : 0;

  const recentStampCount = stampedRosterIdsLast2Weeks.size;
  const recentStampRate =
    rosterSize > 0 ? (recentStampCount / rosterSize) * 100 : 0;

  const loggedInRecentCount = rosterStudents.filter(
    (s) =>
      typeof s.lastLoginAt === 'number' && s.lastLoginAt >= twoWeekCutoff
  ).length;
  const loggedInRecentRate =
    rosterSize > 0 ? (loggedInRecentCount / rosterSize) * 100 : 0;

  // 2. Value Distribution
  const valueCounts: Record<string, number> = {};
  Object.values(CoreValue).forEach(v => valueCounts[v] = 0);
  signatures.forEach(s => {
    if (valueCounts[s.value] !== undefined) valueCounts[s.value]++;
  });

  const valueData = Object.entries(valueCounts)
    .map(([name, value]) => {
      const coreVal = Object.values(CORE_VALUES).find(cv => cv.id === name);
      return { 
        name, 
        value, 
        color: coreVal ? coreVal.color.split(' ')[0].replace('bg-', '') : '#8884d8' // crude color extraction or fallback
      };
    })
    .sort((a, b) => b.value - a.value);

  const topValue = valueData[0];

  // Map tailwind bg colors to hex for Recharts (approximate)
  const COLORS: Record<string, string> = {
    'Truth': '#22c55e', // green-500
    'Love': '#ef4444', // red-500
    'Peace': '#3b82f6', // blue-500
    'Right Conduct': '#eab308', // yellow-500
    'Non-Violence': '#a855f7', // purple-500
  };

  // 3. Teacher usage (all registered staff + orphan stamp names for name-mismatch checks)
  const teacherStats: Record<
    string,
    { name: string; count: number; lastActive: number; stamps14d: number }
  > = {};

  teachers.forEach((t) => {
    teacherStats[t.name] = {
      name: t.name,
      count: 0,
      lastActive: 0,
      stamps14d: 0,
    };
  });

  signatures.forEach((s) => {
    const tName = s.teacherName || 'Unknown';
    if (!teacherStats[tName]) {
      teacherStats[tName] = {
        name: tName,
        count: 0,
        lastActive: 0,
        stamps14d: 0,
      };
    }
    teacherStats[tName].count++;
    if (s.timestamp >= twoWeekCutoff) {
      teacherStats[tName].stamps14d++;
    }
    if (s.timestamp > teacherStats[tName].lastActive) {
      teacherStats[tName].lastActive = s.timestamp;
    }
  });

  const registeredTeacherNames = new Set(teachers.map((t) => t.name));

  const registeredTeacherRowsBase = [...teachers].map((t) => {
    const s = teacherStats[t.name]!;
    return {
      key: `${t.email}:${t.name}`,
      name: t.name,
      email: t.email,
      role: t.role,
      assignedGrades: t.assignedGrades,
      totalStamps: s.count,
      stamps14d: s.stamps14d,
      lastActive: s.lastActive,
    };
  });

  const allRegisteredTeacherRows = [...registeredTeacherRowsBase].sort((a, b) => {
    const { key, dir } = teacherTableSort;
    const mult = dir === 'asc' ? 1 : -1;
    let cmp = 0;
    if (key === 'name') {
      cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    } else if (key === 'stamps14d') {
      cmp = a.stamps14d - b.stamps14d;
    } else {
      cmp = a.totalStamps - b.totalStamps;
    }
    if (cmp !== 0) return mult * cmp;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  const cycleTeacherTableSort = (key: TeacherTableSortKey) => {
    setTeacherTableSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' ? 'asc' : 'desc' }
    );
  };

  const sortHeaderClass =
    'group inline-flex items-center gap-1 -ml-1 px-1 py-0.5 rounded font-medium tracking-wide uppercase text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2';

  const SortGlyph = ({
    columnKey,
  }: {
    columnKey: TeacherTableSortKey;
  }) =>
    teacherTableSort.key !== columnKey ? (
      <ArrowUpDown className="w-3.5 h-3.5 shrink-0 opacity-35 group-hover:opacity-60" aria-hidden />
    ) : teacherTableSort.dir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 shrink-0 text-gray-700" aria-hidden />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 shrink-0 text-gray-700" aria-hidden />
    );

  const orphanStampNames = Object.values(teacherStats)
    .filter((t) => !registeredTeacherNames.has(t.name) && t.count > 0)
    .sort((a, b) => b.count - a.count);

  const formatRole = (role: UserRole | string | undefined): string => {
    if (!role) return '—';
    if (role === 'TEACHER') return 'Teacher';
    if (role === 'ADMIN') return 'Admin';
    if (role === 'STUDENT') return 'Student';
    return role;
  };

  const gradeSummary = (grades: string[] | undefined): string => {
    if (!grades?.length) return '—';
    return grades.join(', ');
  };

  // 4. Activity Trend (Last 14 Days)
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(new Date(), 13 - i); // 13 days ago to today
    return {
      date: format(d, 'MMM dd'),
      rawDate: d,
      count: 0
    };
  });

  signatures.forEach(s => {
    const day = startOfDay(new Date(s.timestamp));
    const foundDay = last14Days.find(d => isSameDay(d.rawDate, day));
    if (foundDay) {
      foundDay.count++;
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Total Stamps</p>
                <h3 className="text-3xl font-bold text-gray-900">{totalStamps}</h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                <Award size={24} />
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Stamps Today</p>
                <h3 className="text-3xl font-bold text-gray-900">{stampsToday}</h3>
            </div>
            <div className="p-3 bg-green-50 rounded-full text-green-600">
                <TrendingUp size={24} />
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Student Participation</p>
                <h3 className="text-3xl font-bold text-gray-900">{participationRate.toFixed(1)}%</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {participationCount} / {rosterSize} with at least one stamp
                </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                <Users size={24} />
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Stamped last 14 days</p>
                <h3 className="text-3xl font-bold text-gray-900">{recentStampRate.toFixed(1)}%</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {recentStampCount} / {rosterSize} roster students
                </p>
            </div>
            <div className="p-3 bg-cyan-50 rounded-full text-cyan-600">
                <CalendarClock size={24} />
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Logged in last 14 days</p>
                <h3 className="text-3xl font-bold text-gray-900">{loggedInRecentRate.toFixed(1)}%</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {loggedInRecentCount} / {rosterSize} roster students
                </p>
            </div>
            <div className="p-3 bg-violet-50 rounded-full text-violet-600">
                <LogIn size={24} />
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Top Value</p>
                <h3 className="text-xl font-bold text-gray-900 truncate max-w-[120px]" title={topValue.name}>{topValue.name}</h3>
                <p className="text-xs text-gray-400 mt-1">{topValue.value} stamps</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-full text-amber-600">
                <Star size={24} />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Trend Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-6">Activity Trend (Last 14 Days)</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={last14Days}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fill: '#9ca3af'}} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fill: '#9ca3af'}} 
                        />
                        <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#4f46e5" 
                            strokeWidth={3} 
                            dot={{fill: '#4f46e5', strokeWidth: 2}} 
                            activeDot={{r: 6}}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Value Distribution Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-6">Value Distribution</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={valueData} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100} 
                            tick={{fontSize: 12, fontWeight: 500}} 
                            axisLine={false} 
                            tickLine={false}
                        />
                        <Tooltip 
                            cursor={{fill: '#f9fafb'}}
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {valueData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#8884d8'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Teachers: full roster — sorted for support (lowest recent use first) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 space-y-1">
            <h3 className="font-bold text-gray-800">All teachers</h3>
            <p className="text-xs text-gray-500 max-w-2xl">
              Every staff member on your teacher list is shown here. Default order puts the lowest{' '}
              <span className="whitespace-nowrap">last 14 days</span> counts first so you can prioritise onboarding —
              click <span className="font-medium text-gray-600">Teacher</span>,{' '}
              <span className="font-medium text-gray-600">Last 14 days</span>, or{' '}
              <span className="font-medium text-gray-600">All time</span> to sort (click again to reverse). Stamps
              attributed to a name that does not exactly match someone on this list appear in the notice below — often a
              typo or duplicate account.
            </p>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs font-medium">
                    <tr>
                        <th className="px-6 py-3" aria-sort={teacherTableSort.key === 'name' ? (teacherTableSort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                          <button
                            type="button"
                            className={sortHeaderClass}
                            onClick={() => cycleTeacherTableSort('name')}
                          >
                            Teacher
                            <SortGlyph columnKey="name" />
                          </button>
                        </th>
                        <th className="px-6 py-3 uppercase text-gray-500">Email</th>
                        <th className="px-6 py-3 uppercase text-gray-500">Role</th>
                        <th className="px-6 py-3 uppercase text-gray-500 hidden lg:table-cell">Assigned years</th>
                        <th
                          className="px-6 py-3 whitespace-nowrap"
                          aria-sort={teacherTableSort.key === 'stamps14d' ? (teacherTableSort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <button
                            type="button"
                            className={sortHeaderClass}
                            onClick={() => cycleTeacherTableSort('stamps14d')}
                          >
                            Last 14 days
                            <SortGlyph columnKey="stamps14d" />
                          </button>
                        </th>
                        <th
                          className="px-6 py-3 whitespace-nowrap"
                          aria-sort={teacherTableSort.key === 'totalStamps' ? (teacherTableSort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <button
                            type="button"
                            className={sortHeaderClass}
                            onClick={() => cycleTeacherTableSort('totalStamps')}
                          >
                            All time
                            <SortGlyph columnKey="totalStamps" />
                          </button>
                        </th>
                        <th className="px-6 py-3 uppercase text-gray-500">Last stamp</th>
                        <th className="px-6 py-3 uppercase text-gray-500">Activity</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {allRegisteredTeacherRows.map((t) => {
                      const recent =
                        t.stamps14d > 0
                          ? 'active'
                          : t.totalStamps > 0
                            ? 'quiet'
                            : 'none';
                      return (
                        <tr key={t.key} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 break-all max-w-[200px]">
                            {t.email || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {formatRole(t.role)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 hidden lg:table-cell max-w-[14rem]">
                            {gradeSummary(t.assignedGrades)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800 tabular-nums">
                              {t.stamps14d}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 tabular-nums">
                              {t.totalStamps}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {t.lastActive > 0
                              ? format(new Date(t.lastActive), 'MMM d, yyyy h:mm a')
                              : '—'}
                          </td>
                          <td className="px-6 py-4">
                            {recent === 'active' ? (
                              <span className="text-xs text-green-700 font-medium flex items-center gap-1.5 whitespace-nowrap">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                Stamp activity (14d)
                              </span>
                            ) : recent === 'quiet' ? (
                              <span className="text-xs text-amber-700 font-medium flex items-center gap-1.5 whitespace-nowrap">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                No stamps (14d)
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 whitespace-nowrap">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                                No stamps yet
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {allRegisteredTeacherRows.length === 0 && (
                        <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-gray-400 italic">
                              No teachers in the staff list yet. Add teachers in Admin so they appear here.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        {orphanStampNames.length > 0 && (
          <div className="px-6 py-4 border-t border-amber-100 bg-amber-50/60 text-sm text-amber-950">
            <p className="font-semibold text-amber-900 mb-2">Stamps under names not on your teacher list</p>
            <p className="text-amber-900/90 mb-2 text-xs">
              These totals can mean a nickname was used when awarding, or the staff member is missing from Admin.
              Compare spelling to the roster above.
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-amber-950/90">
              {orphanStampNames.map((o) => (
                <li key={o.name}>
                  <span className="font-medium">{o.name}</span>
                  {' — '}
                  {o.count} stamp{o.count === 1 ? '' : 's'} all time
                  {o.stamps14d > 0 ? ` (${o.stamps14d} in last 14 days)` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
