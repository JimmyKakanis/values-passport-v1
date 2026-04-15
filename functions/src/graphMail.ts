/**
 * Microsoft Graph application-only mail (client credentials).
 * Requires Entra app registration with Mail.Send application permission + admin consent.
 */

export type GraphMailConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  senderUpn: string;
};

type TokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; error: string };

let tokenCache: { accessToken: string; expiresAtMs: number } | null = null;

export async function acquireGraphAccessToken(
  config: GraphMailConfig
): Promise<TokenResult> {
  const { tenantId, clientId, clientSecret } = config;
  if (!tenantId || !clientId || !clientSecret) {
    return { ok: false, error: "Missing Graph tenant ID, client ID, or client secret" };
  }

  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAtMs - 60_000) {
    return { ok: true, accessToken: tokenCache.accessToken };
  }

  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  let res: Response;
  try {
    res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Token request failed: ${msg}` };
  }

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    const detail = json.error_description || json.error || res.statusText;
    return { ok: false, error: `Graph token error (${res.status}): ${detail}` };
  }

  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
  tokenCache = {
    accessToken: json.access_token,
    expiresAtMs: now + expiresIn * 1000,
  };

  return { ok: true, accessToken: json.access_token };
}

export async function sendMailWithGraph(
  accessToken: string,
  senderUpn: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!senderUpn) {
    return { ok: false, error: "MICROSOFT_GRAPH_SENDER_UPN is not configured" };
  }

  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderUpn)}/sendMail`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: {
            contentType: "HTML",
            content: htmlBody,
          },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: false,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `sendMail request failed: ${msg}` };
  }

  if (res.ok || res.status === 202) {
    return { ok: true };
  }

  let errText = res.statusText;
  try {
    const errJson = (await res.json()) as { error?: { message?: string } };
    if (errJson.error?.message) errText = errJson.error.message;
  } catch {
    errText = await res.text().catch(() => res.statusText);
  }

  return { ok: false, error: `Graph sendMail ${res.status}: ${errText}` };
}
