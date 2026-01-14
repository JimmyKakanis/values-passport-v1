import React, { useEffect, useState } from 'react';
import { Trophy, Lock, CheckCircle, Gift, Medal, ShieldCheck, Heart, Sun, Scale, Hand, Calculator, FlaskConical, Pizza, Crown, Leaf, Users, Clock, Laptop, Palette, Zap, HandHeart, Sparkles, Shapes, Shield, Loader2, Smile, Brain, Mountain, Handshake, UserPlus, Flag, Globe, Anchor, HeartHandshake, Star, ArrowLeft, Calendar, ListChecks, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSignaturesForStudent, calculateStudentAchievements, getStudent, getClaimedRewards, getPlannerItems } from '../services/dataService';
import { StudentAchievement, AchievementDifficulty } from '../types';

interface Props {
  studentId: string;
  isTeacherView?: boolean;
}

// Icon mapper
const IconMap: Record<string, React.FC<any>> = {
  Trophy, Lock, CheckCircle, Gift, Medal, ShieldCheck, Heart, Sun, Scale, Hand, 
  Calculator, FlaskConical, Pizza, Crown, Star,
  Leaf, Users, Clock, Laptop, Palette, Zap, HandHeart, Sparkles, Shapes, Shield,
  Smile, Brain, Mountain, Handshake, UserPlus, Flag, Globe, Anchor, HeartHandshake,
  Calendar, ListChecks, CheckCircle2
};

