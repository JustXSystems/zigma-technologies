import type { CSSProperties } from 'react';
import { publicMediaUrl } from '@/lib/media-url';
import type { HeroHeight } from '@/lib/hero-height';
import type { HeroPlacement } from '@/lib/hero-placement';
import type { LegacyBgMedia } from '@/lib/legacy-sections';

/**
 * Fully configurable "About" section family (About Zigma page):
 * about_hero, services_marquee, story, purpose, founder_note, facilities.
 *
 * Every visible element carries an optional ElementStyle. Empty style fields
 * fall back to the scoped `.az-*` CSS defaults, which mirror the approved
 * About Zigma HTML design.
 */

export const ABOUT_SECTION_TYPES = [
  'about_hero',
  'services_marquee',
  'story',
  'purpose',
  'founder_note',
  'facilities',
] as const;
export type AboutSectionType = (typeof ABOUT_SECTION_TYPES)[number];

export function isAboutSectionType(type: string): type is AboutSectionType {
  return (ABOUT_SECTION_TYPES as readonly string[]).includes(type);
}

/* ------------------------------------------------------------------ */
/* Element primitives                                                  */
/* ------------------------------------------------------------------ */

export type ElementStyle = {
  hidden?: boolean;
  color?: string;
  background?: string;
  /** display | body | mono, or any raw CSS font-family */
  fontFamily?: string;
  fontSize?: string;
  /** Font size on phones (≤760px); empty = same as desktop / design default */
  fontSizeMobile?: string;
  fontWeight?: string;
  fontStyle?: string;
  textTransform?: string;
  letterSpacing?: string;
  lineHeight?: string;
  textAlign?: string;
  /** Text align on phones (≤760px) */
  textAlignMobile?: string;
  maxWidth?: string;
  marginTop?: string;
  marginBottom?: string;
  padding?: string;
  border?: string;
  borderRadius?: string;
  opacity?: string;
};

export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'p' | 'div';

export type TextEl = {
  text: string;
  style?: ElementStyle;
  /** Heading level override (SEO); visual size stays controlled by style. */
  tag?: HeadingTag;
};

/** Site Settings → Public typography eyebrow sizes (base / medium / large). */
export type EyebrowScale = 'base' | 'md' | 'lg';

/* --az-eyebrow-cap is set on phones (about-sections.css) so md / lg never outgrow the shrunken headings. */
export const EYEBROW_SCALE_VAR: Record<EyebrowScale, string> = {
  base: 'var(--text-eyebrow)',
  md: 'min(var(--text-eyebrow-md), var(--az-eyebrow-cap, 100vw))',
  lg: 'min(var(--text-eyebrow-lg), var(--az-eyebrow-cap, 100vw))',
};

export type EyebrowEl = TextEl & {
  /** Short accent line before the label */
  line?: boolean;
  /** Site eyebrow scale; empty = placement default (hero md, sections lg). style.fontSize still wins. */
  size?: EyebrowScale;
};

/** Headings whose tag / size follow Site Settings → Public typography heading levels. */
export type AboutHeadingRole = 'pageHero' | 'section';

export const ABOUT_TYPOGRAPHY_VERSION = 2;

export type LinkItem = { label: string; href?: string };

export type PillsEl = {
  hidden?: boolean;
  items: LinkItem[];
  /** Base pill look (color / background / border are hover-aware). */
  style?: ElementStyle;
  hoverColor?: string;
  hoverBackground?: string;
  hoverBorderColor?: string;
  justify?: 'flex-start' | 'center' | 'flex-end';
  gap?: string;
  marginTop?: string;
  /** Keep every pill on one line (scrolls horizontally on narrow screens). */
  nowrap?: boolean;
};

export type ImageEl = {
  hidden?: boolean;
  src: string;
  alt?: string;
  fit?: 'cover' | 'contain' | 'fill' | 'none';
  /** object-position, e.g. "center top" */
  position?: string;
  radius?: string;
  aspectRatio?: string;
  minHeight?: string;
  width?: string;
  maxWidth?: string;
  border?: string;
  shadow?: string;
  background?: string;
  /** CSS gradient painted over the image; empty = none */
  overlay?: string;
};

