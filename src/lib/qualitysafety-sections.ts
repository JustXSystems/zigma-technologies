import type { HeroHeight } from '@/lib/hero-height';
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
import type { LegacyBgMedia, LegacyCardStyle, LegacySectionHeader } from '@/lib/legacy-sections';

/**
 * Fully configurable "Quality & Safety" section family (page /qualitysafety):
 * qs_hero, qs_stats, qs_quality, qs_safety, qs_certs, qs_commit, qs_cta.
 *
 * Built on the About / Life / Legacy element primitives. Empty style fields fall back to the scoped
 * `.qs-*` CSS defaults, which mirror the approved qualitysafety.html design. Colors default to
 * theme tokens (var(--orange)…) so Theme Studio changes flow through; headings / eyebrows follow
 * Site Settings → Public typography; phone / email placeholders follow Site Settings.
 */

export const QS_SECTION_TYPES = ['qs_hero', 'qs_stats', 'qs_quality', 'qs_safety', 'qs_certs', 'qs_commit', 'qs_cta'] as const;
export type QsSectionType = (typeof QS_SECTION_TYPES)[number];

export function isQsSectionType(type: string): type is QsSectionType {
  return (QS_SECTION_TYPES as readonly string[]).includes(type);
}

/* ------------------------------------------------------------------ */
/* Section content shapes                                              */
/* ------------------------------------------------------------------ */

export type QsHeroContent = {
  section: SectionBox;
  heroHeight?: HeroHeight;
  /** Slides, Ken Burns motion, overlay, progress dots + counter */
  background: LegacyBgMedia;
  layout: { hAlign?: 'left' | 'center' | 'right'; maxWidth?: string };
  /** Fade-up entrance for breadcrumb, heading, lead, chips and buttons */
  entrance?: boolean;
  /** Page-scroll progress bar pinned to the top of the viewport */
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
  /** Small photo credit in the bottom-right corner */
  credit: TextEl;
};

export type QsStatItem = {
  hidden?: boolean;
  value: string;
  prefix?: string;
  suffix?: string;
  label: string;
  /** Number color for this stat; empty = section number style */
  color?: string;
  icon?: IconEl;
};

export type QsStatsContent = {
  section: SectionBox;
  items: QsStatItem[];
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
  iconStyle: { size?: string; color?: string; strokeWidth?: string };
};

/** Photo / video panel with a floating caption card. */
export type QsMediaPanel = {
  hidden?: boolean;
  items: LifeMediaItem[];
  intervalSeconds?: number;
  showDots?: boolean;
  /** Slow zoom-out when the panel scrolls into view */
  zoomIn?: boolean;
  lightbox?: boolean;
  minHeight?: string;
  minHeightMobile?: string;
  radius?: string;
  shadow?: string;
  background?: string;
  overlay?: string;
  fit?: ImageEl['fit'];
  position?: string;
  caption: {
    hidden?: boolean;
    /** Show the current slide's own caption instead of the fixed title / text below */
    fromItems?: boolean;
    title: TextEl;
    body: TextEl;
    position?: 'bottom' | 'top';
    background?: string;
    radius?: string;
    blur?: boolean;
  };
};

export type QsStep = {
  hidden?: boolean;
  num: string;
  title: TextEl;
  body: TextEl;
  /** Accent for the number / icon / hover bar; empty = section accent */
  color?: string;
  icon?: IconEl;
  /** Optional images / videos at the top of the card (several cross-fade) */
  media?: LifeMediaItem[];
};

export type QsQualityContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  header: LegacySectionHeader;
  layout: {
    mediaSide: 'left' | 'right';
    columns?: string;
    gap?: string;
    alignItems?: 'start' | 'center' | 'end' | 'stretch';
    /** Stacked (tablet / phone): media above the steps */
    mobileMediaFirst?: boolean;
  };
  media: QsMediaPanel;
  steps: QsStep[];
  columns: LifeColumns;
  gap?: string;
  reveal?: boolean;
  accentColor?: string;
  cardStyle: LegacyCardStyle & { hoverShadow?: string; mediaHeight?: string };
  iconStyle: { boxSize?: string; size?: string; radius?: string; background?: string; strokeWidth?: string };
  numStyle?: ElementStyle;
  titleStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
};

export type QsSafetyCard = {
  hidden?: boolean;
  /** Accent: icon, hover border and glow */
  color: string;
  icon: IconEl;
  title: TextEl;
  body: TextEl;
  media?: LifeMediaItem[];
};

