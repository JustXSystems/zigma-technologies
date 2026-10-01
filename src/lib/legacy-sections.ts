import type { HeroHeight } from '@/lib/hero-height';
import type { HeroPlacement } from '@/lib/hero-placement';
import {
  ABOUT_ICON_PRESETS,
  ABOUT_TYPOGRAPHY_VERSION,
  type CtaButton,
  type ElementStyle,
  type EyebrowEl,
  type FloatCardPosition,
  type IconEl,
  type ImageEl,
  type LinkItem,
  type PillsEl,
  type SectionBox,
  type SplitLayout,
  type TextEl,
} from '@/lib/about-sections';
import type { LifeColumns, LifeCtaContent, LifeHighlight, LifeMediaItem, LifeSectionHeader } from '@/lib/life-sections';

/**
 * Fully configurable "20 Years of Legacy" section family (page /legacy20yrs):
 * legacy_hero, legacy_stats, legacy_marquee, legacy_story, legacy_journey,
 * legacy_values, legacy_caps, legacy_next, legacy_cta.
 *
 * Built on the About / Life element primitives. Empty style fields fall back to the scoped
 * `.lgy-*` CSS defaults, which mirror the approved legacy20yrs HTML design. Colors default to
 * theme tokens (var(--orange)…) so Theme Studio changes flow through; headings / eyebrows follow
 * Site Settings → Public typography; section padding follows the theme --section-pad token.
 */

export const LEGACY_SECTION_TYPES = [
  'legacy_hero',
  'legacy_stats',
  'legacy_marquee',
  'legacy_story',
  'legacy_journey',
  'legacy_values',
  'legacy_caps',
  'legacy_next',
  'legacy_cta',
] as const;
export type LegacySectionType = (typeof LEGACY_SECTION_TYPES)[number];

export function isLegacySectionType(type: string): type is LegacySectionType {
  return (LEGACY_SECTION_TYPES as readonly string[]).includes(type);
}

/* ------------------------------------------------------------------ */
/* Shared shapes                                                       */
/* ------------------------------------------------------------------ */

export type LegacyBgMotion = 'none' | 'kenburns' | 'zoom' | 'pan' | 'drift';

/** Background image / video layer (one item = still, several = cross-fading slideshow). */
export type LegacyBgMedia = {
  hidden?: boolean;
  items: LifeMediaItem[];
  /** Phone-only slides (≤760px); empty = reuse `items` */
  mobileItems?: LifeMediaItem[];
  intervalSeconds?: number;
  motion?: LegacyBgMotion;
  /** Length of one motion cycle */
  motionSeconds?: number;
  /** object-position of every slide */
  position?: string;
  /** object-position on phones (≤760px) */
  positionMobile?: string;
  /** Gradient drawn over the media */
  overlay?: string;
  /** Slide indicators (hero) */
  showDots?: boolean;
  showCount?: boolean;
  dotColor?: string;
};

export type LegacySectionHeader = LifeSectionHeader & {
  /** Animated accent bar under the heading */
  bar?: { hidden?: boolean; gradient?: string; width?: string; height?: string };
};

export type LegacyCardStyle = {
  background?: string;
  hoverBackground?: string;
  border?: string;
  radius?: string;
  padding?: string;
  shadow?: string;
  hoverLift?: boolean;
};

/* ------------------------------------------------------------------ */
/* Section content shapes                                              */
/* ------------------------------------------------------------------ */

export type LegacyRingBadge = {
  hidden?: boolean;
  value: string;
  prefix?: string;
  suffix?: string;
  label: TextEl;
  span: TextEl;
  countUp?: boolean;
  countDurationMs?: number;
  animateRing?: boolean;
  ringFrom?: string;
  ringTo?: string;
  trackColor?: string;
  ringWidth?: string;
  size?: string;
  sizeMobile?: string;
  background?: string;
  border?: string;
  radius?: string;
  padding?: string;
  blur?: boolean;
  numberStyle?: ElementStyle;
  suffixColor?: string;
};

