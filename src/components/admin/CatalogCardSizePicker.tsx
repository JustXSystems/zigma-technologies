'use client';

import {
  CARD_FIXED_HEIGHT_MAX,
  CARD_FIXED_HEIGHT_MIN,
  CARD_FIXED_WIDTH_MAX,
  CARD_FIXED_WIDTH_MIN,
  DEFAULT_CARD_FIXED_HEIGHT_PX,
  DEFAULT_CARD_FIXED_WIDTH_PX,
  normalizeCardFixedHeightPx,
  normalizeCardFixedWidthPx,
  normalizeCardSizeMode,
  type CatalogCardSizeMode,
} from '@/lib/types';

type Props = {
  mode: CatalogCardSizeMode | null | undefined;
  heightPx: number | null | undefined;
  widthPx: number | null | undefined;
  onChange: (next: {
    card_size_mode: CatalogCardSizeMode;
    card_fixed_height_px: number;
    card_fixed_width_px: number;
  }) => void;
};

export default function CatalogCardSizePicker({ mode, heightPx, widthPx, onChange }: Props) {
  const sizeMode = normalizeCardSizeMode(mode);
  const height = normalizeCardFixedHeightPx(heightPx ?? DEFAULT_CARD_FIXED_HEIGHT_PX);
  const width = normalizeCardFixedWidthPx(widthPx ?? DEFAULT_CARD_FIXED_WIDTH_PX);
  const isCustom = sizeMode === 'custom';

  function patch(partial: Partial<{
    card_size_mode: CatalogCardSizeMode;
    card_fixed_height_px: number;
    card_fixed_width_px: number;
  }>) {
    onChange({
      card_size_mode: partial.card_size_mode ?? sizeMode,
      card_fixed_height_px: partial.card_fixed_height_px ?? height,
      card_fixed_width_px: partial.card_fixed_width_px ?? width,
    });
  }

  return (
    <div className="admin-form-grid" style={{ gap: '0.85rem' }}>
      <div className="admin-field">
        <select
          id="catalog-card-size-mode"
          className="admin-select"
          value={sizeMode}
          onChange={(e) =>
            patch({ card_size_mode: e.target.value === 'custom' ? 'custom' : 'auto' })
          }
          aria-label="Card size"
        >
          <option value="auto">Auto (content-driven)</option>
          <option value="custom">Custom (fixed width &amp; height)</option>
        </select>
      </div>

      {isCustom ? (
        <>
          <div className="admin-field full">
            <label htmlFor="catalog-card-custom-height">
              Custom height — {height}px
            </label>
            <div className="admin-range-row">
              <input
                id="catalog-card-custom-height"
                type="range"
                min={CARD_FIXED_HEIGHT_MIN}
                max={CARD_FIXED_HEIGHT_MAX}
                step={4}
                value={height}
                onChange={(e) =>
                  patch({
                    card_size_mode: 'custom',
                    card_fixed_height_px: normalizeCardFixedHeightPx(Number(e.target.value)),
                  })
                }
                aria-label="Custom card height"
              />
              <input
                className="admin-input"
                type="number"
                min={CARD_FIXED_HEIGHT_MIN}
                max={CARD_FIXED_HEIGHT_MAX}
                value={height}
                onChange={(e) =>
                  patch({
                    card_size_mode: 'custom',
                    card_fixed_height_px: normalizeCardFixedHeightPx(Number(e.target.value)),
                  })
                }
                aria-label="Custom card height in pixels"
              />
            </div>
          </div>

          <div className="admin-field full">
            <label htmlFor="catalog-card-custom-width">
              Custom width — {width}px
            </label>
            <div className="admin-range-row">
              <input
                id="catalog-card-custom-width"
                type="range"
                min={CARD_FIXED_WIDTH_MIN}
                max={CARD_FIXED_WIDTH_MAX}
                step={4}
                value={width}
                onChange={(e) =>
                  patch({
                    card_size_mode: 'custom',
                    card_fixed_width_px: normalizeCardFixedWidthPx(Number(e.target.value)),
                  })
                }
                aria-label="Custom card width"
              />
              <input
                className="admin-input"
                type="number"
                min={CARD_FIXED_WIDTH_MIN}
                max={CARD_FIXED_WIDTH_MAX}
                value={width}
                onChange={(e) =>
                  patch({
                    card_size_mode: 'custom',
                    card_fixed_width_px: normalizeCardFixedWidthPx(Number(e.target.value)),
                  })
                }
                aria-label="Custom card width in pixels"
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
