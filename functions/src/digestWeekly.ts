import * as admin from "firebase-admin";
import type { DocumentData } from "firebase-admin/firestore";
import { acquireGraphAccessToken, sendMailWithGraph, type GraphMailConfig } from "./graphMail";
import { escapeHtml } from "./mail";

const db = () => admin.firestore();

export interface WeeklyDigestContext {
  graph: GraphMailConfig;
  appUrl: string;
  periodId: string;
}

function digestLink(appUrl: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/#/`;
}

export async function runWeeklyDigests(ctx: WeeklyDigestContext): Promise<void> {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const tokenRes = await acquireGraphAccessToken(ctx.graph);
  if (!tokenRes.ok) {
    console.error("Weekly digest: Graph token failed:", tokenRes.error);
    return;
  }
  const accessToken = tokenRes.accessToken;
  const senderUpn = ctx.graph.senderUpn;

  const eventsSnap = await db()
    .collection("digest_stamp_events")
    .where("createdAt", ">=", weekAgo)
    .get();

  const byStudent = new Map<
    string,
    { subject: string; value: string; teacherName: string; createdAt: number }[]
  >();
  eventsSnap.docs.forEach((d) => {
    const data = d.data() as {
      studentId: string;
      subject: string;
      value: string;
      teacherName: string;
      createdAt: number;
    };
    if (!data.studentId) return;
    const list = byStudent.get(data.studentId) ?? [];
    list.push({
      subject: data.subject,
      value: data.value,
      teacherName: data.teacherName,
      createdAt: data.createdAt,
    });
    byStudent.set(data.studentId, list);
  });

  const prefsSnap = await db().collection("email_preferences").get();
  const studentEmails = new Map<string, { email: string; frequency: string }>();
  const teacherEmails = new Map<string, { email: string; frequency: string }>();

  prefsSnap.docs.forEach((doc) => {
    const data = doc.data() as {
      role?: string;
      studentDigestEnabled?: boolean;
      teacherDigestEnabled?: boolean;
      frequency?: string;
    };
    const email = doc.id;
    if (data.role === "STUDENT" && data.studentDigestEnabled) {
      studentEmails.set(email.toLowerCase(), {
        email,
        frequency: data.frequency ?? "WEEKLY",
      });
    }
    if (data.role === "TEACHER" && data.teacherDigestEnabled) {
      teacherEmails.set(email.toLowerCase(), {
        email,
        frequency: data.frequency ?? "WEEKLY",
      });
    }
  });

  const studentsSnap = await db().collection("students").get();
  const studentById = new Map<string, DocumentData>();
  studentsSnap.docs.forEach((d) => {
    const s = d.data();
    s.id = d.id;
    studentById.set(d.id, s);
  });

  const sentRef = db().collection("digest_sent");

  for (const [studentId, stamps] of byStudent) {
    const student = studentById.get(studentId);
    if (!student?.email) continue;
    const emailLower = String(student.email).toLowerCase();
    const pref = studentEmails.get(emailLower);
    if (!pref || stamps.length === 0) continue;

    const sentId = `student_${studentId}_${ctx.periodId}`;
    const already = await sentRef.doc(sentId).get();
    if (already.exists) continue;

    const html = `<p>Hi ${escapeHtml(String(student.name || "there"))},</p><p>Here is your weekly Values Passport summary (<strong>${stamps.length}</strong> new stamp${stamps.length === 1 ? "" : "s"}):</p><ul>${stamps
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, 25)
      .map(
        (s) =>
          `<li>${escapeHtml(s.value)} in ${escapeHtml(s.subject)} (${escapeHtml(s.teacherName || "Teacher")})</li>`
      )
      .join("")}</ul>${stamps.length > 25 ? `<p>… and ${stamps.length - 25} more in the app.</p>` : ""}<p><a href="${digestLink(ctx.appUrl)}">Open Values Passport</a></p>`;

    const result = await sendMailWithGraph(
      accessToken,
      senderUpn,
      String(student.email),
      "Your weekly Values Passport summary",
      html
    );
    if (result.ok) {
      await sentRef.doc(sentId).set({ sentAt: now, kind: "student_digest", studentId });
    }
  }

  for (const [, { email }] of teacherEmails) {
    const teacherDoc = await findTeacherByEmail(email);
    if (!teacherDoc) continue;
    const teacherName = String(teacherDoc.name || "");
    const sentId = `teacher_${email.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${ctx.periodId}`;
    const already = await sentRef.doc(sentId).get();
    if (already.exists) continue;

    const sigsSnap = await db()
      .collection("signatures")
      .where("timestamp", ">=", weekAgo)
      .get();
    const myStamps = sigsSnap.docs.filter(
      (d) => (d.data().teacherName as string) === teacherName
    ).length;

    const nomsSnap = await db()
      .collection("nominations")
      .where("status", "==", "PENDING")
      .get();

    const emailLower = email.toLowerCase();
    const teacherRole = String(teacherDoc.role || "TEACHER");
    const myPendingNoms = nomsSnap.docs.filter((d) => {
      const data = d.data();
      const reviewers = data.reviewerEmails as string[] | undefined;
      if (teacherRole === "ADMIN") return true;
      if (!reviewers?.length) return true;
      return reviewers.includes(emailLower);
    }).length;

    if (myStamps === 0 && myPendingNoms === 0) continue;

    const html = `<p>Hi ${escapeHtml(teacherName)},</p><p><strong>Weekly Values Passport digest</strong></p><ul><li>Stamps you awarded (last 7 days): ${myStamps}</li><li>Stamp requests awaiting your review: ${myPendingNoms}</li></ul><p><a href="${digestLink(ctx.appUrl)}#/teacher">Open Teacher Console</a></p>`;

    const result = await sendMailWithGraph(
      accessToken,
      senderUpn,
      email,
      "Weekly Values Passport digest (teacher)",
      html
    );
    if (result.ok) {
      await sentRef.doc(sentId).set({ sentAt: now, kind: "teacher_digest", email });
    }
  }

  for (const d of studentsSnap.docs) {
    const s = d.data();
    const studentId = d.id;
    const stamps = byStudent.get(studentId);
    if (!stamps?.length) continue;
    if (!s.parentDigestEnabled || !s.parentEmail || !s.parentConsentRecordedAt) continue;

    const sentId = `parent_${studentId}_${ctx.periodId}`;
    const already = await sentRef.doc(sentId).get();
    if (already.exists) continue;

    const childName = String(s.name || "your child");
    const salutation = s.parentName ? String(s.parentName) : "there";
    const html = `<p>Hi ${escapeHtml(salutation)},</p><p>${escapeHtml(childName)} earned <strong>${stamps.length}</strong> new recognition${stamps.length === 1 ? "" : "s"} this week in Values Passport:</p><ul>${stamps
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, 20)
      .map((st) => `<li>${escapeHtml(st.value)} in ${escapeHtml(st.subject)}</li>`)
      .join("")}</ul>${stamps.length > 20 ? `<p>… and ${stamps.length - 20} more.</p>` : ""}<p><em>This is an automated message from Sathya Sai College Values Passport.</em></p>`;

    const result = await sendMailWithGraph(
      accessToken,
      senderUpn,
      String(s.parentEmail),
      `Values Passport weekly update for ${childName}`,
      html
    );
    if (result.ok) {
      await sentRef.doc(sentId).set({ sentAt: now, kind: "parent_digest", studentId });
    }
  }

  const allEventDocs = eventsSnap.docs;
  for (let i = 0; i < allEventDocs.length; i += 400) {
    const batch = db().batch();
    const chunk = allEventDocs.slice(i, i + 400);
    chunk.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function findTeacherByEmail(
  email: string
): Promise<DocumentData | null> {
  const snap = await db().collection("teachers").where("email", "==", email).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data();
}
