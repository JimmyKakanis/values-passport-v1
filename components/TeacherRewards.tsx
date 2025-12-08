import React, { useEffect, useState } from 'react';
import { getPendingRewardsForTeacher, claimReward, RewardEntry } from '../services/dataService';
import { Gift, CheckCircle, Loader2, Trophy } from 'lucide-react';

export const TeacherRewards: React.FC = () => {
  const [rewards, setRewards] = useState<RewardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await getPendingRewardsForTeacher();
    setRewards(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleClaim = async (studentId: string, achievementId: string) => {
    await claimReward(studentId, achievementId, 'Teacher Console'); 
    // Optimistic update
    setRewards(prev => prev.filter(r => !(r.student.id === studentId && r.achievement.id === achievementId)));
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600"/></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
             <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
               <Gift className="text-purple-600" />
               Pending Rewards
             </h2>
             <span className="text-sm font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
               {rewards.length} Pending
             </span>
        </div>
        
        {rewards.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
                <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>No pending rewards! Great job keeping up!</p>
            </div>
        ) : (
            <div className="divide-y divide-gray-100">
                {rewards.map((item) => (
                    <div key={`${item.student.id}-${item.achievement.id}`} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4 min-w-[200px]">
                            <img src={item.student.avatar} className="w-10 h-10 rounded-full bg-gray-200" alt="" />
                            <div>
                                <h3 className="font-bold text-gray-900">{item.student.name}</h3>
                                <p className="text-sm text-gray-500">{item.student.grade}</p>
                            </div>
                        </div>
                        
                        <div className="flex-1 px-4 md:px-8">
                             <div className="flex items-center gap-2 mb-1">
                                <Trophy size={16} className="text-yellow-500" />
                                <span className="font-bold text-gray-800">{item.achievement.title}</span>
                             </div>
                             <p className="text-sm text-purple-600 font-medium bg-purple-50 inline-block px-2 py-0.5 rounded">
                               {item.achievement.reward}
                             </p>
                        </div>

                        <button 
                            onClick={() => handleClaim(item.student.id, item.achievement.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
                        >
                            <CheckCircle size={16} />
                            Mark Given
                        </button>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

