import type { CSSProperties } from 'react';

/** Product image card shown beside the copy in the /products, /projects, /services listing hero. */

export type CatalogHeroCardSide = 'right' | 'left';
export type CatalogHeroCardAlign = 'start' | 'center' | 'end';
export type CatalogHeroCardFit = 'contain' | 'cover';
export type CatalogHeroCardFill = 'solid' | 'gradient' | 'glass' | 'item';
export type CatalogHeroCardShadow = 'none' | 'soft' | 'deep' | 'glow';
export type CatalogHeroCardPattern = 'none' | 'grid' | 'dots';
export type CatalogHeroCardImageMotion = 'none' | 'float' | 'breathe' | 'kenburns' | 'sway' | 'turntable' | 'orbit';
export type CatalogHeroCardMotion = 'none' | 'float' | 'tilt' | 'float-tilt';
export type CatalogHeroCardTransition = 'none' | 'fade' | 'slide' | 'rise' | 'zoom' | 'flip';
export type CatalogHeroCardCaption = 'none' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'inside';
export type CatalogHeroCardCaptionTone = 'dark' | 'light' | 'accent';
export type CatalogHeroCardMobile = 'below' | 'above' | 'hide';

export type CatalogHeroCard = {
  enabled: boolean;
  side: CatalogHeroCardSide;
  /** Vertical alignment against the hero copy */
  align: CatalogHeroCardAlign;
  /** Card size in px; shrinks proportionally when the column is narrower */
  width: number;
  height: number;
  radius: number;
  /** Space between the card edge and the product image (px) */
  padding: number;
  offsetX: number;
  offsetY: number;

  fit: CatalogHeroCardFit;
  /** Product image zoom, 100 = natural fit */
  imageScale: number;
  posX: number;
  posY: number;
  imageShadow: boolean;

  fill: CatalogHeroCardFill;
  fillColor: string;
  fillFrom: string;
  fillTo: string;
  fillAngle: number;
  /** Glass tint strength (%) */
  glassOpacity: number;
  pattern: CatalogHeroCardPattern;

  borderWidth: number;
  borderColor: string;
  borderOpacity: number;
  shadow: CatalogHeroCardShadow;
  /** Accent for glow, spotlight, animated border and progress bar */
  glowColor: string;
  spotGlow: boolean;
  shine: boolean;
  animatedBorder: boolean;

  imageMotion: CatalogHeroCardImageMotion;
  imageMotionSeconds: number;
  cardMotion: CatalogHeroCardMotion;
  cardMotionSeconds: number;
  transition: CatalogHeroCardTransition;
  transitionMs: number;

  caption: CatalogHeroCardCaption;
  captionTone: CatalogHeroCardCaptionTone;
  captionCategory: boolean;
  captionPrice: boolean;
  progress: boolean;
  /** Clicking the card opens the item's quick view */
  clickable: boolean;

  mobile: CatalogHeroCardMobile;
  /** Card width on phones (% of the screen column) */
  mobileWidth: number;
};

export const CATALOG_HERO_CARD_DEFAULTS: CatalogHeroCard = {
  enabled: false,
  side: 'right',
  align: 'center',
  width: 560,
  height: 440,
  radius: 20,
  padding: 32,
  offsetX: 0,
  offsetY: 0,
  fit: 'contain',
  imageScale: 100,
  posX: 50,
  posY: 50,
  imageShadow: true,
  fill: 'gradient',
  fillColor: '#0f1f3d',
  fillFrom: '#163056',
  fillTo: '#0a1628',
  fillAngle: 150,
  glassOpacity: 14,
  pattern: 'grid',
  borderWidth: 1,
  borderColor: '#ffffff',
  borderOpacity: 12,
  shadow: 'deep',
  glowColor: '#ff6b1a',
  spotGlow: true,
  shine: false,
  animatedBorder: false,
  imageMotion: 'float',
  imageMotionSeconds: 6,
  cardMotion: 'tilt',
  cardMotionSeconds: 8,
  transition: 'fade',
  transitionMs: 700,
  caption: 'bottom-left',
  captionTone: 'dark',
  captionCategory: true,
  captionPrice: true,
  progress: true,
  clickable: true,
  mobile: 'below',
  mobileWidth: 100,
};

