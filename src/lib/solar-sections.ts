import {
  ABOUT_ICON_PRESETS,
  type CtaButton,
  type SectionBox,
  type TextEl,
} from '@/lib/about-sections';
import { SOLAR_INVERTER_FLOW_SVG, SOLAR_TYPE_ILLUSTRATIONS } from '@/lib/solar-illustrations';

/**
 * Fully configurable "Solar Solutions" section family (page /solar):
 * solar_hero, solar_delivery, solar_banner, solar_e2e, solar_types, solar_process, solar_performance,
 * solar_expertise, solar_inverters, solar_industries, solar_projects, solar_cta.
 *
 * Markup and class names mirror ZigmaSolarSolutionPage.html and are styled by the scoped `.sol-page`
 * stylesheet (src/app/solar-sections.css). Every text, link, image, chip, card and list below is stored in
 * content_json so Admin → Pages → Solar can change it. Icons are inline SVG strings (inner shapes for a 24×24
 * box, or a full <svg>). Colors default to theme tokens (var(--orange)…) so Theme Studio changes flow through;
 * phone / email placeholders ({{emergencyPhone}}) follow Site Settings.
 */

export const SOLAR_SECTION_TYPES = [
  'solar_hero',
  'solar_delivery',
  'solar_banner',
  'solar_e2e',
  'solar_types',
  'solar_process',
  'solar_performance',
  'solar_expertise',
  'solar_inverters',
  'solar_industries',
  'solar_projects',
  'solar_cta',
] as const;
export type SolarSectionType = (typeof SOLAR_SECTION_TYPES)[number];

export function isSolarSectionType(type: string): type is SolarSectionType {
  return (SOLAR_SECTION_TYPES as readonly string[]).includes(type);
}

/* ------------------------------------------------------------------ */
/* Shared shapes                                                       */
/* ------------------------------------------------------------------ */

export type SolarEyebrowTone = 'orange' | 'green' | 'cyan' | 'none';

/** Eyebrow label: tone picks the design's `.eyebrow-orange / -green / -cyan` color (style.color still wins). */
export type SolarEyebrow = TextEl & { tone?: SolarEyebrowTone };

/** Centered section heading block (eyebrow, H2, subtitle). */
export type SolarHead = {
  hidden?: boolean;
  align?: 'center' | 'left';
  eyebrow: SolarEyebrow;
  title: TextEl;
  subtitle: TextEl;
};

/** `play` shows the outlined play icon inside a ghost hero button. */
export type SolarCta = CtaButton & { play?: boolean };

export type SolarOrbTone = 'orange' | 'green' | 'cyan' | 'purple';

export type SolarOrb = {
  hidden?: boolean;
  tone: SolarOrbTone;
  size?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  opacity?: string;
};

/** Optional per-section look overrides; only background, text color, padding and borders are used. */
export type SolarBox = SectionBox;

/* ------------------------------------------------------------------ */
/* Section content shapes                                              */
/* ------------------------------------------------------------------ */

export type SolarHeroSlide = {
  hidden?: boolean;
  /** Full-bleed background image of this slide */
  image: string;
  eyebrow: string;
  title: TextEl;
  /** Words under the heading, joined by the separator (the last one gets the pink gradient) */
  words: string[];
  lead: TextEl;
  ctas: SolarCta[];
};

export type SolarHeroNode = {
  hidden?: boolean;
  /** "Solar\nEPC": a new line is a line break */
  label: string;
  icon: string;
  href: string;
  /** Horizontal position on the 640 × 470 diagram (px) */
  x: number;
  /** Y of the glass card's bottom edge, where its leader line starts (px) */
  cardY: number;
  /** Y of the dot on the arc, where its leader line ends (px) */
  dotY: number;
};

export type SolarHeroStat = { hidden?: boolean; icon: string; value: string; label: string };

export type SolarHeroContent = {
  section: SolarBox;
  slides: SolarHeroSlide[];
  intervalSeconds?: number;
  showDots?: boolean;
  wordSeparator?: string;
  /** 0–100 dark gradient strength; empty = Site Settings → Hero overlays */
  scrimStrength?: number;
  /** Dark gradient over the slides; empty = design default */
  shade?: string;
  nodes: { hidden?: boolean; ariaLabel: string; arc: string; items: SolarHeroNode[] };
  stats: { hidden?: boolean; items: SolarHeroStat[] };
};

export type SolarPillarCard = {
  hidden?: boolean;
  accent: string;
  tag: string;
  icon: string;
  title: string;
  sub: string;
  items: string[];
  linkLabel: string;
  linkHref: string;
  bgImage?: string;
};

export type SolarDeliveryContent = {
  section: SolarBox;
  bgImage: string;
  head: SolarHead;
  cards: SolarPillarCard[];
  note: { hidden?: boolean; strong: string; text: string };
  ctas: CtaButton[];
};

export type SolarBannerContent = {
  section: SolarBox;
  /** Public anchor id; empty = the section key */
  anchorId?: string;
  /** Design color set: orange = part 1, green = part 2, purple = part 3 */
  tone: 'orange' | 'green' | 'purple';
  /** Custom accent (number outline, eyebrow, chip hover); empty = tone color */
  accent?: string;
  orb: SolarOrb;
  num: string;
  eyebrow: SolarEyebrow;
  title: TextEl;
  body: TextEl;
  chips: string[];
  ctas: CtaButton[];
};

export type SolarE2eVariant = 'timeline' | 'loop' | 'stepper';

export type SolarE2eStep = {
  hidden?: boolean;
  title: string;
  body: string;
  icon: string;
  /** Stepper tab label; empty = title */
  tabLabel?: string;
  /** Stepper: the "You get" line */
  get?: string;
};

export type SolarE2eContent = {
  section: SolarBox;
  variant: SolarE2eVariant;
  /** Accent for dots, lines and ticks; empty = variant default (orange / blue / purple) */
  accent: string;
  head: SolarHead;
  steps: SolarE2eStep[];
  /** Timeline label before the number: "STEP 01" */
  stepPrefix: string;
  /** Stepper panel label; {n} and {total} are replaced */
  stepOfFormat: string;
  youGetLabel: string;
  loop: { ariaLabel: string; centerTop: string; centerTitle: string; centerSub: string; intervalSeconds?: number };
  stepper: { intervalSeconds?: number };
  autoplay?: boolean;
  promise: { hidden?: boolean; title: string; items: string[] };
};

export type SolarTypeItem = {
  hidden?: boolean;
  title: string;
  body: string;
  bestFor: string;
  chips: string[];
  ctaLabel: string;
  ctaHref: string;
  /** Full <svg> illustration shown beside the accordion while this item is open */
  illustrationSvg: string;
};

export type SolarTypesContent = {
  section: SolarBox;
  eyebrow: SolarEyebrow;
  title: TextEl;
  lead: TextEl;
  bestForLabel: string;
  /** Index of the item that starts open; -1 = all closed */
  openIndex?: number;
  showCaption?: boolean;
  items: SolarTypeItem[];
};

export type SolarProcessStep = { hidden?: boolean; title: string; body: string; icon: string; color: string };

export type SolarProcessContent = {
  section: SolarBox;
  head: SolarHead;
  stepPrefix: string;
  steps: SolarProcessStep[];
  ctas: CtaButton[];
};

export type SolarService = { hidden?: boolean; icon: string; title: string; body: string; color: string };
export type SolarBar = { label: string; without: number; with: number };
export type SolarLossSegment = { label: string; value: number; color: string };
export type SolarLegendItem = { label: string; color: string };
export type SolarMetric = { value: string; label: string };

