import {
  ABOUT_ICON_PRESETS,
  ABOUT_TYPOGRAPHY_VERSION,
  type ElementStyle,
  type EyebrowEl,
  type IconEl,
  type ImageEl,
  type LinkItem,
  type SectionBox,
  type SplitLayout,
  type TextEl,
} from '@/lib/about-sections';
import type { LifeColumns, LifeHighlight, LifeMediaItem, LifeSectionHeader } from '@/lib/life-sections';
import type { LegacyBgMedia, LegacyBgMotion, LegacyCardStyle } from '@/lib/legacy-sections';
import { HOMEPAGE_SEED_SECTIONS } from '@/lib/homepage-seed';
import { HERO_SLIDE_ICONS } from '@/lib/hero-icons';
import { statIconFor } from '@/lib/stat-icons';
import { featIconFor } from '@/lib/feat-icons';
import { indIconFor } from '@/lib/ind-icons';
import { ecoGroupColorKey } from '@/lib/eco-section';

/**
 * Fully configurable homepage section family (page /, slug "home"):
 * home_hero, home_eco, home_stats, home_why, home_split, home_timeline, home_projects,
 * home_industries, home_testimonials, home_partners, home_cert, home_cta.
 *
 * Built on the About / Life / Legacy element primitives. The renderer keeps the live homepage
 * markup and classes (hero-slider, eco-section, stat-bar…), so empty fields reproduce the
 * production design exactly; every admin value arrives as an inline style or --hm-* variable.
 * Headings / eyebrows follow Site Settings → Public typography, colors default to theme tokens.
 */

export const HOME_SECTION_TYPES = [
  'home_hero',
  'home_eco',
  'home_stats',
  'home_why',
  'home_split',
  'home_timeline',
  'home_projects',
  'home_industries',
  'home_testimonials',
  'home_partners',
  'home_cert',
  'home_cta',
] as const;
export type HomeSectionType = (typeof HOME_SECTION_TYPES)[number];

export function isHomeSectionType(type: string): type is HomeSectionType {
  return (HOME_SECTION_TYPES as readonly string[]).includes(type);
}

export const HOME_SLUG = 'home';

/* ------------------------------------------------------------------ */
/* Shared shapes                                                       */
/* ------------------------------------------------------------------ */

/**
 * primary / ghost / ghost-dark = site buttons; accent = hero slide button (slide accent color);
 * outline-cyan = rounded outline pill (certifications teaser).
 */
export type HomeCtaVariant = 'primary' | 'ghost' | 'ghost-dark' | 'accent' | 'outline-cyan';

export type HomeCta = {
  hidden?: boolean;
  label: string;
  href: string;
  variant?: HomeCtaVariant;
  size?: 'md' | 'sm';
  /** Lift + glow on hover */
  lift?: boolean;
  /** Slot in rows that support left / center / right placement */
  position?: 'left' | 'center' | 'right';
  newTab?: boolean;
  style?: ElementStyle;
};

export type HomeHeader = LifeSectionHeader;

export type HomeColumns = LifeColumns;

export type HomeMarquee = {
  /** Seconds for one full loop; empty = automatic from the item count */
  speedSeconds?: number;
  direction?: 'left' | 'right';
  pauseOnHover?: boolean;
  fadeEdges?: boolean;
  gap?: string;
};

/* ------------------------------------------------------------------ */
/* Section content shapes                                              */
/* ------------------------------------------------------------------ */

export type HomeHeroIcon = {
  hidden?: boolean;
  /** Inner SVG shapes (or a full <svg>) drawn as a large outline graphic */
  svg?: string;
  viewBox?: string;
  strokeWidth?: string;
  color?: string;
  opacity?: string;
  width?: string;
};

export type HomeHeroSlide = {
  hidden?: boolean;
  /** Color preset (theme-legacy, theme-ups, theme-solar, theme-eng, theme-future); empty = custom colors only */
  theme: string;
  /** Overrides the preset accent (eyebrow, button, icon) */
  accent?: string;
  /** Overrides the preset glow tint */
  tint?: string;
  eyebrow: EyebrowEl;
  title: TextEl;
  highlight?: LifeHighlight;
  lead: TextEl;
  ctas: HomeCta[];
  tags: LinkItem[];
  /** Background images / videos (several = cross-fading slideshow inside the slide) */
  media: LifeMediaItem[];
  /** Phone-only media (≤760px); empty = reuse `media` */
  mobileMedia: LifeMediaItem[];
  position?: string;
  positionMobile?: string;
  /** Scrim gradient override for this slide */
  scrim?: string;
  numeral?: string;
  icon: HomeHeroIcon;
  durationMs?: number;
};

