'use client';

import {
  CARD_FIXED_HEIGHT_MAX,
  CARD_FIXED_HEIGHT_MIN,
  CARD_FIXED_HEIGHT_PRESETS,
  CARD_SIZE_MODE_OPTIONS,
  DEFAULT_CARD_FIXED_HEIGHT_PX,
  DEFAULT_CARD_SIZE_MODE,
  normalizeCardFixedHeightPx,
  normalizeCardSizeMode,
  type CatalogCardSizeMode,
} from '@/lib/types';

type Props = {
  mode: CatalogCardSizeMode | null | undefined;
  heightPx: number | null | undefined;
  onChange: (next: { card_size_mode: CatalogCardSizeMode; card_fixed_height_px: number }) => void;
};

export default function CatalogCardSizePicker({ mode, heightPx, onChange }: Props) {
  const sizeMode = normalizeCardSizeMode(mode);
  const height = normalizeCardFixedHeightPx(heightPx ?? DEFAULT_CARD_FIXED_HEIGHT_PX);
  const isFixed = sizeMode === 'fixed';
  const activePreset = CARD_FIXED_HEIGHT_PRESETS.find((p) => p.height === height)?.id ?? null;
  const previewScale = Math.max(0.42, Math.min(0.92, height / 560));

  function setMode(next: CatalogCardSizeMode) {
    onChange({
      card_size_mode: next,
      card_fixed_height_px: height,
    });
  }

  function setHeight(next: number) {
    onChange({
      card_size_mode: 'fixed',
      card_fixed_height_px: normalizeCardFixedHeightPx(next),
    });
  }

  return (
    <div className="admin-card-size-picker">
      <div className="admin-card-size-picker-glow" aria-hidden />

      <div className="admin-card-size-modes" role="radiogroup" aria-label="Catalog card size mode">
        {CARD_SIZE_MODE_OPTIONS.map((opt) => {
          const active = sizeMode === opt.value;
          return (
            <label
              key={opt.value}
              className={`admin-card-size-mode${active ? ' is-active' : ''}`}
              data-mode={opt.value}
            >
              <input
                type="radio"
                name="card_size_mode"
                value={opt.value}
                checked={active}
                onChange={() => setMode(opt.value)}
              />
              <span className="admin-card-size-mode-preview" aria-hidden>
                {opt.value === 'auto' ? (
                  <>
                    <i style={{ height: '58%' }} />
                    <i style={{ height: '78%' }} />
                    <i style={{ height: '46%' }} />
                  </>
                ) : (
                  <>
                    <i style={{ height: '72%' }} />
                    <i style={{ height: '72%' }} />
                    <i style={{ height: '72%' }} />
                  </>
                )}
              </span>
              <span className="admin-card-size-mode-copy">
                <strong>{opt.label}</strong>
                <small>{opt.description}</small>
              </span>
              <span className="admin-card-size-mode-badge">{opt.value === 'auto' ? 'Fluid' : 'Lock'}</span>
            </label>
          );
        })}
      </div>

      <div className={`admin-card-size-console${isFixed ? ' is-open' : ''}`}>
        <div className="admin-card-size-console-head">
          <div>
            <span className="admin-card-size-kicker">Dimension matrix</span>
            <h4>Fixed card height</h4>
            <p>Width follows the grid. Height is locked so every listing tile aligns.</p>
          </div>
          <div className="admin-card-size-readout" aria-live="polite">
            <span>{height}</span>
            <small>px</small>
          </div>
        </div>

        <div className="admin-card-size-presets" role="group" aria-label="Height presets">
          {CARD_FIXED_HEIGHT_PRESETS.map((preset) => {
            const active = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`admin-card-size-preset${active ? ' is-active' : ''}`}
                onClick={() => setHeight(preset.height)}
                disabled={!isFixed}
                title={preset.hint}
              >
                <span
                  className="admin-card-size-preset-bar"
                  style={{ height: `${Math.round((preset.height / CARD_FIXED_HEIGHT_MAX) * 100)}%` }}
                  aria-hidden
                />
                <strong>{preset.label}</strong>
                <small>{preset.height}px</small>
              </button>
            );
          })}
        </div>

        <div className="admin-card-size-slider-row">
          <label htmlFor="catalog-card-fixed-height">Custom height</label>
          <div className="admin-card-size-slider">
            <input
              id="catalog-card-fixed-height"
              type="range"
              min={CARD_FIXED_HEIGHT_MIN}
              max={CARD_FIXED_HEIGHT_MAX}
              step={4}
              value={height}
              disabled={!isFixed}
              onChange={(e) => setHeight(Number(e.target.value))}
              aria-valuemin={CARD_FIXED_HEIGHT_MIN}
              aria-valuemax={CARD_FIXED_HEIGHT_MAX}
              aria-valuenow={height}
            />
            <input
              className="admin-input admin-card-size-number"
              type="number"
              min={CARD_FIXED_HEIGHT_MIN}
              max={CARD_FIXED_HEIGHT_MAX}
              value={height}
              disabled={!isFixed}
              onChange={(e) => setHeight(Number(e.target.value))}
              aria-label="Card height in pixels"
            />
          </div>
          <div className="admin-card-size-ticks">
            <span>{CARD_FIXED_HEIGHT_MIN}</span>
            <span>{DEFAULT_CARD_FIXED_HEIGHT_PX}</span>
            <span>{CARD_FIXED_HEIGHT_MAX}</span>
          </div>
        </div>

        <div className="admin-card-size-stage" aria-hidden>
          <div className="admin-card-size-stage-label">
            <span>Live grid preview</span>
            <span>{isFixed ? `${height}px lock` : 'Content-driven'}</span>
          </div>
          <div className="admin-card-size-stage-grid">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`admin-card-size-stage-card${isFixed ? ' is-fixed' : ''}`}
                style={
                  isFixed
                    ? { height: `${Math.round(118 * previewScale)}px` }
                    : { height: `${Math.round([96, 128, 84][i] * previewScale)}px` }
                }
              >
                <span className="admin-card-size-stage-media" />
                <span className="admin-card-size-stage-body">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
