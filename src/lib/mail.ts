import type { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { getThemeSettings } from '@/lib/cms';
import { mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';
import { brandAccentHex } from '@/lib/theme-tokens';
import {
  MAIL_EVENTS,
  effectiveFrom,
  emailAccent,
  parseAddressList,
  resolveNotifyEmails,
  type MailConfig,
  type MailEventKey,
  type MailProvider,
  type MailSecrets,
} from '@/lib/mail-config';
import { composeMail } from '@/lib/mail-engine';
import {
  SAMPLE_PAYLOADS,
  buildMailVars,
  escapeHtml,
  htmlToText,
  submissionKind,
  wrapEmailHtml,
  type MailVars,
  type SiteVars,
  type SubmissionKind,
} from '@/lib/mail-template';
import { getMailSettings, getMailLogMessage, insertMailLog, readMailAttachment, updateMailLog } from '@/lib/mail-store';
import { deliver, effectiveProvider, verifySentFrom, type FromCheck, type OutgoingAttachment, type OutgoingMail } from '@/lib/mail-transport';
import { parseJsonField } from '@/lib/types';
import { readResumeFile } from '@/lib/resumes';

type AttachmentRef =
  | { kind: 'resume'; stored: string; name: string; mime: string }
  | { kind: 'static'; id: string; name: string; mime: string }
  | { kind: 'bytes'; name: string; mime: string; content: Buffer };

/** What the log keeps so a failed send can be retried without re-rendering. */
type LoggedMessage = Omit<OutgoingMail, 'attachments'> & { attachments: AttachmentRef[] };

type MailContext = {
  config: MailConfig;
  secrets: MailSecrets;
  provider: MailProvider;
  site: SiteSettings;
  accent: string;
};

type ResumeRef = { stored: string; name: string; mime: string };

async function loadContext(): Promise<MailContext> {
  const [stored, theme] = await Promise.all([getMailSettings(), getThemeSettings()]);
  return {
    config: stored.config,
    secrets: stored.secrets,
    provider: effectiveProvider(stored.config, stored.saved),
    site: mergeSiteSettings(theme.site),
    accent: emailAccent(stored.config, brandAccentHex(theme.tokens)),
  };
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
}

function siteVars(site: SiteSettings, config: MailConfig): SiteVars {
  return {
    companyName: site.companyName,
    phone: site.phone,
    supportEmail: site.supportEmail,
    notifyEmails: resolveNotifyEmails(config, site.enquiryNotifyEmail),
    siteUrl: siteUrl(),
  };
}

async function catalogTitle(itemId: number | null | undefined): Promise<string> {
  if (!itemId) return '';
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT title FROM catalog_items WHERE id = ? LIMIT 1', [itemId]);
    return rows[0]?.title ? String(rows[0].title) : '';
  } catch {
    return '';
  }
}

/** Built-in + form-field variables for a stored submission (admin preview and "test with this submission"). */
export async function loadSubmissionVars(id: number, context?: Pick<MailContext, 'site' | 'config'>) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, item_id, item_type, payload_json, created_at FROM enquiries WHERE id = ? LIMIT 1',
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  const payload = parseJsonField<Record<string, unknown>>(row.payload_json, {});
  const kind = submissionKind(payload);
  const { site, config } = context || (await loadContext());
  const vars = buildMailVars({
    kind,
    id: Number(row.id),
    itemType: kind === 'careers' ? 'careers' : String(row.item_type || 'general'),
    itemTitle: await catalogTitle(row.item_id),
    payload,
    site: siteVars(site, config),
    submittedAt: row.created_at ? new Date(row.created_at) : undefined,
  });
  const resume: ResumeRef | undefined =
    typeof payload.resume_file === 'string' && payload.resume_file
      ? { stored: payload.resume_file, name: String(payload.resume_name || payload.resume_file), mime: String(payload.resume_mime || '') }
      : undefined;
  return { kind, vars, resume };
}

async function loadAttachments(refs: AttachmentRef[]): Promise<{ files: OutgoingAttachment[]; missing: string[] }> {
  const files: OutgoingAttachment[] = [];
  const missing: string[] = [];
  for (const ref of refs) {
    let content: Buffer | null = null;
    if (ref.kind === 'bytes') content = ref.content;
    else if (ref.kind === 'resume') content = (await readResumeFile(ref.stored))?.buffer ?? null;
    else content = await readMailAttachment(ref.id);
    if (content) files.push({ name: ref.name, contentType: ref.mime || 'application/octet-stream', content });
    else missing.push(ref.name);
  }
  return { files, missing };
}

