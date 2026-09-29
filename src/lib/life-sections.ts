import { isVideoMediaPath } from '@/lib/media-url';
import {
  ABOUT_HERO_IMAGE,
  ABOUT_ICON_PRESETS,
  ABOUT_TYPOGRAPHY_VERSION,
  type CtaButton,
  type ElementStyle,
  type EyebrowEl,
  type IconEl,
  type ImageEl,
  type PillsEl,
  type SectionBox,
  type SectionHeader,
  type SplitLayout,
  type TextEl,
} from '@/lib/about-sections';

/**
 * Fully configurable "Life at Zigma" section family:
 * life_hero, life_stats, life_cards, life_roles, life_events, life_gallery, life_cta.
 *
 * Built on the About element primitives (ElementStyle, TextEl, SectionBox…). Empty
 * style fields fall back to the scoped `.lz-*` CSS defaults, which mirror the approved
 * Life at Zigma HTML design. Colors default to theme tokens (var(--orange)…) so Theme
 * Studio changes flow through; headings / eyebrows follow Site Settings → Public typography.
 */

export const LIFE_SECTION_TYPES = [
  'life_hero',
  'life_stats',
  'life_cards',
  'life_roles',
  'life_events',
  'life_gallery',
  'life_cta',
] as const;
export type LifeSectionType = (typeof LIFE_SECTION_TYPES)[number];

export function isLifeSectionType(type: string): type is LifeSectionType {
  return (LIFE_SECTION_TYPES as readonly string[]).includes(type);
}

/* ------------------------------------------------------------------ */
/* Shared shapes                                                       */
/* ------------------------------------------------------------------ */

/** One image or video in a Life gallery / slideshow / album. */
export type LifeMediaItem = {
  hidden?: boolean;
  /** Image, SVG or video path / URL */
  src: string;
  /** Empty = detect from the file extension */
  type?: 'image' | 'video';
  /** Video poster frame (optional) */
  poster?: string;
  /** Caption, also used as alt text and in the lightbox */
  title?: string;
  /** Small category label (e.g. "Trainings") */
  label?: string;
  /** Accent / placeholder tint while the media loads */
  color?: string;
  /** Mosaic galleries: span 2 columns × 2 rows */
  big?: boolean;
};

export type LifeColumns = { desktop?: number; tablet?: number; mobile?: number };

export type LifeHighlight = {
  /** Word or phrase inside the heading to emphasise; empty = none */
  text?: string;
  /** Gradient painted into the text; empty = orange → yellow → cyan */
  gradient?: string;
  /** Solid color instead of a gradient */
  color?: string;
  animate?: boolean;
};

export type LifeSectionHeader = SectionHeader & { highlight?: LifeHighlight };

export function lifeMediaKind(item: Pick<LifeMediaItem, 'src' | 'type'>): 'image' | 'video' {
  if (item.type === 'image' || item.type === 'video') return item.type;
  return isVideoMediaPath(item.src || '') ? 'video' : 'image';
}

export function visibleMedia(items?: LifeMediaItem[]): LifeMediaItem[] {
  return (items || []).filter((m) => m && !m.hidden && String(m.src || '').trim());
}

/* ------------------------------------------------------------------ */
/* Section content shapes                                              */
/* ------------------------------------------------------------------ */

