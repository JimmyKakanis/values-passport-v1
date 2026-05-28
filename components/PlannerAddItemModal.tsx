import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Plus, CheckSquare, BookOpen, Clock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PlannerCategory } from '../types';
import { PLANNER_CATEGORY_BG, PLANNER_CATEGORY_TEXT } from '../utils/plannerDisplay';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultCategory: PlannerCategory;
  defaultDueDate: Date;
  isSubmitting: boolean;
  onSubmit: (title: string, category: PlannerCategory, dueDate: Date) => void;
}

const CATEGORY_OPTIONS: {
  id: PlannerCategory;
  icon: React.ReactNode;
  label: string;
}[] = [
  { id: 'TASK', icon: <CheckSquare size={16} />, label: 'Task' },
  { id: 'HOMEWORK', icon: <BookOpen size={16} />, label: 'Homework' },
  { id: 'ASSIGNMENT', icon: <Clock size={16} />, label: 'Assignment' },
];

export const PlannerAddItemModal: React.FC<Props> = ({
  open,
  onClose,
  defaultCategory,
  defaultDueDate,
  isSubmitting,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PlannerCategory>(defaultCategory);
  const [dueDateStr, setDueDateStr] = useState(format(defaultDueDate, 'yyyy-MM-dd'));

  useEffect(() => {
    if (open) {
      setTitle('');
      setCategory(defaultCategory);
      setDueDateStr(format(defaultDueDate, 'yyyy-MM-dd'));
    }
  }, [open, defaultCategory, defaultDueDate]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDateStr) return;
    const dueDate = new Date(`${dueDateStr}T09:00:00`);
    onSubmit(title.trim(), category, dueDate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="bg-emerald-800 p-6 text-white flex justify-between items-center gap-4">
          <h3 className="font-bold text-lg flex items-center gap-2 shrink-0">
            <Plus /> Add Planner Item
          </h3>
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
            <label className="block text-sm font-bold text-gray-700 mb-1">Due date</label>
            <input
              type="date"
              required
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              value={dueDateStr}
              onChange={(e) => setDueDateStr(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all
                    ${
                      category === cat.id
                        ? `${PLANNER_CATEGORY_BG[cat.id]} border-emerald-500 ${PLANNER_CATEGORY_TEXT[cat.id]}`
                        : 'border-gray-50 text-gray-400 hover:border-gray-200'
                    }`}
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
              onClick={onClose}
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
  );
};
