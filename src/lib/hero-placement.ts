import type { CSSProperties } from 'react';

/**
 * Precise positioning of a hero's content containers (text block, image / video, badge…).
 * Each container is pinned to one of nine anchors with X / Y offsets:
 * - on an edge, the offset is the gap kept from that edge (sign ignored, so "-20px" and "20px" both leave 20px);
 * - on a centre line, it nudges: + moves right / down, − moves left / up.
 * Desktop (and tablet) placement applies above 760px with an overlay grid (see globals.css "Hero container placement"),
 * so the hero still grows to fit its containers and nothing is clipped. Phones keep the natural stacked layout unless
 * a phone placement is set; even then containers stay stacked (ordered by anchor row) so they never overlap.
 */

export const HERO_ANCHORS = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;

export type HeroAnchor = (typeof HERO_ANCHORS)[number];

export type HeroSlotName = 'text' | 'media';

export type HeroSlotPlacement = {
  anchor?: HeroAnchor;
  /** CSS length, e.g. "10px", "2rem", "-20px". */
  x?: string;
  y?: string;
  /** Container width, e.g. "560px", "45%". Empty = slot default. */
  width?: string;
};

export type HeroSlotConfig = {
  desktop?: HeroSlotPlacement;
  /** Unset = natural stacked layout on phones. */
  mobile?: HeroSlotPlacement;
};

/** `content` = aligned with the page content gutters and below the fixed header; `edge` = the hero's own edges. */
export type HeroPlacementFrame = 'content' | 'edge';

export type HeroPlacement = {
  frame?: HeroPlacementFrame;
  slots?: Partial<Record<HeroSlotName, HeroSlotConfig>>;
};

/** Default widths live in globals.css (--hp-w-auto) so the text block can narrow when the hero also has media. */
const SLOT_DEFAULTS: Record<HeroSlotName, { anchor: HeroAnchor; z: number }> = {
  text: { anchor: 'center-left', z: 3 },
  media: { anchor: 'center-right', z: 2 },
};

