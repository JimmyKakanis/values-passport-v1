import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  graphClientSecret,
  graphTenantId,
  graphClientId,
  graphSenderUpn,
  appPublicUrl,
} from "./config";
import { acquireGraphAccessToken, sendMailWithGraph } from "./graphMail";
import { escapeHtml } from "./mail";
import { runWeeklyDigests } from "./digestWeekly";
import { runUnseenStampsEmails } from "./unseenStampsEmail";
import { validateTypingScore } from "./typingScoreValidation";

admin.initializeApp();

setGlobalOptions({ region: "australia-southeast1", maxInstances: 20 });

function graphConfigFromEnv() {
  return {
    tenantId: graphTenantId.value(),
    clientId: graphClientId.value(),
    clientSecret: graphClientSecret.value(),
    senderUpn: graphSenderUpn.value(),
  };
}

function sentAchievementDocId(studentId: string, achievementId: string): string {
  const raw = `${studentId}__${achievementId}`;
  return raw.replace(/[/.#$\[\]]/g, "_");
}

export const onAchievementEmailQueued = onDocumentCreated(
  {
    document: "achievement_email_queue/{docId}",
    secrets: [graphClientSecret],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() as {
      studentId?: string;
      achievementId?: string;
      achievementTitle?: string;
      achievementDescription?: string;
    };
    const queueRef = snap.ref;
    const studentId = data.studentId;
    const achievementId = data.achievementId;
    const achievementTitle = data.achievementTitle;
    if (!studentId || !achievementId || !achievementTitle) {
      await queueRef.delete().catch(() => undefined);
      return;
    }

    const db = admin.firestore();
    const studentSnap = await db.doc(`students/${studentId}`).get();
    if (!studentSnap.exists) {
      await queueRef.delete().catch(() => undefined);
      return;
    }
    const student = studentSnap.data() as { name?: string; email?: string };
    const toEmail = student.email;
    if (!toEmail) {
      await queueRef.delete().catch(() => undefined);
      return;
    }

    const emailKey = toEmail.toLowerCase();
    const prefSnap = await db.doc(`email_preferences/${emailKey}`).get();
    const prefs = prefSnap.data() as { achievementEmailEnabled?: boolean } | undefined;
    if (!prefSnap.exists || prefs?.achievementEmailEnabled !== true) {
      await queueRef.delete().catch(() => undefined);
      return;
    }

    const sentId = sentAchievementDocId(studentId, achievementId);
    const sentRef = db.doc(`achievement_email_sent/${sentId}`);
    const sentSnap = await sentRef.get();
    if (sentSnap.exists) {
      await queueRef.delete().catch(() => undefined);
      return;
    }

    const g = graphConfigFromEnv();
    const tokenRes = await acquireGraphAccessToken(g);
    if (!tokenRes.ok) {
      console.error("Achievement email: Graph token failed:", tokenRes.error);
      return;
    }

    const appUrl = appPublicUrl.value().replace(/\/$/, "");
    const subject = `Achievement unlocked: ${achievementTitle}`;
    const desc = data.achievementDescription
      ? escapeHtml(data.achievementDescription.slice(0, 500))
      : "";
    const html = `<p>Hi ${escapeHtml(student.name || "there")},</p><p>You unlocked <strong>${escapeHtml(achievementTitle)}</strong> in Values Passport.</p>${desc ? `<p>${desc}</p>` : ""}<p><a href="${appUrl}/#/achievements">View your achievements</a></p>`;

    const result = await sendMailWithGraph(
      tokenRes.accessToken,
      g.senderUpn,
      toEmail,
      subject,
      html
    );

    if (result.ok) {
      await sentRef.set({
        studentId,
        achievementId,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await queueRef.delete().catch(() => undefined);
    } else {
      console.error("Achievement email Graph error:", result.error);
    }
  }
);

export const onSignatureRecordDigestEvent = onDocumentCreated(
  "signatures/{sigId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const d = snap.data() as {
      studentId?: string;
      subject?: string;
      value?: string;
      teacherName?: string;
      timestamp?: number;
    };
    if (!d.studentId || !d.subject || !d.value) return;

    await admin.firestore().collection("digest_stamp_events").add({
      studentId: d.studentId,
      subject: d.subject,
      value: d.value,
      teacherName: d.teacherName || "",
      createdAt: typeof d.timestamp === "number" ? d.timestamp : Date.now(),
    });
  }
);

export const sendWeeklyDigestEmails = onSchedule(
  {
    schedule: "every friday 17:00",
    timeZone: "Australia/Sydney",
    secrets: [graphClientSecret],
  },
  async () => {
    const periodId = new Date().toISOString().slice(0, 10);
    const g = graphConfigFromEnv();
    await runWeeklyDigests({
      graph: g,
      appUrl: appPublicUrl.value(),
      periodId,
    });
  }
);

/** Email students who have 5+ stamps newer than lastLoginAt and have not opened the app since. */
export const sendUnseenStampsEmails = onSchedule(
  {
    schedule: "every day 16:00",
    timeZone: "Australia/Sydney",
    secrets: [graphClientSecret],
  },
  async () => {
    const g = graphConfigFromEnv();
    await runUnseenStampsEmails({
      graph: g,
      appUrl: appPublicUrl.value(),
    });
  }
);

export { validateTypingScore };
