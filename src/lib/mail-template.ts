/** Tiny, dependency-free email templating shared by the sender and the admin live preview. */

export type MailVars = Record<string, string>;

/** Values inserted without escaping (already-safe HTML produced by the server). */
const RAW_TOKENS = new Set(['fields_table']);

export const HIDDEN_FIELDS: ReadonlySet<string> = new Set([
  '_hp',
  'turnstileToken',
  'resume_file',
  'resume_mime',
  'source',
  'form_id',
  'item_id',
]);

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function humanizeKey(key: string): string {
  const spaced = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function sourceLabel(source: unknown, kind: 'enquiry' | 'careers'): string {
  if (kind === 'careers') return 'job application';
  switch (String(source || '')) {
    case 'callback_request':
      return 'callback request';
    case 'brochure_download':
      return 'brochure request';
    case 'consultation':
      return 'consultation request';
    default:
      return 'enquiry';
  }
}

function stringify(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(stringify).filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Submitted fields as an email-safe HTML table (inline styles only). */
export function fieldsTableHtml(payload: Record<string, unknown>): string {
  const rows = Object.entries(payload)
    .filter(([key, value]) => !HIDDEN_FIELDS.has(key) && stringify(value).trim() !== '')
    .map(
      ([key, value]) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #e6ebf2;color:#5b6b82;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(
          humanizeKey(key)
        )}</td><td style="padding:8px 12px;border-bottom:1px solid #e6ebf2;color:#0f1d33;font-size:14px">${escapeHtml(
          stringify(value)
        ).replace(/\n/g, '<br>')}</td></tr>`
    )
    .join('');
  return rows
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #e6ebf2;border-radius:8px;margin:12px 0">${rows}</table>`
    : '';
}

export type SubmissionKind = 'enquiry' | 'careers';

export type SiteVars = { companyName: string; phone: string; supportEmail: string; notifyEmails: string; siteUrl: string };

export function submissionKind(payload: Record<string, unknown>): SubmissionKind {
  return payload.source === 'careers_apply' ? 'careers' : 'enquiry';
}

const IST = 'Asia/Kolkata';

/** Flat variables for one submission: every payload field plus the built-in values (SYSTEM_VARIABLES). */
export function buildMailVars(input: {
  kind: SubmissionKind;
  id: number;
  itemType: string;
  itemTitle?: string;
  payload: Record<string, unknown>;
  site: SiteVars;
  submittedAt?: Date;
}): MailVars {
  const vars: MailVars = {};
  for (const [key, value] of Object.entries(input.payload)) {
    if (/^[\w]+$/.test(key) && !HIDDEN_FIELDS.has(key)) vars[key] = stringify(value);
  }
  const site = input.site.siteUrl.replace(/\/$/, '');
  const at = input.submittedAt || new Date();
  const admin = `${site}/admin/enquiries`;
  return {
    ...vars,
    name: vars.name || vars.full_name || '',
    email: vars.email || '',
    phone: vars.phone || '',
    kind: input.kind,
    source: String(input.payload.source || (input.kind === 'careers' ? 'careers_apply' : 'enquiry')),
    source_label: sourceLabel(input.payload.source, input.kind),
    item_type: input.itemType,
    item_title: input.itemTitle || '',
    submission_id: String(input.id),
    submitted_at: at.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: IST }),
    submitted_date: at.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST }),
    submitted_time: at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: IST }),
    fields_table: fieldsTableHtml(input.payload),
    admin_url: admin,
    enquiry_url: `${admin}?id=${input.id}`,
    company_name: input.site.companyName,
    company_phone: input.site.phone,
    support_email: input.site.supportEmail,
    site_url: site,
    notify_emails: input.site.notifyEmails,
  };
}

// ---------------------------------------------------------------- template language

export const TEMPLATE_FILTERS: Array<{ name: string; usage: string; description: string }> = [
  { name: 'default', usage: '{{company | default:"—"}}', description: 'Fallback text when the value is empty.' },
  { name: 'first', usage: '{{name | first}}', description: 'First word, e.g. first name.' },
  { name: 'upper', usage: '{{role | upper}}', description: 'UPPERCASE.' },
  { name: 'lower', usage: '{{email | lower}}', description: 'lowercase.' },
  { name: 'title', usage: '{{name | title}}', description: 'Title Case Each Word.' },
  { name: 'truncate', usage: '{{message | truncate:200}}', description: 'Shorten to N characters with “…”.' },
  { name: 'nl2br', usage: '{{message | nl2br}}', description: 'Keep line breaks in the HTML body.' },
  { name: 'trim', usage: '{{subject | trim}}', description: 'Remove surrounding spaces.' },
];

