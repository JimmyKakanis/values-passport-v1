import * as admin from "firebase-admin";
import { acquireGraphAccessToken, sendMailWithGraph, type GraphMailConfig } from "./graphMail";
import { escapeHtml } from "./mail";

const db = () => admin.firestore();

/** Minimum unseen stamps before we email (matches in-app Welcome Back threshold). */
export const UNSEEN_STAMPS_EMAIL_THRESHOLD = 5;

export interface UnseenStampsEmailContext {
  graph: GraphMailConfig;
  appUrl: string;
}

function passportLink(appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/#/passport`;
}

function sentDocId(studentId: string, lastLoginAt: number): string {
  return `${studentId}_${lastLoginAt}`.replace(/[/.#$\[\]]/g, "_");
}

export async function runUnseenStampsEmails(ctx: UnseenStampsEmailContext): Promise<void> {
  const tokenRes = await acquireGraphAccessToken(ctx.graph);
  if (!tokenRes.ok) {
    console.error("Unseen stamps email: Graph token failed:", tokenRes.error);
    return;
  }
  const accessToken = tokenRes.accessToken;
  const senderUpn = ctx.graph.senderUpn;
  const now = Date.now();

  const prefsSnap = await db().collection("email_preferences").get();
  const optedIn = new Set<string>();
  prefsSnap.docs.forEach((docSnap) => {
    const data = docSnap.data() as {
      role?: string;
      unseenStampsEmailEnabled?: boolean;
    };
    if (data.role === "STUDENT" && data.unseenStampsEmailEnabled === true) {
      optedIn.add(docSnap.id.toLowerCase());
    }
  });

  if (optedIn.size === 0) return;

  const studentsSnap = await db().collection("students").get();
  const sentRef = db().collection("unseen_stamps_email_sent");

  for (const studentDoc of studentsSnap.docs) {
    const student = studentDoc.data();
    const studentId = studentDoc.id;
    if (student.archived === true) continue;

    const email = student.email ? String(student.email) : "";
    const emailLower = email.toLowerCase();
    if (!email || !optedIn.has(emailLower)) continue;

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
    if (unseenCount < UNSEEN_STAMPS_EMAIL_THRESHOLD) continue;

    const sentId = sentDocId(studentId, lastLoginAt);
    const already = await sentRef.doc(sentId).get();
    if (already.exists) continue;

    const name = escapeHtml(String(student.name || "there"));
    const html = `<p>Hi ${name},</p><p>You have <strong>${unseenCount}</strong> new stamp${unseenCount === 1 ? "" : "s"} waiting in Values Passport — teachers have been recognising your values while you've been away.</p><p><a href="${passportLink(ctx.appUrl)}">Open your passport</a></p>`;

    const result = await sendMailWithGraph(
      accessToken,
      senderUpn,
      email,
      `${unseenCount} new stamps waiting in Values Passport`,
      html
    );

    if (result.ok) {
      await sentRef.doc(sentId).set({
        studentId,
        lastLoginAt,
        unseenCount,
        sentAt: now,
      });
    } else {
      console.error(`Unseen stamps email failed for ${studentId}:`, result.error);
    }
  }
}
