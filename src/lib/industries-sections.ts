import {
  ABOUT_TYPOGRAPHY_VERSION,
  ABOUT_ICON_PRESETS,
  type CtaButton,
  type ElementStyle,
  type IconEl,
  type SectionBox,
  type TextEl,
} from '@/lib/about-sections';
import { CONTACT_ICON_PRESETS, type ContactAction, type ContactHeroContent, type ContactIconStyle } from '@/lib/contact-sections';
import { splitStatValue, withCareersDefaults, defaultCareersStatsContent, type CareersStatsContent } from '@/lib/careers-sections';
import { defaultCertsCtaContent, withCertsDefaults, type CertsCtaContent } from '@/lib/certifications-sections';
import { defaultPrivacyHeroContent, upgradeLegalHero } from '@/lib/privacy-sections';
import { withContactDefaults } from '@/lib/contact-sections';
import type { LegacyBgMedia, LegacyCardStyle, LegacySectionHeader } from '@/lib/legacy-sections';
import type { LifeColumns, LifeMediaItem } from '@/lib/life-sections';
import { INDUSTRY_DEFS, industryPublicPath } from '@/lib/industries';
import { INDUSTRY_HUB_IMAGES } from '@/lib/industry-hub-seed';
import { indIconFor } from '@/lib/ind-icons';

/**
 * Fully configurable Industries hub section family (page /industries):
 * industries_hero, industries_stats, industries_hub, industries_category, industries_cta.
 *
 * Hero / stats / CTA reuse the Contact hero, Legacy stat bar and Certifications CTA renderers with industries
 * defaults; the sector cards and category grids render with scoped `.ind-*` CSS. Defaults mirror the live
 * industries page. Headings / eyebrows follow Site Settings → Public typography.
 */

export const INDUSTRIES_SECTION_TYPES = [
  'industries_hero',
  'industries_stats',
  'industries_hub',
  'industries_category',
  'industries_cta',
] as const;
export type IndustriesSectionType = (typeof INDUSTRIES_SECTION_TYPES)[number];

export function isIndustriesSectionType(type: string): type is IndustriesSectionType {
  return (INDUSTRIES_SECTION_TYPES as readonly string[]).includes(type);
}

/** Older section types used by the live /industries page, and their replacement (industries page only). */
export const INDUSTRIES_UPGRADE_MAP: Record<string, IndustriesSectionType> = {
  page_hero: 'industries_hero',
  culture_stats: 'industries_stats',
  industry_hub: 'industries_hub',
  industry_category: 'industries_category',
  cta: 'industries_cta',
};

/* ------------------------------------------------------------------ */
/* Section content shapes                                              */
/* ------------------------------------------------------------------ */

export type IndustriesHeroContent = ContactHeroContent;
export type IndustriesStatsContent = CareersStatsContent;
export type IndustriesCtaContent = CertsCtaContent;

/** Icon box look for a whole section; a single icon's own settings win. */
export type IndustriesIconStyle = ContactIconStyle & {
  hoverBackground?: string;
  hoverColor?: string;
  /** Scale + tilt the icon when the card is hovered */
  animate?: boolean;
};

export type IndustriesHubCard = {
  hidden?: boolean;
  eyebrow: TextEl;
  title: TextEl;
  body: TextEl;
  /** Card background images / videos (several = cross-fading slideshow) */
  media: LifeMediaItem[];
  href: string;
  newTab?: boolean;
  /** Empty = the section's link label */
  linkLabel?: string;
};

export type IndustriesHubContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  header: LegacySectionHeader;
  /** "I'm looking for…" industry / city picker */
  tailor: { hidden?: boolean; position?: 'above' | 'below'; gap?: string };
  cards: IndustriesHubCard[];
  columns: LifeColumns;
  gap?: string;
  reveal?: boolean;
  card: LegacyCardStyle & {
    minHeight?: string;
    minHeightMobile?: string;
    /** Gradient over the picture (keeps the text readable) */
    overlay?: string;
    hoverBorderColor?: string;
    hoverShadow?: string;
    zoomOnHover?: boolean;
    mediaIntervalSeconds?: number;
    /** Max lines of the description (0 = no limit) */
    bodyLines?: number;
  };
  linkLabel: string;
  eyebrowStyle?: ElementStyle;
  titleStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
  linkStyle?: ElementStyle;
  linkHoverColor?: string;
};

export type IndustriesCategoryCard = ContactAction & {
  hidden?: boolean;
  title: TextEl;
  body: TextEl;
  icon?: IconEl;
  /** Images / videos above the text (several = cross-fading slideshow) */
  media: LifeMediaItem[];
  linkLabel?: string;
  /** Per-card accent; empty = the section accent */
  accent?: string;
};