type Choice<T extends string> = ReadonlyArray<{ value: T; label: string; hint: string }>;

export const CATALOG_HERO_CARD_FILL_OPTIONS: Choice<CatalogHeroCardFill> = [
  { value: 'solid', label: 'Solid colour', hint: 'One flat colour behind the product' },
  { value: 'gradient', label: 'Gradient', hint: 'Two-colour gradient at any angle' },
  { value: 'glass', label: 'Frosted glass', hint: 'Translucent card that blurs the hero behind it' },
  { value: 'item', label: 'Item background', hint: "Each item's own background image (Inventory → Media); gradient when missing" },
];

export const CATALOG_HERO_CARD_IMAGE_MOTION_OPTIONS: Choice<CatalogHeroCardImageMotion> = [
  { value: 'none', label: 'Still', hint: 'Product image does not move' },
  { value: 'float', label: 'Float', hint: 'Product gently bobs up and down' },
  { value: 'breathe', label: 'Breathe', hint: 'Slow zoom in and out' },
  { value: 'kenburns', label: 'Ken Burns', hint: 'Fresh slow push-in on every item' },
  { value: 'sway', label: 'Sway', hint: 'Slight rocking rotation' },
  { value: 'turntable', label: 'Turntable', hint: '3D side-to-side turn, like a display stand' },
  { value: 'orbit', label: 'Orbit', hint: 'Small circular drift' },
];

export const CATALOG_HERO_CARD_MOTION_OPTIONS: Choice<CatalogHeroCardMotion> = [
  { value: 'none', label: 'Fixed', hint: 'Card stays put' },
  { value: 'float', label: 'Hover float', hint: 'Whole card floats slowly' },
  { value: 'tilt', label: '3D tilt', hint: 'Card tilts toward the pointer with a light glare (desktop)' },
  { value: 'float-tilt', label: 'Float + tilt', hint: 'Both together' },
];

export const CATALOG_HERO_CARD_TRANSITION_OPTIONS: Choice<CatalogHeroCardTransition> = [
  { value: 'none', label: 'Cut', hint: 'Instant switch' },
  { value: 'fade', label: 'Crossfade', hint: 'Soft dissolve between items' },
  { value: 'slide', label: 'Slide', hint: 'Next item slides in from the side' },
  { value: 'rise', label: 'Rise', hint: 'Next item rises up into place' },
  { value: 'zoom', label: 'Zoom', hint: 'Next item grows into place' },
  { value: 'flip', label: 'Flip', hint: '3D card-flip between items' },
];

export const CATALOG_HERO_CARD_SHADOW_OPTIONS: Choice<CatalogHeroCardShadow> = [
  { value: 'none', label: 'None', hint: 'Flat' },
  { value: 'soft', label: 'Soft', hint: 'Light lift' },
  { value: 'deep', label: 'Deep', hint: 'Strong drop shadow (About hero look)' },
  { value: 'glow', label: 'Glow', hint: 'Coloured halo in the accent colour' },
];

export const CATALOG_HERO_CARD_PATTERN_OPTIONS: Choice<CatalogHeroCardPattern> = [
  { value: 'none', label: 'None', hint: 'Clean fill' },
  { value: 'grid', label: 'Blueprint grid', hint: 'Faint engineering grid' },
  { value: 'dots', label: 'Dot matrix', hint: 'Fine dot pattern' },
];

