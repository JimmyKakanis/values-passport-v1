import React, { useEffect, useState } from 'react';
import { getAllSignatures, getAllTeachers } from '../../services/dataService';
import { Signature, CoreValue } from '../../types';
import { CORE_VALUES } from '../../constants';
import { PieChart, Award } from 'lucide-react';
import { auth } from '../../firebaseConfig';

export const TeacherInsights: React.FC = () => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      let currentTeacherName = "Current Teacher";
      
      if (auth.currentUser?.email) {
        const allTeachers = await getAllTeachers();
        const teacher = allTeachers.find(t => t.email.toLowerCase() === auth.currentUser?.email?.toLowerCase());
        if (teacher) currentTeacherName = teacher.name;
      }

      const all = await getAllSignatures();
      // Filter for this teacher (including legacy "Current Teacher" stamps if we can't distinguish, 
      // but ideally we want to show their specific stamps now that we are tracking them)
      // For now, we will include both to show past history + new specific history
      const mySigs = all.filter(s => s.teacherName === currentTeacherName || s.teacherName === "Current Teacher");
      setSignatures(mySigs);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading insights...</div>;
  }

  // Calculate Stats
  const totalAwarded = signatures.length;
  
  const valueCounts: Record<string, number> = {};
  Object.values(CoreValue).forEach(v => valueCounts[v] = 0);
  signatures.forEach(s => {
    if (valueCounts[s.value] !== undefined) {
        valueCounts[s.value]++;
    }
  });

  const subjectCounts: Record<string, number> = {};
  signatures.forEach(s => {
      subjectCounts[s.subject] = (subjectCounts[s.subject] || 0) + 1;
  });

  const mostAwardedValue = Object.entries(valueCounts).sort((a,b) => b[1] - a[1])[0];
  const leastAwardedValue = Object.entries(valueCounts).sort((a,b) => a[1] - b[1])[0];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2">My Impact Dashboard</h2>
        <p className="opacity-80 text-lg">See how you are shaping student character.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-4xl font-bold mb-1">{totalAwarded}</div>
                <div className="text-sm opacity-70 font-medium uppercase tracking-wider">Total Signatures</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-4xl font-bold mb-1">{mostAwardedValue[1] > 0 ? mostAwardedValue[0] : '-'}</div>
                <div className="text-sm opacity-70 font-medium uppercase tracking-wider">Top Strength</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-4xl font-bold mb-1">{leastAwardedValue ? leastAwardedValue[0] : '-'}</div>
                <div className="text-sm opacity-70 font-medium uppercase tracking-wider">Focus Area</div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Value Distribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                <PieChart className="text-indigo-500" />
                Value Distribution
            </h3>
            <div className="space-y-4">
                {Object.values(CORE_VALUES).map(val => {
                    const count = valueCounts[val.id] || 0;
                    const percentage = totalAwarded > 0 ? (count / totalAwarded) * 100 : 0;
                    return (
                        <div key={val.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="font-bold text-gray-700">{val.id}</span>
                                <span className="text-gray-500">{count} ({percentage.toFixed(0)}%)</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${val.color.split(' ')[0]}`} // extract bg-color
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Recent Activity / Subject breakdown */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Award className="text-orange-500" />
                Top Subjects
            </h3>
            <div className="space-y-3">
                {Object.entries(subjectCounts)
                    .sort((a,b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([subject, count], idx) => (
                    <div key={subject} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="font-bold text-gray-400 w-4">#{idx + 1}</div>
                            <div className="font-bold text-gray-700">{subject}</div>
                        </div>
                        <div className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-sm">
                            {count}
                        </div>
                    </div>
                ))}
                {Object.keys(subjectCounts).length === 0 && (
                    <div className="text-gray-400 italic text-center py-4">No data yet.</div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

