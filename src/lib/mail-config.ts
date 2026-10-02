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

export type MailConditionOp = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'not_empty' | 'empty';

/** "Send only when" gate: every condition must hold for the template to send. */
export type MailCondition = { field: string; op: MailConditionOp; value: string };

export type MailVariableType = 'constant' | 'fallback' | 'lookup' | 'html';

/**
 * Admin-defined variable, resolved per submission after the built-in and form-field values.
 * Values may contain {{tokens}} (including variables defined above it).
 */
export type MailVariable = {
  key: string;
  type: MailVariableType;
  label: string;
  description: string;
  /** constant / html: the value · fallback / lookup: the default when nothing matches */
  value: string;
  /** fallback: fields tried in order; the first non-empty wins */
  sources: string[];
  /** lookup: the field whose value is matched against `cases` */
  source: string;
  match: 'equals' | 'contains' | 'starts_with';
  cases: Array<{ when: string; value: string }>;
};

export type MailTemplate = {
  enabled: boolean;
  /** Fixed From address for this template (blank = the default From address). */
  from: string;
  /** Display name override; tokens allowed, e.g. "{{name}} via Website". */
  fromName: string;
  conditions: MailCondition[];
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
  /** Default From address (blank = the sender mailbox / SMTP from). Must be a mailbox the sender can "Send As". */
  fromAddress: string;
  fromName: string;
  variables: MailVariable[];
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

export type SystemVariable = {
  key: string;
  label: string;
  group: 'Contact' | 'Submission' | 'Links' | 'Company';
  description: string;
  /** Inserted as HTML (not escaped) in the body. */
  html?: boolean;
};

/** Computed for every submission. Custom variables can't reuse these keys. */
export const SYSTEM_VARIABLES: SystemVariable[] = [
  { key: 'name', label: 'Name', group: 'Contact', description: 'Visitor name (name, else full_name).' },
  { key: 'email', label: 'Email', group: 'Contact', description: 'Visitor email; empty for callback requests.' },
  { key: 'phone', label: 'Phone', group: 'Contact', description: 'Visitor phone number.' },
  { key: 'submission_id', label: 'Submission #', group: 'Submission', description: 'Enquiry ID in Admin → Enquiries.' },
  { key: 'submitted_at', label: 'Submitted at', group: 'Submission', description: 'Date and time (IST), e.g. 2 Oct 2026, 5:35 pm.' },
  { key: 'submitted_date', label: 'Submitted date', group: 'Submission', description: 'Date only (IST), e.g. 02 Oct 2026.' },
  { key: 'submitted_time', label: 'Submitted time', group: 'Submission', description: 'Time only (IST), e.g. 5:35 pm.' },
  { key: 'kind', label: 'Kind', group: 'Submission', description: '“enquiry” or “careers”.' },
  {
    key: 'source',
    label: 'Source code',
    group: 'Submission',
    description: 'Which form: enquiry, callback_request, brochure_download, consultation or careers_apply.',
  },
  { key: 'source_label', label: 'Source label', group: 'Submission', description: 'Readable source: enquiry, callback request, brochure request, job application.' },
  { key: 'item_type', label: 'Catalog type', group: 'Submission', description: 'product, project, service, general or careers.' },
  { key: 'item_title', label: 'Catalog item', group: 'Submission', description: 'Product, project or service the visitor enquired about (if any).' },
  { key: 'fields_table', label: 'All fields (table)', group: 'Submission', description: 'Every submitted field as a formatted table.', html: true },
  { key: 'admin_url', label: 'Admin inbox link', group: 'Links', description: 'Admin → Enquiries.' },
  { key: 'enquiry_url', label: 'Enquiry link', group: 'Links', description: 'Opens this exact submission in admin.' },
  { key: 'site_url', label: 'Website URL', group: 'Links', description: 'NEXT_PUBLIC_SITE_URL.' },
  { key: 'company_name', label: 'Company name', group: 'Company', description: 'Site Settings → company name.' },
  { key: 'company_phone', label: 'Company phone', group: 'Company', description: 'Site Settings → phone.' },
  { key: 'support_email', label: 'Support email', group: 'Company', description: 'Site Settings → support email.' },
  { key: 'notify_emails', label: 'Notify list', group: 'Company', description: 'Site Settings → enquiry notification emails.' },
];

export const RESERVED_VARIABLE_KEYS = new Set(SYSTEM_VARIABLES.map((v) => v.key));

/** Fields each fixed website form always submits (custom Enquiry Forms fields are discovered from the database). */
export const KNOWN_FORM_FIELDS: Array<{ key: string; label: string; forms: string[]; kind: 'enquiry' | 'careers' }> = [
  { key: 'company', label: 'Company', forms: ['Enquiry', 'Brochure'], kind: 'enquiry' },
  { key: 'subject', label: 'Subject / topic', forms: ['Enquiry', 'Callback', 'Brochure'], kind: 'enquiry' },
  { key: 'message', label: 'Message', forms: ['Enquiry', 'Callback', 'Brochure', 'Careers'], kind: 'enquiry' },
  { key: 'preferred_time', label: 'Preferred call time', forms: ['Callback'], kind: 'enquiry' },
  { key: 'brochure_url', label: 'Brochure link', forms: ['Brochure'], kind: 'enquiry' },
  { key: 'role', label: 'Applied role', forms: ['Careers'], kind: 'careers' },
  { key: 'experience', label: 'Experience', forms: ['Careers'], kind: 'careers' },
  { key: 'resume_name', label: 'CV file name', forms: ['Careers'], kind: 'careers' },
];

export const VARIABLE_KEY_RE = /^[a-z][a-z0-9_]{0,39}$/;

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
    from: '',
    fromName: '',
    conditions: [],
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
    fromAddress: '',
    fromName: '',
    variables: [],
    saveToSentItems: true,
    testRecipient: '',
    brandColor: '#FF6B1A',
    templates: defaultMailTemplates(),
  };
}