export type LifeHeroContent = {
  section: SectionBox;
  layout: SplitLayout;
  breadcrumb: {
    hidden?: boolean;
    items: Array<{ label: string; href?: string }>;
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
  /** Optional image / video slideshow beside the copy; empty = single column (design default) */
  media: {
    hidden?: boolean;
    items: LifeMediaItem[];
    intervalSeconds?: number;
    showDots?: boolean;
    frame: Omit<ImageEl, 'src' | 'alt' | 'hidden'>;
  };
};

export type LifeStatItem = {
  value: string;
  prefix?: string;
  suffix?: string;
  label: string;
  icon: IconEl;
};

export type LifeStatsContent = {
  section: SectionBox;
  items: LifeStatItem[];
  columns: LifeColumns;
  gap?: string;
  align?: 'left' | 'center' | 'right';
  animateCount: boolean;
  countDurationMs?: number;
  hoverLift: boolean;
  numberStyle?: ElementStyle;
  suffixColor?: string;
  labelStyle?: ElementStyle;
  iconStyle: {
    hidden?: boolean;
    boxSize?: string;
    padding?: string;
    color?: string;
    background?: string;
    border?: string;
    radius?: string;
    strokeWidth?: string;
    hoverColor?: string;
    hoverBackground?: string;
    hoverBorderColor?: string;
  };
};

export type LifeCard = {
  num: string;
  title: TextEl;
  body: TextEl;
  color: string;
  background?: string;
  icon?: IconEl;
  image?: ImageEl;
};

export type LifeCardsContent = {
  section: SectionBox;
  header: LifeSectionHeader;
  cards: LifeCard[];
  columns: LifeColumns;
  gap?: string;
  reveal?: boolean;
  cardStyle: {
    background?: string;
    border?: string;
    radius?: string;
    padding?: string;
    shadow?: string;
    textAlign?: 'left' | 'center' | 'right';
    hoverLift?: boolean;
    hoverBorder?: boolean;
    accentBar?: { hidden?: boolean; width?: string; height?: string };
  };
  numStyle?: ElementStyle;
  titleStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
};

export type LifeRole = {
  title: TextEl;
  body: TextEl;
  color: string;
  icon: IconEl;
  /** Full-width row (icon beside the copy) */
  wide?: boolean;
};

export type LifeRolesContent = {
  section: SectionBox;
  header: LifeSectionHeader;
  roles: LifeRole[];
  columns: LifeColumns;
  gap?: string;
  animateIcons: boolean;
  staggerReveal: boolean;
  cardStyle: {
    background?: string;
    border?: string;
    radius?: string;
    padding?: string;
    shadow?: string;
    hoverBackground?: string;
    hoverLift?: boolean;
    topBar?: boolean;
  };
  iconStyle: {
    boxSize?: string;
    size?: string;
    radius?: string;
    background?: string;
    border?: string;
    strokeWidth?: string;
    glow?: boolean;
  };
  titleStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
};

export type LifeAlbum = {
  hidden?: boolean;
  name: string;
  caption?: string;
  color: string;
  items: LifeMediaItem[];
};

export type LifeEventLayout = 'marquee' | 'albums' | 'grid';

export type LifeEventGroup = {
  hidden?: boolean;
  num: string;
  title: TextEl;
  tags: string[];
  layout: LifeEventLayout;
  /** Marquee + grid layouts */
  items: LifeMediaItem[];
  /** Album layout */
  albums: LifeAlbum[];
  marquee: {
    speedSeconds?: number;
    direction?: 'ltr' | 'rtl';
    pauseOnHover?: boolean;
    fadeEdges?: boolean;
    tileWidth?: string;
    tileHeight?: string;
    tileWidthMobile?: string;
    tileHeightMobile?: string;
    gap?: string;
  };
  albumOptions: {
    columns?: LifeColumns;
    intervalSeconds?: number;
    showConnector?: boolean;
    tilt?: boolean;
    showCount?: boolean;
    reveal?: boolean;
  };
  grid: { columns?: LifeColumns; rowHeight?: string; rowHeightMobile?: string };
};

export type LifeEventsContent = {
  section: SectionBox;
  header: LifeSectionHeader;
  groups: LifeEventGroup[];
  groupTitleStyle?: ElementStyle;
  groupNumStyle?: ElementStyle;
  tagStyle?: ElementStyle;
  captionStyle?: ElementStyle;
  tileRadius?: string;
  note: TextEl;
  lightbox: boolean;
};

export type LifeGalleryContent = {
  section: SectionBox;
  header: LifeSectionHeader;
  items: LifeMediaItem[];
  layout: 'mosaic' | 'grid';
  columns: LifeColumns;
  rowHeight: { desktop?: string; tablet?: string; mobile?: string };
  gap?: string;
  slider: { enabled: boolean; intervalSeconds?: number; pauseOnHover?: boolean; showDots?: boolean };
  hover: { zoomIcon?: boolean; shine?: boolean; lift?: boolean; accent?: string };
  captions: boolean;
  captionStyle?: ElementStyle;
  tileRadius?: string;
  tileShadow?: string;
  note: TextEl;
  lightbox: boolean;
};

export type LifeCtaContent = {
  section: SectionBox;
  align: 'left' | 'center' | 'right';
  maxWidth?: string;
  eyebrow: EyebrowEl;
  title: TextEl;
  highlight?: LifeHighlight;
  body: TextEl;
  ctas: CtaButton[];
};

/* ------------------------------------------------------------------ */
/* Icon presets (from the Life at Zigma design, 48×48 animated SVGs)   */
/* ------------------------------------------------------------------ */

const svg48 = (inner: string) => `<svg viewBox="0 0 48 48" aria-hidden="true">${inner}</svg>`;

export const LIFE_ICON_PRESETS: Array<{ key: string; label: string; svg: string }> = [
  {
    key: 'life-chip',
    label: 'Chip (technology / automation)',
    svg: svg48(
      '<rect x="13" y="13" width="22" height="22" rx="3.5"/><rect class="ic-core" x="19.5" y="19.5" width="9" height="9" rx="1.5"/><path class="ic-pin" d="M19 13V7M24 13V7M29 13V7" style="animation-delay:0s"/><path class="ic-pin" d="M19 41v-6M24 41v-6M29 41v-6" style="animation-delay:.5s"/><path class="ic-pin" d="M13 19H7M13 24H7M13 29H7" style="animation-delay:1s"/><path class="ic-pin" d="M41 19h-6M41 24h-6M41 29h-6" style="animation-delay:1.5s"/>'
    ),
  },
  {
    key: 'life-blueprint',
    label: 'Blueprint (design & engineering)',
    svg: svg48(
      '<rect x="6" y="8" width="36" height="32" rx="3.5"/><path d="M6 18h36M16 8v32" stroke-opacity=".35"/><circle class="ic-draw2" cx="29" cy="29" r="7" pathLength="60"/><path class="ic-draw2" d="M22 29h14M29 22v14" pathLength="60" style="animation-delay:.5s"/>'
    ),
  },
  {
    key: 'life-flask',
    label: 'Flask (R&D)',
    svg: svg48(
      '<path d="M19 6h10M21 6v14L10 38a3 3 0 0 0 2.6 4.5h22.8A3 3 0 0 0 38 38L27 20V6"/><path d="M15 32h18" stroke-opacity=".35"/><circle class="ic-dot" cx="22" cy="35" r="2"/><circle class="ic-dot" cx="29" cy="30" r="1.6" style="animation-delay:.6s"/>'
    ),
  },
  {
    key: 'life-wrench',
    label: 'Wrench (service engineers)',
    svg: svg48(
      '<g class="ic-wobble"><path d="M17 8.5a9 9 0 0 0 11.8 11.8l10.4 10.4a3.2 3.2 0 0 1-4.5 4.5L24.3 24.8A9 9 0 0 1 12.5 13l5 5 3.6-3.6z"/></g>'
    ),
  },
  {
    key: 'life-solar',
    label: 'Solar panel + sun (installation)',
    svg: svg48(
      '<g class="ic-spin-slow"><circle cx="36" cy="12" r="4"/><path d="M36 4v2M36 18v2M28 12h2M42 12h2M30.3 6.3l1.4 1.4M40.3 16.3l1.4 1.4M41.7 6.3l-1.4 1.4M31.7 16.3l-1.4 1.4"/></g><path d="M11 23h22l5 15H6z"/><path d="M16.5 23 14 38M22 23v15M27.5 23 30 38M8.5 30.5h27"/><path class="ic-glint" d="M12 27l6 0"/>'
    ),
  },
  {
    key: 'life-monitor',
    label: 'Monitor chart (AMC / monitoring)',
    svg: svg48(
      '<rect x="6" y="8" width="36" height="26" rx="3.5"/><path d="M18 42h12M24 34v8"/><polyline class="ic-draw" points="11,28 18,20 24,25 31,15 37,18" pathLength="60"/><circle class="ic-dot" cx="37" cy="18" r="2.2"/>'
    ),
  },
  {
    key: 'life-gear',
    label: 'Gear (workshop & repair)',
    svg: svg48(
      '<g class="ic-spin"><circle cx="24" cy="24" r="9"/><circle cx="24" cy="24" r="3.5"/><path d="M24 7v6M24 35v6M7 24h6M35 24h6M12 12l4.2 4.2M31.8 31.8 36 36M36 12l-4.2 4.2M16.2 31.8 12 36"/></g>'
    ),
  },
  {
    key: 'life-headset',
    label: 'Headset (sales & support)',
    svg: svg48(
      '<circle class="ic-ping" cx="24" cy="24" r="9"/><path d="M9 28v-4a15 15 0 0 1 30 0v4"/><rect x="7" y="26" width="7" height="12" rx="3"/><rect x="34" y="26" width="7" height="12" rx="3"/><path d="M38 38c0 4-5 6-11 6"/>'
    ),
  },
  {
    key: 'life-clock',
    label: 'Clock (stat)',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
  },
];

/** Life presets first, then the shared About outline icons. */
export const LIFE_ALL_ICON_PRESETS = [...LIFE_ICON_PRESETS, ...ABOUT_ICON_PRESETS];

const lifeIcon = (key: string) => LIFE_ALL_ICON_PRESETS.find((p) => p.key === key)?.svg || '';

/* ------------------------------------------------------------------ */
/* Defaults (mirror the approved Life at Zigma HTML)                   */
/* ------------------------------------------------------------------ */

const ORANGE = 'var(--orange)';
const CYAN = 'var(--cyan)';
const GREEN = 'var(--green)';
const PURPLE = 'var(--purple)';

const PX = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900&h=650&fit=crop`;
const LF = (kw: string, n: number) => `https://loremflickr.com/900/650/${kw}?lock=${n}`;
const CM = (name: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=900`;

export function defaultLifeHeroContent(): LifeHeroContent {
  return {
    section: {
      tone: 'dark',
      bgColor: '#0A1628',
      bgGradient:
        'linear-gradient(90deg, rgba(10,22,40,0.85) 0%, rgba(10,22,40,0.05) 100%), linear-gradient(180deg, rgba(24,51,95,0.55) 0%, rgba(10,22,40,0.7) 100%)',
      bgImage: ABOUT_HERO_IMAGE,
      bgPosition: 'center 30%',
      bgSize: 'cover',
      bgRepeat: 'no-repeat',
      pattern: 'grid-fade',
      patternColor: 'rgba(255,255,255,0.09)',
      patternSize: '64px',
      orbs: [
        { color: ORANGE, size: '460px', top: '-170px', right: '-110px', opacity: '0.22' },
        { color: CYAN, size: '340px', bottom: '-150px', left: '8%', opacity: '0.18' },
      ],
    },
    layout: { imageSide: 'right', columns: '', gap: '', alignItems: 'center', mobileImageFirst: false },
    breadcrumb: {
      items: [{ label: 'Home', href: '/' }, { label: 'Who We Are', href: '/about-zigma' }, { label: 'Life at Zigma' }],
      separator: '/',
    },
    eyebrow: { text: 'LIFE AT ZIGMA', line: true, style: { color: CYAN } },
    title: { text: "Build a career keeping India's power on." },
    lead: {
      text: 'Join 250+ engineers, technicians and support specialists delivering UPS, solar and power electronics solutions with the same accountable, hands-on approach every day.',
    },
    pills: {
      items: [
        { label: 'Learning & Growth' },
        { label: 'Teamwork' },
        { label: 'Innovation & Ideas' },
        { label: 'People & Culture' },
        { label: 'Celebrating Success' },
      ],
    },
    ctas: [],
    media: { items: [], intervalSeconds: 4, showDots: true, frame: {} },
  };
}

export function defaultLifeStatsContent(): LifeStatsContent {
  const clock = { svg: lifeIcon('life-clock') };
  return {
    section: {
      tone: 'dark',
      bgColor: 'var(--navy-900)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    },
    items: [
      { value: '20', suffix: '+', label: 'Years of Experience', icon: { ...clock } },
      { value: '250', suffix: '+', label: 'Skilled Employees', icon: { ...clock } },
      { value: '5000', suffix: '+', label: 'Success Stories', icon: { ...clock } },
      { value: '3000', suffix: '+', label: 'Happy Customers', icon: { ...clock } },
    ],
    columns: { desktop: 4, tablet: 4, mobile: 2 },
    align: 'center',
    animateCount: true,
    countDurationMs: 1400,
    hoverLift: true,
    suffixColor: ORANGE,
    iconStyle: {},
  };
}

export function defaultLifeCardsContent(): LifeCardsContent {
  const card = (num: string, color: string, title: string, body: string): LifeCard => ({
    num,
    color,
    title: { text: title, tag: 'h3' },
    body: { text: body },
  });
  return {
    section: { tone: 'light', bgColor: 'var(--white)' },
    header: {
      align: 'left',
      eyebrow: { text: 'WHY ZIGMA', line: true, style: { color: ORANGE } },
      title: { text: 'What working here feels like' },
      subtitle: { text: 'A team culture built on doing the job properly and standing behind it.' },
    },
    cards: [
      card('01', ORANGE, 'Hands-on from day one', 'Work on live UPS, solar and power electronics systems alongside experienced engineers and technicians.'),
      card('02', GREEN, 'Learn from 17+ years of experience', 'Our teams have built a record across thousands of installations, and that know-how is shared, not siloed.'),
      card('03', CYAN, 'Ownership of the outcome', 'From first visit to after-sales support, one team owns the job, so your work is seen through end to end.'),
      card('04', PURPLE, 'Work that keeps businesses running', 'Data centers, offices and homes depend on the systems we install, repair and maintain.'),
    ],
    columns: { desktop: 4, tablet: 2, mobile: 1 },
    reveal: true,
    cardStyle: { hoverLift: true, hoverBorder: true, accentBar: {} },
  };
}

export function defaultLifeRolesContent(): LifeRolesContent {
  const role = (color: string, iconKey: string, title: string, body: string): LifeRole => ({
    color,
    icon: { svg: lifeIcon(iconKey) },
    title: { text: title, tag: 'h3' },
    body: { text: body },
  });
  return {
    section: {
      tone: 'light',
      bgColor: '#DFEBF9',
      bgGradient: 'linear-gradient(160deg,#EEF5FD 0%,#DFEBF9 55%,#D3E3F6 100%)',
      orbs: [{ color: GREEN, size: '400px', top: '-140px', left: '-100px', opacity: '0.1' }],
    },
    header: {
      align: 'left',
      eyebrow: { text: 'WHERE YOU CAN FIT', line: true, style: { color: GREEN } },
      title: { text: 'Teams that keep systems running' },
      subtitle: { text: 'From the workshop to the rooftop, every role plays a part in reliable power.' },
    },
    roles: [
      role('#F472B6', 'life-chip', 'Technology & Automation', 'Software, IoT and remote monitoring tools that automate testing, alerts and reporting across our systems.'),
      role('#C084FC', 'life-blueprint', 'Design & Engineering', 'Power system design, drawings and engineering support for UPS, solar and battery installations.'),
      role('#34D399', 'life-flask', 'R&D & Development', 'Research, prototyping and product development for next-generation UPS, solar, battery and power electronics solutions.'),
      role(ORANGE, 'life-wrench', 'Service Engineers', 'Repairs, corrective and preventive maintenance, battery testing and replacement, on site.'),
      role('#FFB020', 'life-solar', 'Testing & Installation', 'Installing UPS, solar inverters, panels and batteries for homes, offices and enterprises.'),
      role('#7C9CFF', 'life-monitor', 'AMC - O&M & Monitoring', 'Annual maintenance and O&M for solar and UPS systems, with remote monitoring of savings and outages.'),
      role(CYAN, 'life-gear', 'Workshop & Repair', 'Bench-level repair support and testing for UPS and power electronics.'),
      role(GREEN, 'life-headset', 'Sales & Customer Support', 'Round-the-clock help for customers, from first enquiry and quote to resolution and after-sales care.'),
    ],
    columns: { desktop: 4, tablet: 2, mobile: 1 },
    animateIcons: true,
    staggerReveal: true,
    cardStyle: { hoverLift: true, topBar: true },
    iconStyle: { glow: true },
  };
}

const TRAININGS = '#10B981';
const SERVICES = '#3B82F6';
const STATIONS = '#8B5CF6';
const AWARDS = '#F59E0B';

function officeItem(label: string, color: string, title: string, src: string): LifeMediaItem {
  return { label, color, title, src };
}

function albumItem(title: string, src: string): LifeMediaItem {
  return { title, src };
}

export function defaultLifeEventGroup(layout: LifeEventLayout = 'marquee'): LifeEventGroup {
  return {
    num: '',
    title: { text: 'New group', tag: 'h3' },
    tags: [],
    layout,
    items: [],
    albums: [],
    marquee: { speedSeconds: 45, direction: 'ltr', pauseOnHover: true, fadeEdges: true },
    albumOptions: { intervalSeconds: 2.8, showConnector: true, tilt: true, showCount: true, reveal: true },
    grid: {},
  };
}

export function defaultLifeEventsContent(): LifeEventsContent {
  return {
    section: {
      tone: 'dark',
      bgColor: '#0A1628',
      bgGradient: 'linear-gradient(180deg,var(--navy-950),#0c1a33)',
      pattern: 'grid-fade-top',
      patternColor: 'rgba(255,255,255,0.05)',
      patternSize: '56px',
      orbs: [
        { color: ORANGE, size: '420px', top: '-120px', right: '-100px', opacity: '0.18', drift: true },
        { color: CYAN, size: '380px', bottom: '-140px', left: '-90px', opacity: '0.16', drift: true },
      ],
    },
    header: {
      align: 'left',
      eyebrow: { text: 'EVENTS & MOMENTS', line: true, style: { color: ORANGE } },
      title: { text: 'Life beyond the job' },
      subtitle: {
        text: 'Festivals, trainings, service work in the field and the everyday spaces where our team comes together.',
      },
      highlight: { text: 'beyond', animate: true },
    },
    groups: [
      {
        ...defaultLifeEventGroup('marquee'),
        num: '01',
        title: { text: 'Office Events', tag: 'h3' },
        items: [
          officeItem('Trainings', TRAININGS, 'Technical Training Session', PX(6754850)),
          officeItem('Services', SERVICES, 'Onsite UPS Service', PX(33694019)),
          officeItem('Work Stations', STATIONS, 'Engineering Desks', PX(7658350)),
          officeItem('Awards', AWARDS, 'Awards & Recognition', LF('award,trophy', 27)),
          officeItem('Trainings', TRAININGS, 'Safety & Compliance Training', LF('safety,helmet', 24)),
          officeItem('Services', SERVICES, 'Rooftop Solar Installation', PX(8853536)),
          officeItem('Work Stations', STATIONS, 'Support Floor', PX(7658381)),
          officeItem('Awards', AWARDS, 'Awards Night', LF('award,ceremony', 37)),
          officeItem('Trainings', TRAININGS, 'New Joiner Induction', LF('office,meeting', 25)),
          officeItem('Services', SERVICES, 'Battery Replacement', PX(33694035)),
          officeItem('Work Stations', STATIONS, 'Open Office', LF('open,office', 35)),
          officeItem('Awards', AWARDS, 'Trophy Presentation', LF('trophy,team', 38)),
          officeItem('Trainings', TRAININGS, 'Classroom Session', LF('training,classroom', 31)),
          officeItem('Services', SERVICES, 'Field Service Visit', LF('technician,electrical', 33)),
          officeItem('Work Stations', STATIONS, 'Control Room', LF('control,room', 36)),
          officeItem('Trainings', TRAININGS, 'Hands-on Workshop', LF('engineers,workshop', 32)),
          officeItem('Services', SERVICES, 'Solar Panel Cleaning', LF('solar,panels', 34)),
        ],
      },
      {
        ...defaultLifeEventGroup('albums'),
        num: '02',
        title: { text: 'Festivals & Celebrations', tag: 'h3' },
        albums: [
          {
            name: 'Festivals',
            caption: 'Album',
            color: '#FF6B1A',
            items: [
              albumItem('Diwali Celebration', CM('Diwali Diyas 2.jpg')),
              albumItem('Ayudha Puja at the Workshop', LF('puja,flowers', 22)),
              albumItem('Festival of Lights', CM('Deepawali-festival.jpg')),
              albumItem('Diwali Market', CM('DiwaliShop.JPG')),
              albumItem('Diwali Night Lights', CM('Diwali celebrations near Marina Skies, Hyderabad.jpg')),
              albumItem('Diwali Crowd Celebration', CM('London Diwali.jpg')),
              albumItem('Independence Day', LF('india,flag', 23)),
              albumItem('Ganesh Chaturthi', LF('ganesha,festival', 41)),
              albumItem('Holi Celebration', LF('holi,colors', 42)),
              albumItem('Pongal Celebration', LF('pongal,harvest', 61)),
              albumItem('Christmas Celebration', LF('christmas,lights', 62)),
            ],
          },
          {
            name: 'Celebrations',
            caption: 'Album',
            color: '#EC4899',
            items: [
              albumItem('Annual Day', LF('office,celebration', 26)),
              albumItem('Milestone Celebration', LF('celebration,team', 43)),
              albumItem('Cake Cutting', LF('cake,celebration', 44)),
              albumItem('Success Party', LF('confetti,party', 45)),
              albumItem('Team Toast', LF('toast,team', 56)),
            ],
          },
          {
            name: 'Cultural',
            caption: 'Album',
            color: '#A855F7',
            items: [
              albumItem('Cultural Day', LF('traditional,dance', 29)),
              albumItem('Folk Dance', LF('folk,dance', 47)),
              albumItem('Rangoli Competition', LF('rangoli,colors', 48)),
              albumItem('Ethnic Day', LF('ethnic,costume', 49)),
              albumItem('Traditional Music', LF('traditional,music', 57)),
            ],
          },
          {
            name: 'Birthdays',
            caption: 'Album',
            color: '#06B6D4',
            items: [
              albumItem('Birthday Celebration', LF('birthday,cake', 30)),
              albumItem('Birthday Party', LF('birthday,party', 51)),
              albumItem('Balloons & Cake', LF('balloons,celebration', 52)),
              albumItem('Surprise Party', LF('surprise,party', 58)),
              albumItem('Birthday Candles', LF('birthday,candles', 59)),
            ],
          },
          {
            name: 'Team Outings',
            caption: 'Album',
            color: '#22C55E',
            items: [
              albumItem('Team Outing', LF('friends,outing', 28)),
              albumItem('Trekking Trip', LF('hiking,friends', 53)),
              albumItem('Beach Day', LF('beach,friends', 54)),
              albumItem('Team Lunch', LF('team,lunch', 55)),
              albumItem('Road Trip', LF('road,trip', 60)),
            ],
          },
        ],
      },
    ],
    note: { text: 'Hover a photo for details. Click to enlarge.', style: { color: '#8FA0BA' } },
    lightbox: true,
  };
}

export function defaultLifeGalleryContent(): LifeGalleryContent {
  return {
    section: { tone: 'light', bgColor: 'var(--gray-100)' },
    header: {
      align: 'left',
      eyebrow: { text: 'OUR INFRASTRUCTURE', line: true, style: { color: CYAN } },
      title: { text: 'Facilities built for reliable service' },
      subtitle: {
        text: 'An integrated facility featuring modern office workspaces, advanced workshops, testing labs, and dedicated support spaces where our teams engineer, repair, test, and deliver every system with advanced engineering and precision.',
      },
    },
    items: [
      { title: 'Service Workshop', src: PX(15888225), big: true },
      { title: 'Battery Testing Lab', src: PX(33694034) },
      { title: 'UPS Repair Bench', src: PX(10699355) },
      { title: 'Spares & Inventory Store', src: PX(4483862) },
      { title: 'Training Room', src: LF('classroom,training', 11) },
    ],
    layout: 'mosaic',
    columns: { desktop: 4, tablet: 2, mobile: 2 },
    rowHeight: { desktop: '210px', tablet: '170px', mobile: '150px' },
    slider: { enabled: true, intervalSeconds: 2, pauseOnHover: true, showDots: true },
    hover: { zoomIcon: true, shine: true, lift: true },
    captions: false,
    note: { text: 'Click any photo to enlarge.' },
    lightbox: true,
  };
}

export function defaultLifeCtaContent(): LifeCtaContent {
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
    title: { text: 'Ready to grow your career with Zigma?' },
    body: { text: 'Explore open roles or send us your profile. We would like to hear from you.' },
    ctas: [
      { label: 'View Open Roles →', href: '/careers', variant: 'primary' },
      { label: 'Call {{emergencyPhone}}', href: 'tel:{{emergencyPhone}}', variant: 'ghost' },
    ],
  };
}

export function defaultLifeSectionContent(type: string): Record<string, unknown> | null {
  switch (type) {
    case 'life_hero':
      return defaultLifeHeroContent();
    case 'life_stats':
      return defaultLifeStatsContent();
    case 'life_cards':
      return defaultLifeCardsContent();
    case 'life_roles':
      return defaultLifeRolesContent();
    case 'life_events':
      return defaultLifeEventsContent();
    case 'life_gallery':
      return defaultLifeGalleryContent();
    case 'life_cta':
      return defaultLifeCtaContent();
    default:
      return null;
  }
}

/**
 * Fill any missing top-level keys from defaults (one level of object merge) so partially
 * saved or hand-edited JSON never crashes the renderer / editor.
 */
export function withLifeDefaults<T extends object>(type: LifeSectionType, raw: unknown): T {
  const base = defaultLifeSectionContent(type) as Record<string, unknown>;
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
  if (type === 'life_events' && Array.isArray(out.groups)) {
    out.groups = (out.groups as Array<Partial<LifeEventGroup>>).map((g) => {
      const d = defaultLifeEventGroup(g?.layout || 'marquee');
      return {
        ...d,
        ...g,
        marquee: { ...d.marquee, ...(g?.marquee || {}) },
        albumOptions: { ...d.albumOptions, ...(g?.albumOptions || {}) },
        grid: { ...d.grid, ...(g?.grid || {}) },
        items: Array.isArray(g?.items) ? g.items : [],
        albums: Array.isArray(g?.albums) ? g.albums : [],
        tags: Array.isArray(g?.tags) ? g.tags : [],
      };
    });
  }
  out.typographyVersion = ABOUT_TYPOGRAPHY_VERSION;
  return out as T;
}

export const LIFE_AT_ZIGMA_SLUG = 'life-at-zigma';

export const LIFE_AT_ZIGMA_SEED_SECTIONS: Array<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
}> = [
  { type: 'life_hero', section_key: 'top', title: 'Page hero', content_json: defaultLifeHeroContent() },
  { type: 'life_stats', section_key: 'life-stats', title: 'Stat bar', content_json: defaultLifeStatsContent() },
  { type: 'life_cards', section_key: 'why-zigma', title: 'Why Zigma (culture cards)', content_json: defaultLifeCardsContent() },
  { type: 'life_roles', section_key: 'where-you-fit', title: 'Where you can fit (roles)', content_json: defaultLifeRolesContent() },
  { type: 'life_events', section_key: 'events', title: 'Events & moments', content_json: defaultLifeEventsContent() },
  { type: 'life_gallery', section_key: 'infrastructure', title: 'Our infrastructure (gallery)', content_json: defaultLifeGalleryContent() },
  { type: 'life_cta', section_key: 'contact', title: 'CTA band', content_json: defaultLifeCtaContent() },
];
