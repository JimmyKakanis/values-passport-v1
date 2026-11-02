import React, { useState } from 'react';
import {
  Calendar,
  Check,
  Edit2,
  EyeOff,
  Loader2,
  Tag,
  User,
  Wand2,
  X,
} from 'lucide-react';
import { CORE_VALUES } from '../../constants';
import { Signature } from '../../types';
import {
  formatCommentDate,
  getCommentNominationKind,
} from '../../utils/familyRecapEmail';

interface Props {
  sig: Signature;
  onSaveNote: (sig: Signature, newNote: string) => Promise<boolean>;
  onExcludeFromEmail: (sigId: string) => void;
}

export const FamilyRecapCommentItem: React.FC<Props> = ({
  sig,
  onSaveNote,
  onExcludeFromEmail,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftNote, setDraftNote] = useState(sig.note || '');
  const [saving, setSaving] = useState(false);

  const valueDef = CORE_VALUES[sig.value];
  const nominationKind = getCommentNominationKind(sig);
  const hasNominationPrefix = /^(self-advocacy|nominated by [^:]+)\s*:\s*/i.test(
    draftNote.trim()
  );

  const startEditing = () => {
    setDraftNote(sig.note || '');
    setIsEditing(true);
  };

  const handleStripPrefix = () => {
    const stripped = draftNote
      .trim()
      .replace(/^(self-advocacy|nominated by [^:]+)\s*:\s*/i, '');
    if (stripped) {
      setDraftNote(stripped.charAt(0).toUpperCase() + stripped.slice(1));
    }
  };

  const handleSave = async () => {
    const trimmed = draftNote.trim();
    if (!trimmed) return;
    if (trimmed === (sig.note || '').trim()) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    const ok = await onSaveNote(sig, trimmed);
    setSaving(false);
    if (ok) {
      setIsEditing(false);
    }
  };

  return (
    <li className="group rounded-xl border border-gray-100 bg-gray-50/80 p-4 hover:bg-white hover:border-emerald-200 transition-all">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{sig.subject}</span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded border ${
              valueDef?.color || 'bg-gray-100 text-gray-800'
            }`}
          >
            {sig.value}
          </span>
          {sig.subValue && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-100">
              <Tag size={10} /> {sig.subValue}
            </span>
          )}
          {nominationKind === 'SELF' && (
            <span className="text-[10px] font-bold uppercase tracking-wide bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
              Self-Nominated (Max 1)
            </span>
          )}
          {nominationKind === 'PEER' && (
            <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
              Peer-Nominated (Max 2)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar size={12} />
            {formatCommentDate(sig.timestamp)}
          </span>
          {!isEditing && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={startEditing}
                className="px-2 py-1 rounded-md text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-colors"
                title="Quickly edit this comment"
              >
                <Edit2 size={12} /> Edit
              </button>
              <button
                type="button"
                onClick={() => onExcludeFromEmail(sig.id)}
                className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Hide this comment from the email (swaps in next newest comment)"
              >
                <EyeOff size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
        <User size={12} className="text-emerald-700" />
        <span className="font-semibold">{sig.teacherName}</span>
      </div>

      {isEditing ? (
        <div className="bg-white border-2 border-emerald-500 p-3 rounded-xl space-y-2.5 shadow-sm">
          <textarea
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            rows={3}
            autoFocus
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              } else if (e.key === 'Escape') {
                setIsEditing(false);
              }
            }}
            className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {hasNominationPrefix && (
                <button
                  type="button"
                  onClick={handleStripPrefix}
                  className="text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-md flex items-center gap-1"
                >
                  <Wand2 size={12} /> Strip nomination prefix
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 flex items-center gap-1"
              >
                <X size={13} /> Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !draftNote.trim()}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1 shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Save Comment
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={startEditing}
          title="Click to edit comment"
          className="bg-white border-l-4 border-emerald-500 pl-3.5 py-2.5 pr-3 rounded-r-lg shadow-sm cursor-pointer hover:bg-emerald-50/30 transition-colors"
        >
          <p className="text-sm text-gray-700 leading-relaxed">
            &ldquo;{(sig.note || '').trim()}&rdquo;
          </p>
        </div>
      )}
    </li>
  );
};