export type SolarRoiModal = {
  badge: string;
  title: string;
  subtitle: string;
  currency: string;
  billLabel: string;
  billUnit: string;
  billDefault: number;
  billMin?: number;
  billStep?: number;
  tariffLabel: string;
  tariffUnit: string;
  tariffDefault: number;
  tariffMin?: number;
  tariffStep?: number;
  calcLabel: string;
  errorText: string;
  closeLabel: string;
  kpiSize: string;
  kpiInvestment: string;
  kpiPayback: string;
  kpiNet: string;
  /** {year1} and {co2} are replaced */
  summaryTemplate: string;
  ctaLabel: string;
  ctaHref: string;
  assumptionsText: string;
  assumptions: {
    /** Share of consumption solar offsets (0.8 = 80%) */
    offset: number;
    costPerKw: number;
    yieldPerKwDay: number;
    tariffEscalation: number;
    degradation: number;
    omPct: number;
    co2KgPerKwh: number;
  };
};

export type SolarPerformanceContent = {
  section: SolarBox;
  intro: {
    hidden?: boolean;
    eyebrow: SolarEyebrow;
    title: TextEl;
    paragraphs: string[];
    card: { title: string; items: string[]; ctas: CtaButton[] };
  };
  dashboard: {
    hidden?: boolean;
    orbs: SolarOrb[];
    eyebrow: SolarEyebrow;
    title: TextEl;
    monitor: {
      hidden?: boolean;
      title: string;
      liveLabel: string;
      areaPath: string;
      linePath: string;
      metrics: SolarMetric[];
    };
    output: {
      hidden?: boolean;
      title: string;
      sub: string;
      bars: SolarBar[];
      withoutLabel: string;
      withLabel: string;
      gapLabel: string;
    };
    losses: { hidden?: boolean; title: string; sub: string; segments: SolarLossSegment[] };
    health: { hidden?: boolean; title: string; sub: string; value: number; label: string; legend: SolarLegendItem[] };
    note: string;
  };
  roi: {
    hidden?: boolean;
    orb: SolarOrb;
    badge: string;
    title: string;
    body: string;
    points: string[];
    icon: string;
    buttonLabel: string;
    modal: SolarRoiModal;
  };
  services: { hidden?: boolean; eyebrow: SolarEyebrow; title: TextEl; items: SolarService[] };
  ctas: CtaButton[];
};

export type SolarExpertiseCard = { hidden?: boolean; num: string; title: string; body: string };

export type SolarExpertiseContent = {
  section: SolarBox;
  bgImage: string;
  head: SolarHead;
  cards: SolarExpertiseCard[];
  strip: string[];
  ctas: CtaButton[];
};

export type SolarInverterCard = { hidden?: boolean; icon: string; title: string; body: string; best: string; color: string };
export type SolarInverterService = { hidden?: boolean; title: string; body: string };

export type SolarInvertersContent = {
  section: SolarBox;
  head: SolarHead;
  flow: { hidden?: boolean; svg: string };
  cards: SolarInverterCard[];
  servicesTitle: string;
  services: SolarInverterService[];
  ctas: CtaButton[];
};

export type SolarIndustryPill = { hidden?: boolean; label: string; /** Green dot (residential) */ residential?: boolean };

export type SolarIndustriesContent = {
  section: SolarBox;
  head: SolarHead;
  pills: SolarIndustryPill[];
  durationSeconds?: number;
  reverse?: boolean;
  ctas: CtaButton[];
};

export type SolarProject = {
  hidden?: boolean;
  image: string;
  /** object-position, e.g. "50% 40%" */
  position?: string;
  tag: string;
  title: string;
  body: string;
  href?: string;
};

export type SolarProjectsContent = {
  section: SolarBox;
  head: SolarHead;
  items: SolarProject[];
  durationSeconds?: number;
  reverse?: boolean;
  ctas: CtaButton[];
};

export type SolarCtaContent = {
  section: SolarBox;
  orb: SolarOrb;
  title: TextEl;
  body: TextEl;
  ctas: CtaButton[];
};

/* ------------------------------------------------------------------ */
/* Icon presets (ZigmaSolarSolutionPage.html + shared About icons)     */
/* ------------------------------------------------------------------ */

