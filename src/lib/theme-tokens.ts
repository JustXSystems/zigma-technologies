/** Design tokens editable from Admin Theme Studio (overlay on globals.css :root). */

export type ThemeTokenType = 'color' | 'size' | 'text';

export type ThemeTokenGroup = 'brand' | 'neutrals' | 'typography' | 'layout';

export type ThemeTokenMeta = {
  key: string;
  label: string;
  group: ThemeTokenGroup;
  type: ThemeTokenType;
};

export const THEME_TOKEN_GROUPS: Array<{ id: ThemeTokenGroup; label: string }> = [
  { id: 'brand', label: 'Brand colors' },
  { id: 'neutrals', label: 'Neutrals' },
  { id: 'typography', label: 'Typography scale' },
  { id: 'layout', label: 'Layout' },
];

export const THEME_TOKEN_META: ThemeTokenMeta[] = [
  { key: '--navy-950', label: 'Navy 950', group: 'brand', type: 'color' },
  { key: '--navy-900', label: 'Navy 900', group: 'brand', type: 'color' },
  { key: '--navy-850', label: 'Navy 850', group: 'brand', type: 'color' },
  { key: '--orange', label: 'Orange', group: 'brand', type: 'color' },
  { key: '--orange-dim', label: 'Orange (hover)', group: 'brand', type: 'color' },
  { key: '--green', label: 'Green', group: 'brand', type: 'color' },
  { key: '--green-dim', label: 'Green (dim)', group: 'brand', type: 'color' },
  { key: '--cyan', label: 'Cyan', group: 'brand', type: 'color' },
  { key: '--blue', label: 'Blue', group: 'brand', type: 'color' },
  { key: '--purple', label: 'Purple', group: 'brand', type: 'color' },
  { key: '--yellow', label: 'Yellow', group: 'brand', type: 'color' },

  { key: '--white', label: 'White', group: 'neutrals', type: 'color' },
  { key: '--gray-100', label: 'Gray 100', group: 'neutrals', type: 'color' },
  { key: '--gray-200', label: 'Gray 200', group: 'neutrals', type: 'color' },
  { key: '--graphite-800', label: 'Graphite 800', group: 'neutrals', type: 'color' },
  { key: '--graphite-500', label: 'Graphite 500', group: 'neutrals', type: 'color' },

  { key: '--text-base', label: 'Body size', group: 'typography', type: 'size' },
  { key: '--text-lead', label: 'Lead', group: 'typography', type: 'text' },
  { key: '--text-h1', label: 'Heading 1', group: 'typography', type: 'text' },
  { key: '--text-h2', label: 'Heading 2', group: 'typography', type: 'text' },
  { key: '--text-h3', label: 'Heading 3', group: 'typography', type: 'text' },
  { key: '--text-h4', label: 'Heading 4', group: 'typography', type: 'text' },
  { key: '--text-eyebrow', label: 'Eyebrow', group: 'typography', type: 'size' },

  { key: '--section-pad', label: 'Section padding', group: 'layout', type: 'size' },
  { key: '--header-h', label: 'Header height', group: 'layout', type: 'size' },
];

export const ALLOWED_THEME_TOKEN_KEYS = new Set(THEME_TOKEN_META.map((t) => t.key));

export const DEFAULT_THEME_TOKENS: Record<string, string> = {
  '--navy-950': '#0A1628',
  '--navy-900': '#0F1F3D',
  '--navy-850': '#122647',
  '--orange': '#FF6B1A',
  '--orange-dim': '#c9540f',
  '--green': '#12B76A',
  '--green-dim': '#0C8A50',
  '--yellow': '#FFC93C',
  '--cyan': '#00D4FF',
  '--blue': '#3B82F6',
  '--purple': '#A855F7',
  '--white': '#FFFFFF',
  '--gray-100': '#F4F6F9',
  '--gray-200': '#E7EBF1',
  '--graphite-800': '#1E2530',
  '--graphite-500': '#4A5565',
  '--section-pad': '9rem',
  '--header-h': '82px',
  '--text-base': '1.075rem',
  '--text-lead': 'clamp(1.15rem, 1.5vw, 1.28rem)',
  '--text-h1': 'clamp(2.6rem, 5.2vw, 4rem)',
  '--text-h2': 'clamp(2.25rem, 4vw, 3.35rem)',
  '--text-h3': 'clamp(1.35rem, 2.4vw, 1.75rem)',
  '--text-h4': 'clamp(1.15rem, 1.8vw, 1.35rem)',
  '--text-eyebrow': '0.9rem',
};

export const CSS_OVERRIDE_MAX_BYTES = 2_000_000;

export const THEME_PREVIEW_MESSAGE = 'zigma-theme-preview' as const;

/** Merge stored tokens with defaults; drop unknown keys. */
export function mergeTokens(raw: unknown): Record<string, string> {
  const out = { ...DEFAULT_THEME_TOKENS };
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!ALLOWED_THEME_TOKEN_KEYS.has(key)) continue;
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    out[key] = trimmed;
  }
  return out;
}

/** Keep only allowlisted keys with non-empty string values. */
export function pickAllowedTokens(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!ALLOWED_THEME_TOKEN_KEYS.has(key)) continue;
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    out[key] = trimmed;
  }
  return out;
}

export function tokensToCss(tokens: Record<string, string>): string {
  const merged = mergeTokens(tokens);
  const lines = Object.entries(merged).map(([k, v]) => `  ${k}:${v};`);
  return `:root{\n${lines.join('\n')}\n}\n`;
}

const DANGEROUS_CSS =
  /@import\b|expression\s*\(|javascript\s*:|vbscript\s*:|-moz-binding\b|behavior\s*:|url\s*\(\s*['"]?\s*data\s*:/gi;

export type SanitizeCssResult =
  | { ok: true; css: string }
  | { ok: false; error: string };

export function sanitizeCssOverride(input: string): SanitizeCssResult {
  if (typeof input !== 'string') {
    return { ok: false, error: 'CSS must be a string' };
  }
  const css = input.replace(/\u0000/g, '');
  const byteLength =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(css).length
      : css.length;
  if (byteLength > CSS_OVERRIDE_MAX_BYTES) {
    return {
      ok: false,
      error: `Site CSS exceeds ${(CSS_OVERRIDE_MAX_BYTES / 1_000_000).toFixed(1)}MB limit`,
    };
  }
  // Allow @import only for nothing — still blocked. Tailwind stays in Next bundle.
  DANGEROUS_CSS.lastIndex = 0;
  if (DANGEROUS_CSS.test(css)) {
    return {
      ok: false,
      error: 'CSS contains disallowed patterns (@import, expression, javascript:, data: urls, etc.)',
    };
  }
  return { ok: true, css };
}

/** Preview: tokens win over :root in the sheet, then full site CSS (later cascade). */
export function buildPreviewCss(tokens: Record<string, string>, siteCss: string): string {
  return `${siteCss || ''}\n\n/* Theme Studio token overlay */\n${tokensToCss(tokens)}\n`;
}
