'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import CatalogHeroBackground from '@/components/catalog/CatalogHeroBackground';
import CatalogHeroCard, { type CatalogHeroCardItem } from '@/components/catalog/CatalogHeroCard';
import { Choices, Range, Select, Sub, Swatch, Toggle } from '@/components/admin/CatalogHeroBgEditor';
import type { CatalogHeroBg } from '@/lib/catalog-hero-bg';
import {
  CATALOG_HERO_CARD_CAPTION_OPTIONS,
  CATALOG_HERO_CARD_CAPTION_TONE_OPTIONS,
  CATALOG_HERO_CARD_DEFAULTS,
  CATALOG_HERO_CARD_FILL_OPTIONS,
  CATALOG_HERO_CARD_IMAGE_MOTION_OPTIONS,
  CATALOG_HERO_CARD_MOBILE_OPTIONS,
  CATALOG_HERO_CARD_MOTION_OPTIONS,
  CATALOG_HERO_CARD_PATTERN_OPTIONS,
  CATALOG_HERO_CARD_PRESETS,
  CATALOG_HERO_CARD_SHADOW_OPTIONS,
  CATALOG_HERO_CARD_TRANSITION_OPTIONS,
  type CatalogHeroCard as CardSettings,
} from '@/lib/catalog-hero-card';

type Tab = 'size' | 'image' | 'style' | 'caption' | 'phone';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'size', label: 'Size & placement' },
  { id: 'image', label: 'Image & animation' },
  { id: 'style', label: 'Card style' },
  { id: 'caption', label: 'Caption & extras' },
  { id: 'phone', label: 'Phones' },
];

const RATIOS: Array<{ label: string; ratio: number }> = [
  { label: '1:1', ratio: 1 },
  { label: '5:4', ratio: 5 / 4 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '3:2', ratio: 3 / 2 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '4:5', ratio: 4 / 5 },
  { label: '3:4', ratio: 3 / 4 },
];

/** Virtual screen the preview renders at before scaling down to fit the editor. */
const VIEWPORT = { desk: { w: 1280, h: 720 }, phone: { w: 390, h: 780 } };

