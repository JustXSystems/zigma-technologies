/** System/local font catalog + helpers for Windows-style logo font picker. */

export type LogoFontGeneric = 'sans-serif' | 'serif' | 'monospace' | 'cursive' | 'fantasy';

export type LogoFontEntry = {
  /** Display / family name */
  family: string;
  /** Stored CSS font-family value */
  css: string;
  generic: LogoFontGeneric;
  /** Site theme token (not a real OS face) */
  siteToken?: boolean;
};

/** Quote family names that need it for CSS. */
export function quoteFontFamily(family: string): string {
  const trimmed = family.trim();
  if (!trimmed) return 'sans-serif';
  if (/^[a-zA-Z][\w-]*$/.test(trimmed)) return trimmed;
  return `'${trimmed.replace(/'/g, '')}'`;
}

export function cssStackForFamily(family: string, generic: LogoFontGeneric = 'sans-serif'): string {
  return `${quoteFontFamily(family)}, ${generic}`;
}

const SITE_TOKENS: LogoFontEntry[] = [
  { family: 'Site display', css: 'var(--font-display)', generic: 'sans-serif', siteToken: true },
  { family: 'Site body', css: 'var(--font-body)', generic: 'sans-serif', siteToken: true },
  { family: 'Site mono', css: 'var(--font-mono)', generic: 'monospace', siteToken: true },
];

/**
 * Common Windows / macOS / Linux faces — filtered client-side to what is
 * actually installed (canvas probe), so the dropdown behaves like OS font pickers.
 */