export type QsGallery = {
  hidden?: boolean;
  /** title = caption, label = second caption line */
  items: LifeMediaItem[];
  columns: LifeColumns;
  gap?: string;
  aspectRatio?: string;
  radius?: string;
  captions?: boolean;
  hoverZoom?: boolean;
  lightbox?: boolean;
  overlay?: string;
  marginBottom?: string;
  fit?: ImageEl['fit'];
  position?: string;
  captionStyle?: ElementStyle;
  subCaptionStyle?: ElementStyle;
};

export type QsSafetyContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  header: LegacySectionHeader;
  gallery: QsGallery;
  cards: QsSafetyCard[];
  columns: LifeColumns;
  gap?: string;
  reveal?: boolean;
  cardStyle: LegacyCardStyle & { hoverBorder?: boolean; hoverGlow?: boolean; mediaHeight?: string };
  iconStyle: { boxSize?: string; size?: string; radius?: string; background?: string; border?: string; strokeWidth?: string; hoverFill?: boolean };
  titleStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
};

export type QsCertMeta = { label: string; value: string; /** Highlight as "to be added" */ pending?: boolean };

export type QsCert = {
  hidden?: boolean;
  color: string;
  icon: IconEl;
  title: TextEl;
  scope: TextEl;
  meta: QsCertMeta[];
  /** Certificate scans / photos (open in the lightbox) */
  media?: LifeMediaItem[];
  href?: string;
  linkLabel?: string;
  newTab?: boolean;
};

export type QsVerifyBox = {
  hidden?: boolean;
  title: TextEl;
  /** Checklist rows */
  list: string[];
  /** Chip / tag row */
  chips: string[];
  note: TextEl;
};

export type QsCertsContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  header: LegacySectionHeader;
  certs: QsCert[];
  columns: LifeColumns;
  gap?: string;
  reveal?: boolean;
  cardStyle: LegacyCardStyle & { hoverShadow?: string };
  seal: {
    hidden?: boolean;
    /** Show the first certificate image instead of the seal when one is set */
    useImage?: boolean;
    size?: string;
    iconSize?: string;
    innerColor?: string;
    spin?: boolean;
    spinSeconds?: number;
  };
  titleStyle?: ElementStyle;
  scopeStyle?: ElementStyle;
  metaLabelStyle?: ElementStyle;
  metaValueStyle?: ElementStyle;
  pendingColor?: string;
  viewLabel?: string;
  linkStyle?: ElementStyle;
  lightbox: boolean;
  verify: {
    hidden?: boolean;
    boxes: QsVerifyBox[];
    columns?: LifeColumns;
    gap?: string;
    marginTop?: string;
    boxStyle: LegacyCardStyle;
    titleStyle?: ElementStyle;
    itemStyle?: ElementStyle;
    checkColor?: string;
    chipStyle?: ElementStyle;
    noteStyle?: ElementStyle;
  };
  cta: {
    hidden?: boolean;
    title: TextEl;
    body: TextEl;
    ctas: CtaButton[];
    background?: string;
    border?: string;
    radius?: string;
    padding?: string;
    marginTop?: string;
  };
};

export type QsCommitItem = {
  hidden?: boolean;
  icon: IconEl;
  title: TextEl;
  body: TextEl;
  color?: string;
};

export type QsCommitContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  layout: { listSide: 'left' | 'right'; columns?: string; gap?: string; alignItems?: 'start' | 'center' | 'end' };
  eyebrow: EyebrowEl;
  title: TextEl;
  highlight?: LifeHighlight;
  body: TextEl;
  ctas: CtaButton[];
  items: QsCommitItem[];
  reveal?: boolean;
  itemStyle: LegacyCardStyle & { gap?: string };
  iconStyle: { size?: string; color?: string; strokeWidth?: string };
  itemTitleStyle?: ElementStyle;
  itemBodyStyle?: ElementStyle;
};

export type QsCtaContent = LifeCtaContent & { background: LegacyBgMedia };

/* ------------------------------------------------------------------ */
/* Icon presets (qualitysafety.html + shared About outline icons)      */
/* ------------------------------------------------------------------ */

