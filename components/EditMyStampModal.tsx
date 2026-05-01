import React, { useEffect, useState } from 'react';
import { CoreValue, Signature, Subject } from '../types';
import { SUBJECTS, CORE_VALUES } from '../constants';
import type { SignatureTeacherEditable } from '../services/dataService';
import { X } from 'lucide-react';

export interface EditMyStampModalProps {
  signature: Signature | null;
  /** Logged-in user is admin and may correct any teacher's stamp — show contextual notice. */
  viewerMayEditAnyStamp?: boolean;
  errorText: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (updates: SignatureTeacherEditable) => Promise<boolean>;
}

export const EditMyStampModal: React.FC<EditMyStampModalProps> = ({
  signature,
  viewerMayEditAnyStamp,
  errorText,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [subject, setSubject] = useState<Subject>(SUBJECTS[0]!);
  const [value, setValue] = useState<CoreValue>(CoreValue.TRUTH);
  const [subValue, setSubValue] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!signature) return;
    setSubject(signature.subject);
    setValue(signature.value);
    setSubValue(signature.subValue?.trim() ? signature.subValue : '');
    setNote(signature.note?.trim() ? signature.note : '');
  }, [signature]);

  if (!signature) return null;

  const subOptionsRaw = CORE_VALUES[value].subValues;
  const subOptions =
    subValue && !subOptionsRaw.includes(subValue)
      ? [...subOptionsRaw, subValue]
      : subOptionsRaw;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      subject,
      value,
      subValue,
      note,
    });
  };

  const subjectsForSelect = (SUBJECTS as readonly string[]).includes(subject)
    ? SUBJECTS
    : [...SUBJECTS, subject];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-stamp-title"
    >
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 id="edit-stamp-title" className="text-lg font-bold text-gray-900">
            Edit stamp
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            You can change subject, value, tag, and note. The student and time of the award stay the same.
          </p>
          {viewerMayEditAnyStamp && (
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              You are signed in as an administrator. Saving changes updates this stamp regardless of which teacher originally
              awarded it — the credited teacher name is not changed unless you rename it separately in Admin.
            </p>
          )}

          {errorText && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorText}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as Subject)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              disabled={isSubmitting}
            >
              {subjectsForSelect.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
              Value
            </label>
            <select
              value={value}
              onChange={(e) => {
                const v = e.target.value as CoreValue;
                setValue(v);
                setSubValue('');
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              disabled={isSubmitting}
            >
              {(Object.values(CoreValue) as CoreValue[]).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
              Tag (optional)
            </label>
            <select
              value={subValue}
              onChange={(e) => setSubValue(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              disabled={isSubmitting}
            >
              <option value="">None</option>
              {subOptions.map((sv) => (
                <option key={sv} value={sv}>
                  {sv}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y min-h-[5rem]"
              disabled={isSubmitting}
              placeholder="Optional message"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
