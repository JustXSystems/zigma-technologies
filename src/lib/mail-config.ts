/** Email integration model shared by the admin UI and the server (no server-only imports). */

export type MailProvider = 'graph' | 'smtp' | 'off';

export type MailEventKey = 'enquiry_team' | 'enquiry_visitor' | 'careers_team' | 'careers_applicant';

export type MailRouteRule = {
  /** Submitted field to test, e.g. role, source, item_type, subject */
  field: string;
  op: 'equals' | 'contains' | 'not_empty';
  value: string;
  /** Recipients (comma-separated, tokens allowed) used when the rule matches */
  to: string;
  cc: string;
  /** add = append to the template recipients; replace = use only these */
  mode: 'add' | 'replace';
};

export type MailStaticAttachment = { id: string; name: string; size: number; mime: string };

export type MailTemplate = {
  enabled: boolean;
  to: string;
  cc: string;
  bcc: string;
  replyTo: string;
  subject: string;
  /** HTML (or plain text — blank lines become paragraphs). Supports {{tokens}} and {{#if x}}…{{else}}…{{/if}}. */
  body: string;
  /** Careers only: attach the applicant's uploaded CV */
  attachResume: boolean;
  attachments: MailStaticAttachment[];
  routes: MailRouteRule[];
};

export type MailConfig = {
  provider: MailProvider;
  graph: {
    tenantId: string;
    clientId: string;
    /** Shared mailbox the app sends as, e.g. website@zigma-technologies.com */
    senderMailbox: string;
    /** ISO date the client secret expires — drives the renewal reminder */
    secretExpiresOn: string;
  };
  smtp: { host: string; port: number; security: 'auto' | 'ssl' | 'starttls'; user: string; from: string };
  fromName: string;
  saveToSentItems: boolean;
  testRecipient: string;
  /** Accent colour for the branded email layout */
  brandColor: string;
  templates: Record<MailEventKey, MailTemplate>;
};

/** Secret material — stored encrypted, never returned to the browser. */
export type MailSecrets = { graphClientSecret?: string; smtpPassword?: string };

export const MAIL_EVENTS: Array<{
  key: MailEventKey;
  kind: 'enquiry' | 'careers';
  audience: 'team' | 'visitor';
  label: string;
  description: string;
}> = [
  {
    key: 'enquiry_team',
    kind: 'enquiry',
    audience: 'team',
    label: 'New enquiry → team',
    description: 'Every enquiry, quote, callback and brochure request submitted on the website.',
  },
  {
    key: 'enquiry_visitor',
    kind: 'enquiry',
    audience: 'visitor',
    label: 'Enquiry auto-reply → visitor',
    description: 'Confirmation sent to the visitor (only when they gave an email address).',
  },
  {
    key: 'careers_team',
    kind: 'careers',
    audience: 'team',
    label: 'New application → HR',
    description: 'Careers applications, optionally with the CV attached.',
  },
  {
    key: 'careers_applicant',
    kind: 'careers',
    audience: 'visitor',
    label: 'Application auto-reply → applicant',
    description: 'Confirmation sent to the applicant.',
  },
];

export const MAIL_VARIABLES: Array<{ token: string; label: string; kinds?: Array<'enquiry' | 'careers'> }> = [
  { token: 'name', label: 'Name' },
  { token: 'email', label: 'Email' },
  { token: 'phone', label: 'Phone' },
  { token: 'company', label: 'Company', kinds: ['enquiry'] },
  { token: 'subject', label: 'Subject', kinds: ['enquiry'] },
  { token: 'message', label: 'Message' },
  { token: 'role', label: 'Applied role', kinds: ['careers'] },
  { token: 'experience', label: 'Experience', kinds: ['careers'] },
  { token: 'resume_name', label: 'CV file name', kinds: ['careers'] },
  { token: 'source_label', label: 'Source (enquiry, callback…)' },
  { token: 'item_type', label: 'Catalog type', kinds: ['enquiry'] },
  { token: 'submission_id', label: 'Submission #' },
  { token: 'submitted_at', label: 'Submitted at' },
  { token: 'fields_table', label: 'All fields (table)' },
  { token: 'admin_url', label: 'Admin link' },
  { token: 'company_name', label: 'Company name' },
  { token: 'company_phone', label: 'Company phone' },
  { token: 'support_email', label: 'Support email' },
  { token: 'site_url', label: 'Website URL' },
  { token: 'notify_emails', label: 'Site Settings notify list' },
];

const TEAM_BODY_ENQUIRY = `<p>A new <strong>{{source_label}}</strong> was submitted on the website.</p>
{{fields_table}}
<p><a class="btn" href="{{admin_url}}">Open in admin</a></p>
<p class="muted">Reply to this email to answer {{name}} directly.</p>`;

const VISITOR_BODY_ENQUIRY = `<p>Hi {{name}},</p>
<p>Thank you for contacting {{company_name}}. We have received your {{source_label}} and a member of our team will respond within one business day.</p>
{{#if company_phone}}<p>For urgent support, call <strong>{{company_phone}}</strong>.</p>{{/if}}
<p>Regards,<br>{{company_name}}</p>`;

const TEAM_BODY_CAREERS = `<p>New application for <strong>{{role}}</strong> from {{name}}.</p>
{{fields_table}}
<p><a class="btn" href="{{admin_url}}">Review in admin</a></p>`;