export type IconEl = {
  hidden?: boolean;
  /** Inline SVG markup — full <svg> or inner shapes for a 24×24 viewBox */
  svg?: string;
  /** Optional media-library image / SVG file (used when svg is empty) */
  src?: string;
  /** stroke = outline icons (default); fill = solid icons */
  mode?: 'stroke' | 'fill';
  color?: string;
  background?: string;
  border?: string;
  size?: string;
  boxSize?: string;
  radius?: string;
  strokeWidth?: string;
};

export type CtaButton = {
  label: string;
  href: string;
  variant?: 'primary' | 'ghost' | 'ghost-dark';
  style?: ElementStyle;
};

export type Orb = {
  color: string;
  size: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  opacity?: string;
  blur?: string;
  /** Slow floating animation */
  drift?: boolean;
};

export type SectionBox = {
  /** Text tone used for muted copy defaults */
  tone?: 'light' | 'dark';
  bgColor?: string;
  /** Gradient layers painted above the background image */
  bgGradient?: string;
  bgImage?: string;
  /** Looping muted background video (mp4 / webm); the background image is its poster / fallback */
  bgVideo?: string;
  bgPosition?: string;
  bgSize?: string;
  bgRepeat?: string;
  textColor?: string;
  paddingTop?: string;
  paddingBottom?: string;
  /** Phone padding (≤760px); empty = mobile design default */
  paddingTopMobile?: string;
  paddingBottomMobile?: string;
  /** Background image position on phones */
  bgPositionMobile?: string;
  borderTop?: string;
  borderBottom?: string;
  containerMaxWidth?: string;
  pattern?: 'none' | 'grid' | 'grid-fade' | 'grid-fade-top';
  patternColor?: string;
  patternSize?: string;
  orbs?: Orb[];
};

export type SectionHeader = {
  hidden?: boolean;
  align?: 'left' | 'center' | 'right';
  maxWidth?: string;
  marginBottom?: string;
  eyebrow: EyebrowEl;
  title: TextEl;
  subtitle: TextEl;
};

export type SplitLayout = {
  imageSide: 'left' | 'right';
  /** grid-template-columns override; empty = design default */
  columns?: string;
  gap?: string;
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  /** When columns stack on tablet / phone, show the image above the copy */
  mobileImageFirst?: boolean;
};

/* ------------------------------------------------------------------ */
/* Section content shapes                                              */
/* ------------------------------------------------------------------ */

export type FloatCardPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

export type AboutHeroContent = {
  section: SectionBox;
  layout: SplitLayout;
  heroHeight?: HeroHeight;
  placement?: HeroPlacement;
  /** Background image / video slideshow behind the hero (same engine as the Legacy hero) */
  background?: LegacyBgMedia;
  /** Fade-up entrance for breadcrumb, heading, lead, pills and buttons (off unless enabled) */
  entrance?: boolean;
  /** Page-scroll progress bar pinned to the top of the viewport (off unless enabled) */
  scrollBar?: { hidden?: boolean; gradient?: string };
  breadcrumb: {
    hidden?: boolean;
    items: LinkItem[];
    separator: string;
    style?: ElementStyle;
    hoverColor?: string;
  };
  eyebrow: EyebrowEl;
  title: TextEl;
  lead: TextEl;
  pills: PillsEl;
  ctas: CtaButton[];
  image: ImageEl;
  floatCard: {
    hidden?: boolean;
    position: FloatCardPosition;
    number: TextEl;
    label: TextEl;
    background?: string;
    border?: string;
    radius?: string;
  };
};

export type MarqueeSeparator = 'dot' | 'square' | 'diamond' | 'line' | 'icon' | 'none';

export type ServicesMarqueeContent = {
  section: SectionBox;
  items: LinkItem[];
  itemStyle?: ElementStyle;
  hoverColor?: string;
  itemGap?: string;
  separator: {
    type: MarqueeSeparator;
    color?: string;
    size?: string;
    icon?: IconEl;
  };
  speedSeconds: number;
  direction: 'ltr' | 'rtl';
  pauseOnHover: boolean;
};

export type StoryContent = {
  section: SectionBox;
  layout: SplitLayout;
  image: ImageEl;
  eyebrow: EyebrowEl;
  title: TextEl;
  paragraphs: TextEl[];
  paragraphStyle?: ElementStyle;
  pills: PillsEl;
  ctas: CtaButton[];
  reveal?: boolean;
};

export type PurposeCard = {
  watermark: string;
  watermarkColor?: string;
  /** Accent for tag, icon and hover bar fallback */
  accentColor: string;
  /** Top hover bar gradient; empty = solid accent */
  accentBar?: string;
  icon: IconEl;
  tag: TextEl;
  title: TextEl;
  body: TextEl;
  background?: string;
  border?: string;
};