export type HomeHeroContent = {
  section: SectionBox;
  slides: HomeHeroSlide[];
  height: { desktop?: string; minHeight?: string; mobileMinHeight?: string };
  autoplay: boolean;
  pauseOnHover: boolean;
  swipe: boolean;
  fadeMs?: number;
  media: { intervalSeconds?: number; motion?: LegacyBgMotion; motionSeconds?: number };
  overlay: {
    scrim?: string;
    grid?: boolean;
    gridColor?: string;
    tint?: boolean;
    tintOpacity?: string;
  };
  dots: { hidden?: boolean; position?: 'right' | 'bottom'; showOnMobile?: boolean; color?: string; activeColor?: string };
  tags: { hidden?: boolean; singleLine?: boolean; style?: ElementStyle; hoverColor?: string };
  layout: { columns?: string; contentMaxWidth?: string; paddingBottom?: string; paddingBottomMobile?: string };
  eyebrowStyle?: ElementStyle;
  titleStyle?: ElementStyle;
  leadStyle?: ElementStyle;
  numeralStyle?: ElementStyle;
};

export type HomeEcoNode = {
  hidden?: boolean;
  label: string;
  color: string;
  /** Built-in glyph (sun, bolt, gear, leaf, spark, lines) */
  glyph?: string;
  /** Custom icon (24×24 SVG shapes) — replaces the glyph */
  svg?: string;
};

export type HomeEcoGroup = {
  hidden?: boolean;
  color: string;
  items: string[];
  /** Desktop / tablet position (CSS order); phones always follow list order */
  order?: number;
};

export type HomeEcoContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  layout: SplitLayout;
  visual: {
    hidden?: boolean;
    mode: 'diagram' | 'media';
    frame?: boolean;
    maxWidth?: string;
    maxWidthMobile?: string;
    diagram: {
      hubLogo: string;
      hubLogoAlt?: string;
      hubFill?: string;
      ringColor?: string;
      nodeFill?: string;
      labelColor?: string;
      animate?: boolean;
      nodes: HomeEcoNode[];
    };
    media: LifeMediaItem[];
    intervalSeconds?: number;
    showDots?: boolean;
    mediaFrame: Omit<ImageEl, 'src' | 'alt' | 'hidden'>;
  };
  eyebrow: EyebrowEl;
  title: TextEl;
  highlight?: LifeHighlight;
  body: TextEl;
  groups: HomeEcoGroup[];
  checklist: {
    hidden?: boolean;
    columns?: number;
    columnsMobile?: number;
    /** column = fill top-to-bottom first (design default) */
    flow?: 'column' | 'row';
    gap?: string;
    itemStyle?: ElementStyle;
    dotSize?: string;
    hoverColor?: boolean;
  };
  trust: { hidden?: boolean; items: Array<{ badge: string; label: string; color?: string }> };
  ctas: HomeCta[];
};

export type HomeStatItem = {
  hidden?: boolean;
  value: string;
  prefix?: string;
  suffix?: string;
  label: string;
  icon: IconEl;
};

export type HomeStatsContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  items: HomeStatItem[];
  columns: HomeColumns;
  gap?: string;
  animateCount: boolean;
  countDurationMs?: number;
  hoverLift: boolean;
  numberStyle?: ElementStyle;
  suffixColor?: string;
  labelStyle?: ElementStyle;
  iconStyle: { hidden?: boolean; size?: string; color?: string; hoverColor?: string; strokeWidth?: string; opacity?: string };
};

export type HomeWhyCard = {
  hidden?: boolean;
  index: string;
  title: TextEl;
  body: TextEl;
  background?: string;
  icon?: IconEl;
  image?: ImageEl;
};

export type HomeWhyContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  header: HomeHeader;
  cards: HomeWhyCard[];
  columns: HomeColumns;
  gap?: string;
  reveal: boolean;
  cardStyle: LegacyCardStyle & { hoverTitleColor?: string };
  outline: { hidden?: boolean; animate?: boolean; color?: string; speedSeconds?: number };
  indexStyle?: ElementStyle;
  titleStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
};

export type HomeSplitFeature = {
  hidden?: boolean;
  title: TextEl;
  body: TextEl;
  icon: IconEl;
  background?: string;
};

export type HomeSplitContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  layout: SplitLayout;
  media: {
    hidden?: boolean;
    items: LifeMediaItem[];
    intervalSeconds?: number;
    showDots?: boolean;
    frame: Omit<ImageEl, 'src' | 'alt' | 'hidden'> & { minHeightMobile?: string; maxHeightMobile?: string };
  };
  eyebrow: EyebrowEl;
  title: TextEl;
  highlight?: LifeHighlight;
  body: TextEl;
  features: HomeSplitFeature[];
  featColumns: HomeColumns;
  featGap?: string;
  featCardStyle: LegacyCardStyle;
  featIconStyle: { hidden?: boolean; boxSize?: string; size?: string; background?: string; color?: string; radius?: string; strokeWidth?: string };
  featTitleStyle?: ElementStyle;
  featBodyStyle?: ElementStyle;
  ctas: HomeCta[];
  reveal: boolean;
};

export type HomeTimelineItem = {
  hidden?: boolean;
  year: string;
  title: string;
  body: string;
  now?: boolean;
  next?: boolean;
};

export type HomeTimelineContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  header: HomeHeader;
  items: HomeTimelineItem[];
  runner: { hidden?: boolean; color?: string; moveMs?: number; holdMs?: number };
  colors: { line?: string; dot?: string; now?: string; active?: string; year?: string };
  itemMinWidth?: string;
  itemMinWidthMobile?: string;
  yearStyle?: ElementStyle;
  titleStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
  ctas: HomeCta[];
};

