import type { CSSProperties } from 'react';

/** 0–100 dark-gradient strength for a single hero section; undefined = inherit site setting. */
export function parseHeroScrimStrength(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Inline style setting `--hero-scrim-local` when the section overrides site strength. */
export function heroScrimStyle(value: unknown): CSSProperties | undefined {
  const n = parseHeroScrimStrength(value);
  if (n === undefined) return undefined;
  return { ['--hero-scrim-local' as string]: String(n / 100) };
}