export const SYSTEM_FONT_CATALOG: Array<{ family: string; generic: LogoFontGeneric }> = [
  // Windows classics
  { family: 'Arial', generic: 'sans-serif' },
  { family: 'Arial Black', generic: 'sans-serif' },
  { family: 'Arial Narrow', generic: 'sans-serif' },
  { family: 'Bahnschrift', generic: 'sans-serif' },
  { family: 'Calibri', generic: 'sans-serif' },
  { family: 'Calibri Light', generic: 'sans-serif' },
  { family: 'Cambria', generic: 'serif' },
  { family: 'Cambria Math', generic: 'serif' },
  { family: 'Candara', generic: 'sans-serif' },
  { family: 'Comic Sans MS', generic: 'cursive' },
  { family: 'Consolas', generic: 'monospace' },
  { family: 'Constantia', generic: 'serif' },
  { family: 'Corbel', generic: 'sans-serif' },
  { family: 'Courier New', generic: 'monospace' },
  { family: 'Ebrima', generic: 'sans-serif' },
  { family: 'Franklin Gothic Medium', generic: 'sans-serif' },
  { family: 'Gabriola', generic: 'cursive' },
  { family: 'Gadugi', generic: 'sans-serif' },
  { family: 'Georgia', generic: 'serif' },
  { family: 'Impact', generic: 'sans-serif' },
  { family: 'Ink Free', generic: 'cursive' },
  { family: 'Javanese Text', generic: 'serif' },
  { family: 'Leelawadee UI', generic: 'sans-serif' },
  { family: 'Lucida Console', generic: 'monospace' },
  { family: 'Lucida Sans Unicode', generic: 'sans-serif' },
  { family: 'Malgun Gothic', generic: 'sans-serif' },
  { family: 'Microsoft Himalaya', generic: 'serif' },
  { family: 'Microsoft JhengHei', generic: 'sans-serif' },
  { family: 'Microsoft New Tai Lue', generic: 'sans-serif' },
  { family: 'Microsoft PhagsPa', generic: 'sans-serif' },
  { family: 'Microsoft Sans Serif', generic: 'sans-serif' },
  { family: 'Microsoft Tai Le', generic: 'sans-serif' },
  { family: 'Microsoft YaHei', generic: 'sans-serif' },
  { family: 'Microsoft Yi Baiti', generic: 'sans-serif' },
  { family: 'MingLiU-ExtB', generic: 'serif' },
  { family: 'Mongolian Baiti', generic: 'serif' },
  { family: 'MS Gothic', generic: 'sans-serif' },
  { family: 'MS PGothic', generic: 'sans-serif' },
  { family: 'MS UI Gothic', generic: 'sans-serif' },
  { family: 'MV Boli', generic: 'cursive' },
  { family: 'Myanmar Text', generic: 'sans-serif' },
  { family: 'Nirmala UI', generic: 'sans-serif' },
  { family: 'Palatino Linotype', generic: 'serif' },
  { family: 'Segoe Print', generic: 'cursive' },
  { family: 'Segoe Script', generic: 'cursive' },
  { family: 'Segoe UI', generic: 'sans-serif' },
  { family: 'Segoe UI Light', generic: 'sans-serif' },
  { family: 'Segoe UI Semibold', generic: 'sans-serif' },
  { family: 'Segoe UI Black', generic: 'sans-serif' },
  { family: 'SimSun', generic: 'serif' },
  { family: 'Sitka Text', generic: 'serif' },
  { family: 'Sitka Display', generic: 'serif' },
  { family: 'Sylfaen', generic: 'serif' },
  { family: 'Tahoma', generic: 'sans-serif' },
  { family: 'Times New Roman', generic: 'serif' },
  { family: 'Trebuchet MS', generic: 'sans-serif' },
  { family: 'Verdana', generic: 'sans-serif' },
  { family: 'Yu Gothic', generic: 'sans-serif' },
  { family: 'Yu Gothic UI', generic: 'sans-serif' },
  // macOS / cross-platform
  { family: 'American Typewriter', generic: 'serif' },
  { family: 'Andale Mono', generic: 'monospace' },
  { family: 'Apple Chancery', generic: 'cursive' },
  { family: 'Apple Color Emoji', generic: 'sans-serif' },
  { family: 'Avenir', generic: 'sans-serif' },
  { family: 'Avenir Next', generic: 'sans-serif' },
  { family: 'Baskerville', generic: 'serif' },
  { family: 'Big Caslon', generic: 'serif' },
  { family: 'Bodoni 72', generic: 'serif' },
  { family: 'Bradley Hand', generic: 'cursive' },
  { family: 'Brush Script MT', generic: 'cursive' },
  { family: 'Chalkboard', generic: 'sans-serif' },
  { family: 'Chalkboard SE', generic: 'sans-serif' },
  { family: 'Chalkduster', generic: 'cursive' },
  { family: 'Charter', generic: 'serif' },
  { family: 'Cochin', generic: 'serif' },
  { family: 'Copperplate', generic: 'serif' },
  { family: 'Didot', generic: 'serif' },
  { family: 'Futura', generic: 'sans-serif' },
  { family: 'Geneva', generic: 'sans-serif' },
  { family: 'Gill Sans', generic: 'sans-serif' },
  { family: 'Helvetica', generic: 'sans-serif' },
  { family: 'Helvetica Neue', generic: 'sans-serif' },
  { family: 'Herculanum', generic: 'fantasy' },
  { family: 'Hoefler Text', generic: 'serif' },
  { family: 'Lucida Grande', generic: 'sans-serif' },
  { family: 'Luminari', generic: 'fantasy' },
  { family: 'Marker Felt', generic: 'cursive' },
  { family: 'Menlo', generic: 'monospace' },
  { family: 'Monaco', generic: 'monospace' },
  { family: 'Noteworthy', generic: 'cursive' },
  { family: 'Optima', generic: 'sans-serif' },
  { family: 'Palatino', generic: 'serif' },
  { family: 'Papyrus', generic: 'fantasy' },
  { family: 'Phosphate', generic: 'sans-serif' },
  { family: 'Rockwell', generic: 'serif' },
  { family: 'SF Mono', generic: 'monospace' },
  { family: 'SF Pro Display', generic: 'sans-serif' },
  { family: 'SF Pro Text', generic: 'sans-serif' },
  { family: 'Skia', generic: 'sans-serif' },
  { family: 'Snell Roundhand', generic: 'cursive' },
  { family: 'Zapfino', generic: 'cursive' },
  // Linux / common web-safe
  { family: 'Cantarell', generic: 'sans-serif' },
  { family: 'DejaVu Sans', generic: 'sans-serif' },
  { family: 'DejaVu Sans Mono', generic: 'monospace' },
  { family: 'DejaVu Serif', generic: 'serif' },
  { family: 'FreeMono', generic: 'monospace' },
  { family: 'FreeSans', generic: 'sans-serif' },
  { family: 'FreeSerif', generic: 'serif' },
  { family: 'Liberation Mono', generic: 'monospace' },
  { family: 'Liberation Sans', generic: 'sans-serif' },
  { family: 'Liberation Serif', generic: 'serif' },
  { family: 'Noto Sans', generic: 'sans-serif' },
  { family: 'Noto Serif', generic: 'serif' },
  { family: 'Noto Mono', generic: 'monospace' },
  { family: 'Ubuntu', generic: 'sans-serif' },
  { family: 'Ubuntu Mono', generic: 'monospace' },
  // Site webfonts already linked sitewide (always usable)
  { family: 'Space Grotesk', generic: 'sans-serif' },
  { family: 'Inter', generic: 'sans-serif' },
  { family: 'IBM Plex Mono', generic: 'monospace' },
];

