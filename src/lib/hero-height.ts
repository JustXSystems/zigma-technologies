/**
 * Public page hero sizing:
 * - `full` fills the viewport (industries-style);
 * - `full-<n>` / `full-<n>g` shares the first screen with as many of the next n sections as fit (stack / glass
 *   dock), falling back to `full` on screens where none fit (see HeroClubSync); not offered on the home slider;
 * - `auto` fits its content;
 * - `auto-<n>` is compact with a minimum of n% of the visible screen (still grows when content needs more room).
 */
export type HeroHeight = 'full' | 'auto' | `auto-${number}` | `full-${number}` | `full-${number}g`;

export type HeroHeightMode = 'full' | 'club' | 'auto' | 'custom';

export type HeroClubStyle = 'stack' | 'glass';

export const DEFAULT_HERO_HEIGHT: HeroHeight = 'full';

export const HERO_COMPACT_MIN = 20;
export const HERO_COMPACT_MAX = 90;
export const HERO_COMPACT_STEP = 5;
export const DEFAULT_HERO_COMPACT_PERCENT = 50;

export const HERO_CLUB_MAX = 3;

export const HERO_HEIGHT_MODE_OPTIONS: ReadonlyArray<{ value: HeroHeightMode; label: string }> = [
  { value: 'full', label: 'Full screen' },
  { value: 'club', label: 'Full screen + next sections' },
  { value: 'auto', label: 'Compact (fit content)' },
  { value: 'custom', label: 'Compact (custom height)' },
];

export const HERO_CLUB_STYLE_OPTIONS: ReadonlyArray<{ value: HeroClubStyle; label: string }> = [
  { value: 'stack', label: 'Stack — hero shrinks, sections keep their design' },
  { value: 'glass', label: 'Glass dock — sections float over the hero backdrop' },
];

const COMPACT_RE = /^auto-(\d{1,3})$/;
const CLUB_RE = /^full-(\d)(g?)$/;

export function clampHeroCompactPercent(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_HERO_COMPACT_PERCENT;
  const stepped = Math.round(n / HERO_COMPACT_STEP) * HERO_COMPACT_STEP;
  return Math.min(HERO_COMPACT_MAX, Math.max(HERO_COMPACT_MIN, stepped));
}

export function clampHeroClubCount(value: unknown): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(HERO_CLUB_MAX, Math.max(1, n)) : 1;
}

export function compactHeroHeight(percent: unknown): HeroHeight {
  return `auto-${clampHeroCompactPercent(percent)}`;
}

export function clubHeroHeight(count: unknown, style: HeroClubStyle = 'stack'): HeroHeight {
  const n = clampHeroClubCount(count);
  return style === 'glass' ? `full-${n}g` : `full-${n}`;
}

/** Compact height in % of the visible screen, or null for full screen / fit content. */
export function heroCompactPercent(value: HeroHeight): number | null {
  const match = COMPACT_RE.exec(value);
  return match ? Number(match[1]) : null;
}

/** Sections sharing the first screen with a full-screen hero, or null when the hero stands alone. */
export function heroClub(value: HeroHeight): { count: number; style: HeroClubStyle } | null {
  const match = CLUB_RE.exec(value);
  return match ? { count: Number(match[1]), style: match[2] ? 'glass' : 'stack' } : null;
}

export function heroHeightMode(value: HeroHeight): HeroHeightMode {
  if (value === 'full' || value === 'auto') return value;
  return heroClub(value) ? 'club' : 'custom';
}

export function isHeroHeight(value: unknown): value is HeroHeight {
  return typeof value === 'string' && (value === 'full' || value === 'auto' || COMPACT_RE.test(value) || CLUB_RE.test(value));
}

export function normalizeHeroHeight(value: unknown, fallback: HeroHeight = DEFAULT_HERO_HEIGHT): HeroHeight {
  if (value === 'full' || value === 'auto') return value;
  if (typeof value !== 'string') return fallback;
  const compact = COMPACT_RE.exec(value);
  if (compact) return compactHeroHeight(compact[1]);
  const club = CLUB_RE.exec(value);
  if (club) return clubHeroHeight(club[1], club[2] ? 'glass' : 'stack');
  return fallback;
}

export function heroHeightClass(value: unknown, fallback?: HeroHeight): string {
  const height = normalizeHeroHeight(value, fallback);
  if (height === 'full') return 'hero-full';
  const club = heroClub(height);
  if (club) return `hero-full hero-club hero-club-${club.count}${club.style === 'glass' ? ' hero-club--glass' : ''}`;
  const percent = heroCompactPercent(height);
  return percent ? `hero-auto hero-compact hero-h-${percent}` : 'hero-auto';
}

/** Vertical position of the hero copy inside a full-screen / custom-height hero. */
export type HeroVAlign = 'top' | 'center' | 'bottom';

export const HERO_VALIGN_CHOICES: ReadonlyArray<{ value: '' | HeroVAlign; label: string }> = [
  { value: '', label: 'Default (centre)' },
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Centre' },
  { value: 'bottom', label: 'Bottom' },
];

export function isHeroVAlign(value: unknown): value is HeroVAlign {
  return value === 'top' || value === 'center' || value === 'bottom';
}

/** `hero-v-*` class (see globals.css); empty keeps the hero's own default. */
export function heroVAlignClass(value: unknown): string {
  return isHeroVAlign(value) ? `hero-v-${value}` : '';
}

/** Opt-in page-scroll progress bar: shown once enabled in the editor (`{ hidden: false }`). */
export function heroScrollBarOn(bar: { hidden?: boolean } | undefined | null): boolean {
  return Boolean(bar) && !bar!.hidden;
}

/** Rewrites viewport-height units (`vh`/`svh`/`dvh`/`lvh`) to the measured `--hero-vh`, e.g. `min(100dvh, 920px)`. */
export function fitHeroViewportUnits(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.replace(/(\d*\.?\d+)[sdl]?vh\b/gi, (_, n: string) =>
    Number(n) === 100 ? 'var(--hero-vh)' : `calc(var(--hero-vh) * ${Number(n) / 100})`
  );
}