export type HomeProjectCard = {
  hidden?: boolean;
  eyebrow?: string;
  title: string;
  stat?: string;
  body?: string;
  href: string;
  media: LifeMediaItem[];
};

export type HomeProjectsContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  header: HomeHeader;
  source: 'case_studies' | 'catalog' | 'manual';
  limit: number;
  featuredOnly: boolean;
  items: HomeProjectCard[];
  columns: HomeColumns;
  gap?: string;
  card: {
    minHeight?: string;
    minHeightMobile?: string;
    radius?: string;
    border?: string;
    hoverBorderColor?: string;
    background?: string;
    overlay?: string;
    shadow?: string;
    intervalSeconds?: number;
  };
  linkLabel: string;
  eyebrowStyle?: ElementStyle;
  titleStyle?: ElementStyle;
  statStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
  linkStyle?: ElementStyle;
  ctas: HomeCta[];
};

export type HomeIndustryItem = { hidden?: boolean; label: string; href?: string; icon: IconEl };

export type HomeIndustriesContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  header: HomeHeader;
  link: { hidden?: boolean; label: string; href: string; style?: ElementStyle };
  layout: 'marquee' | 'grid';
  items: HomeIndustryItem[];
  /** Link labels to /industries/… automatically when the industries pages are enabled */
  autoLinks: boolean;
  marquee: HomeMarquee;
  columns: HomeColumns;
  itemStyle: {
    background?: string;
    borderColor?: string;
    borderWidth?: string;
    radius?: string;
    hoverBorderColor?: string;
    padding?: string;
    minWidth?: string;
    maxWidth?: string;
  };
  iconStyle: { hidden?: boolean; size?: string; color?: string; strokeWidth?: string };
  labelStyle?: ElementStyle;
};

export type HomeTestimonial = {
  hidden?: boolean;
  quote: string;
  name: string;
  role?: string;
  avatar?: string;
};

export type HomeTestimonialsContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  header: HomeHeader;
  items: HomeTestimonial[];
  autoplay: boolean;
  intervalSeconds?: number;
  pauseOnHover: boolean;
  quoteMarks: boolean;
  card: { background?: string; border?: string; radius?: string; padding?: string; maxWidth?: string };
  avatarSize?: string;
  quoteStyle?: ElementStyle;
  nameStyle?: ElementStyle;
  roleStyle?: ElementStyle;
  dots: { hidden?: boolean; color?: string; activeColor?: string };
};

export type HomeLogo = { hidden?: boolean; src: string; alt?: string; href?: string };

export type HomePartnersContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  header: HomeHeader;
  logos: HomeLogo[];
  layout: 'marquee' | 'grid';
  marquee: HomeMarquee;
  columns: HomeColumns;
  card: {
    background?: string;
    border?: string;
    radius?: string;
    height?: string;
    heightMobile?: string;
    minWidth?: string;
    minWidthMobile?: string;
    padding?: string;
    shadow?: string;
    logoMaxHeight?: string;
    logoMaxHeightMobile?: string;
    logoMaxWidth?: string;
    grayscale?: boolean;
  };
  note: TextEl;
};

export type HomeCertContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  align: 'left' | 'center' | 'right';
  maxWidth?: string;
  eyebrow: EyebrowEl;
  title: TextEl;
  highlight?: LifeHighlight;
  body: TextEl;
  badges: { hidden?: boolean; items: LifeMediaItem[]; height?: string; heightMobile?: string; gap?: string; grayscale?: boolean };
  ctas: HomeCta[];
};

export type HomeCtaContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  align: 'left' | 'center' | 'right';
  maxWidth?: string;
  eyebrow: EyebrowEl;
  title: TextEl;
  highlight?: LifeHighlight;
  body: TextEl;
  ctas: HomeCta[];
};

/* ------------------------------------------------------------------ */
/* Presets                                                             */
/* ------------------------------------------------------------------ */

export const HOME_HERO_THEMES: Array<{ value: string; label: string; accent: string; tint: string }> = [
  { value: 'theme-legacy', label: 'Legacy (cyan)', accent: 'var(--cyan)', tint: 'var(--cyan)' },
  { value: 'theme-ups', label: 'Power (orange)', accent: 'var(--orange)', tint: 'var(--orange)' },
  { value: 'theme-solar', label: 'Solar (green)', accent: 'var(--green)', tint: 'var(--green)' },
  { value: 'theme-eng', label: 'Engineering (cyan)', accent: 'var(--cyan)', tint: 'var(--cyan)' },
  { value: 'theme-future', label: 'Future (orange + green glow)', accent: 'var(--orange)', tint: 'var(--green)' },
];