export function catalogToEntries(): LogoFontEntry[] {
  return SYSTEM_FONT_CATALOG.map((f) => ({
    family: f.family,
    css: cssStackForFamily(f.family, f.generic),
    generic: f.generic,
  }));
}

const SITE_TOKEN_RESOLVE: Record<string, string> = {
  'var(--font-display)': "'Space Grotesk', sans-serif",
  'var(--font-body)': "'Inter', sans-serif",
  'var(--font-mono)': "'IBM Plex Mono', monospace",
};

/** Resolve CSS vars so admin preview can render without relying only on inheritance. */
export function resolveLogoFontCss(value: string | undefined, fallback: string): string {
  const trimmed = (value || '').trim() || fallback;
  return SITE_TOKEN_RESOLVE[trimmed] || trimmed;
}

/** Primary family name from a stored CSS stack (for matching dropdown). */
export function primaryFamilyFromCss(css: string | undefined): string | undefined {
  const trimmed = (css || '').trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('var(')) return trimmed;
  const match = trimmed.match(/^'([^']+)'|^"([^"]+)"|^([a-zA-Z][\w-]*)/);
  return match?.[1] || match?.[2] || match?.[3];
}

/**
 * Canvas width probe — classic “is this font installed?” check.
 * Works without Local Font Access permission.
 */
export function isLocalFontInstalled(family: string): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const sample = 'mmmmmmmmmmlliWw@|';
  const size = '72px';
  const bases = ['monospace', 'sans-serif', 'serif'] as const;
  for (const base of bases) {
    ctx.font = `${size} ${base}`;
    const baseline = ctx.measureText(sample).width;
    ctx.font = `${size} ${quoteFontFamily(family)}, ${base}`;
    if (ctx.measureText(sample).width !== baseline) return true;
  }
  return false;
}

type LocalFontFace = { family: string };