export type PurposeContent = {
  section: SectionBox;
  header: SectionHeader;
  cards: PurposeCard[];
  cardStyle: {
    background?: string;
    border?: string;
    radius?: string;
    padding?: string;
    paddingMobile?: string;
    hoverBackground?: string;
    hoverBorderColor?: string;
    hoverLift?: boolean;
  };
  divider: {
    hidden?: boolean;
    symbol: string;
    color?: string;
    lineColor?: string;
    fontSize?: string;
  };
};

export type FounderStat = { label: string; text: string };

export type FounderNoteContent = {
  section: SectionBox;
  header: SectionHeader;
  layout: {
    photoSide: 'left' | 'right';
    photoWidth?: string;
    gap?: string;
    maxWidth?: string;
    alignItems?: 'start' | 'center' | 'end';
    /** When stacked on phones, show the photo above the note */
    mobilePhotoFirst?: boolean;
    /** Photo width once stacked on phones */
    photoWidthMobile?: string;
  };
  photo: ImageEl;
  heading: TextEl;
  quote: TextEl & { hidden?: boolean; borderColor?: string; borderWidth?: string };
  paragraphs: TextEl[];
  paragraphStyle?: ElementStyle;
  signature: {
    hidden?: boolean;
    divider?: boolean;
    name: TextEl;
    role: TextEl;
  };
  stats: {
    hidden?: boolean;
    divider?: boolean;
    items: FounderStat[];
    /** Phones show labels only (2×2 grid) — matches the design */
    hideTextOnMobile?: boolean;
    labelStyle?: ElementStyle;
    textStyle?: ElementStyle;
  };
};

export type FacilityStep = {
  tag: string;
  title: string;
  body: string;
  color: string;
  icon: IconEl;
};

export type FacilitiesContent = {
  section: SectionBox;
  header: SectionHeader;
  steps: FacilityStep[];
  startSide: 'left' | 'right';
  animateCards: boolean;
  track: { hidden?: boolean; color?: string; animate?: boolean };
  cardStyle: {
    background?: string;
    border?: string;
    radius?: string;
    shadow?: string;
    padding?: string;
    maxWidth?: string;
  };
  iconStyle: {
    background?: string;
    border?: string;
    radius?: string;
    size?: string;
  };
  tagStyle?: ElementStyle;
  titleStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
};

/* ------------------------------------------------------------------ */
/* Style → CSS                                                         */
/* ------------------------------------------------------------------ */

export const FONT_FAMILY_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'display', label: 'Space Grotesk (display)' },
  { value: 'body', label: 'Inter (body)' },
  { value: 'mono', label: 'IBM Plex Mono (mono)' },
  { value: 'Georgia, serif', label: 'Georgia (serif)' },
  { value: 'system-ui, sans-serif', label: 'System UI' },
] as const;

export function fontFamilyCss(value?: string): string | undefined {
  const v = (value || '').trim();
  if (!v) return undefined;
  if (v === 'display') return 'var(--font-display)';
  if (v === 'body') return 'var(--font-body)';
  if (v === 'mono') return 'var(--font-mono)';
  return v;
}

function clean(value?: string): string | undefined {
  const v = typeof value === 'string' ? value.trim() : '';
  return v || undefined;
}

export function elementCss(style?: ElementStyle): CSSProperties | undefined {
  if (!style) return undefined;
  const out: CSSProperties = {
    color: clean(style.color),
    background: clean(style.background),
    fontFamily: fontFamilyCss(style.fontFamily),
    fontSize: clean(style.fontSize),
    fontWeight: clean(style.fontWeight) as CSSProperties['fontWeight'],
    fontStyle: clean(style.fontStyle),
    textTransform: clean(style.textTransform) as CSSProperties['textTransform'],
    letterSpacing: clean(style.letterSpacing),
    lineHeight: clean(style.lineHeight),
    textAlign: clean(style.textAlign) as CSSProperties['textAlign'],
    maxWidth: clean(style.maxWidth),
    marginTop: clean(style.marginTop),
    marginBottom: clean(style.marginBottom),
    padding: clean(style.padding),
    border: clean(style.border),
    borderRadius: clean(style.borderRadius),
    opacity: clean(style.opacity) as CSSProperties['opacity'],
  };
  if (style.textAlign === 'center' && clean(style.maxWidth)) {
    out.marginLeft = 'auto';
    out.marginRight = 'auto';
  }
  const mobile = out as Record<string, unknown>;
  if (clean(style.fontSizeMobile)) mobile['--az-fs-m'] = style.fontSizeMobile!.trim();
  if (clean(style.textAlignMobile)) mobile['--az-ta-m'] = style.textAlignMobile!.trim();
  const entries = Object.entries(out).filter(([, v]) => v !== undefined);
  return entries.length ? (Object.fromEntries(entries) as CSSProperties) : undefined;
}

