import nodemailer from 'nodemailer';
import type { MailConfig, MailProvider, MailSecrets } from '@/lib/mail-config';

export type OutgoingAttachment = { name: string; contentType: string; content: Buffer };

export type OutgoingMail = {
  /** From address (blank = the transmitting mailbox). Different mailboxes need "Send As". */
  from?: string;
  fromName?: string;
  to: string[];
  cc: string[];
  bcc: string[];
  replyTo: string[];
  subject: string;
  html: string;
  text: string;
  attachments: OutgoingAttachment[];
};

export type SendResult = { ok: true; provider: MailProvider } | { ok: false; provider: MailProvider; error: string };

const GRAPH = 'https://graph.microsoft.com/v1.0';
/** sendMail requests must stay under 4 MB including base64 attachments. */
const INLINE_LIMIT = 3 * 1024 * 1024;
const UPLOAD_CHUNK = 320 * 1024 * 10;

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

type GraphErrorContext = { sender: string; from: string; clientId?: string; roles?: string[] };

/** Entra application permissions (e.g. Mail.Send) carried in an app-only access token. Exchange RBAC grants never appear here. */
function tokenRoles(token: string): string[] {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { roles?: string[] };
    return Array.isArray(payload.roles) ? payload.roles : [];
  } catch {
    return [];
  }
}

function accessDeniedHelp(code: string, message: string, ctx: GraphErrorContext): string {
  const ms = `Microsoft: ${[code, message].filter(Boolean).join(' — ')}`;
  const roles = ctx.roles ?? [];
  const hasTenantMail = roles.some((r) => /^Mail\.(Send|ReadWrite)$/i.test(r));
  const cmd = `.\\scripts\\m365\\diagnose-mailer.ps1 -ClientId ${ctx.clientId || '<client id>'} -SenderMailbox ${ctx.sender}${
    ctx.from !== ctx.sender ? ` -FromAddress ${ctx.from}` : ''
  }`;
  const cause = /OData is disabled/i.test(message)
    ? `REST/EWS access is turned off for ${ctx.sender} or for the organisation.`
    : hasTenantMail
      ? `The app has Entra permission ${roles.filter((r) => /^Mail\./i.test(r)).join(', ')}, so an Exchange Application Access Policy is most likely excluding ${ctx.sender}.`
      : `The app has no Entra mail permission (token roles: ${roles.length ? roles.join(', ') : 'none'}) and Exchange has not granted it “Application Mail.Send” on ${ctx.sender} — or that grant has not applied yet.`;
  return `Access denied for ${ctx.sender}. ${cause} Run ${cmd} on your PC to check and fix it. (${ms})`;
}

function friendlyGraphError(status: number, code: string, message: string, ctx?: GraphErrorContext): string {
  const raw = `${code} ${message}`;
  if (/SendAs|ErrorSendAsDenied|on behalf of/i.test(raw) && ctx) {
    return `${ctx.sender} is not allowed to send as ${ctx.from}. In Exchange admin, give ${ctx.sender} “Send As” on ${ctx.from} (Admin → Email → Connection shows the exact command), or clear the From address.`;
  }
  if (/AADSTS7000215|AADSTS7000222/.test(raw)) return 'Client secret is invalid or expired. Create a new secret and paste it in Connection.';
  if (/AADSTS700016/.test(raw)) return 'Client (application) ID was not found in this tenant. Check the Client ID and Tenant ID.';
  if (/AADSTS90002|AADSTS900023/.test(raw)) return 'Tenant ID not found. Use the Directory (tenant) ID GUID or your tenant domain.';
  if (/AADSTS53003/.test(raw)) {
    return 'Blocked by an Entra Conditional Access policy for workload identities. Exclude this app (or allow the server’s IP) in Entra → Conditional Access.';
  }
  if ((status === 403 || /ErrorAccessDenied|AccessDenied/i.test(raw)) && ctx) return accessDeniedHelp(code, message, ctx);
  if (status === 403 || /ErrorAccessDenied|AccessDenied/i.test(raw)) {
    return 'Access denied for this mailbox. Grant the app “Application Mail.Send” (and Mail.ReadWrite for large attachments) on the sender mailbox — the setup script does this. New permissions can take up to 2 hours to apply.';
  }
  if (status === 404 || /MailboxNotEnabledForRESTAPI|ResourceNotFound|ErrorInvalidUser/i.test(raw)) {
    return 'Sender mailbox not found or not an Exchange Online mailbox. Use a licensed user or a shared mailbox address.';
  }
  return `${status} ${code}: ${message}`.trim();
}

const REQUEST_TIMEOUT_MS = 30_000;