const FILTER_NAMES = new Set(TEMPLATE_FILTERS.map((f) => f.name));

const TOKEN_RE = /\{\{\s*(\w+)((?:\s*\|\s*\w+(?:\s*:\s*(?:"[^"]*"|'[^']*'|[^|}\s]+))?)*)\s*\}\}/g;
const FILTER_RE = /\|\s*(\w+)(?:\s*:\s*("[^"]*"|'[^']*'|[^|}\s]+))?/g;
/** Innermost block first, so blocks can nest. */
const IF_RE = /\{\{#if\s+([^}]+?)\s*\}\}((?:(?!\{\{#if\s)[\s\S])*?)\{\{\/if\}\}/;
const EXPR_RE = /^(!|not\s+)?\s*(\w+)(?:\s*(==|!=|contains|starts_with|ends_with)\s*("[^"]*"|'[^']*'|\S+))?$/i;

const unquote = (s = '') => s.replace(/^(["'])([\s\S]*)\1$/, '$2');

function evalCondition(expr: string, vars: MailVars): boolean {
  const m = expr.trim().match(EXPR_RE);
  if (!m) return false;
  const [, negate, key, op, rawArg] = m;
  const actual = (vars[key] || '').trim().toLowerCase();
  const arg = unquote(rawArg).trim().toLowerCase();
  let result: boolean;
  switch ((op || '').toLowerCase()) {
    case '==':
      result = actual === arg;
      break;
    case '!=':
      result = actual !== arg;
      break;
    case 'contains':
      result = arg !== '' && actual.includes(arg);
      break;
    case 'starts_with':
      result = arg !== '' && actual.startsWith(arg);
      break;
    case 'ends_with':
      result = arg !== '' && actual.endsWith(arg);
      break;
    default:
      result = actual !== '';
  }
  return negate ? !result : result;
}

function applyFilters(value: string, chain: string): { value: string; nl2br: boolean } {
  let out = value;
  let nl2br = false;
  for (const f of chain.matchAll(FILTER_RE)) {
    const arg = unquote(f[2]);
    switch (f[1]) {
      case 'default':
        if (!out.trim()) out = arg;
        break;
      case 'first':
        out = out.trim().split(/\s+/)[0] || '';
        break;
      case 'upper':
        out = out.toUpperCase();
        break;
      case 'lower':
        out = out.toLowerCase();
        break;
      case 'title':
        out = out.toLowerCase().replace(/(^|[\s\-'(])(\p{L})/gu, (_m, p: string, c: string) => p + c.toUpperCase());
        break;
      case 'truncate': {
        const n = Math.max(1, Number(arg) || 100);
        if (out.length > n) out = `${out.slice(0, n).trimEnd()}…`;
        break;
      }
      case 'nl2br':
        nl2br = true;
        break;
      case 'trim':
        out = out.trim();
        break;
    }
  }
  return { value: out, nl2br };
}

/**
 * {{token}}, {{token | filter:arg | …}}, {{#if expr}}…{{else}}…{{/if}} (nestable).
 * expr: `key`, `not key`, `key == "x"`, `key != "x"`, `key contains "x"`, `key starts_with "x"`, `key ends_with "x"`.
 * html=true escapes values except `rawKeys` (server-built tables and admin HTML snippets).
 */
export function renderTemplate(tpl: string, vars: MailVars, html: boolean, rawKeys: ReadonlySet<string> = RAW_TOKENS): string {
  let out = tpl;
  for (let guard = 0; guard < 200 && IF_RE.test(out); guard++) {
    out = out.replace(IF_RE, (_m, expr: string, inner: string) => {
      const at = inner.indexOf('{{else}}');
      const yes = at < 0 ? inner : inner.slice(0, at);
      const no = at < 0 ? '' : inner.slice(at + 8);
      return evalCondition(expr, vars) ? yes : no;
    });
  }
  return out.replace(TOKEN_RE, (_m, key: string, chain: string) => {
    const raw = rawKeys.has(key);
    const base = vars[key] ?? '';
    if (raw) return html ? base : htmlToText(base).replace(/\s+/g, ' ').trim();
    const { value, nl2br } = applyFilters(base, chain || '');
    if (!html) return value;
    const escaped = escapeHtml(value);
    return nl2br ? escaped.replace(/\r?\n/g, '<br>') : escaped;
  });
}

/** Variable keys referenced by a template string (tokens and {{#if}} expressions). */
export function extractTokens(text: string): string[] {
  const keys = new Set<string>();
  for (const m of text.matchAll(TOKEN_RE)) keys.add(m[1]);
  for (const m of text.matchAll(/\{\{#if\s+([^}]+?)\s*\}\}/g)) {
    const e = m[1].trim().match(EXPR_RE);
    if (e) keys.add(e[2]);
  }
  return [...keys];
}

/** Syntax problems a reader can fix: unbalanced blocks, unknown filters, malformed tokens. */
export function templateSyntaxIssues(text: string): string[] {
  const issues: string[] = [];
  const opens = (text.match(/\{\{#if\s/g) || []).length;
  const closes = (text.match(/\{\{\/if\}\}/g) || []).length;
  if (opens !== closes) issues.push(`${opens} {{#if}} but ${closes} {{/if}}`);
  for (const m of text.matchAll(/\{\{#if\s+([^}]+?)\s*\}\}/g)) {
    if (!EXPR_RE.test(m[1].trim())) issues.push(`Can’t read condition “${m[1].trim()}”`);
  }
  for (const m of text.matchAll(TOKEN_RE)) {
    for (const f of (m[2] || '').matchAll(FILTER_RE)) {
      if (!FILTER_NAMES.has(f[1])) issues.push(`Unknown filter “${f[1]}” in {{${m[1]}}}`);
    }
  }
  const stripped = text.replace(TOKEN_RE, '').replace(/\{\{#if\s+[^}]+\}\}|\{\{else\}\}|\{\{\/if\}\}/g, '');
  const stray = stripped.match(/\{\{[^}]*\}\}/);
  if (stray) issues.push(`Can’t read “${stray[0]}”`);
  return [...new Set(issues)];
}

function looksLikeHtml(text: string) {
  return /<\/?[a-z][\s\S]*?>/i.test(text);
}

/** Plain text body → paragraphs; HTML passes through. `.btn` / `.muted` classes become inline styles. */
export function bodyToHtml(body: string, accent: string): string {
  const html = looksLikeHtml(body)
    ? body
    : body
        .split(/\n{2,}/)
        .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('\n');
  return html
    .replace(
      /class="btn"/g,
      `style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px"`
    )
    .replace(/class="muted"/g, 'style="color:#6b7a90;font-size:13px"');
}

/** Branded, table-based responsive layout that renders in Outlook, Gmail and mobile clients. */
export function wrapEmailHtml(opts: {
  bodyHtml: string;
  subject: string;
  companyName: string;
  siteUrl: string;
  accent: string;
}): string {
  const company = escapeHtml(opts.companyName);
  const site = escapeHtml(opts.siteUrl.replace(/\/$/, ''));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    opts.subject
  )}</title></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0f1d33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 28px rgba(10,22,40,0.08)">
<tr><td style="background:#0a1628;padding:18px 28px;border-bottom:3px solid ${opts.accent}"><span style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:0.02em">${company}</span></td></tr>
<tr><td style="padding:26px 28px 8px;font-size:15px;line-height:1.6">${opts.bodyHtml}</td></tr>
<tr><td style="padding:18px 28px 24px;color:#7a889c;font-size:12px;line-height:1.5;border-top:1px solid #eef2f7">${company}${
    site ? ` · <a href="${site}" style="color:#7a889c">${site.replace(/^https?:\/\//, '')}</a>` : ''
  }</td></tr>
</table></td></tr></table></body></html>`;
}

/** Plain-text alternative derived from the HTML (multipart/alternative improves deliverability). */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<\/(td)>\s*<td[^>]*>/gi, ': ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|tr|h\d|li|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const SAMPLE_PAYLOADS: Record<'enquiry' | 'careers', Record<string, unknown>> = {
  enquiry: {
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '+91 98765 43210',
    company: 'Apex Data Centres',
    subject: 'Request a quote — 200 kVA modular UPS',
    message: 'We need a 200 kVA modular UPS with 30 min backup for our Pune facility.',
    source: 'enquiry',
  },
  careers: {
    name: 'Arjun Mehta',
    email: 'arjun.mehta@example.com',
    phone: '+91 91234 56789',
    role: 'Field Service Engineer — UPS',
    experience: '4 years',
    message: 'Hands-on experience commissioning Vertiv and Eaton UPS systems.',
    resume_name: 'Arjun-Mehta-CV.pdf',
    source: 'careers_apply',
  },
};
