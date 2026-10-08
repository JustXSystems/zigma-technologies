'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import CatalogHeroBackground from '@/components/catalog/CatalogHeroBackground';
import { MediaItemsEditor } from '@/components/admin/life/LifeControls';
import { ColorControl } from '@/components/admin/form/controls';
import {
  CATALOG_HERO_BG_AREA_OPTIONS,
  CATALOG_HERO_BG_BLEND_OPTIONS,
  CATALOG_HERO_BG_DEFAULTS,
  CATALOG_HERO_BG_FIT_OPTIONS,
  CATALOG_HERO_BG_GRAD_LAYER_OPTIONS,
  CATALOG_HERO_BG_GRAD_OPTIONS,
  CATALOG_HERO_BG_MOTION_OPTIONS,
  CATALOG_HERO_BG_PRESETS,
  CATALOG_HERO_BG_TEXTURE_OPTIONS,
  CATALOG_HERO_BG_TRANSITION_OPTIONS,
  type CatalogHeroBg,
  type CatalogHeroBgFit,
} from '@/lib/catalog-hero-bg';
import { visibleMedia } from '@/lib/life-sections';

type Tab = 'media' | 'colour' | 'size' | 'motion' | 'look' | 'phone';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'media', label: 'Media source' },
  { id: 'colour', label: 'Base colour & gradient' },
  { id: 'size', label: 'Size & framing' },
  { id: 'motion', label: 'Motion' },
  { id: 'look', label: 'Colour & atmosphere' },
  { id: 'phone', label: 'Phones' },
];

export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  onChange: (next: number) => void;
}) {
  const set = (raw: string) => {
    const n = Number(raw);
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
  };
  return (
    <div className="admin-field">
      <label title={hint}>
        {label} — {value}
        {unit}
      </label>
      <div className="admin-range-row">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(e.target.value)} aria-label={label} />
        <input className="admin-input" type="number" min={min} max={max} step={step} value={value} onChange={(e) => set(e.target.value)} aria-label={`${label} value`} />
      </div>
      {hint ? <small className="chb-ed-hint">{hint}</small> : null}
    </div>
  );
}

export function Choices<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; hint: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <div className="admin-choice-grid chb-ed-choices">
      {options.map((o) => (
        <label key={o.value} className={`admin-choice-card${value === o.value ? ' is-on' : ''}`}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
          <strong>{o.label}</strong>
          <span>{o.hint}</span>
        </label>
      ))}
    </div>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; hint?: string }>;
  onChange: (next: T) => void;
}) {
  const active = options.find((o) => o.value === value);
  return (
    <div className="admin-field">
      <label>{label}</label>
      <select className="admin-select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {active?.hint ? <small className="chb-ed-hint">{active.hint}</small> : null}
    </div>
  );
}

export function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="chb-ed-sub">
      <div className="admin-chip-group-label">{title}</div>
      <div className="admin-form-grid">{children}</div>
    </div>
  );
}

