import * as admin from "firebase-admin";
import {
  acquireGraphAccessToken,
  DEFAULT_SECONDARY_REPLY_TO,
  sendMailWithGraph,
  type GraphMailConfig,
} from "./graphMail";
import { escapeHtml } from "./mail";

const db = () => admin.firestore();

/** Minimum unseen stamps before we email (matches in-app Welcome Back threshold). */
export const UNSEEN_STAMPS_EMAIL_THRESHOLD = 5;
const MAX_TEASER_COMMENTS = 2;

const VALUE_HEX: Record<string, { bg: string; text: string; border: string }> = {
  Truth: { bg: "#dbeafe", text: "#1e3a8a", border: "#bfdbfe" },
  Love: { bg: "#fce7f3", text: "#831843", border: "#fbcfe8" },
  Peace: { bg: "#ccfbf1", text: "#134e4a", border: "#99f6e4" },
  "Right Conduct": { bg: "#d1fae5", text: "#064e3b", border: "#a7f3d0" },
  "Non-Violence": { bg: "#ffedd5", text: "#7c2d12", border: "#fed7aa" },
};

export interface UnseenStampsEmailContext {
  graph: GraphMailConfig;
  appUrl: string;
}

export interface UnseenStampsEmailOptions {
  /** When true (default), only students with unseenStampsEmailEnabled in email_preferences. */
  requireOptIn?: boolean;
}

export interface UnseenStampsEmailResult {
  sent: number;
  skippedAlreadySent: number;
  skippedBelowThreshold: number;
  skippedNoEmail: number;
  skippedNotOptedIn: number;
  skippedArchived: number;
  failed: number;
}

interface RawSignatureDoc {
  subject?: string;
  value?: string;
  subValue?: string;
  teacherName?: string;
  note?: string;
  timestamp?: number;
}

function passportLink(appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/#/passport`;
}

function sentDocId(studentId: string, lastLoginAt: number): string {
  return `${studentId}_${lastLoginAt}`.replace(/[/.#$\[\]]/g, "_");
}

function getStudentFirstName(fullName: string): string {
  const trimmed = (fullName || "").trim();
  const spaceIdx = trimmed.indexOf(" ");
  return spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
}

function formatShortDate(timestamp?: number): string {
  if (!timestamp || timestamp <= 0) return "Recently";
  try {
    return new Date(timestamp).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Australia/Sydney",
    });
  } catch {
    return "Recently";
  }
}

