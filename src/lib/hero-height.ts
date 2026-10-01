/** Public page hero sizing: `full` fills the viewport (industries-style), `auto` fits its content. */
export type HeroHeight = 'full' | 'auto';

export const HERO_HEIGHT_VALUES = ['full', 'auto'] as const;

export const DEFAULT_HERO_HEIGHT: HeroHeight = 'full';

export const HERO_HEIGHT_OPTIONS: ReadonlyArray<{ value: HeroHeight; label: string }> = [
  { value: 'full', label: 'Full screen' },
  { value: 'auto', label: 'Compact (fit content)' },
];

export function normalizeHeroHeight(value: unknown, fallback: HeroHeight = DEFAULT_HERO_HEIGHT): HeroHeight {
  return value === 'full' || value === 'auto' ? value : fallback;
}

export function heroHeightClass(value: unknown, fallback?: HeroHeight): string {
  return normalizeHeroHeight(value, fallback) === 'full' ? 'hero-full' : 'hero-auto';
}

/** Rewrites viewport-height units (`vh`/`svh`/`dvh`/`lvh`) to the measured `--hero-vh`, e.g. `min(100dvh, 920px)`. */
export function fitHeroViewportUnits(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.replace(/(\d*\.?\d+)[sdl]?vh\b/gi, (_, n: string) =>
    Number(n) === 100 ? 'var(--hero-vh)' : `calc(var(--hero-vh) * ${Number(n) / 100})`
  );
}
