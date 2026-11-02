import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Bell,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { SCHOOL_GRADES } from '../../constants';
import { fetchSentEmailsAdminOverview } from '../../services/sentEmailsService';
import {
  DEFAULT_SECONDARY_REPLY_TO_EMAIL,
  DEFAULT_SENDER_EMAIL,
} from '../../utils/familyRecapEmail';
import { UnseenStampsCampaignCard } from './UnseenStampsCampaignCard';
import type {
  SentEmailKind,
  SentEmailLogEntry,
  SentEmailsAdminOverview,
} from '../../types';

const KIND_META: Record<
  SentEmailKind,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  UNSEEN_STAMPS: {
    label: 'Stamps Waiting',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
    icon: <Bell size={13} className="shrink-0" />,
  },
  ACHIEVEMENT: {
    label: 'Achievement Unlocked',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-200',
    icon: <Award size={13} className="shrink-0" />,
  },
  STUDENT_DIGEST: {
    label: 'Student Weekly Digest',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    icon: <Calendar size={13} className="shrink-0" />,
  },
  TEACHER_DIGEST: {
    label: 'Teacher Weekly Digest',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-200',
    icon: <Users size={13} className="shrink-0" />,
  },
  PARENT_DIGEST: {
    label: 'Parent Weekly Digest',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-200',
    icon: <Mail size={13} className="shrink-0" />,
  },
};

