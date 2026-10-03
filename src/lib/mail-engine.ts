/**
 * Message composition shared by the sender and the admin live preview, so what the admin
 * previews is exactly what is sent. Pure: no server-only imports.
 */
import {
  effectiveFrom,
  parseAddressList,
  type MailCondition,
  type MailConfig,
  type MailTemplate,
  type MailVariable,
} from '@/lib/mail-config';
import { bodyToHtml, htmlToText, renderTemplate, wrapEmailHtml, type MailVars } from '@/lib/mail-template';

export type ResolvedVars = { vars: MailVars; raw: Set<string> };

export type ComposedMail = {
  send: boolean;
  skipReason: string;
  from: string;
  fromName: string;
  to: string[];
  cc: string[];
  bcc: string[];
  replyTo: string[];
  subject: string;
  html: string;
  text: string;
};

/** `a|b|c` alternatives, case-insensitive. */
function alternatives(value: string) {
  return value
    .split('|')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function matchValue(actualRaw: string, op: MailCondition['op'] | 'starts_with', expected: string): boolean {
  const actual = actualRaw.trim().toLowerCase();
  const alts = alternatives(expected);
  switch (op) {
    case 'not_empty':
      return actual !== '';
    case 'empty':
      return actual === '';
    case 'equals':
      return alts.some((a) => actual === a);
    case 'not_equals':
      return !alts.some((a) => actual === a);
    case 'contains':
      return alts.some((a) => actual.includes(a));
    case 'not_contains':
      return !alts.some((a) => actual.includes(a));
    case 'starts_with':
      return alts.some((a) => actual.startsWith(a));
  }
}

/** Applies admin-defined variables in order; each may reference anything defined before it. */
export function resolveVariables(base: MailVars, defs: MailVariable[]): ResolvedVars {
  const vars: MailVars = { ...base };
  const raw = new Set<string>(['fields_table']);
  for (const d of defs) {
    let value: string;
    if (d.type === 'html') {
      value = renderTemplate(d.value, vars, true, raw);
      raw.add(d.key);
    } else if (d.type === 'fallback') {
      value = d.sources.map((s) => (vars[s] || '').trim()).find(Boolean) ?? renderTemplate(d.value, vars, false, raw);
    } else if (d.type === 'lookup') {
      const hit = d.cases.find((c) => c.when.trim() && matchValue(vars[d.source] || '', d.match, c.when));
      value = renderTemplate(hit ? hit.value : d.value, vars, false, raw);
    } else {
      value = renderTemplate(d.value, vars, false, raw);
    }
    vars[d.key] = value;
  }
  return { vars, raw };
}

export function failedConditions(conditions: MailCondition[], vars: MailVars): MailCondition[] {
  return conditions.filter((c) => !matchValue(vars[c.field] || '', c.op, c.value));
}

export function describeCondition(c: MailCondition): string {
  const ops: Record<MailCondition['op'], string> = {
    equals: 'is',
    not_equals: 'is not',
    contains: 'contains',
    not_contains: 'does not contain',
    not_empty: 'is filled',
    empty: 'is empty',
  };
  return `${c.field} ${ops[c.op]}${c.op === 'not_empty' || c.op === 'empty' ? '' : ` “${c.value}”`}`;
}

export function resolveRecipients(tpl: MailTemplate, r: ResolvedVars) {
  const list = (s: string) => parseAddressList(renderTemplate(s, r.vars, false, r.raw));
  let to = list(tpl.to);
  let cc = list(tpl.cc);
  for (const rule of tpl.routes) {
    if (!rule.field || !matchValue(r.vars[rule.field] || '', rule.op, rule.value)) continue;
    const ruleTo = list(rule.to);
    const ruleCc = list(rule.cc);
    if (rule.mode === 'replace') {
      to = ruleTo.length ? ruleTo : to;
      cc = ruleCc;
    } else {
      to = [...new Set([...to, ...ruleTo])];
      cc = [...new Set([...cc, ...ruleCc])];
    }
  }
  const bcc = list(tpl.bcc).filter((a) => !to.includes(a) && !cc.includes(a));
  const replyTo = list(tpl.replyTo).slice(0, 1);
  return { to, cc: cc.filter((a) => !to.includes(a)), bcc, replyTo };
}

/** Display names can carry tokens but never an address or header characters. */
function cleanDisplayName(name: string) {
  return name.replace(/[<>"@\r\n\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
}

export function composeMail(input: {
  config: MailConfig;
  tpl: MailTemplate;
  base: MailVars;
  companyName: string;
  siteUrl: string;
  /** Resolved with `emailAccent`. */
  accent: string;
}): ComposedMail {
  const { config, tpl } = input;
  const r = resolveVariables(input.base, config.variables);
  const render = (s: string) => renderTemplate(s, r.vars, false, r.raw);
  const subject = render(tpl.subject).replace(/\s+/g, ' ').trim();
  const bodyHtml = bodyToHtml(renderTemplate(tpl.body, r.vars, true, r.raw), input.accent);
  const html = wrapEmailHtml({
    bodyHtml,
    subject,
    companyName: input.companyName,
    siteUrl: r.vars.site_url || input.siteUrl,
    accent: input.accent,
  });
  const rcpt = resolveRecipients(tpl, r);
  const failed = failedConditions(tpl.conditions, r.vars);
  const skipReason = !tpl.enabled
    ? 'Template is disabled.'
    : failed.length
      ? `“Send only when” not met: ${failed.map(describeCondition).join('; ')}.`
      : !rcpt.to.length
        ? 'No valid recipient in To.'
        : '';
  return {
    send: !skipReason,
    skipReason,
    from: effectiveFrom(config, tpl),
    fromName: cleanDisplayName(render(tpl.fromName || config.fromName)),
    ...rcpt,
    subject,
    html,
    text: htmlToText(bodyHtml),
  };
}