export type IndustriesCategoryContent = {
  section: SectionBox;
  background: LegacyBgMedia;
  header: LegacySectionHeader;
  /** Category colour: icons, hover line, hover title, accent bar */
  accent: string;
  /** Short bar above the heading */
  accentBar: { hidden?: boolean; width?: string; height?: string; color?: string };
  cards: IndustriesCategoryCard[];
  columns: LifeColumns;
  gap?: string;
  reveal?: boolean;
  card: LegacyCardStyle & {
    hoverBorderColor?: string;
    hoverShadow?: string;
    /** Coloured line sliding in along the top on hover */
    topLine?: boolean;
    topLineHeight?: string;
    /** Whole card clickable when it has a link */
    stretchLink?: boolean;
    mediaHeight?: string;
    mediaIntervalSeconds?: number;
  };
  iconStyle: IndustriesIconStyle;
  titleStyle?: ElementStyle;
  titleHoverColor?: string;
  bodyStyle?: ElementStyle;
  linkStyle?: ElementStyle;
};

/* ------------------------------------------------------------------ */
/* Icon presets                                                        */
/* ------------------------------------------------------------------ */

export const INDUSTRIES_ICON_PRESETS: Array<{ key: string; label: string; svg: string }> = [
  { key: 'ind-server', label: 'Server rack (data centre)', svg: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M5 9.5h14M5 15h14"/><circle cx="8" cy="6" r="0.6" fill="currentColor" stroke="none"/><circle cx="8" cy="12" r="0.6" fill="currentColor" stroke="none"/>' },
  { key: 'ind-signal', label: 'Signal (digital / telecom)', svg: '<circle cx="6" cy="18" r="1.4"/><circle cx="18" cy="18" r="1.4"/><path d="M3 8c5-4 13-4 18 0M6 12c3-2.4 9-2.4 12 0"/>' },
  { key: 'ind-plane', label: 'Plane (airport / metro)', svg: '<path d="M22 3L11.5 13.5"/><path d="M22 3l-7 19-4.5-9L2 8z"/>' },
  { key: 'ind-factory', label: 'Factory (industrial)', svg: '<path d="M3 21h18M5 21V9l6-4 6 4v12M9 21v-6h6v6"/><path d="M15 9h3v12"/>' },
  { key: 'ind-city', label: 'City (smart cities)', svg: '<path d="M3 21h18"/><path d="M5 21V10l4-3v14"/><path d="M13 21V6l6-3v18"/>' },
  { key: 'ind-bolt', label: 'Bolt (power / EV)', svg: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>' },
  { key: 'ind-tower', label: 'Broadcast (telecom)', svg: '<path d="M5 12a7 7 0 0114 0M2 12a10 10 0 0120 0"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>' },
  { key: 'ind-port', label: 'Harbour (ports)', svg: '<path d="M2 21c3 1 6 1 9 0s6-1 9 0"/><path d="M5 21V10l7-6 7 6v11"/><path d="M9 21v-6h6v6"/>' },
  { key: 'ind-train', label: 'Train (railway)', svg: '<rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 11h16"/><path d="M8 21l-2-4h12l-2 4"/><circle cx="8" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="14" r="1" fill="currentColor" stroke="none"/>' },
  { key: 'ind-shield', label: 'Shield (government)', svg: '<path d="M12 2l9 4.5v3L12 14 3 9.5v-3z"/><path d="M3 9.5V19l9 4 9-4V9.5"/>' },
  { key: 'ind-hotel', label: 'Building (hospitality)', svg: '<path d="M3 21h18M6 21V8l6-5 6 5v13"/>' },
  { key: 'ind-cap', label: 'Graduation cap (education)', svg: '<path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M6 10v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M21 7.5V14"/>' },
  { key: 'ind-heart', label: 'Heart pulse (healthcare)', svg: '<path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6C19 16.65 12 21 12 21z"/><path d="M9 12h2l1-2 2 4 1-2h2"/>' },
  { key: 'ind-bank', label: 'Bank (finance)', svg: '<path d="M3 10l9-6 9 6"/><path d="M5 10v9M19 10v9M9 10v9M15 10v9"/><path d="M3 21h18"/>' },
  { key: 'ind-office', label: 'Office (corporate)', svg: '<rect x="4" y="8" width="16" height="13" rx="1"/><path d="M9 8V4h6v4"/><path d="M9 13h6M9 17h6"/>' },
  { key: 'ind-tower-block', label: 'Tower block (real estate)', svg: '<rect x="6" y="2" width="12" height="20" rx="1"/><path d="M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01"/><path d="M10 22v-4h4v4"/>' },
  { key: 'ind-people', label: 'Person (residential)', svg: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>' },
  { key: 'ind-shop', label: 'Shop (retail)', svg: '<path d="M3 9l1-5h16l1 5"/><path d="M4 9h16v11H4z"/><path d="M9 20v-6h6v6"/>' },
  { key: 'ind-car', label: 'Car (automotive)', svg: '<path d="M5 17h14M5 17a2 2 0 01-2-2v-2l2-5h10l3 5v2a2 2 0 01-2 2M5 17v2m14-2v2"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/>' },
  { key: 'ind-chart', label: 'Growth chart (MSME)', svg: '<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>' },
  { key: 'ind-flame', label: 'Flame (oil & gas)', svg: '<path d="M12 2c3 4 6 7.5 6 11a6 6 0 01-12 0c0-3.5 3-7 6-11z"/>' },
  { key: 'ind-map', label: 'Map (SEZ / parks)', svg: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>' },
  { key: 'ind-warehouse', label: 'Warehouse (logistics)', svg: '<path d="M3 21V9l9-6 9 6v12H3z"/><path d="M9 21v-8h6v8"/>' },
  { key: 'ind-wrench', label: 'Wrench (EPC)', svg: '<path d="M14.7 6.3a4 4 0 01-5.6 5.6L4 17l3 3 5.1-5.1a4 4 0 015.6-5.6z"/>' },
  { key: 'ind-flask', label: 'Flask (pharma / chemical)', svg: '<path d="M9 2v6L4 19a2 2 0 002 3h12a2 2 0 002-3l-5-11V2"/><path d="M9 2h6"/><path d="M7 15h10"/>' },
  { key: 'ind-cart', label: 'Cart (textile / apparel)', svg: '<path d="M4 4h4l1 3h9l-2 8H8L5 4z"/><path d="M8 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/><path d="M16 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>' },
  { key: 'ind-battery', label: 'Battery (renewables / BESS)', svg: '<rect x="2" y="8" width="18" height="8" rx="1.5"/><path d="M22 10v4"/><path d="M6 8v8M10 8v8"/>' },
  { key: 'ind-sun', label: 'Sun (microgrid / solar)', svg: '<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/><circle cx="12" cy="12" r="4"/>' },
];

export const INDUSTRIES_ALL_ICON_PRESETS = [...INDUSTRIES_ICON_PRESETS, ...CONTACT_ICON_PRESETS, ...ABOUT_ICON_PRESETS];

const preset = (key: string): IconEl => ({ svg: INDUSTRIES_ICON_PRESETS.find((p) => p.key === key)?.svg || '' });

/** Category colours from the industries design (#cat-infra / commercial / industrial / energy). */
export const INDUSTRIES_ACCENT_PRESETS = [
  { label: 'Cyan (infrastructure)', value: '#00D4FF' },
  { label: 'Orange (commercial)', value: '#FF6B1A' },
  { label: 'Green (industrial)', value: '#12B76A' },
  { label: 'Purple (energy)', value: '#A855F7' },
] as const;

/* ------------------------------------------------------------------ */
/* Defaults (mirror the live industries page)                          */
/* ------------------------------------------------------------------ */

const header = (eyebrow: string, title: string, subtitle: string, eyebrowColor = 'var(--orange)'): LegacySectionHeader => ({
  hidden: false,
  align: 'left',
  maxWidth: 'none',
  eyebrow: { text: eyebrow, line: false, size: 'base', style: { color: eyebrowColor } },
  title: { text: title },
  subtitle: { text: subtitle, style: { fontSize: '0.96rem', color: 'var(--graphite-500)', maxWidth: '640px' } },
  bar: { hidden: true },
});

export function defaultIndustriesHeroContent(): IndustriesHeroContent {
  const d = defaultPrivacyHeroContent();
  return {
    ...d,
    background: {
      ...d.background,
      items: [{ src: '/assets/images/city-skyline-with-solar-panels-and-indus.jpg', title: 'City skyline with solar panels and industrial infrastructure' }],
      position: 'center',
    },
    breadcrumb: { ...d.breadcrumb, items: [{ label: 'Home', href: '/' }, { label: 'Industries' }] },
    eyebrow: { ...d.eyebrow, text: 'WHO WE SERVE' },
    title: { text: 'Industries We Serve' },
    lead: {
      text: "From data centers to airports, hospitals to highway EV chargers — Zigma engineers power infrastructure across every sector that can't afford downtime. Twenty years of experience means we already understand how your industry runs.",
    },
  };
}

export function defaultIndustriesStatsContent(): IndustriesStatsContent {
  return {
    ...defaultCareersStatsContent(),
    items: [
      { value: '24', label: 'Industries Served' },
      { value: '1500', suffix: '+', label: 'Projects Delivered' },
      { value: '12', suffix: '+', label: 'Cities Across India' },
      { value: '20', suffix: '+', label: 'Years of Engineering' },
    ],
  };
}

/** One card per industry landing page (INDUSTRY_DEFS), like the live sector pathways grid. */
export function defaultIndustriesHubCards(): IndustriesHubCard[] {
  return INDUSTRY_DEFS.map((ind) => ({
    eyebrow: { text: ind.eyebrow },
    title: { text: ind.name },
    body: { text: ind.lead },
    media: [{ src: INDUSTRY_HUB_IMAGES[ind.key] || '/assets/images/city-skyline-with-solar-panels-and-indus.jpg', title: ind.name }],
    href: industryPublicPath(ind.key),
  }));
}

export function defaultIndustriesHubContent(): IndustriesHubContent {
  return {
    section: {
      tone: 'light',
      bgColor: '#FFFFFF',
      paddingTop: '4.5rem',
      paddingBottom: '5rem',
      paddingTopMobile: '3.25rem',
      paddingBottomMobile: '3.5rem',
    },
    background: { hidden: false, items: [], mobileItems: [], intervalSeconds: 6, motion: 'none', overlay: '' },
    header: {
      ...header('Sector pathways', 'Pick your operating environment', 'Each landing maps catalog solutions, proof, and a direct consultation path.', 'var(--cyan)'),
      marginBottom: '2rem',
      maxWidth: '820px',
      subtitle: { text: 'Each landing maps catalog solutions, proof, and a direct consultation path.' },
    },
    tailor: { hidden: false, position: 'above', gap: '2.25rem' },
    cards: defaultIndustriesHubCards(),
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    gap: '1.25rem',
    reveal: true,
    card: { minHeight: '280px', minHeightMobile: '220px', zoomOnHover: true, hoverLift: true, mediaIntervalSeconds: 5, bodyLines: 3 },
    linkLabel: 'View industry page →',
  };
}

type RawCard = [title: string, body: string, icon: string];

const catCards = (rows: RawCard[]): IndustriesCategoryCard[] =>
  rows.map(([title, body, icon]) => ({ title: { text: title }, body: { text: body }, icon: preset(icon), media: [] }));

const catSection = (bgColor: string): SectionBox => ({
  tone: 'light',
  bgColor,
  paddingTop: '4rem',
  paddingBottom: '4rem',
  paddingTopMobile: '3rem',
  paddingBottomMobile: '3rem',
});

function category(eyebrow: string, title: string, subtitle: string, accent: string, bg: string, rows: RawCard[]): IndustriesCategoryContent {
  return {
    section: catSection(bg),
    background: { hidden: false, items: [], mobileItems: [], intervalSeconds: 6, motion: 'none', overlay: '' },
    header: { ...header(eyebrow, title, subtitle), marginBottom: '2.2rem' },
    accent,
    accentBar: { hidden: false, width: '56px', height: '4px' },
    cards: catCards(rows),
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    gap: '1.5rem',
    reveal: true,
    card: { topLine: true, hoverLift: true, stretchLink: true, mediaIntervalSeconds: 5 },
    iconStyle: { animate: true },
  };
}

export function defaultIndustriesInfraContent(): IndustriesCategoryContent {
  return category(
    'INFRASTRUCTURE & UTILITIES',
    "Critical Infrastructure That Can't Go Dark",
    "Data centers, airports, telecom, and utility networks — where downtime isn't an inconvenience, it's a crisis.",
    '#00D4FF',
    'var(--white)',
    [
      ['Data Centers & IT Parks', 'N+1 UPS design, battery backup, and precision power for facilities where seconds of downtime cost millions.', 'ind-server'],
      ['Digital Infrastructure', 'Power engineering for the networks, edge nodes, and connectivity hubs that keep India online.', 'ind-signal'],
      ['Airport & Metro Infrastructure', 'Mission-critical power continuity for transit systems where public safety depends on uptime.', 'ind-plane'],
      ['Industrial Infrastructure', 'Electrical distribution, UPS, and engineering support built for round-the-clock industrial operations.', 'ind-factory'],
      ['Smart Cities & Utilities', 'Integrated solar, storage, and monitoring systems for next-generation urban infrastructure projects.', 'ind-city'],
      ['Power & Utility Infrastructure', 'Grid-support power engineering spanning generation, storage, and distribution reliability.', 'ind-bolt'],
      ['Telecom & Communication', 'Resilient backup power for towers, exchanges, and network operations centers nationwide.', 'ind-tower'],
      ['Ports & Maritime Infrastructure', 'Power continuity and electrical systems for cargo terminals, cranes, and port operations.', 'ind-port'],
      ['Railway Infrastructure', 'Signal, station, and depot power systems engineered for round-the-clock rail operations.', 'ind-train'],
    ]
  );
}

export function defaultIndustriesCommercialContent(): IndustriesCategoryContent {
  return category(
    'COMMERCIAL & INSTITUTIONAL',
    'Spaces Where People Depend on Power',
    "Hospitals, campuses, hotels, and public institutions — environments where reliability directly affects people's wellbeing.",
    '#FF6B1A',
    'var(--gray-100)',
    [
      ['Government & Public Sector', 'Compliant, audited power infrastructure for public buildings and government facilities.', 'ind-shield'],
      ['Hospitality & Hotels', 'Uninterrupted guest experience with seamless backup power and energy-efficient solar integration.', 'ind-hotel'],
      ['Educational Institutions', 'Reliable campus-wide power and solar rooftop systems that also cut long-term energy costs.', 'ind-cap'],
      ['Healthcare & Hospitals', 'Zero-tolerance backup power design for critical care, operating theatres, and life-support systems.', 'ind-heart'],
      ['Banking & Financial Services', 'Secure, redundant power for branches, data vaults, and always-on financial infrastructure.', 'ind-bank'],
      ['Corporate Campuses', 'Scalable UPS, solar, and EV charging bundled for large multi-building corporate environments.', 'ind-office'],
      ['Commercial Real Estate', 'Power infrastructure designed into new developments and retrofitted into existing properties.', 'ind-tower-block'],
      ['Residential Communities', 'Rooftop solar, backup power, and EV charging for apartment complexes and gated communities.', 'ind-people'],
      ['Retail & Shopping Malls', 'Reliable power, backup systems, and EV charging bays for retail and shopping destinations.', 'ind-shop'],
    ]
  );
}

export function defaultIndustriesIndustrialContent(): IndustriesCategoryContent {
  return category(
    'INDUSTRIAL & MANUFACTURING',
    'Built for Production-Line Reliability',
    'Factories, refineries, and logistics hubs — where every hour of downtime shows up directly on the balance sheet.',
    '#12B76A',
    'var(--white)',
    [
      ['Manufacturing', 'Industrial UPS, power electronics, and AMC support engineered for continuous production lines.', 'ind-factory'],
      ['Automotive Industry', 'Power infrastructure and EV charging for automotive manufacturing plants and dealership networks.', 'ind-car'],
      ['MSMEs & Small-Scale Industries', 'Right-sized, cost-effective power and solar solutions built for growing small industrial units.', 'ind-chart'],
      ['Oil & Gas Refineries', 'Hazardous-area rated electrical engineering and power continuity for refinery operations.', 'ind-flame'],
      ['Special Economic Zones (SEZ)', 'Master-planned power infrastructure for multi-tenant SEZ developments and industrial parks.', 'ind-map'],
      ['Warehouse, Logistics & Fleet Operators', 'Solar rooftop, backup power, and EV charging depots for warehousing and logistics fleets.', 'ind-warehouse'],
      ['Engineering, Procurement & Construction (EPC)', 'Partnering with EPC contractors as the power and electrical engineering subcontractor of record.', 'ind-wrench'],
      ['Pharmaceutical & Chemical Plants', 'Clean, uninterrupted power and process-critical electrical systems for regulated manufacturing.', 'ind-flask'],
      ['Textile & Apparel Manufacturing', 'Industrial power, UPS, and solar solutions sized for textile mills and apparel production units.', 'ind-cart'],
    ]
  );
}

export function defaultIndustriesEnergyContent(): IndustriesCategoryContent {
  return category(
    'ENERGY & MOBILITY',
    'Powering What Comes Next',
    'The fastest-growing part of our business — clean energy generation, storage, and electric mobility infrastructure.',
    '#A855F7',
    'var(--white)',
    [
      ['EV Charging Infrastructure', 'AC & DC charging networks for commercial, fleet, and public deployment across India.', 'ind-bolt'],
      ['Renewable Energy Developers', 'EPC and O&M partnership for solar and BESS developers building utility-scale projects.', 'ind-battery'],
      ['Microgrid & Energy Storage Projects', 'Standalone microgrids combining solar, BESS, and backup power for off-grid and hybrid sites.', 'ind-sun'],
    ]
  );
}

const INNER_CTA_GRADIENT =
  'radial-gradient(ellipse at 85% 20%, rgba(255,107,26,0.22), transparent 50%), linear-gradient(120deg, #071221 0%, #0c1c33 55%, #122844 100%)';

export function defaultIndustriesCtaContent(): IndustriesCtaContent {
  const d = defaultCertsCtaContent();
  return {
    ...d,
    section: {
      tone: 'dark',
      bgColor: '#071221',
      bgGradient: INNER_CTA_GRADIENT,
      paddingTop: '3.5rem',
      paddingBottom: '3.5rem',
      paddingTopMobile: '2.75rem',
      paddingBottomMobile: '2.75rem',
    },
    layout: 'split',
    align: 'left',
    maxWidth: '',
    eyebrow: { text: "DON'T SEE YOUR INDUSTRY?", line: false, size: 'base', style: { color: 'var(--cyan)' } },
    title: { text: "We've Probably Already Solved Your Power Problem" },
    body: {
      text: "Twenty years across 24+ sectors means there's a good chance we've already engineered something close to what you need.",
    },
    ctas: [{ label: 'Talk to an Industry Specialist →', href: '/contact?consult=1', variant: 'primary' }],
  };
}

const CATEGORY_DEFAULTS: Record<string, () => IndustriesCategoryContent> = {
  'cat-infra': defaultIndustriesInfraContent,
  'cat-commercial': defaultIndustriesCommercialContent,
  'cat-industrial': defaultIndustriesIndustrialContent,
  'cat-energy': defaultIndustriesEnergyContent,
};

export function defaultIndustriesSectionContent(type: string, sectionKey?: string | null): Record<string, unknown> | null {
  switch (type) {
    case 'industries_hero':
      return defaultIndustriesHeroContent();
    case 'industries_stats':
      return defaultIndustriesStatsContent();
    case 'industries_hub':
      return defaultIndustriesHubContent();
    case 'industries_category':
      return (CATEGORY_DEFAULTS[sectionKey || ''] || defaultIndustriesInfraContent)();
    case 'industries_cta':
      return defaultIndustriesCtaContent();
    default:
      return null;
  }
}

/**
 * Fill any missing top-level keys from defaults (one level of object merge) and normalize arrays
 * so partially saved or hand-edited JSON never crashes the renderer / editor.
 */
export function withIndustriesDefaults<T extends object>(type: IndustriesSectionType, raw: unknown): T {
  const base = defaultIndustriesSectionContent(type) as Record<string, unknown>;
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined || v === null) continue;
    const b = base[k];
    merged[k] =
      b && typeof b === 'object' && !Array.isArray(b) && typeof v === 'object' && !Array.isArray(v) ? { ...(b as object), ...(v as object) } : v;
  }
  /* Shared shapes: every key is already present, so the other family's defaults only normalize arrays. */
  if (type === 'industries_hero') return withContactDefaults<T>('contact_hero', merged);
  if (type === 'industries_stats') return withCareersDefaults<T>('careers_stats', merged);
  if (type === 'industries_cta') return withCertsDefaults<T>('certs_cta', merged);

  const out = merged;
  const arr = <V>(v: unknown): V[] => (Array.isArray(v) ? (v as V[]).filter((x) => x && typeof x === 'object') : []);
  const text = (v: unknown): TextEl => (v && typeof v === 'object' ? (v as TextEl) : { text: typeof v === 'string' ? v : '' });
  const bg = (out.background && typeof out.background === 'object' ? out.background : {}) as LegacyBgMedia;
  out.background = { ...bg, items: arr<LifeMediaItem>(bg.items), mobileItems: arr<LifeMediaItem>(bg.mobileItems) };
  if (type === 'industries_hub') {
    out.cards = arr<IndustriesHubCard>(out.cards).map((c) => ({
      ...c,
      eyebrow: text(c.eyebrow),
      title: text(c.title),
      body: text(c.body),
      media: arr<LifeMediaItem>(c.media),
      href: typeof c.href === 'string' ? c.href : '',
    }));
    out.tailor = out.tailor && typeof out.tailor === 'object' ? out.tailor : {};
    out.card = out.card && typeof out.card === 'object' ? out.card : {};
  }
  if (type === 'industries_category') {
    out.cards = arr<IndustriesCategoryCard>(out.cards).map((c) => ({
      ...c,
      title: text(c.title),
      body: text(c.body),
      icon: c.icon && typeof c.icon === 'object' ? c.icon : typeof c.icon === 'string' ? { svg: c.icon } : undefined,
      media: arr<LifeMediaItem>(c.media),
    }));
    out.accentBar = out.accentBar && typeof out.accentBar === 'object' ? out.accentBar : {};
    out.card = out.card && typeof out.card === 'object' ? out.card : {};
    out.iconStyle = out.iconStyle && typeof out.iconStyle === 'object' ? out.iconStyle : {};
  }
  out.typographyVersion = ABOUT_TYPOGRAPHY_VERSION;
  return out as T;
}

/* ------------------------------------------------------------------ */
/* Upgrade: old industries sections → industries_* (keeps content)     */
/* ------------------------------------------------------------------ */

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const s = (v: unknown) => str(v).trim();
const list = (v: unknown): Raw[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as Raw[]) : []);

const EYEBROW_CLASS_COLOR: Record<string, string> = {
  'eyebrow-orange': 'var(--orange)',
  'eyebrow-cyan': 'var(--cyan)',
  'eyebrow-green': 'var(--green)',
};

const INNER_HERO_SCRIM =
  'linear-gradient(105deg, rgba(4,10,20,0.92) 0%, rgba(4,10,20,0.72) 38%, rgba(4,10,20,0.35) 68%, rgba(4,10,20,0.18) 100%), radial-gradient(ellipse at 78% 30%, rgba(255,107,26,0.18), transparent 55%)';

function upgradeHero(o: Raw): IndustriesHeroContent {
  const up = upgradeLegalHero(o, defaultIndustriesHeroContent());
  const proof = Array.isArray(o.proofRail) ? (o.proofRail as unknown[]).filter((x) => s(x)) : [];
  const inner = Boolean(s(o.primaryCta) || s(o.secondaryCta) || proof.length || s(o.variant) === 'inner');
  if (!inner) return up;
  /* Heroes with buttons / proof rail used the compact inner-page layout with a left scrim. */
  return {
    ...up,
    heroHeight: 'auto',
    section: { ...up.section, paddingTop: '9.5rem', paddingBottom: '4.25rem', paddingTopMobile: '7.25rem', paddingBottomMobile: '2.75rem' },
    background: { ...up.background, overlay: INNER_HERO_SCRIM },
  };
}

function upgradeStats(o: Raw): IndustriesStatsContent {
  const d = defaultIndustriesStatsContent();
  const items = list(o.items);
  return { ...d, items: items.length ? items.map((it) => ({ ...splitStatValue(s(it.value)), label: str(it.label) })) : d.items };
}

function upgradeHub(o: Raw): IndustriesHubContent {
  const d = defaultIndustriesHubContent();
  const cards = list(o.cards);
  return {
    ...d,
    header: {
      ...d.header,
      eyebrow: { ...d.header.eyebrow, text: str(o.eyebrow) || 'Sector pathways', style: { color: EYEBROW_CLASS_COLOR[s(o.eyebrowClass)] || 'var(--cyan)' } },
      title: { text: str(o.title) },
      subtitle: { text: str(o.body) },
    },
    tailor: { ...d.tailor, hidden: o.showVisitTailor === false },
    cards: cards.length
      ? cards.map((c) => {
          const key = s(c.key);
          const image = s(c.image) || INDUSTRY_HUB_IMAGES[key] || '/assets/images/city-skyline-with-solar-panels-and-indus.jpg';
          return {
            eyebrow: { text: str(c.eyebrow) },
            title: { text: str(c.name) },
            body: { text: str(c.lead) },
            media: [{ src: image, title: str(c.name) }],
            href: s(c.href) || (key ? industryPublicPath(key) : '/industries'),
          };
        })
      : d.cards,
  };
}

function upgradeCategory(o: Raw): IndustriesCategoryContent {
  const d = defaultIndustriesInfraContent();
  const st = (color: unknown, font: unknown, size: unknown, weight?: unknown): ElementStyle => ({
    ...(s(color) ? { color: s(color) } : {}),
    ...(s(font) ? { fontFamily: s(font) } : {}),
    ...(s(size) ? { fontSize: s(size) } : {}),
    ...(s(weight) ? { fontWeight: s(weight) } : {}),
  });
  const pad = s(o.sectionPadding);
  const bg = s(o.sectionBg) || (s(o.tone) === 'gray' ? 'var(--gray-100)' : 'var(--white)');
  const cols = Math.max(1, Math.min(6, Number(o.gridColumns) || 3));
  const cardBorder = s(o.cardBorderColor);
  return {
    ...d,
    section: {
      ...d.section,
      bgColor: bg,
      ...(pad ? { paddingTop: pad, paddingBottom: pad, paddingTopMobile: pad, paddingBottomMobile: pad } : {}),
    },
    header: {
      ...d.header,
      marginBottom: s(o.headMarginBottom) || d.header.marginBottom,
      eyebrow: {
        ...d.header.eyebrow,
        text: str(o.eyebrow),
        style: {
          color: s(o.eyebrowColor) || EYEBROW_CLASS_COLOR[s(o.eyebrowClass)] || 'var(--orange)',
          ...st('', o.eyebrowFont, o.eyebrowSize, o.eyebrowWeight),
          ...(s(o.eyebrowLetterSpacing) ? { letterSpacing: s(o.eyebrowLetterSpacing) } : {}),
          ...(s(o.eyebrowTransform) ? { textTransform: s(o.eyebrowTransform) } : {}),
        },
      },
      title: { text: str(o.title), style: st(o.titleColor, o.titleFont, o.titleSize, o.titleWeight) },
      subtitle: { text: str(o.body), style: { ...d.header.subtitle.style, ...st(o.bodyColor, o.bodyFont, o.bodySize) } },
    },
    accent: s(o.catColor) || '#00D4FF',
    accentBar: {
      hidden: o.showAccentBar === false,
      width: s(o.accentBarWidth) || '56px',
      height: s(o.accentBarHeight) || '4px',
      color: s(o.accentBarColor),
    },
    cards: list(o.cards).map((c) => ({
      hidden: c.enabled === false,
      title: { text: str(c.title) },
      body: { text: str(c.body) },
      icon: { svg: s(c.icon) || indIconFor(str(c.title)) },
      media: [],
    })),
    columns: { desktop: cols, tablet: Math.min(cols, 2), mobile: 1 },
    gap: s(o.gridGap) || d.gap,
    card: {
      ...d.card,
      background: s(o.cardBg),
      border: cardBorder ? `1px solid ${cardBorder}` : '',
      radius: s(o.cardBorderRadius),
      padding: s(o.cardPadding),
    },
    iconStyle: { ...d.iconStyle, boxSize: s(o.iconSize) },
    titleStyle: st(o.cardTitleColor, o.cardTitleFont, o.cardTitleSize),
    bodyStyle: st(o.cardBodyColor, o.cardBodyFont, o.cardBodySize),
  };
}

function upgradeCta(o: Raw): IndustriesCtaContent {
  const d = defaultIndustriesCtaContent();
  const ctas: CtaButton[] = [];
  if (s(o.primaryCta)) ctas.push({ label: s(o.primaryCta), href: s(o.primaryHref) || '/contact', variant: 'primary' });
  if (s(o.secondaryCta) && s(o.secondaryHref)) ctas.push({ label: s(o.secondaryCta), href: s(o.secondaryHref), variant: 'ghost' });
  const inner = s(o.variant) === 'inner' || Boolean(s(o.eyebrow));
  const copy = { title: { text: str(o.title) }, body: { text: str(o.body) }, ctas };
  if (inner) {
    /* The inner band showed "Next step" when no eyebrow was set. */
    return { ...d, ...copy, eyebrow: { ...d.eyebrow, text: s(o.eyebrow) || 'Next step' } };
  }
  /* Plain centered band (navy gradient). */
  return {
    ...d,
    ...copy,
    layout: 'stacked',
    align: 'center',
    maxWidth: '780px',
    eyebrow: { ...d.eyebrow, text: '' },
    section: {
      tone: 'dark',
      bgColor: '#0A1628',
      bgGradient: 'linear-gradient(120deg,var(--navy-950),var(--navy-900))',
      paddingTop: '6rem',
      paddingBottom: '6rem',
      paddingTopMobile: '3.75rem',
      paddingBottomMobile: '3.75rem',
    },
  };
}

/** Convert an old industries section into its configurable replacement, keeping all content. */
export function upgradeIndustriesSection(oldType: string, content: unknown): { type: IndustriesSectionType; content: Record<string, unknown> } | null {
  const next = INDUSTRIES_UPGRADE_MAP[oldType];
  if (!next) return null;
  const o = (content && typeof content === 'object' ? content : {}) as Raw;
  const map: Record<IndustriesSectionType, (o: Raw) => object> = {
    industries_hero: upgradeHero,
    industries_stats: upgradeStats,
    industries_hub: upgradeHub,
    industries_category: upgradeCategory,
    industries_cta: upgradeCta,
  };
  return { type: next, content: map[next](o) as Record<string, unknown> };
}

export const INDUSTRIES_SLUG = 'industries';

export const INDUSTRIES_SEED_SECTIONS_V2: Array<{
  type: string;
  section_key: string | null;
  title: string;
  enabled?: boolean;
  content_json: Record<string, unknown>;
}> = [
  { type: 'industries_hero', section_key: 'industries-hero', title: 'Industries hero', content_json: defaultIndustriesHeroContent() },
  { type: 'industries_hub', section_key: 'sector-pathways', title: 'Sector pathways', enabled: false, content_json: defaultIndustriesHubContent() },
  { type: 'industries_stats', section_key: 'industries-stats', title: 'Industries stats', content_json: defaultIndustriesStatsContent() },
  { type: 'industries_category', section_key: 'cat-infra', title: 'Infrastructure & utilities', content_json: defaultIndustriesInfraContent() },
  { type: 'industries_category', section_key: 'cat-commercial', title: 'Commercial & institutional', content_json: defaultIndustriesCommercialContent() },
  { type: 'industries_category', section_key: 'cat-industrial', title: 'Industrial & manufacturing', content_json: defaultIndustriesIndustrialContent() },
  { type: 'industries_category', section_key: 'cat-energy', title: 'Energy & mobility', content_json: defaultIndustriesEnergyContent() },
  { type: 'industries_cta', section_key: 'industries-cta', title: 'Industries CTA', content_json: defaultIndustriesCtaContent() },
];
