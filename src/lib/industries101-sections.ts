import type { HeroHeight } from '@/lib/hero-height';
import type { HeroPlacement } from '@/lib/hero-placement';
import {
  ABOUT_ICON_PRESETS,
  ABOUT_TYPOGRAPHY_VERSION,
  type CtaButton,
  type ElementStyle,
  type EyebrowEl,
  type IconEl,
  type ImageEl,
  type LinkItem,
  type PillsEl,
  type SectionBox,
  type TextEl,
} from '@/lib/about-sections';
import type { LifeColumns, LifeCtaContent, LifeHighlight, LifeMediaItem } from '@/lib/life-sections';
import type { LegacyBgMedia, LegacyCardStyle } from '@/lib/legacy-sections';

/**
 * Fully configurable "Industries We Serve" section family (page /industries101):
 * ind101_hero, ind101_subnav, ind101_stats, ind101_category (×4 on the seeded page), ind101_cta.
 *
 * Built on the About / Life / Legacy element primitives. Empty style fields fall back to the scoped
 * `.i101-*` CSS defaults, which mirror the approved Industries101 HTML design. Colors default to
 * theme tokens (var(--cyan)…) so Theme Studio changes flow through; headings / eyebrows follow
 * Site Settings → Public typography.
 */

export const INDUSTRIES101_SECTION_TYPES = ['ind101_hero', 'ind101_subnav', 'ind101_stats', 'ind101_category', 'ind101_cta'] as const;
export type Industries101SectionType = (typeof INDUSTRIES101_SECTION_TYPES)[number];

export function isIndustries101SectionType(type: string): type is Industries101SectionType {
  return (INDUSTRIES101_SECTION_TYPES as readonly string[]).includes(type);
}

/* ------------------------------------------------------------------ */
/* Section content shapes                                              */
/* ------------------------------------------------------------------ */

export type Ind101Transition = 'slide' | 'fade';
export type Ind101VAlign = 'top' | 'center' | 'bottom';

export type Ind101HeroContent = {
  section: SectionBox;
  heroHeight?: HeroHeight;
  placement?: HeroPlacement;
  /** Slides, motion (zoom / Ken Burns…), overlay, dots toggle + active dot color */
  background: LegacyBgMedia;
  slider: {
    transition: Ind101Transition;
    /** Slide: 'ltr' = new slide enters from the left (design), 'rtl' = from the right */
    direction?: 'ltr' | 'rtl';
    durationMs?: number;
    pauseOnHover?: boolean;
  };
  dots: {
    position?: 'left' | 'center' | 'right';
    color?: string;
    width?: string;
    activeWidth?: string;
    height?: string;
    bottom?: string;
  };
  layout: {
    vAlign?: Ind101VAlign;
    hAlign?: 'left' | 'center' | 'right';
    maxWidth?: string;
  };
  /** Fade-up entrance for breadcrumb, heading, lead, pills and buttons */
  entrance?: boolean;
  /** Page-scroll progress bar pinned to the top of the viewport (off unless enabled) */
  scrollBar?: { hidden?: boolean; gradient?: string };
  breadcrumb: {
    hidden?: boolean;
    items: LinkItem[];
    separator: string;
    style?: ElementStyle;
    hoverColor?: string;
    currentColor?: string;
  };
  eyebrow: EyebrowEl;
  title: TextEl;
  highlight?: LifeHighlight;
  lead: TextEl;
  pills: PillsEl;
  ctas: CtaButton[];
};

export type Ind101SubnavItem = {
  hidden?: boolean;
  label: string;
  /** Section anchor (section key) this pill scrolls to and tracks, e.g. cat-infra */
  target: string;
  /** Pill accent (dot, hover border, active fill) */
  color?: string;
  /** Optional link used instead of the in-page anchor (other pages) */
  href?: string;
};

