import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  FileText,
  Mail,
  MessageSquare,
  Reply,
  RotateCcw,
  Sparkles,
  Stamp,
} from 'lucide-react';
import { CORE_VALUES, SCHOOL_LOGO_URL } from '../../constants';
import { defaultAvatarUrlForName, resolveStudentAvatarUrl } from '../../services/avatarUrl';
import { Signature } from '../../types';
import {
  getRecapTierLabel,
  MAX_PEER_NOMINATED_COMMENTS,
  MAX_RECAP_COMMENTS,
  MAX_SELF_NOMINATED_COMMENTS,
  StudentRecapSummary,
} from '../../utils/familyRecapEmail';
import { Logo } from '../Logo';
import { FamilyRecapCommentItem } from './FamilyRecapCommentItem';

interface Props {
  summary: StudentRecapSummary;
  includeStampCounts: boolean;
  excludedCount: number;
  onSaveNote: (sig: Signature, newNote: string) => Promise<boolean>;
  onExcludeComment: (sigId: string) => void;
  onResetExcluded: () => void;
}

export const FamilyRecapEmailCard: React.FC<Props> = ({
  summary,
  includeStampCounts,
  excludedCount,
  onSaveNote,
  onExcludeComment,
  onResetExcluded,
}) => {
  const [viewMode, setViewMode] = useState<'STYLED' | 'PLAIN'>('STYLED');
  const [copiedKind, setCopiedKind] = useState<'STYLED' | 'PLAIN' | null>(null);
  const [logoError, setLogoError] = useState(false);

  const {
    student,
    firstName,
    parentSalutation,
    parentEmail,
    senderEmail,
    replyToEmail,
    tier,
    effectiveTier,
    totalStamps,
    valueCounts,
    subjects,
    comments,
    allCommentsNewestFirst,
    subjectLine,
    introParagraphs,
    closingParagraphs,
    plainText,
    inlineHtml,
  } = summary;

  const showCountsInSnapshot = includeStampCounts && effectiveTier !== 'LIGHT';

  const handleCopyStyled = async () => {
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        const htmlBlob = new Blob([inlineHtml], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      setCopiedKind('STYLED');
      setTimeout(() => setCopiedKind(null), 2200);
    } catch {
      await navigator.clipboard.writeText(plainText);
      setCopiedKind('STYLED');
      setTimeout(() => setCopiedKind(null), 2200);
    }
  };

  const handleCopyPlain = async () => {
    await navigator.clipboard.writeText(plainText);
    setCopiedKind('PLAIN');
    setTimeout(() => setCopiedKind(null), 2200);
  };

  const mailtoHref = `mailto:${encodeURIComponent(parentEmail)}?subject=${encodeURIComponent(
    subjectLine
  )}`;

  const tierBadgeClass =
    tier === 'HIGH'
      ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
      : tier === 'MODERATE'
        ? 'bg-blue-100 text-blue-900 border-blue-200'
        : tier === 'LIGHT'
          ? 'bg-amber-100 text-amber-900 border-amber-200'
          : 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <div className="space-y-4">
      {/* Action & View Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setViewMode('STYLED')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${
              viewMode === 'STYLED'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles size={14} /> Styled App Email
          </button>
          <button
            type="button"
            onClick={() => setViewMode('PLAIN')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${
              viewMode === 'PLAIN'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText size={14} /> Plain Text
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyStyled}
            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-sm transition-colors"
            title="Copy rich formatted email to paste directly into Outlook, Gmail, or Word"
          >
            {copiedKind === 'STYLED' ? <Check size={14} /> : <Copy size={14} />}
            {copiedKind === 'STYLED' ? 'Copied Styled Email!' : 'Copy Styled Email'}
          </button>
          <button
            type="button"
            onClick={handleCopyPlain}
            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 flex items-center gap-1.5 transition-colors"
          >
            {copiedKind === 'PLAIN' ? <Check size={14} /> : <FileText size={14} />}
            {copiedKind === 'PLAIN' ? 'Copied Text!' : 'Copy Plain Text'}
          </button>
          {parentEmail && (
            <a
              href={mailtoHref}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5 transition-colors"
              title={`Open mail client to ${parentEmail}`}
            >
              <ExternalLink size={14} /> Open Mail Client
            </a>
          )}
        </div>
      </div>

      {/* Email Envelope Metadata */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 pb-2 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              <strong className="text-gray-500">From:</strong>{' '}
              <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-mono">
                {senderEmail}
              </code>
            </span>
            <span className="flex items-center gap-1">
              <Reply size={13} className="text-emerald-700" />
              <strong className="text-gray-500">Reply-To (Secondary):</strong>{' '}
              <code className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded font-mono font-semibold">
                {replyToEmail}
              </code>
            </span>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${tierBadgeClass}`}>
            {getRecapTierLabel(tier)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-gray-700 pt-0.5">
          <Mail size={16} className="text-emerald-700 shrink-0" />
          <span className="font-semibold text-gray-500">To:</span>
          <span className="font-bold text-gray-900">{parentSalutation}</span>
          {parentEmail ? (
            <span className="text-xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-mono border border-emerald-200">
              {parentEmail}
            </span>
          ) : (
            <span className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-medium border border-amber-200">
              No parent email on file
            </span>
          )}
        </div>

        <div className="flex items-start gap-2 pt-1 border-t border-gray-100">
          <span className="font-semibold text-gray-500 shrink-0">Subject:</span>
          <span className="font-bold text-gray-900">{subjectLine}</span>
        </div>
      </div>

      {viewMode === 'PLAIN' ? (
        <pre className="bg-gray-900 text-gray-100 p-6 rounded-2xl text-xs sm:text-sm font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto border border-gray-800 shadow-inner">
          {plainText}
        </pre>
      ) : (
        /* Styled App-Like Email Canvas */
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-emerald-800 text-white px-6 py-5 border-b-4 border-yellow-400 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="bg-white p-1.5 rounded-full shadow-md h-12 w-12 flex items-center justify-center shrink-0 overflow-hidden">
                {SCHOOL_LOGO_URL && !logoError ? (
                  <img
                    src={SCHOOL_LOGO_URL}
                    alt="Sathya Sai College"
                    className="h-full w-full object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <Logo className="text-emerald-800" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg tracking-tight leading-tight text-white">
                  Sathya Sai College
                </h3>
                <p className="text-xs text-emerald-200 font-semibold uppercase tracking-wider">
                  Values Passport &bull; 2026 Year-in-Review
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-emerald-900/60 px-3.5 py-2 rounded-xl border border-emerald-700">
              <img
                src={resolveStudentAvatarUrl(student)}
                alt={student.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = defaultAvatarUrlForName(student.name);
                }}
                className="w-10 h-10 rounded-full bg-white border-2 border-yellow-400 object-cover"
              />
              <div className="text-right">
                <div className="text-sm font-bold text-white leading-tight">{student.name}</div>
                <div className="text-xs text-emerald-200 font-medium">{student.grade}</div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6 text-gray-800">
            <div className="space-y-3 text-sm sm:text-base leading-relaxed">
              <p className="font-semibold text-gray-900">Dear {parentSalutation},</p>
              {introParagraphs.map((paragraph, idx) => (
                <p key={idx} className="text-gray-700">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Values Passport Snapshot Box */}
            <div className="bg-gradient-to-br from-emerald-50/70 via-white to-blue-50/50 rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <Stamp size={16} className="text-emerald-600" />
                  {firstName}’s 2026 Values Passport Snapshot
                </h4>
                {showCountsInSnapshot && (
                  <span className="bg-emerald-800 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-sm">
                    {totalStamps} Total Stamp{totalStamps === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {valueCounts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {valueCounts.map(({ value, count }) => {
                    const def = CORE_VALUES[value];
                    return (
                      <span
                        key={value}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border shadow-sm flex items-center gap-1.5 ${
                          def?.color || 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}
                      >
                        <span>{value}</span>
                        {showCountsInSnapshot && (
                          <span className="bg-white/80 px-1.5 py-0.2 rounded-full text-[11px] font-extrabold">
                            {count}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No stamps recorded yet for 2026.</p>
              )}

              {subjects.length > 0 && (
                <div className="pt-2 border-t border-emerald-100/80">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
                    Subjects &amp; School Settings Recognised ({subjects.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {subjects.map((subj) => (
                      <span
                        key={subj}
                        className="text-xs font-semibold bg-white text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200"
                      >
                        {subj}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Teacher Comments Section */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-base font-bold text-blue-900 flex items-center gap-2">
                    <MessageSquare size={18} className="text-emerald-600" />
                    Highlights from Teacher Comments ({comments.length}
                    {allCommentsNewestFirst.length > comments.length
                      ? ` of ${allCommentsNewestFirst.length}`
                      : ''}
                    )
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Newest first &bull; Max {MAX_RECAP_COMMENTS} comments &bull; Max{' '}
                    {MAX_SELF_NOMINATED_COMMENTS} self-nominated &amp; {MAX_PEER_NOMINATED_COMMENTS}{' '}
                    peer-nominated &bull; Click any comment to edit
                  </p>
                </div>

                {excludedCount > 0 && (
                  <button
                    type="button"
                    onClick={onResetExcluded}
                    className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <RotateCcw size={12} /> Restore {excludedCount} hidden comment
                    {excludedCount === 1 ? '' : 's'}
                  </button>
                )}
              </div>

              {comments.length === 0 ? (
                <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-500">
                  No written teacher comments recorded on this student’s stamps yet.
                </div>
              ) : (
                <ul className="space-y-3">
                  {comments.map((sig) => (
                    <FamilyRecapCommentItem
                      key={sig.id}
                      sig={sig}
                      onSaveNote={onSaveNote}
                      onExcludeFromEmail={onExcludeComment}
                    />
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 text-sm sm:text-base leading-relaxed pt-2">
              {closingParagraphs.map((paragraph, idx) => (
                <p key={idx} className="text-gray-700">
                  {paragraph}
                </p>
              ))}
              <div className="pt-4 border-t border-gray-100 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-gray-600 text-sm">Warm regards,</p>
                  <p className="font-bold text-emerald-900">Sathya Sai College Secondary Team</p>
                </div>
                <p className="text-xs text-gray-500">
                  Secondary School Office:{' '}
                  <a
                    href={`mailto:${replyToEmail}`}
                    className="text-emerald-800 font-semibold underline"
                  >
                    {replyToEmail}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
