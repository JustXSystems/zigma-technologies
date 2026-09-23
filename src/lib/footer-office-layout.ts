/** Footer office address line layout — stored as JSON in Site Settings. */

export const FOOTER_OFFICE_FIELDS = [
  { id: 'street', label: 'Street line 1', group: 'address' },
  { id: 'street2', label: 'Street line 2', group: 'address' },
  { id: 'street3', label: 'Street line 3', group: 'address' },
  { id: 'street4', label: 'Street line 4', group: 'address' },
  { id: 'locality', label: 'City', group: 'address' },
  { id: 'region', label: 'Region / state', group: 'address' },
  { id: 'postal', label: 'Postal code', group: 'address' },
  { id: 'country', label: 'Country', group: 'address' },
  { id: 'hours', label: 'Office hours', group: 'meta' },
  { id: 'sla', label: 'Response SLA', group: 'meta' },
  { id: 'custom', label: 'Custom text', group: 'custom' },
] as const;

export type FooterOfficeFieldId = (typeof FOOTER_OFFICE_FIELDS)[number]['id'];

export type FooterOfficeLinePart = {
  field: FooterOfficeFieldId;
  /** Used when field is `custom` */
  text?: string;
};

export type FooterOfficeLine = {
  parts: FooterOfficeLinePart[];
  /** Join string between parts on this line (default ", ") */
  join?: string;
  /** Prefix hours/sla with Site Copy label */
  showLabel?: boolean;
};

export type FooterOfficeLayout = {
  lines: FooterOfficeLine[];
};

export type FooterOfficeRenderedLine = {
  key: string;
  text: string;
  kind: 'address' | 'hours' | 'sla' | 'custom';
  showLabel: boolean;
};

const FIELD_IDS = new Set<string>(FOOTER_OFFICE_FIELDS.map((f) => f.id));

const COUNTRY_DISPLAY: Record<string, string> = {
  IN: 'India',
  US: 'United States',
  GB: 'United Kingdom',
  AE: 'United Arab Emirates',
  SG: 'Singapore',
};

/** Street L1–L2 · city block · country (+ hours). */
export const FOOTER_OFFICE_LAYOUT_2_STREET: FooterOfficeLayout = {
  lines: [
    { parts: [{ field: 'street' }] },
    { parts: [{ field: 'street2' }] },
    { parts: [{ field: 'locality' }, { field: 'region' }, { field: 'postal' }], join: ', ' },
    { parts: [{ field: 'country' }] },
    { parts: [{ field: 'hours' }], showLabel: true },
  ],
};

/** Street L1–L4 each on its own row, then city / region postal / country (+ hours). */
export const FOOTER_OFFICE_LAYOUT_4_STREET: FooterOfficeLayout = {
  lines: [
    { parts: [{ field: 'street' }] },
    { parts: [{ field: 'street2' }] },
    { parts: [{ field: 'street3' }] },
    { parts: [{ field: 'street4' }] },
    { parts: [{ field: 'locality' }] },
    { parts: [{ field: 'region' }, { field: 'postal' }], join: ' ' },
    { parts: [{ field: 'country' }] },
    { parts: [{ field: 'hours' }], showLabel: true },
  ],
};

/** Compact: street lines joined, then city block + hours + SLA. */
export const FOOTER_OFFICE_LAYOUT_COMPACT: FooterOfficeLayout = {
  lines: [
    { parts: [{ field: 'street' }, { field: 'street2' }, { field: 'street3' }, { field: 'street4' }], join: ', ' },
    { parts: [{ field: 'locality' }, { field: 'region' }], join: ', ' },
    { parts: [{ field: 'postal' }, { field: 'country' }], join: ' · ' },
    { parts: [{ field: 'hours' }], showLabel: true },
    { parts: [{ field: 'sla' }], showLabel: true },
  ],
};