export const Achievements: React.FC<Props> = ({ studentId, isTeacherView = false }) => {
  const [achievements, setAchievements] = useState<StudentAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const student = getStudent(studentId);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [sigs, claimedIds, plannerItems] = await Promise.all([
          getSignaturesForStudent(studentId),
          getClaimedRewards(studentId),
          getPlannerItems(studentId)
        ]);
        const calculated = calculateStudentAchievements(sigs, claimedIds, plannerItems);
        setAchievements(calculated);
      } catch (error) {
        console.error("Failed to load achievements", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [studentId]);

  if (loading) {
     return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600"/></div>;
  }

  // Filter by difficulty
  const groupedAchievements: Record<AchievementDifficulty, StudentAchievement[]> = {
    BEGINNER: achievements.filter(a => a.difficulty === 'BEGINNER'),
    EASY: achievements.filter(a => a.difficulty === 'EASY'),
    MEDIUM: achievements.filter(a => a.difficulty === 'MEDIUM'),
    CHALLENGING: achievements.filter(a => a.difficulty === 'CHALLENGING'),
    IMPOSSIBLE: achievements.filter(a => a.difficulty === 'IMPOSSIBLE'),
    LEGEND: achievements.filter(a => a.difficulty === 'LEGEND'),
  };

  const AchievementCard: React.FC<{ item: StudentAchievement }> = ({ item }) => {
    const Icon = IconMap[item.icon] || Trophy;
    const percent = Math.min(100, Math.max(0, (item.currentProgress / item.maxProgress) * 100));
    
    // Custom styling for Legendary/Impossible items
    const isLegend = item.difficulty === 'LEGEND';
    const isImpossible = item.difficulty === 'IMPOSSIBLE';

    const cardBg = item.isUnlocked 
      ? (isLegend ? 'bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-400' : 'bg-white border-emerald-200 shadow-sm')
      : (isLegend || isImpossible ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 border-gray-200');

    return (
      <div className={`relative p-5 rounded-xl border-2 transition-all duration-300 ${cardBg} ${item.isUnlocked ? 'hover:shadow-lg transform hover:-translate-y-1' : 'grayscale-[0.5] opacity-90'}`}>
        {item.isUnlocked && (
           <div className={`absolute -top-3 -right-3 rounded-full p-1 shadow-md z-10 ${item.isClaimed ? 'bg-gray-400 text-white' : 'bg-emerald-500 text-white'}`}>
             <CheckCircle size={16} />
           </div>
        )}
        
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg flex-shrink-0 shadow-sm ${
            item.isUnlocked 
              ? (isLegend ? 'bg-yellow-400 text-purple-900' : 'bg-emerald-100 text-emerald-700') 
              : 'bg-gray-200 text-gray-400'
          }`}>
            <Icon size={24} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold truncate text-sm md:text-base ${item.isUnlocked ? 'text-blue-900' : 'text-gray-600'}`}>
              {item.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
            
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1 font-medium text-gray-500">
                <span>Progress</span>
                <span>{Math.round(percent)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-1000 ${
                    item.isUnlocked 
                      ? (isLegend ? 'bg-yellow-500' : 'bg-emerald-500') 
                      : 'bg-blue-400'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {item.reward && (
              <div className={`mt-3 pt-2 border-t border-dashed ${item.isUnlocked ? 'border-gray-200' : 'border-gray-200'} flex items-center gap-1.5`}>
                 {item.reward === 'Achievement Unlocked' ? (
                   <Medal size={12} className={item.isUnlocked ? 'text-purple-600' : 'text-gray-400'} />
                 ) : (
                   <Gift size={12} className={item.isUnlocked ? 'text-purple-600' : 'text-gray-400'} />
                 )}
                 <span className={`text-[10px] uppercase font-bold tracking-wide ${item.isUnlocked ? 'text-purple-700' : 'text-gray-400'}`}>
                   {item.isClaimed ? "Reward Claimed" : item.reward}
                 </span>
                 {item.isUnlocked && !item.isClaimed && item.reward.startsWith("Reward:") && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse">
                      Pending
                    </span>
                 )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const DifficultySection: React.FC<{ 
    title: string, 
    items: StudentAchievement[], 
    color: string, 
    icon: React.ReactNode,
    description: string 
  }> = ({ title, items, color, icon, description }) => {
    if (items.length === 0) return null;
    
    const unlockedCount = items.filter(i => i.isUnlocked).length;
    const isCompleted = unlockedCount === items.length && items.length > 0;

    return (
      <section className="scroll-mt-24" id={title.toLowerCase()}>
        <div className={`flex items-end gap-3 mb-4 pb-2 border-b-2 ${color.replace('text', 'border').replace('700', '200')}`}>
           <div className={`p-2 rounded-lg ${color.replace('text-', 'bg-').replace('700', '100')} ${color}`}>
             {icon}
           </div>
           <div>
             <h2 className={`text-xl font-bold ${color}`}>{title}</h2>
             <p className="text-xs text-gray-500 font-medium">{description}</p>
           </div>
           <div className="ml-auto text-xs font-bold bg-gray-100 px-3 py-1 rounded-full text-gray-600">
             {unlockedCount} / {items.length} Unlocked
           </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(ach => (
            <AchievementCard key={ach.id} item={ach} />
          ))}
        </div>
        
        {isCompleted && (
           <div className="mt-4 bg-green-50 text-green-800 p-3 rounded-lg text-center font-bold text-sm animate-bounce border border-green-200">
             🎉 Section Completed! You are amazing!
           </div>
        )}
      </section>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 pb-20">
      
      {isTeacherView && (
        <button 
          onClick={() => navigate('/leaderboard')}
          className="flex items-center gap-2 text-emerald-700 font-bold hover:underline mb-2"
        >
          <ArrowLeft size={20} /> Back to Leaderboard
        </button>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-4">
             {isTeacherView && (
               <img src={student?.avatar} className="w-16 h-16 rounded-full border-2 border-yellow-400 bg-white" alt="" />
             )}
             <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-yellow-400" />
                  {isTeacherView ? `${student?.name}'s Achievements` : 'Achievement Hall'}
                </h1>
                <p className="mt-2 text-blue-100 max-w-xl font-medium">
                  {isTeacherView 
                    ? `Viewing progress for ${student?.name}.`
                    : "Rise through the ranks from Beginner to Absolute Legend. Every stamp counts!"
                  }
                </p>
             </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-6">
            {Object.keys(groupedAchievements).map((key) => {
               const tier = key as AchievementDifficulty;
               const count = groupedAchievements[tier].filter(a => a.isUnlocked).length;
               const total = groupedAchievements[tier].length;
               return (
                 <a 
                   key={key} 
                   href={`#${tier.toLowerCase()}`}
                   className={`px-3 py-1 rounded-full text-xs font-bold transition-all border border-white/20 hover:bg-white/10 ${count === total ? 'bg-yellow-400/20 text-yellow-300' : 'text-blue-200'}`}
                 >
                   {tier}: {count}/{total}
                 </a>
               );
            })}
          </div>
        </div>
        <Trophy className="absolute -right-6 -bottom-6 w-48 h-48 text-white opacity-5 rotate-12" />
      </div>

      <div className="space-y-16">
        <DifficultySection 
          title="BEGINNER" 
          items={groupedAchievements['BEGINNER']} 
          color="text-emerald-700" 
          icon={<Star size={24} />}
          description="Start your journey here. Easy wins to get you going."
        />

        <DifficultySection 
          title="EASY" 
          items={groupedAchievements['EASY']} 
          color="text-blue-700" 
          icon={<Smile size={24} />}
          description="Fun challenges to build your character."
        />

        <DifficultySection 
          title="MEDIUM" 
          items={groupedAchievements['MEDIUM']} 
          color="text-indigo-700" 
          icon={<Shield size={24} />}
          description="Prove your commitment. Consistency is key."
        />

        <DifficultySection 
          title="CHALLENGING" 
          items={groupedAchievements['CHALLENGING']} 
          color="text-orange-700" 
          icon={<Medal size={24} />}
          description="For students who go above and beyond."
        />

        <DifficultySection 
          title="IMPOSSIBLE" 
          items={groupedAchievements['IMPOSSIBLE']} 
          color="text-purple-700" 
          icon={<Zap size={24} />}
          description="Only the most dedicated will unlock these Subject Masteries."
        />

        <DifficultySection 
          title="LEGEND" 
          items={groupedAchievements['LEGEND']} 
          color="text-yellow-700" 
          icon={<Crown size={24} />}
          description="The ultimate honor. A true Values Champion."
        />
      </div>
    </div>
  );
};