export default function CatalogHeroCardEditor({
  value,
  onChange,
  bg,
  onBgChange,
  items,
  autoplayMs,
  copy,
}: {
  value: CardSettings;
  onChange: (next: CardSettings) => void;
  bg: CatalogHeroBg;
  onBgChange: (next: CatalogHeroBg) => void;
  /** Spotlight items in rotation order */
  items: CatalogHeroCardItem[];
  autoplayMs: number;
  copy: { eyebrow?: string; title?: string; lead?: string };
}) {
  const card = value;
  const set = (patch: Partial<CardSettings>) => onChange({ ...card, ...patch });
  const [tab, setTab] = useState<Tab>('size');
  const [phone, setPhone] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [tick, setTick] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(900);

  const slideMs = Math.max(1500, autoplayMs || 6000);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setTick((t) => t + 1), slideMs);
    return () => window.clearInterval(timer);
  }, [playing, slideMs]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBoxW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const view = phone ? VIEWPORT.phone : VIEWPORT.desk;
  const scale = Math.min(1, (phone ? Math.min(boxW, 300) : boxW) / view.w);
  const previewCard = { ...card, enabled: true };
  const activePreset = CATALOG_HERO_CARD_PRESETS.find((p) =>
    Object.entries(p.patch).every(([k, v]) => card[k as keyof CardSettings] === v)
  )?.id;
  const ratio = card.width / card.height;

  return (
    <div className="chb-ed chc-ed">
      <div className="admin-chips">
        <label className={`admin-chip${card.enabled ? ' is-on' : ''}`}>
          <input type="checkbox" checked={card.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          Show the product card in the hero
        </label>
      </div>
      {!card.enabled ? (
        <small className="chb-ed-hint" style={{ marginTop: '-0.5rem' }}>
          Off — the hero keeps its current layout. The preview below shows what the card would look like.
        </small>
      ) : null}

      <div className="chb-ed-top">
        <div ref={boxRef} className="chc-ed-box">
          <div className={`chc-ed-viewport${phone ? ' is-phone' : ''}`} style={{ width: view.w * scale, height: view.h * scale }}>
            <div className="chc-ed-canvas" style={{ width: view.w, height: view.h, transform: `scale(${scale})` }}>
              <div
                className={`page-hero catalog-hero catalog-hero--card${card.side === 'left' ? ' catalog-hero--card-left' : ''} chc-ed-hero${
                  phone ? ' chc-ed-phone' : ''
                }`}
              >
                <CatalogHeroBackground bg={bg} spotlight={items.map((i) => i.primary_image)} activeIndex={tick} />
                <div
                  className={`container catalog-hero-layout catalog-hero-layout--card${card.side === 'left' ? ' catalog-hero-layout--card-left' : ''}`}
                  style={{ '--chc-col': `${card.width}px` } as CSSProperties}
                >
                  <div className="catalog-hero-copy">
                    {copy.eyebrow ? <div className="eyebrow">{copy.eyebrow}</div> : null}
                    <h1 className="chc-ed-title">{copy.title || 'Your headline sits here'}</h1>
                    {copy.lead && !phone ? <p className="lead">{copy.lead}</p> : null}
                  </div>
                  {items.length ? (
                    <CatalogHeroCard card={previewCard} items={items} activeIndex={tick} autoplayMs={slideMs} />
                  ) : (
                    <div className="chc-ed-empty">Pick spotlight items (or mark items featured) to preview their images.</div>
                  )}
                </div>
              </div>
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
            Next item
          </button>
          <span className="chb-ed-readout">
            {card.width} × {card.height}px
          </span>
        </div>
        {bg.source === 'spotlight' ? (
          <div className="chc-ed-note">
            <span>The background currently shows the same item photos as the card.</span>
            <button
              type="button"
              className="admin-btn admin-btn-secondary az-admin-mini"
              onClick={() =>
                onBgChange({
                  ...bg,
                  source: 'none',
                  gradType: bg.gradType === 'none' ? 'aurora' : bg.gradType,
                  gradLayer: 'under',
                  gradOpacity: bg.gradType === 'none' ? 70 : bg.gradOpacity,
                })
              }
            >
              Use a colour / gradient background
            </button>
          </div>
        ) : null}
      </div>

      <div className="chb-ed-presets">
        <div className="admin-chip-group-label">Quick looks</div>
        <div className="admin-chips">
          {CATALOG_HERO_CARD_PRESETS.map((p) => (
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
            title="Restore every card setting (keeps it switched on or off)"
            onClick={() => onChange({ ...CATALOG_HERO_CARD_DEFAULTS, enabled: card.enabled })}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="chb-ed-seg chb-ed-tabs" role="tablist" aria-label="Product card settings">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'size' ? (
        <div className="chb-ed-panel">
          <Sub title="Card size">
            <Range label="Width" value={card.width} min={220} max={960} step={10} unit="px" hint="The card shrinks proportionally when the screen is narrower." onChange={(width) => set({ width })} />
            <Range label="Height" value={card.height} min={180} max={900} step={10} unit="px" onChange={(height) => set({ height })} />
            <div className="admin-field full">
              <label>Shape — {ratio >= 1 ? `${ratio.toFixed(2)} : 1` : `1 : ${(1 / ratio).toFixed(2)}`}</label>
              <div className="admin-chips">
                {RATIOS.map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    className={`admin-chip${Math.abs(ratio - r.ratio) < 0.02 ? ' is-on' : ''}`}
                    onClick={() => set({ height: Math.min(900, Math.max(180, Math.round(card.width / r.ratio / 10) * 10)) })}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <small className="chb-ed-hint">Keeps the width and sets the height to match.</small>
            </div>
            <Range label="Corner radius" value={card.radius} min={0} max={80} unit="px" onChange={(radius) => set({ radius })} />
            <Range label="Inner padding" value={card.padding} min={0} max={140} unit="px" hint="Space between the card edge and the product image." onChange={(padding) => set({ padding })} />
          </Sub>
          <Sub title="Placement">
            <Select
              label="Side"
              value={card.side}
              options={[
                { value: 'right', label: 'Right of the headline' },
                { value: 'left', label: 'Left of the headline' },
              ]}
              onChange={(side) => set({ side })}
            />
            <Select
              label="Vertical alignment"
              value={card.align}
              options={[
                { value: 'start', label: 'Top' },
                { value: 'center', label: 'Middle' },
                { value: 'end', label: 'Bottom' },
              ]}
              onChange={(align) => set({ align })}
            />
            <Range label="Nudge — horizontal" value={card.offsetX} min={-160} max={160} unit="px" onChange={(offsetX) => set({ offsetX })} />
            <Range label="Nudge — vertical" value={card.offsetY} min={-160} max={160} unit="px" onChange={(offsetY) => set({ offsetY })} />
          </Sub>
        </div>
      ) : null}

      {tab === 'image' ? (
        <div className="chb-ed-panel">
          <Sub title="Product image">
            <Select
              label="Image fit"
              value={card.fit}
              options={[
                { value: 'contain', label: 'Whole product', hint: 'Never crops — best for cut-out product shots' },
                { value: 'cover', label: 'Fill the card', hint: 'Edge to edge; crops what does not fit — best for photos' },
              ]}
              onChange={(fit) => set({ fit })}
            />
            <Range label="Image zoom" value={card.imageScale} min={40} max={160} unit="%" onChange={(imageScale) => set({ imageScale })} />
            <Range label="Focal point — horizontal" value={card.posX} min={0} max={100} unit="%" onChange={(posX) => set({ posX })} />
            <Range label="Focal point — vertical" value={card.posY} min={0} max={100} unit="%" onChange={(posY) => set({ posY })} />
            <Toggle title="Depth" label="Soft shadow under the product" checked={card.imageShadow} onChange={(imageShadow) => set({ imageShadow })} />
          </Sub>
          <div className="admin-chip-group-label">Image animation (inside the card)</div>
          <Choices name="chc-img-motion" value={card.imageMotion} options={CATALOG_HERO_CARD_IMAGE_MOTION_OPTIONS} onChange={(imageMotion) => set({ imageMotion })} />
          {card.imageMotion !== 'none' ? (
            <Sub title="Image timing">
              <Range label="Animation cycle" value={card.imageMotionSeconds} min={2} max={40} step={0.5} unit="s" onChange={(imageMotionSeconds) => set({ imageMotionSeconds })} />
            </Sub>
          ) : null}
          <div className="admin-chip-group-label">Card movement</div>
          <Choices name="chc-card-motion" value={card.cardMotion} options={CATALOG_HERO_CARD_MOTION_OPTIONS} onChange={(cardMotion) => set({ cardMotion })} />
          <Sub title="Item change">
            {card.cardMotion === 'float' || card.cardMotion === 'float-tilt' ? (
              <Range label="Float cycle" value={card.cardMotionSeconds} min={2} max={40} step={0.5} unit="s" onChange={(cardMotionSeconds) => set({ cardMotionSeconds })} />
            ) : null}
            <Select label="Transition between items" value={card.transition} options={CATALOG_HERO_CARD_TRANSITION_OPTIONS} onChange={(transition) => set({ transition })} />
            {card.transition !== 'none' ? (
              <Range label="Transition length" value={card.transitionMs} min={150} max={3000} step={50} unit="ms" onChange={(transitionMs) => set({ transitionMs })} />
            ) : null}
          </Sub>
          <small className="chb-ed-hint">Items change with the hero rotation (Default rotation and per-item durations). Reduced-motion visitors get a still card.</small>
        </div>
      ) : null}

      {tab === 'style' ? (
        <div className="chb-ed-panel">
          <div className="admin-chip-group-label">Card fill</div>
          <Choices name="chc-fill" value={card.fill} options={CATALOG_HERO_CARD_FILL_OPTIONS} onChange={(fill) => set({ fill })} />
          <Sub title={card.fill === 'item' ? 'Fallback gradient' : 'Fill colours'}>
            {card.fill === 'solid' ? <Swatch label="Card colour" value={card.fillColor} onChange={(fillColor) => set({ fillColor })} /> : null}
            {card.fill === 'gradient' || card.fill === 'item' ? (
              <>
                <Swatch label="Start colour" value={card.fillFrom} onChange={(fillFrom) => set({ fillFrom })} />
                <Swatch label="End colour" value={card.fillTo} onChange={(fillTo) => set({ fillTo })} />
                <Range label="Angle" value={card.fillAngle} min={0} max={360} unit="°" onChange={(fillAngle) => set({ fillAngle })} />
              </>
            ) : null}
            {card.fill === 'glass' ? (
              <>
                <Swatch label="Glass tint" value={card.fillColor} onChange={(fillColor) => set({ fillColor })} />
                <Range label="Tint strength" value={card.glassOpacity} min={0} max={100} unit="%" onChange={(glassOpacity) => set({ glassOpacity })} />
              </>
            ) : null}
            <Select label="Pattern" value={card.pattern} options={CATALOG_HERO_CARD_PATTERN_OPTIONS} onChange={(pattern) => set({ pattern })} />
          </Sub>
          <Sub title="Border & shadow">
            <Range label="Border width" value={card.borderWidth} min={0} max={8} unit="px" onChange={(borderWidth) => set({ borderWidth })} />
            <Swatch label="Border colour" value={card.borderColor} onChange={(borderColor) => set({ borderColor })} />
            <Range label="Border strength" value={card.borderOpacity} min={0} max={100} unit="%" onChange={(borderOpacity) => set({ borderOpacity })} />
            <Select label="Shadow" value={card.shadow} options={CATALOG_HERO_CARD_SHADOW_OPTIONS} onChange={(shadow) => set({ shadow })} />
          </Sub>
          <Sub title="Accent effects">
            <Swatch label="Accent colour" value={card.glowColor} onChange={(glowColor) => set({ glowColor })} />
            <Toggle title="Spotlight" label="Pulsing glow behind the product" checked={card.spotGlow} onChange={(spotGlow) => set({ spotGlow })} />
            <Toggle title="Shine" label="Light sweep across the card" checked={card.shine} onChange={(shine) => set({ shine })} />
            <Toggle title="Edge" label="Spinning accent border" checked={card.animatedBorder} onChange={(animatedBorder) => set({ animatedBorder })} />
          </Sub>
        </div>
      ) : null}

      {tab === 'caption' ? (
        <div className="chb-ed-panel">
          <div className="admin-chip-group-label">Caption chip</div>
          <Choices name="chc-caption" value={card.caption} options={CATALOG_HERO_CARD_CAPTION_OPTIONS} onChange={(caption) => set({ caption })} />
          {card.caption !== 'none' ? (
            <Sub title="Caption content">
              <Select label="Caption style" value={card.captionTone} options={CATALOG_HERO_CARD_CAPTION_TONE_OPTIONS} onChange={(captionTone) => set({ captionTone })} />
              <Toggle title="Category" label="Show the category" checked={card.captionCategory} onChange={(captionCategory) => set({ captionCategory })} />
              <Toggle title="Price / stat" label="Show the price label" checked={card.captionPrice} onChange={(captionPrice) => set({ captionPrice })} />
            </Sub>
          ) : null}
          <Sub title="Extras">
            <Toggle title="Progress" label="Rotation progress bar" checked={card.progress} onChange={(progress) => set({ progress })} />
            <Toggle title="Click" label="Clicking opens Quick view" checked={card.clickable} onChange={(clickable) => set({ clickable })} />
          </Sub>
        </div>
      ) : null}

      {tab === 'phone' ? (
        <div className="chb-ed-panel">
          <div className="admin-chip-group-label">On phones and small tablets (≤900px)</div>
          <Choices name="chc-mobile" value={card.mobile} options={CATALOG_HERO_CARD_MOBILE_OPTIONS} onChange={(mobile) => set({ mobile })} />
          {card.mobile !== 'hide' ? (
            <Sub title="Phone size">
              <Range label="Card width" value={card.mobileWidth} min={50} max={100} unit="%" hint="Share of the screen width; never wider than the desktop width." onChange={(mobileWidth) => set({ mobileWidth })} />
            </Sub>
          ) : null}
          <small className="chb-ed-hint">3D tilt is desktop-only; the nudge offsets are ignored on phones so the card stays centred.</small>
        </div>
      ) : null}
    </div>
  );
}
