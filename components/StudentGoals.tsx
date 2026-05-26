import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  BookOpen,
  Heart,
  Loader2,
  Target,
  Lock,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Goal, GoalType, GoalCheckIn } from '../types';
import {
  subscribeToGoals,
  addGoal,
  updateGoal,
  deleteGoal,
  subscribeToGoalCheckIns,
  upsertGoalCheckIn,
} from '../services/dataService';
import { SUBJECTS } from '../constants';
import {
  getFortnightPeriodKey,
  isGoalCheckInWindowOpen,
  GOAL_CHECKIN_TEXT_MAX,
} from '../services/studentEngagement';

interface Props {
  studentId: string;
}

export const StudentGoals: React.FC<Props> = ({ studentId }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [checkIns, setCheckIns] = useState<GoalCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [checkInDrafts, setCheckInDrafts] = useState<Record<string, string>>({});
  const [savingGoalId, setSavingGoalId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<GoalType>('YEARLY');
  const [title, setTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fortnight = getFortnightPeriodKey(new Date());
  const checkInOpen = isGoalCheckInWindowOpen(new Date());
  const activeGoals = goals.filter((g) => !g.isCompleted);

  const checkInsByGoalPeriod = useMemo(() => {
    const map: Record<string, GoalCheckIn> = {};
    if (!fortnight) return map;
    checkIns.forEach((c) => {
      if (c.periodKey === fortnight.periodKey) {
        map[c.goalId] = c;
      }
    });
    return map;
  }, [checkIns, fortnight]);

  useEffect(() => {
    setLoading(true);
    const unsubGoals = subscribeToGoals(studentId, (data) => {
      setGoals(data);
      setLoading(false);
    });
    const unsubCheckIns = subscribeToGoalCheckIns(studentId, setCheckIns);
    return () => {
      unsubGoals();
      unsubCheckIns();
    };
  }, [studentId]);

  const toggleCheckInPanel = (goalId: string) => {
    if (expandedGoalId === goalId) {
      setExpandedGoalId(null);
      return;
    }
    setExpandedGoalId(goalId);
    setCheckInDrafts((prev) => ({
      ...prev,
      [goalId]: prev[goalId] ?? checkInsByGoalPeriod[goalId]?.progressText ?? '',
    }));
  };

  const handleOpenModal = (type: GoalType) => {
    setModalType(type);
    setTitle('');
    setSelectedSubject('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (modalType === 'SUBJECT' && !selectedSubject) return;

    setIsSubmitting(true);
    const result = await addGoal(
      studentId,
      modalType,
      title,
      modalType === 'SUBJECT' ? selectedSubject : undefined
    );

    if (result) {
      setIsModalOpen(false);
      setTitle('');
      setSelectedSubject('');
    } else {
      alert('Failed to save goal. Please check your connection or try again.');
    }
    setIsSubmitting(false);
  };

  const toggleComplete = async (goal: Goal) => {
    await updateGoal(goal.id, { isCompleted: !goal.isCompleted });
    if (!goal.isCompleted) {
      setExpandedGoalId((id) => (id === goal.id ? null : id));
    }
  };

  const handleDelete = async (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      await deleteGoal(goalId);
    }
  };

  const handleSaveCheckIn = async (goalId: string) => {
    if (!fortnight) return;
    const text = (checkInDrafts[goalId] ?? '').trim();
    if (!text) return;
    setSavingGoalId(goalId);
    await upsertGoalCheckIn(goalId, studentId, fortnight.periodKey, text);
    setSavingGoalId(null);
  };

  const sections = [
    {
      id: 'YEARLY',
      title: 'My Year',
      icon: <Plus className="w-5 h-5 text-purple-600" />,
      bg: 'bg-purple-50',
      border: 'border-purple-100',
      button: 'text-purple-600 hover:bg-purple-100',
      description: 'What do you want to achieve this year?',
    },
    {
      id: 'SUBJECT',
      title: 'My Subjects',
      icon: <BookOpen className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      button: 'text-blue-600 hover:bg-blue-100',
      description: 'Goals for specific subjects.',
    },
    {
      id: 'LIFE',
      title: 'My Life',
      icon: <Heart className="w-5 h-5 text-rose-600" />,
      bg: 'bg-rose-50',
      border: 'border-rose-100',
      button: 'text-rose-600 hover:bg-rose-100',
      description: 'Personal goals outside of school.',
    },
  ];

  return (
    <div className="space-y-8">
      {checkInOpen && fortnight && activeGoals.length > 0 && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/90 p-4 md:p-5 shadow-sm">
          <h2 className="text-sm font-bold text-violet-900 flex items-center gap-2 mb-1">
            <Target className="text-violet-600 w-5 h-5 shrink-0" /> Fortnightly check-in
          </h2>
          <p className="text-sm text-violet-950/90">{fortnight.fortnightLabel}</p>
          <p className="text-xs text-violet-800/80 mt-2 flex items-center gap-1">
            <Lock size={10} /> Your progress notes are private — only you can see them.
          </p>
        </div>
      )}

      {checkInOpen && fortnight && activeGoals.length === 0 && goals.length > 0 && (
        <p className="text-sm text-gray-500 italic text-center">
          All your goals are marked complete. Add a new goal to check in next fortnight.
        </p>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-emerald-600 w-8 h-8" />
        </div>
      ) : (
        sections.map((section) => {
          const sectionGoals = goals.filter((g) => g.type === section.id);

          return (
            <div
              key={section.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div
                className={`p-4 border-b ${section.border} ${section.bg} flex justify-between items-center`}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm">{section.icon}</div>
                  <div>
                    <h3 className="font-bold text-gray-900">{section.title}</h3>
                    <p className="text-xs text-gray-500">{section.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenModal(section.id as GoalType)}
                  className={`p-2 rounded-lg transition-colors ${section.button}`}
                  title="Add Goal"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="p-4 space-y-3 min-h-[100px]">
                {sectionGoals.length > 0 ? (
                  <div className="space-y-2">
                    {sectionGoals.map((goal) => {
                      const showCheckIn =
                        checkInOpen &&
                        fortnight &&
                        !goal.isCompleted;
                      const isExpanded = expandedGoalId === goal.id;
                      const existingCheckIn = checkInsByGoalPeriod[goal.id];

                      return (
                        <div key={goal.id} className="space-y-0">
                          <div
                            className={`group flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-sm
                              ${goal.isCompleted ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100 hover:border-gray-200'}
                            `}
                          >
                            <button
                              onClick={() => toggleComplete(goal)}
                              className={`mt-0.5 transition-colors ${goal.isCompleted ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-500'}`}
                            >
                              {goal.isCompleted ? (
                                <CheckCircle2 size={20} />
                              ) : (
                                <Circle size={20} />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col">
                                <span
                                  className={`text-sm font-medium leading-tight ${goal.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}
                                >
                                  {goal.title}
                                </span>
                                {goal.subject && (
                                  <span className="text-[10px] uppercase font-bold text-blue-500 mt-1 bg-blue-50 w-fit px-1.5 py-0.5 rounded">
                                    {goal.subject}
                                  </span>
                                )}
                                {existingCheckIn && !goal.isCompleted && (
                                  <span className="text-[10px] text-violet-600 mt-1 font-medium">
                                    Check-in saved this fortnight
                                  </span>
                                )}
                              </div>
                            </div>

                            {showCheckIn && (
                              <button
                                type="button"
                                onClick={() => toggleCheckInPanel(goal.id)}
                                className="text-violet-600 hover:text-violet-800 p-1"
                                title="Fortnightly check-in"
                              >
                                {isExpanded ? (
                                  <ChevronUp size={18} />
                                ) : (
                                  <ChevronDown size={18} />
                                )}
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(goal.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {showCheckIn && isExpanded && (
                            <div className="ml-8 mr-2 mb-2 p-3 rounded-xl border border-violet-100 bg-violet-50/50">
                              <label className="block text-xs font-bold text-violet-900 mb-2">
                                How are you making progress?
                              </label>
                              <textarea
                                value={checkInDrafts[goal.id] ?? ''}
                                onChange={(e) =>
                                  setCheckInDrafts((prev) => ({
                                    ...prev,
                                    [goal.id]: e.target.value.slice(0, GOAL_CHECKIN_TEXT_MAX),
                                  }))
                                }
                                rows={3}
                                className="w-full rounded-lg border border-violet-200 bg-white p-2 text-sm text-gray-800 focus:ring-2 focus:ring-violet-400 outline-none"
                                placeholder="What have you tried? What is going well or still hard?"
                              />
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-[10px] text-violet-700/70">
                                  {(checkInDrafts[goal.id] ?? '').length}/{GOAL_CHECKIN_TEXT_MAX}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleSaveCheckIn(goal.id)}
                                  disabled={
                                    savingGoalId === goal.id ||
                                    !(checkInDrafts[goal.id] ?? '').trim()
                                  }
                                  className="flex items-center gap-1 text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                                >
                                  {savingGoalId === goal.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Save size={14} />
                                  )}
                                  Save check-in
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 text-sm italic border-2 border-dashed border-gray-50 rounded-xl">
                    No goals set yet. Click + to add one!
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div
              className={`p-6 text-white flex justify-between items-center
              ${modalType === 'YEARLY' ? 'bg-purple-600' : modalType === 'SUBJECT' ? 'bg-blue-600' : 'bg-rose-600'}
            `}
            >
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add {modalType === 'YEARLY' ? 'Yearly' : modalType === 'SUBJECT' ? 'Subject' : 'Life'} Goal
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modalType === 'SUBJECT' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                  <select
                    required
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="">Select a subject...</option>
                    {SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Goal Description</label>
                <input
                  autoFocus
                  type="text"
                  required
                  placeholder={
                    modalType === 'YEARLY'
                      ? 'e.g. Read 20 books'
                      : modalType === 'SUBJECT'
                        ? 'e.g. Get an A in the next exam'
                        : 'e.g. Learn to juggle'
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting || !title.trim() || (modalType === 'SUBJECT' && !selectedSubject)
                  }
                  className={`flex-2 text-white py-3 px-8 rounded-xl font-bold disabled:bg-gray-200 disabled:text-gray-400 transition-all flex items-center justify-center gap-2 shadow-lg
                    ${modalType === 'YEARLY' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : modalType === 'SUBJECT' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'}
                  `}
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus size={20} />} Add Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
