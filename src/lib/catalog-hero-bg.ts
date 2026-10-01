import type { CSSProperties } from 'react';
import type { LifeMediaItem } from '@/lib/life-sections';

/** Background layer of the /products, /projects, /services listing hero. */

export type CatalogHeroBgSource = 'spotlight' | 'custom';
export type CatalogHeroBgFit = 'cover' | 'contain' | 'ambient' | 'fill' | 'natural';
export type CatalogHeroBgMotion = 'none' | 'zoom' | 'kenburns' | 'pan' | 'drift' | 'parallax' | 'cursor';
export type CatalogHeroBgTransition = 'none' | 'fade' | 'zoom' | 'glide' | 'blur';
export type CatalogHeroBgArea = 'full' | 'right' | 'left' | 'inset';
export type CatalogHeroBgTexture = 'grid' | 'none' | 'dots' | 'noise' | 'scanlines';
export type CatalogHeroBgBlend = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'color';

export type CatalogHeroBg = {
  source: CatalogHeroBgSource;
  /** Custom slides (source = custom) */
  items: LifeMediaItem[];
  /** Phone-only custom slides; empty = reuse `items` */
  mobileItems: LifeMediaItem[];
  /** Custom slides advance together with the spotlight cards */
  sync: boolean;
  /** Custom slide length when not synced */
  intervalSeconds: number;

  fit: CatalogHeroBgFit;
  /** Zoom of every slide, 100 = natural fit */
  scale: number;
  /** Focal point (%) — object-position and zoom origin */
  posX: number;
  posY: number;
  area: CatalogHeroBgArea;
  /** Media width (%) for left / right areas */
  areaWidth: number;
  /** Soft fade of the media edge towards the copy (%) */
  feather: number;
  /** Corner radius (px) for the inset area */
  radius: number;

  motion: CatalogHeroBgMotion;
  motionSeconds: number;
  transition: CatalogHeroBgTransition;
  transitionMs: number;
  videoRate: number;

  brightness: number;
  contrast: number;
  saturate: number;
  blur: number;
  grayscale: number;
  /** Opacity (%) of the built-in readability gradient + style tint */
  overlay: number;
  tintColor: string;
  tintOpacity: number;
  tintBlend: CatalogHeroBgBlend;
  texture: CatalogHeroBgTexture;
  vignette: number;

  /** Empty = same as desktop */
  fitMobile: '' | CatalogHeroBgFit;
  posXMobile: number | null;
  posYMobile: number | null;
  /** Stop motion on phones (saves battery, steadier reading) */
  stillOnMobile: boolean;
};

export const CATALOG_HERO_BG_DEFAULTS: CatalogHeroBg = {
  source: 'spotlight',
  items: [],
  mobileItems: [],
  sync: true,
  intervalSeconds: 6,
  fit: 'cover',
  scale: 100,
  posX: 50,
  posY: 35,
  area: 'full',
  areaWidth: 58,
  feather: 30,
  radius: 24,
  motion: 'zoom',
  motionSeconds: 8,
  transition: 'none',
  transitionMs: 900,
  videoRate: 1,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  blur: 0,
  grayscale: 0,
  overlay: 100,
  tintColor: '#ff6b1a',
  tintOpacity: 0,
  tintBlend: 'soft-light',
  texture: 'grid',
  vignette: 0,
  fitMobile: '',
  posXMobile: null,
  posYMobile: null,
  stillOnMobile: false,
};

type Choice<T extends string> = ReadonlyArray<{ value: T; label: string; hint: string }>;

export const CATALOG_HERO_BG_FIT_OPTIONS: Choice<CatalogHeroBgFit> = [
  { value: 'cover', label: 'Fill (cover)', hint: 'Edge to edge; crops what does not fit' },
  { value: 'contain', label: 'Whole image', hint: 'Shows the full image; may leave bands' },
  { value: 'ambient', label: 'Ambient fit', hint: 'Whole image over a blurred, colour-matched copy of itself' },
  { value: 'fill', label: 'Stretch', hint: 'Fills the area exactly; may distort' },
  { value: 'natural', label: 'Original size', hint: 'Pixel size, no scaling' },
];