async function graphFetch(url: string, init: RequestInit, attempt = 1): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (err) {
    if (attempt < 3) return graphFetch(url, init, attempt + 1);
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    throw new Error(
      timedOut
        ? 'Microsoft 365 did not respond in time. Check the server’s outbound HTTPS access.'
        : `Could not reach Microsoft 365: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    const retryAfter = Number(res.headers.get('retry-after')) || attempt * 2;
    await new Promise((r) => setTimeout(r, Math.min(retryAfter, 10) * 1000));
    return graphFetch(url, init, attempt + 1);
  }
  return res;
}

async function graphError(res: Response, ctx?: GraphErrorContext): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string } | string;
    error_description?: string;
  };
  if (typeof data.error === 'string') return friendlyGraphError(res.status, data.error, data.error_description || '');
  return friendlyGraphError(res.status, data.error?.code || '', data.error?.message || res.statusText, ctx);
}

export async function getGraphToken(config: MailConfig, secrets: MailSecrets): Promise<string> {
  const { tenantId, clientId } = config.graph;
  const secret = secrets.graphClientSecret;
  if (!tenantId || !clientId || !secret) throw new Error('Microsoft 365 connection is incomplete: Tenant ID, Client ID and Client secret are required.');
  const cacheKey = `${tenantId}:${clientId}:${secret.slice(-6)}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const res = await graphFetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(await graphError(res));
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(cacheKey, { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 });
  return data.access_token;
}

const recipients = (list: string[]) => list.map((address) => ({ emailAddress: { address } }));

async function sendViaGraph(config: MailConfig, secrets: MailSecrets, mail: OutgoingMail) {
  const sender = config.graph.senderMailbox;
  if (!sender) throw new Error('Sender mailbox is not set.');
  const token = await getGraphToken(config, secrets);
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const base = `${GRAPH}/users/${encodeURIComponent(sender)}`;
  const from = mail.from || sender;
  const errCtx: GraphErrorContext = { sender, from, clientId: config.graph.clientId, roles: tokenRoles(token) };
  const message = {
    subject: mail.subject,
    body: { contentType: 'HTML', content: mail.html },
    from: { emailAddress: { address: from, name: mail.fromName || config.fromName || undefined } },
    toRecipients: recipients(mail.to),
    ccRecipients: recipients(mail.cc),
    bccRecipients: recipients(mail.bcc),
    replyTo: recipients(mail.replyTo),
  };
  const fileAttachment = (a: OutgoingAttachment) => ({
    '@odata.type': '#microsoft.graph.fileAttachment',
    name: a.name,
    contentType: a.contentType,
    contentBytes: a.content.toString('base64'),
  });
  const total = mail.attachments.reduce((n, a) => n + a.content.length, 0);

  if (total <= INLINE_LIMIT) {
    const res = await graphFetch(`${base}/sendMail`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        message: { ...message, attachments: mail.attachments.map(fileAttachment) },
        saveToSentItems: config.saveToSentItems,
      }),
    });
    if (!res.ok) throw new Error(await graphError(res, errCtx));
    return;
  }

  // Large attachments: draft → upload sessions → send (needs Application Mail.ReadWrite on the mailbox).
  const small = mail.attachments.filter((a) => a.content.length <= INLINE_LIMIT / 2);
  const large = mail.attachments.filter((a) => a.content.length > INLINE_LIMIT / 2);
  const draftRes = await graphFetch(`${base}/messages`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ ...message, attachments: small.map(fileAttachment) }),
  });
  if (!draftRes.ok) throw new Error(await graphError(draftRes, errCtx));
  const draft = (await draftRes.json()) as { id: string };
  const msgUrl = `${base}/messages/${encodeURIComponent(draft.id)}`;

  for (const a of large) {
    const sessionRes = await graphFetch(`${msgUrl}/attachments/createUploadSession`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ AttachmentItem: { attachmentType: 'file', name: a.name, size: a.content.length, contentType: a.contentType } }),
    });
    if (!sessionRes.ok) throw new Error(await graphError(sessionRes, errCtx));
    const { uploadUrl } = (await sessionRes.json()) as { uploadUrl: string };
    for (let start = 0; start < a.content.length; start += UPLOAD_CHUNK) {
      const chunk = a.content.subarray(start, Math.min(start + UPLOAD_CHUNK, a.content.length));
      // The upload URL is pre-authorised; sending the bearer token here is rejected.
      const put = await graphFetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': String(chunk.length),
          'Content-Range': `bytes ${start}-${start + chunk.length - 1}/${a.content.length}`,
          'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(chunk),
      });
      if (!put.ok) throw new Error(await graphError(put));
    }
  }

  const sendRes = await graphFetch(`${msgUrl}/send`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (!sendRes.ok) throw new Error(await graphError(sendRes, errCtx));
}

function envSmtp() {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host || !from) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from,
    security: 'auto' as const,
  };
}

function smtpSettings(config: MailConfig, secrets: MailSecrets) {
  if (config.provider === 'smtp' && config.smtp.host) {
    return {
      host: config.smtp.host,
      port: config.smtp.port,
      user: config.smtp.user,
      pass: secrets.smtpPassword || '',
      from: config.smtp.from || config.smtp.user,
      security: config.smtp.security,
    };
  }
  return envSmtp();
}

function smtpTransport(s: NonNullable<ReturnType<typeof smtpSettings>>) {
  return nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.security === 'ssl' || (s.security === 'auto' && s.port === 465),
    requireTLS: s.security === 'starttls',
    auth: s.user ? { user: s.user, pass: s.pass } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 45_000,
  });
}