const VISITOR_BODY_CAREERS = `<p>Hi {{name}},</p>
<p>Thank you for applying{{#if role}} for the <strong>{{role}}</strong> role{{/if}} at {{company_name}}. Our recruitment team will review your application within 3–5 business days.</p>
<p>If you have questions, email {{support_email}}{{#if company_phone}} or call {{company_phone}}{{/if}}.</p>
<p>Regards,<br>Talent team, {{company_name}}</p>`;

function template(partial: Partial<MailTemplate>): MailTemplate {
  return {
    enabled: true,
    to: '',
    cc: '',
    bcc: '',
    replyTo: '',
    subject: '',
    body: '',
    attachResume: false,
    attachments: [],
    routes: [],
    ...partial,
  };
}

export function defaultMailTemplates(): Record<MailEventKey, MailTemplate> {
  return {
    enquiry_team: template({
      to: '{{notify_emails}}',
      replyTo: '{{email}}',
      subject: 'New {{source_label}} #{{submission_id}} — {{name}}',
      body: TEAM_BODY_ENQUIRY,
    }),
    enquiry_visitor: template({
      to: '{{email}}',
      subject: 'We received your {{source_label}} — {{company_name}}',
      body: VISITOR_BODY_ENQUIRY,
    }),
    careers_team: template({
      to: '{{notify_emails}}',
      replyTo: '{{email}}',
      subject: 'Careers application #{{submission_id}}: {{role}} — {{name}}',
      body: TEAM_BODY_CAREERS,
      attachResume: true,
    }),
    careers_applicant: template({
      to: '{{email}}',
      subject: 'Application received — {{company_name}}',
      body: VISITOR_BODY_CAREERS,
    }),
  };
}

export function defaultMailConfig(): MailConfig {
  return {
    provider: 'off',
    graph: { tenantId: '', clientId: '', senderMailbox: '', secretExpiresOn: '' },
    smtp: { host: '', port: 587, security: 'auto', user: '', from: '' },
    fromName: '',
    saveToSentItems: true,
    testRecipient: '',
    brandColor: '#FF6B1A',
    templates: defaultMailTemplates(),
  };
}

const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.slice(0, max) : '');
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function normalizeTemplate(raw: unknown, fallback: MailTemplate): MailTemplate {
  const t = obj(raw);
  if (!Object.keys(t).length) return fallback;
  return {
    enabled: t.enabled !== false,
    to: str(t.to, 1000),
    cc: str(t.cc, 1000),
    bcc: str(t.bcc, 1000),
    replyTo: str(t.replyTo, 300),
    subject: str(t.subject, 300) || fallback.subject,
    body: str(t.body, 50_000) || fallback.body,
    attachResume: t.attachResume === true,
    attachments: (Array.isArray(t.attachments) ? t.attachments : [])
      .map((a) => obj(a))
      .filter((a) => typeof a.id === 'string' && /^[\w.-]+$/.test(a.id))
      .slice(0, 10)
      .map((a) => ({ id: String(a.id), name: str(a.name, 200), size: Number(a.size) || 0, mime: str(a.mime, 120) })),
    routes: (Array.isArray(t.routes) ? t.routes : [])
      .map((r) => obj(r))
      .slice(0, 20)
      .map((r) => ({
        field: str(r.field, 60),
        op: r.op === 'contains' || r.op === 'not_empty' ? r.op : 'equals',
        value: str(r.value, 200),
        to: str(r.to, 1000),
        cc: str(r.cc, 1000),
        mode: r.mode === 'replace' ? 'replace' : 'add',
      })),
  };
}

export function normalizeMailConfig(raw: unknown): MailConfig {
  const base = defaultMailConfig();
  const c = obj(raw);
  const g = obj(c.graph);
  const s = obj(c.smtp);
  const t = obj(c.templates);
  const port = Number(s.port);
  return {
    provider: c.provider === 'graph' || c.provider === 'smtp' ? c.provider : 'off',
    graph: {
      tenantId: str(g.tenantId, 100).trim(),
      clientId: str(g.clientId, 100).trim(),
      senderMailbox: str(g.senderMailbox, 200).trim(),
      secretExpiresOn: str(g.secretExpiresOn, 40).trim(),
    },
    smtp: {
      host: str(s.host, 200).trim(),
      port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 587,
      security: s.security === 'ssl' || s.security === 'starttls' ? s.security : 'auto',
      user: str(s.user, 200).trim(),
      from: str(s.from, 200).trim(),
    },
    fromName: str(c.fromName, 120),
    saveToSentItems: c.saveToSentItems !== false,
    testRecipient: str(c.testRecipient, 200).trim(),
    brandColor: /^#[0-9a-f]{6}$/i.test(str(c.brandColor)) ? str(c.brandColor) : base.brandColor,
    templates: Object.fromEntries(
      MAIL_EVENTS.map((e) => [e.key, normalizeTemplate(t[e.key], base.templates[e.key])])
    ) as Record<MailEventKey, MailTemplate>,
  };
}

export const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;

/** Split "a@x.com; b@y.com, Name <c@z.com>" into unique valid addresses. */
export function parseAddressList(raw: string): string[] {
  const out: string[] = [];
  for (const part of raw.split(/[,;\n]+/)) {
    const angle = part.match(/<([^>]+)>/);
    const addr = (angle ? angle[1] : part).trim().toLowerCase();
    if (EMAIL_RE.test(addr) && !out.includes(addr)) out.push(addr);
  }
  return out;
}

/** Days until the Graph client secret expires (null when unknown). */
export function secretDaysLeft(config: MailConfig, now = Date.now()): number | null {
  const t = Date.parse(config.graph.secretExpiresOn);
  return Number.isFinite(t) ? Math.floor((t - now) / 86_400_000) : null;
}

export const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
