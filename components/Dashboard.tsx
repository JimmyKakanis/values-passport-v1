
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';
import { 
  getStudent, 
  getSignaturesForStudent, 
  calculateStats, 
  calculateStudentAchievements, 
  addNomination, 
  getStudents,
  getStudentClaimedRewards
} from '../services/dataService';
import { StudentPassport } from './StudentPassport';
import { CORE_VALUES, SUBJECTS } from '../constants';
import { Award, Target, Trophy, ArrowRight, Lock, CheckCircle, Stamp, Users, X, Send, BarChart2, Mail, Loader2, History, Tag, Lightbulb, Search, Gift, Sparkles } from 'lucide-react';
import { Subject, CoreValue, Signature, ClaimedReward, StudentAchievement } from '../types';

interface Props {
  studentId: string;
}

const DID_YOU_KNOW_TIPS = [
  "You can earn a **Gold Star** in a subject by getting at least one stamp in all 5 values for that class!",
  "Check out the **Values Lab** to spin the wheel and get ideas for how to demonstrate values in different locations.",
  "You can **Self-Nominate**! If you did something good and no one saw, use the Request Stamp button to tell your teacher.",
  "See a friend doing something great? Use the **'For a Friend'** option in the Request Stamp form to advocate for them.",
  "Check your **Achievements** page to see special badges you can unlock, like 'The Optimist' or 'Guardian of Nature'.",
  "The **Leaderboard** has filters! You can see who is leading specifically in 'Truth' or 'Non-Violence'.",
  "Teachers can tag your stamps with specific behaviors like **'Curiosity'** or **'Leadership'**. Check your Recent History to see them!",
  "The **'Head, Heart, Hand'** achievement requires you to earn stamps in Academic, Creative, and Active subjects.",
  "You can change your password at any time by clicking the **Key icon** in the top navigation bar.",
  "Earning 5 stars in a subject means you have completed the full set of values **5 times**! That is true mastery.",
  "The **'Hat Trick'** achievement is unlocked by earning 3 stamps in a single day. Can you do it?",
  "Your **Passport** is split into Subjects (like Math) and Locations (like Playground). Make sure to show values everywhere!",
  "The **'Values Explorer'** in the Values Lab can help you understand the deeper meaning behind each Core Value.",
  "Earning **3 stamps** in a single value unlocks the 'Collector' achievement for that value!",
  "The **'Subject Explorer'** badge is for students who show their values across 3 different subjects.",
  "Participating in **Sports Carnivals** and showing good sportsmanship can earn you stamps for the 'Team Spirit' award.",
  "Helping others in the playground is a great way to earn the **'Hand of Help'** achievement.",
  "Showing respect for the environment by picking up litter can get you recognized as a **'Guardian of Nature'**.",
  "Practice **'Inner Silence'** during assembly or homeroom to work towards the 'Mindful Master' badge.",
  "Be a **'True Friend'**! Look out for your classmates and you might be recognized for Friendship.",
  "Demonstrating **'Leadership'** in any setting puts you on the path to the 'Future Leader' award.",
  "The **'Culture Champion'** badge celebrates appreciation of other cultures and religions."
];

