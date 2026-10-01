import { normalizeHeroHeight, type HeroHeight, type HeroVAlign } from '@/lib/hero-height';
import type { HeroPlacement } from '@/lib/hero-placement';
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
import type { LegacyBgMedia, LegacyCardStyle, LegacySectionHeader } from '@/lib/legacy-sections';
import type { LifeColumns, LifeHighlight, LifeMediaItem } from '@/lib/life-sections';
import { normalizeLocationOfficeCards, resolveDefaultLocationMap } from '@/lib/locations-section';

/**
 * Fully configurable Contact page section family (page /contact):
 * contact_hero, contact_quick, contact_help, contact_locations, contact_form.
 *
 * Built on the About / Life / Legacy element primitives. Empty style fields fall back to the
 * scoped `.ctc-*` CSS defaults, which mirror the live contact page design. Headings / eyebrows
 * follow Site Settings → Public typography; phone / email / address use NAP tokens
 * ({{phone}}, {{supportEmail}}…) resolved from Site Settings.
 */

export const CONTACT_SECTION_TYPES = [
  'contact_hero',
  'contact_quick',
  'contact_help',
  'contact_locations',
  'contact_form',
] as const;
export type ContactSectionType = (typeof CONTACT_SECTION_TYPES)[number];

export function isContactSectionType(type: string): type is ContactSectionType {
  return (CONTACT_SECTION_TYPES as readonly string[]).includes(type);
}

/** Older minimal section types used by the live /contact page, and their replacement. */
export const CONTACT_UPGRADE_MAP: Record<string, ContactSectionType> = {
  page_hero: 'contact_hero',
  quick_contact: 'contact_quick',
  feature_grid: 'contact_help',
  locations: 'contact_locations',
  enquiry_form: 'contact_form',
};

/* ------------------------------------------------------------------ */
/* Shared shapes                                                       */
/* ------------------------------------------------------------------ */

/** Section-wide icon box look; a single icon's own settings win. */
export type ContactIconStyle = {
  boxSize?: string;
  size?: string;
  radius?: string;
  background?: string;
  color?: string;
  border?: string;
  strokeWidth?: string;
};

/** Contact-form subject preset: clicking scrolls to the form and preselects this subject. */
export type ContactAction = {
  href?: string;
  subject?: string;
  /** Careers: scrolls to the application form and preselects this role (wins over subject and link). */
  role?: string;
  newTab?: boolean;
};

/* ------------------------------------------------------------------ */
/* Section content shapes                                              */
/* ------------------------------------------------------------------ */

export type ContactHeroContent = {
  section: SectionBox;
  heroHeight?: HeroHeight;
  placement?: HeroPlacement;
  background: LegacyBgMedia;
  /** Fade-up entrance for breadcrumb, heading, leads, pills and buttons */
  entrance?: boolean;
  align?: 'left' | 'center';
  /** Vertical position of the copy in a full-screen / custom-height hero; empty = centre */
  vAlign?: HeroVAlign;
  contentMaxWidth?: string;
  /** Page-scroll progress bar pinned to the top of the viewport (off unless enabled) */
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
  /** Bold first lead line */
  leadEmphasis: TextEl;
  lead: TextEl;
  /** Accent-coloured closing line */
  leadAccent: TextEl;
  leadStyle?: ElementStyle;
  pills: PillsEl;
  ctas: CtaButton[];
};

export type ContactQuickItem = ContactAction & {
  hidden?: boolean;
  label: string;
  value: string;
  emergency?: boolean;
  icon: IconEl;
};

export type ContactQuickContent = {
  section: SectionBox;
  items: ContactQuickItem[];
  columns: LifeColumns;
  gap?: string;
  justify?: 'left' | 'center' | 'right';
  dividers?: boolean;
  dividerColor?: string;
  itemStyle: LegacyCardStyle;
  iconStyle: ContactIconStyle;
  labelStyle?: ElementStyle;
  valueStyle?: ElementStyle;
  hoverColor?: string;
  emergency: { color?: string; iconBackground?: string; iconColor?: string };
};

export type ContactHelpVariant = 'default' | 'green' | 'emergency';

export type ContactHelpCard = ContactAction & {
  hidden?: boolean;
  variant?: ContactHelpVariant;
  /** Card background override (wins over the variant tint) */
  background?: string;
  border?: string;
  icon: IconEl;
  /** Short text shown in the icon box when there is no icon */
  badge?: string;
  badgeColor?: string;
  image?: ImageEl;
  /** Several images / videos cross-fade at the top of the card */
  media: LifeMediaItem[];
  title: TextEl;
  body: TextEl;
  linkLabel?: string;
};