export function Toggle({ label, title, checked, onChange }: { label: string; title?: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className="admin-field">
      <label>{title ?? label}</label>
      <label className={`admin-chip${checked ? ' is-on' : ''}`} style={{ alignSelf: 'start' }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
    </div>
  );
}

export function Swatch({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
  return (
    <div className="admin-field">
      <label>{label}</label>
      <ColorControl label={label} value={value} onChange={onChange} hexOnly />
    </div>
  );
}

/** What the hero looks like on a phone, expressed as desktop values for the preview. */
function phoneView(bg: CatalogHeroBg): CatalogHeroBg {
  const phoneItems = visibleMedia(bg.mobileItems).length ? bg.mobileItems : bg.items;
  const still = bg.stillOnMobile || bg.motion === 'cursor';
  return {
    ...bg,
    items: phoneItems,
    mobileItems: [],
    fit: bg.fitMobile || bg.fit,
    fitMobile: '',
    posX: bg.posXMobile ?? bg.posX,
    posY: bg.posYMobile ?? bg.posY,
    posXMobile: null,
    posYMobile: null,
    area: bg.area === 'inset' ? 'inset' : 'full',
    motion: still ? 'none' : bg.motion,
  };
}

export default function CatalogHeroBgEditor({
  value,
  onChange,
  spotlightImages,
  autoplayMs,
}: {
  value: CatalogHeroBg;
  onChange: (next: CatalogHeroBg) => void;
  spotlightImages: Array<string | null | undefined>;
  autoplayMs: number;
}) {
  const bg = value;
  const set = (patch: Partial<CatalogHeroBg>) => onChange({ ...bg, ...patch });
  const [tab, setTab] = useState<Tab>('media');
  const [phone, setPhone] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [tick, setTick] = useState(0);
  const focusRef = useRef<HTMLDivElement>(null);

  const slideMs = Math.max(1500, autoplayMs || 6000);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setTick((t) => t + 1), slideMs);
    return () => window.clearInterval(timer);
  }, [playing, slideMs]);

  const preview = phone ? phoneView(bg) : bg;
  const focusX = phone ? (bg.posXMobile ?? bg.posX) : bg.posX;
  const focusY = phone ? (bg.posYMobile ?? bg.posY) : bg.posY;

  function setFocusFromPointer(e: ReactPointerEvent<HTMLDivElement>) {
    const box = focusRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = Math.round(Math.min(100, Math.max(0, ((e.clientX - box.left) / box.width) * 100)));
    const y = Math.round(Math.min(100, Math.max(0, ((e.clientY - box.top) / box.height) * 100)));
    set(phone ? { posXMobile: x, posYMobile: y } : { posX: x, posY: y });
  }

  const customCount = visibleMedia(bg.items).length;
  const activePreset = CATALOG_HERO_BG_PRESETS.find((p) =>
    Object.entries(p.patch).every(([k, v]) => bg[k as keyof CatalogHeroBg] === v)
  )?.id;

  return (
    <div className="chb-ed">
      <div className="chb-ed-top">
        <div className={`chb-ed-stage${phone ? ' is-phone' : ''}`}>
          <div className="page-hero catalog-hero chb-ed-hero">
            <CatalogHeroBackground bg={preview} spotlight={spotlightImages} activeIndex={tick} />
            <div className="chb-ed-copy" aria-hidden="true">
              <span>Catalog spotlight</span>
              <strong>Your headline sits here</strong>
            </div>
            <div
              ref={focusRef}
              className="chb-ed-focus"
              title="Click or drag to set the focal point"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setFocusFromPointer(e);
              }}
              onPointerMove={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) setFocusFromPointer(e);
              }}
            >
              <span style={{ left: `${focusX}%`, top: `${focusY}%` }} />
            </div>
          </div>
        </div>
        <div className="chb-ed-toolbar">
          <div className="chb-ed-seg" role="group" aria-label="Preview device">
            <button type="button" className={!phone ? 'is-on' : ''} onClick={() => setPhone(false)}>
              Desktop
            </button>
            <button type="button" className={phone ? 'is-on' : ''} onClick={() => setPhone(true)}>
              Phone
            </button>
          </div>
          <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause slides' : 'Play slides'}
          </button>
          <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => setTick((t) => t + 1)}>
            Next slide
          </button>
          <span className="chb-ed-readout">
            Focus {focusX}% · {focusY}%{phone ? ' (phone)' : ''}
          </span>
        </div>
        <p className="chb-ed-hint" style={{ margin: 0 }}>
          Click or drag on the preview to set the focal point{phone ? ' for phones' : ''}. The preview uses your selected spotlight
          items, or your custom slides.
        </p>
      </div>

      <div className="chb-ed-presets">
        <div className="admin-chip-group-label">Quick looks</div>
        <div className="admin-chips">
          {CATALOG_HERO_BG_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`admin-chip${activePreset === p.id ? ' is-on' : ''}`}
              title={p.hint}
              onClick={() => set(p.patch)}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            className="admin-chip"
            title="Restore every background setting except your custom slides"
            onClick={() => onChange({ ...CATALOG_HERO_BG_DEFAULTS, items: bg.items, mobileItems: bg.mobileItems, source: bg.source })}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="chb-ed-seg chb-ed-tabs" role="tablist" aria-label="Background settings">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'media' ? (
        <div className="chb-ed-panel">
          <Choices
            name="chb-source"
            value={bg.source}
            options={[
              { value: 'spotlight', label: 'Spotlight item images', hint: 'Each slide shows the primary image of its spotlight item (current behaviour)' },
              { value: 'custom', label: 'Custom images & videos', hint: 'Your own photos or muted looping videos behind the hero' },
              { value: 'none', label: 'Colour / gradient only', hint: 'No photos — base colour plus the gradient from the next tab. Pairs well with the product card' },
            ]}
            onChange={(source) => set(source === 'none' && bg.gradType === 'none' ? { source, gradType: 'linear' } : { source })}
          />
          {bg.source === 'none' ? (
            <small className="chb-ed-hint">
              Set the colours in <strong>Base colour &amp; gradient</strong>. Texture, vignette and the readability shade still apply.
            </small>
          ) : null}
          {bg.source === 'custom' ? (
            <>
              <MediaItemsEditor
                label="Background slides"
                items={bg.items}
                onChange={(items) => set({ items })}
                showLabel={false}
                showColor={false}
                hint="One item = still background, several = slideshow. Videos play muted and looped. If this list is empty, the spotlight images are used."
              />
              <MediaItemsEditor
                label="Phone slides (optional, ≤760px)"
                items={bg.mobileItems}
                onChange={(mobileItems) => set({ mobileItems })}
                showLabel={false}
                showColor={false}
                hint="Portrait-friendly crops for phones. Leave empty to reuse the slides above."
              />
              <div className="admin-form-grid">
                <div className="admin-field">
                  <label>Timing</label>
                  <label className={`admin-chip${bg.sync ? ' is-on' : ''}`} style={{ alignSelf: 'start' }}>
                    <input type="checkbox" checked={bg.sync} onChange={(e) => set({ sync: e.target.checked })} />
                    Change slides together with the spotlight cards
                  </label>
                </div>
                {!bg.sync && customCount > 1 ? (
                  <Range label="Seconds per slide" value={bg.intervalSeconds} min={2} max={60} step={0.5} unit="s" onChange={(intervalSeconds) => set({ intervalSeconds })} />
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === 'colour' ? (
        <div className="chb-ed-panel">
          <Sub title="Base colour">
            <Swatch label="Hero background colour" value={bg.baseColor} onChange={(baseColor) => set({ baseColor })} />
          </Sub>
          <div className="admin-chip-group-label">Gradient</div>
          <Choices name="chb-grad" value={bg.gradType} options={CATALOG_HERO_BG_GRAD_OPTIONS} onChange={(gradType) => set({ gradType })} />
          {bg.gradType !== 'none' ? (
            <>
              <Sub title="Colours">
                <Swatch label={bg.gradType === 'radial' ? 'Centre colour' : 'Start colour'} value={bg.gradFrom} onChange={(gradFrom) => set({ gradFrom })} />
                {bg.gradUseVia ? <Swatch label="Middle colour" value={bg.gradVia} onChange={(gradVia) => set({ gradVia })} /> : null}
                <Swatch label={bg.gradType === 'radial' ? 'Outer colour' : 'End colour'} value={bg.gradTo} onChange={(gradTo) => set({ gradTo })} />
                <Toggle title="Stops" label="Use a middle colour" checked={bg.gradUseVia} onChange={(gradUseVia) => set({ gradUseVia })} />
              </Sub>
              <Sub title="Shape">
                {bg.gradType === 'linear' ? (
                  <Range label="Angle" value={bg.gradAngle} min={0} max={360} unit="°" onChange={(gradAngle) => set({ gradAngle })} />
                ) : null}
                {bg.gradType === 'radial' ? (
                  <>
                    <Range label="Centre — horizontal" value={bg.gradX} min={0} max={100} unit="%" onChange={(gradX) => set({ gradX })} />
                    <Range label="Centre — vertical" value={bg.gradY} min={0} max={100} unit="%" onChange={(gradY) => set({ gradY })} />
                  </>
                ) : null}
                <Range label="Strength" value={bg.gradOpacity} min={0} max={100} unit="%" onChange={(gradOpacity) => set({ gradOpacity })} />
                <Toggle title="Motion" label="Slowly shift the gradient" checked={bg.gradAnimate} onChange={(gradAnimate) => set({ gradAnimate })} />
                {bg.gradAnimate ? (
                  <Range label="Shift cycle" value={bg.gradSeconds} min={4} max={90} unit="s" onChange={(gradSeconds) => set({ gradSeconds })} />
                ) : null}
              </Sub>
              <div className="admin-chip-group-label">Layer</div>
              <Choices name="chb-grad-layer" value={bg.gradLayer} options={CATALOG_HERO_BG_GRAD_LAYER_OPTIONS} onChange={(gradLayer) => set({ gradLayer })} />
              {bg.gradLayer === 'over' ? (
                <Sub title="Wash">
                  <Select label="Blend" value={bg.gradBlend} options={CATALOG_HERO_BG_BLEND_OPTIONS} onChange={(gradBlend) => set({ gradBlend })} />
                </Sub>
              ) : null}
              {bg.gradLayer === 'under' && bg.source !== 'none' && bg.area === 'full' && bg.fit === 'cover' ? (
                <small className="chb-ed-hint">
                  Full-bleed photos cover a gradient that sits behind them. Switch Media source to Colour / gradient only, use a panel or floating
                  card area, or put the gradient over the media.
                </small>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {tab === 'size' ? (
        <div className="chb-ed-panel">
          <div className="admin-chip-group-label">Display style</div>
          <Choices name="chb-fit" value={bg.fit} options={CATALOG_HERO_BG_FIT_OPTIONS} onChange={(fit) => set({ fit })} />
          <Sub title="Size & focal point">
            <Range label="Zoom" value={bg.scale} min={50} max={200} unit="%" hint="Below 100% shrinks the media inside its area; above 100% crops in." onChange={(scale) => set({ scale })} />
            <Range label="Focal point — horizontal" value={bg.posX} min={0} max={100} unit="%" onChange={(posX) => set({ posX })} />
            <Range label="Focal point — vertical" value={bg.posY} min={0} max={100} unit="%" onChange={(posY) => set({ posY })} />
          </Sub>
          <div className="admin-chip-group-label" style={{ marginTop: '0.9rem' }}>
            Media area
          </div>
          <Choices name="chb-area" value={bg.area} options={CATALOG_HERO_BG_AREA_OPTIONS} onChange={(area) => set({ area })} />
          {bg.area === 'left' || bg.area === 'right' ? (
            <Sub title="Panel">
              <Range label="Panel width" value={bg.areaWidth} min={30} max={90} unit="%" onChange={(areaWidth) => set({ areaWidth })} />
              <Range label="Edge fade" value={bg.feather} min={0} max={80} unit="%" hint="How softly the media melts into the copy side." onChange={(feather) => set({ feather })} />
            </Sub>
          ) : null}
          {bg.area === 'inset' ? (
            <Sub title="Card">
              <Range label="Corner radius" value={bg.radius} min={0} max={80} unit="px" onChange={(radius) => set({ radius })} />
            </Sub>
          ) : null}
        </div>
      ) : null}

      {tab === 'motion' ? (
        <div className="chb-ed-panel">
          <div className="admin-chip-group-label">Media motion</div>
          <Choices name="chb-motion" value={bg.motion} options={CATALOG_HERO_BG_MOTION_OPTIONS} onChange={(motion) => set({ motion })} />
          <Sub title="Timing">
            {bg.motion === 'zoom' || bg.motion === 'kenburns' || bg.motion === 'pan' || bg.motion === 'drift' ? (
              <Range label="Motion cycle" value={bg.motionSeconds} min={3} max={60} unit="s" hint="Ken Burns: length of one push-in. Others: one loop." onChange={(motionSeconds) => set({ motionSeconds })} />
            ) : null}
            <Select label="Slide transition" value={bg.transition} options={CATALOG_HERO_BG_TRANSITION_OPTIONS} onChange={(transition) => set({ transition })} />
            {bg.transition !== 'none' ? (
              <Range label="Transition length" value={bg.transitionMs} min={200} max={4000} step={100} unit="ms" onChange={(transitionMs) => set({ transitionMs })} />
            ) : null}
            <Range label="Video speed" value={bg.videoRate} min={0.25} max={2} step={0.05} unit="×" hint="Slow-motion videos (0.5×) feel calmer behind text." onChange={(videoRate) => set({ videoRate })} />
          </Sub>
          <small className="chb-ed-hint">Visitors who ask their device for reduced motion always get a still background.</small>
        </div>
      ) : null}

      {tab === 'look' ? (
        <div className="chb-ed-panel">
          <Sub title="Colour grade">
            <Range label="Brightness" value={bg.brightness} min={30} max={170} unit="%" onChange={(brightness) => set({ brightness })} />
            <Range label="Contrast" value={bg.contrast} min={50} max={170} unit="%" onChange={(contrast) => set({ contrast })} />
            <Range label="Saturation" value={bg.saturate} min={0} max={220} unit="%" onChange={(saturate) => set({ saturate })} />
            <Range label="Monochrome" value={bg.grayscale} min={0} max={100} unit="%" onChange={(grayscale) => set({ grayscale })} />
            <Range label="Soft focus" value={bg.blur} min={0} max={24} unit="px" hint="Blurs the media so the copy pops." onChange={(blur) => set({ blur })} />
          </Sub>
          <Sub title="Overlay & tint">
            <Range
              label="Readability shade"
              value={bg.overlay}
              min={0}
              max={100}
              unit="%"
              hint="Strength of the dark gradient that keeps the hero text readable."
              onChange={(overlay) => set({ overlay })}
            />
            <Swatch label="Tint colour" value={bg.tintColor} onChange={(tintColor) => set({ tintColor })} />
            <Range label="Tint strength" value={bg.tintOpacity} min={0} max={100} unit="%" onChange={(tintOpacity) => set({ tintOpacity })} />
            <Select label="Tint blend" value={bg.tintBlend} options={CATALOG_HERO_BG_BLEND_OPTIONS} onChange={(tintBlend) => set({ tintBlend })} />
          </Sub>
          <Sub title="Atmosphere">
            <Select label="Texture" value={bg.texture} options={CATALOG_HERO_BG_TEXTURE_OPTIONS} onChange={(texture) => set({ texture })} />
            <Range label="Vignette" value={bg.vignette} min={0} max={100} unit="%" hint="Darkens the corners to draw the eye inward." onChange={(vignette) => set({ vignette })} />
          </Sub>
        </div>
      ) : null}

      {tab === 'phone' ? (
        <div className="chb-ed-panel">
          <Sub title="Phone overrides (≤760px)">
            <Select<'' | CatalogHeroBgFit>
              label="Display style on phones"
              value={bg.fitMobile}
              options={[{ value: '', label: 'Same as desktop' }, ...CATALOG_HERO_BG_FIT_OPTIONS]}
              onChange={(fitMobile) => set({ fitMobile })}
            />
            <div className="admin-field">
              <label>Motion on phones</label>
              <label className={`admin-chip${bg.stillOnMobile ? ' is-on' : ''}`} style={{ alignSelf: 'start' }}>
                <input type="checkbox" checked={bg.stillOnMobile} onChange={(e) => set({ stillOnMobile: e.target.checked })} />
                Keep the background still on phones
              </label>
            </div>
            <Range label="Phone focal point — horizontal" value={bg.posXMobile ?? bg.posX} min={0} max={100} unit="%" onChange={(posXMobile) => set({ posXMobile })} />
            <Range label="Phone focal point — vertical" value={bg.posYMobile ?? bg.posY} min={0} max={100} unit="%" onChange={(posYMobile) => set({ posYMobile })} />
          </Sub>
          {bg.posXMobile !== null || bg.posYMobile !== null ? (
            <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => set({ posXMobile: null, posYMobile: null })}>
              Use the desktop focal point on phones
            </button>
          ) : null}
          <small className="chb-ed-hint">
            Left / right panels become full-bleed on phones with a soft fade at the bottom. Interactive depth is desktop-only.
          </small>
        </div>
      ) : null}
    </div>
  );
}
