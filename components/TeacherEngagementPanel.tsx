import React, { useEffect, useMemo, useRef, useState } from 'react';
import Confetti from 'react-confetti';
import { ChevronDown, ChevronUp, Sparkles, Heart } from 'lucide-react';
import { Signature, Teacher } from '../types';
import {
  TEACHER_ENGAGEMENT_BADGES,
  computeTeacherEngagementStats,
  getUnlockedTeacherBadgeIds,
  pickDailyNudge,
  getWeeklyThemeLine,
  pickReflectionPrompt,
  markTeacherBadgeToastSeen,
  filterNewBadgeIdsForToast,
} from '../services/teacherEngagement';
import { getValuesIntegrationFocus } from '../valuesIntegrationCalendar2026';

const INIT_KEY_PREFIX = 'vp_teacher_engagement_init_v1:';

interface Props {
  teacher: Teacher | null;
  signatures: Signature[];
  /** False until the first signatures fetch for the current teacher has finished. */
  dataReady: boolean;
}

export const TeacherEngagementPanel: React.FC<Props> = ({ teacher, signatures, dataReady }) => {
  const [open, setOpen] = useState(true);
  const [reflectOpen, setReflectOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [win, setWin] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 800, h: 400 });
  const celebratedRef = useRef(false);

  const teacherKey = teacher?.id || teacher?.email || teacher?.name || '';

  useEffect(() => {
    const onR = () => setWin({ width: window.innerWidth, h: window.innerHeight });
    onR();
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  const stats = useMemo(
    () => computeTeacherEngagementStats(signatures, new Date()),
    [signatures]
  );

  const unlockedIds = useMemo(() => getUnlockedTeacherBadgeIds(stats), [stats]);
  const unlockedKey = useMemo(() => [...unlockedIds].sort().join(','), [unlockedIds]);

  const integrationFocus = useMemo(() => getValuesIntegrationFocus(new Date()), [signatures]);

  const dailyLine = useMemo(
    () =>
      teacherKey
        ? pickDailyNudge(teacherKey, new Date(), {
            compactSchoolFocus: !!integrationFocus,
          })
        : '',
    [teacherKey, signatures, integrationFocus]
  );
  const weeklyLine = useMemo(
    () => (integrationFocus ? '' : getWeeklyThemeLine(new Date())),
    [integrationFocus, signatures]
  );

  const weekActivityLine = useMemo(() => {
    const u = stats.impactUniqueStudents7d;
    const d = stats.activeSchoolDaysThisWeek;
    const n = stats.impactNewStudentRelationships7d;
    if (u === 0 && d === 0) {
      return 'No stamps in the last week yet—your reach and weekday counts will show here when you start.';
    }
    const rhythm = d >= 3 ? 'Solid rhythm.' : 'Gentle goal: three or more weekdays.';
    const days = `${d} weekday${d === 1 ? '' : 's'} with stamps (Mon–Fri)`;
    if (u > 0) {
      let reach = `${u} student${u === 1 ? '' : 's'} reached in the last 7 days`;
      if (n > 0) {
        reach += ` (${n} got their first stamp from you in that window)`;
      }
      return `${reach} · ${days}. ${rhythm}`;
    }
    return `${days}. ${rhythm}`;
  }, [stats]);
  const reflectLine = useMemo(
    () => (teacherKey ? pickReflectionPrompt(teacherKey) : ''),
    [teacherKey, signatures]
  );

  useEffect(() => {
    if (!teacherKey || !dataReady) return;
    const initKey = INIT_KEY_PREFIX + teacherKey;
    if (!localStorage.getItem(initKey)) {
      unlockedIds.forEach((id) => markTeacherBadgeToastSeen(teacherKey, id));
      localStorage.setItem(initKey, '1');
      return;
    }
    const fresh = filterNewBadgeIdsForToast(teacherKey, unlockedIds);
    if (fresh.length === 0 || celebratedRef.current) return;
    celebratedRef.current = true;
    setShowConfetti(true);
    fresh.forEach((id) => markTeacherBadgeToastSeen(teacherKey, id));
    const t = window.setTimeout(() => {
      setShowConfetti(false);
      celebratedRef.current = false;
    }, 3800);
    return () => window.clearTimeout(t);
  }, [teacherKey, dataReady, unlockedKey, unlockedIds]);

  if (!teacher?.name) return null;

  return (
    <div className="relative border border-emerald-100 rounded-xl bg-gradient-to-br from-emerald-50/90 to-white shadow-sm overflow-hidden">
      {integrationFocus && (
        <div className="px-4 py-3 border-b border-indigo-100 bg-indigo-50/90 text-indigo-950">
          <div className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 mb-1">
            School values integration (2026)
          </div>
          {integrationFocus.label && (
            <div className="text-xs text-indigo-700/90 mb-1">{integrationFocus.label}</div>
          )}
          <div className="font-bold text-base">
            {integrationFocus.coreValue} lived as {integrationFocus.subValueLabel}
          </div>
          <p className="mt-2 text-sm italic text-indigo-900/95">{`"${integrationFocus.quote}"`}</p>
          {integrationFocus.events && (
            <p className="mt-2 text-xs text-indigo-800/85">{integrationFocus.events}</p>
          )}
        </div>
      )}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[80]">
          <Confetti
            width={win.width}
            height={win.h}
            recycle={false}
            numberOfPieces={120}
            gravity={0.2}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-emerald-50/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-bold text-emerald-900 truncate">Your week & milestones</span>
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-emerald-600 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-emerald-600 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-emerald-100/80">
          <div className="pt-3 space-y-3 text-sm text-gray-700">
            {dailyLine && (
              <p>
                <span className="font-semibold text-emerald-800">Today: </span>
                {dailyLine}
              </p>
            )}
            {weeklyLine && <p className="text-gray-600">{weeklyLine}</p>}
            <p className="text-gray-600 border-t border-emerald-100/70 pt-3">
              <span className="font-semibold text-emerald-800">This week: </span>
              {weekActivityLine}
            </p>
            {stats.isComebackEligible && (
              <p className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-amber-900 text-sm">
                Welcome back — your next stamp counts double toward your personal weekly engagement goal
                (celebration only; student points are unchanged).
              </p>
            )}
            {stats.valuesVarietyThisWeek && (
              <p className="text-emerald-700 text-sm font-medium">
                Nice — you brought a fresh value on each day you stamped this week.
              </p>
            )}
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Badges</div>
            <div className="flex flex-wrap gap-2">
              {TEACHER_ENGAGEMENT_BADGES.map((b) => {
                const on = unlockedIds.includes(b.id);
                return (
                  <span
                    key={b.id}
                    title={b.description}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      on
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                        : 'bg-gray-50 text-gray-400 border-gray-200'
                    }`}
                  >
                    {on ? '✓' : '○'} {b.title}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setReflectOpen((r) => !r)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
            >
              <Heart className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-medium text-gray-700">Food for thought</span>
              <span className="ml-auto text-gray-400">{reflectOpen ? '−' : '+'}</span>
            </button>
            {reflectOpen && (
              <div className="px-3 pb-3 text-sm text-gray-600 italic border-t border-gray-50">
                {reflectLine}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
