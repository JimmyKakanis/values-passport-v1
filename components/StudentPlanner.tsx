
import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, eachDayOfInterval } from 'date-fns';
import { PlannerItem, PlannerCategory } from '../types';
import { subscribeToPlannerItems, addPlannerItem, updatePlannerItem, deletePlannerItem } from '../services/dataService';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  studentId: string;
}

export const StudentPlanner: React.FC<Props> = ({ studentId }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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
    return () => unsubscribe();
  }, [studentId]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    // Set due date to 9am on the selected day to be consistent
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

  // Calendar Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const selectedDateItems = items.filter(item => isSameDay(new Date(item.dueDate), selectedDate));
  
  const getItemsForDate = (date: Date) => {
    return items.filter(item => isSameDay(new Date(item.dueDate), date));
  };

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

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left Side: Calendar */}
        <div className="flex-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-emerald-800 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <CalendarIcon /> {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <div className="flex gap-2">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-emerald-700 rounded-full transition-colors">
                  <ChevronLeft size={24} />
                </button>
                <button onClick={handleNextMonth} className="p-2 hover:bg-emerald-700 rounded-full transition-colors">
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-bold uppercase tracking-widest text-emerald-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-2">{day}</div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 border-t border-gray-100">
            {calendarDays.map((day, i) => {
              const dayItems = getItemsForDate(day);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, monthStart);

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[80px] md:min-h-[100px] p-2 border-r border-b border-gray-100 transition-all relative flex flex-col items-center gap-1
                    ${!isCurrentMonth ? 'bg-gray-50 text-gray-300' : 'text-gray-700'}
                    ${isSelected ? 'bg-emerald-50 ring-2 ring-emerald-500 ring-inset z-10' : 'hover:bg-gray-50'}
                  `}
                >
                  <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-yellow-400 text-blue-900' : ''}
                  `}>
                    {format(day, 'd')}
                  </span>
                  
                  <div className="flex flex-wrap justify-center gap-1 mt-1">
                    {dayItems.slice(0, 3).map(item => (
                      <div 
                        key={item.id} 
                        className={`w-2 h-2 rounded-full ${categoryColors[item.category]} ${item.isCompleted ? 'opacity-30' : ''}`}
                        title={item.title}
                      />
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-[10px] text-gray-400 font-bold">+{dayItems.length - 3}</div>
                    )}
                  </div>
                </button>
              );
            })}
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

          {/* Quick Tips */}
          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex gap-3">
            <AlertCircle size={20} className="text-yellow-600 shrink-0" />
            <div className="text-xs text-yellow-800 leading-relaxed">
              <strong>Tip:</strong> Use different colors to separate your homework from your personal tasks!
            </div>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      {isModalOpen && (
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
                  placeholder="e.g. Math Homework Page 42"
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
