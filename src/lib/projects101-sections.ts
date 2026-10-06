import {
  ABOUT_TYPOGRAPHY_VERSION,
  type CtaButton,
  type ElementStyle,
  type EyebrowEl,
  type SectionBox,
  type TextEl,
} from '@/lib/about-sections';
import type { LifeColumns, LifeHighlight } from '@/lib/life-sections';
import {
  IND101_IMAGES,
  defaultInd101CtaContent,
  defaultInd101HeroContent,
  defaultInd101StatsContent,
} from '@/lib/industries101-sections';

/**
 * Projects 101 page (/projects101, optional replacement for /projects).
 *
 * The hero, stat strip and CTA band reuse the Industries 101 section types (ind101_hero /
 * ind101_stats / ind101_cta, identical design). This file adds the two project-specific types:
 *   - pj101_projects: heading, optional category filter, project cards, detail popup and the
 *     running thumbnail strip (they share one project list, so they live in one section);
 *   - pj101_ongoing: "what we're building" cards with an animated stage tracker.
 *
 * Empty style fields fall back to the scoped `.pj101-*` CSS defaults, which mirror the approved
 * Projects101 HTML design.
 */

export const PROJECTS101_SECTION_TYPES = ['pj101_projects', 'pj101_ongoing'] as const;
export type Projects101SectionType = (typeof PROJECTS101_SECTION_TYPES)[number];

export function isProjects101SectionType(type: string): type is Projects101SectionType {
  return (PROJECTS101_SECTION_TYPES as readonly string[]).includes(type);
}

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

/** Built-in placeholder artwork shown until a project photo is set. */
export type Pj101Illustration = 'epc' | 'ups' | 'hybrid' | 'om';

export const PJ101_ILLUSTRATION_OPTIONS: Array<{ value: Pj101Illustration; label: string }> = [
  { value: 'epc', label: 'Solar panels + sun' },
  { value: 'ups', label: 'UPS cabinets' },
  { value: 'hybrid', label: 'Solar + battery bank' },
  { value: 'om', label: 'Panels + maintenance gear' },
];

export type Pj101Category = {
  /** Matches a project's category (manual list) or an Inventory category slug */
  key: string;
  /** Tag / filter label */
  label: string;
  /** Accent: card bar, tag, link, popup capacity */
  color: string;
  illustration: Pj101Illustration;
  /** Hide this category's pill in the filter bar */
  hideInFilter?: boolean;
};

export type Pj101Project = {
  hidden?: boolean;
  title: string;
  /** Category key */
  category: string;
  /** Big number on the card, e.g. "320 kW"; non-numeric text renders smaller (see capacityIsText) */
  capacity?: string;
  /** Show the capacity as a short label (e.g. "Petroleum Project") instead of a big number */
  capacityIsText?: boolean;
  location?: string;
  /** ISO date (yyyy-mm-dd) */
  date?: string;
  /** Shown instead of the formatted date (e.g. "2024" or "Q3 2025") */
  dateLabel?: string;
  /** Comma separated: card line + popup "Scope of work" chips */
  scope?: string;
  image?: string;
  /** YouTube / Vimeo link or a video file; shows a play button */
  video?: string;
  description?: string;
  /** Optional detail page (popup link) */
  href?: string;
};

export type Pj101DateFormat = 'day-month-year' | 'month-year' | 'year' | 'iso';

export type Pj101Head = {
  hidden?: boolean;
  eyebrow: EyebrowEl;
  title: TextEl;
  highlight?: LifeHighlight;
  subtitle: TextEl;
  count: {
    hidden?: boolean;
    /** {count} is replaced with the number of cards shown */
    template: string;
    templateOne: string;
    style?: ElementStyle;
  };
  marginBottom?: string;
};

export type Pj101Source = 'manual' | 'catalog';