/** @deprecated alias — prefer FOOTER_OFFICE_LAYOUT_2_STREET */
export const FOOTER_OFFICE_LAYOUT_3_LINES = FOOTER_OFFICE_LAYOUT_2_STREET;
/** @deprecated alias — prefer FOOTER_OFFICE_LAYOUT_4_STREET */
export const FOOTER_OFFICE_LAYOUT_4_LINES = FOOTER_OFFICE_LAYOUT_4_STREET;

export const DEFAULT_FOOTER_OFFICE_LAYOUT = FOOTER_OFFICE_LAYOUT_4_STREET;

export const FOOTER_OFFICE_LAYOUT_PRESETS: Array<{
  id: string;
  label: string;
  hint: string;
  layout: FooterOfficeLayout;
}> = [
  {
    id: '4-street',
    label: '4 street rows',
    hint: 'Street L1–L4 each on its own line · City · Region postal · Country (+ hours)',
    layout: FOOTER_OFFICE_LAYOUT_4_STREET,
  },
  {
    id: '2-street',
    label: '2 street rows',
    hint: 'Street L1 · L2 · City, region, postal · Country (+ hours)',
    layout: FOOTER_OFFICE_LAYOUT_2_STREET,
  },
  {
    id: 'compact',
    label: 'Compact + SLA',
    hint: 'All street lines joined, tighter city block, hours + reply SLA',
    layout: FOOTER_OFFICE_LAYOUT_COMPACT,
  },
];

function sanitizePart(raw: unknown): FooterOfficeLinePart | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const field = typeof obj.field === 'string' ? obj.field.trim() : '';
  if (!FIELD_IDS.has(field)) return null;
  const part: FooterOfficeLinePart = { field: field as FooterOfficeFieldId };
  if (field === 'custom' && typeof obj.text === 'string') {
    part.text = obj.text;
  }
  return part;
}

function sanitizeLine(raw: unknown): FooterOfficeLine | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.parts)) return null;
  const parts = obj.parts.map(sanitizePart).filter(Boolean) as FooterOfficeLinePart[];
  if (!parts.length) return null;
  const line: FooterOfficeLine = { parts };
  if (typeof obj.join === 'string') line.join = obj.join;
  if (obj.showLabel === true) line.showLabel = true;
  return line;
}

/** Parse layout JSON; invalid / empty → default 4-street layout. */
export function parseFooterOfficeLayout(raw: unknown): FooterOfficeLayout {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return structuredClone(DEFAULT_FOOTER_OFFICE_LAYOUT);
    try {
      data = JSON.parse(trimmed);
    } catch {
      return structuredClone(DEFAULT_FOOTER_OFFICE_LAYOUT);
    }
  }
  if (!data || typeof data !== 'object') return structuredClone(DEFAULT_FOOTER_OFFICE_LAYOUT);
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.lines)) return structuredClone(DEFAULT_FOOTER_OFFICE_LAYOUT);
  const lines = obj.lines.map(sanitizeLine).filter(Boolean) as FooterOfficeLine[];
  if (!lines.length) return structuredClone(DEFAULT_FOOTER_OFFICE_LAYOUT);
  return ensureStreet3And4Lines({ lines });
}

/**
 * Older 2-street layouts gain empty L3/L4 rows so Site Settings street 3–4
 * appear in the footer without forcing a preset click.
 */
function ensureStreet3And4Lines(layout: FooterOfficeLayout): FooterOfficeLayout {
  const used = new Set(layout.lines.flatMap((line) => line.parts.map((p) => p.field)));
  if (used.has('street3') || used.has('street4')) return layout;
  if (!used.has('street') && !used.has('street2')) return layout;

  const lines = [...layout.lines];
  let insertAt = lines.findIndex(
    (line) => line.parts.length === 1 && (line.parts[0].field === 'street2' || line.parts[0].field === 'street')
  );
  if (insertAt < 0) return layout;
  /* After the last consecutive street/street2-only line */
  while (
    insertAt + 1 < lines.length &&
    lines[insertAt + 1].parts.length === 1 &&
    (lines[insertAt + 1].parts[0].field === 'street' || lines[insertAt + 1].parts[0].field === 'street2')
  ) {
    insertAt += 1;
  }
  lines.splice(insertAt + 1, 0, { parts: [{ field: 'street3' }] }, { parts: [{ field: 'street4' }] });
  return { lines };
}

