import React, { useEffect, useState } from 'react';
import { getPendingRewardsForTeacher, claimReward, RewardEntry, addCustomReward, getCustomRewardsForTeacher, deleteCustomReward } from '../services/dataService';
import { Gift, CheckCircle, Loader2, Trophy, Plus, Trash2, ListChecks } from 'lucide-react';
import { Teacher, CustomReward, CoreValue, Subject } from '../types';
import { CORE_VALUES, SUBJECTS } from '../constants';

interface Props {
  teacher: Teacher | null;
}

export const TeacherRewards: React.FC<Props> = ({ teacher }) => {
  const [activeTab, setActiveTab] = useState<'CLAIMS' | 'MANAGE'>('CLAIMS');
  const [rewards, setRewards] = useState<RewardEntry[]>([]);
  const [myRewards, setMyRewards] = useState<CustomReward[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardText, setRewardText] = useState('');
  const [targetGrades, setTargetGrades] = useState<string[]>([]);
  const [targetSubject, setTargetSubject] = useState<Subject | ''>(''); // New Subject State
  const [criteriaType, setCriteriaType] = useState<'TOTAL' | 'VALUE' | 'SUBJECT_MASTERY'>('TOTAL');
  const [threshold, setThreshold] = useState(5);
  const [criteriaValue, setCriteriaValue] = useState<CoreValue | ''>('');
  const [criteriaSubValue, setCriteriaSubValue] = useState(''); // Sub-value state
  const [criteriaSubject, setCriteriaSubject] = useState<Subject | ''>(''); // For Subject Mastery
  const [isCreating, setIsCreating] = useState(false);

  // Available Grades List (Hardcoded for now as it's standard)
  const AVAILABLE_GRADES = ['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12'];

  // Reset sub-value when main value changes
  useEffect(() => {
    setCriteriaSubValue('');
  }, [criteriaValue]);

  const loadClaims = async () => {
    setLoading(true);
    const data = await getPendingRewardsForTeacher();
    setRewards(data);
    setLoading(false);
  };

  const loadMyRewards = async () => {
    if (teacher && teacher.id) {
        setLoading(true);
        const data = await getCustomRewardsForTeacher(teacher.id);
        setMyRewards(data);
        setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'CLAIMS') loadClaims();
    if (activeTab === 'MANAGE') loadMyRewards();
  }, [activeTab, teacher]);

  const handleClaim = async (studentId: string, achievementId: string) => {
    await claimReward(studentId, achievementId, teacher?.name || 'Teacher Console'); 
    // Optimistic update
    setRewards(prev => prev.filter(r => !(r.student.id === studentId && r.achievement.id === achievementId)));
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher || !teacher.id) return;
    
    setIsCreating(true);
    const newReward = await addCustomReward(
        teacher.id,
        teacher.name,
        title,
        description,
        rewardText,
        targetGrades,
        targetSubject || undefined,
        {
            type: criteriaType,
            threshold: Number(threshold),
            value: criteriaType === 'VALUE' ? (criteriaValue as CoreValue) : undefined,
            subValue: criteriaType === 'VALUE' && criteriaSubValue ? criteriaSubValue : undefined,
            subject: criteriaType === 'SUBJECT_MASTERY' ? (criteriaSubject as Subject) : undefined
        }
    );

    if (newReward) {
        setMyRewards(prev => [newReward, ...prev]);
        // Reset form
        setTitle('');
        setDescription('');
        setRewardText('');
        setTargetGrades([]);
        setTargetSubject('');
        setThreshold(5);
        setCriteriaValue('');
        setCriteriaSubValue('');
        setCriteriaSubject('');
    }
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
      if (confirm('Are you sure you want to delete this reward?')) {
          await deleteCustomReward(id);
          setMyRewards(prev => prev.filter(r => r.id !== id));
      }
  };

  const toggleGrade = (grade: string) => {
      setTargetGrades(prev => 
        prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
      );
  };

  if (!teacher) return <div className="p-10 text-center text-gray-500">Please log in as a teacher to manage rewards.</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-100">
            <button
                onClick={() => setActiveTab('CLAIMS')}
                className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 ${
                    activeTab === 'CLAIMS' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <Gift size={18} /> Pending Claims ({rewards.length})
            </button>
            <button
                onClick={() => setActiveTab('MANAGE')}
                className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 ${
                    activeTab === 'MANAGE' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <ListChecks size={18} /> My Class Rewards
            </button>
        </div>
        
        {activeTab === 'CLAIMS' && (
            loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600"/></div> :
            rewards.length === 0 ? (
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
            )
        )}

        {activeTab === 'MANAGE' && (
            <div className="p-6 space-y-8">
                {/* Create Form */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <Plus size={20} className="text-emerald-600" /> Create New Reward
                    </h3>
                    <form onSubmit={handleCreateReward} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input 
                                type="text" 
                                placeholder="Reward Title (e.g. Science Star)" 
                                className="p-2 border rounded"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                            />
                            <input 
                                type="text" 
                                placeholder="Reward (e.g. 10 mins free time)" 
                                className="p-2 border rounded"
                                value={rewardText}
                                onChange={e => setRewardText(e.target.value)}
                                required
                            />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Description (e.g. Earn 5 stamps in Science)" 
                            className="w-full p-2 border rounded"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            required
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Criteria Type</label>
                                <select 
                                    className="w-full p-2 border rounded"
                                    value={criteriaType}
                                    onChange={e => setCriteriaType(e.target.value as any)}
                                >
                                    <option value="TOTAL">Total Stamps</option>
                                    <option value="VALUE">Specific Value</option>
                                    <option value="SUBJECT_MASTERY">Subject Mastery</option>
                                </select>
                            </div>
                            
                            {criteriaType === 'VALUE' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Which Value?</label>
                                        <select 
                                            className="w-full p-2 border rounded"
                                            value={criteriaValue}
                                            onChange={e => setCriteriaValue(e.target.value as CoreValue)}
                                            required
                                        >
                                            <option value="">Select...</option>
                                            {Object.values(CORE_VALUES).map(v => (
                                                <option key={v.id} value={v.id}>{v.id}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {criteriaValue && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Sub-Value (Optional)</label>
                                            <select 
                                                className="w-full p-2 border rounded"
                                                value={criteriaSubValue}
                                                onChange={e => setCriteriaSubValue(e.target.value)}
                                            >
                                                <option value="">Any {criteriaValue}</option>
                                                {CORE_VALUES[criteriaValue].subValues.map(sv => (
                                                    <option key={sv} value={sv}>{sv}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}

                            {criteriaType === 'SUBJECT_MASTERY' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Which Subject?</label>
                                    <select 
                                        className="w-full p-2 border rounded"
                                        value={criteriaSubject}
                                        onChange={e => setCriteriaSubject(e.target.value as Subject)}
                                        required
                                    >
                                        <option value="">Select...</option>
                                        {SUBJECTS.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Count Required</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    className="w-full p-2 border rounded"
                                    value={threshold}
                                    onChange={e => setThreshold(Number(e.target.value))}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">Target Grades</label>
                                <div className="flex flex-wrap gap-2">
                                    {AVAILABLE_GRADES.map(grade => (
                                        <button
                                            key={grade}
                                            type="button"
                                            onClick={() => toggleGrade(grade)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                                                targetGrades.includes(grade) 
                                                    ? 'bg-emerald-600 text-white' 
                                                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            {grade}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">Target Class (Optional)</label>
                                <select 
                                    className="w-full p-2 border rounded text-sm"
                                    value={targetSubject}
                                    onChange={e => setTargetSubject(e.target.value as Subject)}
                                >
                                    <option value="">Any Subject / General</option>
                                    {SUBJECTS.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    If selected, this reward will only appear relevant to this subject.
                                </p>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isCreating || targetGrades.length === 0}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-2 rounded-lg transition-colors"
                        >
                            {isCreating ? 'Creating...' : 'Create Reward'}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div>
                    <h3 className="font-bold text-gray-700 mb-4">Active Rewards</h3>
                    {loading ? <Loader2 className="animate-spin text-emerald-600 mx-auto" /> : 
                     myRewards.length === 0 ? <p className="text-gray-500 text-sm italic">You haven't created any rewards yet.</p> : (
                        <div className="space-y-3">
                            {myRewards.map(reward => (
                                <div key={reward.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center bg-white">
                                    <div>
                                        <h4 className="font-bold text-blue-900">{reward.title}</h4>
                                        <p className="text-xs text-gray-500">{reward.description}</p>
                                        <div className="flex gap-2 mt-2">
                                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">{reward.reward}</span>
                                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">
                                                {reward.targetGrades.join(', ')}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(reward.id)}
                                        className="text-gray-400 hover:text-red-500 p-2"
                                        title="Delete Reward"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};