export const CATALOG_HERO_CARD_CAPTION_OPTIONS: Choice<CatalogHeroCardCaption> = [
  { value: 'none', label: 'Hidden', hint: 'Image only' },
  { value: 'bottom-left', label: 'Bottom left', hint: 'Floating chip overhanging the corner' },
  { value: 'bottom-right', label: 'Bottom right', hint: 'Floating chip overhanging the corner' },
  { value: 'top-left', label: 'Top left', hint: 'Floating chip overhanging the corner' },
  { value: 'top-right', label: 'Top right', hint: 'Floating chip overhanging the corner' },
  { value: 'inside', label: 'Inside, bottom', hint: 'Caption bar across the bottom of the card' },
];

export const CATALOG_HERO_CARD_CAPTION_TONE_OPTIONS: Choice<CatalogHeroCardCaptionTone> = [
  { value: 'dark', label: 'Dark glass', hint: 'Navy chip, light text' },
  { value: 'light', label: 'Light', hint: 'White chip, dark text' },
  { value: 'accent', label: 'Accent', hint: 'Chip in the accent colour' },
];

export const CATALOG_HERO_CARD_MOBILE_OPTIONS: Choice<CatalogHeroCardMobile> = [
  { value: 'below', label: 'Below the copy', hint: 'Headline first, card after it' },
  { value: 'above', label: 'Above the copy', hint: 'Card first, headline after it' },
  { value: 'hide', label: 'Hidden', hint: 'No card on phones' },
];