/** Merge two style objects; later non-empty fields win. */
export function mergeStyle(...styles: Array<ElementStyle | undefined>): ElementStyle {
  const out: ElementStyle = {};
  for (const s of styles) {
    if (!s) continue;
    for (const [k, v] of Object.entries(s)) {
      if (v === undefined || v === '') continue;
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

export function mediaSrc(path?: string): string {
  const v = (path || '').trim();
  if (!v) return '';
  return publicMediaUrl(v);
}

export function sectionBoxCss(box?: SectionBox): CSSProperties {
  if (!box) return {};
  const layers: string[] = [];
  if (clean(box.bgGradient)) layers.push(box.bgGradient!.trim());
  const img = mediaSrc(box.bgImage);
  if (img) {
    layers.push(
      `url("${img}") ${clean(box.bgPosition) || 'center'} / ${clean(box.bgSize) || 'cover'} ${
        clean(box.bgRepeat) || 'no-repeat'
      }`
    );
  }
  const css: CSSProperties = {};
  const cssVars = css as Record<string, unknown>;
  if (layers.length) css.background = layers.join(', ');
  if (clean(box.bgColor)) css.backgroundColor = box.bgColor!.trim();
  if (clean(box.textColor)) css.color = box.textColor!.trim();
  // Padding travels as variables so the stylesheet can swap in phone values.
  if (clean(box.paddingTop)) cssVars['--az-pt'] = box.paddingTop!.trim();
  if (clean(box.paddingBottom)) cssVars['--az-pb'] = box.paddingBottom!.trim();
  if (clean(box.paddingTopMobile)) cssVars['--az-pt-m'] = box.paddingTopMobile!.trim();
  if (clean(box.paddingBottomMobile)) cssVars['--az-pb-m'] = box.paddingBottomMobile!.trim();
  if (img && clean(box.bgPositionMobile)) cssVars['--az-bg-pos-m'] = box.bgPositionMobile!.trim();
  if (clean(box.borderTop)) css.borderTop = box.borderTop!.trim();
  if (clean(box.borderBottom)) css.borderBottom = box.borderBottom!.trim();
  return css;
}

export function orbCss(orb: Orb): CSSProperties {
  return {
    background: orb.color || undefined,
    width: orb.size || undefined,
    height: orb.size || undefined,
    top: clean(orb.top),
    right: clean(orb.right),
    bottom: clean(orb.bottom),
    left: clean(orb.left),
    opacity: clean(orb.opacity) as CSSProperties['opacity'],
    filter: clean(orb.blur) ? `blur(${orb.blur})` : undefined,
  };
}

export function imageCss(image?: ImageEl): { wrap: CSSProperties; img: CSSProperties } {
  if (!image) return { wrap: {}, img: {} };
  return {
    wrap: {
      borderRadius: clean(image.radius),
      aspectRatio: clean(image.aspectRatio),
      minHeight: clean(image.minHeight),
      width: clean(image.width),
      maxWidth: clean(image.maxWidth),
      border: clean(image.border),
      boxShadow: clean(image.shadow),
      background: clean(image.background),
    },
    img: {
      objectFit: clean(image.fit) as CSSProperties['objectFit'],
      objectPosition: clean(image.position),
    },
  };
}

/** Strip scripts / event handlers from admin-entered SVG markup. */
export function sanitizeSvg(markup: string): string {
  return markup
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|xlink:href)\s*=\s*("|')\s*javascript:[^"']*("|')/gi, '');
}

/** Normalize SVG input to a full <svg> element string. */
export function svgMarkup(svg?: string): string {
  const raw = (svg || '').trim();
  if (!raw) return '';
  const safe = sanitizeSvg(raw);
  if (/^<svg[\s>]/i.test(safe)) return safe;
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${safe}</svg>`;
}

/* ------------------------------------------------------------------ */
/* Icon presets (from the About Zigma design)                          */
/* ------------------------------------------------------------------ */

export const ABOUT_ICON_PRESETS: Array<{ key: string; label: string; svg: string }> = [
  { key: 'target', label: 'Target (mission)', svg: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>' },
  { key: 'eye', label: 'Eye (vision)', svg: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>' },
  { key: 'search', label: 'Search / assess', svg: '<circle cx="10" cy="10" r="6"/><path d="M14.8 14.8L20 20"/><path d="M7.5 10h5M10 7.5v5"/>' },
  { key: 'cube', label: 'Cube / design', svg: '<path d="M12 2l9 4.5-9 4.5-9-4.5L12 2z"/><path d="M3 6.5v11L12 22l9-4.5v-11"/><path d="M12 11v11"/>' },
  { key: 'toolbox', label: 'Toolbox / install', svg: '<rect x="3" y="9" width="18" height="10" rx="1.5"/><path d="M8 9V7a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M3 13.5h18"/>' },
  { key: 'clipboard', label: 'Clipboard / testing', svg: '<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 3h6a1 1 0 011 1v1.5H8V4a1 1 0 011-1z"/><path d="M8.5 13l2 2 4.5-4.5"/>' },
  { key: 'headset', label: 'Headset / support', svg: '<path d="M4 13a8 8 0 0116 0"/><rect x="2.5" y="13" width="4" height="6" rx="1.5"/><rect x="17.5" y="13" width="4" height="6" rx="1.5"/><path d="M20 19v1a2 2 0 01-2 2h-3"/>' },
  { key: 'bolt', label: 'Bolt / power', svg: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>' },
  { key: 'sun', label: 'Sun / solar', svg: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' },
  { key: 'battery', label: 'Battery / storage', svg: '<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2"/><path d="M6 10v4M10 10v4"/>' },
  { key: 'shield', label: 'Shield / protect', svg: '<path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>' },
  { key: 'users', label: 'Team', svg: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2A5 5 0 0121.5 19"/>' },
  { key: 'building', label: 'Building / facility', svg: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 21v-4h6v4"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2"/>' },
  { key: 'check', label: 'Check circle', svg: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 10"/>' },
];

/* ------------------------------------------------------------------ */
/* Defaults (mirror the approved About Zigma HTML)                     */
/* ------------------------------------------------------------------ */

const ORANGE = '#FF6B1A';
const CYAN = '#00D4FF';
const GREEN = '#12B76A';
const BLUE = '#3B82F6';
const PURPLE = '#A855F7';

export const ABOUT_HERO_IMAGE = '/assets/images/about-zigma-office-building.jpg';
export const ABOUT_FOUNDER_IMAGE = '/assets/images/founder-raghavendra-y.png';
export const ABOUT_STORY_IMAGE =
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1000&q=75';

export function defaultAboutHeroContent(): AboutHeroContent {
  return {
    section: {
      tone: 'dark',
      bgColor: '#0A1628',
      bgGradient:
        'linear-gradient(90deg, rgba(10,22,40,0.94) 0%, rgba(10,22,40,0.15) 100%), linear-gradient(180deg, rgba(24,51,95,0.9) 0%, rgba(10,22,40,0.95) 100%)',
      bgImage: ABOUT_HERO_IMAGE,
      bgPosition: 'center 30%',
      bgSize: 'cover',
      bgRepeat: 'no-repeat',
      pattern: 'grid-fade',
      patternColor: 'rgba(255,255,255,0.09)',
      patternSize: '64px',
      orbs: [
        { color: ORANGE, size: '480px', top: '-180px', right: '-120px', opacity: '0.22' },
        { color: CYAN, size: '360px', bottom: '-160px', left: '8%', opacity: '0.18' },
      ],
    },
    layout: { imageSide: 'right', columns: '', gap: '', alignItems: 'center', mobileImageFirst: false },
    breadcrumb: {
      items: [{ label: 'Home', href: '/' }, { label: 'About Us' }],
      separator: '/',
    },
    eyebrow: { text: 'WHO WE ARE', line: true, style: { color: CYAN } },
    title: {
      text: "Engineering India's power infrastructure, one accountable project at a time.",
    },
    lead: {
      text: 'For over 20 years, Zigma Technologies has designed, built, and maintained the solar, power continuity, storage, and EV charging systems that keep Indian industry running — as one team, not a chain of subcontractors.',
    },
    pills: {
      items: [
        { label: 'Quality Excellence' },
        { label: 'Service Reliability' },
        { label: 'Trust & Integrity' },
        { label: 'Advanced Solutions' },
        { label: 'Cost Efficiency' },
      ],
    },
    ctas: [],
    image: {
      src: ABOUT_HERO_IMAGE,
      alt: 'Zigma Technologies office building in Bengaluru',
      fit: 'cover',
      overlay: 'linear-gradient(180deg,rgba(10,22,40,0) 40%,rgba(10,22,40,0.55) 100%)',
    },
    floatCard: {
      position: 'bottom-left',
      number: { text: '20+' },
      label: { text: 'Years Engineering\nPower Infrastructure' },
    },
  };
}

export function defaultServicesMarqueeContent(): ServicesMarqueeContent {
  return {
    section: { tone: 'dark' },
    items: [
      'UPS Sales & Services',
      'UPS AMC Services',
      'Solar EPC Solutions',
      'Solar AMC & O&M Services',
      'Industrial Power Solutions',
      'Industrial & Power Electronics',
      'Electrical Engineering',
      'Engineering Design & Outsourcing',
      'Battery Energy Storage Systems (BESS)',
      'Energy Auditing & Optimization',
      'EV Charging Infrastructure',
      'EV Charging System Services',
      'Operation and Maintenance (O&M)',
    ].map((label) => ({ label })),
    separator: { type: 'dot', color: ORANGE, size: '6px' },
    speedSeconds: 38,
    direction: 'ltr',
    pauseOnHover: true,
  };
}

export function defaultStoryContent(): StoryContent {
  return {
    section: { tone: 'light' },
    layout: { imageSide: 'left', columns: '', gap: '', alignItems: 'center', mobileImageFirst: true },
    image: {
      src: ABOUT_STORY_IMAGE,
      alt: 'Engineers reviewing power infrastructure plans on site',
      fit: 'cover',
    },
    eyebrow: { text: 'OUR STORY', line: true, style: { color: ORANGE } },
    title: {
      text: "Founded on one idea: power infrastructure shouldn't be fragmented.",
    },
    paragraphs: [
      {
        text: 'Zigma Technologies was founded in 2006 with a focus on industrial electrical and power backup services. What started as a UPS sales and service operation grew, project by project, into a full-stack power and energy engineering company — because our clients kept asking for the same thing: one accountable partner instead of five different vendors for generation, protection, storage, and maintenance.',
      },
      {
        text: "Today, that philosophy shapes everything we build. Whether it's a rooftop solar EPC project, a hospital's critical UPS backbone, or a utility-scale BESS deployment, the same engineering team that designs the system is accountable for installing, commissioning, and maintaining it.",
      },
    ],
    pills: { hidden: true, items: [] },
    ctas: [],
    reveal: true,
  };
}

export function defaultPurposeContent(): PurposeContent {
  return {
    section: {
      tone: 'dark',
      orbs: [
        { color: ORANGE, size: '440px', top: '-160px', left: '-120px' },
        { color: CYAN, size: '400px', bottom: '-180px', right: '-100px' },
      ],
    },
    header: {
      align: 'center',
      eyebrow: { text: 'PURPOSE', line: true, style: { color: GREEN } },
      title: { text: 'What drives every project we take on' },
      subtitle: { text: '' },
    },
    cards: [
      {
        watermark: 'M',
        accentColor: ORANGE,
        accentBar: `linear-gradient(90deg,${ORANGE},#FFC93C)`,
        icon: { svg: ABOUT_ICON_PRESETS[0].svg },
        tag: { text: '01 — OUR MISSION' },
        title: { text: 'Deliver dependable power, end to end.', tag: 'h3' },
        body: {
          text: 'To engineer, install, and maintain reliable, efficient, and sustainable power infrastructure for Indian industry — bringing solar generation, power continuity, energy storage, and technical expertise under one accountable roof, backed by a 24×7 service commitment.',
        },
      },
      {
        watermark: 'V',
        accentColor: CYAN,
        accentBar: `linear-gradient(90deg,${CYAN},${BLUE})`,
        icon: { svg: ABOUT_ICON_PRESETS[1].svg },
        tag: { text: '02 — OUR VISION' },
        title: { text: "India's most trusted power engineering partner.", tag: 'h3' },
        body: {
          text: "To be the partner industry turns to first for energy infrastructure — known for engineering depth, certified quality, and a service response that treats every client's uptime as our own responsibility.",
        },
      },
    ],
    cardStyle: { hoverLift: true },
    divider: { symbol: '&' },
  };
}