/** Built-in ecosystem diagram glyphs, drawn around the node centre (0,0). */
export const HOME_ECO_GLYPHS: Array<{ key: string; label: string; markup: string }> = [
  {
    key: 'sun',
    label: 'Sun (solar)',
    markup:
      '<path d="M0 -12v-8M-10 0h-8M10 0h8M-7 -7l-6-6M7 7l6 6M-7 7l-6 6M7 -7l6-6" stroke-width="1.4"/><circle cx="0" cy="0" r="6" fill="none" stroke-width="1.4"/>',
  },
  { key: 'bolt', label: 'Bolt (power backup)', markup: '<path d="M3 -13l-11 18h13l-11 18" fill="none" stroke-width="1.8"/>' },
  {
    key: 'gear',
    label: 'Target (automation)',
    markup: '<circle cx="0" cy="0" r="8" fill="none" stroke-width="1.4"/><path d="M0 -16v-6M0 16v6M-16 0h-6M16 0h6" stroke-width="1.4"/>',
  },
  { key: 'leaf', label: 'Leaf (sustainable)', markup: '<path d="M0 -14c10 0 16 8 14 18-10 2-18-4-18-14-2 6 0 12 4 16" fill="none" stroke-width="1.4"/>' },
  { key: 'spark', label: 'Spark (electrical)', markup: '<path d="M0 -15l-9 15h9l-6 12" fill="none" stroke-width="1.6"/>' },
  { key: 'lines', label: 'Lines (distribution)', markup: '<path d="M-15 10h30M-15 0h30M-15 -10h30" stroke-width="1.4"/>' },
];