export type Pj101ProjectsContent = {
  section: SectionBox;
  head: Pj101Head;
  source: Pj101Source;
  catalog: {
    /** Inventory category slug; empty = all */
    category?: string;
    featuredOnly?: boolean;
    limit?: number;
    /** Popup link to the /projects/[slug] case study page */
    linkToDetail?: boolean;
  };
  categories: Pj101Category[];
  projects: Pj101Project[];
  filter: {
    hidden?: boolean;
    allLabel: string;
    showDots?: boolean;
    align?: 'left' | 'center' | 'right';
    marginBottom?: string;
  };
  emptyText: string;
  grid: { columns: LifeColumns; gap?: string; reveal?: boolean };
  card: {
    background?: string;
    border?: string;
    radius?: string;
    paddingTop?: string;
    paddingX?: string;
    paddingBottom?: string;
    gap?: string;
    shadow?: string;
    hoverShadow?: string;
    hoverLift?: boolean;
    /** Colored bar on cards without media */
    barHeight?: string;
    showMedia?: boolean;
    mediaAspect?: string;
    mediaBackground?: string;
    mediaZoom?: boolean;
    showTag?: boolean;
    showCapacity?: boolean;
    showLocation?: boolean;
    showDate?: boolean;
    dateFormat?: Pj101DateFormat;
    showScope?: boolean;
    showLink?: boolean;
    linkLabel: string;
    tagStyle?: ElementStyle;
    capacityStyle?: ElementStyle;
    titleStyle?: ElementStyle;
    chipStyle?: ElementStyle;
    scopeStyle?: ElementStyle;
    linkStyle?: ElementStyle;
  };
  popup: {
    enabled: boolean;
    showCounter?: boolean;
    showNav?: boolean;
    showFullscreen?: boolean;
    labels: {
      installedCapacity: string;
      projectType: string;
      location: string;
      date: string;
      category: string;
      capacity: string;
      scope: string;
      overview: string;
    };
    showDetailLink?: boolean;
    detailLinkLabel: string;
    ctas: CtaButton[];
    backdrop?: string;
    maxWidth?: string;
    radius?: string;
    background?: string;
  };
  strip: {
    hidden?: boolean;
    /** Seconds for one full loop */
    speedSeconds?: number;
    direction?: 'ltr' | 'rtl';
    pauseOnHover?: boolean;
    itemWidth?: string;
    itemHeight?: string;
    itemRadius?: string;
    itemBorder?: string;
    gap?: string;
    background?: string;
    paddingY?: string;
    showCaption?: boolean;
    /** Prefix captions with the capacity (numeric capacities only) */
    captionCapacity?: boolean;
    captionMaxChars?: number;
    clickOpensPopup?: boolean;
  };
};

export type Pj101OngoingItem = {
  hidden?: boolean;
  title: string;
  /** Category pill text */
  category: string;
  description: string;
  image?: string;
  illustration: Pj101Illustration;
  /** Index of the step in progress (earlier steps are done); = steps count when all are done */
  activeStep: number;
  /** Overrides the section's status label */
  status?: string;
  /** Small dashed tag (e.g. "Sample · replace"); empty = hidden */
  note?: string;
};

export type Pj101OngoingContent = {
  section: SectionBox;
  head: Pj101Head;
  items: Pj101OngoingItem[];
  steps: string[];
  statusLabel: string;
  theme: {
    /** Left bar, category pill, step fills */
    gradient?: string;
    /** Status dot / text, thumbnail art */
    accent?: string;
    barWidth?: string;
  };
  columns: LifeColumns;
  gap?: string;
  reveal?: boolean;
  animateSteps?: boolean;
  card: {
    background?: string;
    border?: string;
    radius?: string;
    padding?: string;
    shadow?: string;
    hoverShadow?: string;
    hoverLift?: boolean;
    showStatus?: boolean;
    showNote?: boolean;
    showCategory?: boolean;
    showThumb?: boolean;
    showDescription?: boolean;
    showSteps?: boolean;
    thumbWidth?: string;
    thumbHeight?: string;
    titleStyle?: ElementStyle;
    bodyStyle?: ElementStyle;
    categoryStyle?: ElementStyle;
    statusStyle?: ElementStyle;
    stepStyle?: ElementStyle;
  };
};

/* ------------------------------------------------------------------ */
/* Defaults (mirror the approved Projects101 HTML)                     */
/* ------------------------------------------------------------------ */

export function defaultPj101Categories(): Pj101Category[] {
  return [
    { key: 'epc', label: 'Solar EPC', color: 'var(--orange)', illustration: 'epc' },
    { key: 'ups', label: 'UPS', color: 'var(--cyan)', illustration: 'ups' },
    { key: 'hybrid', label: 'Solar Hybrid', color: 'var(--green)', illustration: 'hybrid' },
    { key: 'om', label: 'Solar Maintenance', color: 'var(--purple)', illustration: 'om' },
  ];
}

type ProjectSeed = [category: string, capacity: string, title: string, location: string, date: string, scope: string, capacityIsText?: boolean];