export type ContactHelpContent = {
  section: SectionBox;
  header: LegacySectionHeader;
  cards: ContactHelpCard[];
  columns: LifeColumns;
  gap?: string;
  reveal?: boolean;
  cardStyle: LegacyCardStyle & { mediaHeight?: string; mediaIntervalSeconds?: number };
  variants: {
    greenBackground?: string;
    greenBorder?: string;
    emergencyBackground?: string;
    emergencyBorder?: string;
    emergencyIconBackground?: string;
    emergencyIconColor?: string;
  };
  iconStyle: ContactIconStyle;
  titleStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
  linkStyle?: ElementStyle;
  linkHoverColor?: string;
};

export type ContactLocation = {
  id: string;
  hidden?: boolean;
  tag?: string;
  title: string;
  address: string;
  phone?: string;
  phoneHref?: string;
  email?: string;
  hours?: string;
  directionsUrl?: string;
  directionsLabel?: string;
  mapEmbedUrl?: string;
  mapTitle?: string;
  icon: IconEl;
  isDefault?: boolean;
  /** Photos / videos shown in the side panel for this office (media mode, or when it has no map) */
  media: LifeMediaItem[];
};

export type ContactPanelMode = 'map' | 'media';

export type ContactLocationsContent = {
  section: SectionBox;
  header: LegacySectionHeader;
  layout: {
    panelSide: 'left' | 'right';
    columns?: string;
    gap?: string;
    alignItems?: 'start' | 'center' | 'end' | 'stretch';
    /** Stacked (tablet / phone): panel above the office cards */
    mobilePanelFirst?: boolean;
  };
  locations: ContactLocation[];
  /** fine pointers: hover previews a card; click = click / tap only */
  interaction: 'hover' | 'click';
  panel: {
    hidden?: boolean;
    mode: ContactPanelMode;
    /** Map shown when no office is active; empty = default office's map */
    embedUrl?: string;
    title?: string;
    media: LifeMediaItem[];
    intervalSeconds?: number;
    minHeight?: string;
    minHeightTablet?: string;
    minHeightMobile?: string;
    radius?: string;
    border?: string;
    shadow?: string;
    /** CSS filter for the map, e.g. grayscale(0.4) */
    filter?: string;
    sticky?: boolean;
  };
  cardGap?: string;
  cardStyle: LegacyCardStyle & { activeBorderColor?: string; activeBackground?: string };
  iconStyle: ContactIconStyle;
  tagStyle?: ElementStyle;
  titleStyle?: ElementStyle;
  addressStyle?: ElementStyle;
  linkStyle?: ElementStyle;
  linkHoverColor?: string;
  directionsLabel: string;
};

export type ContactSideItem = { hidden?: boolean; label: string; value: string; href?: string; newTab?: boolean; icon: IconEl };
export type ContactHoursRow = { label: string; value: string };
export type ContactOffice = { title: string; lines: string };

export type ContactFormContent = {
  section: SectionBox;
  header: LegacySectionHeader;
  layout: {
    sidePosition: 'right' | 'left' | 'none';
    columns?: string;
    radius?: string;
    shadow?: string;
    /** Stacked (tablet / phone): contact panel above the form */
    mobileSideFirst?: boolean;
  };
  form: {
    background?: string;
    padding?: string;
    border?: string;
    title: TextEl;
    intro: TextEl;
    submitLabel: string;
    submittingLabel?: string;
    buttonVariant?: 'primary' | 'ghost' | 'ghost-dark';
    buttonStyle?: ElementStyle;
    buttonFullWidth?: boolean;
    privacyNote: TextEl;
    successTitle: TextEl;
    successBody: TextEl;
    /** Page opened after a successful submit; empty = show the success message in place */
    redirectUrl?: string;
    /** Short text fields per row on desktop */
    fieldColumns?: 1 | 2;
  };
  fields: {
    labelStyle?: ElementStyle;
    inputBackground?: string;
    inputBorder?: string;
    inputColor?: string;
    inputRadius?: string;
    inputPadding?: string;
    inputFontSize?: string;
    focusColor?: string;
    rowGap?: string;
  };
  side: {
    hidden?: boolean;
    background?: string;
    padding?: string;
    gap?: string;
    color?: string;
    media: LifeMediaItem[];
    mediaPosition?: 'top' | 'bottom';
    mediaHeight?: string;
    intervalSeconds?: number;
    headingStyle?: ElementStyle;
    title: TextEl;
    items: ContactSideItem[];
    iconStyle: ContactIconStyle;
    labelStyle?: ElementStyle;
    valueStyle?: ElementStyle;
    linkHoverColor?: string;
    dividers?: boolean;
    dividerColor?: string;
    hoursTitle: TextEl;
    hours: ContactHoursRow[];
    hoursLabelStyle?: ElementStyle;
    hoursValueStyle?: ElementStyle;
    officesTitle: TextEl;
    offices: ContactOffice[];
  };
  emergency: {
    hidden?: boolean;
    title: string;
    body: string;
    phone: string;
    phoneHref?: string;
    background?: string;
    border?: string;
    color?: string;
    accent?: string;
    radius?: string;
  };
};