export function buildStyledUnseenStampsEmail(params: {
  studentName: string;
  unseenSignatures: RawSignatureDoc[];
  appUrl: string;
  replyToEmail: string;
}): { subjectLine: string; htmlBody: string; unseenCommentsCount: number } {
  const { studentName, unseenSignatures, appUrl, replyToEmail } = params;
  const firstName = getStudentFirstName(studentName || "there");

  const sortedNewestFirst = [...unseenSignatures].sort(
    (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)
  );
  const unseenCount = sortedNewestFirst.length;

  const valueMap = new Map<string, number>();
  const subjectSet = new Set<string>();
  for (const sig of sortedNewestFirst) {
    if (sig.value) {
      valueMap.set(sig.value, (valueMap.get(sig.value) ?? 0) + 1);
    }
    if (sig.subject) {
      subjectSet.add(sig.subject);
    }
  }

  const valueCounts = [...valueMap.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  const subjects = [...subjectSet];
  const withNotes = sortedNewestFirst.filter((s) => Boolean(s.note && s.note.trim()));
  const unseenCommentsCount = withNotes.length;

  const teacherNotes = withNotes.filter(
    (s) => !/^self-advocacy\s*:/i.test((s.note || "").trim())
  );
  const selfNotes = withNotes.filter((s) =>
    /^self-advocacy\s*:/i.test((s.note || "").trim())
  );
  const teaserComments = [...teacherNotes, ...selfNotes].slice(0, MAX_TEASER_COMMENTS);

  const remainingComments = Math.max(0, unseenCommentsCount - teaserComments.length);
  const remainingStamps = Math.max(0, unseenCount - teaserComments.length);

  const subjectLine =
    unseenCommentsCount > 0
      ? `${firstName}, you have ${unseenCount} new stamps & teacher comments waiting in Values Passport!`
      : `${firstName}, you have ${unseenCount} new stamps waiting in your Values Passport!`;

  const valuePillsHtml = valueCounts
    .map(({ value, count }) => {
      const palette = VALUE_HEX[value] || {
        bg: "#f3f4f6",
        text: "#1f2937",
        border: "#e5e7eb",
      };
      return `<span style="display:inline-block;margin:3px 6px 3px 0;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:700;background:${palette.bg};color:${palette.text};border:1px solid ${palette.border};">${escapeHtml(
        `${value}: +${count}`
      )}</span>`;
    })
    .join("");

  const teaserCardsHtml = teaserComments
    .map((c) => {
      const val = c.value || "";
      const palette = VALUE_HEX[val] || {
        bg: "#f3f4f6",
        text: "#1f2937",
        border: "#e5e7eb",
      };
      return `<div style="margin-bottom:12px;padding:14px 16px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;"><div style="margin-bottom:6px;"><span style="font-weight:700;color:#111827;font-size:14px;">${escapeHtml(
        c.subject || "School"
      )}</span><span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:${
        palette.bg
      };color:${palette.text};border:1px solid ${palette.border};">${escapeHtml(
        val
      )}</span>${
        c.subValue
          ? `<span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#eff6ff;color:#1e40af;">${escapeHtml(
              c.subValue
            )}</span>`
          : ""
      }<span style="float:right;font-size:12px;color:#6b7280;">${escapeHtml(
        formatShortDate(c.timestamp)
      )}</span></div><div style="font-size:12px;color:#4b5563;margin-bottom:8px;">Awarded by <strong>${escapeHtml(
        c.teacherName || "Teacher"
      )}</strong></div><div style="background:#ffffff;border-left:3px solid #10b981;padding:10px 12px;border-radius:0 8px 8px 0;font-size:14px;color:#374151;line-height:1.5;">&ldquo;${escapeHtml(
        (c.note || "").trim()
      )}&rdquo;</div></div>`;
    })
    .join("");

  const moreWaitingHtml =
    remainingComments > 0
      ? `<div style="margin:14px 0 20px 0;padding:14px 16px;border-radius:12px;background:#ecfdf5;border:1px dashed #10b981;text-align:center;"><div style="font-size:14px;font-weight:800;color:#065f46;">+ ${remainingComments} more teacher comment${
          remainingComments === 1 ? "" : "s"
        } and ${remainingStamps} stamp${
          remainingStamps === 1 ? "" : "s"
        } waiting inside!</div><div style="font-size:13px;color:#047857;margin-top:4px;">Sign in to your Values Passport to read every comment and check your Achievement progress.</div></div>`
      : remainingStamps > 0
      ? `<div style="margin:14px 0 20px 0;padding:14px 16px;border-radius:12px;background:#ecfdf5;border:1px dashed #10b981;text-align:center;"><div style="font-size:14px;font-weight:800;color:#065f46;">+ ${remainingStamps} more new stamp${
          remainingStamps === 1 ? "" : "s"
        } waiting in your Passport grid!</div><div style="font-size:13px;color:#047857;margin-top:4px;">Log back in to see which subjects and values you unlocked.</div></div>`
      : "";

  const link = passportLink(appUrl);
  const htmlBody = `<div style="max-width:640px;margin:0 auto;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;"><div style="background:#065f46;color:#ffffff;padding:22px 28px;border-bottom:4px solid #facc15;"><div style="font-size:20px;font-weight:800;letter-spacing:-0.01em;">Sathya Sai College</div><div style="font-size:11px;color:#a7f3d0;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;margin-top:2px;">Values Passport &bull; Stamps Waiting For You</div></div><div style="padding:28px;"><p style="font-size:16px;margin:0 0 14px 0;">Hi <strong>${escapeHtml(
    firstName
  )}</strong>,</p><p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 18px 0;">While you&rsquo;ve been away from the app, your teachers have been noticing and celebrating the positive values you bring to school. You have <strong>${unseenCount} new Values Passport stamps</strong>${
    unseenCommentsCount > 0
      ? ` (including <strong>${unseenCommentsCount} personal comment${
          unseenCommentsCount === 1 ? "" : "s"
        }</strong>)`
      : ""
  } waiting for you!</p><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin:20px 0;"><div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#065f46;margin-bottom:8px;">New Recognition Since Your Last Visit</div><div style="font-size:24px;font-weight:900;color:#111827;margin-bottom:10px;">${unseenCount} New Stamps Earned</div>${
    valuePillsHtml ? `<div style="margin-bottom:10px;">${valuePillsHtml}</div>` : ""
  }${
    subjects.length > 0
      ? `<div style="font-size:13px;color:#4b5563;"><strong>Recognised in:</strong> ${escapeHtml(
          subjects.join(", ")
        )}</div>`
      : ""
  }</div>${
    teaserComments.length > 0
      ? `<h3 style="font-size:15px;font-weight:800;color:#1e3a8a;margin:22px 0 10px 0;">Sneak Peek at Your Teacher Comments</h3>${teaserCardsHtml}`
      : ""
  }${moreWaitingHtml}<div style="text-align:center;margin:26px 0 22px 0;"><a href="${escapeHtml(
    link
  )}" style="display:inline-block;background:#059669;color:#ffffff;font-weight:800;font-size:15px;padding:14px 28px;border-radius:999px;text-decoration:none;border-bottom:3px solid #047857;">Open My Values Passport &rarr;</a><div style="font-size:12px;color:#6b7280;margin-top:8px;">Sign in with your school Microsoft 365 account to view your full passport, claim rewards, and play Values Lab games.</div></div><div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#4b5563;">Keep up the great work,<br/><strong style="color:#065f46;">Sathya Sai College Secondary Team</strong><div style="font-size:11px;color:#6b7280;margin-top:6px;">Questions? Contact the Secondary School office: <a href="mailto:${escapeHtml(
    replyToEmail
  )}" style="color:#065f46;">${escapeHtml(replyToEmail)}</a></div></div></div></div>`;

  return { subjectLine, htmlBody, unseenCommentsCount };
}