const PROJECT_SEEDS: ProjectSeed[] = [
  ['hybrid', 'Petroleum Project', 'Studer Hybrid Power Solution with Lithium Batteries', '', '2025-11-20', 'Solar Hybrid System', true],
  ['ups', '320 kW', 'ABB 320 kW UPS Installation', 'Bangalore', '2023-03-12', 'UPS Sales & Services'],
  ['om', '200 kW', 'AMC Engineering College', 'Bangalore', '2023-06-05', 'Solar Maintenance, Thermal Systems'],
  ['epc', '55 kW', 'Mysore Drier Tech', 'Tumkur', '2023-05-04', 'Commercial Services, Panels Installation'],
  ['epc', '600 kW', 'Sri Rajalakshimi Agro Foods', 'Tumkur', '2023-05-03', 'Commercial Services, Panels Installation'],
  ['epc', '200 kW', 'Karnataka Rice Industries', 'Tumkur', '2022-06-06', 'Commercial Services, Panels Installation'],
  ['epc', '149 kW', 'Shiva Stones', 'Tumkur', '2022-05-02', 'Commercial Services, Panels Installation'],
  ['epc', '200 kW', 'Eshwari Agro Foods', 'Tumkur', '2022-05-01', 'Commercial Services, Panels Installation'],
  ['ups', '90 kVA', 'Chennai Emudra Ltd Data Centre', 'Chennai', '2021-06-07', 'UPS Sales & Services'],
];

export function defaultPj101Projects(): Pj101Project[] {
  return PROJECT_SEEDS.map(([category, capacity, title, location, date, scope, capacityIsText]) => ({
    title,
    category,
    capacity,
    ...(capacityIsText ? { capacityIsText: true } : {}),
    location,
    date,
    scope,
  }));
}

export function defaultPj101Project(): Pj101Project {
  return { title: 'New project', category: 'epc', capacity: '100 kW', location: '', date: '', scope: '' };
}

export function defaultPj101ProjectsContent(): Pj101ProjectsContent {
  return {
    section: { tone: 'light', bgColor: 'var(--gray-100)' },
    head: {
      eyebrow: { text: 'RECENTLY DONE PROJECTS', line: false, style: { color: 'var(--orange)' } },
      title: { text: 'Power Systems Running Across India' },
      subtitle: { text: 'Every project below was designed, supplied, installed and commissioned by our in-house engineering team.' },
      count: { template: '{count} PROJECTS', templateOne: '{count} PROJECT' },
    },
    source: 'manual',
    catalog: { featuredOnly: false, linkToDetail: true },
    categories: defaultPj101Categories(),
    projects: defaultPj101Projects(),
    filter: { hidden: true, allLabel: 'All projects', showDots: true, align: 'left' },
    emptyText: 'No projects in this category yet.',
    grid: { columns: { desktop: 3, tablet: 2, mobile: 1 }, reveal: true },
    card: {
      hoverLift: true,
      showMedia: true,
      mediaZoom: true,
      showTag: true,
      showCapacity: true,
      showLocation: true,
      showDate: true,
      dateFormat: 'day-month-year',
      showScope: true,
      showLink: true,
      linkLabel: 'View project details →',
    },
    popup: {
      enabled: true,
      showCounter: true,
      showNav: true,
      showFullscreen: true,
      labels: {
        installedCapacity: 'Installed capacity',
        projectType: 'Project type',
        location: 'Location',
        date: 'Date',
        category: 'Category',
        capacity: 'Capacity',
        scope: 'Scope of work',
        overview: 'Overview',
      },
      showDetailLink: true,
      detailLinkLabel: 'View full case study →',
      ctas: [{ label: 'Request a similar project →', href: '/contact#contact-form', variant: 'primary' }],
    },
    strip: {
      speedSeconds: 50,
      direction: 'ltr',
      pauseOnHover: true,
      showCaption: true,
      captionCapacity: true,
      captionMaxChars: 30,
      clickOpensPopup: true,
    },
  };
}

export const PJ101_DEFAULT_STEPS = ['Design', 'Supply', 'Installation', 'Commissioning'];

export function defaultPj101OngoingItem(): Pj101OngoingItem {
  return {
    title: 'New ongoing project',
    category: 'Solar EPC',
    description: 'Short description of the work in progress.',
    illustration: 'epc',
    activeStep: 1,
  };
}

export function defaultPj101OngoingContent(): Pj101OngoingContent {
  const note = 'Sample · replace';
  return {
    section: { tone: 'light', bgColor: 'var(--white)' },
    head: {
      eyebrow: { text: 'ONGOING PROJECTS', line: false, style: { color: '#1A7CFF' } },
      title: { text: "What We're Building Right Now" },
      subtitle: { text: 'A look at installations currently in progress across our solar, UPS and hybrid power teams.' },
      count: { template: '{count} IN PROGRESS', templateOne: '{count} IN PROGRESS' },
    },
    items: [
      {
        title: 'Industrial Rooftop Solar EPC',
        category: 'Solar EPC',
        description: 'Design, supply, installation and commissioning of a grid-connected commercial rooftop solar plant.',
        illustration: 'epc',
        activeStep: 2,
        note,
      },
      {
        title: 'Industrial UPS Installation',
        category: 'UPS',
        description: 'Supply and commissioning of a high-capacity online UPS with battery bank for critical loads.',
        illustration: 'ups',
        activeStep: 3,
        note,
      },
      {
        title: 'Hybrid Solar + Lithium Battery System',
        category: 'Solar Hybrid',
        description: 'Studer hybrid inverter system with lithium storage for reliable power at remote sites.',
        illustration: 'hybrid',
        activeStep: 1,
        note,
      },
    ],
    steps: [...PJ101_DEFAULT_STEPS],
    statusLabel: 'In Progress',
    theme: {},
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    reveal: true,
    animateSteps: true,
    card: {
      hoverLift: true,
      showStatus: true,
      showNote: true,
      showCategory: true,
      showThumb: true,
      showDescription: true,
      showSteps: true,
    },
  };
}