export const CATALOG_HERO_BG_MOTION_OPTIONS: Choice<CatalogHeroBgMotion> = [
  { value: 'none', label: 'Still', hint: 'No movement' },
  { value: 'zoom', label: 'Breathing zoom', hint: 'Slow zoom in and out (current look)' },
  { value: 'kenburns', label: 'Ken Burns', hint: 'Fresh slow push-in on every slide' },
  { value: 'pan', label: 'Pan', hint: 'Slow zoom with a drifting pan' },
  { value: 'drift', label: 'Drift', hint: 'Gentle side-to-side float' },
  { value: 'parallax', label: 'Scroll parallax', hint: 'Media moves slower than the page as you scroll' },
  { value: 'cursor', label: 'Interactive depth', hint: 'Media leans toward the pointer (desktop)' },
];

export const CATALOG_HERO_BG_TRANSITION_OPTIONS: Choice<CatalogHeroBgTransition> = [
  { value: 'none', label: 'Cut', hint: 'Instant switch' },
  { value: 'fade', label: 'Crossfade', hint: 'Soft dissolve between slides' },
  { value: 'zoom', label: 'Zoom fade', hint: 'Next slide settles in from a slight zoom' },
  { value: 'glide', label: 'Glide', hint: 'Next slide glides in from the side' },
  { value: 'blur', label: 'Focus pull', hint: 'Blurs out, sharpens in' },
];

export const CATALOG_HERO_BG_AREA_OPTIONS: Choice<CatalogHeroBgArea> = [
  { value: 'full', label: 'Full bleed', hint: 'Media covers the whole hero' },
  { value: 'right', label: 'Right panel', hint: 'Media on the right, fading into the copy side' },
  { value: 'left', label: 'Left panel', hint: 'Media on the left, fading into the copy side' },
  { value: 'inset', label: 'Floating card', hint: 'Media inside a rounded frame with a margin' },
];

export const CATALOG_HERO_BG_TEXTURE_OPTIONS: Choice<CatalogHeroBgTexture> = [
  { value: 'grid', label: 'Blueprint grid', hint: 'Faint engineering grid (current look)' },
  { value: 'none', label: 'None', hint: 'Clean media' },
  { value: 'dots', label: 'Dot matrix', hint: 'Fine dot pattern' },
  { value: 'noise', label: 'Film grain', hint: 'Subtle cinematic grain' },
  { value: 'scanlines', label: 'Scanlines', hint: 'Horizontal display lines' },
];

export const CATALOG_HERO_BG_BLEND_OPTIONS: Choice<CatalogHeroBgBlend> = [
  { value: 'normal', label: 'Normal', hint: 'Flat colour wash' },
  { value: 'multiply', label: 'Multiply', hint: 'Darkens and tints' },
  { value: 'screen', label: 'Screen', hint: 'Lightens with colour' },
  { value: 'overlay', label: 'Overlay', hint: 'Punchy contrast tint' },
  { value: 'soft-light', label: 'Soft light', hint: 'Subtle colour grade' },
  { value: 'color', label: 'Colourise', hint: 'Duotone-like single hue' },
];

