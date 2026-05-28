import React, { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  CheckSquare,
  BookOpen,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { PlannerCategory, PlannerItem } from '../types';
import { PlannerItemRow } from './PlannerItemRow';
import {
  groupPlannerItemsByCategory,
  PLANNER_CATEGORY_ORDER,
  PLANNER_CATEGORY_LABELS,
  PLANNER_CATEGORY_EMPTY_HINT,
  PLANNER_CATEGORY_BG,
  PLANNER_CATEGORY_TEXT,
} from '../utils/plannerDisplay';

interface Props {
  items: PlannerItem[];
  loading: boolean;
  onToggle: (item: PlannerItem) => void;
  onDelete: (itemId: string) => void;
  onAdd: (category: PlannerCategory) => void;
}

const SECTION_ICONS: Record<PlannerCategory, React.ReactNode> = {
  TASK: <CheckSquare size={18} />,
  HOMEWORK: <BookOpen size={18} />,
  ASSIGNMENT: <Clock size={18} />,
};

function TaskRow({
  item,
  onToggle,
  onDelete,
}: {
  item: PlannerItem;
  onToggle: (item: PlannerItem) => void;
  onDelete: (itemId: string) => void;
}) {
  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-xl border transition-all
        ${item.isCompleted ? 'bg-gray-50 border-gray-100 opacity-60' : `${PLANNER_CATEGORY_BG[item.category]} border-transparent`}`}
    >
      <PlannerItemRow item={item} onToggle={onToggle} showCategory={false} />
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all shrink-0"
        aria-label={`Delete ${item.title}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function CategorySection({
  category,
  items,
  onToggle,
  onDelete,
  onAdd,
}: {
  category: PlannerCategory;
  items: PlannerItem[];
  onToggle: (item: PlannerItem) => void;
  onDelete: (itemId: string) => void;
  onAdd: (category: PlannerCategory) => void;
}) {
  const [completedOpen, setCompletedOpen] = useState(false);
  const active = items.filter((i) => !i.isCompleted);
  const completed = items.filter((i) => i.isCompleted);

  return (
    <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 ${PLANNER_CATEGORY_BG[category]}`}
      >
        <div className={`flex items-center gap-2 font-bold text-sm ${PLANNER_CATEGORY_TEXT[category]}`}>
          {SECTION_ICONS[category]}
          {PLANNER_CATEGORY_LABELS[category]}
          <span className="text-xs font-semibold opacity-70">({active.length})</span>
        </div>
        <button
          type="button"
          onClick={() => onAdd(category)}
          className="bg-white/90 text-gray-700 p-2 rounded-full hover:bg-white transition-colors shadow-sm"
          aria-label={`Add ${PLANNER_CATEGORY_LABELS[category].toLowerCase()}`}
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="p-4 space-y-2">
        {active.length > 0 ? (
          active.map((item) => (
            <TaskRow key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />
          ))
        ) : (
          <p className="text-sm text-gray-400 italic py-2 text-center">
            {PLANNER_CATEGORY_EMPTY_HINT[category]}
          </p>
        )}

        {completed.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setCompletedOpen((o) => !o)}
              className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 w-full py-1"
            >
              {completedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Completed ({completed.length})
            </button>
            {completedOpen && (
              <div className="space-y-2 mt-2">
                {completed.map((item) => (
                  <TaskRow key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export const PlannerTasksView: React.FC<Props> = ({
  items,
  loading,
  onToggle,
  onDelete,
  onAdd,
}) => {
  const grouped = useMemo(() => groupPlannerItemsByCategory(items), [items]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {PLANNER_CATEGORY_ORDER.map((category) => (
        <CategorySection
          key={category}
          category={category}
          items={grouped[category]}
          onToggle={onToggle}
          onDelete={onDelete}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
};
