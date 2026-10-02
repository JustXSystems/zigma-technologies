import { getThemeSettings } from '@/lib/cms';
import { mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';
import {
  MAIL_EVENTS,
  parseAddressList,
  type MailConfig,
  type MailEventKey,
  type MailProvider,
  type MailSecrets,
  type MailTemplate,
} from '@/lib/mail-config';
import {
  SAMPLE_PAYLOADS,
  bodyToHtml,
  buildMailVars,
  escapeHtml,
  htmlToText,
  renderTemplate,
  wrapEmailHtml,
  type MailVars,
} from '@/lib/mail-template';
import { getMailSettings, getMailLogMessage, insertMailLog, readMailAttachment, updateMailLog } from '@/lib/mail-store';
import { deliver, effectiveProvider, type OutgoingAttachment, type OutgoingMail } from '@/lib/mail-transport';
import { readResumeFile } from '@/lib/resumes';

type AttachmentRef = { kind: 'resume'; stored: string; name: string; mime: string } | { kind: 'static'; id: string; name: string; mime: string };

/** What the log keeps so a failed send can be retried without re-rendering. */
type LoggedMessage = Omit<OutgoingMail, 'attachments'> & { attachments: AttachmentRef[] };

type MailContext = {
  config: MailConfig;
  secrets: MailSecrets;
  provider: MailProvider;
  /** No saved Email settings yet: honour the legacy Site Settings switches. */
  legacy: boolean;
  site: SiteSettings;
};

async function loadContext(): Promise<MailContext> {
  const [stored, theme] = await Promise.all([getMailSettings(), getThemeSettings()]);
  return {
    config: stored.config,
    secrets: stored.secrets,
    provider: effectiveProvider(stored.config, stored.saved),
    legacy: !stored.saved,
    site: mergeSiteSettings(theme.site),
  };
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
}

function fieldMatches(rule: MailTemplate['routes'][number], vars: MailVars) {
  const actual = (vars[rule.field] || '').trim().toLowerCase();
  const expected = rule.value.trim().toLowerCase();
  if (rule.op === 'not_empty') return actual !== '';
  if (rule.op === 'contains') return expected !== '' && actual.includes(expected);
  return actual === expected;
}

function resolveRecipients(tpl: MailTemplate, vars: MailVars) {
  let to = parseAddressList(renderTemplate(tpl.to, vars, false));
  let cc = parseAddressList(renderTemplate(tpl.cc, vars, false));
  for (const rule of tpl.routes) {
    if (!rule.field || !fieldMatches(rule, vars)) continue;
    const ruleTo = parseAddressList(renderTemplate(rule.to, vars, false));
    const ruleCc = parseAddressList(renderTemplate(rule.cc, vars, false));
    if (rule.mode === 'replace') {
      to = ruleTo.length ? ruleTo : to;
      cc = ruleCc;
    } else {
      to = [...new Set([...to, ...ruleTo])];
      cc = [...new Set([...cc, ...ruleCc])];
    }
  }
  const bcc = parseAddressList(renderTemplate(tpl.bcc, vars, false));
  const replyTo = parseAddressList(renderTemplate(tpl.replyTo, vars, false)).slice(0, 1);
  return { to, cc: cc.filter((a) => !to.includes(a)), bcc, replyTo };
}

export function renderMail(tpl: MailTemplate, vars: MailVars, config: MailConfig, companyName: string) {
  const subject = renderTemplate(tpl.subject, vars, false).replace(/\s+/g, ' ').trim();
  const bodyHtml = bodyToHtml(renderTemplate(tpl.body, vars, true), config.brandColor);
  const html = wrapEmailHtml({ bodyHtml, subject, companyName, siteUrl: vars.site_url || siteUrl(), accent: config.brandColor });
  return { subject, html, text: htmlToText(bodyHtml) };
}

async function loadAttachments(refs: AttachmentRef[]): Promise<{ files: OutgoingAttachment[]; missing: string[] }> {
  const files: OutgoingAttachment[] = [];
  const missing: string[] = [];
  for (const ref of refs) {
    const content =
      ref.kind === 'resume' ? (await readResumeFile(ref.stored))?.buffer ?? null : await readMailAttachment(ref.id);
    if (content) files.push({ name: ref.name, contentType: ref.mime || 'application/octet-stream', content });
    else missing.push(ref.name);
  }
  return { files, missing };
}

async function sendAndLog(ctx: MailContext, event: string, message: LoggedMessage, refId: number | null) {
  const { files, missing } = await loadAttachments(message.attachments);
  const result = await deliver(ctx.provider, ctx.config, ctx.secrets, { ...message, attachments: files });
  const error = result.ok ? (missing.length ? `Sent without missing attachment(s): ${missing.join(', ')}` : null) : result.error;
  await insertMailLog({
    event,
    provider: ctx.provider,
    status: result.ok ? 'sent' : ctx.provider === 'off' ? 'skipped' : 'failed',
    to: message.to,
    cc: message.cc,
    subject: message.subject,
    error,
    refId,
    message,
  }).catch((err) => console.error('[mail-log]', err));
  if (!result.ok && ctx.provider !== 'off') console.error(`[mail] ${event} failed:`, result.error);
  return result;
}

async function dispatchEvent(
  ctx: MailContext,
  event: MailEventKey,
  vars: MailVars,
  refId: number,
  resume?: { stored: string; name: string; mime: string }
) {
  const tpl = ctx.config.templates[event];
  const audience = MAIL_EVENTS.find((e) => e.key === event)?.audience;
  if (!tpl.enabled) return;
  if (ctx.legacy) {
    if (audience === 'team' && ctx.site.enquiryNotifyEnabled.trim().toLowerCase() === 'false') return;
    if (audience === 'visitor' && ctx.site.visitorAutoReplyEnabled.trim().toLowerCase() === 'false') return;
  }
  const rcpt = resolveRecipients(tpl, vars);
  // Visitors without an email address (e.g. callback requests) simply get no auto-reply.
  if (!rcpt.to.length) {
    if (audience === 'team') {
      await insertMailLog({
        event,
        provider: ctx.provider,
        status: 'skipped',
        to: [],
        cc: [],
        subject: renderTemplate(tpl.subject, vars, false),
        error: 'No valid recipients — check the To field / Site Settings notify list.',
        refId,
      }).catch(() => undefined);
    }
    return;
  }
  const rendered = renderMail(tpl, vars, ctx.config, ctx.site.companyName);
  const attachments: AttachmentRef[] = [
    ...(tpl.attachResume && resume ? [{ kind: 'resume' as const, ...resume }] : []),
    ...tpl.attachments.map((a) => ({ kind: 'static' as const, id: a.id, name: a.name, mime: a.mime })),
  ];
  await sendAndLog(ctx, event, { ...rcpt, ...rendered, attachments }, refId);
}

/** Fire-and-forget notifications for a stored website submission (enquiry, callback, brochure, careers). */
export async function notifySubmission(input: {
  kind: 'enquiry' | 'careers';
  id: number;
  itemType: string;
  payload: Record<string, unknown>;
  resume?: { stored: string; name: string; mime: string };
}) {
  try {
    const ctx = await loadContext();
    const vars = buildMailVars({
      kind: input.kind,
      id: input.id,
      itemType: input.itemType,
      payload: input.payload,
      site: {
        companyName: ctx.site.companyName,
        phone: ctx.site.phone,
        supportEmail: ctx.site.supportEmail,
        notifyEmails: ctx.site.enquiryNotifyEmail,
        siteUrl: siteUrl(),
      },
    });
    for (const e of MAIL_EVENTS.filter((ev) => ev.kind === input.kind)) {
      await dispatchEvent(ctx, e.key, vars, input.id, input.resume);
    }
  } catch (err) {
    console.error(`[mail] ${input.kind} #${input.id} notification failed`, err);
  }
}

/** Admin test: render `event` (or a plain test message) with sample data and send it to `to`. */
export async function sendTestEmail(to: string, event?: MailEventKey) {
  const ctx = await loadContext();
  const recipients = parseAddressList(to);
  if (!recipients.length) throw new Error('Enter a valid test recipient.');
  const meta = MAIL_EVENTS.find((e) => e.key === event);
  let rendered: { subject: string; html: string; text: string };
  const attachments: AttachmentRef[] = [];
  if (meta && event) {
    const vars = buildMailVars({
      kind: meta.kind,
      id: 1024,
      itemType: 'product',
      payload: SAMPLE_PAYLOADS[meta.kind],
      site: {
        companyName: ctx.site.companyName,
        phone: ctx.site.phone,
        supportEmail: ctx.site.supportEmail,
        notifyEmails: ctx.site.enquiryNotifyEmail,
        siteUrl: siteUrl(),
      },
    });
    const tpl = ctx.config.templates[event];
    rendered = renderMail(tpl, vars, ctx.config, ctx.site.companyName);
    rendered.subject = `[TEST] ${rendered.subject}`;
    attachments.push(...tpl.attachments.map((a) => ({ kind: 'static' as const, id: a.id, name: a.name, mime: a.mime })));
  } else {
    const body = `<p>This is a test email from the <strong>${escapeHtml(ctx.site.companyName)}</strong> website.</p><p>Provider: <strong>${
      ctx.provider === 'graph' ? 'Microsoft 365 (Graph API)' : ctx.provider.toUpperCase()
    }</strong>${ctx.provider === 'graph' ? ` · Sender: ${escapeHtml(ctx.config.graph.senderMailbox)}` : ''}</p><p>If you can read this, website email delivery is working.</p>`;
    const html = wrapEmailHtml({ bodyHtml: body, subject: 'Website email test', companyName: ctx.site.companyName, siteUrl: siteUrl(), accent: ctx.config.brandColor });
    rendered = { subject: `Website email test — ${ctx.site.companyName}`, html, text: htmlToText(body) };
  }
  return sendAndLog(ctx, event ? `test:${event}` : 'test', { to: recipients, cc: [], bcc: [], replyTo: [], ...rendered, attachments }, null);
}

/** Re-send a logged message exactly as rendered originally. */
export async function retryLoggedMail(id: number) {
  const entry = await getMailLogMessage(id);
  if (!entry?.message) throw new Error('This log entry has no stored message to retry.');
  const ctx = await loadContext();
  const message = entry.message as LoggedMessage;
  const { files, missing } = await loadAttachments(message.attachments || []);
  const result = await deliver(ctx.provider, ctx.config, ctx.secrets, { ...message, attachments: files });
  const error = result.ok ? (missing.length ? `Sent without missing attachment(s): ${missing.join(', ')}` : null) : result.error;
  await updateMailLog(id, result.ok ? 'sent' : 'failed', error);
  return result;
}