export const CATALOG_HERO_BG_PRESETS: ReadonlyArray<{ id: string; label: string; hint: string; patch: Partial<CatalogHeroBg> }> = [
  {
    id: 'classic',
    label: 'Classic',
    hint: 'The original look',
    patch: {
      fit: 'cover', scale: 100, posX: 50, posY: 35, area: 'full', motion: 'zoom', motionSeconds: 8, transition: 'none',
      brightness: 100, contrast: 100, saturate: 100, blur: 0, grayscale: 0, overlay: 100, tintOpacity: 0, texture: 'grid', vignette: 0,
    },
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    hint: 'Ken Burns, crossfade, vignette and grain',
    patch: {
      fit: 'cover', area: 'full', motion: 'kenburns', motionSeconds: 9, transition: 'fade', transitionMs: 1200,
      contrast: 108, saturate: 110, overlay: 90, texture: 'noise', vignette: 45,
    },
  },
  {
    id: 'showcase',
    label: 'Product showcase',
    hint: 'Whole image on an ambient blur, no crop',
    patch: { fit: 'ambient', scale: 92, area: 'full', motion: 'none', transition: 'zoom', transitionMs: 900, overlay: 70, texture: 'none', vignette: 20 },
  },
  {
    id: 'split',
    label: 'Split panel',
    hint: 'Media on the right, copy on clean dark',
    patch: { fit: 'cover', area: 'right', areaWidth: 58, feather: 40, motion: 'drift', motionSeconds: 14, transition: 'glide', transitionMs: 1000, overlay: 45, texture: 'dots' },
  },
  {
    id: 'depth',
    label: 'Interactive depth',
    hint: 'Leans toward the pointer, focus-pull slides',
    patch: { fit: 'cover', scale: 108, area: 'full', motion: 'cursor', transition: 'blur', transitionMs: 1000, overlay: 85, texture: 'grid', vignette: 30 },
  },
  {
    id: 'mono',
    label: 'Brand mono',
    hint: 'Monochrome with a brand-orange grade',
    patch: { grayscale: 100, contrast: 112, tintColor: '#ff6b1a', tintOpacity: 35, tintBlend: 'color', overlay: 80, texture: 'scanlines', transition: 'fade' },
  },
];

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const n = typeof value === 'string' && value.trim() === '' ? NaN : Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function pick<T extends string>(value: unknown, options: Choice<T>, fallback: T): T {
  return options.some((o) => o.value === value) ? (value as T) : fallback;
}

const HEX = /^#[0-9a-f]{6}$/i;
const MAX_SLIDES = 24;

function normalizeItems(raw: unknown): LifeMediaItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === 'object')
    .map((m) => {
      const item: LifeMediaItem = { src: String(m.src ?? '').slice(0, 1000) };
      if (m.hidden) item.hidden = true;
      if (m.type === 'image' || m.type === 'video') item.type = m.type;
      if (typeof m.poster === 'string' && m.poster) item.poster = m.poster.slice(0, 1000);
      if (typeof m.title === 'string' && m.title) item.title = m.title.slice(0, 300);
      return item;
    })
    .slice(0, MAX_SLIDES);
}

export function normalizeCatalogHeroBg(raw: unknown): CatalogHeroBg {
  const d = CATALOG_HERO_BG_DEFAULTS;
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const nullablePct = (v: unknown) => (v === null || v === undefined || v === '' ? null : clamp(v, 0, 100, 50));
  return {
    source: r.source === 'custom' ? 'custom' : 'spotlight',
    items: normalizeItems(r.items),
    mobileItems: normalizeItems(r.mobileItems),
    sync: r.sync === undefined ? d.sync : Boolean(r.sync),
    intervalSeconds: clamp(r.intervalSeconds, 2, 60, d.intervalSeconds),
    fit: pick(r.fit, CATALOG_HERO_BG_FIT_OPTIONS, d.fit),
    scale: clamp(r.scale, 50, 200, d.scale),
    posX: clamp(r.posX, 0, 100, d.posX),
    posY: clamp(r.posY, 0, 100, d.posY),
    area: pick(r.area, CATALOG_HERO_BG_AREA_OPTIONS, d.area),
    areaWidth: clamp(r.areaWidth, 30, 90, d.areaWidth),
    feather: clamp(r.feather, 0, 80, d.feather),
    radius: clamp(r.radius, 0, 80, d.radius),
    motion: pick(r.motion, CATALOG_HERO_BG_MOTION_OPTIONS, d.motion),
    motionSeconds: clamp(r.motionSeconds, 3, 60, d.motionSeconds),
    transition: pick(r.transition, CATALOG_HERO_BG_TRANSITION_OPTIONS, d.transition),
    transitionMs: clamp(r.transitionMs, 200, 4000, d.transitionMs),
    videoRate: clamp(r.videoRate, 0.25, 2, d.videoRate),
    brightness: clamp(r.brightness, 30, 170, d.brightness),
    contrast: clamp(r.contrast, 50, 170, d.contrast),
    saturate: clamp(r.saturate, 0, 220, d.saturate),
    blur: clamp(r.blur, 0, 24, d.blur),
    grayscale: clamp(r.grayscale, 0, 100, d.grayscale),
    overlay: clamp(r.overlay, 0, 100, d.overlay),
    tintColor: typeof r.tintColor === 'string' && HEX.test(r.tintColor) ? r.tintColor : d.tintColor,
    tintOpacity: clamp(r.tintOpacity, 0, 100, d.tintOpacity),
    tintBlend: pick(r.tintBlend, CATALOG_HERO_BG_BLEND_OPTIONS, d.tintBlend),
    texture: pick(r.texture, CATALOG_HERO_BG_TEXTURE_OPTIONS, d.texture),
    vignette: clamp(r.vignette, 0, 100, d.vignette),
    fitMobile: r.fitMobile ? pick(r.fitMobile, CATALOG_HERO_BG_FIT_OPTIONS, d.fit) : '',
    posXMobile: nullablePct(r.posXMobile),
    posYMobile: nullablePct(r.posYMobile),
    stillOnMobile: Boolean(r.stillOnMobile),
  };
}

