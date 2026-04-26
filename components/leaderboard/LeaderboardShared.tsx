import React from 'react';
import { CoreValue } from '../../types';
import { LeaderboardSortKey } from '../../services/dataService';

export const getLeaderboardMetricUnit = (filter: LeaderboardSortKey): string => {
  if (filter === 'ACHIEVEMENTS') return 'badges';
  if (filter === 'POP_QUIZ') return 'pts';
  return 'stamps';
};

export const getFilterStyle = (filter: string, isActive: boolean) => {
  let activeClass = 'bg-gray-600 border-gray-600 text-white';
  let inactiveClass = 'bg-white border-gray-200 text-gray-600 hover:border-gray-300';
  let iconInactive = 'text-gray-600';

  switch (filter) {
    case 'ALL':
      activeClass = 'bg-blue-900 border-blue-900 text-white';
      inactiveClass = 'bg-white border-blue-100 text-blue-900 hover:border-blue-300';
      iconInactive = 'text-blue-900';
      break;
    case 'ACHIEVEMENTS':
      activeClass = 'bg-purple-900 border-purple-900 text-white';
      inactiveClass = 'bg-white border-purple-100 text-purple-900 hover:border-purple-300';
      iconInactive = 'text-purple-900';
      break;
    case 'POP_QUIZ':
      activeClass = 'bg-emerald-600 border-emerald-600 text-white';
      inactiveClass = 'bg-white border-emerald-100 text-emerald-900 hover:border-emerald-300';
      iconInactive = 'text-emerald-900';
      break;
    case CoreValue.TRUTH:
      activeClass = 'bg-blue-500 border-blue-500 text-white';
      inactiveClass = 'bg-white border-blue-100 text-blue-600 hover:border-blue-300';
      iconInactive = 'text-blue-500';
      break;
    case CoreValue.LOVE:
      activeClass = 'bg-pink-600 border-pink-600 text-white';
      inactiveClass = 'bg-white border-pink-100 text-pink-600 hover:border-pink-300';
      iconInactive = 'text-pink-600';
      break;
    case CoreValue.PEACE:
      activeClass = 'bg-teal-600 border-teal-600 text-white';
      inactiveClass = 'bg-white border-teal-100 text-teal-600 hover:border-teal-300';
      iconInactive = 'text-teal-600';
      break;
    case CoreValue.RIGHT_CONDUCT:
      activeClass = 'bg-emerald-600 border-emerald-600 text-white';
      inactiveClass = 'bg-white border-emerald-100 text-emerald-600 hover:border-emerald-300';
      iconInactive = 'text-emerald-600';
      break;
    case CoreValue.NON_VIOLENCE:
      activeClass = 'bg-orange-500 border-orange-500 text-white';
      inactiveClass = 'bg-white border-orange-100 text-orange-600 hover:border-orange-300';
      iconInactive = 'text-orange-500';
      break;
  }

  return {
    container: isActive
      ? `${activeClass} shadow-md transform scale-105`
      : `${inactiveClass} hover:shadow-sm`,
    icon: isActive ? 'text-white' : iconInactive,
  };
};

export const FilterCard: React.FC<{
  id: string;
  title: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ id, title, icon, isActive, onClick }) => {
  const styles = getFilterStyle(id, isActive);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg border transition-all flex items-center justify-center gap-2 group w-full ${styles.container}`}
    >
      <div className="flex-shrink-0">
        {React.cloneElement(icon as React.ReactElement, {
          size: 16,
          className: styles.icon,
        })}
      </div>
      <div className="text-left min-w-0">
        <h3 className="font-bold text-xs truncate leading-tight">{title}</h3>
      </div>
    </button>
  );
};