export function stringifyFooterOfficeLayout(layout: FooterOfficeLayout): string {
  return JSON.stringify(layout, null, 2);
}

export type FooterOfficeValueSource = {
  addressStreet: string;
  addressStreet2: string;
  addressStreet3: string;
  addressStreet4: string;
  addressLocality: string;
  addressRegion: string;
  addressPostal: string;
  addressCountry: string;
  officeHours: string;
  responseSla: string;
  footerOfficeShowAddress?: string;
  footerOfficeShowHours?: string;
  footerOfficeShowSla?: string;
};

function isOn(value: string | undefined, fallback: boolean): boolean {
  const v = value?.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return fallback;
}

function resolveFieldValue(field: FooterOfficeFieldId, site: FooterOfficeValueSource, customText?: string): string {
  switch (field) {
    case 'street':
      return site.addressStreet?.trim() || '';
    case 'street2':
      return site.addressStreet2?.trim() || '';
    case 'street3':
      return site.addressStreet3?.trim() || '';
    case 'street4':
      return site.addressStreet4?.trim() || '';
    case 'locality':
      return site.addressLocality?.trim() || '';
    case 'region':
      return site.addressRegion?.trim() || '';
    case 'postal':
      return site.addressPostal?.trim() || '';
    case 'country': {
      const raw = site.addressCountry?.trim() || '';
      if (!raw) return '';
      const code = raw.toUpperCase();
      return COUNTRY_DISPLAY[code] || raw;
    }
    case 'hours':
      return site.officeHours?.trim() || '';
    case 'sla':
      return site.responseSla?.trim() || '';
    case 'custom':
      return customText?.trim() || '';
    default:
      return '';
  }
}

function fieldAllowed(field: FooterOfficeFieldId, site: FooterOfficeValueSource): boolean {
  if (field === 'hours') return isOn(site.footerOfficeShowHours, true);
  if (field === 'sla') return isOn(site.footerOfficeShowSla, false);
  if (field === 'custom') return true;
  return isOn(site.footerOfficeShowAddress, true);
}

function lineKind(parts: FooterOfficeLinePart[]): FooterOfficeRenderedLine['kind'] {
  if (parts.every((p) => p.field === 'hours')) return 'hours';
  if (parts.every((p) => p.field === 'sla')) return 'sla';
  if (parts.every((p) => p.field === 'custom')) return 'custom';
  if (parts.some((p) => p.field === 'hours')) return 'hours';
  if (parts.some((p) => p.field === 'sla')) return 'sla';
  return 'address';
}

/**
 * Resolve layout + site values into display lines.
 * Blank field values are skipped; empty lines omitted.
 * Category toggles (address / hours / sla) still gate inclusion.
 */
export function renderFooterOfficeLines(
  site: FooterOfficeValueSource,
  layoutRaw: unknown
): FooterOfficeRenderedLine[] {
  const layout = parseFooterOfficeLayout(layoutRaw);
  const out: FooterOfficeRenderedLine[] = [];

  layout.lines.forEach((line, index) => {
    const join = line.join ?? ', ';
    const bits: string[] = [];
    const usedParts: FooterOfficeLinePart[] = [];

    for (const part of line.parts) {
      if (!fieldAllowed(part.field, site)) continue;
      const value = resolveFieldValue(part.field, site, part.text);
      if (!value) continue;
      bits.push(value);
      usedParts.push(part);
    }

    if (!bits.length) return;
    const kind = lineKind(usedParts);
    out.push({
      key: `line-${index}-${kind}`,
      text: bits.join(join),
      kind,
      showLabel: Boolean(line.showLabel) && (kind === 'hours' || kind === 'sla'),
    });
  });

  return out;
}
