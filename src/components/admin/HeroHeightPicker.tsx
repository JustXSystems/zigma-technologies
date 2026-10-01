'use client';

import { useId, type ReactNode } from 'react';
import {
  DEFAULT_HERO_COMPACT_PERCENT,
  DEFAULT_HERO_HEIGHT,
  HERO_COMPACT_MAX,
  HERO_COMPACT_MIN,
  HERO_COMPACT_STEP,
  HERO_HEIGHT_MODE_OPTIONS,
  clampHeroCompactPercent,
  compactHeroHeight,
  heroCompactPercent,
  heroHeightMode,
  normalizeHeroHeight,
  type HeroHeight,
} from '@/lib/hero-height';

type Props = {
  label?: ReactNode;
  value: unknown;
  onChange: (value: HeroHeight) => void;
  fallback?: HeroHeight;
  disabled?: boolean;
  full?: boolean;
};

export default function HeroHeightPicker({
  label = 'Hero height',
  value,
  onChange,
  fallback = DEFAULT_HERO_HEIGHT,
  disabled,
  full,
}: Props) {
  const id = useId();
  const height = normalizeHeroHeight(value, fallback);
  const mode = heroHeightMode(height);
  const percent = heroCompactPercent(height) ?? DEFAULT_HERO_COMPACT_PERCENT;
  const setPercent = (raw: string) => {
    const next = clampHeroCompactPercent(raw === '' ? percent : raw);
    if (next !== percent || mode !== 'custom') onChange(compactHeroHeight(next));
    return next;
  };
  const commitTyped = (input: HTMLInputElement) => {
    input.value = String(setPercent(input.value));
  };

  return (
    <div className={`admin-field${full ? ' full' : ''}`}>
      {typeof label === 'string' ? <label htmlFor={`${id}-mode`}>{label}</label> : label}
      <select
        id={`${id}-mode`}
        className="admin-select"
        disabled={disabled}
        value={mode}
        onChange={(e) =>
          onChange(e.target.value === 'custom' ? compactHeroHeight(percent) : normalizeHeroHeight(e.target.value, fallback))
        }
      >
        {HERO_HEIGHT_MODE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {mode === 'custom' ? (
        <>
          <div className="admin-range-row" style={{ marginTop: '0.55rem' }}>
            <input
              type="range"
              min={HERO_COMPACT_MIN}
              max={HERO_COMPACT_MAX}
              step={HERO_COMPACT_STEP}
              value={percent}
              disabled={disabled}
              onChange={(e) => setPercent(e.target.value)}
              aria-label="Compact hero height, percent of screen height"
            />
            <input
              key={percent}
              className="admin-input"
              type="number"
              min={HERO_COMPACT_MIN}
              max={HERO_COMPACT_MAX}
              step={HERO_COMPACT_STEP}
              defaultValue={percent}
              disabled={disabled}
              onBlur={(e) => commitTyped(e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitTyped(e.currentTarget);
                }
              }}
              aria-label="Compact hero height in percent"
            />
          </div>
          <p className="az-admin-hint">
            {percent}% of the visible screen on every device. The hero still grows when its content needs more room.
          </p>
        </>
      ) : null}
    </div>
  );
}