export const Dashboard: React.FC<Props> = ({ studentId }) => {
  const student = getStudent(studentId);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<ClaimedReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTip, setCurrentTip] = useState('');
  
  // Modal State
  const [isNominationModalOpen, setIsNominationModalOpen] = useState(false);
  const [nominationType, setNominationType] = useState<'SELF' | 'PEER'>('SELF');
  const [nomineeId, setNomineeId] = useState(studentId);
  const [nomSubject, setNomSubject] = useState<Subject | ''>('');
  const [nomValue, setNomValue] = useState<CoreValue | ''>('');
  const [nomSubValue, setNomSubValue] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [nomReason, setNomReason] = useState('');
  const [nomSuccess, setNomSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const allStudents = getStudents();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [sigs, claimed] = await Promise.all([
        getSignaturesForStudent(studentId),
        getStudentClaimedRewards(studentId)
      ]);
      setSignatures(sigs);
      setClaimedRewards(claimed);
      setLoading(false);
      
      // Set random tip
      const randomTip = DID_YOU_KNOW_TIPS[Math.floor(Math.random() * DID_YOU_KNOW_TIPS.length)];
      setCurrentTip(randomTip);
    };
    loadData();
  }, [studentId]);

  if (!student) return <div>Student not found</div>;

  // Calculate derived state
  const stats = calculateStats(signatures);
  const achievements = calculateStudentAchievements(signatures, claimedRewards.map(c => c.achievementId));

  // 1. Close Call: Highest progress % that is NOT unlocked
  const closeCall = achievements
    .filter(a => !a.isUnlocked)
    .sort((a, b) => (b.currentProgress / b.maxProgress) - (a.currentProgress / a.maxProgress))[0];

  // 2. Recent Achievement: Unlocked but NOT Claimed (Available)
  const availableAchievement = achievements
    .filter(a => a.isUnlocked && !a.isClaimed)[0]; // Just take the first one available

  // 3. Recent Reward: Most recently claimed
  const recentRewardClaim = claimedRewards[0];
  const recentReward = recentRewardClaim 
    ? achievements.find(a => a.id === recentRewardClaim.achievementId)
    : undefined;

  // Prepare the 3 cards to display
  const progressCards = [
    {
      title: "Almost There!",
      data: closeCall,
      type: "progress",
      emptyText: "Keep collecting stamps!"
    },
    {
      title: "Recent Achievement",
      data: availableAchievement,
      type: "unlocked",
      emptyText: "No new achievements yet."
    },
    {
      title: "Recent Reward",
      data: recentReward,
      type: "claimed",
      emptyText: "No rewards claimed yet."
    }
  ];
  
  // Get recent 5 stamps for timeline
  const recentSignatures = signatures.slice(0, 5);

  useEffect(() => {
    setNomSubValue('');
  }, [nomValue]);

  const handleNominationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nomSubject && nomValue && nomSubValue && nomReason && nomineeId) {
      setIsSubmitting(true);
      await addNomination(
        nomineeId,
        studentId,
        student.name,
        nominationType,
        nomSubject,
        nomValue,
        nomReason,
        nomSubValue
      );
      setIsSubmitting(false);
      setNomSuccess(true);
      setTimeout(() => {
        setNomSuccess(false);
        setIsNominationModalOpen(false);
        setNomReason('');
        setNomSubject('');
        setNomValue('');
        setNomSubValue('');
        setStudentSearchTerm('');
        setNomineeId(studentId);
      }, 2000);
    }
  };

  const chartData = Object.values(CORE_VALUES).map(val => ({
    name: val.id,
    count: stats.byValue[val.id] || 0,
    color: val.color.match(/text-(\w+)-900/)?.[1] || 'emerald' 
  }));
  
  const colorMap: Record<string, string> = {
    blue: '#1e3a8a',
    pink: '#831843',
    teal: '#134e4a',
    emerald: '#064e3b',
    orange: '#7c2d12',
    gray: '#9ca3af'
  };

  const nextRewardThreshold = [10, 25, 50, 100].find(t => stats.total < t) || 100;
  const progressPercent = Math.min(100, (stats.total / nextRewardThreshold) * 100);

  // Parse bold markdown in tips
  const renderTip = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-emerald-800">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      
      {/* Header Profile Section */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 rounded-2xl p-6 md:p-10 text-white shadow-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-400 opacity-10 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

        <img 
          src={student.avatar} 
          alt={student.name} 
          className="w-24 h-24 rounded-full border-4 border-yellow-400 shadow-md z-10 bg-white" 
        />
        <div className="text-center md:text-left flex-1 z-10">
          <h1 className="text-3xl font-bold">{student.name}</h1>
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-emerald-100 opacity-90 text-sm md:text-base">
             <span>{student.grade} Student</span>
             <span className="hidden md:inline">•</span>
             <span className="flex items-center justify-center gap-1"><Mail size={14} /> {student.email}</span>
          </div>
          
          <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
             <div className="bg-emerald-900/30 backdrop-blur-sm px-4 py-2 rounded-lg border border-emerald-500/30">
                <span className="block text-2xl font-bold text-yellow-400">{stats.total}</span>
                <span className="text-xs uppercase tracking-wider opacity-90">Total Stamps</span>
             </div>
             
             <button 
                onClick={() => setIsNominationModalOpen(true)}
                className="bg-yellow-400 hover:bg-yellow-300 text-blue-900 px-5 py-2 rounded-lg font-bold shadow-lg transform transition hover:scale-105 flex items-center gap-2"
             >
                <Stamp size={18} /> Request Stamp
             </button>
          </div>
        </div>
        
        {/* Next Reward Progress */}
        <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 w-full md:w-64 z-10">
           <div className="flex justify-between items-center mb-2">
             <div className="flex items-center gap-2">
                <Target size={16} className="text-yellow-400" />
                <span className="text-sm font-medium text-emerald-50">Next Milestone</span>
             </div>
             <span className="text-sm font-bold text-white">{nextRewardThreshold}</span>
           </div>
           <div className="w-full bg-black/20 rounded-full h-3 mb-2">
              <div 
                className="bg-yellow-400 h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(250,204,21,0.5)]" 
                style={{ width: `${progressPercent}%` }}
              ></div>
           </div>
           <div className="text-xs opacity-90 text-center text-emerald-100">
             {nextRewardThreshold - stats.total} more stamps to go!
           </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Link to="/leaderboard" className="bg-white px-4 py-2 rounded-lg shadow-sm text-blue-900 font-bold text-sm hover:bg-blue-50 flex items-center gap-2 transition-colors border border-blue-100">
           <BarChart2 size={16} /> View School Leaderboard
        </Link>
      </div>

      {/* Rewards Catalog Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
             <Trophy className="text-yellow-500" /> Rewards Progress
           </h2>
           <Link to="/achievements" className="text-sm font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1">
             View All Achievements <ArrowRight size={16} />
           </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {progressCards.map((card, idx) => {
            const ach = card.data;
            if (!ach) {
              return (
                <div key={idx} className="bg-gray-50 p-5 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center h-full min-h-[160px]">
                   <span className="text-gray-400 font-bold mb-1">{card.title}</span>
                   <span className="text-xs text-gray-400">{card.emptyText}</span>
                </div>
              );
            }

            return (
              <div key={`${ach.id}-${idx}`} className={`bg-white p-5 rounded-xl shadow-md border ${ach.isUnlocked ? 'border-emerald-200' : 'border-gray-100'} hover:shadow-lg transition-shadow relative overflow-hidden flex flex-col h-full`}>
                 {card.type === 'unlocked' && <div className="absolute top-0 right-0 bg-emerald-500 text-white px-2 py-1 text-xs font-bold rounded-bl-lg flex items-center gap-1"><Sparkles size={10} /> UNLOCKED</div>}
                 {card.type === 'claimed' && <div className="absolute top-0 right-0 bg-blue-500 text-white px-2 py-1 text-xs font-bold rounded-bl-lg flex items-center gap-1"><Gift size={10} /> CLAIMED</div>}
                 {card.type === 'progress' && <div className="absolute top-0 right-0 bg-yellow-500 text-white px-2 py-1 text-xs font-bold rounded-bl-lg">CLOSE CALL</div>}
                 
                 <div className="mb-1 text-xs font-bold text-gray-400 uppercase tracking-wider">{card.title}</div>

                 <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${ach.isUnlocked ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                   {ach.isUnlocked ? <CheckCircle size={20} /> : <Lock size={20} />}
                 </div>
                 
                 <h3 className="font-bold text-blue-900 truncate">{ach.title}</h3>
                 <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ach.reward}</p>
                 
                 <div className="mt-auto pt-3">
                    <div className="flex justify-between text-xs mb-1 text-gray-400">
                      <span>Progress</span>
                      <span>{Math.round(Math.min(100, (ach.currentProgress / ach.maxProgress) * 100))}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${ach.isUnlocked ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                        style={{ width: `${Math.min(100, (ach.currentProgress / ach.maxProgress) * 100)}%` }} 
                      />
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Passport & Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Passport Grid */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
               <Award className="text-emerald-600" /> My Passport
             </h2>
          </div>
          <StudentPassport studentId={studentId} />
        </div>

        {/* Stats & Timeline Sidebar */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
             <h3 className="font-bold text-blue-900 mb-6">Value Breakdown</h3>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={90} tick={{fontSize: 10, fill: '#1e3a8a'}} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colorMap[entry.color]} />
                      ))}
                    </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>

           {/* Recent Activity Timeline */}
           <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
             <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                <History size={18} /> Recent History
             </h3>
             <div className="space-y-4">
               {recentSignatures.length > 0 ? (
                 recentSignatures.map(sig => {
                   const valueDef = CORE_VALUES[sig.value];
                   return (
                     <div key={sig.id} className="relative pl-4 border-l-2 border-gray-200 pb-2 last:pb-0">
                       <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${valueDef.color.split(' ')[0]}`}></div>
                       <div className="text-sm font-bold text-gray-800">{sig.subject}</div>
                       <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <span className={`${valueDef.color} px-1.5 rounded`}>{sig.value}</span>
                          <span className="text-gray-300">•</span>
                          <span>{new Date(sig.timestamp).toLocaleDateString()}</span>
                       </div>
                       {sig.subValue && (
                         <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">
                            <Tag size={10} /> {sig.subValue}
                         </div>
                       )}
                       {sig.note && (
                         <div className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded border border-gray-100">
                           "{sig.note}"
                         </div>
                       )}
                     </div>
                   );
                 })
               ) : (
                 <p className="text-sm text-gray-500 text-center italic py-4">No stamps yet!</p>
               )}
             </div>
           </div>

           <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 text-emerald-900">
               <Lightbulb size={64} />
             </div>
             <h3 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
               <Lightbulb size={18} className="text-yellow-600" /> Did you know?
             </h3>
             <p className="text-sm text-emerald-800 leading-relaxed">
               {renderTip(currentTip)}
             </p>
           </div>
        </div>
      </div>

      {/* Nomination Modal */}
      {isNominationModalOpen && (
        <div className="fixed inset-0 bg-blue-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-emerald-700 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Stamp size={20} /> Request Stamp
              </h3>
              <button onClick={() => setIsNominationModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full">
                <X size={20} />
              </button>
            </div>

            {nomSuccess ? (
              <div className="p-10 flex flex-col items-center text-center">
                <div className="bg-green-100 text-green-600 p-4 rounded-full mb-4">
                  <CheckCircle size={48} />
                </div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">Request Sent!</h4>
                <p className="text-gray-500">Your homeroom teacher will review your request shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleNominationSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => { setNominationType('SELF'); setNomineeId(studentId); }}
                    className={`py-2 px-4 rounded-md text-sm font-bold transition-all ${
                      nominationType === 'SELF' ? 'bg-white shadow text-blue-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    For Myself
                  </button>
                  <button
                    type="button"
                    onClick={() => setNominationType('PEER')}
                    className={`py-2 px-4 rounded-md text-sm font-bold transition-all ${
                      nominationType === 'PEER' ? 'bg-white shadow text-blue-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    For a Friend
                  </button>
                </div>

                {nominationType === 'PEER' && (
                  <div>
                    <label className="block text-sm font-bold text-blue-900 mb-1">Who deserves this?</label>
                    {nomineeId !== studentId ? (
                         <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold">
                               {allStudents.find(s => s.id === nomineeId)?.name.charAt(0)}
                             </div>
                             <span className="font-bold text-blue-900">{allStudents.find(s => s.id === nomineeId)?.name}</span>
                           </div>
                           <button 
                             type="button"
                             onClick={() => { setNomineeId(studentId); setStudentSearchTerm(''); }}
                             className="text-gray-400 hover:text-red-500"
                           >
                             <X size={18} />
                           </button>
                         </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search by name..."
                            value={studentSearchTerm}
                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                            className="w-full pl-9 p-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                          />
                        </div>
                        {studentSearchTerm.length > 1 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {allStudents
                              .filter(s => s.id !== studentId && (s.name.toLowerCase().includes(studentSearchTerm.toLowerCase())))
                              .map(s => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => { setNomineeId(s.id); setStudentSearchTerm(''); }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 border-b last:border-0 border-gray-100"
                                >
                                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">
                                    {s.name.charAt(0)}
                                  </div>
                                  <span className="text-sm text-gray-700">{s.name}</span>
                                </button>
                            ))}
                            {allStudents.filter(s => s.id !== studentId && (s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()))).length === 0 && (
                              <div className="p-3 text-center text-xs text-gray-400">No students found</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-blue-900 mb-1">Subject/Area</label>
                    <select
                      required
                      value={nomSubject}
                      onChange={(e) => setNomSubject(e.target.value as Subject)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Select Area...</option>
                      {SUBJECTS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-blue-900 mb-1">Value</label>
                      <select
                        required
                        value={nomValue}
                        onChange={(e) => setNomValue(e.target.value as CoreValue)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">Select Value...</option>
                        {Object.values(CORE_VALUES).map(v => (
                          <option key={v.id} value={v.id}>{v.id}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-blue-900 mb-1">Sub-value</label>
                      <select
                        required
                        value={nomSubValue}
                        onChange={(e) => setNomSubValue(e.target.value)}
                        disabled={!nomValue}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">Select Sub-value...</option>
                        {nomValue && CORE_VALUES[nomValue].subValues.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-blue-900 mb-1">Reason (Be Specific)</label>
                  <textarea
                    required
                    value={nomReason}
                    onChange={(e) => setNomReason(e.target.value)}
                    placeholder={nominationType === 'SELF' ? "I demonstrated this value when I..." : "They demonstrated this value when they..."}
                    className="w-full p-3 border border-gray-300 rounded-lg h-24 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2 text-xs text-blue-800">
                  <Users size={16} className="mt-0.5 flex-shrink-0" />
                  <p>
                    {nominationType === 'SELF' 
                      ? "Self-advocacy is encouraged! Be honest about your actions."
                      : "Nominating others is a great way to show you value them!"}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:bg-gray-300"
                >
                  {isSubmitting ? <Loader2 className="animate-spin"/> : <Send size={18} />} Submit Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};