export async function runUnseenStampsEmails(
  ctx: UnseenStampsEmailContext,
  options: UnseenStampsEmailOptions = {}
): Promise<UnseenStampsEmailResult> {
  const requireOptIn = options.requireOptIn !== false;
  const result: UnseenStampsEmailResult = {
    sent: 0,
    skippedAlreadySent: 0,
    skippedBelowThreshold: 0,
    skippedNoEmail: 0,
    skippedNotOptedIn: 0,
    skippedArchived: 0,
    failed: 0,
  };

  const tokenRes = await acquireGraphAccessToken(ctx.graph);
  if (!tokenRes.ok) {
    console.error("Unseen stamps email: Graph token failed:", tokenRes.error);
    throw new Error(tokenRes.error);
  }
  const accessToken = tokenRes.accessToken;
  const senderUpn = ctx.graph.senderUpn;
  const replyToEmail = (ctx.graph.replyTo || DEFAULT_SECONDARY_REPLY_TO).trim();
  const now = Date.now();

  const optedIn = new Set<string>();
  if (requireOptIn) {
    const prefsSnap = await db().collection("email_preferences").get();
    prefsSnap.docs.forEach((docSnap) => {
      const data = docSnap.data() as {
        role?: string;
        unseenStampsEmailEnabled?: boolean;
      };
      if (data.role === "STUDENT" && data.unseenStampsEmailEnabled === true) {
        optedIn.add(docSnap.id.toLowerCase());
      }
    });
    if (optedIn.size === 0) return result;
  }

  const studentsSnap = await db().collection("students").get();
  const sentRef = db().collection("unseen_stamps_email_sent");

  for (const studentDoc of studentsSnap.docs) {
    const student = studentDoc.data();
    const studentId = studentDoc.id;
    const gradeStr = String(student.grade || "").trim().toLowerCase();
    if (
      student.archived === true ||
      gradeStr === "staff" ||
      gradeStr.startsWith("graduated")
    ) {
      result.skippedArchived++;
      continue;
    }

    const email = student.email ? String(student.email) : "";
    const emailLower = email.toLowerCase();
    if (!email) {
      result.skippedNoEmail++;
      continue;
    }
    if (requireOptIn && !optedIn.has(emailLower)) {
      result.skippedNotOptedIn++;
      continue;
    }

    const lastLoginAt =
      typeof student.lastLoginAt === "number" && student.lastLoginAt > 0
        ? student.lastLoginAt
        : 0;

    const sigsSnap = await db()
      .collection("signatures")
      .where("studentId", "==", studentId)
      .where("timestamp", ">", lastLoginAt)
      .get();

    const unseenCount = sigsSnap.size;
    if (unseenCount < UNSEEN_STAMPS_EMAIL_THRESHOLD) {
      result.skippedBelowThreshold++;
      continue;
    }

    const sentId = sentDocId(studentId, lastLoginAt);
    const already = await sentRef.doc(sentId).get();
    if (already.exists) {
      result.skippedAlreadySent++;
      continue;
    }

    const studentName = String(student.name || "there");
    const unseenSignatures = sigsSnap.docs.map(
      (d) => d.data() as RawSignatureDoc
    );

    const { subjectLine, htmlBody, unseenCommentsCount } =
      buildStyledUnseenStampsEmail({
        studentName,
        unseenSignatures,
        appUrl: ctx.appUrl,
        replyToEmail,
      });

    const sendResult = await sendMailWithGraph(
      accessToken,
      senderUpn,
      email,
      subjectLine,
      htmlBody,
      replyToEmail
    );

    if (sendResult.ok) {
      await sentRef.doc(sentId).set({
        studentId,
        studentName,
        toEmail: email,
        subject: subjectLine,
        htmlBody,
        lastLoginAt,
        unseenCount,
        unseenCommentsCount,
        sentAt: now,
        blast: requireOptIn ? undefined : "oneoff_all_eligible",
      });
      result.sent++;
    } else {
      console.error(`Unseen stamps email failed for ${studentId}:`, sendResult.error);
      result.failed++;
    }
  }

  return result;
}
