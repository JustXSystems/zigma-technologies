'use client';

import { parseHeroScrimStrength } from '@/lib/hero-scrim';

type Props = {
  value: unknown;
  onChange: (next: number | undefined) => void;
  /** Shown when value is unset (inherits Site Settings). */
  fallbackLabel?: string;
};

/**
 * Per-hero dark gradient / scrim strength. Empty inherits Admin → Header & Footer → Hero & menu overlays.
 */
export default function HeroScrimStrengthPicker({
  value,
  onChange,
  fallbackLabel = 'Site default',
}: Props) {
  const parsed = parseHeroScrimStrength(value);
  const overridden = parsed !== undefined;
  const shown = overridden ? parsed : 100;

  return (
    <div className="admin-field full">
      <label>Dark gradient strength — {overridden ? `${shown}%` : fallbackLabel}</label>
      <div className="admin-range-row">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={shown}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Dark gradient strength"
        />
        <input
          className="admin-input"
          type="number"
          min={0}
          max={100}
          step={1}
          value={shown}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.min(100, Math.max(0, Math.round(n))));
          }}
          aria-label="Dark gradient strength percent"
        />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: '0.35rem' }}>
        <small className="az-admin-hint" style={{ margin: 0 }}>
          Lower = more of the background video or photo shows through. {overridden ? 'Overrides' : 'Uses'} Header & Footer →
          Hero & menu overlays (hero dark gradient) unless you set a value here.
        </small>
        {overridden ? (
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => onChange(undefined)}>
            Use site default
          </button>
        ) : null}
      </div>
    </div>
  );
}
