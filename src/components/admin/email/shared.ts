import { MAIL_EVENTS, SYSTEM_VARIABLES, type MailConfig, type MailVariable } from '@/lib/mail-config';
import { extractTokens, type SubmissionKind } from '@/lib/mail-template';

export type DiscoveredField = {
  key: string;
  label: string;
  forms: string[];
  kinds: SubmissionKind[];
  type: string;
  seen: number;
  fillRate: number | null;
  samples: string[];
};

export type RecentSubmission = { id: number; kind: SubmissionKind; label: string; name: string; createdAt: string };

export type Discovery = {
  fields: DiscoveredField[];
  scanned: number;
  perKind: Record<SubmissionKind, number>;
  recent: RecentSubmission[];
};

export const VARIABLE_TYPE_META: Record<MailVariable['type'], { label: string; hint: string }> = {
  constant: { label: 'Constant', hint: 'Fixed text, address list or link — e.g. a CC list used by several templates.' },
  fallback: { label: 'Fallback', hint: 'First filled field from a list, else a default — e.g. name → full_name → “there”.' },
  lookup: { label: 'Lookup', hint: 'Map one field’s value to another — e.g. topic → the team that handles it.' },
  html: { label: 'HTML snippet', hint: 'Formatted block inserted as HTML — e.g. a signature with logo and links.' },
};

export function blankVariable(type: MailVariable['type'], key = ''): MailVariable {
  return { key, type, label: '', description: '', value: '', sources: [], source: '', match: 'equals', cases: [] };
}

/** Ready-made starting points for the "New variable" menu. */
export const VARIABLE_PRESETS: Array<{ title: string; text: string; variable: MailVariable }> = [
  {
    title: 'Team CC list',
    text: 'One address list reused in many CC fields.',
    variable: { ...blankVariable('constant', 'cc_emails'), label: 'Team CC list', value: 'sales@zigma-technologies.com, director@zigma-technologies.com' },
  },
  {
    title: 'Friendly first name',
    text: '“Hi Priya” — or “Hi there” when no name was given.',
    variable: {
      ...blankVariable('fallback', 'greeting_name'),
      label: 'Greeting name',
      sources: ['first_name', 'name', 'full_name'],
      value: 'there',
    },
  },
  {
    title: 'Team by topic',
    text: 'Route by the enquiry topic to the right mailbox.',
    variable: {
      ...blankVariable('lookup', 'topic_team'),
      label: 'Team for this topic',
      source: 'subject',
      match: 'contains',
      cases: [
        { when: 'ups|bess|battery', value: 'ups@zigma-technologies.com' },
        { when: 'solar', value: 'solar@zigma-technologies.com' },
        { when: 'amc|service|emergency', value: 'service@zigma-technologies.com' },
      ],
      value: '{{notify_emails}}',
    },
  },
  {
    title: 'Email signature',
    text: 'Branded signature block in HTML.',
    variable: {
      ...blankVariable('html', 'signature'),
      label: 'Email signature',
      value:
        '<p style="margin-top:24px">Warm regards,<br><strong>{{company_name}}</strong><br>' +
        '<a href="tel:{{company_phone}}">{{company_phone}}</a> · <a href="mailto:{{support_email}}">{{support_email}}</a><br>' +
        '<a href="{{site_url}}">{{site_url}}</a></p>',
    },
  },
];

export type Usage = { where: string; event?: string };

const TEMPLATE_TEXT_FIELDS = [
  ['subject', 'Subject'],
  ['body', 'Body'],
  ['to', 'To'],
  ['cc', 'CC'],
  ['bcc', 'BCC'],
  ['replyTo', 'Reply-To'],
  ['fromName', 'From name'],
] as const;

/** Where each variable key is referenced across templates, rules and other custom variables. */
export function variableUsage(config: MailConfig): Map<string, Usage[]> {
  const map = new Map<string, Usage[]>();
  const add = (key: string, where: string, event?: string) => {
    const list = map.get(key) || [];
    if (!list.some((u) => u.where === where)) list.push({ where, event });
    map.set(key, list);
  };
  for (const e of MAIL_EVENTS) {
    const t = config.templates[e.key];
    for (const [field, label] of TEMPLATE_TEXT_FIELDS) {
      for (const key of extractTokens(t[field])) add(key, `${e.label} · ${label}`, e.key);
    }
    t.conditions.forEach((c) => add(c.field, `${e.label} · Send only when`, e.key));
    t.routes.forEach((r) => {
      add(r.field, `${e.label} · Routing`, e.key);
      [...extractTokens(r.to), ...extractTokens(r.cc)].forEach((k) => add(k, `${e.label} · Routing`, e.key));
    });
  }
  for (const v of config.variables) {
    const refs = new Set<string>([...extractTokens(v.value), ...v.sources, ...(v.source ? [v.source] : [])]);
    v.cases.forEach((c) => extractTokens(c.value).forEach((k) => refs.add(k)));
    refs.forEach((k) => add(k, `Variable {{${v.key}}}`));
  }
  return map;
}

export function knownKeys(config: MailConfig, fields: DiscoveredField[], extra: Record<string, string> = {}): Set<string> {
  return new Set([
    ...SYSTEM_VARIABLES.map((v) => v.key),
    ...fields.map((f) => f.key),
    ...config.variables.map((v) => v.key),
    ...Object.keys(extra),
  ]);
}

export function relativeWhen(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });
}
