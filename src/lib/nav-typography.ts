/** Header navigation font overrides (Site Settings → navTypographyJson). Blank fields keep the nav menu style preset. */
import {
  sanitizeCssFontFamily,
  sanitizeCssFontStyle,
  sanitizeCssFontWeight,
  sanitizeCssLetterSpacing,
  sanitizeCssSize,
} from '@/lib/site-settings';

export type NavTypeFields = {
  font: string;
  size: string;
  sizeMobile: string;
  weight: string;
  style: string;
  letterSpacing: string;
  transform: string;
};

export const NAV_TYPE_GROUPS = [
  {
    id: 'top',
    label: 'Top menu items',
    description: 'Header links and dropdown triggers (Who We Are, What We Do, Projects …).',
  },
  {
    id: 'heading',
    label: 'Submenu headings',
    description: 'Column titles inside the dropdown / mega panel (About Us, Generate, Protect …).',
  },
  {
    id: 'link',
    label: 'Submenu links',
    description: 'Links listed under each submenu heading.',
  },
] as const;

export type NavTypeGroupId = (typeof NAV_TYPE_GROUPS)[number]['id'];

export type NavTypography = Record<NavTypeGroupId, NavTypeFields>;

export const NAV_TRANSFORM_OPTIONS = [
  { value: '', label: 'Preset default' },
  { value: 'none', label: 'As typed' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'capitalize', label: 'Capitalize Each Word' },
  { value: 'lowercase', label: 'lowercase' },
] as const;

/** Classic preset values — used as admin placeholders and preview fallbacks. */
export const NAV_TYPE_PRESET_HINTS: Record<NavTypeGroupId, NavTypeFields> = {
  top: {
    font: 'var(--font-body)',
    size: '0.92em',
    sizeMobile: '1.05em',
    weight: '500',
    style: 'normal',
    letterSpacing: 'normal',
    transform: 'none',
  },
  heading: {
    font: 'var(--font-mono)',
    size: '0.72em',
    sizeMobile: '0.9em',
    weight: '600',
    style: 'normal',
    letterSpacing: '0.1em',
    transform: 'uppercase',
  },
  link: {
    font: 'var(--font-body)',
    size: '0.92em',
    sizeMobile: '0.92em',
    weight: '400',
    style: 'normal',
    letterSpacing: 'normal',
    transform: 'none',
  },
};

const EMPTY_FIELDS: NavTypeFields = {
  font: '',
  size: '',
  sizeMobile: '',
  weight: '',
  style: '',
  letterSpacing: '',
  transform: '',
};

const FIELD_KEYS = Object.keys(EMPTY_FIELDS) as Array<keyof NavTypeFields>;

export function emptyNavTypography(): NavTypography {
  return { top: { ...EMPTY_FIELDS }, heading: { ...EMPTY_FIELDS }, link: { ...EMPTY_FIELDS } };
}

export function parseNavTypography(raw: string | undefined): NavTypography {
  const out = emptyNavTypography();
  if (!raw?.trim()) return out;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return out;
  }
  if (!data || typeof data !== 'object') return out;
  for (const group of NAV_TYPE_GROUPS) {
    const src = (data as Record<string, unknown>)[group.id];
    if (!src || typeof src !== 'object') continue;
    for (const key of FIELD_KEYS) {
      const value = (src as Record<string, unknown>)[key];
      if (typeof value === 'string') out[group.id][key] = value;
    }
  }
  return out;
}

/** Drops blank fields/groups so an untouched editor saves as an empty string. */
export function serializeNavTypography(value: NavTypography): string {
  const out: Partial<Record<NavTypeGroupId, Partial<NavTypeFields>>> = {};
  for (const group of NAV_TYPE_GROUPS) {
    const fields: Partial<NavTypeFields> = {};
    for (const key of FIELD_KEYS) {
      const v = value[group.id][key].trim();
      if (v) fields[key] = v;
    }
    if (Object.keys(fields).length) out[group.id] = fields;
  }
  return Object.keys(out).length ? JSON.stringify(out) : '';
}

function sanitizeTransform(value: string): string {
  const v = value.trim().toLowerCase();
  return v === 'none' || v === 'uppercase' || v === 'capitalize' || v === 'lowercase' ? v : '';
}

/** Validated CSS values for one group; invalid or blank entries come back as ''. */
export function resolveNavTypeFields(fields: NavTypeFields): NavTypeFields {
  return {
    font: sanitizeCssFontFamily(fields.font, ''),
    size: sanitizeCssSize(fields.size, ''),
    sizeMobile: sanitizeCssSize(fields.sizeMobile, ''),
    weight: sanitizeCssFontWeight(fields.weight, ''),
    style: sanitizeCssFontStyle(fields.style, ''),
    letterSpacing: sanitizeCssLetterSpacing(fields.letterSpacing, ''),
    transform: sanitizeTransform(fields.transform),
  };
}

/* #siteHeader outranks every preset / chrome / mobile rule in globals.css without !important. */
const SELECTORS: Record<NavTypeGroupId, string> = {
  top: 'header#siteHeader .nav-links > li > a,header#siteHeader .nav-links > li > .nav-parent',
  heading: 'header#siteHeader .mega-col h5,header#siteHeader .mega-col h5 a',
  link: 'header#siteHeader .mega-col > a',
};

export function navTypographyCss(raw: string | undefined): string {
  const parsed = parseNavTypography(raw);
  const all: string[] = [];
  const desktop: string[] = [];
  const mobile: string[] = [];
  for (const group of NAV_TYPE_GROUPS) {
    const t = resolveNavTypeFields(parsed[group.id]);
    const sel = SELECTORS[group.id];
    const decls = [
      t.font && `font-family:${t.font}`,
      t.weight && `font-weight:${t.weight}`,
      t.style && `font-style:${t.style}`,
      t.letterSpacing && `letter-spacing:${t.letterSpacing}`,
      t.transform && `text-transform:${t.transform}`,
    ].filter(Boolean);
    if (decls.length) all.push(`${sel}{${decls.join(';')};}`);
    if (t.size) desktop.push(`${sel}{font-size:${t.size};}`);
    if (t.sizeMobile) mobile.push(`${sel}{font-size:${t.sizeMobile};}`);
  }
  return [
    all.join(''),
    desktop.length ? `@media (min-width:1200px){${desktop.join('')}}` : '',
    mobile.length ? `@media (max-width:1199px){${mobile.join('')}}` : '',
  ].join('');
}
