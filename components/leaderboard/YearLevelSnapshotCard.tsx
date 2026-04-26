import React from 'react';
import { YearLevelSnapshot } from '../../services/dataService';

const borderClass = (accent: 'default' | 'blue' | 'violet') => {
  if (accent === 'blue') return 'border-2 border-blue-200 shadow-md';
  if (accent === 'violet') return 'border-2 border-violet-200 shadow-md';
  return 'border border-gray-100 shadow';
};

export const YearLevelSnapshotCard: React.FC<{
  snap: YearLevelSnapshot;
  borderAccent?: 'default' | 'blue' | 'violet';
}> = ({ snap, borderAccent = 'default' }) => (
  <div className={`bg-white rounded-xl p-5 md:p-6 flex flex-col gap-3 h-full ${borderClass(borderAccent)}`}>
    <div className="text-xl font-bold text-blue-900 tracking-tight md:text-2xl">{snap.gradeLabel}</div>
    {snap.totalStampsAllTime > 0 && (
      <p className="text-sm font-medium text-slate-600 md:text-base">
        {snap.totalStampsAllTime} shared stamps total
      </p>
    )}
    {snap.milestoneLines.length > 0 && (
      <ul className="mt-0.5 list-disc space-y-2.5 border-t border-slate-200/90 pl-5 pt-3 text-sm leading-relaxed text-slate-800 marker:text-blue-500 md:text-[0.95rem]">
        {snap.milestoneLines.map((line, i) => (
          <li key={i}>
            {line.split(/(\d+)/).map((part, j) =>
              /^\d+$/.test(part) ? (
                <strong key={j} className="text-lg font-bold text-blue-900 tabular-nums md:text-xl">
                  {part}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </li>
        ))}
      </ul>
    )}
  </div>
);
