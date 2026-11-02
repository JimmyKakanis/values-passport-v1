import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { triggerUnseenStampsEmailBlast } from '../../services/sentEmailsService';
import {
  DEFAULT_SECONDARY_REPLY_TO_EMAIL,
  DEFAULT_SENDER_EMAIL,
} from '../../utils/familyRecapEmail';
import type { EligibleUnseenRecipient, UnseenBlastRunSummary } from '../../types';

interface UnseenStampsCampaignCardProps {
  eligibleRecipients: EligibleUnseenRecipient[];
  onBlastCompleted: () => void;
}

export const UnseenStampsCampaignCard: React.FC<UnseenStampsCampaignCardProps> = ({
  eligibleRecipients,
  onBlastCompleted,
}) => {
  const [showPreviewDrawer, setShowPreviewDrawer] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [blastSummary, setBlastSummary] = useState<UnseenBlastRunSummary | null>(null);
  const [blastError, setBlastError] = useState<string>('');

  const readyToSendList = useMemo(
    () => eligibleRecipients.filter((r) => !r.alreadySentForLoginWindow),
    [eligibleRecipients]
  );
  const alreadySentCount = eligibleRecipients.length - readyToSendList.length;

  const activeRecipient = useMemo(() => {
    if (selectedStudentId) {
      const found = eligibleRecipients.find((r) => r.studentId === selectedStudentId);
      if (found) return found;
    }
    return readyToSendList[0] ?? eligibleRecipients[0] ?? null;
  }, [eligibleRecipients, readyToSendList, selectedStudentId]);

  const handleSendBlast = async () => {
    if (readyToSendList.length === 0) return;
    if (
      !window.confirm(
        `Send the styled "Stamps & Comments Waiting" email to ${readyToSendList.length} student${
          readyToSendList.length === 1 ? '' : 's'
        } who have 5+ unseen stamps since their last login?`
      )
    ) {
      return;
    }

    setSending(true);
    setBlastError('');
    setBlastSummary(null);

    const res = await triggerUnseenStampsEmailBlast({ requireOptIn: false });
    setSending(false);

    if (res.ok) {
      setBlastSummary(res.result);
      onBlastCompleted();
    } else {
      setBlastError(res.error);
    }
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-white to-amber-50/50 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-800 text-white text-[11px] font-bold uppercase tracking-wider">
            <Sparkles size={12} /> Re-Engagement Campaign
          </div>
          <h3 className="text-lg font-extrabold text-gray-900">
            Students with 5+ Unseen Stamps &amp; Teacher Comments
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Sends an app-styled email featuring their new value pills, a sneak peek of up to 2 recent teacher comments, and a direct button to sign back into their Values Passport. Each student is only emailed once per login window.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {eligibleRecipients.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPreviewDrawer((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-700 bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold transition-colors"
            >
              <Eye size={15} />
              {showPreviewDrawer ? 'Hide Email Previews' : 'Preview Styled Emails'}
              {showPreviewDrawer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}

          <button
            type="button"
            disabled={sending || readyToSendList.length === 0}
            onClick={() => void handleSendBlast()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {sending ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Sending Emails...
              </>
            ) : (
              <>
                <Send size={15} />
                Send Unseen Reminders Now ({readyToSendList.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick stat pills */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="px-3 py-1 rounded-lg bg-white border border-gray-200 font-semibold text-gray-700">
          Total with 5+ unseen stamps:{' '}
          <strong className="text-gray-900">{eligibleRecipients.length}</strong>
        </span>
        <span className="px-3 py-1 rounded-lg bg-amber-100/80 border border-amber-200 font-semibold text-amber-950">
          Ready to send now:{' '}
          <strong className="font-extrabold">{readyToSendList.length}</strong>
        </span>
        <span className="px-3 py-1 rounded-lg bg-emerald-100/70 border border-emerald-200 font-semibold text-emerald-950">
          Already emailed since last login:{' '}
          <strong className="font-extrabold">{alreadySentCount}</strong>
        </span>
      </div>

      {blastSummary && (
        <div className="p-3.5 rounded-lg bg-emerald-100/90 border border-emerald-300 text-emerald-950 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-800 shrink-0" />
          <div>
            <strong>Blast complete!</strong> Sent <strong>{blastSummary.sent}</strong> new email
            {blastSummary.sent === 1 ? '' : 's'} · Skipped{' '}
            <strong>{blastSummary.skippedAlreadySent}</strong> already emailed for their current login window
            {blastSummary.failed > 0 ? ` · ${blastSummary.failed} failed` : ''}.
          </div>
        </div>
      )}

      {blastError && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{blastError}</span>
        </div>
      )}

      {/* Expandable Preview Drawer */}
      {showPreviewDrawer && activeRecipient && (
        <div className="pt-3 border-t border-emerald-200/80 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-500 flex justify-between">
              <span>Eligible Students ({eligibleRecipients.length})</span>
              <span>Unseen / Notes</span>
            </div>
            <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {eligibleRecipients.map((r) => {
                const isSelected = activeRecipient.studentId === r.studentId;
                return (
                  <li key={r.studentId}>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentId(r.studentId)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 border-l-4 border-emerald-700'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate flex items-center gap-1.5">
                          <span>{r.studentName}</span>
                          {r.alreadySentForLoginWindow ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Sent
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                              Ready
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {r.studentGrade} • Last login:{' '}
                          {r.lastLoginAt > 0
                            ? formatDistanceToNow(new Date(r.lastLoginAt), { addSuffix: true })
                            : 'Never'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block font-extrabold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-full text-xs">
                          +{r.unseenCount}
                        </span>
                        <div className="text-[10px] text-gray-400">
                          {r.unseenCommentsCount} note{r.unseenCommentsCount === 1 ? '' : 's'}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 border-b border-gray-100 pb-3">
              <div>
                <span className="font-bold text-gray-800">From:</span> {DEFAULT_SENDER_EMAIL}
              </div>
              <div>
                <span className="font-bold text-gray-800">Reply-To:</span>{' '}
                {DEFAULT_SECONDARY_REPLY_TO_EMAIL}
              </div>
              <div>
                <span className="font-bold text-gray-800">To:</span>{' '}
                {activeRecipient.studentName} &lt;{activeRecipient.studentEmail}&gt;
              </div>
              <div>
                <span className="font-bold text-gray-800">Status:</span>{' '}
                {activeRecipient.alreadySentForLoginWindow
                  ? 'Already sent for this login period'
                  : 'Ready to send'}
              </div>
              <div className="sm:col-span-2">
                <span className="font-bold text-gray-800">Subject:</span>{' '}
                {activeRecipient.subjectLine}
              </div>
            </div>
            <div
              className="max-h-[34rem] overflow-y-auto pr-1"
              dangerouslySetInnerHTML={{ __html: activeRecipient.htmlBody }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