/* ------------------------------------------------------------------ */
/* Icon presets (contact design + shared About outline icons)          */
/* ------------------------------------------------------------------ */

export const CONTACT_ICON_PRESETS: Array<{ key: string; label: string; svg: string }> = [
  {
    key: 'contact-phone',
    label: 'Phone',
    svg: '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.34 1.79.65 2.65a2 2 0 01-.45 2.11L8.09 9.7a16 16 0 006 6l1.22-1.22a2 2 0 012.11-.45c.86.31 1.75.53 2.65.65A2 2 0 0122 16.92z"/>',
  },
  { key: 'contact-email', label: 'Email', svg: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>' },
  {
    key: 'contact-quote',
    label: 'Quote / document',
    svg: '<path d="M9 12h6M9 16h6M9 8h2"/><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5"/>',
  },
  {
    key: 'contact-alert',
    label: 'Emergency / alert',
    svg: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  },
  { key: 'contact-pin', label: 'Map pin', svg: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>' },
  {
    key: 'contact-sun',
    label: 'Sun (solar)',
    svg: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
  },
  { key: 'contact-bolt', label: 'Bolt (UPS / EV)', svg: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>' },
  { key: 'contact-battery', label: 'Battery (BESS)', svg: '<rect x="2" y="8" width="18" height="8" rx="1.5"/><path d="M22 10v4"/><path d="M6 8v8M10 8v8"/>' },
  {
    key: 'contact-wrench',
    label: 'Wrench (service)',
    svg: '<path d="M14.7 6.3a4 4 0 00-5.66 5.66l-6.2 6.2a1.5 1.5 0 002.12 2.12l6.2-6.2a4 4 0 005.66-5.66l-2.5 2.5-2.12-2.12z"/>',
  },
  {
    key: 'contact-calendar',
    label: 'Calendar check (site visit)',
    svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M9 15l2 2 4-4"/>',
  },
  { key: 'contact-clock', label: 'Clock (hours)', svg: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
];

export const CONTACT_ALL_ICON_PRESETS = [...CONTACT_ICON_PRESETS, ...ABOUT_ICON_PRESETS];

const contactIcon = (key: string) => CONTACT_ICON_PRESETS.find((p) => p.key === key)?.svg || '';
const icon = (key: string, extra: Partial<IconEl> = {}): IconEl => ({ svg: contactIcon(key), ...extra });

/* ------------------------------------------------------------------ */
/* Defaults (mirror the live contact page)                             */
/* ------------------------------------------------------------------ */

export const CONTACT_HERO_OVERLAY =
  'linear-gradient(90deg, rgba(6,17,33,0.85) 0%, rgba(6,17,33,0.55) 32%, rgba(6,17,33,0.15) 55%, rgba(6,17,33,0) 75%)';

const header = (eyebrow: string, title: string, subtitle: string, align: 'left' | 'center'): LegacySectionHeader => ({
  align,
  eyebrow: { text: eyebrow, line: false, style: { color: 'var(--orange)' } },
  title: { text: title },
  subtitle: { text: subtitle },
  bar: { hidden: true },
});

let locSeq = 0;
export function newContactLocationId() {
  locSeq += 1;
  return `loc-${Date.now().toString(36)}-${locSeq}`;
}

export function createContactLocation(partial: Partial<ContactLocation> = {}): ContactLocation {
  return {
    id: partial.id || newContactLocationId(),
    tag: 'Regional Service Hub',
    title: 'New location',
    address: '',
    phone: '',
    phoneHref: '',
    directionsUrl: '',
    mapEmbedUrl: '',
    mapTitle: '',
    icon: icon('contact-pin'),
    media: [],
    ...partial,
  };
}

export function defaultContactHeroContent(): ContactHeroContent {
  return {
    section: {
      tone: 'dark',
      bgColor: '#0A1628',
      bgGradient: 'linear-gradient(160deg,var(--navy-950),var(--navy-900))',
      pattern: 'grid-fade',
      patternColor: 'rgba(255,255,255,0.035)',
      patternSize: '64px',
    },
    heroHeight: 'full',
    background: {
      items: [
        {
          src: '/assets/images/zigma-technologies-help-desk-team-assist.jpg',
          title: 'Zigma Technologies help desk team assisting customers with solar, UPS, and engineering support',
        },
      ],
      mobileItems: [],
      intervalSeconds: 6,
      motion: 'zoom',
      motionSeconds: 12,
      position: 'center 30%',
      overlay: CONTACT_HERO_OVERLAY,
      showDots: true,
      showCount: false,
    },
    entrance: true,
    align: 'left',
    breadcrumb: {
      items: [{ label: 'Home', href: '/' }, { label: 'Contact' }],
      separator: '/',
    },
    eyebrow: { text: 'GET IN TOUCH', line: false, style: { color: 'var(--orange)' } },
    title: { text: 'Contact Us' },
    highlight: { text: '', animate: false },
    leadEmphasis: { text: 'Reliable power begins with the right engineering partner.' },
    lead: {
      text: "Whether you're investing in Solar Energy Systems, UPS & Critical Power Infrastructure, Battery Energy Storage (BESS), AMC & O&M Services, Emergency Technical Support, or comprehensive Power & Energy Engineering Solutions, our team is prepared to support your business at every stage.",
    },
    leadAccent: {
      text: "Tell us what you need, and we'll connect you with the right expert to deliver dependable, efficient, and future-ready solutions.",
    },
    pills: { items: [] },
    ctas: [],
  };
}

export function defaultContactQuickContent(): ContactQuickContent {
  return {
    section: {
      tone: 'dark',
      bgColor: 'var(--navy-900)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    },
    items: [
      { label: 'Call Us', value: '{{phone}}', href: 'tel:{{phone}}', icon: icon('contact-phone') },
      { label: 'Email Us', value: '{{supportEmail}}', href: 'mailto:{{supportEmail}}', icon: icon('contact-email') },
      { label: 'Get a Quote', value: 'Request a Quote', href: '#contact-form', subject: 'Request a Quote', icon: icon('contact-quote') },
      {
        label: 'Emergency Call',
        value: '{{emergencyPhone}}',
        href: 'tel:{{emergencyPhone}}',
        emergency: true,
        icon: icon('contact-alert'),
      },
    ],
    columns: { desktop: 4, tablet: 2, mobile: 1 },
    justify: 'center',
    dividers: false,
    itemStyle: {},
    iconStyle: {},
    emergency: {},
  };
}

const helpCard = (
  title: string,
  body: string,
  iconKey: string,
  linkLabel: string,
  extra: Partial<ContactHelpCard> = {}
): ContactHelpCard => ({
  title: { text: title },
  body: { text: body },
  icon: icon(iconKey),
  media: [],
  linkLabel,
  subject: title,
  ...extra,
});

export function defaultContactHelpContent(): ContactHelpContent {
  return {
    section: { tone: 'light', bgColor: 'var(--white)' },
    header: header(
      'HOW CAN WE HELP',
      'Tell Us What You Need',
      "Pick the option closest to your requirement and we'll route it straight to the right team.",
      'left'
    ),
    cards: [
      helpCard(
        'Solar Solution',
        'Enquire about a new solar installation, EPC project, or AMC for an existing solar plant.',
        'contact-sun',
        'Ask About Solar →',
        { variant: 'green' }
      ),
      helpCard(
        'UPS Solution',
        'Talk to us about UPS sizing, installation, upgrades, or power backup for your facility.',
        'contact-bolt',
        'Ask About UPS →',
        { variant: 'green' }
      ),
      helpCard(
        'BESS- Battery System',
        'Get guidance on battery energy storage, hybrid systems, or replacement battery banks.',
        'contact-battery',
        'Ask About Batteries →',
        { variant: 'green' }
      ),
      helpCard(
        'EV Charging Solution',
        'Get a proposal for AC/DC EV charging stations, fleet charging, or Solar + EV + BESS integration.',
        'contact-bolt',
        'Ask About EV Charging →',
        { variant: 'green' }
      ),
      helpCard(
        'AMC & Service Request',
        'Set up or renew an Annual Maintenance Contract, or log a routine service, repair, or inspection.',
        'contact-wrench',
        'Start Request →'
      ),
      helpCard(
        'Request a Quote',
        'Get a tailored proposal for a new solar EPC, UPS, battery storage, or engineering project.',
        'contact-quote',
        'Get a Quote →'
      ),
      helpCard(
        'Site Visit Request',
        'Schedule an on-site survey or assessment with one of our field engineers.',
        'contact-calendar',
        'Schedule a Visit →'
      ),
      helpCard(
        'Emergency Service Support',
        'Power down or system failure? Our 24×7 response team is on call, every day of the year.',
        'contact-alert',
        'Call Now: {{emergencyPhone}} →',
        { variant: 'emergency', subject: '', href: 'tel:{{emergencyPhone}}' }
      ),
    ],
    columns: { desktop: 4, tablet: 2, mobile: 1 },
    reveal: true,
    cardStyle: { hoverLift: true, mediaIntervalSeconds: 4.5 },
    variants: {},
    iconStyle: {},
  };
}

export function defaultContactLocationsContent(): ContactLocationsContent {
  return {
    section: { tone: 'light', bgColor: 'var(--gray-100)' },
    header: header(
      'LOCATIONS',
      'Where to Find Us',
      'Head-quartered in Bengaluru with regional service hubs across India, so field engineers are never far from your site.',
      'left'
    ),
    layout: { panelSide: 'right', columns: '', gap: '', alignItems: 'stretch', mobilePanelFirst: false },
    locations: [
      createContactLocation({
        id: 'loc-bengaluru',
        tag: 'Head Office',
        title: 'Bengaluru, Karnataka',
        address: '{{address}}',
        phone: '{{phone}}',
        phoneHref: 'tel:{{phone}}',
        directionsUrl: 'https://maps.app.goo.gl/oGzmPncNAgxf8kLDA',
        mapEmbedUrl: 'https://www.google.com/maps?q=12.8770726,77.6135744&z=16&output=embed',
        mapTitle: 'Zigma Technologies — Bengaluru Head Office',
        isDefault: true,
      }),
      createContactLocation({
        id: 'loc-mumbai',
        tag: 'Regional Service Hub',
        title: 'Mumbai, Maharashtra',
        address: 'Siddhi Vinayak Apt, Plot no - 50, Sector 20, Kopar Khairane, Navi Mumbai, Maharashtra 400709',
        phone: '{{emergencyPhone}}',
        phoneHref: 'tel:{{emergencyPhone}}',
        directionsUrl: 'https://maps.app.goo.gl/NquKywecruod2gXb7',
        mapEmbedUrl: 'https://www.google.com/maps?q=19.1088083,73.0002465&z=16&output=embed',
        mapTitle: 'Zigma Technologies — Mumbai Regional Service Hub',
      }),
      createContactLocation({
        id: 'loc-delhi',
        tag: 'Regional Service Hub',
        title: 'Delhi, Uttar Pradesh',
        address: 'G. Floor, B Block Ground, 48 B, E Block, Sector 7, Noida, Uttar Pradesh 201301',
        phone: '{{emergencyPhone}}',
        phoneHref: 'tel:{{emergencyPhone}}',
        directionsUrl: 'https://maps.app.goo.gl/yJWGuMbMmAosL9Zq5',
        mapEmbedUrl: 'https://www.google.com/maps?q=28.596026,77.3144936&z=16&output=embed',
        mapTitle: 'Zigma Technologies — Delhi (Noida) Regional Service Hub',
      }),
    ],
    interaction: 'hover',
    panel: {
      mode: 'map',
      embedUrl: '',
      title: '',
      media: [],
      intervalSeconds: 5,
    },
    cardStyle: { hoverLift: true },
    iconStyle: {},
    directionsLabel: 'Get Directions →',
  };
}

export function defaultContactFormContent(): ContactFormContent {
  return {
    section: { tone: 'light', bgColor: 'var(--gray-100)' },
    header: header(
      'SEND A MESSAGE',
      'Tell Us About Your Project',
      'Fill in the details below — a Zigma engineer will respond within one business day.',
      'center'
    ),
    layout: { sidePosition: 'right', columns: '', mobileSideFirst: false },
    form: {
      title: { text: 'Send us a message' },
      intro: { text: 'All fields marked with * are required.' },
      submitLabel: 'Submit Request →',
      submittingLabel: 'Sending…',
      buttonVariant: 'primary',
      buttonFullWidth: true,
      privacyNote: {
        text: 'By submitting, you agree to be contacted by Zigma Technologies regarding your enquiry. We never share your details with third parties.',
      },
      successTitle: { text: 'Thank you — message received' },
      successBody: {
        text: 'A member of our engineering team will get back to you within one business day. For anything urgent, please call our 24×7 emergency line.',
      },
      redirectUrl: '/thank-you?intent=enquiry',
      fieldColumns: 2,
    },
    fields: {},
    side: {
      media: [],
      mediaPosition: 'top',
      intervalSeconds: 5,
      title: { text: 'Direct Contact' },
      items: [
        { label: 'Phone', value: '{{phone}}', href: 'tel:{{phone}}', icon: icon('contact-phone') },
        { label: 'Email', value: '{{supportEmail}}', href: 'mailto:{{supportEmail}}', icon: icon('contact-email') },
        { label: 'Head Office', value: '{{city}}, {{region}}', icon: icon('contact-pin') },
      ],
      iconStyle: {},
      dividers: true,
      hoursTitle: { text: 'Business Hours' },
      hours: [{ label: '{{hours}}', value: '' }],
      officesTitle: { text: 'Offices' },
      offices: [],
    },
    emergency: {
      title: 'Need urgent help?',
      body: 'Our emergency call line is staffed every day of the year for critical power failures & all technical support.',
      phone: '{{emergencyPhone}}',
    },
  };
}

export function defaultContactSectionContent(type: string): Record<string, unknown> | null {
  switch (type) {
    case 'contact_hero':
      return defaultContactHeroContent();
    case 'contact_quick':
      return defaultContactQuickContent();
    case 'contact_help':
      return defaultContactHelpContent();
    case 'contact_locations':
      return defaultContactLocationsContent();
    case 'contact_form':
      return defaultContactFormContent();
    default:
      return null;
  }
}

/**
 * Fill any missing top-level keys from defaults (one level of object merge) and normalize arrays
 * so partially saved or hand-edited JSON never crashes the renderer / editor.
 */
export function withContactDefaults<T extends object>(type: ContactSectionType, raw: unknown): T {
  const base = defaultContactSectionContent(type) as Record<string, unknown>;
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
  const iconOf = (v: unknown): IconEl => (v && typeof v === 'object' ? (v as IconEl) : { svg: typeof v === 'string' ? v : '' });
  const bg = out.background as LegacyBgMedia | undefined;
  if (bg && typeof bg === 'object') {
    out.background = { ...bg, items: arr<LifeMediaItem>(bg.items), mobileItems: arr<LifeMediaItem>(bg.mobileItems) };
  }
  if (type === 'contact_hero') {
    const bc = out.breadcrumb as ContactHeroContent['breadcrumb'];
    out.breadcrumb = { ...bc, items: arr<LinkItem>(bc?.items) };
    out.ctas = arr<CtaButton>(out.ctas);
  }
  if (type === 'contact_quick') {
    out.items = arr<ContactQuickItem>(out.items).map((it) => ({ ...it, icon: iconOf(it.icon) }));
  }
  if (type === 'contact_help') {
    out.cards = arr<ContactHelpCard>(out.cards).map((c) => ({ ...c, icon: iconOf(c.icon), media: arr<LifeMediaItem>(c.media) }));
  }
  if (type === 'contact_locations') {
    out.locations = arr<ContactLocation>(out.locations).map((l, i) => ({
      ...l,
      id: String(l.id || `loc-${i}`),
      icon: iconOf(l.icon),
      media: arr<LifeMediaItem>(l.media),
    }));
    const panel = out.panel as ContactLocationsContent['panel'];
    out.panel = { ...panel, media: arr<LifeMediaItem>(panel?.media) };
  }
  if (type === 'contact_form') {
    const side = out.side as ContactFormContent['side'];
    out.side = {
      ...side,
      media: arr<LifeMediaItem>(side?.media),
      items: arr<ContactSideItem>(side?.items).map((it) => ({ ...it, icon: iconOf(it.icon) })),
      hours: arr<ContactHoursRow>(side?.hours),
      offices: arr<ContactOffice>(side?.offices),
      iconStyle: side?.iconStyle || {},
    };
  }
  out.typographyVersion = ABOUT_TYPOGRAPHY_VERSION;
  return out as T;
}

/* ------------------------------------------------------------------ */
/* Upgrade: old minimal contact sections → contact_* (keeps content)   */
/* ------------------------------------------------------------------ */

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const s = (v: unknown) => str(v).trim();
const list = (v: unknown): Raw[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as Raw[]) : []);
const svgIcon = (v: unknown, fallbackKey: string): IconEl => ({ svg: s(v) || contactIcon(fallbackKey) });
const clean = (st: ElementStyle): ElementStyle | undefined => {
  const out = Object.fromEntries(Object.entries(st).filter(([, v]) => typeof v === 'string' && v.trim())) as ElementStyle;
  return Object.keys(out).length ? out : undefined;
};

/** Eyebrow colour presets of the old sections. */
const EYEBROW_CLASS_COLOR: Record<string, string> = {
  'eyebrow-orange': 'var(--orange)',
  'eyebrow-cyan': 'var(--cyan)',
  'eyebrow-green': 'var(--green)',
};

function upgradeHero(o: Raw): ContactHeroContent {
  const d = defaultContactHeroContent();
  const image = s(o.image);
  const imageMobile = s(o.imageMobile);
  const alt = s(o.imageAlt);
  const ctas: CtaButton[] = [];
  if (s(o.primaryCta)) ctas.push({ label: s(o.primaryCta), href: s(o.primaryHref) || '#', variant: 'primary' });
  if (s(o.secondaryCta)) ctas.push({ label: s(o.secondaryCta), href: s(o.secondaryHref) || '#', variant: 'ghost' });
  const proof = Array.isArray(o.proofRail) ? (o.proofRail as unknown[]).map((x) => s(x)).filter(Boolean) : [];
  return {
    ...d,
    heroHeight: normalizeHeroHeight(o.heroHeight),
    placement: o.placement as HeroPlacement | undefined,
    background: {
      ...d.background,
      items: image ? [{ src: image, title: alt }] : d.background.items,
      mobileItems: imageMobile ? [{ src: imageMobile, title: alt }] : [],
    },
    breadcrumb: { ...d.breadcrumb, items: [{ label: 'Home', href: '/' }, { label: s(o.breadcrumb) || s(o.title) || 'Contact' }] },
    eyebrow: { ...d.eyebrow, text: str(o.eyebrow) },
    title: { text: str(o.title) },
    leadEmphasis: { text: str(o.leadEmphasis) },
    lead: { text: str(o.lead) },
    leadAccent: { text: str(o.leadAccent) },
    pills: { items: proof.map((label) => ({ label })) },
    ctas,
  };
}

function upgradeQuick(o: Raw): ContactQuickContent {
  const d = defaultContactQuickContent();
  const items = list(o.items);
  return {
    ...d,
    items: items.length
      ? items.map((it) => ({
          label: str(it.label),
          value: str(it.value),
          href: s(it.href),
          subject: s(it.subject),
          emergency: it.emergency === true,
          icon: svgIcon(it.icon, 'contact-phone'),
        }))
      : d.items,
  };
}

function upgradeHelp(o: Raw): ContactHelpContent {
  const d = defaultContactHelpContent();
  const cards = list(o.cards);
  const tone = s(o.tone);
  const dark = o.darkCards === true;
  return {
    ...d,
    section:
      tone === 'dark'
        ? { tone: 'dark', bgColor: 'var(--navy-950)' }
        : tone === 'gray'
          ? { tone: 'light', bgColor: 'var(--gray-100)' }
          : d.section,
    header: {
      ...d.header,
      eyebrow: { ...d.header.eyebrow, text: str(o.eyebrow), style: { color: EYEBROW_CLASS_COLOR[s(o.eyebrowClass)] || 'var(--orange)' } },
      title: { text: str(o.title) },
      subtitle: { text: str(o.body) },
    },
    cards: cards.length
      ? cards.map((c) => {
          const v = s(c.variant);
          return {
            variant: v === 'pastel-green' ? 'green' : v === 'emergency' ? 'emergency' : 'default',
            background: s(c.bg) || (dark ? 'var(--navy-950)' : ''),
            border: dark ? '1px solid rgba(255,255,255,0.1)' : '',
            icon: { svg: s(c.icon) },
            badge: s(c.badge),
            badgeColor: s(c.badgeColor),
            media: [],
            title: { text: str(c.title), style: dark ? { color: 'var(--cyan)' } : undefined },
            body: { text: str(c.body), style: dark ? { color: '#B7C2D6' } : undefined },
            linkLabel: str(c.linkLabel),
            subject: s(c.subject),
            href: s(c.linkHref),
          } satisfies ContactHelpCard;
        })
      : d.cards,
  };
}

function upgradeLocations(o: Raw): ContactLocationsContent {
  const d = defaultContactLocationsContent();
  const old = normalizeLocationOfficeCards(o.locations);
  const fallback = resolveDefaultLocationMap(o, old);
  const color = s(o.eyebrowColor) || EYEBROW_CLASS_COLOR[s(o.eyebrowClass)] || 'var(--orange)';
  const border = s(o.cardBorderColor);
  const iconSize = s(o.iconSize);
  return {
    ...d,
    section: {
      tone: 'light',
      bgColor: s(o.sectionBg) || (s(o.tone) === 'light' ? 'var(--white)' : 'var(--gray-100)'),
      paddingTop: s(o.sectionPadding),
      paddingBottom: s(o.sectionPadding),
    },
    header: {
      ...d.header,
      eyebrow: {
        text: str(o.eyebrow) || 'LOCATIONS',
        line: false,
        style: clean({
          color,
          fontFamily: s(o.eyebrowFont),
          fontSize: s(o.eyebrowSize),
          fontWeight: s(o.eyebrowWeight),
          letterSpacing: s(o.eyebrowLetterSpacing),
          textTransform: s(o.eyebrowTransform),
        }),
      },
      title: {
        text: str(o.title),
        style: clean({ color: s(o.titleColor), fontFamily: s(o.titleFont), fontSize: s(o.titleSize), fontWeight: s(o.titleWeight) }),
      },
      subtitle: { text: str(o.body), style: clean({ color: s(o.bodyColor), fontFamily: s(o.bodyFont), fontSize: s(o.bodySize) }) },
    },
    layout: { ...d.layout, panelSide: s(o.layout) === 'img-left' ? 'left' : 'right' },
    locations: old.length
      ? old.map((l) => ({
          id: l.id,
          hidden: l.enabled === false,
          tag: l.tag || '',
          title: l.title,
          address: l.address,
          phone: l.phone || '',
          phoneHref: l.phoneHref || '',
          directionsUrl: l.directionsUrl || '',
          directionsLabel: l.directionsLabel || '',
          mapEmbedUrl: l.mapEmbedUrl || '',
          mapTitle: l.mapTitle || '',
          icon: { svg: l.icon || contactIcon('contact-pin') },
          isDefault: l.isDefault === true,
          media: [],
        }))
      : d.locations,
    panel: {
      ...d.panel,
      hidden: o.showMap === false,
      embedUrl: s(o.mapEmbedUrl) || (old.length ? '' : fallback.src),
      title: s(o.mapTitle),
      minHeight: s(o.mapMinHeight),
      minHeightTablet: s(o.mapMinHeight),
      minHeightMobile: s(o.mapMinHeight),
    },
    cardGap: s(o.locGridGap),
    cardStyle: {
      ...d.cardStyle,
      background: s(o.cardBg),
      border: border ? `1px solid ${border}` : '',
      radius: s(o.cardBorderRadius),
      padding: s(o.cardPadding),
      activeBorderColor: s(o.cardActiveBorderColor),
    },
    iconStyle: { background: s(o.iconBg), color: s(o.iconColor), boxSize: iconSize },
    tagStyle: clean({ color: s(o.tagColor), border: s(o.tagBorderColor) ? `1px solid ${s(o.tagBorderColor)}` : '' }),
    directionsLabel: s(o.directionsLabel) || d.directionsLabel,
  };
}

function upgradeForm(o: Raw): ContactFormContent {
  const d = defaultContactFormContent();
  const note = (o.emergencyNote && typeof o.emergencyNote === 'object' ? o.emergencyNote : {}) as Raw;
  const hasNote = Boolean(s(note.title) || s(note.body) || s(note.phone));
  const sideItems = list(o.sideItems);
  return {
    ...d,
    header: {
      ...d.header,
      eyebrow: { ...d.header.eyebrow, text: str(o.eyebrow) },
      title: { text: str(o.title) },
      subtitle: { text: str(o.body) },
    },
    form: {
      ...d.form,
      title: { text: str(o.formTitle) },
      intro: { text: str(o.formIntro) },
      submitLabel: s(o.submitLabel) || d.form.submitLabel,
      privacyNote: { text: str(o.privacyNote) },
      successTitle: { text: str(o.successTitle) },
      successBody: { text: str(o.successBody) },
    },
    side: {
      ...d.side,
      title: { text: str(o.sideTitle) },
      items: sideItems.map((it) => ({ label: str(it.label), value: str(it.value), href: s(it.href), icon: svgIcon(it.icon, 'contact-pin') })),
      hoursTitle: { text: str(o.hoursTitle) },
      hours: list(o.hours).map((h) => ({ label: str(h.label), value: str(h.value) })),
      officesTitle: { text: str(o.officesTitle) || d.side.officesTitle.text },
      offices: list(o.offices).map((of) => ({ title: str(of.title), lines: str(of.lines) })),
    },
    emergency: hasNote
      ? { ...d.emergency, title: str(note.title), body: str(note.body), phone: str(note.phone) }
      : { ...d.emergency, hidden: true },
  };
}

/** Convert an old minimal contact section into its configurable replacement, keeping all content. */
export function upgradeContactSection(oldType: string, content: unknown): { type: ContactSectionType; content: Record<string, unknown> } | null {
  const next = CONTACT_UPGRADE_MAP[oldType];
  if (!next) return null;
  const o = (content && typeof content === 'object' ? content : {}) as Raw;
  const map: Record<ContactSectionType, (o: Raw) => object> = {
    contact_hero: upgradeHero,
    contact_quick: upgradeQuick,
    contact_help: upgradeHelp,
    contact_locations: upgradeLocations,
    contact_form: upgradeForm,
  };
  return { type: next, content: map[next](o) as Record<string, unknown> };
}

export const CONTACT_SLUG = 'contact';

export const CONTACT_SEED_SECTIONS_V2: Array<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
}> = [
  { type: 'contact_hero', section_key: 'contact-hero', title: 'Contact hero', content_json: defaultContactHeroContent() },
  { type: 'contact_quick', section_key: 'quick-contact', title: 'Quick contact bar', content_json: defaultContactQuickContent() },
  { type: 'contact_help', section_key: 'how-we-help', title: 'How can we help (request cards)', content_json: defaultContactHelpContent() },
  { type: 'contact_locations', section_key: 'locations', title: 'Locations (offices + map)', content_json: defaultContactLocationsContent() },
  { type: 'contact_form', section_key: 'contact-form', title: 'Contact form', content_json: defaultContactFormContent() },
];