const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.slice(0, max) : '');
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

const CONDITION_OPS: MailConditionOp[] = ['equals', 'not_equals', 'contains', 'not_contains', 'not_empty', 'empty'];

/** A single plain address, or '' (From can never come from a token or a visitor). */
export function cleanAddress(v: unknown): string {
  const addr = str(v, 200).trim().toLowerCase();
  return EMAIL_RE.test(addr) ? addr : '';
}

function normalizeVariables(raw: unknown): MailVariable[] {
  const seen = new Set<string>();
  const out: MailVariable[] = [];
  for (const item of (Array.isArray(raw) ? raw : []).slice(0, 100)) {
    const v = obj(item);
    const key = str(v.key, 40).trim().toLowerCase();
    if (!VARIABLE_KEY_RE.test(key) || RESERVED_VARIABLE_KEYS.has(key) || seen.has(key)) continue;
    seen.add(key);
    const type: MailVariableType = v.type === 'fallback' || v.type === 'lookup' || v.type === 'html' ? v.type : 'constant';
    out.push({
      key,
      type,
      label: str(v.label, 120),
      description: str(v.description, 500),
      value: str(v.value, type === 'html' ? 50_000 : 5000),
      sources: (Array.isArray(v.sources) ? v.sources : [])
        .map((s) => str(s, 40).trim().toLowerCase())
        .filter((s) => /^\w+$/.test(s))
        .slice(0, 12),
      source: /^\w+$/.test(str(v.source, 40).trim()) ? str(v.source, 40).trim().toLowerCase() : '',
      match: v.match === 'contains' || v.match === 'starts_with' ? v.match : 'equals',
      cases: (Array.isArray(v.cases) ? v.cases : [])
        .map((c) => obj(c))
        .slice(0, 100)
        .map((c) => ({ when: str(c.when, 300), value: str(c.value, 5000) })),
    });
  }
  return out;
}

function normalizeTemplate(raw: unknown, fallback: MailTemplate): MailTemplate {
  const t = obj(raw);
  if (!Object.keys(t).length) return fallback;
  return {
    enabled: t.enabled !== false,
    from: cleanAddress(t.from),
    fromName: str(t.fromName, 120),
    conditions: (Array.isArray(t.conditions) ? t.conditions : [])
      .map((c) => obj(c))
      .slice(0, 10)
      .map((c) => ({
        field: str(c.field, 60).trim(),
        op: CONDITION_OPS.includes(c.op as MailConditionOp) ? (c.op as MailConditionOp) : 'equals',
        value: str(c.value, 300),
      }))
      .filter((c) => /^\w+$/.test(c.field)),
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
    fromAddress: cleanAddress(c.fromAddress),
    fromName: str(c.fromName, 120),
    variables: normalizeVariables(c.variables),
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

/** Mailbox that actually transmits (Graph sender mailbox or SMTP login/from). */
export function transmittingMailbox(config: MailConfig): string {
  if (config.provider === 'graph') return config.graph.senderMailbox.toLowerCase();
  return (config.smtp.from || config.smtp.user).toLowerCase();
}

/** From address for a template: template override → default From → the transmitting mailbox. */
export function effectiveFrom(config: MailConfig, tpl?: Pick<MailTemplate, 'from'>): string {
  return (tpl?.from || config.fromAddress || transmittingMailbox(config)).toLowerCase();
}

/** Every distinct From address that differs from the transmitting mailbox (each needs "Send As"). */
export function sendAsAddresses(config: MailConfig): string[] {
  const mailbox = transmittingMailbox(config);
  const all = [config.fromAddress, ...Object.values(config.templates).map((t) => t.from)].filter(Boolean);
  return [...new Set(all.map((a) => a.toLowerCase()))].filter((a) => a !== mailbox);
}

/** Days until the Graph client secret expires (null when unknown). */
export function secretDaysLeft(config: MailConfig, now = Date.now()): number | null {
  const t = Date.parse(config.graph.secretExpiresOn);
  return Number.isFinite(t) ? Math.floor((t - now) / 86_400_000) : null;
}

export const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
