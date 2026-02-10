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
import { getAllSignatures, getAllTeachers, getStudents } from '../services/dataService';
import { Signature, CoreValue, Teacher } from '../types';
import { CORE_VALUES } from '../constants';
import { Award, TrendingUp, Users, Star } from 'lucide-react';
import { startOfDay, subDays, format, isSameDay } from 'date-fns';

export const SchoolAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const [allSigs, allTeachers] = await Promise.all([
        getAllSignatures(),
        getAllTeachers()
      ]);
      const allStudents = getStudents();
      
      setSignatures(allSigs);
      setTeachers(allTeachers);
      setStudentCount(allStudents.length);
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
  const totalStamps = signatures.length;
  const stampsToday = signatures.filter(s => isSameDay(new Date(s.timestamp), new Date())).length;
  
  const activeStudentIds = new Set(signatures.map(s => s.studentId));
  const activeStudentCount = activeStudentIds.size;
  const participationRate = studentCount > 0 ? (activeStudentCount / studentCount) * 100 : 0;

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

  // 3. Teacher Leaderboard
  const teacherStats: Record<string, { name: string, count: number, lastActive: number }> = {};
  
  // Initialize with all teachers (so 0 counts show up)
  teachers.forEach(t => {
    teacherStats[t.name] = { name: t.name, count: 0, lastActive: 0 };
  });

  // Aggregate counts (handle "Current Teacher" or legacy names gracefully)
  signatures.forEach(s => {
    const tName = s.teacherName || 'Unknown';
    if (!teacherStats[tName]) {
        teacherStats[tName] = { name: tName, count: 0, lastActive: 0 };
    }
    teacherStats[tName].count++;
    if (s.timestamp > teacherStats[tName].lastActive) {
        teacherStats[tName].lastActive = s.timestamp;
    }
  });

  const teacherLeaderboard = Object.values(teacherStats)
    .sort((a, b) => b.count - a.count)
    .filter(t => t.count > 0 || teachers.some(reg => reg.name === t.name)) // Show if registered or has stamps
    .slice(0, 10);

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <p className="text-xs text-gray-400 mt-1">{activeStudentCount} / {studentCount} active</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                <Users size={24} />
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

      {/* Teacher Leaderboard Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Top Awarding Teachers</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-medium">
                    <tr>
                        <th className="px-6 py-3">Teacher</th>
                        <th className="px-6 py-3">Total Stamps</th>
                        <th className="px-6 py-3">Last Active</th>
                        <th className="px-6 py-3">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {teacherLeaderboard.map((t, idx) => (
                        <tr key={t.name} className="hover:bg-gray-50">
                            <td className="px-6 py-4 flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                    idx === 1 ? 'bg-gray-200 text-gray-700' :
                                    idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {idx + 1}
                                </div>
                                <span className="font-medium text-gray-900">{t.name}</span>
                            </td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                    {t.count}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                                {t.lastActive > 0 ? format(new Date(t.lastActive), 'MMM d, h:mm a') : 'Never'}
                            </td>
                            <td className="px-6 py-4">
                                {t.count > 0 ? (
                                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Active
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div> Inactive
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                    {teacherLeaderboard.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">No teacher activity recorded yet.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