const FIT_CSS: Record<CatalogHeroBgFit, string> = {
  cover: 'cover',
  contain: 'contain',
  ambient: 'contain',
  fill: 'fill',
  natural: 'none',
};

/** CSS variables consumed by `.chb` rules in globals.css. */
export function catalogHeroBgStyle(bg: CatalogHeroBg): CSSProperties {
  const filters = [
    bg.brightness !== 100 && `brightness(${bg.brightness}%)`,
    bg.contrast !== 100 && `contrast(${bg.contrast}%)`,
    bg.saturate !== 100 && `saturate(${bg.saturate}%)`,
    bg.grayscale > 0 && `grayscale(${bg.grayscale}%)`,
    bg.blur > 0 && `blur(${bg.blur}px)`,
  ].filter(Boolean);
  const mx = bg.posXMobile ?? bg.posX;
  const my = bg.posYMobile ?? bg.posY;
  return {
    '--chb-fit': FIT_CSS[bg.fit],
    '--chb-fit-m': FIT_CSS[bg.fitMobile || bg.fit],
    '--chb-pos': `${bg.posX}% ${bg.posY}%`,
    '--chb-pos-m': `${mx}% ${my}%`,
    '--chb-scale': String(bg.scale / 100),
    '--chb-filter': filters.length ? filters.join(' ') : 'none',
    '--chb-motion-s': `${bg.motionSeconds}s`,
    '--chb-trans-ms': `${bg.transition === 'none' ? 0 : bg.transitionMs}ms`,
    '--chb-overlay': String(bg.overlay / 100),
    '--chb-tint': bg.tintColor,
    '--chb-tint-o': String(bg.tintOpacity / 100),
    '--chb-tint-blend': bg.tintBlend,
    '--chb-vignette': String(bg.vignette / 100),
    '--chb-area-w': `${bg.areaWidth}%`,
    '--chb-feather': `${bg.feather}%`,
    '--chb-radius': `${bg.radius}px`,
  } as CSSProperties;
}

export function catalogHeroBgClass(bg: CatalogHeroBg): string {
  return [
    'chb',
    `chb-fit-${bg.fit}`,
    bg.fitMobile && `chb-fit-m-${bg.fitMobile}`,
    `chb-motion-${bg.motion}`,
    `chb-trans-${bg.transition}`,
    `chb-area-${bg.area}`,
    `chb-tex-${bg.texture}`,
    bg.stillOnMobile && 'chb-m-still',
  ]
    .filter(Boolean)
    .join(' ');
}