export type LegacyHeroContent = {
  section: SectionBox;
  heroHeight?: HeroHeight;
  placement?: HeroPlacement;
  background: LegacyBgMedia;
  layout: {
    badgeSide: 'left' | 'right';
    columns?: string;
    gap?: string;
    alignItems?: 'start' | 'center' | 'end';
    /** Stacked (tablet / phone): badge above the copy */
    mobileBadgeFirst?: boolean;
  };
  /** Fade-up entrance for breadcrumb, heading, lead, pills and badge */
  entrance?: boolean;
  /** Page-scroll progress bar pinned to the top of the viewport */
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
  highlight?: LifeHighlight;
  lead: TextEl;
  pills: PillsEl;
  ctas: CtaButton[];
  badge: LegacyRingBadge;
};

export type LegacyStatItem = {
  value: string;
  prefix?: string;
  suffix?: string;
  label: string;
  icon?: IconEl;
};

export type LegacyStatsContent = {
  section: SectionBox;
  items: LegacyStatItem[];
  columns: LifeColumns;
  gap?: string;
  align?: 'left' | 'center' | 'right';
  animateCount: boolean;
  countDurationMs?: number;
  hoverLift?: boolean;
  dividers?: boolean;
  dividerColor?: string;
  numberStyle?: ElementStyle;
  suffixColor?: string;
  labelStyle?: ElementStyle;
  iconStyle: { size?: string; color?: string };
};

export type LegacyMarqueeSeparator = 'symbol' | 'dot' | 'icon' | 'none';

export type LegacyMarqueeContent = {
  section: SectionBox;
  items: LinkItem[];
  itemStyle?: ElementStyle;
  hoverColor?: string;
  gap?: string;
  separator: {
    type: LegacyMarqueeSeparator;
    symbol?: string;
    color?: string;
    size?: string;
    icon?: IconEl;
  };
  speedSeconds: number;
  direction: 'ltr' | 'rtl';
  pauseOnHover: boolean;
  fadeEdges?: boolean;
};

/** One positioned picture in the story collage; several media items cross-fade. */
export type LegacyCollageFrame = {
  hidden?: boolean;
  items: LifeMediaItem[];
  intervalSeconds?: number;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  width?: string;
  height?: string;
  radius?: string;
  border?: string;
  shadow?: string;
  fit?: ImageEl['fit'];
  position?: string;
};

export type LegacyKeepItem = { title: string; body: string; color?: string };

export type LegacyStoryContent = {
  section: SectionBox;
  layout: SplitLayout;
  collage: {
    hidden?: boolean;
    minHeight?: string;
    minHeightMobile?: string;
    zoomOnReveal?: boolean;
    frames: LegacyCollageFrame[];
  };
  since: {
    hidden?: boolean;
    number: TextEl;
    label: TextEl;
    position: FloatCardPosition;
    background?: string;
    border?: string;
    radius?: string;
    float?: boolean;
  };
  eyebrow: EyebrowEl;
  title: TextEl;
  highlight?: LifeHighlight;
  paragraphs: TextEl[];
  paragraphStyle?: ElementStyle;
  keep: {
    hidden?: boolean;
    items: LegacyKeepItem[];
    dotColor?: string;
    background?: string;
    border?: string;
    radius?: string;
    titleStyle?: ElementStyle;
    bodyStyle?: ElementStyle;
  };
  ctas: CtaButton[];
  reveal?: boolean;
};

export type LegacyMilestone = {
  hidden?: boolean;
  from: string;
  to?: string;
  title: string;
  body: string;
  tags: string[];
  /** "Today" style: blue card and dot */
  highlight?: boolean;
  /** Accent (year text, active dot ring); empty = section default */
  color?: string;
  /** Optional images / videos at the top of the card (several cross-fade) */
  media?: LifeMediaItem[];
};

