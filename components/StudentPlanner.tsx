import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Clock, 
  BookOpen, 
  CheckSquare,
  AlertCircle,
  Loader2,
  LayoutDashboard,
  CalendarRange,
  List,
  Sunrise,
  Lock,
  Save
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  addWeeks,
  differenceInCalendarWeeks,
  isWithinInterval,
  addDays
} from 'date-fns';
import { PlannerItem, PlannerCategory, DailyIntention } from '../types';
import {
  subscribeToPlannerItems,
  addPlannerItem,
  updatePlannerItem,
  deletePlannerItem,
  subscribeToDailyIntentions,
  upsertDailyIntention,
} from '../services/dataService';
import { getDateKey, INTENTION_TEXT_MAX } from '../services/studentEngagement';
import { CORE_VALUES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { StudentGoals } from './StudentGoals';
import { SCHOOL_TERMS } from '../schoolCalendar';

type CalendarView = 'TERM' | 'MONTH' | 'WEEK';

interface Props {
  studentId: string;
}


export const StudentPlanner: React.FC<Props> = ({ studentId }) => {
  const [mode, setMode] = useState<'CALENDAR' | 'GOALS'>('CALENDAR');
  const [view, setView] = useState<CalendarView>('TERM');

  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [intentions, setIntentions] = useState<DailyIntention[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [intentionDraft, setIntentionDraft] = useState('');
  const [savingIntention, setSavingIntention] = useState(false);
  const [intentionSaveError, setIntentionSaveError] = useState<string | null>(null);
  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PlannerCategory>('TASK');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToPlannerItems(studentId, (data) => {
      setItems(data);
      setLoading(false);
    });
    const unsubIntentions = subscribeToDailyIntentions(studentId, setIntentions);
    return () => {
      unsubscribe();
      unsubIntentions();
    };
  }, [studentId]);

  const intentionsByDate = useMemo(() => {
    const map: Record<string, DailyIntention> = {};
    intentions.forEach((i) => {
      map[i.dateKey] = i;
    });
    return map;
  }, [intentions]);

  const todayKey = getDateKey(new Date());
  const selectedDateKey = getDateKey(selectedDate);
  const selectedIntention = intentionsByDate[selectedDateKey];
  const isSelectedToday = selectedDateKey === todayKey;
  const isSelectedPast = selectedDateKey < todayKey;
  const isSelectedFuture = selectedDateKey > todayKey;

  useEffect(() => {
    if (isSelectedToday) {
      setIntentionDraft(selectedIntention?.text ?? '');
      setIntentionSaveError(null);
    }
  }, [isSelectedToday, selectedIntention?.text]);

  // Derived State: Current Term
  // Note: We use useMemo to avoid recalculating on every render, though it's cheap.
  const currentTerm = useMemo(() => {
    return SCHOOL_TERMS.find(term => 
      isWithinInterval(currentDate, { start: term.start, end: term.end })
    ) || SCHOOL_TERMS.find(t => t.start > currentDate) || SCHOOL_TERMS[0];
  }, [currentDate]);

  const handleNavigate = (direction: 'PREV' | 'NEXT') => {
    const modifier = direction === 'NEXT' ? 1 : -1;
    
    if (view === 'TERM') {
      const currentIndex = SCHOOL_TERMS.findIndex(t => t.id === currentTerm.id);
      const newIndex = Math.max(0, Math.min(SCHOOL_TERMS.length - 1, currentIndex + modifier));
      setCurrentDate(SCHOOL_TERMS[newIndex].start);
    } else if (view === 'MONTH') {
      setCurrentDate(prev => addMonths(prev, modifier));
    } else if (view === 'WEEK') {
      setCurrentDate(prev => addWeeks(prev, modifier));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const dueDate = new Date(selectedDate);
    dueDate.setHours(9, 0, 0, 0);

    await addPlannerItem(studentId, title, dueDate.getTime(), category);
    
    setTitle('');
    setCategory('TASK');
    setIsModalOpen(false);
    setIsSubmitting(false);
  };

  const toggleComplete = async (item: PlannerItem) => {
    await updatePlannerItem(item.id, { isCompleted: !item.isCompleted });
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await deletePlannerItem(itemId);
    }
  };

  // Helper to filter items for a specific date
  const getItemsForDate = (date: Date) => {
    return items.filter(item => isSameDay(new Date(item.dueDate), date));
  };

  const selectedDateItems = items.filter(item => isSameDay(new Date(item.dueDate), selectedDate));

  const categoryColors = {
    ASSIGNMENT: 'bg-red-500',
    HOMEWORK: 'bg-blue-500',
    TASK: 'bg-emerald-500'
  };

  const categoryBg = {
    ASSIGNMENT: 'bg-red-50',
    HOMEWORK: 'bg-blue-50',
    TASK: 'bg-emerald-50'
  };

  const categoryText = {
    ASSIGNMENT: 'text-red-700',
    HOMEWORK: 'text-blue-700',
    TASK: 'text-emerald-700'
  };

  // --- RENDERING HELPERS ---

  const handleSaveIntention = async () => {
    if (!isSelectedToday) return;
    const trimmed = intentionDraft.trim();
    if (!trimmed) return;
    setSavingIntention(true);
    setIntentionSaveError(null);
    const result = await upsertDailyIntention(
      studentId,
      todayKey,
      trimmed,
      selectedIntention?.coreValue,
      selectedIntention?.subValue
    );
    setSavingIntention(false);
    if (!result.ok) setIntentionSaveError(result.userMessage);
  };

  const renderIntentionTags = (intention: DailyIntention) =>
    intention.coreValue || intention.subValue ? (
      <div className="mb-2 flex flex-wrap gap-1.5">
        {intention.coreValue && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${CORE_VALUES[intention.coreValue].color}`}
          >
            {intention.coreValue}
          </span>
        )}
        {intention.subValue && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-200/80 bg-amber-50 text-amber-950">
            {intention.subValue}
          </span>
        )}
      </div>
    ) : null;

  const renderIntentionQuote = (text: string) => (
    <p className="border-l-2 border-amber-400/80 pl-3 text-sm font-medium leading-relaxed text-amber-950">
      {text}
    </p>
  );

  const renderDayCell = (day: Date, isOutsideRange: boolean = false, heightClass: string = 'min-h-[80px]') => {
    const dayItems = getItemsForDate(day);
    const dayKey = getDateKey(day);
    const hasIntention = Boolean(intentionsByDate[dayKey]);
    const isSelected = isSameDay(day, selectedDate);
    const isToday = isSameDay(day, new Date());

    return (
      <button
        key={day.toISOString()}
        onClick={() => setSelectedDate(day)}
        onDoubleClick={() => { setSelectedDate(day); setIsModalOpen(true); }}
        className={`${heightClass} p-0.5 md:p-2 border-r border-b border-gray-100 transition-all relative flex flex-col items-center gap-0.5 md:gap-1
          ${isOutsideRange ? 'bg-gray-50/50 text-gray-300' : 'bg-white text-gray-700'}
          ${isSelected ? '!bg-emerald-50 ring-2 ring-emerald-500 ring-inset z-10' : 'hover:bg-gray-50'}
        `}
      >
        <span className={`text-[10px] md:text-sm font-bold w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full
          ${isToday ? 'bg-yellow-400 text-blue-900' : ''}
        `}>
          {format(day, 'd')}
        </span>
        
        <div className="flex flex-wrap justify-center gap-0.5 md:gap-1 mt-0.5 w-full px-0.5">
          {hasIntention && (
            <div
              className="w-1 h-1 md:w-2 md:h-2 rounded-full bg-amber-400"
              title="Daily intention"
            />
          )}
          {dayItems.slice(0, 4).map(item => (
            <div 
              key={item.id} 
              className={`w-1 h-1 md:w-2 md:h-2 rounded-full ${categoryColors[item.category] || 'bg-gray-400'} ${item.isCompleted ? 'opacity-30' : ''}`}
              title={item.title}
            />
          ))}
          {dayItems.length > 4 && (
            <div className="text-[7px] md:text-[9px] text-gray-400 font-bold leading-none">+{dayItems.length - 4}</div>
          )}
        </div>
      </button>
    );
  };

  const renderWeekRow = (weekStart: Date, weekNum: string | number, monthLabel: string | null = null, minHeight: string = 'min-h-[100px]') => {
    const days = eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6)
    });

    return (
      <div key={weekStart.toISOString()} className={`flex border-b border-gray-100 ${minHeight}`}>
          {/* Week Sidebar */}
          <div className="w-8 md:w-20 bg-emerald-50/30 flex flex-col items-center justify-center border-r border-gray-100 text-emerald-800 p-0.5 md:p-2 text-center shrink-0">
            {monthLabel && (
              <span className="text-[8px] md:text-[10px] uppercase font-bold text-emerald-600 mb-0.5 md:mb-1 -rotate-90 md:rotate-0">{monthLabel}</span>
            )}
            <span className="hidden md:block text-[10px] uppercase font-bold text-gray-400">Week</span>
            <span className="text-sm md:text-xl font-bold">{weekNum}</span>
          </div>
          
          {/* Days Grid */}
          <div className="flex-1 grid grid-cols-7">
            {days.map((day) => {
              let isOutsideTerm = false;
              if (view === 'TERM') {
                isOutsideTerm = !isWithinInterval(day, { start: currentTerm.start, end: currentTerm.end });
              } else if (view === 'MONTH') {
                isOutsideTerm = !isSameMonth(day, currentDate);
              }
              
              return renderDayCell(day, isOutsideTerm, 'h-full');
            })}
          </div>
      </div>
    );
  };

  const getSchoolWeekNumber = (date: Date) => {
    // Find term that either contains this date OR starts in this week (for Week 1)
    const term = SCHOOL_TERMS.find(t => {
      if (isWithinInterval(date, { start: t.start, end: t.end })) return true;
      
      // Check if this week contains the term start
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      return isWithinInterval(t.start, { start: weekStart, end: weekEnd });
    });

    if (term) {
       const weekDiff = differenceInCalendarWeeks(date, term.start, { weekStartsOn: 1 });
       // If the date is before term start (e.g. Monday vs Tuesday start), diff is 0, so Week 1.
       // If date is later, diff increases.
       return weekDiff + 1;
    }
    return "-";
  };

  // --- PREPARE DATA FOR VIEWS ---

  const renderTermView = () => {
    const weeks = [];
    const termStartWeek = startOfWeek(currentTerm.start, { weekStartsOn: 1 });
    // Ensure we capture the full end week
    const termEndWeek = endOfWeek(currentTerm.end, { weekStartsOn: 1 });
    
    let iterDate = termStartWeek;
    let weekNum = 1;

    // Safety brake
    let loopCount = 0;
    
    while (iterDate <= termEndWeek && loopCount < 52) {
      // Always show the month label for every week
      const monthLabel = format(iterDate, 'MMM');

      weeks.push({ start: iterDate, weekNum, monthLabel });
      
      iterDate = addWeeks(iterDate, 1);
      weekNum++;
      loopCount++;
    }

    return (
      <div className="flex flex-col border-t border-gray-100">
        {weeks.map(w => renderWeekRow(w.start, w.weekNum, w.monthLabel))}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const weeks = [];
    let iterDate = startDate;
    let loopCount = 0;

    while (iterDate <= endDate && loopCount < 10) {
      weeks.push(iterDate);
      iterDate = addWeeks(iterDate, 1);
      loopCount++;
    }

    return (
      <div className="flex flex-col border-t border-gray-100">
         {weeks.map(weekStart => {
           const weekNum = getSchoolWeekNumber(weekStart);
           return renderWeekRow(weekStart, weekNum, null, 'min-h-[120px]');
         })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekNum = getSchoolWeekNumber(weekStart);
    return (
      <div className="flex flex-col border-t border-gray-100">
         {renderWeekRow(weekStart, weekNum, null, 'min-h-[200px]')}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Mode Switcher */}
      <div className="flex justify-center">
        <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 flex gap-2">
          <button 
            onClick={() => setMode('CALENDAR')}
            className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all
              ${mode === 'CALENDAR' ? 'bg-emerald-100 text-emerald-800' : 'text-gray-400 hover:bg-gray-50'}
            `}
          >
            <CalendarIcon size={18} /> Calendar
          </button>
          <button 
            onClick={() => setMode('GOALS')}
            className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all
              ${mode === 'GOALS' ? 'bg-purple-100 text-purple-800' : 'text-gray-400 hover:bg-gray-50'}
            `}
          >
            <List size={18} /> My Goals
          </button>
        </div>
      </div>

      {mode === 'GOALS' ? (
        <StudentGoals studentId={studentId} />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: Calendar */}
        <div className="flex-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
          {/* Calendar Header */}
          <div className="bg-emerald-800 p-4 md:p-6 text-white shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 md:w-6 md:h-6" /> 
                  <span className="truncate">
                    {view === 'TERM' && currentTerm.name}
                    {view === 'MONTH' && format(currentDate, 'MMMM yyyy')}
                    {view === 'WEEK' && `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')}`}
                  </span>
                </h2>
                
                {/* View Switcher */}
                <div className="flex bg-emerald-900/50 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
                  <button 
                    onClick={() => setView('TERM')}
                    className={`flex-1 md:flex-none px-3 py-1 rounded-md text-xs md:text-sm font-medium transition-all flex items-center justify-center gap-2 ${view === 'TERM' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:bg-emerald-700/50'}`}
                  >
                    <List size={14} /> Term
                  </button>
                  <button 
                    onClick={() => setView('MONTH')}
                    className={`flex-1 md:flex-none px-3 py-1 rounded-md text-xs md:text-sm font-medium transition-all flex items-center justify-center gap-2 ${view === 'MONTH' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:bg-emerald-700/50'}`}
                  >
                    <CalendarRange size={14} /> Month
                  </button>
                  <button 
                    onClick={() => setView('WEEK')}
                    className={`flex-1 md:flex-none px-3 py-1 rounded-md text-xs md:text-sm font-medium transition-all flex items-center justify-center gap-2 ${view === 'WEEK' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:bg-emerald-700/50'}`}
                  >
                    <LayoutDashboard size={14} /> Week
                  </button>
                </div>
              </div>

              <div className="flex gap-2 self-end md:self-auto">
                <button onClick={() => handleNavigate('PREV')} className="p-2 hover:bg-emerald-700 rounded-full transition-colors">
                  <ChevronLeft size={24} />
                </button>
                <button onClick={() => handleNavigate('NEXT')} className="p-2 hover:bg-emerald-700 rounded-full transition-colors">
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 pl-8 md:pl-20 text-center text-[10px] md:text-xs font-bold uppercase tracking-widest text-emerald-200">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="py-2">{day.slice(0, 3)}</div>
              ))}
            </div>
          </div>

          {/* Calendar Body - Scrollable */}
          <div className="flex-1">
            {view === 'TERM' && renderTermView()}
            {view === 'MONTH' && renderMonthView()}
            {view === 'WEEK' && renderWeekView()}
          </div>
        </div>

        {/* Right Side: Task List */}
        <div className="w-full md:w-80 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-gray-900">{format(selectedDate, 'EEEE')}</h3>
                <p className="text-sm text-gray-500">{format(selectedDate, 'do MMMM')}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>
              ) : selectedDateItems.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {selectedDateItems.map(item => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`group p-3 rounded-xl border transition-all flex items-start gap-3
                        ${item.isCompleted ? 'bg-gray-50 border-gray-100 opacity-60' : `${categoryBg[item.category]} border-transparent`}
                      `}
                    >
                      <button 
                        onClick={() => toggleComplete(item)}
                        className={`mt-0.5 transition-colors ${item.isCompleted ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-400'}`}
                      >
                        {item.isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold leading-tight ${item.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {item.title}
                        </p>
                        <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${item.isCompleted ? 'text-gray-300' : categoryText[item.category]}`}>
                          {item.category}
                        </div>
                      </div>

                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                    <CheckSquare size={24} />
                  </div>
                  <p className="text-sm text-gray-400 italic">No tasks for today</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-amber-950 text-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 ring-1 ring-amber-200/60">
                <Sunrise size={16} className="text-amber-600" />
              </span>
              Daily intention
              <span className="ml-auto inline-flex items-center gap-0.5 rounded-full border border-amber-200/70 bg-white/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900/70">
                <Lock size={10} /> Private
              </span>
            </h3>
            {isSelectedToday ? (
              <div className="space-y-2">
                <p className="text-[10px] text-amber-800/80">
                  Set or update today&apos;s intention here. Past and future days are view-only.
                </p>
                {selectedIntention && renderIntentionTags(selectedIntention)}
                <textarea
                  value={intentionDraft}
                  onChange={(e) => setIntentionDraft(e.target.value.slice(0, INTENTION_TEXT_MAX))}
                  rows={3}
                  placeholder="What do you want to focus on today?"
                  className="w-full rounded-lg border border-amber-200 bg-white p-2 text-sm text-gray-800 focus:ring-2 focus:ring-amber-400 outline-none"
                />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[10px] text-amber-800/70">
                    {intentionDraft.length}/{INTENTION_TEXT_MAX}
                  </span>
                  {intentionSaveError && (
                    <span className="text-[10px] text-red-600 font-medium text-right flex-1">
                      {intentionSaveError}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveIntention}
                    disabled={savingIntention || !intentionDraft.trim()}
                    className="flex items-center gap-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-amber-950 px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {savingIntention ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Save
                  </button>
                </div>
              </div>
            ) : selectedIntention ? (
              <div className="space-y-2 rounded-lg border border-amber-100/80 bg-white/75 p-3">
                {renderIntentionTags(selectedIntention)}
                {renderIntentionQuote(selectedIntention.text)}
                <p className="pt-1 text-[10px] text-amber-800/80 italic">
                  {isSelectedPast
                    ? "Past intentions can't be changed."
                    : isSelectedFuture
                      ? "You can't set intentions for future days."
                      : null}
                </p>
              </div>
            ) : (
              <p className="text-sm text-amber-900/80 italic">
                {isSelectedPast
                  ? 'No intention was saved for this day.'
                  : isSelectedFuture
                    ? "You can't set intentions for future days — only today."
                    : null}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 px-1">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Intention</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Task</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Homework</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Assignment</span>
          </div>

          {/* Quick Tips */}
          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex gap-3">
            <AlertCircle size={20} className="text-yellow-600 shrink-0" />
            <div className="text-xs text-yellow-800 leading-relaxed">
              <strong>Tip:</strong> Use different colours to separate your homework from your personal tasks!
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Floating Action Button (Mobile Only) */}
      {mode === 'CALENDAR' && (
      <button 
        onClick={() => setIsModalOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-40 bg-emerald-600 text-white p-4 rounded-full shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
      >
        <Plus size={24} />
      </button>
      )}

      {/* Add Item Modal */}
      {mode === 'CALENDAR' && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="bg-emerald-800 p-6 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Plus /> Add Planner Item
              </h3>
              <p className="text-emerald-200 text-sm">{format(selectedDate, 'MMM d, yyyy')}</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">What needs to be done?</label>
                <input 
                  autoFocus
                  type="text"
                  required
                  placeholder="e.g. Maths Homework Page 42"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'TASK', icon: <CheckSquare size={16} />, label: 'Task' },
                    { id: 'HOMEWORK', icon: <BookOpen size={16} />, label: 'Homework' },
                    { id: 'ASSIGNMENT', icon: <Clock size={16} />, label: 'Assignment' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id as PlannerCategory)}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all
                        ${category === cat.id 
                          ? `${categoryBg[cat.id as PlannerCategory]} border-emerald-500 ${categoryText[cat.id as PlannerCategory]}` 
                          : 'border-gray-50 text-gray-400 hover:border-gray-200'}
                      `}
                    >
                      {cat.icon}
                      <span className="text-[10px] font-bold uppercase tracking-wider">{cat.label}</span>
                    </button>
                  ))}
                </div>
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
                  disabled={isSubmitting || !title.trim()}
                  className="flex-2 bg-emerald-600 text-white py-3 px-8 rounded-xl font-bold hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus size={20} />} Add to Planner
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
