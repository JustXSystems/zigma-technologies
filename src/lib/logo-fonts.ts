/** Curated logo fonts + helpers for admin picker / live preview. */

export type LogoFontCategory = 'site' | 'sans' | 'serif' | 'display' | 'mono';

export type LogoFontOption = {
  id: string;
  label: string;
  /** CSS font-family value stored in site settings */
  css: string;
  category: LogoFontCategory;
  /** Google Fonts family name; omit for site tokens / system */
  googleFamily?: string;
  sample?: string;
};

export const LOGO_FONT_CATEGORIES: Array<{ id: LogoFontCategory; label: string }> = [
  { id: 'site', label: 'Site tokens' },
  { id: 'sans', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'mono', label: 'Mono' },
];

export const LOGO_FONT_OPTIONS: LogoFontOption[] = [
  { id: 'site-display', label: 'Display', css: 'var(--font-display)', category: 'site', googleFamily: 'Space Grotesk', sample: 'Space Grotesk' },
  { id: 'site-body', label: 'Body', css: 'var(--font-body)', category: 'site', googleFamily: 'Inter', sample: 'Inter' },
  { id: 'site-mono', label: 'Mono', css: 'var(--font-mono)', category: 'site', googleFamily: 'IBM Plex Mono', sample: 'IBM Plex Mono' },

  { id: 'inter', label: 'Inter', css: "'Inter', sans-serif", category: 'sans', googleFamily: 'Inter' },
  { id: 'space-grotesk', label: 'Space Grotesk', css: "'Space Grotesk', sans-serif", category: 'sans', googleFamily: 'Space Grotesk' },
  { id: 'dm-sans', label: 'DM Sans', css: "'DM Sans', sans-serif", category: 'sans', googleFamily: 'DM Sans' },
  { id: 'outfit', label: 'Outfit', css: "'Outfit', sans-serif", category: 'sans', googleFamily: 'Outfit' },
  { id: 'manrope', label: 'Manrope', css: "'Manrope', sans-serif", category: 'sans', googleFamily: 'Manrope' },
  { id: 'plus-jakarta', label: 'Plus Jakarta Sans', css: "'Plus Jakarta Sans', sans-serif", category: 'sans', googleFamily: 'Plus Jakarta Sans' },
  { id: 'poppins', label: 'Poppins', css: "'Poppins', sans-serif", category: 'sans', googleFamily: 'Poppins' },
  { id: 'montserrat', label: 'Montserrat', css: "'Montserrat', sans-serif", category: 'sans', googleFamily: 'Montserrat' },
  { id: 'work-sans', label: 'Work Sans', css: "'Work Sans', sans-serif", category: 'sans', googleFamily: 'Work Sans' },
  { id: 'figtree', label: 'Figtree', css: "'Figtree', sans-serif", category: 'sans', googleFamily: 'Figtree' },
  { id: 'sora', label: 'Sora', css: "'Sora', sans-serif", category: 'sans', googleFamily: 'Sora' },
  { id: 'nunito-sans', label: 'Nunito Sans', css: "'Nunito Sans', sans-serif", category: 'sans', googleFamily: 'Nunito Sans' },

  { id: 'playfair', label: 'Playfair Display', css: "'Playfair Display', serif", category: 'serif', googleFamily: 'Playfair Display' },
  { id: 'lora', label: 'Lora', css: "'Lora', serif", category: 'serif', googleFamily: 'Lora' },
  { id: 'libre-baskerville', label: 'Libre Baskerville', css: "'Libre Baskerville', serif", category: 'serif', googleFamily: 'Libre Baskerville' },
  { id: 'source-serif', label: 'Source Serif 4', css: "'Source Serif 4', serif", category: 'serif', googleFamily: 'Source Serif 4' },
  { id: 'fraunces', label: 'Fraunces', css: "'Fraunces', serif", category: 'serif', googleFamily: 'Fraunces' },

  { id: 'syne', label: 'Syne', css: "'Syne', sans-serif", category: 'display', googleFamily: 'Syne' },
  { id: 'oswald', label: 'Oswald', css: "'Oswald', sans-serif", category: 'display', googleFamily: 'Oswald' },
  { id: 'bebas', label: 'Bebas Neue', css: "'Bebas Neue', sans-serif", category: 'display', googleFamily: 'Bebas Neue' },
  { id: 'archivo-black', label: 'Archivo Black', css: "'Archivo Black', sans-serif", category: 'display', googleFamily: 'Archivo Black' },
  { id: 'anton', label: 'Anton', css: "'Anton', sans-serif", category: 'display', googleFamily: 'Anton' },

  { id: 'ibm-plex-mono', label: 'IBM Plex Mono', css: "'IBM Plex Mono', monospace", category: 'mono', googleFamily: 'IBM Plex Mono' },
  { id: 'jetbrains-mono', label: 'JetBrains Mono', css: "'JetBrains Mono', monospace", category: 'mono', googleFamily: 'JetBrains Mono' },
  { id: 'space-mono', label: 'Space Mono', css: "'Space Mono', monospace", category: 'mono', googleFamily: 'Space Mono' },
  { id: 'fira-code', label: 'Fira Code', css: "'Fira Code', monospace", category: 'mono', googleFamily: 'Fira Code' },
  { id: 'roboto-mono', label: 'Roboto Mono', css: "'Roboto Mono', monospace", category: 'mono', googleFamily: 'Roboto Mono' },
];

const SITE_TOKEN_RESOLVE: Record<string, string> = {
  'var(--font-display)': "'Space Grotesk', sans-serif",
  'var(--font-body)': "'Inter', sans-serif",
  'var(--font-mono)': "'IBM Plex Mono', monospace",
};

/** Resolve CSS vars so admin preview can render without site :root tokens. */
export function resolveLogoFontCss(value: string | undefined, fallback: string): string {
  const trimmed = (value || '').trim() || fallback;
  return SITE_TOKEN_RESOLVE[trimmed] || trimmed;
}

export function findLogoFontOption(css: string | undefined): LogoFontOption | undefined {
  const trimmed = (css || '').trim();
  if (!trimmed) return undefined;
  return LOGO_FONT_OPTIONS.find((o) => o.css === trimmed);
}

export function googleFontHref(families: string[]): string {
  const unique = [...new Set(families.filter(Boolean))];
  if (!unique.length) return '';
  const q = unique
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

const loadedGoogleFamilies = new Set<string>();

/** Inject Google Fonts stylesheet for preview (client-only, idempotent). */
export function ensureGoogleFontsLoaded(families: Array<string | undefined>) {
  if (typeof document === 'undefined') return;
  const needed = [...new Set(families.filter((f): f is string => Boolean(f && f.trim())))].filter(
    (f) => !loadedGoogleFamilies.has(f)
  );
  if (!needed.length) return;
  needed.forEach((f) => loadedGoogleFamilies.add(f));
  const href = googleFontHref(needed);
  if (!href) return;
  const id = `logo-font-preview-${needed.join('-').replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export function googleFamilyFromCss(css: string | undefined): string | undefined {
  const opt = findLogoFontOption(css);
  if (opt?.googleFamily) return opt.googleFamily;
  const match = (css || '').match(/['"]([^'"]+)['"]/);
  return match?.[1];
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