export type Ind101SubnavContent = {
  items: Ind101SubnavItem[];
  bar: {
    background?: string;
    blur?: string;
    borderTop?: string;
    borderBottom?: string;
    shadow?: string;
    paddingTop?: string;
    paddingBottom?: string;
    paddingTopMobile?: string;
    paddingBottomMobile?: string;
    containerMaxWidth?: string;
  };
  sticky: boolean;
  /** Fixed top offset; empty = sits right under the site header (measured live) */
  stickyTop?: string;
  align?: 'left' | 'center' | 'right';
  gap?: string;
  scrollSpy: boolean;
  /** Extra space (px) left above a category after a pill click */
  scrollOffset?: number;
  showDots: boolean;
  dotSize?: string;
  pillStyle?: ElementStyle;
  hoverColor?: string;
  hoverBackground?: string;
  activeColor?: string;
  /** Empty = the pill's own accent color */
  activeBackground?: string;
  fadeEdges?: boolean;
};

export type Ind101StatItem = {
  hidden?: boolean;
  value: string;
  prefix?: string;
  suffix?: string;
  label: string;
  /** Accent for icon + number; empty = section default */
  color?: string;
  icon?: IconEl;
};

export type Ind101StatsContent = {
  section: SectionBox;
  items: Ind101StatItem[];
  columns: LifeColumns;
  gap?: string;
  /** Icon beside the text (design) or stacked above it */
  layout: 'row' | 'stacked';
  justify?: 'left' | 'center' | 'right';
  animateCount: boolean;
  countDurationMs?: number;
  hoverLift?: boolean;
  dividers: boolean;
  dividerColor?: string;
  dividerHeight?: string;
  defaultColor?: string;
  iconStyle: { size?: string; opacity?: string; strokeWidth?: string };
  numberStyle?: ElementStyle;
  suffixColor?: string;
  labelStyle?: ElementStyle;
};

/** One positioned picture of the category collage (percentages of the media panel). */
export type Ind101CollageCell = {
  hidden?: boolean;
  left?: string;
  top?: string;
  width?: string;
  height?: string;
  zIndex?: number;
  radius?: string;
  /** Float animation delay, e.g. 0.4s */
  delay?: string;
};

export type Ind101MediaMode = 'collage' | 'slideshow' | 'grid';
export type Ind101TagPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type Ind101CategoryMedia = {
  hidden?: boolean;
  mode: Ind101MediaMode;
  /** All images / videos; collage cells share them round-robin and cross-fade when a cell has several */
  items: LifeMediaItem[];
  cells: Ind101CollageCell[];
  intervalSeconds?: number;
  float?: boolean;
  floatSeconds?: number;
  hoverZoom?: boolean;
  aspectRatio?: string;
  aspectRatioMobile?: string;
  /** Slideshow / grid frame */
  radius?: string;
  shadow?: string;
  background?: string;
  overlay?: string;
  cellRadius?: string;
  cellShadow?: string;
  gridColumns?: number;
  gridGap?: string;
  fit?: ImageEl['fit'];
  position?: string;
  tag: TextEl;
  tagPosition?: Ind101TagPosition;
};

export type Ind101Card = {
  hidden?: boolean;
  icon: IconEl;
  title: TextEl;
  body: TextEl;
  /** Accent for this card; empty = category accent */
  color?: string;
  /** Optional images / videos at the top of the card (several cross-fade) */
  media?: LifeMediaItem[];
  href?: string;
  linkLabel?: string;
  newTab?: boolean;
};

export type Ind101CategoryContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  /** Category color: accent bar, count badge, card bar / icon / hover */
  accentColor: string;
  layout: {
    mediaSide: 'left' | 'right';
    columns?: string;
    gap?: string;
    alignItems?: 'start' | 'center' | 'end';
    /** Stacked (tablet / phone): media above the heading */
    mobileMediaFirst?: boolean;
    marginBottom?: string;
  };
  eyebrow: EyebrowEl;
  title: TextEl;
  highlight?: LifeHighlight;
  subtitle: TextEl;
  accentBar: { hidden?: boolean; width?: string; height?: string; color?: string };
  count: TextEl;
  ctas: CtaButton[];
  media: Ind101CategoryMedia;
  cards: Ind101Card[];
  columns: LifeColumns;
  gap?: string;
  reveal?: boolean;
  cardStyle: LegacyCardStyle & { topBar?: boolean; barHeight?: string; hoverShadow?: string; hoverBorder?: string; mediaHeight?: string };
  iconStyle: {
    boxSize?: string;
    size?: string;
    radius?: string;
    background?: string;
    hoverBackground?: string;
    hoverColor?: string;
    strokeWidth?: string;
    animate?: boolean;
  };
  titleStyle?: ElementStyle;
  titleHoverColor?: string;
  bodyStyle?: ElementStyle;
  linkStyle?: ElementStyle;
};