export function isHeroAnchor(value: unknown): value is HeroAnchor {
  return typeof value === 'string' && (HERO_ANCHORS as readonly string[]).includes(value);
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Bare numbers are treated as px so "10" and "10px" mean the same. */
function length(value: unknown): string {
  const v = clean(value);
  if (!v) return '';
  return /^-?\d*\.?\d+$/.test(v) ? `${v}px` : v;
}

function unsigned(value: string): string {
  return value.startsWith('-') ? value.slice(1) : value;
}

/** Narrowest a container may get when a sideways nudge would push it past the hero's edge. */
const NUDGE_MIN_WIDTH = '14rem';

/**
 * A centred box with a one-sided margin m moves by m / 2, so a nudge of +x is a 2x start margin and −x a 2x end
 * margin. Unlike translate, the box then shrinks instead of sliding out of the hero when space runs out; sideways
 * margins are capped so it keeps a readable width.
 */
function nudge(value: string, sideways: boolean): { start: boolean; margin: string } {
  const margin = `calc(2 * ${unsigned(value)})`;
  return {
    start: !value.startsWith('-'),
    margin: sideways ? `min(${margin}, max(0px, 100% - ${NUDGE_MIN_WIDTH}))` : margin,
  };
}

/** Gap from the left / right edge, capped like a nudge so a large offset on a narrow screen can't crush the box. */
function sideGap(value: string): string {
  return `min(${unsigned(value)}, max(0px, 100% - ${NUDGE_MIN_WIDTH}))`;
}

function slotActive(p: HeroSlotPlacement | undefined) {
  return isHeroAnchor(p?.anchor);
}

function slotVars(prefix: string, slot: HeroSlotName, p: HeroSlotPlacement | undefined): Record<string, string> {
  const d = SLOT_DEFAULTS[slot];
  const anchor = isHeroAnchor(p?.anchor) ? p!.anchor : d.anchor;
  const [v, h] = anchor === 'center' ? ['center', 'center'] : anchor.split('-');
  const x = length(p?.x);
  const y = length(p?.y);
  const width = length(p?.width);
  const out: Record<string, string> = {
    [`${prefix}ay`]: v === 'top' ? 'start' : v === 'bottom' ? 'end' : 'center',
    [`${prefix}ax`]: h === 'left' ? 'start' : h === 'right' ? 'end' : 'center',
    [`${prefix}z`]: String(d.z),
  };
  if (width) out[`${prefix}w`] = width;
  if (x) {
    if (h === 'left') out[`${prefix}ml`] = sideGap(x);
    else if (h === 'right') out[`${prefix}mr`] = sideGap(x);
    else {
      const n = nudge(x, true);
      out[`${prefix}${n.start ? 'ml' : 'mr'}`] = n.margin;
    }
  }
  if (y) {
    if (v === 'top') out[`${prefix}mt`] = unsigned(y);
    else if (v === 'bottom') out[`${prefix}mb`] = unsigned(y);
    else {
      const n = nudge(y, false);
      out[`${prefix}${n.start ? 'mt' : 'mb'}`] = n.margin;
    }
  }
  return out;
}

/**
 * Phones stack the containers in one column: the anchor's row sets the order (top, middle, bottom) and auto margins
 * push middle / bottom containers down, so containers never overlap. A container without a phone anchor stays
 * full width in its natural place.
 */
function phoneSlotVars(slot: HeroSlotName, p: HeroSlotPlacement | undefined): Record<string, string> {
  const out: Record<string, string> = { '--hp-m-z': String(SLOT_DEFAULTS[slot].z) };
  const width = length(p?.width);
  if (width) out['--hp-m-w'] = width;
  if (!isHeroAnchor(p?.anchor)) return out;
  const [v, h] = p.anchor === 'center' ? ['center', 'center'] : p.anchor.split('-');
  const x = length(p.x);
  const y = length(p.y);
  out['--hp-m-order'] = v === 'top' ? '1' : v === 'bottom' ? '3' : '2';
  out['--hp-m-ax'] = h === 'left' ? 'flex-start' : h === 'right' ? 'flex-end' : 'center';
  if (x) {
    if (h === 'left') out['--hp-m-ml'] = sideGap(x);
    else if (h === 'right') out['--hp-m-mr'] = sideGap(x);
    else {
      const n = nudge(x, true);
      out[n.start ? '--hp-m-ml' : '--hp-m-mr'] = n.margin;
    }
  }
  if (v === 'top') {
    if (y) out['--hp-m-mt'] = unsigned(y);
  } else if (v === 'bottom') {
    out['--hp-m-mt'] = 'auto';
    if (y) out['--hp-m-mb'] = unsigned(y);
  } else {
    out['--hp-m-mt'] = 'auto';
    out['--hp-m-mb'] = 'auto';
    if (y) out['--hp-m-ty'] = y;
  }
  return out;
}

export type HeroPlacementResult = {
  /** Classes for the hero section; empty when no container is positioned. */
  rootClass: string;
  /** Props for a slot wrapper, or null when the hero uses its natural layout everywhere. */
  slot: (name: HeroSlotName) => { className: string; style: CSSProperties; 'data-hero-slot': HeroSlotName } | null;
};

export function heroPlacement(raw: unknown): HeroPlacementResult {
  const cfg = (raw && typeof raw === 'object' ? raw : {}) as HeroPlacement;
  const slots = cfg.slots || {};
  const names = Object.keys(SLOT_DEFAULTS) as HeroSlotName[];
  const desktop = names.some((n) => slotActive(slots[n]?.desktop));
  const mobile = names.some((n) => slotActive(slots[n]?.mobile));
  if (!desktop && !mobile) return { rootClass: '', slot: () => null };

  const rootClass = [
    'hero-place',
    desktop && 'hero-place--d',
    mobile && 'hero-place--m',
    cfg.frame === 'edge' && 'hero-place--edge',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    rootClass,
    slot: (name) => ({
      className: 'hero-slot',
      'data-hero-slot': name,
      style: {
        ...(desktop ? slotVars('--hp-', name, slots[name]?.desktop) : {}),
        ...(mobile ? phoneSlotVars(name, slots[name]?.mobile) : {}),
      } as CSSProperties,
    }),
  };
}
