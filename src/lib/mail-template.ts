/** Tiny, dependency-free email templating shared by the sender and the admin live preview. */

export type MailVars = Record<string, string>;

/** Values inserted without escaping (already-safe HTML produced by the server). */
const RAW_TOKENS = new Set(['fields_table']);

const HIDDEN_FIELDS = new Set([
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

/** Flat variables for one submission: every payload field plus computed tokens. */
export function buildMailVars(input: {
  kind: 'enquiry' | 'careers';
  id: number;
  itemType: string;
  payload: Record<string, unknown>;
  site: { companyName: string; phone: string; supportEmail: string; notifyEmails: string; siteUrl: string };
  submittedAt?: Date;
}): MailVars {
  const vars: MailVars = {};
  for (const [key, value] of Object.entries(input.payload)) {
    if (/^[\w]+$/.test(key) && !HIDDEN_FIELDS.has(key)) vars[key] = stringify(value);
  }
  const site = input.site.siteUrl.replace(/\/$/, '');
  return {
    ...vars,
    name: vars.name || vars.full_name || '',
    email: vars.email || '',
    source_label: sourceLabel(input.payload.source, input.kind),
    item_type: input.itemType,
    submission_id: String(input.id),
    submitted_at: (input.submittedAt || new Date()).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    }),
    fields_table: fieldsTableHtml(input.payload),
    admin_url: site ? `${site}/admin/enquiries` : '/admin/enquiries',
    company_name: input.site.companyName,
    company_phone: input.site.phone,
    support_email: input.site.supportEmail,
    site_url: site,
    notify_emails: input.site.notifyEmails,
  };
}

/** {{token}}, {{#if token}}…{{else}}…{{/if}} (non-nested). html=true escapes values. */
export function renderTemplate(tpl: string, vars: MailVars, html: boolean): string {
  let out = tpl;
  const ifBlock = /\{\{#if\s+([\w]+)\s*\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/;
  for (let guard = 0; guard < 100 && ifBlock.test(out); guard++) {
    out = out.replace(ifBlock, (_m, key: string, yes: string, no = '') => ((vars[key] || '').trim() ? yes : no));
  }
  return out.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_m, key: string) => {
    const value = vars[key] ?? '';
    if (!html) return RAW_TOKENS.has(key) ? '' : value;
    return RAW_TOKENS.has(key) ? value : escapeHtml(value);
  });
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
