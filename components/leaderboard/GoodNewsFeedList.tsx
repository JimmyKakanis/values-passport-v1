import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Stamp, Award, Building2, Users, Sparkles } from 'lucide-react';
import { CORE_VALUES } from '../../constants';
import type { GoodNewsFeedItem } from '../../services/dataService';

const timeBucket = (ts: number): string => {
  const d = new Date(ts);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'd MMM');
};

export const GoodNewsFeedList: React.FC<{ items: GoodNewsFeedItem[] }> = ({ items }) => {
  if (items.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl p-6 bg-gray-50/80">
        Highlights will show up here as teachers record values, achievements are claimed, and shared milestones add up.
        Check back soon.
      </p>
    );
  }
  return (
    <ul className="max-h-[22rem] overflow-y-auto space-y-3 pr-1 border border-gray-200 rounded-xl bg-gradient-to-b from-white to-slate-50/80 p-3 shadow-sm">
      {items.map((item) => {
        const d = item.detail;
        if (d.kind === 'schoolMilestone' || d.kind === 'yearMilestone' || d.kind === 'funStat') {
          const bar =
            d.kind === 'schoolMilestone'
              ? 'bg-sky-500'
              : d.kind === 'yearMilestone'
                ? 'bg-violet-500'
                : 'bg-indigo-500';
          const lead =
            d.kind === 'schoolMilestone'
              ? 'Whole school'
              : d.kind === 'yearMilestone'
                ? d.yearLabel
                : 'Fun stat';
          const endTag =
            d.kind === 'schoolMilestone' ? (
              <span className="text-sky-800 flex items-center gap-0.5">
                <Building2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                School story
              </span>
            ) : d.kind === 'yearMilestone' ? (
              <span className="text-violet-800 flex items-center gap-0.5">
                <Users className="w-3.5 h-3.5" strokeWidth={2.5} />
                Your year
              </span>
            ) : (
              <span className="text-indigo-800 flex items-center gap-0.5">
                <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
                Snapshot
              </span>
            );
          return (
            <li
              key={item.id}
              className="rounded-lg border border-gray-100 bg-white/90 shadow-sm overflow-hidden flex gap-0"
            >
              <div className={`w-1 shrink-0 ${bar}`} aria-hidden />
              <div className="flex-1 min-w-0 p-3">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{lead}</span>
                  <span className="inline-flex items-center gap-0.5 ml-auto text-[10px] font-bold text-slate-500">
                    {endTag}
                  </span>
                </div>
                <p className="text-sm text-slate-800 leading-snug">{item.line}</p>
              </div>
            </li>
          );
        }

        const bucket = timeBucket(item.timestamp);
        const isStamp = d.kind === 'stamp';

        return (
          <li
            key={item.id}
            className="rounded-lg border border-gray-100 bg-white/90 shadow-sm overflow-hidden flex gap-0"
          >
            <div
              className={`w-1 shrink-0 ${isStamp ? 'bg-emerald-500' : 'bg-amber-500'}`}
              aria-hidden
            />
            <div className="flex-1 min-w-0 p-3">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 tabular-nums">
                  {bucket}
                </span>
                {d.kind === 'stamp' ? (
                  <>
                    <span
                      className={`text-[11px] font-semibold px-2 py-1 rounded-lg border max-w-[min(100%,20rem)] leading-snug ${CORE_VALUES[d.value].color}`}
                      title={d.livedAsLabel}
                    >
                      {d.livedAsLabel}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      {d.yearLabel}
                    </span>
                    <span className="text-[11px] text-slate-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full max-w-[12rem] truncate">
                      {d.place}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-semibold text-slate-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                      {d.yearLabel}
                    </span>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full max-w-[14rem] truncate">
                      {d.achievementTitle}
                    </span>
                  </>
                )}
                <span className="inline-flex items-center gap-0.5 ml-auto text-[10px] font-bold text-slate-500">
                  {isStamp ? (
                    <>
                      <Stamp className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
                      <span className="text-emerald-700">Teacher stamp</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.5} />
                      <span className="text-amber-800">Achievement</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-sm text-slate-800 leading-snug">{item.line}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