export const HOME_ICON_PRESETS: Array<{ key: string; label: string; svg: string }> = [
  ...ABOUT_ICON_PRESETS,
  { key: 'home-house', label: 'House / rooftop', svg: '<path d="M3 21h18M5 21V9l6-4 6 4v12"/><path d="M9 21v-6h6v6"/>' },
  { key: 'home-grid', label: 'Grid / layout', svg: '<path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/>' },
  { key: 'home-clock', label: 'Clock / service', svg: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>' },
  { key: 'home-ups', label: 'UPS cabinet', svg: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h3"/>' },
  { key: 'home-lock', label: 'Battery pack', svg: '<rect x="5" y="9" width="14" height="10" rx="1.5"/><path d="M9 9V6a3 3 0 016 0v3"/>' },
  { key: 'home-panel', label: 'Panel / switchgear', svg: '<rect x="3" y="7" width="18" height="12" rx="1"/><path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2"/>' },
  { key: 'home-chart', label: 'Bar chart', svg: '<path d="M12 20V10M18 20V4M6 20v-4"/>' },
  { key: 'home-drop', label: 'Drop / green energy', svg: '<path d="M12 2C7 6 4 9.5 4 13.5A8 8 0 0020 13.5C20 9.5 17 6 12 2z"/>' },
  { key: 'home-wrench', label: 'Wrench / maintenance', svg: '<path d="M14.7 6.3a4 4 0 01-5.6 5.6L4 17l3 3 5.1-5.1a4 4 0 015.6-5.6z"/>' },
  { key: 'home-chip', label: 'Chip / electronics', svg: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 2v3M16 2v3M8 19v3M16 19v3M2 8h3M2 16h3M19 8h3M19 16h3"/>' },
  { key: 'home-star', label: 'Star', svg: '<path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1z"/>' },
  { key: 'home-signal', label: 'Signal / IoT', svg: '<path d="M5 12a7 7 0 0114 0M2 12a10 10 0 0120 0"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>' },
];

const EYEBROW_CLASS_COLOR: Record<string, string> = {
  'eyebrow-orange': 'var(--orange)',
  'eyebrow-cyan': 'var(--cyan)',
  'eyebrow-green': 'var(--green)',
};

const WHY_TINTS: Record<string, string> = {
  'tint-1': '#FFF7F2',
  'tint-2': '#F1FAF4',
  'tint-3': '#F1FAFC',
  'tint-4': '#FFFCF3',
  'tint-5': '#F8F5FD',
  'tint-6': '#F5F8FE',
};

export const HOME_ECO_LOGO = '/assets/images/zigma.png';

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

type Raw = Record<string, unknown>;

function obj(value: unknown): Raw {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : {};
}

function str(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function arr(value: unknown): Raw[] {
  return Array.isArray(value) ? value.filter((v) => v && typeof v === 'object').map((v) => v as Raw) : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => str(v)).filter((v) => v.trim()) : [];
}

function text(value: unknown, style?: ElementStyle): TextEl {
  return style ? { text: str(value), style } : { text: str(value) };
}

function eyebrow(value: unknown, color?: string): EyebrowEl {
  return color ? { text: str(value), line: false, style: { color } } : { text: str(value), line: false };
}

function header(eyebrowText: unknown, color: string, title: unknown, subtitle: unknown, align?: 'center'): HomeHeader {
  return {
    ...(align ? { align } : {}),
    eyebrow: eyebrow(eyebrowText, color),
    title: text(title),
    subtitle: text(subtitle),
  };
}

function emptyBg(): LegacyBgMedia {
  return { items: [] };
}

function position(value: unknown): 'left' | 'center' | 'right' {
  return value === 'center' || value === 'right' ? value : 'left';
}

function contrastText(hex: string): string {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return '#ffffff';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16));
  if ([r, g, b].some((n) => Number.isNaN(n))) return '#ffffff';
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#0A1628' : '#ffffff';
}

/** A section background value may be a color or a gradient. */
function backgroundToBox(value: string): SectionBox {
  const v = value.trim();
  if (!v) return {};
  return /gradient\(|url\(/i.test(v) ? { bgGradient: v } : { bgColor: v };
}

/* ------------------------------------------------------------------ */
/* Upgrade: old homepage section → home_* (also builds the defaults)   */
/* ------------------------------------------------------------------ */

export function defaultHomeHeroSlide(): HomeHeroSlide {
  return {
    theme: 'theme-ups',
    eyebrow: eyebrow('◆ NEW SLIDE'),
    title: text('New slide heading'),
    lead: text('Short supporting sentence for this slide.'),
    ctas: [{ label: 'Learn more →', href: '/contact', variant: 'accent' }],
    tags: [],
    media: [],
    mobileMedia: [],
    icon: {},
    durationMs: 6000,
  };
}

function upgradeHero(c: Raw): HomeHeroContent {
  const slides: HomeHeroSlide[] = arr(c.slides).map((s) => {
    const theme = str(s.theme, 'theme-legacy');
    const preset = HERO_SLIDE_ICONS[theme];
    const iconSvg = str(s.iconHtml) || preset?.html || '';
    const image = str(s.image).trim();
    const imageMobile = str(s.imageMobile).trim();
    const duration = Number(s.durationMs);
    return {
      theme,
      eyebrow: eyebrow(s.eyebrow),
      title: text(s.title),
      lead: text(s.lead),
      ctas: str(s.cta).trim() ? [{ label: str(s.cta), href: str(s.ctaHref, '#'), variant: 'accent' as const }] : [],
      tags: strings(s.tags).map((label) => ({ label })),
      media: image ? [{ src: image }] : [],
      mobileMedia: imageMobile ? [{ src: imageMobile }] : [],
      ...(str(s.numeral).trim() ? { numeral: str(s.numeral) } : {}),
      icon: iconSvg
        ? {
            svg: iconSvg,
            viewBox: preset?.viewBox || '0 0 400 400',
            strokeWidth: preset?.strokeWidth || '1.6',
          }
        : { hidden: true },
      durationMs: Number.isFinite(duration) && duration > 0 ? duration : 6000,
    };
  });
  return {
    section: {},
    slides,
    height: {},
    autoplay: true,
    pauseOnHover: false,
    swipe: true,
    media: { motion: 'none' },
    overlay: { grid: true, tint: true },
    dots: { position: 'right' },
    tags: { singleLine: Boolean(c.tagsSingleLine) },
    layout: {},
  };
}

export function defaultHomeEcoNodes(): HomeEcoNode[] {
  return [
    { label: 'Solar Energy', color: 'var(--green)', glyph: 'sun' },
    { label: 'Power Backup', color: 'var(--orange)', glyph: 'bolt' },
    { label: 'Automation', color: 'var(--cyan)', glyph: 'gear' },
    { label: 'Sustainable Power', color: 'var(--green)', glyph: 'leaf' },
    { label: 'Electrical Engg.', color: 'var(--cyan)', glyph: 'spark' },
    { label: 'Distribution', color: 'var(--orange)', glyph: 'lines' },
  ];
}

/* globals.css pins these four groups to fixed cells of the 2-column checklist (row, column). */
const ECO_FIXED_CELLS: Record<string, [number, number]> = {
  'cap-group-orange': [0, 0],
  'cap-group-green': [1, 0],
  'cap-group-blue': [0, 1],
  'cap-group-purple': [1, 1],
};

/** Row-major slot of each group in the live checklist: pinned groups first, the rest auto-placed in order. */
function ecoLiveSlots(classNames: string[]): number[] {
  const taken = new Set<number>();
  const pinned = classNames.map((cls) => {
    const cell = ECO_FIXED_CELLS[cls.trim()];
    if (!cell) return null;
    const slot = cell[0] * 2 + cell[1];
    taken.add(slot);
    return slot;
  });
  let cursor = 0;
  return pinned.map((slot) => {
    if (slot !== null) return slot;
    while (taken.has(cursor)) cursor++;
    taken.add(cursor);
    return cursor++;
  });
}

function upgradeEco(c: Raw): HomeEcoContent {
  const rawGroups = arr(c.groups);
  const slots = ecoLiveSlots(rawGroups.map((g) => str(g.className)));
  const reordered = slots.some((slot, i) => slot !== i);
  const groups: HomeEcoGroup[] = rawGroups.map((g, i) => ({
    color: `var(--${ecoGroupColorKey({ className: str(g.className), dot: str(g.dot) })})`,
    items: strings(g.items),
    ...(reordered ? { order: slots[i] } : {}),
  }));
  return {
    section: {},
    background: emptyBg(),
    layout: { imageSide: 'left', mobileImageFirst: true },
    visual: {
      mode: 'diagram',
      frame: true,
      diagram: { hubLogo: HOME_ECO_LOGO, animate: true, nodes: defaultHomeEcoNodes() },
      media: [],
      mediaFrame: {},
    },
    eyebrow: eyebrow(c.eyebrow, 'var(--orange)'),
    title: text(c.title),
    body: text(c.body),
    groups,
    checklist: { columns: 2, columnsMobile: 1, flow: 'row', hoverColor: true },
    trust: { items: [{ badge: 'ISO-ALIGNED PROCESS', label: 'Quality Certified', color: 'var(--green)' }] },
    ctas: [{ label: str(c.cta, 'Learn more'), href: str(c.ctaHref, '#why'), variant: 'primary' }],
  };
}

function upgradeStats(c: Raw): HomeStatsContent {
  return {
    section: {},
    background: emptyBg(),
    items: arr(c.stats).map((s, i) => ({
      value: str(s.value, '0'),
      suffix: str(s.suffix) || '+',
      label: str(s.label),
      icon: { svg: statIconFor(str(s.label), i, str(s.icon)) },
    })),
    columns: { desktop: 6, tablet: 3, mobile: 2 },
    animateCount: true,
    countDurationMs: 1400,
    hoverLift: true,
    iconStyle: {},
  };
}

function upgradeWhy(c: Raw): HomeWhyContent {
  const tone = str(c.tone);
  const section: SectionBox =
    tone === 'gray' ? { bgColor: 'var(--gray-100)' } : tone === 'dark' ? { bgColor: 'var(--navy-950)', textColor: '#FFFFFF' } : {};
  return {
    section,
    background: emptyBg(),
    header: header(c.eyebrow, 'var(--orange)', c.title, c.body),
    cards: arr(c.cards).map((card) => ({
      index: str(card.index),
      title: text(card.title),
      body: text(card.desc ?? card.body),
      background: str(card.bg).trim() || WHY_TINTS[str(card.tint)] || '',
    })),
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    reveal: true,
    cardStyle: {},
    outline: { animate: true },
  };
}

function splitCtas(c: Raw): HomeCta[] {
  if (Array.isArray(c.ctas)) {
    return arr(c.ctas)
      .filter((x) => str(x.label).trim())
      .map((x) => ({
        label: str(x.label),
        href: str(x.href, '#'),
        variant: x.type === 'secondary' ? ('ghost-dark' as const) : ('primary' as const),
        size: 'sm' as const,
        lift: true,
        position: position(x.position),
      }));
  }
  if (str(c.cta).trim()) {
    return [{ label: str(c.cta), href: str(c.ctaHref, '#'), variant: 'primary', size: 'sm', lift: true, position: 'left' }];
  }
  return [];
}

function upgradeSplit(c: Raw): HomeSplitContent {
  const tone = str(c.tone);
  const toneBox: SectionBox = tone === 'ice' ? { bgColor: '#F0F8FC' } : tone === 'gray' ? { bgColor: 'var(--gray-100)' } : {};
  const custom = str(c.sectionBg).trim();
  const image = str(c.image).trim();
  return {
    section: custom ? backgroundToBox(custom) : toneBox,
    background: emptyBg(),
    layout: { imageSide: c.imagePosition === 'right' ? 'right' : 'left', mobileImageFirst: true },
    media: { items: image ? [{ src: image }] : [], showDots: true, frame: {} },
    eyebrow: eyebrow(c.eyebrow, EYEBROW_CLASS_COLOR[str(c.eyebrowClass)] || 'var(--orange)'),
    title: text(c.title),
    body: text(c.body),
    features: arr(c.features).map((f, i) => ({
      title: text(f.title),
      body: text(f.body),
      icon: { svg: featIconFor(i, str(f.icon), str(f.title)) },
    })),
    featColumns: { desktop: 2, tablet: 2, mobile: 1 },
    featCardStyle: str(c.featCardBg).trim() ? { background: str(c.featCardBg).trim() } : {},
    featIconStyle: {},
    ctas: splitCtas(c),
    reveal: true,
  };
}

function timelineCtas(c: Raw): HomeCta[] {
  const list: Raw[] = Array.isArray(c.ctas)
    ? arr(c.ctas)
    : str(c.cta).trim()
      ? [{ label: c.cta, href: c.ctaHref, position: c.ctaAlign, color: '' }]
      : [];
  return list
    .filter((x) => str(x.label).trim())
    .map((x) => {
      const color = str(x.color).trim();
      const custom = /^#[0-9A-Fa-f]{6}$/.test(color);
      return {
        label: str(x.label),
        href: str(x.href, '#'),
        variant: 'ghost' as const,
        size: 'sm' as const,
        position: position(x.position),
        ...(custom ? { style: { background: color, color: contrastText(color), border: `1.5px solid ${color}` } } : {}),
      };
    });
}

function upgradeTimeline(c: Raw): HomeTimelineContent {
  return {
    section: {},
    background: emptyBg(),
    header: header(c.eyebrow, 'var(--cyan)', c.title, ''),
    items: arr(c.items).map((it) => ({
      year: str(it.year),
      title: str(it.title),
      body: str(it.body),
      ...(it.now ? { now: true } : {}),
      ...(it.next ? { next: true } : {}),
    })),
    runner: {},
    colors: {},
    ctas: timelineCtas(c),
  };
}

function upgradeProjects(c: Raw): HomeProjectsContent {
  const source = str(c.source, 'catalog');
  const limit = Number(c.limit);
  return {
    section: {},
    background: emptyBg(),
    header: header(c.eyebrow, 'var(--orange)', str(c.title) || 'Featured projects', ''),
    source: source === 'case_studies' ? 'case_studies' : source === 'manual' ? 'manual' : 'catalog',
    limit: Number.isFinite(limit) && limit > 0 ? limit : 3,
    featuredOnly: c.featuredOnly !== false,
    items: [],
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    card: {},
    linkLabel: 'View case study →',
    ctas: [{ label: str(c.cta) || 'View All Projects →', href: str(c.ctaHref) || '/projects', variant: 'ghost-dark', size: 'sm' }],
  };
}

function upgradeIndustries(c: Raw): HomeIndustriesContent {
  const width = str(c.itemBorderWidth).trim();
  return {
    section: {},
    background: emptyBg(),
    header: header(c.eyebrow, 'var(--orange)', c.title, '', 'center'),
    link: { hidden: !str(c.linkLabel).trim(), label: str(c.linkLabel), href: str(c.linkHref) || '/industries' },
    layout: str(c.layout) === 'grid' ? 'grid' : 'marquee',
    items: strings(c.items).map((label) => ({ label, icon: { svg: indIconFor(label) } })),
    autoLinks: true,
    marquee: { direction: 'left', pauseOnHover: true, fadeEdges: true },
    columns: { desktop: 4, tablet: 2, mobile: 1 },
    itemStyle: {
      background: str(c.itemBg).trim() || undefined,
      borderColor: str(c.itemBorderColor).trim() || undefined,
      borderWidth: width ? (/^\d+(\.\d+)?$/.test(width) ? `${width}px` : width) : undefined,
    },
    iconStyle: {},
  };
}

function upgradeTestimonials(c: Raw): HomeTestimonialsContent {
  return {
    section: {},
    background: emptyBg(),
    header: header(str(c.eyebrow) || 'TESTIMONIALS', 'var(--cyan)', c.title, '', 'center'),
    items: arr(c.items).map((t) => ({
      quote: str(t.quote),
      name: str(t.name),
      ...(str(t.role).trim() ? { role: str(t.role) } : {}),
    })),
    autoplay: true,
    intervalSeconds: 6,
    pauseOnHover: false,
    quoteMarks: true,
    card: {},
    dots: {},
  };
}

function upgradePartners(c: Raw): HomePartnersContent {
  return {
    section: {},
    background: emptyBg(),
    header: header(c.eyebrow, 'var(--orange)', c.title, '', 'center'),
    logos: arr(c.logos)
      .filter((l) => str(l.src).trim())
      .map((l) => ({ src: str(l.src), alt: str(l.alt) })),
    layout: 'marquee',
    marquee: { speedSeconds: 34, direction: 'right', pauseOnHover: true, fadeEdges: true },
    columns: { desktop: 6, tablet: 4, mobile: 2 },
    card: {},
    note: text(c.note),
  };
}

function upgradeCert(c: Raw): HomeCertContent {
  return {
    section: {},
    background: emptyBg(),
    align: 'center',
    eyebrow: eyebrow(str(c.eyebrow) || 'CERTIFICATIONS', 'var(--cyan)'),
    title: text(c.title),
    body: text(c.body),
    badges: { items: [] },
    ctas: str(c.cta).trim()
      ? [{ label: str(c.cta), href: str(c.ctaHref) || '/certifications', variant: 'outline-cyan' }]
      : [],
  };
}

function upgradeCta(c: Raw): HomeCtaContent {
  const ctas: HomeCta[] = [];
  if (str(c.primaryCta).trim()) ctas.push({ label: str(c.primaryCta), href: str(c.primaryHref, '/contact'), variant: 'primary' });
  if (str(c.secondaryCta).trim()) ctas.push({ label: str(c.secondaryCta), href: str(c.secondaryHref, '/contact'), variant: 'ghost' });
  return {
    section: {},
    background: emptyBg(),
    align: 'center',
    eyebrow: eyebrow(c.eyebrow, 'var(--cyan)'),
    title: text(c.title),
    body: text(c.body),
    ctas,
  };
}

export const HOME_UPGRADE_MAP: Record<string, HomeSectionType> = {
  hero: 'home_hero',
  eco: 'home_eco',
  stats: 'home_stats',
  why: 'home_why',
  split: 'home_split',
  timeline: 'home_timeline',
  projects_teaser: 'home_projects',
  industries: 'home_industries',
  testimonials: 'home_testimonials',
  partners: 'home_partners',
  cert_teaser: 'home_cert',
  cta: 'home_cta',
};

/** Convert an old homepage section (hero, eco, stats…) to its home_* equivalent, keeping every field. */
export function upgradeHomeSection(
  oldType: string,
  content: unknown
): { type: HomeSectionType; content: Record<string, unknown> } | null {
  const type = HOME_UPGRADE_MAP[oldType];
  if (!type) return null;
  const c = obj(content);
  const build: Record<HomeSectionType, (c: Raw) => object> = {
    home_hero: upgradeHero,
    home_eco: upgradeEco,
    home_stats: upgradeStats,
    home_why: upgradeWhy,
    home_split: upgradeSplit,
    home_timeline: upgradeTimeline,
    home_projects: upgradeProjects,
    home_industries: upgradeIndustries,
    home_testimonials: upgradeTestimonials,
    home_partners: upgradePartners,
    home_cert: upgradeCert,
    home_cta: upgradeCta,
  };
  return { type, content: { ...build[type](c), typographyVersion: ABOUT_TYPOGRAPHY_VERSION } };
}

/* ------------------------------------------------------------------ */
/* Defaults (the live homepage content)                                */
/* ------------------------------------------------------------------ */

const SEED = HOMEPAGE_SEED_SECTIONS as unknown as ReadonlyArray<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Raw;
}>;

function seedContent(oldType: string, key?: string): Raw {
  const hit = SEED.find((s) => s.type === oldType && (!key || s.section_key === key));
  return hit ? hit.content_json : {};
}

const DEFAULT_SOURCE: Record<HomeSectionType, [string, string?]> = {
  home_hero: ['hero'],
  home_eco: ['eco'],
  home_stats: ['stats'],
  home_why: ['why'],
  home_split: ['split', 'generate'],
  home_timeline: ['timeline'],
  home_projects: ['projects_teaser'],
  home_industries: ['industries'],
  home_testimonials: ['testimonials'],
  home_partners: ['partners'],
  home_cert: ['cert_teaser'],
  home_cta: ['cta'],
};

export function defaultHomeSectionContent(type: string): Record<string, unknown> | null {
  if (!isHomeSectionType(type)) return null;
  const [oldType, key] = DEFAULT_SOURCE[type];
  const up = upgradeHomeSection(oldType, seedContent(oldType, key));
  if (!up) return null;
  const { typographyVersion: _v, ...content } = up.content;
  void _v;
  return content;
}

/*
 * Saved objects replace the default as a whole: the homepage has several sections of one type
 * (seven home_split blocks) and a sub-object such as `section` must never pick up another block's
 * background from the shared default.
 */
function fillMissing(base: Raw, src: Raw): Raw {
  const out: Raw = { ...base };
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Fill any missing top-level keys from defaults and normalise nested lists so partially
 * saved or hand-edited JSON never crashes the renderer / editor.
 */
export function withHomeDefaults<T extends object>(type: HomeSectionType, raw: unknown): T {
  const base = (defaultHomeSectionContent(type) || {}) as Raw;
  const out = fillMissing(base, obj(raw));
  for (const key of ['background'] as const) {
    if (key in out) {
      const bg = obj(out[key]);
      out[key] = { ...bg, items: Array.isArray(bg.items) ? bg.items : [], mobileItems: Array.isArray(bg.mobileItems) ? bg.mobileItems : [] };
    }
  }
  if (type === 'home_hero') {
    const d = defaultHomeHeroSlide();
    out.slides = arr(out.slides).map((s) => ({
      ...d,
      ...s,
      eyebrow: obj(s.eyebrow).text !== undefined ? s.eyebrow : d.eyebrow,
      title: obj(s.title).text !== undefined ? s.title : d.title,
      lead: obj(s.lead).text !== undefined ? s.lead : d.lead,
      ctas: Array.isArray(s.ctas) ? s.ctas : [],
      tags: Array.isArray(s.tags) ? s.tags : [],
      media: Array.isArray(s.media) ? s.media : [],
      mobileMedia: Array.isArray(s.mobileMedia) ? s.mobileMedia : [],
      icon: obj(s.icon),
    }));
  }
  if (type === 'home_eco') {
    const visual = obj(out.visual);
    const diagram = obj(visual.diagram);
    out.visual = {
      ...visual,
      diagram: { ...diagram, nodes: Array.isArray(diagram.nodes) ? diagram.nodes : defaultHomeEcoNodes() },
      media: Array.isArray(visual.media) ? visual.media : [],
      mediaFrame: obj(visual.mediaFrame),
    };
    out.groups = arr(out.groups).map((g) => ({ ...g, items: strings(g.items) }));
    const trust = obj(out.trust);
    out.trust = { ...trust, items: arr(trust.items) };
  }
  if (type === 'home_split') {
    const media = obj(out.media);
    out.media = { ...media, items: Array.isArray(media.items) ? media.items : [], frame: obj(media.frame) };
    out.features = arr(out.features).map((f) => ({ ...f, icon: obj(f.icon) }));
  }
  if (type === 'home_projects') {
    out.items = arr(out.items).map((p) => ({ ...p, media: Array.isArray(p.media) ? p.media : [] }));
  }
  if (type === 'home_industries') {
    out.items = arr(out.items).map((it) => ({ ...it, icon: obj(it.icon) }));
  }
  if (type === 'home_cert') {
    const badges = obj(out.badges);
    out.badges = { ...badges, items: Array.isArray(badges.items) ? badges.items : [] };
  }
  out.typographyVersion = ABOUT_TYPOGRAPHY_VERSION;
  return out as T;
}

/** Homepage seed in the configurable home_* types (used by "Seed homepage" and the seed fallback). */
export const HOME_SEED_SECTIONS: Array<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
}> = SEED.map((s) => {
  const up = upgradeHomeSection(s.type, s.content_json);
  return up
    ? { type: up.type, section_key: s.section_key, title: s.title, content_json: up.content }
    : { type: s.type, section_key: s.section_key, title: s.title, content_json: { ...s.content_json } };
});