async function queryOsFonts(): Promise<string[]> {
  if (typeof window === 'undefined') return [];
  const queryLocalFonts = (
    window as Window & {
      queryLocalFonts?: () => Promise<LocalFontFace[]>;
    }
  ).queryLocalFonts;
  if (typeof queryLocalFonts !== 'function') return [];
  try {
    const faces = await queryLocalFonts();
    const names = new Set<string>();
    for (const face of faces) {
      const family = face.family?.trim();
      if (family) names.add(family);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function guessGeneric(family: string): LogoFontGeneric {
  const lower = family.toLowerCase();
  if (/\b(mono|console|courier|menlo|monaco|consolas)\b/.test(lower)) return 'monospace';
  if (/\b(serif|roman|times|georgia|garamond|baskerville|palatino|cambria|constantia)\b/.test(lower)) {
    return 'serif';
  }
  if (/\b(script|hand|comic|cursive|calligraphy)\b/.test(lower)) return 'cursive';
  if (/\b(wingdings|webdings|symbol|fantasy)\b/.test(lower)) return 'fantasy';
  const known = SYSTEM_FONT_CATALOG.find((f) => f.family.toLowerCase() === lower);
  return known?.generic || 'sans-serif';
}

export type DetectedFontsResult = {
  fonts: LogoFontEntry[];
  source: 'local-api' | 'canvas' | 'catalog';
};

/**
 * Build the dropdown list: site tokens + every available local face.
 * Prefers Local Font Access API; falls back to canvas-probed catalog.
 */
export async function detectAvailableFonts(): Promise<DetectedFontsResult> {
  const osNames = await queryOsFonts();
  if (osNames.length) {
    const fonts: LogoFontEntry[] = [
      ...SITE_TOKENS,
      ...osNames.map((family) => {
        const generic = guessGeneric(family);
        return { family, css: cssStackForFamily(family, generic), generic };
      }),
    ];
    return { fonts, source: 'local-api' };
  }

  const installed = SYSTEM_FONT_CATALOG.filter((f) => isLocalFontInstalled(f.family));
  // Always include site webfonts even if probe is flaky
  const always = new Set(['Space Grotesk', 'Inter', 'IBM Plex Mono']);
  const merged = new Map<string, LogoFontEntry>();
  for (const token of SITE_TOKENS) merged.set(token.css, token);
  for (const f of SYSTEM_FONT_CATALOG) {
    if (installed.some((i) => i.family === f.family) || always.has(f.family)) {
      merged.set(
        cssStackForFamily(f.family, f.generic),
        { family: f.family, css: cssStackForFamily(f.family, f.generic), generic: f.generic }
      );
    }
  }

  const fonts = [...merged.values()].sort((a, b) => {
    if (a.siteToken && !b.siteToken) return -1;
    if (!a.siteToken && b.siteToken) return 1;
    return a.family.localeCompare(b.family);
  });

  return {
    fonts: fonts.length > SITE_TOKENS.length ? fonts : [...SITE_TOKENS, ...catalogToEntries()],
    source: fonts.length > SITE_TOKENS.length ? 'canvas' : 'catalog',
  };
}

export function findFontEntry(css: string | undefined, fonts: LogoFontEntry[]): LogoFontEntry | undefined {
  const trimmed = (css || '').trim();
  if (!trimmed) return undefined;
  const exact = fonts.find((f) => f.css === trimmed);
  if (exact) return exact;
  const primary = primaryFamilyFromCss(trimmed);
  if (!primary) return undefined;
  if (primary.startsWith('var(')) return fonts.find((f) => f.css === primary);
  return fonts.find((f) => f.family.toLowerCase() === primary.toLowerCase());
}

export const LOGO_WEIGHT_OPTIONS = [
  { value: '300', label: '300 Light' },
  { value: '400', label: '400 Regular' },
  { value: '500', label: '500 Medium' },
  { value: '600', label: '600 Semi' },
  { value: '700', label: '700 Bold' },
  { value: '800', label: '800 Extra' },
  { value: 'normal', label: 'normal' },
  { value: 'bold', label: 'bold' },
] as const;

export const LOGO_STYLE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'italic', label: 'Italic' },
  { value: 'oblique', label: 'Oblique' },
] as const;

/** @deprecated kept for any leftover imports — prefer detectAvailableFonts */
export function googleFamilyFromCss(css: string | undefined): string | undefined {
  const primary = primaryFamilyFromCss(css);
  if (!primary || primary.startsWith('var(')) return undefined;
  const web = ['Space Grotesk', 'Inter', 'IBM Plex Mono'];
  return web.includes(primary) ? primary : undefined;
}

export function ensureGoogleFontsLoaded(families: Array<string | undefined>) {
  if (typeof document === 'undefined') return;
  const needed = [...new Set(families.filter((f): f is string => Boolean(f && f.trim())))];
  if (!needed.length) return;
  const q = needed
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,700`)
    .join('&');
  const href = `https://fonts.googleapis.com/css2?${q}&display=swap`;
  const id = `logo-font-${needed.join('-').replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}