export type LegacyJourneyContent = {
  section: SectionBox;
  header: LegacySectionHeader;
  milestones: LegacyMilestone[];
  perView: { desktop?: number; mobile?: number };
  autoplay: boolean;
  dwellSeconds?: number;
  pauseOnHover?: boolean;
  stage: {
    height?: string;
    heightMobile?: string;
    background?: string;
    border?: string;
    radius?: string;
    shadow?: string;
    grid?: boolean;
    fadeEdges?: boolean;
    lineColor?: string;
    glowColor?: string;
    maxSpacing?: number;
  };
  dot: {
    size?: string;
    background?: string;
    border?: string;
    color?: string;
    activeColor?: string;
    nowColor?: string;
  };
  card: {
    maxWidth?: number;
    background?: string;
    border?: string;
    radius?: string;
    padding?: string;
    shadow?: string;
    nowBackground?: string;
    stemColor?: string;
    mediaHeight?: string;
  };
  yearStyle?: ElementStyle;
  titleStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
  tagStyle?: ElementStyle;
  controls: { hidden?: boolean; pips?: boolean; color?: string; activeColor?: string; rangeStyle?: ElementStyle };
};

export type LegacyValueCard = {
  title: TextEl;
  body: TextEl;
  color: string;
  icon: IconEl;
  image?: ImageEl;
  link?: { label: string; href: string };
};

export type LegacyValuesContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  header: LegacySectionHeader;
  cards: LegacyValueCard[];
  columns: LifeColumns;
  gap?: string;
  reveal?: boolean;
  cardStyle: LegacyCardStyle & { glass?: boolean; topBorderWidth?: string };
  iconStyle: { boxSize?: string; size?: string; radius?: string; background?: string; strokeWidth?: string };
  titleStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
  linkStyle?: ElementStyle;
};

export type LegacyCapCard = {
  num: string;
  title: TextEl;
  body: TextEl;
  color: string;
  href?: string;
  linkLabel?: string;
  newTab?: boolean;
  icon?: IconEl;
  image?: ImageEl;
};

export type LegacyCapsContent = {
  section: SectionBox;
  header: LegacySectionHeader;
  cards: LegacyCapCard[];
  columns: LifeColumns;
  gap?: string;
  reveal?: boolean;
  cardStyle: LegacyCardStyle & { topBar?: boolean; barHeight?: string };
  numStyle?: ElementStyle;
  titleStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
  linkStyle?: ElementStyle;
};

export type LegacyNextItem = { key: string; title: string; body: string; color?: string; icon?: IconEl };

export type LegacyNextContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  layout: { listSide: 'left' | 'right'; columns?: string; gap?: string; alignItems?: 'start' | 'center' | 'end' };
  eyebrow: EyebrowEl;
  title: TextEl;
  highlight?: LifeHighlight;
  paragraphs: TextEl[];
  paragraphStyle?: ElementStyle;
  ctas: CtaButton[];
  items: LegacyNextItem[];
  reveal?: boolean;
  itemStyle: LegacyCardStyle & { hoverSlide?: boolean };
  keyStyle: { size?: string; background?: string; border?: string; color?: string; radius?: string; glow?: boolean };
  titleStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
};

export type LegacyCtaContent = LifeCtaContent;

/* ------------------------------------------------------------------ */
/* Icon presets (legacy20yrs design + shared About outline icons)      */
/* ------------------------------------------------------------------ */