export const QS_ICON_PRESETS: Array<{ key: string; label: string; svg: string }> = [
  { key: 'qs-hardhat', label: 'Hard hat (PPE)', svg: '<path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 7v4M9 8.5l6 0"/>' },
  { key: 'qs-bolt', label: 'Bolt (electrical isolation)', svg: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>' },
  { key: 'qs-height', label: 'Arrow up (working at height)', svg: '<path d="M12 21V7M6 12l6-6 6 6M5 3h14"/>' },
  { key: 'qs-battery', label: 'Battery (battery handling)', svg: '<rect x="3" y="8" width="16" height="9" rx="2"/><path d="M21 11v3M8 11v3M12 11v3"/>' },
  { key: 'qs-book', label: 'Book (training)', svg: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M8 7h7M8 11h5"/>' },
  { key: 'qs-flag', label: 'Flag (report & improve)', svg: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>' },
  { key: 'qs-shield-check', label: 'Shield check (quality / commitment)', svg: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>' },
  { key: 'qs-leaf', label: 'Leaf (environment)', svg: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c2-4 5-7 9-9"/>' },
  { key: 'qs-medal', label: 'Medal (licence)', svg: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5L7.5 21l4.5-2.5 4.5 2.5L15 13.5"/>' },
  { key: 'qs-link', label: 'Link (OEM authorisation)', svg: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>' },
  { key: 'qs-doc', label: 'Document (registration)', svg: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>' },
  { key: 'qs-design', label: 'Ruler & pencil (design review)', svg: '<path d="M3 21l3-1 12-12-2-2L4 18z"/><path d="M14 6l2 2"/><path d="M15 21h6"/>' },
  { key: 'qs-inspect', label: 'Magnifier check (inspection)', svg: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/><path d="M7.8 10.6l1.9 1.9 3.4-3.6"/>' },
  { key: 'qs-gauge', label: 'Gauge (test & commission)', svg: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/><path d="M12 6v1M6.3 8.3l.7.7M17.7 8.3l-.7.7"/>' },
  { key: 'qs-wrench', label: 'Wrench (service & feedback)', svg: '<path d="M14.7 6.3a4 4 0 0 1-5.6 5.6L4 17l3 3 5.1-5.1a4 4 0 0 1 5.6-5.6z"/>' },
];

export const QS_ALL_ICON_PRESETS = [...QS_ICON_PRESETS, ...ABOUT_ICON_PRESETS];

const icon = (key: string): IconEl => ({ svg: QS_ALL_ICON_PRESETS.find((p) => p.key === key)?.svg || '' });

/* ------------------------------------------------------------------ */
/* Defaults (mirror the approved qualitysafety.html)                   */
/* ------------------------------------------------------------------ */

const ORANGE = 'var(--orange)';
const CYAN = 'var(--cyan)';
const GREEN = 'var(--green)';
const PURPLE = 'var(--purple)';
const BLUE = 'var(--blue)';
const YELLOW = 'var(--yellow)';
const PINK = 'var(--pink)';

const US = (id: string, w = 1920) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70&w=${w}`;

export const QS_IMAGES = {
  panelTest: '1758101755915-462eddc23f57',
  hardHat: '1621905251189-08b45d6a269e',
  faceShield: '1615774925655-a0e97fc85c14',
  harness: '1597502310092-31cdaa35b46d',
  commitment: '1660330589693-99889d60181e',
} as const;

const header = (eyebrow: string, color: string, title: string, subtitle: string): LegacySectionHeader => ({
  align: 'left',
  eyebrow: { text: eyebrow, line: true, style: { color } },
  title: { text: title },
  subtitle: { text: subtitle },
  bar: {},
});

const hiddenBg = (): LegacyBgMedia => ({ hidden: true, items: [] });

export function defaultQsHeroContent(): QsHeroContent {
  return {
    section: {
      tone: 'dark',
      bgColor: 'var(--navy-950)',
      bgGradient: 'linear-gradient(135deg,var(--navy-950) 0%,#123058 60%,#0F4C5C 100%)',
      pattern: 'grid-fade',
      patternColor: 'rgba(255,255,255,0.035)',
      patternSize: '64px',
    },
    heroHeight: 'auto',
    background: {
      items: [
        { src: US(QS_IMAGES.panelTest), title: 'Engineer testing an electrical panel with a multimeter for quality checks' },
        { src: US(QS_IMAGES.hardHat), title: 'Electrician wearing a hard hat, working with PPE' },
        { src: US(QS_IMAGES.harness), title: 'Utility worker in a safety harness working at height' },
      ],
      intervalSeconds: 5.5,
      motion: 'kenburns',
      motionSeconds: 8,
      overlay: 'linear-gradient(105deg,rgba(10,22,40,0.95) 0%,rgba(10,22,40,0.82) 46%,rgba(15,76,92,0.5) 100%)',
      showDots: true,
      showCount: true,
      dotColor: ORANGE,
    },
    layout: { hAlign: 'left', maxWidth: '' },
    entrance: true,
    scrollBar: {},
    breadcrumb: {
      items: [{ label: 'Home', href: '/' }, { label: 'Who We Are', href: '/about-zigma' }, { label: 'Quality & Safety' }],
      separator: '/',
    },
    eyebrow: { text: '', line: true, style: { color: CYAN } },
    title: { text: 'Quality you can trust. Safety we never compromise.' },
    highlight: { text: 'Safety we never compromise.', gradient: 'linear-gradient(90deg,#9BE38B,#22D3EE,#9BE38B)', animate: true },
    lead: {
      text: 'From the first design review to the last service visit, we build careful habits into every UPS, solar and battery project so systems run reliably and people go home safe.',
    },
    pills: {
      items: [
        { label: 'Tested before dispatch' },
        { label: 'Safe site practices' },
        { label: 'Trained engineers' },
        { label: 'Continuous improvement' },
        { label: 'Aligned to CEA & BIS standards' },
      ],
    },
    ctas: [],
    credit: { text: 'Photos: Unsplash' },
  };
}

export function defaultQsStatsContent(): QsStatsContent {
  return {
    section: { tone: 'dark', bgColor: 'var(--navy-900)', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    items: [
      { value: '20', suffix: '+', label: 'Years of Experience' },
      { value: '250', suffix: '+', label: 'Skilled Employees' },
      { value: '5000', suffix: '+', label: 'Success Stories' },
      { value: '3000', suffix: '+', label: 'Happy Customers' },
    ],
    columns: { desktop: 4, tablet: 4, mobile: 2 },
    align: 'center',
    animateCount: true,
    countDurationMs: 1400,
    hoverLift: true,
    dividers: false,
    suffixColor: ORANGE,
    iconStyle: {},
  };
}

export function defaultQsStep(): QsStep {
  return { num: '05', title: { text: 'New step', tag: 'h3' }, body: { text: 'Describe this stage of the quality process.' } };
}

export function defaultQsQualityContent(): QsQualityContent {
  const step = (num: string, title: string, body: string): QsStep => ({ num, title: { text: title, tag: 'h3' }, body: { text: body } });
  return {
    section: { tone: 'light', bgColor: 'var(--white)' },
    background: hiddenBg(),
    header: header(
      'OUR QUALITY APPROACH',
      ORANGE,
      'Quality is checked at every step, not just at the end',
      'A simple four-stage process keeps every system consistent, documented and ready to perform.'
    ),
    layout: { mediaSide: 'left', columns: '', gap: '', alignItems: 'stretch', mobileMediaFirst: true },
    media: {
      items: [{ src: US(QS_IMAGES.panelTest, 1000), title: 'Engineer testing an electrical panel with a multimeter' }],
      intervalSeconds: 4.5,
      showDots: true,
      zoomIn: true,
      lightbox: true,
      caption: {
        title: { text: 'Tested and recorded' },
        body: { text: 'Readings are logged at commissioning so every system has a documented baseline.' },
        position: 'bottom',
        blur: true,
      },
    },
    steps: [
      step('01', 'Design review', 'Every design is checked for ratings, protection and site conditions before it is released.'),
      step('02', 'Incoming inspection', 'Panels, batteries, inverters and cables are inspected and verified on arrival.'),
      step('03', 'Test & commission', 'Systems are tested against the design and signed off with recorded readings.'),
      step('04', 'Service & feedback', 'Scheduled AMC visits and customer feedback keep quality measurable after handover.'),
    ],
    columns: { desktop: 2, tablet: 2, mobile: 1 },
    reveal: true,
    accentColor: ORANGE,
    cardStyle: { hoverLift: true },
    iconStyle: {},
  };
}

export function defaultQsSafetyCard(): QsSafetyCard {
  return { color: CYAN, icon: icon('qs-shield-check'), title: { text: 'New safety habit', tag: 'h3' }, body: { text: 'Describe the practice.' } };
}

export function defaultQsSafetyContent(): QsSafetyContent {
  const card = (color: string, iconKey: string, title: string, body: string): QsSafetyCard => ({
    color,
    icon: icon(iconKey),
    title: { text: title, tag: 'h3' },
    body: { text: body },
  });
  return {
    section: { tone: 'light', bgColor: '#DFEBF9', bgGradient: 'linear-gradient(160deg,#EEF5FD 0%,#DFEBF9 100%)' },
    background: hiddenBg(),
    header: header(
      'SAFETY FIRST',
      GREEN,
      'Six habits that keep our teams and your site safe',
      'Working with live power, batteries and rooftops demands discipline. These are the basics we do every time.'
    ),
    gallery: {
      items: [
        { src: US(QS_IMAGES.hardHat, 800), title: 'PPE on every visit', label: 'Helmet, gloves, footwear, site briefing' },
        { src: US(QS_IMAGES.faceShield, 800), title: 'Isolate, then test dead', label: 'Face shield and verified isolation' },
        { src: US(QS_IMAGES.harness, 800), title: 'Harness-first at height', label: 'Anchor points and rooftop access rules' },
      ],
      columns: { desktop: 3, tablet: 3, mobile: 1 },
      captions: true,
      hoverZoom: true,
      lightbox: true,
    },
    cards: [
      card(ORANGE, 'qs-hardhat', 'PPE & site discipline', 'Helmets, gloves, safety footwear and site briefings before any work starts, on every visit.'),
      card('#F59E0B', 'qs-bolt', 'Electrical isolation', 'Lock-out / tag-out, verified isolation and tested-dead checks before touching live systems.'),
      card(BLUE, 'qs-height', 'Working at height', 'Harnesses, anchor points and rooftop access rules for solar installation and cleaning.'),
      card('#10B981', 'qs-battery', 'Battery handling', 'Safe lifting, ventilation, insulated tools and spill readiness for battery banks and BESS.'),
      card(PURPLE, 'qs-book', 'Training & toolbox talks', 'Regular refreshers so every engineer knows the hazards of the job in front of them.'),
      card(PINK, 'qs-flag', 'Report & improve', 'Near-misses and incidents are logged, reviewed and turned into better procedures.'),
    ],
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    reveal: true,
    cardStyle: { hoverLift: true, hoverBorder: true, hoverGlow: true },
    iconStyle: {},
  };
}

const PENDING = 'ADD BEFORE PUBLISHING';
const certMeta = (): QsCertMeta[] => [
  { label: 'Certificate no.', value: PENDING, pending: true },
  { label: 'Valid until', value: PENDING, pending: true },
];

export function defaultQsCert(): QsCert {
  return { color: CYAN, icon: icon('qs-shield-check'), title: { text: 'New certificate', tag: 'h3' }, scope: { text: 'What this certificate covers.' }, meta: certMeta() };
}

export function defaultQsVerifyBox(): QsVerifyBox {
  return { title: { text: 'New checklist', tag: 'h3' }, list: ['First item'], chips: [], note: { text: '' } };
}

export function defaultQsCertsContent(): QsCertsContent {
  const cert = (color: string, iconKey: string, title: string, scope: string): QsCert => ({
    color,
    icon: icon(iconKey),
    title: { text: title, tag: 'h3' },
    scope: { text: scope },
    meta: certMeta(),
  });
  return {
    section: { tone: 'light', bgColor: 'var(--gray-100)' },
    background: hiddenBg(),
    header: header(
      'CERTIFICATES & APPROVALS',
      GREEN,
      'Quality you can verify, on paper',
      'Management-system certificates, licences and approvals that back up how we work. Copies are shared with tenders and audits.'
    ),
    certs: [
      cert(GREEN, 'qs-shield-check', 'ISO 9001:2015', 'Quality management system covering design, supply, installation and service.'),
      cert('#22D3EE', 'qs-leaf', 'ISO 14001:2015', 'Environmental management, including responsible battery and e-waste handling.'),
      cert(ORANGE, 'qs-bolt', 'ISO 45001:2018', 'Occupational health and safety management for site and workshop work.'),
      cert(PURPLE, 'qs-medal', 'Electrical contractor licence', 'Issued by the State Electrical Licensing Board, with licensed supervisors and wiremen.'),
      cert(BLUE, 'qs-link', 'OEM authorisations', 'Authorised partner certificates from the UPS, inverter and battery manufacturers we supply.'),
      cert(YELLOW, 'qs-doc', 'MSME / Udyam registration', 'Government registration of the enterprise for vendor onboarding and tenders.'),
    ],
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    reveal: true,
    cardStyle: { hoverLift: true },
    seal: { spin: true, spinSeconds: 14, useImage: false },
    viewLabel: 'View certificate',
    lightbox: true,
    verify: {
      boxes: [
        {
          title: { text: 'Paperwork you receive at handover', tag: 'h3' },
          list: [
            'Incoming inspection and test reports for major equipment',
            'Commissioning and performance test certificate',
            'Earth resistance and insulation resistance records',
            'As-built drawings and single-line diagram',
            'Manufacturer warranty certificates',
            'AMC schedule and service reports',
          ],
          chips: [],
          note: { text: '' },
        },
        {
          title: { text: 'Product approvals we check on supply', tag: 'h3' },
          list: [],
          chips: ['BIS registration', 'IEC test reports', 'MNRE ALMM listing', 'Type-test certificates', 'Manufacturer warranty', 'Batch and serial records'],
          note: { text: 'Where a product needs BIS registration or a test report, we ask for it before the material is accepted at site.' },
        },
      ],
      columns: { desktop: 2, tablet: 1, mobile: 1 },
      boxStyle: {},
      checkColor: GREEN,
    },
    cta: {
      title: { text: 'Need a certificate copy for a tender or audit?' },
      body: { text: 'Tell us the project and the document you need. Our team will send the current, valid copies.' },
      ctas: [{ label: 'Request certificates', href: '/contact#contact-form', variant: 'primary' }],
    },
  };
}

export function defaultQsCommitItem(): QsCommitItem {
  return { icon: icon('qs-shield-check'), title: { text: 'New commitment' }, body: { text: 'Describe the commitment.' } };
}

export function defaultQsCommitContent(): QsCommitContent {
  const item = (title: string, body: string): QsCommitItem => ({ icon: icon('qs-shield-check'), title: { text: title }, body: { text: body } });
  return {
    section: { tone: 'dark', bgColor: 'var(--navy-950)' },
    background: {
      items: [{ src: US(QS_IMAGES.commitment, 1600), title: 'Engineers at work on a power installation' }],
      intervalSeconds: 6,
      motion: 'drift',
      motionSeconds: 28,
      overlay: 'linear-gradient(rgba(10,22,40,0.9),rgba(10,22,40,0.92))',
    },
    layout: { listSide: 'right', columns: '', gap: '', alignItems: 'center' },
    eyebrow: { text: 'OUR COMMITMENT', line: true, style: { color: CYAN } },
    title: { text: 'Every job, done right and done safely' },
    body: {
      text: 'Quality and safety are not add-ons at Zigma. They shape how we plan, who we train and how we respond when something goes wrong.',
    },
    ctas: [],
    items: [
      item('Zero-compromise on safety', 'No job is urgent enough to skip a safety check.'),
      item(
        'Standards-led work',
        'We follow applicable electrical codes and manufacturer guidelines. Certificates are listed above and shared on request.'
      ),
      item('Accountable service', 'Clear records, quick response and a named owner for every issue.'),
    ],
    reveal: true,
    itemStyle: {},
    iconStyle: { color: GREEN },
  };
}

export function defaultQsCtaContent(): QsCtaContent {
  return {
    section: {
      tone: 'light',
      bgColor: '#F3F0EA',
      bgGradient: 'linear-gradient(135deg,#FBF9F5 0%,#F3F0EA 55%,#EAF1F8 100%)',
      borderTop: '1px solid rgba(10,22,40,0.06)',
      orbs: [{ color: ORANGE, size: '420px', bottom: '-180px', right: '-80px', opacity: '0.2' }],
    },
    background: hiddenBg(),
    align: 'center',
    maxWidth: '780px',
    eyebrow: { text: '', line: true },
    title: { text: 'Have a question about our quality or safety practices?' },
    body: { text: 'Talk to our team. We are happy to share how we work and what to expect on your project.' },
    ctas: [
      { label: 'Send an Inquiry →', href: '/contact#contact-form', variant: 'primary' },
      { label: 'Call {{emergencyPhone}}', href: 'tel:{{emergencyPhone}}', variant: 'ghost' },
    ],
  };
}

export function defaultQsSectionContent(type: string): Record<string, unknown> | null {
  switch (type) {
    case 'qs_hero':
      return defaultQsHeroContent();
    case 'qs_stats':
      return defaultQsStatsContent();
    case 'qs_quality':
      return defaultQsQualityContent();
    case 'qs_safety':
      return defaultQsSafetyContent();
    case 'qs_certs':
      return defaultQsCertsContent();
    case 'qs_commit':
      return defaultQsCommitContent();
    case 'qs_cta':
      return defaultQsCtaContent();
    default:
      return null;
  }
}

/**
 * Fill any missing top-level keys from defaults (one level of object merge) and coerce every list
 * so partially saved or hand-edited JSON never crashes the renderer / editor.
 */
export function withQsDefaults<T extends object>(type: QsSectionType, raw: unknown): T {
  const base = defaultQsSectionContent(type) as Record<string, unknown>;
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
  const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const bg = out.background as LegacyBgMedia | undefined;
  if (bg && typeof bg === 'object') {
    out.background = { ...bg, items: arr<LifeMediaItem>(bg.items), mobileItems: arr<LifeMediaItem>(bg.mobileItems) };
  }
  if (!Array.isArray(out.ctas) && 'ctas' in base) out.ctas = [];
  if (Array.isArray(out.ctas)) out.ctas = arr<CtaButton>(out.ctas);

  if (type === 'qs_hero') {
    const bc = out.breadcrumb as QsHeroContent['breadcrumb'];
    out.breadcrumb = { ...bc, items: Array.isArray(bc?.items) ? bc.items : [] };
  }
  if (type === 'qs_stats') out.items = arr<QsStatItem>(out.items);
  if (type === 'qs_quality') {
    const m = out.media as QsMediaPanel;
    const d = (base.media as QsMediaPanel).caption;
    out.media = { ...m, items: arr<LifeMediaItem>(m?.items), caption: { ...d, ...(m?.caption || {}) } };
    out.steps = arr<QsStep>(out.steps).map((s) => ({ ...s, media: arr<LifeMediaItem>(s.media) }));
  }
  if (type === 'qs_safety') {
    const g = out.gallery as QsGallery;
    out.gallery = { ...g, items: arr<LifeMediaItem>(g?.items) };
    out.cards = arr<QsSafetyCard>(out.cards).map((c) => ({ ...c, media: arr<LifeMediaItem>(c.media) }));
  }
  if (type === 'qs_certs') {
    out.certs = arr<QsCert>(out.certs).map((c) => ({ ...c, meta: arr<QsCertMeta>(c.meta), media: arr<LifeMediaItem>(c.media) }));
    const dv = base.verify as QsCertsContent['verify'];
    const v = out.verify as QsCertsContent['verify'];
    out.verify = {
      ...dv,
      ...v,
      boxStyle: v?.boxStyle || {},
      boxes: arr<QsVerifyBox>(v?.boxes).map((b) => ({ ...b, list: strs(b.list), chips: strs(b.chips) })),
    };
    const dc = base.cta as QsCertsContent['cta'];
    const ct = out.cta as QsCertsContent['cta'];
    out.cta = { ...dc, ...ct, ctas: arr<CtaButton>(ct?.ctas) };
  }
  if (type === 'qs_commit') out.items = arr<QsCommitItem>(out.items);
  out.typographyVersion = ABOUT_TYPOGRAPHY_VERSION;
  return out as T;
}

export const QS_SLUG = 'qualitysafety';

export const QS_SEED_SECTIONS: Array<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
}> = [
  { type: 'qs_hero', section_key: 'top', title: 'Page hero (slideshow)', content_json: defaultQsHeroContent() },
  { type: 'qs_stats', section_key: 'qs-stats', title: 'Stat bar', content_json: defaultQsStatsContent() },
  { type: 'qs_quality', section_key: 'quality', title: 'Our quality approach (photo + steps)', content_json: defaultQsQualityContent() },
  { type: 'qs_safety', section_key: 'safety', title: 'Safety first (gallery + habit cards)', content_json: defaultQsSafetyContent() },
  { type: 'qs_certs', section_key: 'certifications', title: 'Certificates & approvals', content_json: defaultQsCertsContent() },
  { type: 'qs_commit', section_key: 'commitment', title: 'Our commitment', content_json: defaultQsCommitContent() },
  { type: 'qs_cta', section_key: 'contact', title: 'CTA band', content_json: defaultQsCtaContent() },
];
