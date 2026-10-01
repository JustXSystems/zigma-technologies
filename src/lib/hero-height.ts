/**
 * Public page hero sizing: `full` fills the viewport (industries-style), `auto` fits its content, and
 * `auto-<n>` is compact with a minimum of n% of the visible screen (still grows when content needs more room).
 */
export type HeroHeight = 'full' | 'auto' | `auto-${number}`;

export type HeroHeightMode = 'full' | 'auto' | 'custom';

export const DEFAULT_HERO_HEIGHT: HeroHeight = 'full';

export const HERO_COMPACT_MIN = 20;
export const HERO_COMPACT_MAX = 90;
export const HERO_COMPACT_STEP = 5;
export const DEFAULT_HERO_COMPACT_PERCENT = 50;

export const HERO_HEIGHT_MODE_OPTIONS: ReadonlyArray<{ value: HeroHeightMode; label: string }> = [
  { value: 'full', label: 'Full screen' },
  { value: 'auto', label: 'Compact (fit content)' },
  { value: 'custom', label: 'Compact (custom height)' },
];

export function clampHeroCompactPercent(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_HERO_COMPACT_PERCENT;
  const stepped = Math.round(n / HERO_COMPACT_STEP) * HERO_COMPACT_STEP;
  return Math.min(HERO_COMPACT_MAX, Math.max(HERO_COMPACT_MIN, stepped));
}

export function compactHeroHeight(percent: unknown): HeroHeight {
  return `auto-${clampHeroCompactPercent(percent)}`;
}

/** Compact height in % of the visible screen, or null for full screen / fit content. */
export function heroCompactPercent(value: HeroHeight): number | null {
  const match = /^auto-(\d{1,3})$/.exec(value);
  return match ? Number(match[1]) : null;
}

export function heroHeightMode(value: HeroHeight): HeroHeightMode {
  if (value === 'full' || value === 'auto') return value;
  return 'custom';
}

export function isHeroHeight(value: unknown): value is HeroHeight {
  return typeof value === 'string' && (value === 'full' || value === 'auto' || /^auto-\d{1,3}$/.test(value));
}

export function normalizeHeroHeight(value: unknown, fallback: HeroHeight = DEFAULT_HERO_HEIGHT): HeroHeight {
  if (value === 'full' || value === 'auto') return value;
  if (typeof value === 'string' && /^auto-\d{1,3}$/.test(value)) return compactHeroHeight(value.slice(5));
  return fallback;
}

export function heroHeightClass(value: unknown, fallback?: HeroHeight): string {
  const height = normalizeHeroHeight(value, fallback);
  if (height === 'full') return 'hero-full';
  const percent = heroCompactPercent(height);
  return percent ? `hero-auto hero-compact hero-h-${percent}` : 'hero-auto';
}

/** Rewrites viewport-height units (`vh`/`svh`/`dvh`/`lvh`) to the measured `--hero-vh`, e.g. `min(100dvh, 920px)`. */
export function fitHeroViewportUnits(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.replace(/(\d*\.?\d+)[sdl]?vh\b/gi, (_, n: string) =>
    Number(n) === 100 ? 'var(--hero-vh)' : `calc(var(--hero-vh) * ${Number(n) / 100})`
  );
}