export const SOLAR_ICON_PRESETS: Array<{ key: string; label: string; svg: string }> = [
  { key: 'sol-sun-ring', label: 'Sun (EPC)', svg: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>' },
  { key: 'sol-calendar-check', label: 'Calendar with tick (AMC)', svg: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="M9 15l2 2 4-4"/>' },
  { key: 'sol-wave-box', label: 'Wave in a box (O&M)', svg: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M7 14c1.6-3.4 3.2-3.4 5 0s3.4 3.4 5 0"/>' },
  { key: 'sol-search', label: 'Magnifier (survey / assess)', svg: '<circle cx="10" cy="10" r="6"/><path d="M14.8 14.8L20 20"/>' },
  { key: 'sol-cube', label: 'Cube (design / engineer)', svg: '<path d="M12 2l9 4.5-9 4.5-9-4.5L12 2z"/><path d="M3 6.5v11L12 22l9-4.5v-11"/>' },
  { key: 'sol-toolbox', label: 'Toolbox (procure / supply)', svg: '<rect x="3" y="9" width="18" height="10" rx="1.5"/><path d="M8 9V7a2 2 0 012-2h4a2 2 0 012 2v2"/>' },
  { key: 'sol-wrench', label: 'Wrench (build / install / fix)', svg: '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.4 2.4-2.6-.6-.6-2.6 2.6-2.2z"/>' },
  { key: 'sol-clipboard-check', label: 'Clipboard tick (approve / commission)', svg: '<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M8.5 13l2 2 4.5-4.5"/>' },
  { key: 'sol-clipboard-lines', label: 'Clipboard lines (onboard)', svg: '<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 3h6v3H9zM8.5 11h7M8.5 15h5"/>' },
  { key: 'sol-headset', label: 'Headset (support)', svg: '<path d="M4 13a8 8 0 0116 0"/><rect x="2.5" y="13" width="4" height="6" rx="1.5"/><rect x="17.5" y="13" width="4" height="6" rx="1.5"/>' },
  { key: 'sol-bolt', label: 'Bolt (power)', svg: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>' },
  { key: 'sol-calendar', label: 'Calendar (service)', svg: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>' },
  { key: 'sol-renew', label: 'Renew arrows', svg: '<path d="M20 11a8 8 0 00-14.5-4M4 13a8 8 0 0014.5 4"/><path d="M5 3v4h4M19 21v-4h-4"/>' },
  { key: 'sol-drop', label: 'Drop (cleaning)', svg: '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/>' },
  { key: 'sol-thermometer', label: 'Thermometer (thermal testing)', svg: '<path d="M14 14.8V5a2 2 0 00-4 0v9.8a4 4 0 104 0z"/><path d="M12 9v7"/>' },
  { key: 'sol-monitor', label: 'Monitor with trend (remote monitoring)', svg: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M7 12l3-3 3 2 4-4"/>' },
  { key: 'sol-bars', label: 'Bar chart (report)', svg: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>' },
  { key: 'sol-trend', label: 'Trend up (optimise)', svg: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>' },
  { key: 'sol-inv-string', label: 'String inverter', svg: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4M11 10v4M15 10v4"/>' },
  { key: 'sol-inv-central', label: 'Central inverter', svg: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>' },
  { key: 'sol-inv-offgrid', label: 'Off-grid / battery', svg: '<rect x="2" y="8" width="17" height="9" rx="1.5"/><path d="M22 11v3M7 11v3M11 11v3"/>' },
  { key: 'sol-calculator', label: 'Calculator', svg: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15h0"/>' },
  { key: 'sol-panel-sun', label: 'Solar panel with sun (hero node)', svg: '<path d="M5 10h14l2 7H3z"/><path d="M9.5 10L8 17M14.5 10L16 17M4 13.5h16"/><path d="M12 17v3.5M8 20.5h8"/><circle cx="12" cy="5" r="1.9"/><path d="M12 1.6v.9M8 3.2l.7.6M16 3.2l-.7.6"/>' },
  { key: 'sol-panel', label: 'Solar panel', svg: '<path d="M5 10h14l2 7H3z"/><path d="M9.5 10L8 17M14.5 10L16 17M4 13.5h16"/><path d="M12 17v3.5M8 20.5h8"/><circle cx="12" cy="5" r="1.9"/>' },
  { key: 'sol-wrench-big', label: 'Wrench with handle (AMC node)', svg: '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.4 2.4-2.6-.6-.6-2.6 2.6-2.2z"/><path d="M15.5 15.5l4.5 4.5M19 13l-2 2"/>' },
  { key: 'sol-gauge-rings', label: 'Concentric rings (O&M node)', svg: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.6"/><path d="M12 2v2.6M12 19.4V22M2 12h2.6M19.4 12H22M4.9 4.9l1.9 1.9M17.2 17.2l1.9 1.9M4.9 19.1l1.9-1.9M17.2 6.8l1.9-1.9"/>' },
  { key: 'sol-engineer', label: 'Engineer with hard hat (expertise node)', svg: '<path d="M6.5 10.5a5.5 5.5 0 0111 0z"/><path d="M4.5 10.5h15M12 5v5.5"/><circle cx="12" cy="14.5" r="2.4"/><path d="M6 21c0-3.1 2.7-5 6-5s6 1.9 6 5"/>' },
  { key: 'sol-hardhat', label: 'Hard hat (certified engineers)', svg: '<path d="M3 17h18M5.5 17a6.5 6.5 0 0113 0M12 6v4M8.5 17v-3"/>' },
  { key: 'sol-shield-check', label: 'Shield tick (24×7 support)', svg: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5L16 9.5"/>' },
];

export const SOLAR_ALL_ICON_PRESETS = [...SOLAR_ICON_PRESETS, ...ABOUT_ICON_PRESETS];

const icon = (key: string): string => SOLAR_ICON_PRESETS.find((p) => p.key === key)?.svg || '';

/* ------------------------------------------------------------------ */
/* Defaults (mirror ZigmaSolarSolutionPage.html)                       */
/* ------------------------------------------------------------------ */

const ORANGE = 'var(--orange)';
const GREEN = 'var(--green)';
const CYAN = 'var(--cyan)';
const YELLOW = 'var(--yellow)';
const BLUE = 'var(--blue)';
const PURPLE = 'var(--purple)';

const US = (id: string, w = 1600, q = 70) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`;

export const SOLAR_IMAGES = {
  rooftop: '1586366461834-d2d65d725a2e',
  textile: '1745321633881-d2d2218911bd',
  warehouse: '1635424709961-f3a150459ad4',
  hospital: '1660330589257-813305a4a383',
  apartment: '1542336391-ae2936d8efe4',
} as const;

const QUOTE_HREF = '/contact#contact-form';
const quoteCta = (): CtaButton[] => [{ label: 'Get Quotation →', href: QUOTE_HREF, variant: 'primary' }];

const eyebrow = (text: string, tone: SolarEyebrowTone): SolarEyebrow => ({ text, tone });
const head = (eyebrowText: string, tone: SolarEyebrowTone, title: string, subtitle: string): SolarHead => ({
  align: 'center',
  eyebrow: eyebrow(eyebrowText, tone),
  title: { text: title },
  subtitle: { text: subtitle },
});

const orb = (tone: SolarOrbTone, patch: Partial<SolarOrb> = {}): SolarOrb => ({
  tone,
  size: '420px',
  top: '-180px',
  right: '-100px',
  opacity: '0.22',
  ...patch,
});

export function defaultSolarHeroContent(): SolarHeroContent {
  const proposal = (): SolarCta => ({ label: 'Get a Solar Proposal →', href: QUOTE_HREF, variant: 'primary' });
  return {
    section: {},
    intervalSeconds: 6.5,
    showDots: true,
    wordSeparator: '·',
    shade: '',
    slides: [
      {
        image: US(SOLAR_IMAGES.rooftop, 1920, 75),
        eyebrow: 'SOLAR ENERGY SOLUTIONS',
        title: { text: 'End-to-End Solar Solutions' },
        words: ['Design', 'Build', 'Maintain', 'Optimize'],
        lead: {
          text: 'Solar EPC, AMC & O&M, backed by deep solar expertise — from site assessment and system design to installation, performance monitoring and long-term maintenance, for reliable and higher returns.',
        },
        ctas: [proposal(), { label: 'Watch Our Solutions', href: '#services', variant: 'ghost', play: true }],
      },
      {
        image: US(SOLAR_IMAGES.textile, 1920, 75),
        eyebrow: 'SOLAR EPC',
        title: { text: 'Turnkey Solar EPC, Start to Finish' },
        words: ['Survey', 'Engineer', 'Install', 'Commission'],
        lead: {
          text: 'One accountable team takes your project from the first site visit to a commissioned, monitored plant — rooftop, ground-mounted or hybrid — engineered around your load.',
        },
        ctas: [proposal(), { label: 'Explore Solar EPC', href: '#epc', variant: 'ghost' }],
      },
      {
        image: US(SOLAR_IMAGES.warehouse, 1920, 75),
        eyebrow: 'SOLAR AMC & O&M',
        title: { text: 'Solar That Keeps Performing' },
        words: ['Monitor', 'Inspect', 'Fix', 'Optimise'],
        lead: {
          text: "Scheduled maintenance and continuous operations protect your yield for decades — for plants we built and plants we didn't, with a 24×7 response line.",
        },
        ctas: [proposal(), { label: 'Explore AMC & O&M', href: '#amc-om', variant: 'ghost' }],
      },
    ],
    nodes: {
      ariaLabel: 'Our solar capabilities',
      arc: 'M-20 470 C 120 440, 250 250, 420 232 C 520 222, 600 222, 680 232',
      items: [
        { label: 'Solar\nEPC', icon: icon('sol-panel-sun'), href: '#epc', x: 80, cardY: 325.3, dotY: 425.3 },
        { label: 'AMC', icon: icon('sol-wrench-big'), href: '#amc-om', x: 220, cardY: 237.4, dotY: 323.4 },
        { label: 'O&M', icon: icon('sol-gauge-rings'), href: '#performance', x: 360, cardY: 173.3, dotY: 245.3 },
        { label: 'Solar\nExpertise', icon: icon('sol-engineer'), href: '#expertise-main', x: 500, cardY: 154, dotY: 226 },
      ],
    },
    stats: {
      items: [
        { icon: icon('sol-bolt'), value: '25+', label: 'Project Sites\nAcross India' },
        { icon: icon('sol-panel'), value: '30+ MW', label: 'Solar Capacity\nCommissioned' },
        { icon: icon('sol-hardhat'), value: '150+', label: 'Certified Engineers\n& Technical Experts' },
        { icon: icon('sol-shield-check'), value: '24×7', label: 'Monitoring &\nSupport' },
      ],
    },
  };
}

export function defaultSolarPillarCard(): SolarPillarCard {
  return {
    accent: ORANGE,
    tag: '04 — NEW',
    icon: icon('sol-sun-ring'),
    title: 'New capability',
    sub: 'One-line summary of this capability.',
    items: ['First point'],
    linkLabel: 'Learn more',
    linkHref: '#contact',
    bgImage: US(SOLAR_IMAGES.apartment),
  };
}

export function defaultSolarDeliveryContent(): SolarDeliveryContent {
  return {
    section: {},
    bgImage: US(SOLAR_IMAGES.warehouse),
    head: head(
      'WHAT WE DELIVER',
      'orange',
      'Three core solar capabilities, one accountable team',
      'Build it right, keep it producing, and back it with deep engineering and the right inverters.'
    ),
    cards: [
      {
        accent: ORANGE,
        tag: '01 — EPC',
        icon: icon('sol-sun-ring'),
        title: 'Solar EPC',
        sub: 'Engineering, Procurement & Construction — a turnkey solar plant delivered by one team.',
        items: [
          'Site survey, shadow analysis & yield simulation',
          'Detailed engineering — layouts, SLDs, structural design',
          'Procurement of certified modules, inverters & BoS',
          'Installation by our own trained field crews',
          'Approvals, net-metering & commissioning support',
        ],
        linkLabel: 'Explore Solar EPC',
        linkHref: '#epc',
        bgImage: US(SOLAR_IMAGES.apartment),
      },
      {
        accent: GREEN,
        tag: '02 — AMC · O&M',
        icon: icon('sol-calendar-check'),
        title: 'Solar AMC – O&M',
        sub: 'Scheduled contracts and continuous operations that protect your yield for decades.',
        items: [
          'Planned preventive maintenance visits',
          'Cleaning, thermography & IV-curve testing',
          'Remote monitoring & generation tracking',
          'Breakdown response & OEM / warranty support',
          'Monthly performance & loss reports',
        ],
        linkLabel: 'Explore AMC – O&M',
        linkHref: '#amc-om',
        bgImage: US(SOLAR_IMAGES.hospital),
      },
      {
        accent: BLUE,
        tag: '03 — EXPERTISE',
        icon: icon('sol-wave-box'),
        title: 'Solar Expertise & Inverters',
        sub: 'The engineering depth behind every plant — and the inverters at its heart.',
        items: [
          'In-house engineering by certified engineers',
          'String, central, hybrid & off-grid inverters',
          'Inverter servicing, replacement & repowering',
          'Designs built for Indian heat, dust & monsoon',
          '24×7 emergency response',
        ],
        linkLabel: 'Explore Expertise & Inverters',
        linkHref: '#expertise-main',
        bgImage: US(SOLAR_IMAGES.warehouse),
      },
    ],
    note: {
      strong: 'AMC vs O&M?',
      text: "AMC is a scheduled, visit-based contract that keeps a plant healthy. O&M is continuous day-to-day operation with monitoring and rapid fault response. Many clients combine both — we'll recommend what fits your plant size and risk.",
    },
    ctas: quoteCta(),
  };
}

export type SolarBannerKind = 'epc' | 'amc' | 'expertise';

export function defaultSolarBannerContent(kind: SolarBannerKind = 'epc'): SolarBannerContent {
  const make = (
    tone: SolarBannerContent['tone'],
    orbTone: SolarOrbTone,
    num: string,
    label: string,
    title: string,
    body: string,
    chips: string[]
  ): SolarBannerContent => ({
    section: {},
    anchorId: '',
    tone,
    accent: '',
    orb: orb(orbTone),
    num,
    eyebrow: eyebrow(label, 'none'),
    title: { text: title },
    body: { text: body },
    chips,
    ctas: quoteCta(),
  });
  if (kind === 'amc') {
    return make(
      'green',
      'green',
      '02',
      'MAIN SECTION 02',
      'Solar AMC – O&M',
      'Scheduled maintenance contracts and continuous operations that keep every plant — ours or not — producing at its best for 25 years.',
      ['Preventive Maintenance', 'Cleaning', 'Thermography', 'Remote Monitoring', 'Breakdown Response', 'Free ROI Calculator']
    );
  }
  if (kind === 'expertise') {
    return make(
      'purple',
      'purple',
      '03',
      'MAIN SECTION 03',
      'Solar Expertise & Inverters',
      'The engineering depth behind every project — and the inverters at the heart of every plant: supplied, serviced and renewed.',
      ['In-house Engineers', 'String · Central · Hybrid', 'Repowering', '24×7 Response']
    );
  }
  return make(
    'orange',
    'orange',
    '01',
    'MAIN SECTION 01',
    'Solar EPC',
    'Turnkey Engineering, Procurement & Construction — one accountable team taking your project from first site visit to a commissioned, monitored plant.',
    ['Site Survey', 'Detailed Engineering', 'Procurement', 'Installation', 'Commissioning', 'Net Metering']
  );
}

export function defaultSolarE2eStep(): SolarE2eStep {
  return { title: 'New step', body: 'Describe this stage.', icon: icon('sol-clipboard-check'), tabLabel: '', get: '' };
}

export function defaultSolarE2eContent(variant: SolarE2eVariant = 'timeline'): SolarE2eContent {
  const step = (iconKey: string, title: string, body: string, get = ''): SolarE2eStep => ({
    title,
    body,
    icon: icon(iconKey),
    tabLabel: '',
    get,
  });
  const base = {
    section: {},
    stepPrefix: 'STEP',
    stepOfFormat: 'STEP {n} OF {total}',
    youGetLabel: 'You get:',
    loop: {
      ariaLabel: 'Continuous six-step O&M loop: onboard, monitor, inspect, fix, report, optimise',
      centerTop: 'CONTINUOUS',
      centerTitle: 'O&M LOOP',
      centerSub: '6 steps · 1 team',
      intervalSeconds: 2.6,
    },
    stepper: { intervalSeconds: 4.8 },
    autoplay: true,
  };
  if (variant === 'loop') {
    return {
      ...base,
      variant,
      accent: BLUE,
      head: head(
        'END-TO-END WITH ZIGMA',
        'green',
        'How Zigma manages Solar AMC & O&M, end to end',
        'A continuous loop — onboard, monitor, inspect, fix, report, improve — run by one team that knows your plant.'
      ),
      steps: [
        step('sol-clipboard-lines', 'Onboard', 'Plant audit, baseline performance and a documented maintenance plan.'),
        step('sol-monitor', 'Monitor', 'Daily generation tracking and alarms, down to string level.'),
        step('sol-thermometer', 'Inspect', 'Scheduled cleaning, thermography, IV-curve and electrical checks.'),
        step('sol-wrench', 'Fix', 'Fast fault diagnosis, spares and OEM / warranty coordination.'),
        step('sol-bars', 'Report', 'Clear monthly performance and loss analysis you can act on.'),
        step('sol-trend', 'Optimise', 'Recommendations on cleaning cycles, repowering and upgrades.'),
      ],
      promise: {
        title: 'What this means for you',
        items: [
          'A named engineer accountable for every plant we maintain',
          'Defined response windows backed by a 24×7 emergency line',
          'Reports that show what was found, what was fixed and what is next',
        ],
      },
    };
  }
  if (variant === 'stepper') {
    return {
      ...base,
      variant,
      accent: PURPLE,
      head: head(
        'END-TO-END WITH ZIGMA',
        'orange',
        'How Zigma manages Expertise & Inverters, end to end',
        'From choosing the right inverter to keeping it healthy and renewing it — handled by the same engineers throughout.'
      ),
      steps: [
        step('sol-search', 'Assess', 'We study your load profile, site and grid conditions before recommending anything.', 'A clear inverter sizing brief'),
        step(
          'sol-wave-box',
          'Select',
          'We weigh string, central, hybrid and off-grid options against your goals and explain the trade-offs.',
          'A recommendation you can compare'
        ),
        step(
          'sol-toolbox',
          'Supply',
          'Certified equipment is sourced and spares are planned up front, so downtime stays short.',
          'Quality-checked equipment, spares planned'
        ),
        step(
          'sol-wrench',
          'Install',
          'Our own field engineers install, configure and test the inverters, then commission them safely.',
          'Units configured, tested and live'
        ),
        step(
          'sol-calendar',
          'Service',
          'Scheduled health checks, firmware updates and diagnostics keep output stable year after year.',
          'Regular care with written findings'
        ),
        step('sol-renew', 'Renew', 'When units age or fail, we plan repowering or replacement to restore full yield.', 'Upgrade options before output drops'),
      ],
      promise: {
        title: 'What this means for you',
        items: [
          'The same team from inverter selection through to servicing',
          'Engineering depth across solar, UPS, BESS and EV charging',
          '24×7 response when an inverter fault threatens output',
        ],
      },
    };
  }
  return {
    ...base,
    variant: 'timeline',
    accent: ORANGE,
    head: head(
      'END-TO-END WITH ZIGMA',
      'orange',
      'How Zigma manages Solar EPC, start to finish',
      'One team owns every stage — so nothing falls between contractors, and one phone number answers for the whole project.'
    ),
    steps: [
      step('sol-search', 'Discover & Plan', 'Site survey, load study, yield simulation and a clear project plan.'),
      step('sol-cube', 'Engineer', 'In-house layouts, SLDs, structural and electrical design.'),
      step('sol-toolbox', 'Procure', 'Certified modules, inverters and BoS sourced and quality-checked.'),
      step('sol-wrench', 'Build', 'Our own trained crews install under strict safety supervision.'),
      step('sol-clipboard-check', 'Approve & Commission', 'DISCOM and net-metering paperwork, testing and go-live.'),
      step('sol-headset', 'Hand Over & Support', 'Documentation, monitoring set-up and a lifecycle AMC.'),
    ],
    promise: {
      title: 'What this means for you',
      items: [
        'One contract and one project manager from survey to switch-on',
        'Progress tracked and shared at every stage of the build',
        'Handover that leads straight into long-term AMC and support',
      ],
    },
  };
}

export function defaultSolarTypeItem(): SolarTypeItem {
  return {
    title: 'New system type',
    body: 'Describe this solar architecture.',
    bestFor: 'Who it suits',
    chips: ['Feature one', 'Feature two'],
    ctaLabel: 'Get Quotation',
    ctaHref: QUOTE_HREF,
    illustrationSvg: SOLAR_TYPE_ILLUSTRATIONS[0] || '',
  };
}

export function defaultSolarTypesContent(): SolarTypesContent {
  const item = (title: string, body: string, bestFor: string, chips: string[], i: number): SolarTypeItem => ({
    title,
    body,
    bestFor,
    chips,
    ctaLabel: 'Get Quotation',
    ctaHref: QUOTE_HREF,
    illustrationSvg: SOLAR_TYPE_ILLUSTRATIONS[i] || '',
  });
  return {
    section: {},
    eyebrow: eyebrow('SOLAR SYSTEM TYPES', 'orange'),
    title: { text: 'The right solar architecture for every site' },
    lead: {
      text: 'No two facilities are alike. We engineer the system type around your load, roof or land, and power-reliability needs.',
    },
    bestForLabel: 'Best for',
    openIndex: 0,
    showCaption: true,
    items: [
      item(
        'Rooftop On-Grid',
        'Grid-tied systems that cut your electricity bill by offsetting daytime consumption, with net-metering where available.',
        'Factories, offices, campuses',
        ['Grid-connected', 'Net-metering ready', 'Low maintenance'],
        0
      ),
      item(
        'Off-Grid',
        'Battery-backed standalone systems that deliver power where the grid is weak, absent or unreliable.',
        'Remote sites, farms, telecom',
        ['Battery-backed', 'Grid-independent', 'Remote-ready'],
        1
      ),
      item(
        'Hybrid Solar + BESS',
        'Solar combined with battery storage for backup, peak shaving and maximum self-consumption.',
        'Hospitals, data rooms, process plants',
        ['Backup power', 'Peak shaving', 'Self-consumption'],
        2
      ),
      item(
        'Ground-Mounted',
        'Larger-scale arrays on open land with optimised tilt, tracking options and scalable capacity.',
        'Large industry, captive plants',
        ['Scalable capacity', 'Optimised tilt', 'Tracker option'],
        3
      ),
      item(
        'Carport & Canopy',
        'Solar shade structures over parking and walkways — generation without using extra land, with EV-charging readiness.',
        'Campuses, malls, logistics hubs',
        ['No extra land', 'Shade for vehicles', 'EV-ready'],
        4
      ),
      item(
        'Solar + EV Charging',
        'Solar-fed charging hubs and canopies that power fleets and visitors with your own clean energy.',
        'Fleets, campuses, commercial hubs',
        ['Solar-fed charging', 'Fleet-ready', 'Smart load control'],
        5
      ),
    ],
  };
}

export function defaultSolarProcessStep(): SolarProcessStep {
  return { title: 'New step', body: 'Describe this stage.', icon: icon('sol-clipboard-check'), color: ORANGE };
}

export function defaultSolarProcessContent(): SolarProcessContent {
  const step = (iconKey: string, color: string, title: string, body: string): SolarProcessStep => ({ icon: icon(iconKey), color, title, body });
  return {
    section: {},
    head: head(
      'OUR EPC PROCESS',
      'green',
      'From survey to switch-on in five clear stages',
      "The same disciplined sequence on every project — so you always know what's happening and what's next."
    ),
    stepPrefix: 'STEP',
    steps: [
      step('sol-search', ORANGE, 'Survey & Assess', 'Site visit, load profile, shadow & roof-strength study.'),
      step('sol-cube', GREEN, 'Design', 'Yield simulation, layouts, SLD and structural design.'),
      step('sol-toolbox', '#0AA9CC', 'Procure', 'Certified modules, inverters and balance-of-system.'),
      step('sol-wrench', BLUE, 'Install', 'Safe, quality-checked installation by our own crews.'),
      step('sol-bolt', PURPLE, 'Commission', 'Testing, approvals, handover and monitoring go-live.'),
    ],
    ctas: quoteCta(),
  };
}

export function defaultSolarService(): SolarService {
  return { icon: icon('sol-wrench'), title: 'New service', body: 'Describe this service.', color: ORANGE };
}

export function defaultSolarRoiModal(): SolarRoiModal {
  return {
    badge: 'FREE',
    title: 'Solar ROI Calculator',
    subtitle: 'Two numbers, one instant estimate.',
    currency: '₹',
    billLabel: 'Monthly electricity bill',
    billUnit: '₹',
    billDefault: 150000,
    billMin: 1000,
    billStep: 1000,
    tariffLabel: 'Grid tariff',
    tariffUnit: '₹ per unit',
    tariffDefault: 8,
    tariffMin: 1,
    tariffStep: 0.1,
    calcLabel: 'Calculate ROI',
    errorText: 'Please enter a monthly bill and tariff greater than zero.',
    closeLabel: 'Close calculator',
    kpiSize: 'System size',
    kpiInvestment: 'Investment',
    kpiPayback: 'Payback',
    kpiNet: '25-year net gain',
    summaryTemplate: 'Roughly {year1} saved in year 1, and about {co2} tonnes of CO₂ avoided every year.',
    ctaLabel: 'Get an Exact Proposal →',
    ctaHref: '#contact',
    assumptionsText:
      'Estimate only, not a quotation. Assumes solar offsets 80% of consumption, ₹45,000 per kW installed, 4.2 units per kW per day, 3% yearly tariff rise, 0.7% yearly panel degradation and O&M at 1% of project cost per year.',
    assumptions: {
      offset: 0.8,
      costPerKw: 45000,
      yieldPerKwDay: 4.2,
      tariffEscalation: 0.03,
      degradation: 0.007,
      omPct: 0.01,
      co2KgPerKwh: 0.82,
    },
  };
}

export function defaultSolarPerformanceContent(): SolarPerformanceContent {
  const bar = (label: string, without: number, withZ: number): SolarBar => ({ label, without, with: withZ });
  const svc = (iconKey: string, color: string, title: string, body: string): SolarService => ({ icon: icon(iconKey), color, title, body });
  const AREA = 'M0 185 C60 180 90 150 140 100 C190 50 230 30 280 45 C330 60 360 120 420 185 Z';
  return {
    section: {},
    intro: {
      eyebrow: eyebrow('KEEP IT PRODUCING', 'green'),
      title: { text: 'Every kilowatt-hour you paid for, actually delivered.' },
      paragraphs: [
        "A solar plant that isn't maintained quietly loses output — to soiling, hot-spots, loose connections and inverter faults. Because these losses are gradual, they rarely trigger an alarm. Our AMC and O&M teams hunt them down on a schedule and fix them before they show up on your bill.",
        "We operate plants we built and plants we didn't — every site gets a documented maintenance plan, a named engineer and a clear monthly report.",
      ],
      card: {
        title: 'What every O&M plan covers',
        items: [
          'Scheduled module cleaning',
          'Thermal imaging of panels',
          'String-level fault detection',
          'Inverter health checks',
          'Earthing & protection tests',
          'Monthly performance reports',
        ],
        ctas: [{ label: 'Talk to Our O&M Team →', href: QUOTE_HREF, variant: 'primary' }],
      },
    },
    dashboard: {
      orbs: [
        orb('orange', { size: '380px', top: '-150px', right: '-90px', opacity: '0.22' }),
        orb('cyan', { size: '360px', top: '', right: '', bottom: '-160px', left: '-80px', opacity: '0.18' }),
      ],
      eyebrow: eyebrow('WHY O&M PAYS BACK', 'orange'),
      title: { text: 'See where output is lost — and won back', tag: 'h3' },
      monitor: {
        title: 'PLANT PERFORMANCE · LIVE MONITORING',
        liveLabel: 'LIVE',
        areaPath: AREA,
        linePath: AREA.replace(/ Z$/, ''),
        metrics: [
          { value: 'Daily', label: 'Generation tracking' },
          { value: 'Alerts', label: 'Fault notifications' },
          { value: 'Monthly', label: 'Loss analysis report' },
        ],
      },
      output: {
        title: 'Output over time',
        sub: 'Unmaintained plant keeps sliding; a plant under O&M holds steady (% of baseline)',
        bars: [bar('M1', 100, 100), bar('M2', 86, 99), bar('M3', 72, 100), bar('M4', 58, 99), bar('M5', 48, 100), bar('M6', 40, 99)],
        withoutLabel: 'Without O&M',
        withLabel: 'With Zigma O&M',
        gapLabel: 'OUTPUT RECOVERED',
      },
      losses: {
        title: 'Where energy losses hide',
        sub: 'Typical sources of under-performance',
        segments: [
          { label: 'Soiling', value: 35, color: '#FF6B1A' },
          { label: 'Inverter & electrical faults', value: 25, color: '#3B82F6' },
          { label: 'Hot-spots & degradation', value: 20, color: '#A855F7' },
          { label: 'Loose connections', value: 12, color: '#00D4FF' },
          { label: 'Shading & vegetation', value: 8, color: '#12B76A' },
        ],
      },
      health: {
        title: 'Plant health score',
        sub: 'Performance ratio, tracked every month',
        value: 82,
        label: 'PERFORMANCE RATIO',
        legend: [
          { label: 'Healthy', color: GREEN },
          { label: 'Needs attention', color: ORANGE },
        ],
      },
      note: 'Illustrative graphics to explain how O&M protects yield — not measured data from a specific plant.',
    },
    roi: {
      orb: orb('orange', { size: '300px', top: '-120px', right: '-60px', opacity: '0.25' }),
      badge: 'FREE TOOL',
      title: 'Free Solar ROI Calculator',
      body: 'Enter your monthly bill and tariff — get an instant estimate of system size, payback and 25-year savings. No sign-up needed.',
      points: ['Instant estimate', 'Includes O&M cost', 'Takes 10 seconds'],
      icon: icon('sol-calculator'),
      buttonLabel: 'Calculate My ROI →',
      modal: defaultSolarRoiModal(),
    },
    services: {
      eyebrow: eyebrow('O&M SERVICES AT A GLANCE', 'green'),
      title: { text: 'What our O&M team does for your plant', tag: 'h3' },
      items: [
        svc('sol-calendar-check', ORANGE, 'Preventive Maintenance', 'Scheduled inspections, torque checks and cable & junction-box care that stop small faults becoming outages.'),
        svc('sol-drop', GREEN, 'Module Cleaning', 'Cleaning cycles planned around your local dust, bird-dropping and soiling patterns to recover lost output.'),
        svc('sol-thermometer', CYAN, 'Thermal & IV-Curve Testing', 'Thermography and IV-curve tests reveal hot-spots, mismatch and degrading strings before they cost you.'),
        svc('sol-bolt', YELLOW, 'Inverter & Electrical Care', 'Inverter servicing, ACDB/DCDB checks, earthing and lightning-protection tests for safe, stable output.'),
        svc('sol-monitor', BLUE, 'Remote Monitoring', 'Daily generation tracking, alarms and string-level insight, so under-performance is caught early.'),
        svc('sol-wrench', PURPLE, 'Breakdown Response', 'Fast fault diagnosis, spares planning and OEM / warranty coordination to cut downtime.'),
      ],
    },
    ctas: quoteCta(),
  };
}

export function defaultSolarExpertiseCard(): SolarExpertiseCard {
  return { num: '10', title: 'New strength', body: 'Describe this strength.' };
}

export function defaultSolarExpertiseContent(): SolarExpertiseContent {
  const card = (num: string, title: string, body: string): SolarExpertiseCard => ({ num, title, body });
  return {
    section: {},
    bgImage: US(SOLAR_IMAGES.apartment),
    head: head(
      'ZIGMA EXPERTISE',
      'orange',
      'Why industry trusts Zigma with its solar',
      'Two decades of electrical and power engineering sit behind every solar system we deliver.'
    ),
    cards: [
      card('01', 'In-house engineering', 'Design, SLDs and structural checks done by our own electrical engineers — not outsourced.'),
      card('02', 'Power-systems depth', 'Solar, UPS, BESS and EV charging under one roof means your plant integrates cleanly with everything else.'),
      card('03', 'Own field teams', 'Trained installers and technicians on our own payroll for consistent quality and safety on site.'),
      card('04', 'Safety & standards', 'IS/IEC-aligned practices and an ISO-aligned quality process on every engagement.'),
      card('05', 'Lifecycle accountability', 'The team that builds your plant is the team that maintains it — no hand-offs, no finger-pointing.'),
      card('06', '24×7 response', 'A real emergency line backed by engineers, so a breakdown becomes a short pause, not a long outage.'),
      card('07', 'Approvals & compliance', "Support with DISCOM applications, net-metering paperwork and statutory documentation so projects don't stall."),
      card('08', 'Data-driven monitoring', 'Generation data and alerts reviewed by engineers, turning raw numbers into fixes and clear reports.'),
      card('09', 'Built for Indian conditions', 'Designs that account for heat, dust, monsoon and grid variability — not just textbook assumptions.'),
    ],
    strip: [
      'Rooftop PV',
      'Ground-mount PV',
      'String & central inverters',
      'Hybrid inverters',
      'Battery storage',
      'Net metering',
      'Remote monitoring',
      'Thermography',
      'IV-curve testing',
    ],
    ctas: quoteCta(),
  };
}

export function defaultSolarInverterCard(): SolarInverterCard {
  return { icon: icon('sol-inv-string'), title: 'New inverter type', body: 'Describe this inverter type.', best: 'Best for', color: ORANGE };
}

export function defaultSolarInvertersContent(): SolarInvertersContent {
  const card = (iconKey: string, color: string, title: string, body: string, best: string): SolarInverterCard => ({
    icon: icon(iconKey),
    color,
    title,
    body,
    best,
  });
  return {
    section: {},
    head: head(
      'SOLAR INVERTERS',
      'orange',
      'The brain of your solar plant — supplied, serviced and renewed',
      "Inverters convert your panels' DC output into usable AC power. Pick the wrong one, or neglect it, and the whole plant under-delivers."
    ),
    flow: { svg: SOLAR_INVERTER_FLOW_SVG },
    cards: [
      card('sol-inv-string', ORANGE, 'String Inverters', 'Modular and easy to service. Multiple MPPT inputs cope with varied roof orientations and partial shading.', 'Rooftops · commercial buildings'),
      card('sol-inv-central', BLUE, 'Central Inverters', 'High-capacity units with centralised servicing, suited to large ground-mounted and captive plants.', 'Large ground-mount · captive'),
      card('sol-bolt', GREEN, 'Hybrid Inverters', 'Manage solar, battery and grid together for backup, peak shaving and higher self-consumption.', 'Hospitals · process plants · backup'),
      card('sol-inv-offgrid', PURPLE, 'Off-Grid / PCU', 'Charge controllers and inverters that run battery-backed standalone systems where the grid is weak.', 'Remote sites · farms · telecom'),
    ],
    servicesTitle: 'Inverter services',
    services: [
      { title: 'Supply & Installation', body: 'Right-sized inverters selected for your load, site and grid.' },
      { title: 'Service & AMC', body: 'Scheduled inverter servicing, firmware and electrical checks.' },
      { title: 'Repowering & Replacement', body: 'Swap ageing or failing units to restore full yield.' },
      { title: 'Monitoring & Diagnostics', body: 'Fault logs and alarms tied into your plant monitoring.' },
    ],
    ctas: quoteCta(),
  };
}

export function defaultSolarIndustriesContent(): SolarIndustriesContent {
  const industrial = [
    'Manufacturing',
    'Warehousing & Logistics',
    'Pharma & Life Sciences',
    'Food Processing',
    'Textiles & Garments',
    'Automotive & Components',
    'Cement & Steel',
    'Hospitals & Healthcare',
    'Education Campuses',
    'Commercial Buildings',
    'Shopping Malls & Retail',
    'Hotels & Resorts',
    'Data Centres & Telecom',
    'Banks & Offices',
    'Government & Public Buildings',
    'Cold Storage & Agriculture',
  ];
  const residential = [
    'Residential Apartments',
    'Gated Communities',
    'Housing Societies',
    'Independent Homes & Villas',
    'Builders & Developers',
    'Senior Living',
  ];
  return {
    section: {},
    head: head(
      'WHO WE POWER',
      'orange',
      'Solar for every facility — and every home',
      'From heavy industry to hospitals to the apartment you live in, we size and build solar around how you actually use power.'
    ),
    pills: [...industrial.map((label) => ({ label })), ...residential.map((label) => ({ label, residential: true }))],
    durationSeconds: 80,
    reverse: false,
    ctas: quoteCta(),
  };
}

export function defaultSolarProject(): SolarProject {
  return { image: US(SOLAR_IMAGES.warehouse, 600), position: '50% 50%', tag: 'SOLAR EPC', title: 'New project', body: 'One-line project summary.' };
}

export function defaultSolarProjectsContent(): SolarProjectsContent {
  const project = (image: string, position: string, tag: string, title: string, body: string): SolarProject => ({
    image: US(image, 600),
    position,
    tag,
    title,
    body,
  });
  return {
    section: {},
    head: head(
      'OUR PROJECTS',
      'orange',
      "Solar we've engineered, built and maintained",
      'A glimpse of the facilities we power — from textile mills and warehouses to hospitals, campuses and housing societies.'
    ),
    items: [
      project(SOLAR_IMAGES.textile, '50% 40%', 'SOLAR EPC', 'Textile Manufacturing Plant, Gujarat', '1.2 MW rooftop solar EPC for a high-load textile facility.'),
      project(SOLAR_IMAGES.warehouse, '50% 30%', 'SOLAR EPC', 'Warehouse & Logistics Hub', 'Rooftop solar engineered around round-the-clock loads.'),
      project(SOLAR_IMAGES.hospital, '50% 35%', 'HYBRID + BESS', 'Hospital Campus', 'Solar with battery backup for critical-care continuity.'),
      project(SOLAR_IMAGES.rooftop, '50% 50%', 'GROUND-MOUNT', 'Captive Solar Plant', 'Ground-mounted array supplying a large industrial site.'),
      project(SOLAR_IMAGES.apartment, '50% 25%', 'RESIDENTIAL', 'Apartment Society Rooftop', 'Shared rooftop solar cutting common-area power bills.'),
      project(SOLAR_IMAGES.warehouse, '20% 60%', 'AMC · O&M', 'Food Processing Plant', 'Preventive maintenance and monitoring for lasting yield.'),
      project(SOLAR_IMAGES.textile, '30% 55%', 'SOLAR EPC', 'Corporate Campus', 'Rooftop solar with energy monitoring across buildings.'),
      project(SOLAR_IMAGES.hospital, '60% 60%', 'CARPORT', 'Education Campus', 'Solar canopies and rooftops powering a campus.'),
    ],
    durationSeconds: 70,
    reverse: true,
    ctas: quoteCta(),
  };
}

export function defaultSolarCtaContent(): SolarCtaContent {
  return {
    section: {},
    orb: orb('orange', { size: '420px', top: '', right: '-80px', bottom: '-180px', opacity: '0.22' }),
    title: { text: 'Ready to cut your power cost with solar that lasts?' },
    body: { text: 'Share your site details and our engineers will come back with a tailored solar proposal.' },
    ctas: [
      { label: 'Get a Solar Proposal →', href: QUOTE_HREF, variant: 'primary' },
      { label: 'Call {{emergencyPhone}}', href: 'tel:{{emergencyPhone}}', variant: 'ghost' },
    ],
  };
}

export function defaultSolarSectionContent(type: string): Record<string, unknown> | null {
  switch (type) {
    case 'solar_hero':
      return defaultSolarHeroContent();
    case 'solar_delivery':
      return defaultSolarDeliveryContent();
    case 'solar_banner':
      return defaultSolarBannerContent('epc');
    case 'solar_e2e':
      return defaultSolarE2eContent('timeline');
    case 'solar_types':
      return defaultSolarTypesContent();
    case 'solar_process':
      return defaultSolarProcessContent();
    case 'solar_performance':
      return defaultSolarPerformanceContent();
    case 'solar_expertise':
      return defaultSolarExpertiseContent();
    case 'solar_inverters':
      return defaultSolarInvertersContent();
    case 'solar_industries':
      return defaultSolarIndustriesContent();
    case 'solar_projects':
      return defaultSolarProjectsContent();
    case 'solar_cta':
      return defaultSolarCtaContent();
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Merge defaults into saved content                                   */
/* ------------------------------------------------------------------ */

const isPlain = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** Deep-merge plain objects (arrays and scalars from `src` replace the defaults). */
function mergeDeep(base: unknown, src: unknown): unknown {
  if (!isPlain(base) || !isPlain(src)) return src === undefined || src === null ? base : src;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined || v === null) continue;
    out[k] = isPlain(base[k]) && isPlain(v) ? mergeDeep(base[k], v) : v;
  }
  return out;
}

const arr = <V>(v: unknown): V[] => (Array.isArray(v) ? (v as V[]).filter((x) => x && typeof x === 'object') : []);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * Fill any missing keys from defaults (deep merge of objects) and coerce every list so partially saved or
 * hand-edited JSON never crashes the renderer / editor.
 */
export function withSolarDefaults<T extends object>(type: SolarSectionType, raw: unknown): T {
  const base = defaultSolarSectionContent(type) as Record<string, unknown>;
  const src = isPlain(raw) ? raw : {};
  // A saved banner / e2e keeps its own variant, so merge against that variant's defaults.
  let seed = base;
  if (type === 'solar_banner' && typeof src.tone === 'string') {
    seed = defaultSolarBannerContent(src.tone === 'green' ? 'amc' : src.tone === 'purple' ? 'expertise' : 'epc') as unknown as Record<string, unknown>;
  }
  if (type === 'solar_e2e' && (src.variant === 'loop' || src.variant === 'stepper' || src.variant === 'timeline')) {
    seed = defaultSolarE2eContent(src.variant) as unknown as Record<string, unknown>;
  }
  const out = mergeDeep(seed, src) as Record<string, unknown>;

  if (Array.isArray(out.ctas) || 'ctas' in seed) out.ctas = arr<CtaButton>(out.ctas);
  if (!isPlain(out.section)) out.section = {};

  switch (type) {
    case 'solar_hero': {
      out.slides = arr<SolarHeroSlide>(out.slides).map((s) => ({ ...s, words: strs(s.words), ctas: arr<SolarCta>(s.ctas) }));
      const nodes = out.nodes as SolarHeroContent['nodes'];
      out.nodes = { ...nodes, items: arr<SolarHeroNode>(nodes?.items) };
      const stats = out.stats as SolarHeroContent['stats'];
      out.stats = { ...stats, items: arr<SolarHeroStat>(stats?.items) };
      break;
    }
    case 'solar_delivery':
      out.cards = arr<SolarPillarCard>(out.cards).map((c) => ({ ...c, items: strs(c.items) }));
      break;
    case 'solar_banner':
      out.chips = strs(out.chips);
      break;
    case 'solar_e2e': {
      out.steps = arr<SolarE2eStep>(out.steps);
      const p = out.promise as SolarE2eContent['promise'];
      out.promise = { ...p, items: strs(p?.items) };
      break;
    }
    case 'solar_types':
      out.items = arr<SolarTypeItem>(out.items).map((it) => ({ ...it, chips: strs(it.chips) }));
      break;
    case 'solar_process':
      out.steps = arr<SolarProcessStep>(out.steps);
      break;
    case 'solar_performance': {
      const intro = out.intro as SolarPerformanceContent['intro'];
      out.intro = {
        ...intro,
        paragraphs: strs(intro?.paragraphs),
        card: { ...intro?.card, items: strs(intro?.card?.items), ctas: arr<CtaButton>(intro?.card?.ctas) },
      };
      const d = out.dashboard as SolarPerformanceContent['dashboard'];
      out.dashboard = {
        ...d,
        orbs: arr<SolarOrb>(d?.orbs),
        monitor: { ...d?.monitor, metrics: arr<SolarMetric>(d?.monitor?.metrics) },
        output: { ...d?.output, bars: arr<SolarBar>(d?.output?.bars) },
        losses: { ...d?.losses, segments: arr<SolarLossSegment>(d?.losses?.segments) },
        health: { ...d?.health, legend: arr<SolarLegendItem>(d?.health?.legend) },
      };
      const roi = out.roi as SolarPerformanceContent['roi'];
      out.roi = { ...roi, points: strs(roi?.points) };
      const svc = out.services as SolarPerformanceContent['services'];
      out.services = { ...svc, items: arr<SolarService>(svc?.items) };
      break;
    }
    case 'solar_expertise':
      out.cards = arr<SolarExpertiseCard>(out.cards);
      out.strip = strs(out.strip);
      break;
    case 'solar_inverters':
      out.cards = arr<SolarInverterCard>(out.cards);
      out.services = arr<SolarInverterService>(out.services);
      break;
    case 'solar_industries':
      out.pills = arr<SolarIndustryPill>(out.pills);
      break;
    case 'solar_projects':
      out.items = arr<SolarProject>(out.items);
      break;
    default:
      break;
  }
  return out as T;
}

/* ------------------------------------------------------------------ */
/* Page seed                                                           */
/* ------------------------------------------------------------------ */

export const SOLAR_SLUG = 'solar';

export const SOLAR_PAGE_META = {
  title: 'Solar Solutions',
  meta_title: 'Solar Energy Solutions | EPC, AMC & O&M | Zigma Technologies',
  meta_description:
    'Zigma Technologies delivers end-to-end Solar EPC, AMC and O&M for Indian industry — rooftop, ground-mounted, hybrid and off-grid solar systems engineered by 150+ certified engineers.',
};

export const SOLAR_SEED_SECTIONS: Array<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
}> = [
  { type: 'solar_hero', section_key: 'top', title: 'Page hero (3 slides, capability nodes, stats bar)', content_json: defaultSolarHeroContent() },
  { type: 'solar_delivery', section_key: 'services', title: 'What we deliver (3 pillar cards)', content_json: defaultSolarDeliveryContent() },
  { type: 'solar_banner', section_key: 'epc', title: 'Part banner 01 · Solar EPC', content_json: defaultSolarBannerContent('epc') },
  { type: 'solar_e2e', section_key: 'epc-e2e', title: 'End-to-end · Solar EPC (timeline)', content_json: defaultSolarE2eContent('timeline') },
  { type: 'solar_types', section_key: 'types', title: 'Solar system types (accordion + illustrations)', content_json: defaultSolarTypesContent() },
  { type: 'solar_process', section_key: 'process', title: 'EPC process (5 steps)', content_json: defaultSolarProcessContent() },
  { type: 'solar_banner', section_key: 'amc-om', title: 'Part banner 02 · Solar AMC – O&M', content_json: defaultSolarBannerContent('amc') },
  { type: 'solar_e2e', section_key: 'amc-e2e', title: 'End-to-end · AMC & O&M (loop)', content_json: defaultSolarE2eContent('loop') },
  { type: 'solar_performance', section_key: 'performance', title: 'O&M performance (intro, dashboard, ROI calculator, services)', content_json: defaultSolarPerformanceContent() },
  { type: 'solar_banner', section_key: 'expertise-main', title: 'Part banner 03 · Solar Expertise & Inverters', content_json: defaultSolarBannerContent('expertise') },
  { type: 'solar_e2e', section_key: 'inv-e2e', title: 'End-to-end · Expertise & Inverters (stepper)', content_json: defaultSolarE2eContent('stepper') },
  { type: 'solar_expertise', section_key: 'expertise', title: 'Zigma expertise (glass cards + tech strip)', content_json: defaultSolarExpertiseContent() },
  { type: 'solar_inverters', section_key: 'inverters', title: 'Solar inverters (flow diagram, cards, services)', content_json: defaultSolarInvertersContent() },
  { type: 'solar_industries', section_key: 'industries', title: 'Who we power (marquee)', content_json: defaultSolarIndustriesContent() },
  { type: 'solar_projects', section_key: 'projects', title: 'Our projects (thumbnail marquee)', content_json: defaultSolarProjectsContent() },
  { type: 'solar_cta', section_key: 'contact', title: 'CTA band', content_json: defaultSolarCtaContent() },
];
