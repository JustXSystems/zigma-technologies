/** Contact-page locations block — CMS section type `locations`. */

export type LocationOfficeCard = {
  id: string;
  tag?: string;
  title: string;
  address: string;
  phone?: string;
  phoneHref?: string;
  directionsUrl?: string;
  directionsLabel?: string;
  /** Google Maps embed URL shown when this card is hovered. */
  mapEmbedUrl?: string;
  mapTitle?: string;
  /** Inner SVG markup for 24×24 viewBox (paths/circles). */
  icon?: string;
  /** When false, card is omitted on the public site. Default true. */
  enabled?: boolean;
  /** Prefer this card’s map as the section default when set. */
  isDefault?: boolean;
};

export type LocationsSectionContent = {
  eyebrow?: string;
  eyebrowClass?: string;
  title?: string;
  body?: string;
  /** Background preset. Overridden by sectionBg when set. */
  tone?: 'gray' | 'light';
  sectionBg?: string;
  sectionPadding?: string;
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
  /** Default map when no card is hovered (fallback: first default/enabled card). */
  mapEmbedUrl?: string;
  mapTitle?: string;
  showMap?: boolean;
  mapMinHeight?: string;
  layout?: 'img-right' | 'img-left';
  locGridGap?: string;
  cardBg?: string;
  cardBorderColor?: string;
  cardBorderRadius?: string;
  cardPadding?: string;
  cardActiveBorderColor?: string;
  tagColor?: string;
  tagBorderColor?: string;
  iconBg?: string;
  iconColor?: string;
  iconSize?: string;
  directionsLabel?: string;
  locations: LocationOfficeCard[];
};

const DEFAULT_PIN =
  '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>';

/** Known office pins from the contact HTML design — used when CMS rows lack mapEmbedUrl. */
const KNOWN_LOCATION_MAPS: Array<{ match: RegExp; mapEmbedUrl: string; mapTitle: string }> = [
  {
    match: /bengaluru|bangalore/i,
    mapEmbedUrl: 'https://www.google.com/maps?q=12.8770726,77.6135744&z=16&output=embed',
    mapTitle: 'Zigma Technologies — Bengaluru Head Office',
  },
  {
    match: /mumbai|navi mumbai/i,
    mapEmbedUrl: 'https://www.google.com/maps?q=19.1088083,73.0002465&z=16&output=embed',
    mapTitle: 'Zigma Technologies — Mumbai Regional Service Hub',
  },
  {
    match: /delhi|noida/i,
    mapEmbedUrl: 'https://www.google.com/maps?q=28.596026,77.3144936&z=16&output=embed',
    mapTitle: 'Zigma Technologies — Delhi (Noida) Regional Service Hub',
  },
];

function knownMapForTitle(title: string): { mapEmbedUrl: string; mapTitle: string } | null {
  for (const row of KNOWN_LOCATION_MAPS) {
    if (row.match.test(title)) return { mapEmbedUrl: row.mapEmbedUrl, mapTitle: row.mapTitle };
  }
  return null;
}

let cardSeq = 0;

export function newLocationOfficeCardId() {
  cardSeq += 1;
  return `loc-${Date.now().toString(36)}-${cardSeq}`;
}

export function createLocationOfficeCard(
  partial: Partial<LocationOfficeCard> = {}
): LocationOfficeCard {
  return {
    id: partial.id || newLocationOfficeCardId(),
    tag: partial.tag ?? 'Regional Service Hub',
    title: partial.title ?? 'New location',
    address: partial.address ?? '',
    phone: partial.phone ?? '',
    phoneHref: partial.phoneHref ?? '',
    directionsUrl: partial.directionsUrl ?? '',
    directionsLabel: partial.directionsLabel ?? '',
    mapEmbedUrl: partial.mapEmbedUrl ?? '',
    mapTitle: partial.mapTitle ?? '',
    icon: partial.icon ?? DEFAULT_PIN,
    enabled: partial.enabled !== false,
    isDefault: partial.isDefault === true,
  };
}

export const LOCATIONS_SECTION_FONT_OPTIONS = [
  { label: 'Display (Space Grotesk)', value: 'var(--font-display)' },
  { label: 'Body (Inter)', value: 'var(--font-body)' },
  { label: 'Mono (IBM Plex Mono)', value: 'var(--font-mono)' },
] as const;

export const LOCATIONS_SECTION_EYEBROW_PRESETS = [
  { label: 'Orange', value: 'eyebrow-orange' },
  { label: 'Cyan', value: 'eyebrow-cyan' },
  { label: 'Green', value: 'eyebrow-green' },
] as const;

/** Normalize CMS JSON (supports legacy rows without id / map fields). */
export function normalizeLocationOfficeCards(raw: unknown): LocationOfficeCard[] {
  if (!Array.isArray(raw)) return [];
  const anyExplicitDefault = raw.some((item) => (item as { isDefault?: boolean })?.isDefault === true);
  return raw.map((item, idx) => {
    const c = (item || {}) as Partial<LocationOfficeCard>;
    const title = String(c.title || '');
    const known = knownMapForTitle(title);
    return {
      id: String(c.id || `loc-${idx}`),
      tag: c.tag ? String(c.tag) : '',
      title,
      address: String(c.address || ''),
      phone: c.phone ? String(c.phone) : '',
      phoneHref: c.phoneHref ? String(c.phoneHref) : '',
      directionsUrl: c.directionsUrl ? String(c.directionsUrl) : '',
      directionsLabel: c.directionsLabel ? String(c.directionsLabel) : '',
      mapEmbedUrl: c.mapEmbedUrl ? String(c.mapEmbedUrl) : known?.mapEmbedUrl || '',
      mapTitle: c.mapTitle ? String(c.mapTitle) : known?.mapTitle || '',
      icon: c.icon ? String(c.icon) : DEFAULT_PIN,
      enabled: c.enabled !== false,
      isDefault: c.isDefault === true || (!anyExplicitDefault && idx === 0),
    };
  });
}

export function resolveDefaultLocationMap(
  content: Record<string, unknown>,
  locations: LocationOfficeCard[]
): { src: string; title: string } {
  const sectionSrc = typeof content.mapEmbedUrl === 'string' ? content.mapEmbedUrl.trim() : '';
  const sectionTitle = typeof content.mapTitle === 'string' ? content.mapTitle.trim() : '';
  if (sectionSrc) {
    return { src: sectionSrc, title: sectionTitle || 'Office map' };
  }
  const preferred =
    locations.find((l) => l.isDefault && l.mapEmbedUrl) ||
    locations.find((l) => l.mapEmbedUrl);
  if (preferred?.mapEmbedUrl) {
    return {
      src: preferred.mapEmbedUrl,
      title: preferred.mapTitle || preferred.title || 'Office map',
    };
  }
  return { src: '', title: 'Office map' };
}

export { DEFAULT_PIN as LOCATIONS_DEFAULT_PIN };