export const LEGACY_ICON_PRESETS: Array<{ key: string; label: string; svg: string }> = [
  { key: 'legacy-bolt', label: 'Bolt (reliability)', svg: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>' },
  {
    key: 'legacy-people',
    label: 'People (relationships)',
    svg: '<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.6"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14.3c3 0 6 1.6 6 5.7"/>',
  },
  {
    key: 'legacy-wrench',
    label: 'Wrench (engineering depth)',
    svg: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  },
  { key: 'legacy-shield', label: 'Shield check (safety & quality)', svg: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>' },
  { key: 'legacy-sparkle', label: 'Sparkle (marquee separator)', svg: '<path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>' },
];

export const LEGACY_ALL_ICON_PRESETS = [...LEGACY_ICON_PRESETS, ...ABOUT_ICON_PRESETS];

const legacyIcon = (key: string) => LEGACY_ALL_ICON_PRESETS.find((p) => p.key === key)?.svg || '';

/* ------------------------------------------------------------------ */
/* Defaults (mirror the approved legacy20yrs HTML)                     */
/* ------------------------------------------------------------------ */

const ORANGE = 'var(--orange)';
const CYAN = 'var(--cyan)';
const GREEN = 'var(--green)';
const BLUE = 'var(--blue)';
const PURPLE = 'var(--purple)';
const YELLOW = 'var(--yellow)';
const PINK = '#EC4899';
const AMBER = '#F59E0B';

const US = (id: string, w = 1920) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70&w=${w}`;

export const LEGACY_IMAGES = {
  rooftop: US('1745187946672-2c1d8cf26a2b'),
  installers: US('1624397640148-949b1732bb0a'),
  electrician: US('1621905251189-08b45d6a269e'),
  panelTest: US('1758101755915-462eddc23f57', 1000),
  installersSmall: US('1624397640148-949b1732bb0a', 1000),
  next: US('1660330589693-99889d60181e', 1600),
};

const header = (eyebrow: string, color: string, title: string, subtitle: string): LegacySectionHeader => ({
  align: 'center',
  eyebrow: { text: eyebrow, line: true, style: { color } },
  title: { text: title },
  subtitle: { text: subtitle },
  bar: {},
});

export function defaultLegacyHeroContent(): LegacyHeroContent {
  return {
    section: {
      tone: 'dark',
      bgColor: '#0A1628',
      bgGradient: 'linear-gradient(135deg,var(--navy-950) 0%,#123058 60%,#0F4C5C 100%)',
      pattern: 'grid-fade',
      patternColor: 'rgba(255,255,255,0.07)',
      patternSize: '64px',
    },
    background: {
      items: [
        { src: LEGACY_IMAGES.rooftop, title: 'Aerial view of rooftop solar panels installed by Zigma' },
        { src: LEGACY_IMAGES.installers, title: 'Technicians installing solar panels' },
        { src: LEGACY_IMAGES.electrician, title: 'Electrician in a hard hat at work' },
      ],
      intervalSeconds: 5.5,
      motion: 'kenburns',
      motionSeconds: 8,
      overlay: 'linear-gradient(105deg,rgba(10,22,40,0.9) 0%,rgba(10,22,40,0.66) 48%,rgba(15,76,92,0.25) 100%)',
      showDots: true,
      showCount: true,
    },
    layout: { badgeSide: 'right', columns: '', gap: '', alignItems: 'center', mobileBadgeFirst: false },
    entrance: true,
    scrollBar: {},
    breadcrumb: {
      items: [{ label: 'Home', href: '/' }, { label: 'Who We Are', href: '/about-zigma' }, { label: '20 Years of Legacy' }],
      separator: '/',
    },
    eyebrow: { text: '', line: true, style: { color: CYAN } },
    title: { text: 'Two decades of keeping India powered and protected.' },
    highlight: { text: 'powered and protected.', gradient: `linear-gradient(90deg,${YELLOW},${ORANGE})`, animate: false },
    lead: {
      text: 'Since 2006, Zigma Technologies has grown from a focused power-backup team into a full energy partner for Indian industry, one project and one relationship at a time.',
    },
    pills: {
      items: [
        { label: 'Founded 2006' },
        { label: '250+ skilled people' },
        { label: '5,000+ success stories' },
        { label: '3,000+ happy customers' },
      ],
    },
    ctas: [],
    badge: {
      value: '20',
      suffix: '+',
      label: { text: 'YEARS OF LEGACY' },
      span: { text: '2006 → 2026' },
      countUp: true,
      countDurationMs: 1800,
      animateRing: true,
      ringFrom: YELLOW,
      ringTo: ORANGE,
      suffixColor: ORANGE,
      blur: true,
    },
  };
}

export function defaultLegacyStatsContent(): LegacyStatsContent {
  return {
    section: { tone: 'dark', bgColor: 'var(--navy-900)' },
    items: [
      { value: '20', suffix: '+', label: 'Years of Experience' },
      { value: '250', suffix: '+', label: 'Skilled Employees' },
      { value: '5000', suffix: '+', label: 'Success Stories' },
      { value: '3000', suffix: '+', label: 'Happy Customers' },
    ],
    columns: { desktop: 4, tablet: 4, mobile: 2 },
    align: 'center',
    animateCount: true,
    countDurationMs: 1800,
    hoverLift: true,
    suffixColor: ORANGE,
    iconStyle: {},
  };
}

export function defaultLegacyMarqueeContent(): LegacyMarqueeContent {
  return {
    section: { tone: 'dark', bgColor: '#0049A3' },
    items: ['Solar EPC', 'Industrial UPS', 'Battery Solutions', 'BESS', 'EV Charging', '24×7 AMC', 'Design & Engineering'].map(
      (label) => ({ label })
    ),
    separator: { type: 'symbol', symbol: '✦', color: '#8CC0FF' },
    speedSeconds: 32,
    direction: 'rtl',
    pauseOnHover: false,
    fadeEdges: false,
  };
}

export function defaultLegacyStoryContent(): LegacyStoryContent {
  return {
    section: { tone: 'light', bgColor: 'var(--white)' },
    layout: { imageSide: 'left', columns: '', gap: '', alignItems: 'center', mobileImageFirst: true },
    collage: {
      zoomOnReveal: true,
      frames: [
        {
          items: [{ src: LEGACY_IMAGES.panelTest, title: 'Engineer testing an electrical panel' }],
          intervalSeconds: 4,
          left: '0',
          top: '0',
          width: '68%',
          height: '72%',
        },
        {
          items: [{ src: LEGACY_IMAGES.installersSmall, title: 'Technicians installing solar panels' }],
          intervalSeconds: 4,
          right: '0',
          bottom: '0',
          width: '56%',
          height: '52%',
          border: '6px solid #FFFFFF',
        },
      ],
    },
    since: {
      number: { text: '2006' },
      label: { text: 'WHERE IT STARTED' },
      position: 'bottom-left',
      float: true,
    },
    eyebrow: { text: 'OUR STORY', line: true, style: { color: ORANGE } },
    title: { text: 'Built on a simple promise: the power stays on' },
    paragraphs: [
      {
        text: 'Zigma began in 2006 with a clear focus on reliable power for businesses that cannot afford downtime. Over twenty years that focus has widened from backup power to generation, storage and charging, but the promise has not changed.',
      },
      {
        text: 'Today more than 250 engineers, technicians and support staff design, install and look after systems for industry across India, and many of our customers have stayed with us for years.',
      },
    ],
    keep: {
      items: [
        { title: 'Engineering first', body: 'We size and design for the real load, not the brochure.' },
        { title: 'Honest timelines', body: 'We say what is possible and then we deliver it.' },
        { title: 'Service beyond the sale', body: 'Commissioning is the start of the relationship, not the end.' },
      ],
      dotColor: ORANGE,
    },
    ctas: [],
    reveal: true,
  };
}

const ms = (from: string, to: string, title: string, body: string, tags: string[], highlight?: boolean): LegacyMilestone => ({
  from,
  to,
  title,
  body,
  tags,
  ...(highlight ? { highlight } : {}),
});

export function defaultLegacyMilestone(): LegacyMilestone {
  return { from: '2027', to: '', title: 'New milestone', body: 'Describe what happened.', tags: [] };
}

export function defaultLegacyJourneyContent(): LegacyJourneyContent {
  return {
    section: { tone: 'light', bgColor: 'var(--gray-100)' },
    header: header('OUR JOURNEY', ORANGE, 'Twenty years, twelve chapters', 'Watch the years roll by. Each set of milestones opens as it reaches the centre.'),
    milestones: [
      ms('2006', '2007', 'Zigma is founded', 'We start with one focus: dependable power backup for Indian businesses, with industrial UPS supply, installation and service.', ['Industrial UPS', 'Service']),
      ms('2008', '2009', 'First customers become references', 'Repeat orders and word of mouth shape early growth as we prove ourselves on site, project after project.', ['Referrals', 'Repeat business']),
      ms('2010', '2011', 'Service becomes our backbone', 'Preventive maintenance contracts and round-the-clock support teams are set up so customers are never left waiting.', ['AMC', '24×7 support']),
      ms('2012', '2013', 'Batteries and power products', 'Battery solutions and wider power-conditioning products join our UPS range.', ['Batteries', 'Power products']),
      ms('2014', '2015', 'Engineering moves in-house', 'Electrical design and project engineering come in-house so systems are planned end to end.', ['Design', 'Engineering']),
      ms('2016', '2017', 'The solar chapter begins', 'Solar EPC opens a new direction: from protecting power to generating it, on rooftops and larger sites.', ['Solar EPC']),
      ms('2018', '2019', 'Growing and training the team', 'We recruit and train more engineers and field technicians as project volumes increase.', ['Training', 'Field teams']),
      ms('2020', '2021', 'Quality and safety systems mature', 'Documented procedures, testing records and site-safety practices become part of every project.', ['Quality', 'Safety']),
      ms('2022', '', 'Solar O&M and larger installations', 'Operations and maintenance for solar plants, alongside larger and more complex installations.', ['Solar O&M', 'Large projects']),
      ms('2023', '', 'Energy storage arrives', 'Battery energy storage and hybrid solar plus storage systems broaden what we can offer.', ['BESS', 'Hybrid systems']),
      ms('2024', '2025', 'EV charging and smart monitoring', 'EV charging infrastructure and remote monitoring bring digital visibility to the systems we install.', ['EV charging', 'Monitoring']),
      ms('2026', '', 'Twenty years, one promise', '250+ people, 5,000+ success stories and 3,000+ happy customers, still built on reliable power.', ['Generate', 'Protect', 'Maintain'], true),
    ],
    perView: { desktop: 3, mobile: 1 },
    autoplay: true,
    dwellSeconds: 5.6,
    pauseOnHover: true,
    stage: { grid: true, fadeEdges: true },
    dot: {},
    card: {},
    controls: { pips: true },
  };
}

export function defaultLegacyValuesContent(): LegacyValuesContent {
  const card = (color: string, iconKey: string, title: string, body: string, link?: LegacyValueCard['link']): LegacyValueCard => ({
    color,
    icon: { svg: legacyIcon(iconKey) },
    title: { text: title, tag: 'h4' },
    body: { text: body },
    ...(link ? { link } : {}),
  });
  return {
    section: { tone: 'dark', bgColor: 'var(--navy-950)' },
    background: {
      items: [{ src: LEGACY_IMAGES.electrician, title: 'Electrician in a hard hat at work' }],
      motion: 'pan',
      motionSeconds: 32,
      intervalSeconds: 6,
      overlay: 'linear-gradient(180deg,rgba(10,22,40,0.7),rgba(10,22,40,0.52) 50%,rgba(10,22,40,0.78))',
    },
    header: header('WHAT TWENTY YEARS TAUGHT US', GREEN, 'Lessons we carry into every project', 'The habits that kept customers with us for two decades.'),
    cards: [
      card(ORANGE, 'legacy-bolt', 'Reliability', 'Systems are designed, tested and serviced so they perform when the grid does not.'),
      card(GREEN, 'legacy-people', 'Relationships', 'We stay in touch long after handover, which is why many customers come back.'),
      card(BLUE, 'legacy-wrench', 'Engineering depth', 'Twenty years of site experience means fewer surprises and better first-time designs.'),
      card(PURPLE, 'legacy-shield', 'Safety and quality', 'Careful, repeatable practices protect people and protect the system.', {
        label: 'See how we work →',
        href: '/certifications#industry-certs',
      }),
    ],
    columns: { desktop: 4, tablet: 2, mobile: 1 },
    reveal: true,
    cardStyle: { glass: true, hoverLift: true },
    iconStyle: {},
  };
}

export function defaultLegacyCapsContent(): LegacyCapsContent {
  const cap = (num: string, color: string, title: string, body: string, href: string): LegacyCapCard => ({
    num,
    color,
    title: { text: title, tag: 'h4' },
    body: { text: body },
    href,
    linkLabel: 'Explore →',
  });
  return {
    section: { tone: 'light', bgColor: 'var(--gray-100)' },
    header: header('WHAT WE DO TODAY', ORANGE, 'One partner across the energy chain', 'Generate it, store it, protect it and keep it running.'),
    cards: [
      cap('01', ORANGE, 'Solar EPC', 'Design, supply, installation and O&M of solar power plants.', '/#generate'),
      cap('02', BLUE, 'Industrial UPS', 'Clean, uninterrupted power for critical loads, with service support.', '/#protect'),
      cap('03', GREEN, 'Battery storage', 'Battery solutions and BESS for peak shaving and hybrid systems.', '/#bess'),
      cap('04', PURPLE, 'EV charging', 'Charging infrastructure, including smart and solar-backed charging.', '/#ev-charging'),
      cap('05', PINK, 'AMC and support', 'Preventive maintenance and 24×7 emergency support.', '/#maintain'),
      cap('06', AMBER, 'Design and engineering', 'Electrical design and project support from concept to commissioning.', '/#engineering-design'),
    ],
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    reveal: true,
    cardStyle: { hoverLift: true, topBar: true },
  };
}

export function defaultLegacyNextContent(): LegacyNextContent {
  return {
    section: { tone: 'dark', bgColor: 'var(--navy-950)' },
    background: {
      items: [{ src: LEGACY_IMAGES.next, title: 'Clean energy future' }],
      motion: 'drift',
      motionSeconds: 28,
      intervalSeconds: 6,
      overlay: 'linear-gradient(rgba(10,22,40,0.9),rgba(10,22,40,0.93))',
    },
    layout: { listSide: 'right', columns: '', gap: '', alignItems: 'center' },
    eyebrow: { text: 'THE NEXT TWENTY YEARS', line: true, style: { color: CYAN } },
    title: { text: 'Same promise, bigger energy future' },
    paragraphs: [
      {
        text: 'As India moves to cleaner and smarter power, we plan to keep doing what got us here: solid engineering, careful work and service that lasts.',
      },
    ],
    ctas: [{ label: 'Our quality and safety approach →', href: '/certifications#industry-certs', variant: 'ghost' }],
    items: [
      { key: '01', title: 'More clean generation', body: 'Solar and hybrid systems for more of Indian industry.' },
      { key: '02', title: 'Smarter storage', body: 'Batteries and energy management that cut cost and improve resilience.' },
      { key: '03', title: 'Charging at scale', body: 'Reliable EV charging infrastructure for fleets and campuses.' },
      { key: '04', title: 'Better service', body: 'Faster response and better monitoring for every system we install.' },
    ],
    reveal: true,
    itemStyle: { hoverSlide: true },
    keyStyle: { glow: true },
  };
}

export function defaultLegacyCtaContent(): LegacyCtaContent {
  return {
    section: {
      tone: 'light',
      bgColor: '#F3F0EA',
      bgGradient: 'linear-gradient(135deg,#FBF9F5 0%,#F3F0EA 55%,#EAF1F8 100%)',
      borderTop: '1px solid rgba(10,22,40,0.06)',
      orbs: [{ color: ORANGE, size: '420px', bottom: '-180px', right: '-80px', opacity: '0.12' }],
    },
    align: 'center',
    eyebrow: { text: '', line: true },
    title: { text: 'Let us build the next twenty years together' },
    body: { text: 'Tell us about your power, solar or storage requirement and our team will get back to you.' },
    ctas: [
      { label: 'Send an Inquiry →', href: '/contact', variant: 'primary' },
      { label: 'Call {{emergencyPhone}}', href: 'tel:{{emergencyPhone}}', variant: 'ghost' },
    ],
  };
}

export function defaultLegacySectionContent(type: string): Record<string, unknown> | null {
  switch (type) {
    case 'legacy_hero':
      return defaultLegacyHeroContent();
    case 'legacy_stats':
      return defaultLegacyStatsContent();
    case 'legacy_marquee':
      return defaultLegacyMarqueeContent();
    case 'legacy_story':
      return defaultLegacyStoryContent();
    case 'legacy_journey':
      return defaultLegacyJourneyContent();
    case 'legacy_values':
      return defaultLegacyValuesContent();
    case 'legacy_caps':
      return defaultLegacyCapsContent();
    case 'legacy_next':
      return defaultLegacyNextContent();
    case 'legacy_cta':
      return defaultLegacyCtaContent();
    default:
      return null;
  }
}

/**
 * Fill any missing top-level keys from defaults (one level of object merge) so partially
 * saved or hand-edited JSON never crashes the renderer / editor.
 */
export function withLegacyDefaults<T extends object>(type: LegacySectionType, raw: unknown): T {
  const base = defaultLegacySectionContent(type) as Record<string, unknown>;
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
  const arr = <V>(v: unknown): V[] => (Array.isArray(v) ? (v as V[]) : []);
  const bg = out.background as LegacyBgMedia | undefined;
  if (bg && typeof bg === 'object') {
    out.background = { ...bg, items: arr<LifeMediaItem>(bg.items), mobileItems: arr<LifeMediaItem>(bg.mobileItems) };
  }
  if (type === 'legacy_story') {
    const collage = out.collage as LegacyStoryContent['collage'];
    out.collage = {
      ...collage,
      frames: arr<LegacyCollageFrame>(collage?.frames).map((f) => ({ ...f, items: arr<LifeMediaItem>(f?.items) })),
    };
    const keep = out.keep as LegacyStoryContent['keep'];
    out.keep = { ...keep, items: arr<LegacyKeepItem>(keep?.items) };
  }
  if (type === 'legacy_journey') {
    out.milestones = arr<LegacyMilestone>(out.milestones).map((m) => ({
      ...m,
      tags: arr<string>(m?.tags),
      media: arr<LifeMediaItem>(m?.media),
    }));
  }
  out.typographyVersion = ABOUT_TYPOGRAPHY_VERSION;
  return out as T;
}

export const LEGACY_20YRS_SLUG = 'legacy20yrs';

export const LEGACY_20YRS_SEED_SECTIONS: Array<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
}> = [
  { type: 'legacy_hero', section_key: 'top', title: 'Page hero (slideshow + 20 years ring)', content_json: defaultLegacyHeroContent() },
  { type: 'legacy_stats', section_key: 'legacy-stats', title: 'Stat bar', content_json: defaultLegacyStatsContent() },
  { type: 'legacy_marquee', section_key: 'legacy-marquee', title: 'Capabilities marquee', content_json: defaultLegacyMarqueeContent() },
  { type: 'legacy_story', section_key: 'story', title: 'Our story (collage)', content_json: defaultLegacyStoryContent() },
  { type: 'legacy_journey', section_key: 'journey', title: 'Our journey (animated timeline)', content_json: defaultLegacyJourneyContent() },
  { type: 'legacy_values', section_key: 'values', title: 'What twenty years taught us (values)', content_json: defaultLegacyValuesContent() },
  { type: 'legacy_caps', section_key: 'today', title: 'What we do today (capabilities)', content_json: defaultLegacyCapsContent() },
  { type: 'legacy_next', section_key: 'next', title: 'The next twenty years', content_json: defaultLegacyNextContent() },
  { type: 'legacy_cta', section_key: 'contact', title: 'CTA band', content_json: defaultLegacyCtaContent() },
];
