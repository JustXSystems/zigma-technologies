/** Industry category block (cat-infra / cat-commercial / …) — CMS section type `industry_category`. */

export type IndustryCategoryCard = {
  id: string;
  title: string;
  body: string;
  /** Inner SVG markup for 24×24 viewBox (paths/circles/rects). */
  icon?: string;
  /** When false, card is omitted on the public site. Default true. */
  enabled?: boolean;
};

export type IndustryCategoryContent = {
  eyebrow: string;
  title: string;
  body: string;
  /** Background preset: white vs gray-100. Overridden by sectionBg when set. */
  tone: 'light' | 'gray';
  /** Accent used for --cat-color (top bar, icons, hover). */
  catColor: string;
  sectionBg?: string;
  eyebrowClass?: string;
  eyebrowColor?: string;
  eyebrowFont?: string;
  eyebrowSize?: string;
  eyebrowWeight?: string;
  eyebrowLetterSpacing?: string;
  eyebrowTransform?: string;
  titleColor?: string;
  titleFont?: string;
  titleSize?: string;
  titleWeight?: string;
  bodyColor?: string;
  bodyFont?: string;
  bodySize?: string;
  showAccentBar?: boolean;
  accentBarWidth?: string;
  accentBarHeight?: string;
  accentBarColor?: string;
  sectionPadding?: string;
  headMarginBottom?: string;
  gridColumns?: number;
  gridGap?: string;
  cardBg?: string;
  cardBorderColor?: string;
  cardBorderRadius?: string;
  cardPadding?: string;
  cardTitleColor?: string;
  cardTitleFont?: string;
  cardTitleSize?: string;
  cardBodyColor?: string;
  cardBodyFont?: string;
  cardBodySize?: string;
  iconSize?: string;
  cards: IndustryCategoryCard[];
};

let cardSeq = 0;

export function newIndustryCategoryCardId() {
  cardSeq += 1;
  return `icard-${Date.now().toString(36)}-${cardSeq}`;
}

export function createIndustryCategoryCard(
  partial: Partial<IndustryCategoryCard> = {}
): IndustryCategoryCard {
  return {
    id: partial.id || newIndustryCategoryCardId(),
    title: partial.title ?? 'Industry name',
    body: partial.body ?? 'Describe how you serve this industry.',
    icon: partial.icon ?? '',
    enabled: partial.enabled !== false,
  };
}

/** Default template content mirrors #cat-infra in the industries HTML design. */
export function defaultIndustryCategoryContent(): IndustryCategoryContent {
  return {
    eyebrow: 'INFRASTRUCTURE & UTILITIES',
    title: "Critical Infrastructure That Can't Go Dark",
    body: "Data centers, airports, telecom, and utility networks — where downtime isn't an inconvenience, it's a crisis.",
    tone: 'light',
    catColor: '#00D4FF',
    eyebrowClass: 'eyebrow-orange',
    showAccentBar: true,
    accentBarWidth: '56px',
    accentBarHeight: '4px',
    sectionPadding: '4rem',
    headMarginBottom: '2.2rem',
    gridColumns: 3,
    gridGap: '1.5rem',
    cards: [
      createIndustryCategoryCard({
        title: 'Data Centers & IT Parks',
        body: 'N+1 UPS design, battery backup, and precision power for facilities where seconds of downtime cost millions.',
        icon: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M5 9.5h14M5 15h14"/><circle cx="8" cy="6" r="0.6" fill="currentColor" stroke="none"/><circle cx="8" cy="12" r="0.6" fill="currentColor" stroke="none"/>',
      }),
      createIndustryCategoryCard({
        title: 'Digital Infrastructure',
        body: 'Power engineering for the networks, edge nodes, and connectivity hubs that keep India online.',
        icon: '<circle cx="6" cy="18" r="1.4"/><circle cx="18" cy="18" r="1.4"/><path d="M3 8c5-4 13-4 18 0M6 12c3-2.4 9-2.4 12 0"/>',
      }),
      createIndustryCategoryCard({
        title: 'Airport & Metro Infrastructure',
        body: "Mission-critical power continuity for transit systems where public safety depends on uptime.",
        icon: '<path d="M22 3L11.5 13.5"/><path d="M22 3l-7 19-4.5-9L2 8z"/>',
      }),
      createIndustryCategoryCard({
        title: 'Industrial Infrastructure',
        body: 'Electrical distribution, UPS, and engineering support built for round-the-clock industrial operations.',
        icon: '<path d="M3 21h18M5 21V9l6-4 6 4v12M9 21v-6h6v6"/><path d="M15 9h3v12"/>',
      }),
      createIndustryCategoryCard({
        title: 'Smart Cities & Utilities',
        body: 'Integrated solar, storage, and monitoring systems for next-generation urban infrastructure projects.',
        icon: '<path d="M3 21h18"/><path d="M5 21V10l4-3v14"/><path d="M13 21V6l6-3v18"/>',
      }),
      createIndustryCategoryCard({
        title: 'Power & Utility Infrastructure',
        body: 'Grid-support power engineering spanning generation, storage, and distribution reliability.',
        icon: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
      }),
      createIndustryCategoryCard({
        title: 'Telecom & Communication',
        body: 'Resilient backup power for towers, exchanges, and network operations centers nationwide.',
        icon: '<path d="M5 12a7 7 0 0114 0M2 12a10 10 0 0120 0"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
      }),
      createIndustryCategoryCard({
        title: 'Ports & Maritime Infrastructure',
        body: 'Power continuity and electrical systems for cargo terminals, cranes, and port operations.',
        icon: '<path d="M2 21c3 1 6 1 9 0s6-1 9 0"/><path d="M5 21V10l7-6 7 6v11"/><path d="M9 21v-6h6v6"/>',
      }),
      createIndustryCategoryCard({
        title: 'Railway Infrastructure',
        body: 'Signal, station, and depot power systems engineered for round-the-clock rail operations.',
        icon: '<rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 11h16"/><path d="M8 21l-2-4h12l-2 4"/><circle cx="8" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="14" r="1" fill="currentColor" stroke="none"/>',
      }),
    ],
  };
}

/** Suggested presets matching the HTML design (#cat-infra / commercial / industrial / energy). */
export const INDUSTRY_CATEGORY_COLOR_PRESETS = [
  { label: 'Cyan (infra)', value: '#00D4FF' },
  { label: 'Orange (commercial)', value: '#FF6B1A' },
  { label: 'Green (industrial)', value: '#12B76A' },
  { label: 'Purple (energy)', value: '#A855F7' },
] as const;

export const INDUSTRY_CATEGORY_FONT_OPTIONS = [
  { label: 'Display (Space Grotesk)', value: 'var(--font-display)' },
  { label: 'Body (Inter)', value: 'var(--font-body)' },
  { label: 'Mono (IBM Plex Mono)', value: 'var(--font-mono)' },
] as const;

export function normalizeIndustryCategoryCards(
  raw: unknown
): IndustryCategoryCard[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    const c = (item || {}) as Partial<IndustryCategoryCard>;
    return {
      id: String(c.id || `icard-${idx}`),
      title: String(c.title || ''),
      body: String(c.body || ''),
      icon: c.icon ? String(c.icon) : '',
      enabled: c.enabled !== false,
    };
  });
}