export type Ind101CtaContent = LifeCtaContent & { background: LegacyBgMedia };

/* ------------------------------------------------------------------ */
/* Icon presets (Industries101 design + shared About outline icons)    */
/* ------------------------------------------------------------------ */

export const IND101_ICON_PRESETS: Array<{ key: string; label: string; svg: string }> = [
  { key: 'i101-grid', label: 'Grid (industries)', svg: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
  { key: 'i101-check', label: 'Check circle (projects)', svg: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>' },
  { key: 'i101-pin', label: 'Map pin (cities)', svg: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>' },
  { key: 'i101-clock', label: 'Clock (years)', svg: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>' },
  { key: 'i101-servers', label: 'Server racks (data centers)', svg: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6"/>' },
  { key: 'i101-signal', label: 'Signal (digital infrastructure)', svg: '<circle cx="6" cy="18" r="1.4"/><circle cx="18" cy="18" r="1.4"/><path d="M3 8c5-4 13-4 18 0M6 12c3-2.4 9-2.4 12 0"/>' },
  { key: 'i101-plane', label: 'Paper plane (airport & metro)', svg: '<path d="M22 3L11.5 13.5"/><path d="M22 3l-7 19-4.5-9L2 8z"/>' },
  { key: 'i101-plant', label: 'Plant building (industrial)', svg: '<path d="M3 21h18M5 21V9l6-4 6 4v12M9 21v-6h6v6"/><path d="M15 9h3v12"/>' },
  { key: 'i101-city', label: 'City towers (smart cities)', svg: '<path d="M3 21h18"/><path d="M5 21V10l4-3v14"/><path d="M13 21V6l6-3v18"/>' },
  { key: 'i101-bolt', label: 'Bolt (power & utility)', svg: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>' },
  { key: 'i101-wifi', label: 'Broadcast (telecom)', svg: '<path d="M5 12a7 7 0 0114 0M2 12a10 10 0 0120 0"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>' },
  { key: 'i101-port', label: 'Port (maritime)', svg: '<path d="M2 21c3 1 6 1 9 0s6-1 9 0"/><path d="M5 21V10l7-6 7 6v11"/><path d="M9 21v-6h6v6"/>' },
  { key: 'i101-train', label: 'Train (railway)', svg: '<rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 11h16"/><path d="M8 21l-2-4h12l-2 4"/><circle cx="8" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="14" r="1" fill="currentColor" stroke="none"/>' },
  { key: 'i101-gov', label: 'Shield stack (government)', svg: '<path d="M12 2l9 4.5v3L12 14 3 9.5v-3z"/><path d="M3 9.5V19l9 4 9-4V9.5"/>' },
  { key: 'i101-hotel', label: 'House (hospitality)', svg: '<path d="M3 21h18M6 21V8l6-5 6 5v13"/>' },
  { key: 'i101-edu', label: 'Graduation cap (education)', svg: '<path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M6 10v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M21 7.5V14"/>' },
  { key: 'i101-health', label: 'Heart pulse (healthcare)', svg: '<path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6C19 16.65 12 21 12 21z"/><path d="M9 12h2l1-2 2 4 1-2h2"/>' },
  { key: 'i101-bank', label: 'Bank (financial services)', svg: '<path d="M3 10l9-6 9 6"/><path d="M5 10v9M19 10v9M9 10v9M15 10v9"/><path d="M3 21h18"/>' },
  { key: 'i101-office', label: 'Briefcase building (corporate)', svg: '<rect x="4" y="8" width="16" height="13" rx="1"/><path d="M9 8V4h6v4"/><path d="M9 13h6M9 17h6"/>' },
  { key: 'i101-tower', label: 'Tower block (real estate)', svg: '<rect x="6" y="2" width="12" height="20" rx="1"/><path d="M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01"/><path d="M10 22v-4h4v4"/>' },
  { key: 'i101-person', label: 'Person (residential)', svg: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>' },
  { key: 'i101-shop', label: 'Shop (retail)', svg: '<path d="M3 9l1-5h16l1 5"/><path d="M4 9h16v11H4z"/><path d="M9 20v-6h6v6"/>' },
  { key: 'i101-factory', label: 'Factory (manufacturing)', svg: '<path d="M3 21h18M5 21V9l6-4 6 4v12M9 21v-6h6v6"/>' },
  { key: 'i101-car', label: 'Car (automotive)', svg: '<path d="M5 17h14M5 17a2 2 0 01-2-2v-2l2-5h10l3 5v2a2 2 0 01-2 2M5 17v2m14-2v2"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/>' },
  { key: 'i101-chart', label: 'Growth chart (MSME)', svg: '<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>' },
  { key: 'i101-drop', label: 'Drop (oil & gas)', svg: '<path d="M12 2c3 4 6 7.5 6 11a6 6 0 01-12 0c0-3.5 3-7 6-11z"/>' },
  { key: 'i101-map', label: 'Folded map (SEZ)', svg: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>' },
  { key: 'i101-warehouse', label: 'Warehouse (logistics)', svg: '<path d="M3 21V9l9-6 9 6v12H3z"/><path d="M9 21v-8h6v8"/>' },
  { key: 'i101-wrench', label: 'Wrench (EPC)', svg: '<path d="M14.7 6.3a4 4 0 01-5.6 5.6L4 17l3 3 5.1-5.1a4 4 0 015.6-5.6z"/>' },
  { key: 'i101-flask', label: 'Flask (pharma & chemical)', svg: '<path d="M9 2v6L4 19a2 2 0 002 3h12a2 2 0 002-3l-5-11V2"/><path d="M9 2h6"/><path d="M7 15h10"/>' },
  { key: 'i101-cart', label: 'Cart (textile & apparel)', svg: '<path d="M4 4h4l1 3h9l-2 8H8L5 4z"/><path d="M8 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/><path d="M16 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>' },
  { key: 'i101-ev', label: 'Charge bolt (EV charging)', svg: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>' },
  { key: 'i101-battery', label: 'Battery (renewables)', svg: '<rect x="2" y="8" width="18" height="8" rx="1.5"/><path d="M22 10v4"/><path d="M6 8v8M10 8v8"/>' },
  { key: 'i101-sun', label: 'Sun (microgrid & storage)', svg: '<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/><circle cx="12" cy="12" r="4"/>' },
];

export const IND101_ALL_ICON_PRESETS = [...IND101_ICON_PRESETS, ...ABOUT_ICON_PRESETS];

const icon = (key: string) => IND101_ALL_ICON_PRESETS.find((p) => p.key === key)?.svg || '';

/* ------------------------------------------------------------------ */
/* Defaults (mirror the approved Industries101 HTML)                   */
/* ------------------------------------------------------------------ */

const ORANGE = 'var(--orange)';
const CYAN = 'var(--cyan)';
const GREEN = 'var(--green)';
const PURPLE = 'var(--purple)';

const IMG = (file: string) => `/assets/images/industries101/${file}`;

export const IND101_IMAGES = {
  hero: { src: IMG('hero-refinery-dusk.jpg'), title: 'Oil and gas refinery at dusk with lit towers and pipelines' },
  dataCenter: { src: IMG('data-center-server-racks.jpg'), title: 'Data center server racks' },
  ev: { src: IMG('ev-charging-station.jpg'), title: 'EV charging station' },
  hospital: { src: IMG('hospital-building.jpg'), title: 'Hospital building' },
  refinery: { src: IMG('oil-and-gas-refinery.jpg'), title: 'Oil and gas refinery' },
  factory: { src: IMG('automotive-factory.jpg'), title: 'Automotive factory' },
} satisfies Record<string, LifeMediaItem>;

type ImageKey = keyof typeof IND101_IMAGES;

const media = (...keys: ImageKey[]): LifeMediaItem[] => keys.map((k) => ({ ...IND101_IMAGES[k] }));

/** Collage layout from the design: tall-left, wide-bottom, big-center, wide-top, tall-right. */
export function defaultInd101CollageCells(): Ind101CollageCell[] {
  return [
    { left: '0%', top: '42%', width: '17%', height: '56%', zIndex: 2, delay: '0s' },
    { left: '20%', top: '76%', width: '35%', height: '24%', zIndex: 2, delay: '0.4s' },
    { left: '20%', top: '26%', width: '61%', height: '46%', zIndex: 3, delay: '0.8s' },
    { left: '46%', top: '2%', width: '35%', height: '22%', zIndex: 2, delay: '1.2s' },
    { left: '83%', top: '2%', width: '17%', height: '57%', zIndex: 2, delay: '1.6s' },
  ];
}

export function defaultInd101HeroContent(): Ind101HeroContent {
  return {
    section: {
      tone: 'dark',
      bgColor: 'var(--navy-950)',
      bgGradient: 'linear-gradient(160deg,var(--navy-950),var(--navy-900))',
      pattern: 'grid-fade',
      patternColor: 'rgba(255,255,255,0.035)',
      patternSize: '64px',
    },
    heroHeight: 'full',
    background: {
      items: media('hero', 'dataCenter', 'ev', 'hospital', 'refinery', 'factory'),
      intervalSeconds: 5,
      motion: 'zoom',
      motionSeconds: 16,
      position: 'center 40%',
      overlay:
        'linear-gradient(100deg, rgba(4,10,20,0.94) 0%, rgba(4,10,20,0.82) 32%, rgba(4,10,20,0.52) 58%, rgba(4,10,20,0.32) 100%), linear-gradient(0deg, rgba(4,10,20,0.55) 0%, rgba(4,10,20,0) 30%)',
      showDots: true,
      showCount: false,
      dotColor: ORANGE,
    },
    slider: { transition: 'slide', direction: 'ltr', durationMs: 900, pauseOnHover: false },
    dots: { position: 'right' },
    layout: { vAlign: 'bottom', hAlign: 'left', maxWidth: '760px' },
    entrance: true,
    breadcrumb: {
      items: [{ label: 'Home', href: '/' }, { label: 'Industries' }],
      separator: '/',
      currentColor: CYAN,
    },
    eyebrow: { text: 'WHO WE SERVE', line: false, style: { color: ORANGE } },
    title: { text: 'Industries We Serve' },
    lead: {
      text: "From data centers to airports, hospitals to highway EV chargers — Zigma engineers power infrastructure across every sector that can't afford downtime. Twenty years of experience means we already understand how your industry runs.",
    },
    pills: { hidden: true, items: [] },
    ctas: [],
  };
}

export function defaultInd101SubnavContent(): Ind101SubnavContent {
  return {
    items: [
      { label: 'Infrastructure & Utilities', target: 'cat-infra', color: CYAN },
      { label: 'Commercial & Institutional', target: 'cat-commercial', color: ORANGE },
      { label: 'Industrial & Manufacturing', target: 'cat-industrial', color: GREEN },
      { label: 'Energy & Mobility', target: 'cat-energy', color: PURPLE },
    ],
    bar: {},
    sticky: true,
    align: 'left',
    scrollSpy: true,
    scrollOffset: 16,
    showDots: true,
    fadeEdges: true,
  };
}

export function defaultInd101StatsContent(): Ind101StatsContent {
  const stat = (value: string, suffix: string, label: string, color: string, iconKey: string): Ind101StatItem => ({
    value,
    ...(suffix ? { suffix } : {}),
    label,
    color,
    icon: { svg: icon(iconKey) },
  });
  return {
    section: {
      tone: 'dark',
      bgColor: 'var(--navy-900)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    },
    items: [
      stat('24', '', 'Industries Served', CYAN, 'i101-grid'),
      stat('1500', '+', 'Projects Delivered', ORANGE, 'i101-check'),
      stat('12', '+', 'Cities Across India', GREEN, 'i101-pin'),
      stat('20', '+', 'Years of Engineering', PURPLE, 'i101-clock'),
    ],
    columns: { desktop: 4, tablet: 2, mobile: 2 },
    layout: 'row',
    justify: 'center',
    animateCount: false,
    countDurationMs: 1600,
    hoverLift: false,
    dividers: true,
    iconStyle: {},
  };
}

type CardSeed = [iconKey: string, title: string, body: string];

const card = ([iconKey, title, body]: CardSeed): Ind101Card => ({
  icon: { svg: icon(iconKey) },
  title: { text: title },
  body: { text: body },
});

type CategorySeed = {
  accent: string;
  gray: boolean;
  mediaSide: 'left' | 'right';
  eyebrow: string;
  title: string;
  subtitle: string;
  count: string;
  tag: string;
  images: ImageKey[];
  cards: CardSeed[];
};

const CATEGORY_SEEDS: Record<'infra' | 'commercial' | 'industrial' | 'energy', CategorySeed> = {
  infra: {
    accent: CYAN,
    gray: false,
    mediaSide: 'right',
    eyebrow: 'INFRASTRUCTURE & UTILITIES',
    title: "Critical Infrastructure That Can't Go Dark",
    subtitle: "Data centers, airports, telecom, and utility networks — where downtime isn't an inconvenience, it's a crisis.",
    count: '9 SECTORS',
    tag: 'INFRASTRUCTURE VIEW',
    images: ['dataCenter', 'ev', 'hospital', 'refinery', 'factory'],
    cards: [
      ['i101-servers', 'Data Centers & IT Parks', 'N+1 UPS design, battery backup, and precision power for facilities where seconds of downtime cost millions.'],
      ['i101-signal', 'Digital Infrastructure', 'Power engineering for the networks, edge nodes, and connectivity hubs that keep India online.'],
      ['i101-plane', 'Airport & Metro Infrastructure', 'Mission-critical power continuity for transit systems where public safety depends on uptime.'],
      ['i101-plant', 'Industrial Infrastructure', 'Electrical distribution, UPS, and engineering support built for round-the-clock industrial operations.'],
      ['i101-city', 'Smart Cities & Utilities', 'Integrated solar, storage, and monitoring systems for next-generation urban infrastructure projects.'],
      ['i101-bolt', 'Power & Utility Infrastructure', 'Grid-support power engineering spanning generation, storage, and distribution reliability.'],
      ['i101-wifi', 'Telecom & Communication', 'Resilient backup power for towers, exchanges, and network operations centers nationwide.'],
      ['i101-port', 'Ports & Maritime Infrastructure', 'Power continuity and electrical systems for cargo terminals, cranes, and port operations.'],
      ['i101-train', 'Railway Infrastructure', 'Signal, station, and depot power systems engineered for round-the-clock rail operations.'],
    ],
  },
  commercial: {
    accent: ORANGE,
    gray: true,
    mediaSide: 'left',
    eyebrow: 'COMMERCIAL & INSTITUTIONAL',
    title: 'Spaces Where People Depend on Power',
    subtitle: "Hospitals, campuses, hotels, and public institutions — environments where reliability directly affects people's wellbeing.",
    count: '9 SECTORS',
    tag: 'COMMERCIAL VIEW',
    images: ['hospital', 'factory', 'dataCenter', 'ev', 'refinery'],
    cards: [
      ['i101-gov', 'Government & Public Sector', 'Compliant, audited power infrastructure for public buildings and government facilities.'],
      ['i101-hotel', 'Hospitality & Hotels', 'Uninterrupted guest experience with seamless backup power and energy-efficient solar integration.'],
      ['i101-edu', 'Educational Institutions', 'Reliable campus-wide power and solar rooftop systems that also cut long-term energy costs.'],
      ['i101-health', 'Healthcare & Hospitals', 'Zero-tolerance backup power design for critical care, operating theatres, and life-support systems.'],
      ['i101-bank', 'Banking & Financial Services', 'Secure, redundant power for branches, data vaults, and always-on financial infrastructure.'],
      ['i101-office', 'Corporate Campuses', 'Scalable UPS, solar, and EV charging bundled for large multi-building corporate environments.'],
      ['i101-tower', 'Commercial Real Estate', 'Power infrastructure designed into new developments and retrofitted into existing properties.'],
      ['i101-person', 'Residential Communities', 'Rooftop solar, backup power, and EV charging for apartment complexes and gated communities.'],
      ['i101-shop', 'Retail & Shopping Malls', 'Reliable power, backup systems, and EV charging bays for retail and shopping destinations.'],
    ],
  },
  industrial: {
    accent: GREEN,
    gray: false,
    mediaSide: 'right',
    eyebrow: 'INDUSTRIAL & MANUFACTURING',
    title: 'Built for Production-Line Reliability',
    subtitle: 'Factories, refineries, and logistics hubs — where every hour of downtime shows up directly on the balance sheet.',
    count: '9 SECTORS',
    tag: 'INDUSTRIAL VIEW',
    images: ['factory', 'refinery', 'dataCenter', 'hospital', 'ev'],
    cards: [
      ['i101-factory', 'Manufacturing', 'Industrial UPS, power electronics, and AMC support engineered for continuous production lines.'],
      ['i101-car', 'Automotive Industry', 'Power infrastructure and EV charging for automotive manufacturing plants and dealership networks.'],
      ['i101-chart', 'MSMEs & Small-Scale Industries', 'Right-sized, cost-effective power and solar solutions built for growing small industrial units.'],
      ['i101-drop', 'Oil & Gas Refineries', 'Hazardous-area rated electrical engineering and power continuity for refinery operations.'],
      ['i101-map', 'Special Economic Zones (SEZ)', 'Master-planned power infrastructure for multi-tenant SEZ developments and industrial parks.'],
      ['i101-warehouse', 'Warehouse, Logistics & Fleet Operators', 'Solar rooftop, backup power, and EV charging depots for warehousing and logistics fleets.'],
      ['i101-wrench', 'Engineering, Procurement & Construction (EPC)', 'Partnering with EPC contractors as the power and electrical engineering subcontractor of record.'],
      ['i101-flask', 'Pharmaceutical & Chemical Plants', 'Clean, uninterrupted power and process-critical electrical systems for regulated manufacturing.'],
      ['i101-cart', 'Textile & Apparel Manufacturing', 'Industrial power, UPS, and solar solutions sized for textile mills and apparel production units.'],
    ],
  },
  energy: {
    accent: PURPLE,
    gray: true,
    mediaSide: 'left',
    eyebrow: 'ENERGY & MOBILITY',
    title: 'Powering What Comes Next',
    subtitle: 'The fastest-growing part of our business — clean energy generation, storage, and electric mobility infrastructure.',
    count: '3 FOCUS AREAS',
    tag: 'ENERGY & MOBILITY VIEW',
    images: ['ev', 'refinery', 'factory', 'dataCenter', 'hospital'],
    cards: [
      ['i101-ev', 'EV Charging Infrastructure', 'AC & DC charging networks for commercial, fleet, and public deployment across India.'],
      ['i101-battery', 'Renewable Energy Developers', 'EPC and O&M partnership for solar and BESS developers building utility-scale projects.'],
      ['i101-sun', 'Microgrid & Energy Storage Projects', 'Standalone microgrids combining solar, BESS, and backup power for off-grid and hybrid sites.'],
    ],
  },
};

export type Ind101CategoryKey = keyof typeof CATEGORY_SEEDS;

export function defaultInd101CategoryContent(key: Ind101CategoryKey = 'infra'): Ind101CategoryContent {
  const s = CATEGORY_SEEDS[key];
  return {
    section: { tone: 'light', bgColor: s.gray ? 'var(--gray-100)' : 'var(--white)' },
    background: { hidden: true, items: [] },
    accentColor: s.accent,
    layout: { mediaSide: s.mediaSide, columns: '', gap: '', alignItems: 'center', mobileMediaFirst: false },
    eyebrow: { text: s.eyebrow, line: false, style: { color: ORANGE } },
    title: { text: s.title },
    subtitle: { text: s.subtitle },
    accentBar: {},
    count: { text: s.count },
    ctas: [],
    media: {
      mode: 'collage',
      items: media(...s.images),
      cells: defaultInd101CollageCells(),
      intervalSeconds: 4.5,
      float: true,
      floatSeconds: 5.5,
      hoverZoom: true,
      aspectRatio: '5/4',
      tag: { text: s.tag },
      tagPosition: 'top-left',
      gridColumns: 3,
    },
    cards: s.cards.map(card),
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    reveal: true,
    cardStyle: { hoverLift: true, topBar: true },
    iconStyle: { animate: true },
  };
}

export function defaultInd101Card(): Ind101Card {
  return card(['i101-bolt', 'New sector', 'Describe how Zigma powers this sector.']);
}

export function defaultInd101CtaContent(): Ind101CtaContent {
  return {
    section: {
      tone: 'dark',
      bgColor: 'var(--navy-950)',
      bgGradient: 'linear-gradient(120deg,var(--navy-950),var(--navy-900))',
    },
    background: { hidden: true, items: [] },
    align: 'center',
    maxWidth: '780px',
    eyebrow: { text: "DON'T SEE YOUR INDUSTRY?", line: false, style: { color: CYAN } },
    title: { text: "We've Probably Already Solved Your Power Problem" },
    body: {
      text: "Twenty years across 24+ sectors means there's a good chance we've already engineered something close to what you need.",
      style: { maxWidth: '600px' },
    },
    ctas: [{ label: 'Talk to an Industry Specialist →', href: '/contact#contact-form', variant: 'primary' }],
  };
}

export function defaultIndustries101SectionContent(type: string): Record<string, unknown> | null {
  switch (type) {
    case 'ind101_hero':
      return defaultInd101HeroContent();
    case 'ind101_subnav':
      return defaultInd101SubnavContent();
    case 'ind101_stats':
      return defaultInd101StatsContent();
    case 'ind101_category':
      return defaultInd101CategoryContent();
    case 'ind101_cta':
      return defaultInd101CtaContent();
    default:
      return null;
  }
}

/**
 * Fill any missing top-level keys from defaults (one level of object merge) so partially
 * saved or hand-edited JSON never crashes the renderer / editor.
 */
export function withIndustries101Defaults<T extends object>(type: Industries101SectionType, raw: unknown): T {
  const base = defaultIndustries101SectionContent(type) as Record<string, unknown>;
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined || v === null) continue;
    const b = base[k];
    if (b && typeof b === 'object' && !Array.isArray(b) && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = { ...(b as object), ...(v as object) };
    } else {
      out[k] = v;
    }
  }
  const arr = <V>(v: unknown): V[] => (Array.isArray(v) ? (v as V[]).filter((x) => x && typeof x === 'object') : []);
  const bg = out.background as LegacyBgMedia | undefined;
  if (bg && typeof bg === 'object') {
    out.background = { ...bg, items: arr<LifeMediaItem>(bg.items), mobileItems: arr<LifeMediaItem>(bg.mobileItems) };
  }
  if (type === 'ind101_subnav') out.items = arr<Ind101SubnavItem>(out.items);
  if (type === 'ind101_stats') out.items = arr<Ind101StatItem>(out.items);
  if (type === 'ind101_category') {
    const m = out.media as Ind101CategoryMedia;
    out.media = { ...m, items: arr<LifeMediaItem>(m?.items), cells: arr<Ind101CollageCell>(m?.cells) };
    out.cards = arr<Ind101Card>(out.cards).map((c) => ({ ...c, media: arr<LifeMediaItem>(c.media) }));
  }
  if (type === 'ind101_hero') {
    const bc = out.breadcrumb as Ind101HeroContent['breadcrumb'];
    out.breadcrumb = { ...bc, items: Array.isArray(bc?.items) ? bc.items : [] };
  }
  out.typographyVersion = ABOUT_TYPOGRAPHY_VERSION;
  return out as T;
}

export const INDUSTRIES101_SLUG = 'industries101';

export const INDUSTRIES101_SEED_SECTIONS: Array<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
}> = [
  { type: 'ind101_hero', section_key: 'top', title: 'Page hero (slideshow)', content_json: defaultInd101HeroContent() },
  { type: 'ind101_subnav', section_key: 'cat-subnav', title: 'Sticky category sub-nav', content_json: defaultInd101SubnavContent() },
  { type: 'ind101_stats', section_key: 'ind101-stats', title: 'Quick stat strip', content_json: defaultInd101StatsContent() },
  { type: 'ind101_category', section_key: 'cat-infra', title: 'Infrastructure & Utilities', content_json: defaultInd101CategoryContent('infra') },
  { type: 'ind101_category', section_key: 'cat-commercial', title: 'Commercial & Institutional', content_json: defaultInd101CategoryContent('commercial') },
  { type: 'ind101_category', section_key: 'cat-industrial', title: 'Industrial & Manufacturing', content_json: defaultInd101CategoryContent('industrial') },
  { type: 'ind101_category', section_key: 'cat-energy', title: 'Energy & Mobility', content_json: defaultInd101CategoryContent('energy') },
  { type: 'ind101_cta', section_key: 'contact', title: 'CTA band', content_json: defaultInd101CtaContent() },
];
