import { execSync } from "child_process";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const secret = execSync("firebase functions:secrets:access MICROSOFT_GRAPH_CLIENT_SECRET", {
  cwd: repoRoot,
  encoding: "utf8",
}).trim();

const config = Object.fromEntries(
  readFileSync(join(repoRoot, "functions/.env.values-passport"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const to = process.argv[2] || "j.kakanis@sathyasai.nsw.edu.au";
const body = new URLSearchParams({
  client_id: config.MICROSOFT_GRAPH_CLIENT_ID,
  client_secret: secret,
  scope: "https://graph.microsoft.com/.default",
  grant_type: "client_credentials",
});

const tokenRes = await fetch(
  `https://login.microsoftonline.com/${encodeURIComponent(config.MICROSOFT_GRAPH_TENANT_ID)}/oauth2/v2.0/token`,
  { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }
);
const tokenJson = await tokenRes.json();
if (!tokenJson.access_token) {
  console.error("TOKEN_FAIL", tokenJson);
  process.exit(1);
}

const html =
  "<p>Hi James,</p><p>Values Passport E2E check: Graph mail is working with your deployed Firebase config.</p>" +
  '<p><a href="https://sathyasai-valuespassport.com/#/settings">Open Settings</a></p>';

const mailRes = await fetch(
  `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.MICROSOFT_GRAPH_SENDER_UPN)}/sendMail`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: "Values Passport: E2E mail test",
        body: { contentType: "HTML", content: html },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: false,
    }),
  }
);

if (mailRes.ok || mailRes.status === 202) {
  console.log(`SEND_OK ${mailRes.status} -> ${to}`);
} else {
  console.error(`SEND_FAIL ${mailRes.status}`, await mailRes.text());
  process.exit(1);
}
