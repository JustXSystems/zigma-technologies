'use client';

import { useId, type ReactNode } from 'react';
import {
  DEFAULT_HERO_COMPACT_PERCENT,
  DEFAULT_HERO_HEIGHT,
  HERO_COMPACT_MAX,
  HERO_COMPACT_MIN,
  HERO_COMPACT_STEP,
  HERO_CLUB_MAX,
  HERO_CLUB_STYLE_OPTIONS,
  HERO_HEIGHT_MODE_OPTIONS,
  clampHeroCompactPercent,
  clubHeroHeight,
  compactHeroHeight,
  heroClub,
  heroCompactPercent,
  heroHeightMode,
  normalizeHeroHeight,
  type HeroClubStyle,
  type HeroHeight,
} from '@/lib/hero-height';

const CLUB_HINT =
  'Fills spare space in the first screen: the hero takes in as many of the following sections (up to this number) as fit together on the visitor’s screen. Where none fit (typically phones), the hero stays full screen on its own.';

const CLUB_COUNTS = Array.from({ length: HERO_CLUB_MAX }, (_, i) => i + 1);

function HeroClubFields({
  count,
  style,
  onChange,
  disabled,
}: {
  count: number;
  style: HeroClubStyle;
  onChange: (next: { count: number; style: HeroClubStyle }) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.55rem' }}>
        <select
          className="admin-select"
          disabled={disabled}
          value={count}
          onChange={(e) => onChange({ count: Number(e.target.value), style })}
          aria-label="Most sections sharing the first screen"
        >
          {CLUB_COUNTS.map((n) => (
            <option key={n} value={n}>
              {n === 1 ? 'Hero + next section' : `Hero + up to ${n} sections`}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          disabled={disabled}
          value={style}
          onChange={(e) => onChange({ count, style: e.target.value === 'glass' ? 'glass' : 'stack' })}
          aria-label="How the sections join the hero"
        >
          {HERO_CLUB_STYLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <p className="az-admin-hint">{CLUB_HINT}</p>
    </>
  );
}

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
  const club = heroClub(height) ?? { count: 1, style: 'stack' as HeroClubStyle };
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
        onChange={(e) => {
          const next = e.target.value;
          if (next === 'custom') onChange(compactHeroHeight(percent));
          else if (next === 'club') onChange(clubHeroHeight(club.count, club.style));
          else onChange(normalizeHeroHeight(next, fallback));
        }}
      >
        {HERO_HEIGHT_MODE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {mode === 'club' ? (
        <HeroClubFields
          count={club.count}
          style={club.style}
          disabled={disabled}
          onChange={(next) => onChange(clubHeroHeight(next.count, next.style))}
        />
      ) : null}
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