export const AdminSentEmailsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<SentEmailsAdminOverview | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [kindFilter, setKindFilter] = useState<'ALL' | SentEmailKind>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    const data = await fetchSentEmailsAdminOverview();
    setOverview(data);
    setLoading(false);
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  const countsByKind = useMemo(() => {
    const list = overview?.sentEmails ?? [];
    return {
      total: list.length,
      unseen: list.filter((e) => e.kind === 'UNSEEN_STAMPS').length,
      achievement: list.filter((e) => e.kind === 'ACHIEVEMENT').length,
      digests: list.filter(
        (e) =>
          e.kind === 'STUDENT_DIGEST' ||
          e.kind === 'TEACHER_DIGEST' ||
          e.kind === 'PARENT_DIGEST'
      ).length,
    };
  }, [overview]);

  const filteredEmails = useMemo(() => {
    const list = overview?.sentEmails ?? [];
    const q = searchTerm.trim().toLowerCase();
    return list.filter((entry) => {
      if (kindFilter !== 'ALL' && entry.kind !== kindFilter) return false;
      if (roleFilter !== 'ALL') {
        if (roleFilter === 'TEACHER' && entry.kind !== 'TEACHER_DIGEST') return false;
        if (roleFilter === 'PARENT' && entry.kind !== 'PARENT_DIGEST') return false;
        if (
          roleFilter !== 'TEACHER' &&
          roleFilter !== 'PARENT' &&
          entry.studentGrade !== roleFilter
        ) {
          return false;
        }
      }
      if (!q) return true;
      return (
        entry.recipientName.toLowerCase().includes(q) ||
        entry.recipientEmail.toLowerCase().includes(q) ||
        (entry.studentName || '').toLowerCase().includes(q) ||
        entry.subject.toLowerCase().includes(q) ||
        entry.summary.toLowerCase().includes(q)
      );
    });
  }, [overview, searchTerm, kindFilter, roleFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-emerald-800">
        <Loader2 className="animate-spin h-7 w-7 mr-2" />
        Loading sent email logs...
      </div>
    );
  }

  const optIn = overview?.optInStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Send className="text-emerald-700" size={22} />
            Sent Emails Log
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Audit trail of automated Microsoft Graph emails sent by the app (stamps waiting reminders, achievement unlocks, and weekly digests).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadLogs()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700"
        >
          <RefreshCw size={14} /> Refresh Log
        </button>
      </div>

      {overview?.permissionDenied && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-2.5">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-700" />
          <div>
            <p className="font-bold">Firestore security rules need to be deployed</p>
            <p className="text-xs mt-1">
              Run <code>firebase deploy --only firestore:rules</code> so the Admin Console can read the server-written email audit collections (<code>achievement_email_sent</code>, <code>unseen_stamps_email_sent</code>, and <code>digest_sent</code>).
            </p>
          </div>
        </div>
      )}

      {/* 5+ Unseen Stamps Re-Engagement Campaign & Preview */}
      {overview && (
        <UnseenStampsCampaignCard
          eligibleRecipients={overview.eligibleUnseenRecipients}
          onBlastCompleted={() => void loadLogs()}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setKindFilter('ALL')}
          className={`text-left p-4 rounded-xl border transition-all ${
            kindFilter === 'ALL'
              ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20'
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
            <span>Total Sent</span>
            <Send size={15} className="text-emerald-700" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{countsByKind.total}</p>
          <p className="text-xs text-gray-500 mt-0.5">All automated outbound emails</p>
        </button>

        <button
          type="button"
          onClick={() => setKindFilter('UNSEEN_STAMPS')}
          className={`text-left p-4 rounded-xl border transition-all ${
            kindFilter === 'UNSEEN_STAMPS'
              ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/20'
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-800">
            <span>Stamps Waiting</span>
            <Bell size={15} className="text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{countsByKind.unseen}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            5+ unseen stamps ({optIn?.unseenStampsOptInCount ?? 0} opted in)
          </p>
        </button>

        <button
          type="button"
          onClick={() => setKindFilter('ACHIEVEMENT')}
          className={`text-left p-4 rounded-xl border transition-all ${
            kindFilter === 'ACHIEVEMENT'
              ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-500/20'
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-800">
            <span>Achievement Emails</span>
            <Award size={15} className="text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{countsByKind.achievement}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Milestone unlocks ({optIn?.achievementOptInCount ?? 0} opted in)
          </p>
        </button>

        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-teal-800">
            <span>Weekly Digests</span>
            <Calendar size={15} className="text-teal-600" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{countsByKind.digests}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Opted in: {optIn?.studentDigestOptInCount ?? 0} students ·{' '}
            {optIn?.teacherDigestOptInCount ?? 0} staff · {optIn?.parentDigestEnabledCount ?? 0}{' '}
            parents
          </p>
        </div>
      </div>

      {/* Pending queue banner if any */}
      {overview && overview.queuedEmails.length > 0 && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold flex items-center gap-1.5">
            <Clock size={15} className="text-blue-700" />
            {overview.queuedEmails.length} achievement email(s) currently in queue
          </span>
          <span className="text-blue-800">
            {overview.queuedEmails
              .slice(0, 3)
              .map((q) => `${q.studentName}: ${q.achievementTitle}`)
              .join(' · ')}
          </span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by recipient name, email, student, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={15} className="text-gray-400 hidden sm:block" />
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as 'ALL' | SentEmailKind)}
            className="text-xs font-bold border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800"
          >
            <option value="ALL">All Email Types ({countsByKind.total})</option>
            <option value="UNSEEN_STAMPS">Stamps Waiting Reminder ({countsByKind.unseen})</option>
            <option value="ACHIEVEMENT">Achievement Unlocked ({countsByKind.achievement})</option>
            <option value="STUDENT_DIGEST">Student Weekly Digest</option>
            <option value="TEACHER_DIGEST">Teacher Weekly Digest</option>
            <option value="PARENT_DIGEST">Parent Weekly Digest</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs font-bold border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800"
          >
            <option value="ALL">All Recipients</option>
            {SCHOOL_GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            <option value="TEACHER">Teachers &amp; Staff</option>
            <option value="PARENT">Parents / Guardians</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredEmails.length === 0 ? (
        <div className="text-center py-14 bg-gray-50 rounded-xl border border-gray-200 text-gray-500">
          <Mail className="mx-auto mb-2 text-gray-400" size={28} />
          <p className="font-semibold text-gray-700">No sent emails match your filter.</p>
          <p className="text-xs mt-1">
            When Cloud Functions send achievement notifications, stamps-waiting reminders, or weekly digests, they appear here automatically.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="p-3 whitespace-nowrap">Sent</th>
                <th className="p-3 whitespace-nowrap">Type</th>
                <th className="p-3">Recipient</th>
                <th className="p-3">Subject &amp; Details</th>
                <th className="p-3 text-right whitespace-nowrap">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmails.map((item: SentEmailLogEntry) => {
                const meta = KIND_META[item.kind];
                const isExpanded = expandedEmailId === item.id;
                const sentDate = item.sentAt > 0 ? new Date(item.sentAt) : null;
                return (
                  <React.Fragment key={item.id}>
                    <tr className="hover:bg-gray-50/80 align-top">
                      <td className="p-3 whitespace-nowrap">
                        {sentDate ? (
                          <div>
                            <div className="font-semibold text-gray-900 text-xs">
                              {format(sentDate, 'd MMM yyyy, h:mm a')}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {formatDistanceToNow(sentDate, { addSuffix: true })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.badgeClass}`}
                          >
                            {meta.icon}
                            {meta.label}
                          </span>
                          {item.isSchoolBlast && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-bold">
                              <Sparkles size={10} /> School Blast
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                          <span>{item.recipientName}</span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-bold">
                            {item.recipientRoleLabel}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 break-all">{item.recipientEmail}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-900">{item.subject}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{item.summary}</div>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedEmailId(isExpanded ? null : item.id)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-emerald-800 hover:bg-emerald-50"
                        >
                          {isExpanded ? (
                            <>
                              Hide <ChevronUp size={14} />
                            </>
                          ) : (
                            <>
                              View <ChevronDown size={14} />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-emerald-50/30">
                        <td colSpan={5} className="p-4">
                          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 border-b border-gray-100 pb-3">
                              <div>
                                <span className="font-bold text-gray-800">From:</span>{' '}
                                {DEFAULT_SENDER_EMAIL}
                              </div>
                              <div>
                                <span className="font-bold text-gray-800">Reply-To:</span>{' '}
                                {DEFAULT_SECONDARY_REPLY_TO_EMAIL}
                              </div>
                              <div>
                                <span className="font-bold text-gray-800">To:</span>{' '}
                                {item.recipientName} &lt;{item.recipientEmail}&gt;
                              </div>
                              <div>
                                <span className="font-bold text-gray-800">Subject:</span>{' '}
                                {item.subject}
                              </div>
                            </div>
                            <div
                              className="prose prose-sm max-w-none text-gray-800 text-sm leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: item.htmlPreview }}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
