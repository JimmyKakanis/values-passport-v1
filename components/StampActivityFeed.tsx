import React from 'react';
import { Calendar, History, MessageSquare, Stamp, Tag, User } from 'lucide-react';
import { CORE_VALUES } from '../constants';
import { Signature } from '../types';

interface Props {
  signatures: Signature[];
  /** Scrollable list max height (Tailwind class). */
  maxHeight?: string;
}

const formatStampDate = (timestamp: number) => {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
};

const formatStampTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

export const StampActivityFeed: React.FC<Props> = ({
  signatures,
  maxHeight = 'max-h-[32rem]',
}) => {
  if (signatures.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300 mb-3">
          <Stamp size={28} />
        </div>
        <p className="text-gray-600 font-medium">No stamps yet!</p>
        <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
          When teachers award stamps, they will appear here with any comments they leave for you.
        </p>
      </div>
    );
  }

  return (
    <ul className={`space-y-3 overflow-y-auto ${maxHeight} pr-1`}>
      {signatures.map((sig) => {
        const valueDef = CORE_VALUES[sig.value];
        return (
          <li
            key={sig.id}
            className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 hover:bg-white hover:shadow-sm transition-shadow"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">{sig.subject}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${valueDef.color}`}
                  >
                    {sig.value}
                  </span>
                  {sig.subValue && (
                    <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <Tag size={10} /> {sig.subValue}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                  <Calendar size={12} />
                  {formatStampDate(sig.timestamp)}
                </div>
                <div className="text-[10px] text-gray-400">{formatStampTime(sig.timestamp)}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
              <User size={12} className="shrink-0" />
              <span className="font-medium">{sig.teacherName}</span>
            </div>

            {sig.note ? (
              <div className="bg-white border-l-2 border-emerald-400 pl-3 py-2.5 pr-2 rounded-r-lg">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800/80 mb-1 flex items-center gap-1">
                  <MessageSquare size={11} /> Teacher comment
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">&ldquo;{sig.note}&rdquo;</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No comment on this stamp</p>
            )}
          </li>
        );
      })}
    </ul>
  );
};

interface SectionProps {
  signatures: Signature[];
}

/** Full-width stamp history block for the student dashboard. */
export const StampHistorySection: React.FC<SectionProps> = ({ signatures }) => {
  const withComments = signatures.filter((s) => s.note?.trim()).length;

  return (
    <section className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
          <History className="text-emerald-600 w-5 h-5" />
          Stamp history
        </h2>
        {signatures.length > 0 && (
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {signatures.length} stamp{signatures.length === 1 ? '' : 's'}
            {withComments > 0 &&
              ` · ${withComments} with comment${withComments === 1 ? '' : 's'}`}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        All your stamps and teacher comments in one place, newest first.
      </p>
      <StampActivityFeed signatures={signatures} />
    </section>
  );
};