/** Hero / stats / CTA: Industries 101 types with the Projects101 copy. */
export function defaultPj101HeroContent() {
  const base = defaultInd101HeroContent();
  return {
    ...base,
    heroHeight: 'auto-60' as const,
    background: { ...base.background, items: [{ ...IND101_IMAGES.hero }] },
    breadcrumb: { ...base.breadcrumb, items: [{ label: 'Home', href: '/' }, { label: 'Projects' }] },
    eyebrow: { text: 'OUR WORK', line: false, style: { color: 'var(--orange)' } },
    title: { text: "Projects We've Delivered" },
    lead: {
      text: 'From 600 kW solar rooftops for agro industries to 320 kW UPS systems and lithium-backed hybrid power for petroleum sites — a look at recent installations engineered and commissioned by Zigma.',
    },
  };
}

export function defaultPj101StatsContent() {
  return {
    ...defaultInd101StatsContent(),
    numberStyle: { fontFamily: 'display', fontSize: '2.1rem' },
  };
}

export function defaultPj101CtaContent() {
  const base = defaultInd101CtaContent();
  return {
    ...base,
    eyebrow: { text: 'HAVE A PROJECT IN MIND?', line: false, style: { color: 'var(--cyan)' } },
    title: { text: "Let's Engineer Your Next Power Project" },
    body: {
      text: 'Tell us about your site, load and timeline — our engineers will respond with a tailored solar, UPS or hybrid power proposal.',
      style: { maxWidth: '600px' },
    },
    ctas: [{ label: 'Request a Proposal →', href: '/contact#contact-form', variant: 'primary' as const }],
  };
}

export function defaultProjects101SectionContent(type: string): Record<string, unknown> | null {
  switch (type) {
    case 'pj101_projects':
      return defaultPj101ProjectsContent();
    case 'pj101_ongoing':
      return defaultPj101OngoingContent();
    default:
      return null;
  }
}

/**
 * Fill any missing top-level keys from defaults (one level of object merge) so partially
 * saved or hand-edited JSON never crashes the renderer / editor.
 */
export function withProjects101Defaults<T extends object>(type: Projects101SectionType, raw: unknown): T {
  const base = defaultProjects101SectionContent(type) as Record<string, unknown>;
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
  const head = out.head as Pj101Head;
  out.head = { ...head, count: { ...(base.head as Pj101Head).count, ...(head?.count || {}) } };
  if (type === 'pj101_projects') {
    out.categories = arr<Pj101Category>(out.categories);
    out.projects = arr<Pj101Project>(out.projects);
    const popup = out.popup as Pj101ProjectsContent['popup'];
    const basePopup = base.popup as Pj101ProjectsContent['popup'];
    out.popup = { ...popup, labels: { ...basePopup.labels, ...(popup?.labels || {}) }, ctas: arr<CtaButton>(popup?.ctas) };
  }
  if (type === 'pj101_ongoing') {
    out.items = arr<Pj101OngoingItem>(out.items);
    out.steps = Array.isArray(out.steps) ? (out.steps as unknown[]).map((s) => String(s ?? '')) : [...PJ101_DEFAULT_STEPS];
  }
  out.typographyVersion = ABOUT_TYPOGRAPHY_VERSION;
  return out as T;
}

export const PROJECTS101_SLUG = 'projects101';

export const PROJECTS101_SEED_SECTIONS: Array<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
}> = [
  { type: 'ind101_hero', section_key: 'top', title: 'Page hero', content_json: defaultPj101HeroContent() },
  { type: 'ind101_stats', section_key: 'pj101-stats', title: 'Quick stat strip', content_json: defaultPj101StatsContent() },
  { type: 'pj101_projects', section_key: 'projects', title: 'Recently done projects (cards, popup, running strip)', content_json: defaultPj101ProjectsContent() },
  { type: 'pj101_ongoing', section_key: 'ongoing', title: 'Ongoing projects', content_json: defaultPj101OngoingContent() },
  { type: 'ind101_cta', section_key: 'contact', title: 'CTA band', content_json: defaultPj101CtaContent() },
];