export const CATALOG_HERO_CARD_PRESETS: ReadonlyArray<{ id: string; label: string; hint: string; patch: Partial<CatalogHeroCard> }> = [
  {
    id: 'showcase',
    label: 'Product showcase',
    hint: 'Whole product on a dark gradient with grid, glow and float',
    patch: {
      fit: 'contain', padding: 32, imageScale: 100, fill: 'gradient', fillFrom: '#163056', fillTo: '#0a1628', fillAngle: 150,
      pattern: 'grid', borderWidth: 1, borderColor: '#ffffff', borderOpacity: 12, shadow: 'deep', spotGlow: true, shine: false,
      animatedBorder: false, imageMotion: 'float', cardMotion: 'tilt', transition: 'fade', imageShadow: true, caption: 'bottom-left', captionTone: 'dark',
    },
  },
  {
    id: 'about',
    label: 'About-style photo',
    hint: 'Edge-to-edge photo card like the About Zigma hero',
    patch: {
      width: 600, height: 344, radius: 20, fit: 'cover', padding: 0, imageScale: 100, fill: 'solid', fillColor: '#0f1f3d', pattern: 'none',
      borderWidth: 1, borderColor: '#ffffff', borderOpacity: 12, shadow: 'deep', spotGlow: false, shine: false, animatedBorder: false,
      imageMotion: 'kenburns', cardMotion: 'none', transition: 'fade', imageShadow: false, caption: 'bottom-left', captionTone: 'dark',
    },
  },
  {
    id: 'studio',
    label: 'Studio white',
    hint: 'Clean white card, like a product photo studio',
    patch: {
      fit: 'contain', padding: 36, fill: 'solid', fillColor: '#ffffff', pattern: 'none', borderOpacity: 0, shadow: 'soft', spotGlow: false,
      shine: false, animatedBorder: false, imageMotion: 'breathe', cardMotion: 'float', transition: 'zoom', imageShadow: true, caption: 'bottom-right', captionTone: 'light',
    },
  },
  {
    id: 'glass',
    label: 'Floating glass',
    hint: 'Frosted card that floats over the background',
    patch: {
      fit: 'contain', padding: 30, fill: 'glass', fillColor: '#ffffff', glassOpacity: 14, pattern: 'dots', borderWidth: 1, borderColor: '#ffffff',
      borderOpacity: 22, shadow: 'soft', spotGlow: true, shine: true, animatedBorder: false, imageMotion: 'sway', cardMotion: 'float-tilt',
      transition: 'rise', imageShadow: true, caption: 'top-right', captionTone: 'dark',
    },
  },
  {
    id: 'neon',
    label: 'Neon edge',
    hint: 'Spinning accent border with a coloured glow',
    patch: {
      fit: 'contain', padding: 30, fill: 'gradient', fillFrom: '#0d1b33', fillTo: '#050c18', fillAngle: 160, pattern: 'grid', borderWidth: 2,
      shadow: 'glow', glowColor: '#00d4ff', spotGlow: true, shine: false, animatedBorder: true, imageMotion: 'turntable', cardMotion: 'tilt',
      transition: 'flip', imageShadow: true, caption: 'inside', captionTone: 'dark',
    },
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
const hex = (value: unknown, fallback: string) => (typeof value === 'string' && HEX.test(value) ? value : fallback);
const bool = (value: unknown, fallback: boolean) => (value === undefined ? fallback : Boolean(value));

export function normalizeCatalogHeroCard(raw: unknown): CatalogHeroCard {
  const d = CATALOG_HERO_CARD_DEFAULTS;
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    enabled: bool(r.enabled, d.enabled),
    side: r.side === 'left' ? 'left' : 'right',
    align: r.align === 'start' || r.align === 'end' ? r.align : 'center',
    width: clamp(r.width, 220, 960, d.width),
    height: clamp(r.height, 180, 900, d.height),
    radius: clamp(r.radius, 0, 80, d.radius),
    padding: clamp(r.padding, 0, 140, d.padding),
    offsetX: clamp(r.offsetX, -160, 160, d.offsetX),
    offsetY: clamp(r.offsetY, -160, 160, d.offsetY),
    fit: r.fit === 'cover' ? 'cover' : 'contain',
    imageScale: clamp(r.imageScale, 40, 160, d.imageScale),
    posX: clamp(r.posX, 0, 100, d.posX),
    posY: clamp(r.posY, 0, 100, d.posY),
    imageShadow: bool(r.imageShadow, d.imageShadow),
    fill: pick(r.fill, CATALOG_HERO_CARD_FILL_OPTIONS, d.fill),
    fillColor: hex(r.fillColor, d.fillColor),
    fillFrom: hex(r.fillFrom, d.fillFrom),
    fillTo: hex(r.fillTo, d.fillTo),
    fillAngle: clamp(r.fillAngle, 0, 360, d.fillAngle),
    glassOpacity: clamp(r.glassOpacity, 0, 100, d.glassOpacity),
    pattern: pick(r.pattern, CATALOG_HERO_CARD_PATTERN_OPTIONS, d.pattern),
    borderWidth: clamp(r.borderWidth, 0, 8, d.borderWidth),
    borderColor: hex(r.borderColor, d.borderColor),
    borderOpacity: clamp(r.borderOpacity, 0, 100, d.borderOpacity),
    shadow: pick(r.shadow, CATALOG_HERO_CARD_SHADOW_OPTIONS, d.shadow),
    glowColor: hex(r.glowColor, d.glowColor),
    spotGlow: bool(r.spotGlow, d.spotGlow),
    shine: bool(r.shine, d.shine),
    animatedBorder: bool(r.animatedBorder, d.animatedBorder),
    imageMotion: pick(r.imageMotion, CATALOG_HERO_CARD_IMAGE_MOTION_OPTIONS, d.imageMotion),
    imageMotionSeconds: clamp(r.imageMotionSeconds, 2, 40, d.imageMotionSeconds),
    cardMotion: pick(r.cardMotion, CATALOG_HERO_CARD_MOTION_OPTIONS, d.cardMotion),
    cardMotionSeconds: clamp(r.cardMotionSeconds, 2, 40, d.cardMotionSeconds),
    transition: pick(r.transition, CATALOG_HERO_CARD_TRANSITION_OPTIONS, d.transition),
    transitionMs: clamp(r.transitionMs, 150, 3000, d.transitionMs),
    caption: pick(r.caption, CATALOG_HERO_CARD_CAPTION_OPTIONS, d.caption),
    captionTone: pick(r.captionTone, CATALOG_HERO_CARD_CAPTION_TONE_OPTIONS, d.captionTone),
    captionCategory: bool(r.captionCategory, d.captionCategory),
    captionPrice: bool(r.captionPrice, d.captionPrice),
    progress: bool(r.progress, d.progress),
    clickable: bool(r.clickable, d.clickable),
    mobile: pick(r.mobile, CATALOG_HERO_CARD_MOBILE_OPTIONS, d.mobile),
    mobileWidth: clamp(r.mobileWidth, 50, 100, d.mobileWidth),
  };
}

function rgba(hexColor: string, opacityPct: number) {
  const n = parseInt(hexColor.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${(opacityPct / 100).toFixed(3)})`;
}

function luminance(hexColor: string) {
  const n = parseInt(hexColor.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/** Light fills need dark pattern lines; glass sits on the (dark) hero. */
function isLightFill(card: CatalogHeroCard) {
  if (card.fill === 'solid') return luminance(card.fillColor) > 0.6;
  if (card.fill === 'glass') return false;
  return (luminance(card.fillFrom) + luminance(card.fillTo)) / 2 > 0.6;
}

function cardFill(card: CatalogHeroCard): string {
  if (card.fill === 'solid') return card.fillColor;
  if (card.fill === 'glass') return rgba(card.fillColor, card.glassOpacity);
  return `linear-gradient(${card.fillAngle}deg, ${card.fillFrom}, ${card.fillTo})`;
}

/** CSS variables consumed by `.chc` rules in globals.css. */
export function catalogHeroCardStyle(card: CatalogHeroCard): CSSProperties {
  const borderWidth = card.animatedBorder ? Math.max(2, card.borderWidth) : card.borderWidth;
  return {
    '--chc-w': `${card.width}px`,
    '--chc-ratio': `${card.width} / ${card.height}`,
    '--chc-r': `${card.radius}px`,
    '--chc-pad': `${card.padding}px`,
    '--chc-ox': `${card.offsetX}px`,
    '--chc-oy': `${card.offsetY}px`,
    '--chc-fit': card.fit,
    '--chc-scale': String(card.imageScale / 100),
    '--chc-pos': `${card.posX}% ${card.posY}%`,
    '--chc-fill': cardFill(card),
    '--chc-fill-fallback': `linear-gradient(${card.fillAngle}deg, ${card.fillFrom}, ${card.fillTo})`,
    '--chc-bw': `${borderWidth}px`,
    '--chc-bc': rgba(card.borderColor, card.borderOpacity),
    '--chc-glow': card.glowColor,
    '--chc-glow-x': `${card.posX}%`,
    '--chc-glow-y': `${card.posY}%`,
    '--chc-ink': isLightFill(card) ? 'rgba(10,22,40,0.08)' : 'rgba(255,255,255,0.07)',
    '--chc-img-s': `${card.imageMotionSeconds}s`,
    '--chc-card-s': `${card.cardMotionSeconds}s`,
    '--chc-trans-ms': `${card.transition === 'none' ? 0 : card.transitionMs}ms`,
    '--chc-mobile-w': `${card.mobileWidth}%`,
  } as CSSProperties;
}

export function catalogHeroCardClass(card: CatalogHeroCard): string {
  return [
    'chc',
    `chc-side-${card.side}`,
    `chc-align-${card.align}`,
    `chc-fill-${card.fill}`,
    `chc-shadow-${card.shadow}`,
    `chc-pattern-${card.pattern}`,
    `chc-img-${card.imageMotion}`,
    `chc-card-${card.cardMotion}`,
    `chc-trans-${card.transition}`,
    `chc-m-${card.mobile}`,
    card.animatedBorder && 'chc-spin',
    card.imageShadow && 'chc-img-shadow',
    card.clickable && 'chc-clickable',
  ]
    .filter(Boolean)
    .join(' ');
}
