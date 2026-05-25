/**
 * E2E achievement email test via client SDK (production Firestore + Cloud Function).
 * Run: node scripts/e2e-achievement-email.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const raw = readFileSync(join(repoRoot, ".env"), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchRecentFunctionLogs(sinceMs) {
  try {
    const out = execSync("firebase functions:log --only onAchievementEmailQueued --lines 50", {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 60000,
    });
    return out;
  } catch (e) {
    return e.stdout?.toString?.() || e.message || String(e);
  }
}

function logHasRecentSuccess(logs, sinceMs) {
  if (/Achievement email Graph error|Graph token failed/i.test(logs)) {
    return { ok: false, reason: "graph_error" };
  }
  const lines = logs.split("\n");
  for (const line of lines) {
    if (!line.includes("onAchievementEmailQueued")) continue;
    const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/);
    if (!tsMatch) continue;
    const ts = Date.parse(tsMatch[1]);
    if (ts >= sinceMs - 5000) {
      return { ok: true, reason: "function_invoked" };
    }
  }
  return { ok: false, reason: "no_recent_invocation" };
}

const env = loadEnv();
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const TEST_EMAIL = "vp-e2e-mailtest@sathyasai.nsw.edu.au";
const TEST_PASSWORD = "E2ETestPass2026!";
const ACHIEVEMENT_ID = `e2e-test-${Date.now()}`;
const ACHIEVEMENT_TITLE = "E2E Email Test Badge";

async function main() {
  console.log("=== Achievement email E2E test ===\n");
  const startedAt = Date.now();

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log(`Signing in as ${TEST_EMAIL}...`);
  await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
  console.log("Signed in");

  const existing = await getDocs(
    query(collection(db, "students"), where("email", "==", TEST_EMAIL), limit(1))
  );
  let studentId;
  if (!existing.empty) {
    studentId = existing.docs[0].id;
    console.log(`Using existing student doc: ${studentId}`);
  } else {
    const studentRef = doc(collection(db, "students"));
    studentId = studentRef.id;
    await setDoc(studentRef, {
      id: studentId,
      name: "VP E2E Mail Test",
      email: TEST_EMAIL,
      grade: "Year 7",
      archived: false,
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=VPE2E&backgroundColor=b6e3f4",
      avatarConfig: { seed: "VPE2E", backgroundColor: "b6e3f4" },
    });
    console.log(`Created student doc: ${studentId}`);
  }

  await setDoc(
    doc(db, "email_preferences", TEST_EMAIL),
    {
      email: TEST_EMAIL,
      role: "STUDENT",
      achievementEmailEnabled: true,
      studentDigestEnabled: false,
      teacherDigestEnabled: false,
      frequency: "WEEKLY",
      updatedAt: Date.now(),
    },
    { merge: true }
  );
  console.log("Enabled achievementEmailEnabled");

  const queueRef = await addDoc(collection(db, "achievement_email_queue"), {
    studentId,
    achievementId: ACHIEVEMENT_ID,
    achievementTitle: ACHIEVEMENT_TITLE,
    achievementDescription: "Automated end-to-end test after Microsoft Graph deploy.",
    requestedAt: serverTimestamp(),
  });
  console.log(`Queued: achievement_email_queue/${queueRef.id}`);
  console.log("Waiting up to 2 minutes for Cloud Function...\n");

  const deadline = Date.now() + 120_000;
  let lastLogs = "";

  while (Date.now() < deadline) {
    await sleep(10000);
    lastLogs = fetchRecentFunctionLogs(startedAt);
    const result = logHasRecentSuccess(lastLogs, startedAt);
    if (result.ok) {
      console.log("\nPASS: Cloud Function invoked after queue write (no Graph errors in logs).");
      console.log(`Check inbox: ${TEST_EMAIL}`);
      console.log(`Expected subject: Achievement unlocked: ${ACHIEVEMENT_TITLE}`);
      await signOut(auth);
      return;
    }
    if (result.reason === "graph_error") {
      console.log("\nFAIL: Graph error in function logs:\n");
      console.log(lastLogs);
      await signOut(auth);
      process.exit(1);
    }
    process.stdout.write(".");
  }

  console.log("\n\n--- Recent function logs ---");
  console.log(lastLogs);
  await signOut(auth);
  console.log("\nFAIL: Timed out — function may not have run. See logs above.");
  process.exit(1);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
