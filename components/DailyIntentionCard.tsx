import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, Loader2, Lock, Pencil, Save, Sunrise, X } from 'lucide-react';
import { CoreValue } from '../types';
import { CORE_VALUES } from '../constants';
import { subscribeToDailyIntentions, upsertDailyIntention } from '../services/dataService';
import { getDateKey, INTENTION_TEXT_MAX } from '../services/studentEngagement';
import { getValuesIntegrationFocus } from '../valuesIntegrationCalendar2026';

interface Props {
  studentId: string;
}

function defaultSubValueForValue(
  value: CoreValue,
  integrationSubLabel?: string
): string {
  const subs = CORE_VALUES[value].subValues;
  if (integrationSubLabel) {
    const match = subs.find(
      (s) =>
        s.toLowerCase() === integrationSubLabel.toLowerCase() ||
        integrationSubLabel.toLowerCase().includes(s.toLowerCase()) ||
        s.toLowerCase().includes(integrationSubLabel.toLowerCase())
    );
    if (match) return match;
  }
  return subs[0] ?? '';
}

export const DailyIntentionCard: React.FC<Props> = ({ studentId }) => {
  const [intentions, setIntentions] = useState<
    { dateKey: string; text: string; coreValue?: CoreValue; subValue?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [selectedValue, setSelectedValue] = useState<CoreValue | ''>('');
  const [selectedSubValue, setSelectedSubValue] = useState('');
  /** Sub-value chips only appear after the student taps a main value this edit session. */
  const [hasPickedMainValue, setHasPickedMainValue] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayKey = getDateKey(new Date());
  const integrationFocus = getValuesIntegrationFocus(new Date());

  const selectedValueDef = selectedValue ? CORE_VALUES[selectedValue] : null;

  useEffect(() => {
    const unsub = subscribeToDailyIntentions(studentId, (items) => {
      setIntentions(
        items.map((i) => ({
          dateKey: i.dateKey,
          text: i.text,
          coreValue: i.coreValue,
          subValue: i.subValue,
        }))
      );
      setLoading(false);
    });
    return () => unsub();
  }, [studentId]);

  const todayIntention = useMemo(
    () => intentions.find((i) => i.dateKey === todayKey),
    [intentions, todayKey]
  );

  const startEdit = () => {
    setDraft(todayIntention?.text ?? '');
    if (todayIntention?.coreValue) {
      setSelectedValue(todayIntention.coreValue);
      setSelectedSubValue(
        todayIntention.subValue ??
          defaultSubValueForValue(todayIntention.coreValue, integrationFocus?.subValueLabel)
      );
      setHasPickedMainValue(true);
    } else {
      setSelectedValue('');
      setSelectedSubValue('');
      setHasPickedMainValue(false);
    }
    setEditing(true);
    setError(null);
  };

  const handleSelectValue = (value: CoreValue) => {
    if (selectedValue === value) {
      setSelectedValue('');
      setSelectedSubValue('');
      setHasPickedMainValue(false);
      return;
    }
    setHasPickedMainValue(true);
    setSelectedValue(value);
    setSelectedSubValue(
      defaultSubValueForValue(
        value,
        integrationFocus?.coreValue === value ? integrationFocus.subValueLabel : undefined
      )
    );
  };

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError('Please write your intention for today.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await upsertDailyIntention(
      studentId,
      todayKey,
      trimmed,
      selectedValue || undefined,
      selectedValue && selectedSubValue ? selectedSubValue : undefined
    );
    setSaving(false);
    if (result.ok) {
      setEditing(false);
    } else {
      setError(result.userMessage);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/60 p-8 flex justify-center shadow-sm">
        <Loader2 className="w-6 h-6 text-amber-700 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 via-orange-50/40 to-amber-100/50 p-4 md:p-6 shadow-md shadow-amber-900/5">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-300/25 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-orange-200/30 blur-2xl"
        aria-hidden
      />

      <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm ring-1 ring-amber-200/60">
            <Sunrise className="h-6 w-6 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-amber-950 tracking-tight">
              Today&apos;s intention
            </h2>
            <p className="text-xs text-amber-800/75">Your private focus for the day</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-white/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900/70">
          <Lock size={10} className="shrink-0" /> Private
        </span>
      </div>

      {editing ? (
        <div className="relative space-y-3 rounded-xl border border-amber-100/90 bg-white/80 p-4 md:p-5 shadow-sm">
          <p className="text-sm text-amber-950/90">
            What do you want to focus on today? Pick a value and sub-value if you like, then write
            your intention.
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.values(CORE_VALUES).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => handleSelectValue(v.id)}
                className={`text-xs font-bold px-2 py-1 rounded-full border transition-colors ${
                  selectedValue === v.id
                    ? `${v.color} border-transparent`
                    : 'bg-white/60 text-gray-600 border-amber-200 hover:bg-white'
                }`}
              >
                {v.id}
              </button>
            ))}
          </div>

          {hasPickedMainValue && selectedValueDef && (
            <div className="rounded-lg border border-amber-200/80 bg-white/70 p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800/90">
                Sub-value for {selectedValueDef.id}
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {selectedValueDef.subValues.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedSubValue(sub)}
                    className={`text-xs font-medium px-2 py-1 rounded-lg border transition-colors ${
                      selectedSubValue === sub
                        ? 'bg-amber-100 text-amber-950 border-amber-400'
                        : 'bg-white text-gray-600 border-amber-100 hover:border-amber-300 hover:bg-amber-50/80'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, INTENTION_TEXT_MAX))}
            rows={3}
            className="w-full rounded-lg border border-amber-200 bg-white p-3 text-sm text-gray-800 focus:ring-2 focus:ring-amber-400 outline-none"
            placeholder={
              selectedSubValue
                ? `e.g. Today I will practise ${selectedSubValue} by...`
                : 'e.g. Listen carefully in class and encourage a friend...'
            }
            maxLength={INTENTION_TEXT_MAX}
          />
          <div className="flex justify-between text-xs text-amber-800/70">
            <span>{draft.length}/{INTENTION_TEXT_MAX}</span>
            {error && <span className="text-red-600 font-medium">{error}</span>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="flex items-center gap-1 text-amber-900/80 hover:text-amber-950 px-3 py-2 text-sm font-medium"
            >
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      ) : todayIntention ? (
        <div className="relative space-y-4">
          <div className="rounded-xl border border-amber-100/90 bg-white/85 p-4 md:p-5 shadow-sm ring-1 ring-white/80">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {todayIntention.coreValue && (
                  <span
                    className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full shadow-sm ${CORE_VALUES[todayIntention.coreValue].color}`}
                  >
                    {todayIntention.coreValue}
                  </span>
                )}
                {todayIntention.subValue && (
                  <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-950 border border-amber-200/80">
                    {todayIntention.subValue}
                  </span>
                )}
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700/90">
                <CheckCircle2 size={12} className="text-emerald-600" />
                Set for today
              </span>
            </div>
            <p className="text-base md:text-lg text-amber-950 font-medium leading-relaxed border-l-[3px] border-amber-400/80 pl-4">
              {todayIntention.text}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-amber-950 shadow-sm transition-colors hover:bg-amber-400"
            >
              <Pencil size={15} /> Edit
            </button>
            <Link
              to="/planner"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/90 bg-white/70 px-4 py-2 text-sm font-bold text-amber-900 transition-colors hover:bg-white hover:border-amber-300"
            >
              <Calendar size={15} /> View on calendar
            </Link>
          </div>
        </div>
      ) : (
        <div className="relative space-y-4 rounded-xl border border-dashed border-amber-300/70 bg-white/50 p-4 md:p-5">
          <p className="text-sm text-amber-950/90 leading-relaxed">
            Start your day with a short intention. Only you can see it — teachers do not.
          </p>
          {integrationFocus && (
            <p className="rounded-lg bg-amber-100/50 px-3 py-2 text-xs text-amber-900/85">
              <span className="font-semibold">This week at school:</span>{' '}
              {integrationFocus.subValueLabel} ({integrationFocus.coreValue})
            </p>
          )}
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-amber-950 shadow-md shadow-amber-900/10 transition-colors hover:bg-amber-400"
          >
            <Sunrise size={16} />
            Set today&apos;s intention
          </button>
        </div>
      )}
    </div>
  );
};