export function defaultFounderNoteContent(): FounderNoteContent {
  return {
    section: { tone: 'light' },
    header: {
      align: 'center',
      eyebrow: { text: 'A NOTE FROM OUR FOUNDER', line: true, style: { color: ORANGE } },
      title: { text: '' },
      subtitle: { text: '' },
    },
    layout: {
      photoSide: 'left',
      photoWidth: '',
      gap: '',
      maxWidth: '',
      alignItems: 'start',
      mobilePhotoFirst: true,
      photoWidthMobile: '',
    },
    photo: {
      src: ABOUT_FOUNDER_IMAGE,
      alt: 'Raghavendra Y, Founder and CEO of Zigma Technologies',
      fit: 'cover',
      position: 'center top',
    },
    heading: { text: 'Twenty years of showing up for every commitment we make.', tag: 'h3' },
    quote: {
      text: 'Twenty years ago, Zigma Technologies began with a simple purpose: to provide dependable power solutions and stand behind every commitment we make.',
    },
    paragraphs: [
      {
        text: 'Today, that same purpose continues to guide us as we deliver solutions across UPS systems, Solar EPC, Battery Energy Storage, EV Charging, Engineering Services, and AMC & O&M through a strong team of 150+ certified engineers.',
      },
      {
        text: 'Our growth has been built on the trust of our customers, the support of our partners, and the dedication of our people. Many relationships that began with a single project have grown into long-term partnerships based on quality, accountability, and reliability.',
      },
      {
        text: 'As we move forward, our focus remains on strengthening our capabilities, embracing new technologies, and delivering future-ready solutions across India. After twenty years, I am proud not only of how far Zigma Technologies has come, but that the promise we started with still remains unchanged.',
      },
    ],
    signature: {
      divider: true,
      name: { text: 'Raghavendra Y' },
      role: { text: 'Founder & CEO, Zigma Technologies' },
    },
    stats: {
      divider: true,
      hideTextOnMobile: true,
      items: [
        { label: 'Since 2006', text: "Twenty years on, the founding purpose still hasn't changed." },
        { label: '150+ Engineers', text: 'Every project delivered by our certified team.' },
        { label: '6 Capabilities', text: 'Solar, UPS, BESS, EV Charging, Design, and AMC.' },
        { label: 'The Promise', text: 'Accountability starts where commissioning ends.' },
      ],
    },
  };
}

