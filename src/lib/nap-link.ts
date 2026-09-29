import type { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { getThemeSettings, listPages, listSections, updateSection } from '@/lib/cms';
import { napValues, resolveNapText } from '@/lib/nap';
import { mergeSiteSettings } from '@/lib/site-settings';

export type NapLinkChange = {
  target: string;
  field: string;
  before: string;
  after: string;
  /** What visitors will see once the placeholder is filled from Site Settings. */
  preview: string;
};

export type NapLinkReport = { changes: NapLinkChange[]; applied: boolean };

type PhoneToken = 'phone' | 'emergencyPhone';

type LinkContext = {
  phone: string | null;
  emergency: string | null;
  companyNumbers: Set<string>;
  email: string;
  supportEmail: string;
  cityRegion: string;
  hours: string;
  /** Without a street in Site Settings, {{address}} would shrink the head-office address to city/state. */
  hasStreet: boolean;
};

const PHONE_CANDIDATE = /(?<![\w+])\+?\d[\d\s-]{8,16}\d(?!\w)/g;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const TEL_RE = /tel:(\+?[\d\s-]{8,20})/gi;
const EMERGENCY_HINT = /emergency|urgent|24\s*[x×]\s*7/i;

/** 10-digit Indian number without +91 / leading 0, or null when the text is not a phone number. */
function nationalDigits(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

/** Short window from `start`, so long rich-text fields stay readable in the report. */
function excerpt(text: string, start: number): string {
  if (text.length <= 160) return text;
  return `${start ? '…' : ''}${text.slice(start, start + 140)}${start + 140 < text.length ? '…' : ''}`;
}

function makeChange(target: string, field: string, before: string, after: string, values: ReturnType<typeof napValues>): NapLinkChange {
  const preview = resolveNapText(after, values);
  // Text before the first change is identical in all three strings, so one window start fits them all.
  let diff = 0;
  while (diff < before.length && before[diff] === after[diff]) diff++;
  const start = Math.max(0, diff - 60);
  return {
    target,
    field,
    before: excerpt(before, start),
    after: excerpt(after, start),
    preview: excerpt(preview, start),
  };
}

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isLocation(obj: PlainObject) {
  return typeof obj.address === 'string' && ('tag' in obj || 'directionsUrl' in obj || 'phone' in obj);
}

function isHeadOffice(obj: PlainObject) {
  return obj.isDefault === true || /head/i.test(String(obj.tag || ''));
}

function isEmergencyContext(obj: PlainObject, parentKey: string) {
  if (/emergency/i.test(parentKey)) return true;
  if (obj.emergency === true) return true;
  if (typeof obj.variant === 'string' && /emergency/i.test(obj.variant)) return true;
  return Object.values(obj).some((v) => typeof v === 'string' && v.length <= 80 && EMERGENCY_HINT.test(v));
}

/** Regional hubs keep their own numbers; only exact matches of the Site Settings numbers are linked. */
function hubPhoneToken(ctx: LinkContext, digits: string): PhoneToken | null {
  if (digits === ctx.phone) return 'phone';
  if (digits === ctx.emergency) return 'emergencyPhone';
  return null;
}

function linkText(text: string, ctx: LinkContext, pick: (digits: string) => PhoneToken | null): string {
  if (!text) return text;
  let out = text.replace(PHONE_CANDIDATE, (match) => {
    const digits = nationalDigits(match);
    const token = digits ? pick(digits) : null;
    return token ? `{{${token}}}` : match;
  });
  out = out.replace(EMAIL_RE, (match) => {
    const lower = match.toLowerCase();
    if (ctx.email && lower === ctx.email) return '{{email}}';
    if (ctx.supportEmail && lower === ctx.supportEmail) return '{{supportEmail}}';
    return match;
  });
  if (ctx.cityRegion && out.trim().toLowerCase() === ctx.cityRegion) out = '{{city}}, {{region}}';
  return out;
}

function collectTelNumbers(value: unknown, into: Set<string>, insideHub = false) {
  if (typeof value === 'string') {
    if (insideHub) return;
    for (const match of value.matchAll(TEL_RE)) {
      const digits = nationalDigits(match[1]);
      if (digits) into.add(digits);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectTelNumbers(item, into, insideHub);
    return;
  }
  if (isPlainObject(value)) {
    const hub = insideHub || (isLocation(value) && !isHeadOffice(value));
    for (const item of Object.values(value)) collectTelNumbers(item, into, hub);
  }
}

function linkNode(
  value: unknown,
  parentKey: string,
  path: string,
  ctx: LinkContext,
  record: (field: string, before: string, after: string) => void
): unknown {
  if (Array.isArray(value)) {
    return value.map((item, i) => linkNode(item, parentKey, `${path}[${i}]`, ctx, record));
  }
  if (!isPlainObject(value)) return value;

  const location = isLocation(value);
  const headOffice = location && isHeadOffice(value);
  const emergency = isEmergencyContext(value, parentKey);
  const pick = (digits: string): PhoneToken | null => {
    if (location && !headOffice) return hubPhoneToken(ctx, digits);
    if (!ctx.companyNumbers.has(digits)) return null;
    return emergency ? 'emergencyPhone' : 'phone';
  };

  const out: PlainObject = {};
  for (const [key, item] of Object.entries(value)) {
    const field = path ? `${path}.${key}` : key;
    if (typeof item === 'string') {
      let next = item;
      if (headOffice && key === 'address') {
        if (ctx.hasStreet && !item.includes('{{')) next = '{{address}}';
      }
      else if (!(location && !headOffice && key === 'address')) next = linkText(item, ctx, pick);
      if (next !== item) record(field, item, next);
      out[key] = next;
    } else if (
      key === 'hours' &&
      ctx.hours &&
      Array.isArray(item) &&
      item.length &&
      item.every((row) => isPlainObject(row) && 'label' in row) &&
      !JSON.stringify(item).includes('{{hours}}')
    ) {
      const next = [{ label: '{{hours}}', value: '' }];
      record(field, (item as PlainObject[]).map((r) => `${r.label} ${r.value ?? ''}`.trim()).join(' / '), '{{hours}}');
      out[key] = next;
    } else {
      out[key] = linkNode(item, key, field, ctx, record);
    }
  }
  return out;
}

async function buildContext(): Promise<{ ctx: LinkContext; values: ReturnType<typeof napValues> }> {
  const site = mergeSiteSettings((await getThemeSettings()).site);
  const values = napValues(site);
  const phone = nationalDigits(site.phone || '');
  const emergency = nationalDigits(site.emergencyPhone || '');
  const companyNumbers = new Set<string>([phone, emergency, nationalDigits(site.whatsapp || '')].filter(Boolean) as string[]);
  return {
    values,
    ctx: {
      phone,
      emergency,
      companyNumbers,
      email: (site.email || '').trim().toLowerCase(),
      supportEmail: (site.supportEmail || '').trim().toLowerCase(),
      cityRegion:
        values.city && values.region ? `${values.city}, ${values.region}`.toLowerCase() : '',
      hours: values.hours,
      hasStreet: Boolean(values.street),
    },
  };
}

/**
 * Replaces company phone numbers, the Site Settings emails, the head-office address and contact-form hours
 * typed in menus and page sections with NAP placeholders. Dry run unless `apply` is true.
 */
export async function linkNapEverywhere(apply: boolean): Promise<NapLinkReport> {
  const { ctx, values } = await buildContext();
  const changes: NapLinkChange[] = [];

  const [navRows] = await pool.query<RowDataPacket[]>(
    'SELECT id, location, label, href FROM nav_items ORDER BY location, sort_order, id'
  );
  const pages = await listPages(true);
  const pageSections = await Promise.all(pages.map(async (page) => ({ page, sections: await listSections(page.id, true) })));

  for (const row of navRows) collectTelNumbers(String(row.href || ''), ctx.companyNumbers);
  for (const { sections } of pageSections) {
    for (const section of sections) collectTelNumbers(section.content_json, ctx.companyNumbers);
  }

  for (const row of navRows) {
    const menu = row.location === 'footer' ? 'Footer menu' : 'Header menu';
    const target = `${menu} → "${row.label}"`;
    const before = { label: String(row.label || ''), href: String(row.href || '') };
    const rowChanges: NapLinkChange[] = [];
    const after = linkNode(before, '', '', ctx, (field, b, a) =>
      rowChanges.push(makeChange(target, field, b, a, values))
    ) as { label: string; href: string };
    if (!rowChanges.length) continue;
    changes.push(...rowChanges);
    if (apply) {
      await pool.query('UPDATE nav_items SET label = ?, href = ? WHERE id = ?', [after.label, after.href || null, row.id]);
    }
  }

  for (const { page, sections } of pageSections) {
    for (const section of sections) {
      const target = `Page "${page.slug}" → ${section.title || section.type}`;
      const sectionChanges: NapLinkChange[] = [];
      const next = linkNode(section.content_json, '', '', ctx, (field, b, a) =>
        sectionChanges.push(makeChange(target, field, b, a, values))
      ) as Record<string, unknown>;
      if (!sectionChanges.length) continue;
      changes.push(...sectionChanges);
      if (apply) await updateSection(section.id, { content_json: next });
    }
  }

  return { changes, applied: apply };
}
