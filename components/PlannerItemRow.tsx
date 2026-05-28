import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import type { PlannerItem } from '../types';
import {
  formatPlannerDueLabel,
  PLANNER_CATEGORY_DOT,
  PLANNER_CATEGORY_TEXT,
  PLANNER_DUE_TONE_CLASSES,
} from '../utils/plannerDisplay';

interface Props {
  item: PlannerItem;
  onToggle: (item: PlannerItem) => void;
  compact?: boolean;
  showCategory?: boolean;
}

export const PlannerItemRow: React.FC<Props> = ({
  item,
  onToggle,
  compact = false,
  showCategory = true,
}) => {
  const due = formatPlannerDueLabel(item.dueDate);
  const iconSize = compact ? 18 : 20;

  return (
    <>
      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-label={item.isCompleted ? `Mark "${item.title}" incomplete` : `Mark "${item.title}" complete`}
        className={`shrink-0 transition-colors ${item.isCompleted ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-400'}`}
      >
        {item.isCompleted ? (
          <CheckCircle2 size={iconSize} className={compact ? 'mt-0.5' : 'mt-0.5'} />
        ) : (
          <Circle size={iconSize} className={compact ? 'mt-0.5' : 'mt-0.5'} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`font-bold leading-tight truncate ${
            compact ? 'text-xs text-gray-800' : 'text-sm text-gray-800'
          } ${item.isCompleted ? 'line-through text-gray-400' : ''}`}
        >
          {item.title}
        </p>
        <div className={`flex flex-wrap items-center gap-1.5 ${compact ? 'mt-1' : 'mt-1.5'}`}>
          {!item.isCompleted && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${PLANNER_DUE_TONE_CLASSES[due.tone]}`}
            >
              <Clock size={10} className="opacity-70" />
              {due.label}
            </span>
          )}
          {showCategory && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                item.isCompleted ? 'text-gray-300' : PLANNER_CATEGORY_TEXT[item.category]
              }`}
            >
              {compact ? (
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full align-middle mr-1 ${PLANNER_CATEGORY_DOT[item.category]}`}
                  aria-hidden
                />
              ) : null}
              {item.category}
            </span>
          )}
        </div>
      </div>
    </>
  );
};