export function defaultFacilitiesContent(): FacilitiesContent {
  const icon = (key: string) => ({ svg: ABOUT_ICON_PRESETS.find((p) => p.key === key)?.svg || '' });
  return {
    section: {
      tone: 'light',
      bgColor: '#CFE3F5',
      pattern: 'grid',
      patternColor: 'rgba(255,255,255,0.26)',
      patternSize: '32px',
    },
    header: {
      align: 'left',
      eyebrow: { text: 'HOW WE WORK', line: true, style: { color: GREEN } },
      title: { text: 'A single team, from first site visit to AMC' },
      subtitle: {
        text: 'Every project runs through the same five stages — no handoffs to third-party subcontractors along the way.',
      },
    },
    steps: [
      {
        tag: 'STEP 01',
        title: 'Discover & Assess',
        body: 'Site survey, load study, and energy audit to understand exactly what your facility needs before we design anything.',
        color: ORANGE,
        icon: icon('search'),
      },
      {
        tag: 'STEP 02',
        title: 'Design & Engineering',
        body: 'Load studies, system sizing, single-line diagrams, and detailed engineering — done in-house by our own electrical engineers.',
        color: GREEN,
        icon: icon('cube'),
      },
      {
        tag: 'STEP 03',
        title: 'Procurement & Installation',
        body: 'Certified equipment sourced from trusted manufacturing partners, installed by our own trained field teams.',
        color: CYAN,
        icon: icon('toolbox'),
      },
      {
        tag: 'STEP 04',
        title: 'Commissioning & Testing',
        body: 'Full system testing, safety sign-off, and performance verification before a project is handed over.',
        color: BLUE,
        icon: icon('clipboard'),
      },
      {
        tag: 'STEP 05',
        title: 'AMC & 24×7 Support',
        body: 'Structured Annual Maintenance Contracts and an emergency response line, so uptime stays our responsibility.',
        color: PURPLE,
        icon: icon('headset'),
      },
    ],
    startSide: 'left',
    animateCards: true,
    track: { animate: true },
    cardStyle: {},
    iconStyle: {},
  };
}