async function sendAndLog(ctx: MailContext, event: string, message: LoggedMessage, refId: number | null) {
  const { files, missing } = await loadAttachments(message.attachments).catch(() => ({
    files: [] as OutgoingAttachment[],
    missing: message.attachments.map((a) => a.name),
  }));
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

function attachmentRefs(ctx: MailContext, event: MailEventKey, resume?: ResumeRef): AttachmentRef[] {
  const tpl = ctx.config.templates[event];
  return [
    ...(tpl.attachResume && resume ? [{ kind: 'resume' as const, ...resume }] : []),
    ...tpl.attachments.map((a) => ({ kind: 'static' as const, id: a.id, name: a.name, mime: a.mime })),
  ];
}

async function dispatchEvent(ctx: MailContext, event: MailEventKey, base: MailVars, refId: number, resume?: ResumeRef) {
  const tpl = ctx.config.templates[event];
  const audience = MAIL_EVENTS.find((e) => e.key === event)?.audience;
  if (!tpl.enabled) return;
  const mail = composeMail({ config: ctx.config, tpl, base, companyName: ctx.site.companyName, siteUrl: siteUrl(), accent: ctx.accent });
  if (!mail.send) {
    // Visitors without an email address (e.g. callback requests) simply get no auto-reply; conditions are intentional.
    if (audience === 'team' && mail.to.length === 0) {
      await insertMailLog({
        event,
        provider: ctx.provider,
        status: 'skipped',
        to: [],
        cc: [],
        subject: mail.subject,
        error: 'No valid recipients — check the To field / the notify list in Email → Variables.',
        refId,
      }).catch(() => undefined);
    }
    return;
  }
  await sendAndLog(
    ctx,
    event,
    {
      from: mail.from,
      fromName: mail.fromName,
      to: mail.to,
      cc: mail.cc,
      bcc: mail.bcc,
      replyTo: mail.replyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: attachmentRefs(ctx, event, resume),
    },
    refId
  );
}

/**
 * Best-effort notifications for a submission that is already stored in `enquiries`.
 * Never throws: email being off, misconfigured or down must not affect the visitor or the admin inbox.
 */
export async function notifySubmission(input: {
  kind: SubmissionKind;
  id: number;
  itemType: string;
  itemId?: number | null;
  itemTitle?: string;
  payload: Record<string, unknown>;
  resume?: ResumeRef;
}) {
  try {
    const ctx = await loadContext();
    if (ctx.provider === 'off') return;
    const vars = buildMailVars({
      kind: input.kind,
      id: input.id,
      itemType: input.itemType,
      itemTitle: input.itemTitle || (await catalogTitle(input.itemId)),
      payload: input.payload,
      site: siteVars(ctx.site, ctx.config),
    });
    for (const e of MAIL_EVENTS.filter((ev) => ev.kind === input.kind && !ev.manualOnly)) {
      try {
        await dispatchEvent(ctx, e.key, vars, input.id, input.resume);
      } catch (err) {
        console.error(`[mail] ${e.key} for ${input.kind} #${input.id} failed`, err);
      }
    }
  } catch (err) {
    console.error(`[mail] ${input.kind} #${input.id} notification failed`, err);
  }
}

export type TestSendResult = { ok: boolean; error?: string; fromCheck?: FromCheck; from: string; note?: string };

/**
 * Admin test: render `event` with sample data (or a real submission) and send it only to `to`.
 * Without an event, sends a plain connectivity message from the default From address.
 */
export async function sendTestEmail(to: string, event?: MailEventKey, submissionId?: number): Promise<TestSendResult> {
  const ctx = await loadContext();
  const recipients = parseAddressList(to);
  if (!recipients.length) throw new Error('Enter a valid test recipient.');
  const meta = MAIL_EVENTS.find((e) => e.key === event);
  const ref = Math.random().toString(36).slice(2, 6).toUpperCase();
  let message: LoggedMessage;
  let note: string | undefined;

  if (meta && event) {
    const tpl = ctx.config.templates[event];
    let base: MailVars;
    let resume: ResumeRef | undefined;
    const real = submissionId ? await loadSubmissionVars(submissionId, ctx) : null;
    if (real && real.kind === meta.kind) {
      base = real.vars;
      resume = real.resume;
    } else {
      base = buildMailVars({
        kind: meta.kind,
        id: 1024,
        itemType: meta.kind === 'careers' ? 'careers' : 'product',
        itemTitle: meta.kind === 'careers' ? '' : '200 kVA Modular UPS',
        payload: SAMPLE_PAYLOADS[meta.kind],
        site: siteVars(ctx.site, ctx.config),
      });
    }
    const mail = composeMail({
      config: ctx.config,
      tpl: { ...tpl, enabled: true },
      base,
      companyName: ctx.site.companyName,
      siteUrl: siteUrl(),
      accent: ctx.accent,
    });
    if (!mail.send && mail.skipReason) note = `In production this would be skipped: ${mail.skipReason}`;
    message = {
      from: mail.from,
      fromName: mail.fromName,
      to: recipients,
      cc: [],
      bcc: [],
      replyTo: mail.replyTo,
      subject: `[TEST ${ref}] ${mail.subject}`,
      html: mail.html,
      text: mail.text,
      attachments: attachmentRefs(ctx, event, resume),
    };
  } else {
    const from = effectiveFrom(ctx.config);
    const body = `<p>This is a test email from the <strong>${escapeHtml(ctx.site.companyName)}</strong> website.</p><p>Provider: <strong>${
      ctx.provider === 'graph' ? 'Microsoft 365 (Graph API)' : ctx.provider.toUpperCase()
    }</strong>${ctx.provider === 'graph' ? ` · Sending mailbox: ${escapeHtml(ctx.config.graph.senderMailbox)}` : ''} · From: ${escapeHtml(from)}</p><p>If you can read this, website email delivery is working.</p>`;
    const subject = `[TEST ${ref}] Website email test — ${ctx.site.companyName}`;
    const html = wrapEmailHtml({ bodyHtml: body, subject, companyName: ctx.site.companyName, siteUrl: siteUrl(), accent: ctx.accent });
    message = { from, fromName: ctx.config.fromName, to: recipients, cc: [], bcc: [], replyTo: [], subject, html, text: htmlToText(body), attachments: [] };
  }

  const result = await sendAndLog(ctx, event ? `test:${event}` : 'test', message, submissionId || null);
  if (!result.ok) return { ok: false, error: result.error, from: message.from || '' };
  const fromCheck =
    ctx.provider === 'graph' && message.from
      ? await verifySentFrom(ctx.config, ctx.secrets, message.subject, message.from)
      : undefined;
  return { ok: true, fromCheck, from: message.from || '', note };
}

/**
 * Applicant email when HR moves a pipeline stage. Best-effort; never throws.
 * Optional .ics attached when stage is interview and interviewAt is set.
 */
export async function notifyCandidateStageChange(input: {
  candidateId: number;
  name: string;
  email?: string | null;
  jobTitle: string;
  stage: string;
  fromStage: string;
  interviewAt?: string | null;
  interviewer?: string | null;
  enquiryId?: number | null;
  stageLabel: string;
  fromStageLabel: string;
}) {
  try {
    const email = (input.email || '').trim();
    if (!email) return;
    const ctx = await loadContext();
    if (ctx.provider === 'off') return;
    const interviewFriendly = input.interviewAt
      ? new Date(input.interviewAt).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Kolkata',
        })
      : '';
    const vars = buildMailVars({
      kind: 'careers',
      id: input.enquiryId || input.candidateId,
      itemType: 'careers',
      itemTitle: input.jobTitle,
      payload: {
        name: input.name,
        email,
        role: input.jobTitle,
        job_title: input.jobTitle,
        source: 'careers_stage',
        stage: input.stage,
        stage_label: input.stageLabel,
        stage_from: input.fromStage,
        stage_from_label: input.fromStageLabel,
        interview_at: interviewFriendly,
        interviewer: input.interviewer || '',
        hiring_url: `/admin/hiring?tab=pipeline`,
      },
      site: siteVars(ctx.site, ctx.config),
    });
    const event: MailEventKey = 'careers_stage';
    const tpl = ctx.config.templates[event];
    if (!tpl.enabled) return;
    const mail = composeMail({
      config: ctx.config,
      tpl,
      base: vars,
      companyName: ctx.site.companyName,
      siteUrl: siteUrl(),
      accent: ctx.accent,
    });
    if (!mail.send) return;

    const attachments: AttachmentRef[] = [...attachmentRefs(ctx, event)];
    if (input.stage === 'interview' && input.interviewAt) {
      const { buildInterviewIcs } = await import('@/lib/career-ics');
      const ics = buildInterviewIcs({
        title: input.jobTitle,
        candidateName: input.name,
        interviewAt: input.interviewAt,
        interviewer: input.interviewer,
      });
      if (ics) attachments.push({ kind: 'bytes', name: ics.filename, mime: ics.mime, content: ics.content });
    }

    const logged: LoggedMessage = {
      from: mail.from,
      fromName: mail.fromName,
      to: mail.to,
      cc: mail.cc,
      bcc: mail.bcc,
      replyTo: mail.replyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      // Persist only durable refs — inline .ics is send-once
      attachments: attachments.filter((a) => a.kind !== 'bytes'),
    };
    const { files, missing } = await loadAttachments(attachments);
    const result = await deliver(ctx.provider, ctx.config, ctx.secrets, { ...logged, attachments: files });
    const error = result.ok
      ? missing.length
        ? `Sent without missing attachment(s): ${missing.join(', ')}`
        : null
      : result.error;
    await insertMailLog({
      event,
      provider: ctx.provider,
      status: result.ok ? 'sent' : 'failed',
      to: logged.to,
      cc: logged.cc,
      subject: logged.subject,
      error,
      refId: input.enquiryId || input.candidateId,
      message: logged,
    }).catch((err) => console.error('[mail-log]', err));
  } catch (err) {
    console.error(`[mail] careers_stage for candidate #${input.candidateId} failed`, err);
  }
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