async function sendViaSmtp(config: MailConfig, secrets: MailSecrets, mail: OutgoingMail) {
  const s = smtpSettings(config, secrets);
  if (!s) throw new Error('SMTP is not configured.');
  const transporter = smtpTransport(s);
  const address = mail.from || s.from;
  const name = (mail.fromName || config.fromName).replace(/"/g, '');
  const mailbox = (s.from.match(/<([^>]+)>/)?.[1] || s.from).trim();
  await transporter.sendMail({
    from: name && !address.includes('<') ? `"${name}" <${address}>` : address,
    // Bounces and SPF stay on the authenticated mailbox; the header From can be any address it may Send As.
    envelope: address !== mailbox ? { from: mailbox, to: [...mail.to, ...mail.cc, ...mail.bcc] } : undefined,
    to: mail.to,
    cc: mail.cc.length ? mail.cc : undefined,
    bcc: mail.bcc.length ? mail.bcc : undefined,
    replyTo: mail.replyTo.length ? mail.replyTo : undefined,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    attachments: mail.attachments.map((a) => ({ filename: a.name, content: a.content, contentType: a.contentType })),
  });
}

/** Provider actually used: saved choice, else legacy SMTP_* env vars, else off. */
export function effectiveProvider(config: MailConfig, saved: boolean): MailProvider {
  if (saved) return config.provider;
  return envSmtp() ? 'smtp' : 'off';
}

export async function deliver(
  provider: MailProvider,
  config: MailConfig,
  secrets: MailSecrets,
  mail: OutgoingMail
): Promise<SendResult> {
  try {
    if (provider === 'off') return { ok: false, provider, error: 'Email sending is turned off.' };
    if (provider === 'graph') await sendViaGraph(config, secrets, mail);
    else await sendViaSmtp(config, secrets, mail);
    return { ok: true, provider };
  } catch (err) {
    return { ok: false, provider, error: err instanceof Error ? err.message : String(err) };
  }
}

export type FromCheck = {
  status: 'ok' | 'rewritten' | 'unverified';
  expected: string;
  actual?: string;
  note: string;
};

/**
 * Reads the just-sent message back from Sent Items and compares its From with what we asked for.
 * Exchange silently falls back to the sending mailbox when "Send As" is missing, so this is the only reliable check.
 */
export async function verifySentFrom(config: MailConfig, secrets: MailSecrets, subject: string, expected: string): Promise<FromCheck> {
  const sender = config.graph.senderMailbox;
  if (!config.saveToSentItems) {
    return { status: 'unverified', expected, note: 'Turn on “Keep a copy in Sent Items” to verify the From address automatically.' };
  }
  try {
    const token = await getGraphToken(config, secrets);
    const url =
      `${GRAPH}/users/${encodeURIComponent(sender)}/mailFolders/sentitems/messages` +
      `?$top=15&$select=subject,from,sender,sentDateTime&$orderby=sentDateTime desc`;
    for (let attempt = 0; attempt < 6; attempt++) {
      await new Promise((r) => setTimeout(r, attempt ? 2500 : 1500));
      const res = await graphFetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 403) {
        return {
          status: 'unverified',
          expected,
          note: `Sent, but the app can’t read ${sender}’s Sent Items to confirm the From address (needs Mail.ReadWrite on the mailbox). Check the received email.`,
        };
      }
      if (!res.ok) break;
      const data = (await res.json()) as { value?: Array<{ subject?: string; from?: { emailAddress?: { address?: string } } }> };
      const hit = data.value?.find((m) => m.subject === subject);
      if (hit) {
        const actual = (hit.from?.emailAddress?.address || '').toLowerCase();
        return actual === expected.toLowerCase()
          ? { status: 'ok', expected, actual, note: `Delivered from ${actual}.` }
          : {
              status: 'rewritten',
              expected,
              actual,
              note: `Exchange sent this from ${actual}, not ${expected}. Give ${sender} “Send As” on ${expected} (Connection shows the command).`,
            };
      }
    }
  } catch {
    // fall through
  }
  return { status: 'unverified', expected, note: 'Sent; the copy in Sent Items wasn’t visible yet, so the From address couldn’t be confirmed.' };
}

/** Connectivity check without sending: Graph token acquisition, or SMTP handshake + auth. */
export async function verifyConnection(provider: MailProvider, config: MailConfig, secrets: MailSecrets) {
  if (provider === 'graph') {
    const roles = tokenRoles(await getGraphToken(config, secrets));
    const grants = roles.length
      ? `Entra permissions on the app: ${roles.join(', ')}.`
      : 'No Entra permissions on the app, so mailbox access must come from Exchange (“Application Mail.Send” on the sender mailbox).';
    return `Signed in to Microsoft 365 (token issued). ${grants} Send a test email to confirm mailbox permission.`;
  }
  if (provider === 'smtp') {
    const s = smtpSettings(config, secrets);
    if (!s) throw new Error('SMTP is not configured.');
    await smtpTransport(s).verify();
    return `Connected to ${s.host}:${s.port} and authenticated.`;
  }
  throw new Error('Email sending is turned off.');
}