export function defaultAboutSectionContent(type: string): Record<string, unknown> | null {
  switch (type) {
    case 'about_hero':
      return defaultAboutHeroContent();
    case 'services_marquee':
      return defaultServicesMarqueeContent();
    case 'story':
      return defaultStoryContent();
    case 'purpose':
      return defaultPurposeContent();
    case 'founder_note':
      return defaultFounderNoteContent();
    case 'facilities':
      return defaultFacilitiesContent();
    default:
      return null;
  }
}

/**
 * Fill any missing top-level keys from defaults so partially saved or
 * hand-edited JSON never crashes the renderer / editor.
 */
export function withAboutDefaults<T extends object>(type: AboutSectionType, raw: unknown): T {
  const base = defaultAboutSectionContent(type) as Record<string, unknown>;
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
  return upgradeAboutTypography(type, out) as T;
}

/** Tags the original seed wrote on role headings; stored copies of these follow Site Settings instead. */
const LEGACY_SEED_TAGS: Partial<Record<AboutSectionType, { path: 'title' | 'header.title'; tag: HeadingTag }>> = {
  about_hero: { path: 'title', tag: 'h1' },
  story: { path: 'title', tag: 'h2' },
  purpose: { path: 'header.title', tag: 'h2' },
  founder_note: { path: 'header.title', tag: 'h2' },
  facilities: { path: 'header.title', tag: 'h2' },
};

