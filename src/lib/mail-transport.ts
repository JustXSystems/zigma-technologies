import nodemailer from 'nodemailer';
import type { MailConfig, MailProvider, MailSecrets } from '@/lib/mail-config';

export type OutgoingAttachment = { name: string; contentType: string; content: Buffer };

export type OutgoingMail = {
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

function friendlyGraphError(status: number, code: string, message: string): string {
  const raw = `${code} ${message}`;
  if (/AADSTS7000215|AADSTS7000222/.test(raw)) return 'Client secret is invalid or expired. Create a new secret and paste it in Connection.';
  if (/AADSTS700016/.test(raw)) return 'Client (application) ID was not found in this tenant. Check the Client ID and Tenant ID.';
  if (/AADSTS90002|AADSTS900023/.test(raw)) return 'Tenant ID not found. Use the Directory (tenant) ID GUID or your tenant domain.';
  if (/AADSTS53003/.test(raw)) {
    return 'Blocked by an Entra Conditional Access policy for workload identities. Exclude this app (or allow the server’s IP) in Entra → Conditional Access.';
  }
  if (status === 403 || /ErrorAccessDenied|AccessDenied/i.test(raw)) {
    return 'Access denied for this mailbox. Grant the app “Application Mail.Send” (and Mail.ReadWrite for large attachments) on the sender mailbox — the setup script does this. New permissions can take up to 2 hours to apply.';
  }
  if (status === 404 || /MailboxNotEnabledForRESTAPI|ResourceNotFound|ErrorInvalidUser/i.test(raw)) {
    return 'Sender mailbox not found or not an Exchange Online mailbox. Use a licensed user or a shared mailbox address.';
  }
  return `${status} ${code}: ${message}`.trim();
}

async function graphFetch(url: string, init: RequestInit, attempt = 1): Promise<Response> {
  const res = await fetch(url, init);
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    const retryAfter = Number(res.headers.get('retry-after')) || attempt * 2;
    await new Promise((r) => setTimeout(r, Math.min(retryAfter, 10) * 1000));
    return graphFetch(url, init, attempt + 1);
  }
  return res;
}

async function graphError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string } | string;
    error_description?: string;
  };
  if (typeof data.error === 'string') return friendlyGraphError(res.status, data.error, data.error_description || '');
  return friendlyGraphError(res.status, data.error?.code || '', data.error?.message || res.statusText);
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
  const message = {
    subject: mail.subject,
    body: { contentType: 'HTML', content: mail.html },
    from: { emailAddress: { address: sender, name: config.fromName || undefined } },
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
    if (!res.ok) throw new Error(await graphError(res));
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
  if (!draftRes.ok) throw new Error(await graphError(draftRes));
  const draft = (await draftRes.json()) as { id: string };
  const msgUrl = `${base}/messages/${encodeURIComponent(draft.id)}`;

  for (const a of large) {
    const sessionRes = await graphFetch(`${msgUrl}/attachments/createUploadSession`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ AttachmentItem: { attachmentType: 'file', name: a.name, size: a.content.length, contentType: a.contentType } }),
    });
    if (!sessionRes.ok) throw new Error(await graphError(sessionRes));
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
  if (!sendRes.ok) throw new Error(await graphError(sendRes));
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

async function sendViaSmtp(config: MailConfig, secrets: MailSecrets, mail: OutgoingMail) {
  const s = smtpSettings(config, secrets);
  if (!s) throw new Error('SMTP is not configured.');
  const transporter = nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.security === 'ssl' || (s.security === 'auto' && s.port === 465),
    requireTLS: s.security === 'starttls',
    auth: s.user ? { user: s.user, pass: s.pass } : undefined,
  });
  const from = config.fromName && !s.from.includes('<') ? `"${config.fromName.replace(/"/g, '')}" <${s.from}>` : s.from;
  await transporter.sendMail({
    from,
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

/** Connectivity check without sending: Graph token acquisition, or SMTP handshake + auth. */
export async function verifyConnection(provider: MailProvider, config: MailConfig, secrets: MailSecrets) {
  if (provider === 'graph') {
    await getGraphToken(config, secrets);
    return 'Signed in to Microsoft 365 (token issued). Send a test email to confirm mailbox permission.';
  }
  if (provider === 'smtp') {
    const s = smtpSettings(config, secrets);
    if (!s) throw new Error('SMTP is not configured.');
    await nodemailer
      .createTransport({
        host: s.host,
        port: s.port,
        secure: s.security === 'ssl' || (s.security === 'auto' && s.port === 465),
        requireTLS: s.security === 'starttls',
        auth: s.user ? { user: s.user, pass: s.pass } : undefined,
      })
      .verify();
    return `Connected to ${s.host}:${s.port} and authenticated.`;
  }
  throw new Error('Email sending is turned off.');
}
