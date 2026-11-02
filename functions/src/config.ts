import { defineSecret, defineString } from "firebase-functions/params";

/** App registration client secret (store in Secret Manager) */
export const graphClientSecret = defineSecret("MICROSOFT_GRAPH_CLIENT_SECRET");

export const graphTenantId = defineString("MICROSOFT_GRAPH_TENANT_ID", {
  default: "",
  description: "Azure Entra tenant (directory) ID",
});

export const graphClientId = defineString("MICROSOFT_GRAPH_CLIENT_ID", {
  default: "",
  description: "App registration application (client) ID",
});

/** User or shared mailbox UPN that is allowed to send (e.g. noreply-VP@sathyasai.nsw.edu.au) */
export const graphSenderUpn = defineString("MICROSOFT_GRAPH_SENDER_UPN", {
  default: "noreply-VP@sathyasai.nsw.edu.au",
  description: "Sender mailbox UPN in your Microsoft 365 tenant",
});

/** Secondary school office Reply-To address so replies to automated emails come back to Secondary */
export const graphReplyToEmail = defineString("MICROSOFT_GRAPH_REPLY_TO", {
  default: "schooloffice_d@sathyasai.nsw.edu.au",
  description: "Reply-To address for outbound emails (Secondary School office)",
});

export const appPublicUrl = defineString("APP_PUBLIC_URL", {
  default: "http://localhost:5173",
  description: "Public URL of the SPA (used in email links)",
});