function upgradeAboutTypography(type: AboutSectionType, out: Record<string, unknown>): Record<string, unknown> {
  if (out.typographyVersion === ABOUT_TYPOGRAPHY_VERSION) return out;
  const legacy = LEGACY_SEED_TAGS[type];
  if (legacy) {
    const dropSeedTag = (el: unknown): unknown => {
      if (!el || typeof el !== 'object' || (el as TextEl).tag !== legacy.tag) return el;
      const rest = { ...(el as TextEl) };
      delete rest.tag;
      return rest;
    };
    if (legacy.path === 'title') {
      out.title = dropSeedTag(out.title);
    } else if (out.header && typeof out.header === 'object') {
      const header = out.header as Record<string, unknown>;
      out.header = { ...header, title: dropSeedTag(header.title) };
    }
  }
  out.typographyVersion = ABOUT_TYPOGRAPHY_VERSION;
  return out;
}

/** Accept legacy string arrays for link-ish lists. */
export function normalizeLinkItems(value: unknown): LinkItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => {
      if (typeof v === 'string') return { label: v };
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        return { label: String(o.label ?? ''), href: o.href ? String(o.href) : undefined };
      }
      return null;
    })
    .filter((v): v is LinkItem => Boolean(v && v.label));
}

export const ABOUT_ZIGMA_SEED_SECTIONS: Array<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
}> = [
  { type: 'about_hero', section_key: 'top', title: 'Page hero', content_json: defaultAboutHeroContent() },
  {
    type: 'services_marquee',
    section_key: 'services-marquee',
    title: 'Services marquee',
    content_json: defaultServicesMarqueeContent(),
  },
  { type: 'story', section_key: 'story', title: 'Our story', content_json: defaultStoryContent() },
  { type: 'purpose', section_key: 'purpose', title: 'Purpose (mission & vision)', content_json: defaultPurposeContent() },
  {
    type: 'founder_note',
    section_key: 'founder-note',
    title: "Founder's note",
    content_json: defaultFounderNoteContent(),
  },
  {
    type: 'facilities',
    section_key: 'facilities',
    title: 'How we work (facilities)',
    content_json: defaultFacilitiesContent(),
  },
  {
    type: 'cta',
    section_key: 'contact',
    title: 'CTA band',
    content_json: {
      title: 'Want to work with a team that stays accountable after commissioning?',
      body: 'Talk to our engineers about your solar, power continuity, storage, or EV charging project.',
      primaryCta: 'Send an Inquiry →',
      primaryHref: '/contact',
      secondaryCta: 'Call +91 95901 37666',
      secondaryHref: 'tel:+919590137666',
    },
  },
];
