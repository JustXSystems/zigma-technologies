import {
  ABOUT_ICON_PRESETS,
  ABOUT_TYPOGRAPHY_VERSION,
  type CtaButton,
  type ElementStyle,
  type IconEl,
  type SectionBox,
  type TextEl,
} from '@/lib/about-sections';
import {
  CONTACT_ICON_PRESETS,
  defaultContactFormContent,
  defaultContactHelpContent,
  defaultContactHeroContent,
  upgradeContactSection,
  withContactDefaults,
  type ContactAction,
  type ContactFormContent,
  type ContactHelpCard,
  type ContactHelpContent,
  type ContactHeroContent,
  type ContactIconStyle,
  type ContactSideItem,
} from '@/lib/contact-sections';
import {
  defaultLegacyStatsContent,
  withLegacyDefaults,
  type LegacyCardStyle,
  type LegacySectionHeader,
  type LegacyStatItem,
  type LegacyStatsContent,
} from '@/lib/legacy-sections';
import type { LifeColumns, LifeMediaItem } from '@/lib/life-sections';

/**
 * Fully configurable Careers page section family (page /careers):
 * careers_hero, careers_stats, careers_cards, careers_why, careers_jobs, careers_internship, careers_application.
 *
 * Hero, stat bar and icon cards reuse the Contact / Legacy renderers with careers defaults; the rest render
 * with scoped `.crs-*` CSS whose defaults mirror the live careers design. Headings / eyebrows follow
 * Theme Studio → Typography.
 */

export const CAREERS_SECTION_TYPES = [
  'careers_hero',
  'careers_stats',
  'careers_cards',
  'careers_why',
  'careers_jobs',
  'careers_internship',
  'careers_application',
] as const;
export type CareersSectionType = (typeof CAREERS_SECTION_TYPES)[number];

export function isCareersSectionType(type: string): type is CareersSectionType {
  return (CAREERS_SECTION_TYPES as readonly string[]).includes(type);
}

/** Older minimal section types used by the live /careers page, and their replacement. */
export const CAREERS_UPGRADE_MAP: Record<string, CareersSectionType> = {
  page_hero: 'careers_hero',
  culture_stats: 'careers_stats',
  feature_grid: 'careers_cards',
  why: 'careers_why',
  job_list: 'careers_jobs',
  internship: 'careers_internship',
  careers_apply: 'careers_application',
};

/** Apply-form anchor used by every "Apply" button (`focusApplyRole`). */
export const CAREERS_APPLY_ANCHOR = 'apply';

/* ------------------------------------------------------------------ */
/* Section content shapes                                              */
/* ------------------------------------------------------------------ */

export type CareersHeroContent = ContactHeroContent;
export type CareersStatsContent = LegacyStatsContent;
export type CareersCardsContent = ContactHelpContent;

export type CareersWhyCard = ContactAction & {
  hidden?: boolean;
  index: string;
  title: TextEl;
  body: TextEl;
  /** Card tint */
  background?: string;
  /** Outline / index accent for this card */
  accent?: string;
  icon?: IconEl;
  /** Several images / videos cross-fade at the top of the card */
  media: LifeMediaItem[];
  linkLabel?: string;
};

export type CareersWhyContent = {
  section: SectionBox;
  header: LegacySectionHeader;
  cards: CareersWhyCard[];
  columns: LifeColumns;
  gap?: string;
  reveal?: boolean;
  cardStyle: LegacyCardStyle & { mediaHeight?: string; mediaIntervalSeconds?: number };
  /** Animated "marching" outline around each card */
  outline: {
    hidden?: boolean;
    animate?: boolean;
    color?: string;
    /** Resting outline opacity (0–1) */
    baseOpacity?: string;
    width?: string;
    /** Length of the travelling highlight (share of the perimeter, 0–100) */
    dash?: number;
    speedSeconds?: number;
    /** Delay added per card so the highlights don't move in sync */
    staggerSeconds?: number;
  };
  indexStyle?: ElementStyle;
  titleStyle?: ElementStyle;
  titleHoverColor?: string;
  bodyStyle?: ElementStyle;
  iconStyle: ContactIconStyle;
  linkStyle?: ElementStyle;
  linkHoverColor?: string;
};

export type CareersJob = {
  hidden?: boolean;
  title: string;
  department?: string;
  location?: string;
  type?: string;
  /** Extra chips (e.g. "2–4 yrs", "Hybrid") */
  chips?: string[];
  /** Small highlighted label, e.g. "New" or "Urgent" */
  badge?: string;
  description?: string;
  background?: string;
  /** Apply-form role; empty = the job title */
  role?: string;
  /** Button label override; empty = section default */
  applyLabel?: string;
  /** Optional details link (job description page / PDF) */
  href?: string;
  linkLabel?: string;
  newTab?: boolean;
};

export type CareersJobsContent = {
  section: SectionBox;
  header: LegacySectionHeader;
  jobs: CareersJob[];
  columns: LifeColumns;
  gap?: string;
  reveal?: boolean;
  /** Department filter tabs above the list */
  filter: { enabled?: boolean; allLabel: string; style?: ElementStyle; activeBackground?: string; activeColor?: string };
  applyLabel: string;
  buttonVariant?: 'primary' | 'ghost' | 'ghost-dark';
  buttonSize?: 'sm' | 'md';
  buttonStyle?: ElementStyle;
  hideApply?: boolean;
  cardStyle: LegacyCardStyle;
  chipIcons: { enabled?: boolean; department: IconEl; location: IconEl; type: IconEl };
  titleStyle?: ElementStyle;
  descriptionStyle?: ElementStyle;
  chipStyle?: ElementStyle;
  badgeStyle?: ElementStyle;
  linkStyle?: ElementStyle;
  emptyText: TextEl;
};

export type CareersProgramPoint = { hidden?: boolean; label: string; value: string; icon?: IconEl };

export type CareersInternshipContent = {
  section: SectionBox;
  header: LegacySectionHeader;
  layout: {
    cardSide: 'left' | 'right';
    columns?: string;
    gap?: string;
    alignItems?: 'start' | 'center' | 'end' | 'stretch';
    /** Stacked (tablet / phone): program card above the text */
    mobileCardFirst?: boolean;
  };
  /** Images / videos under the text column */
  media: LifeMediaItem[];
  mediaHeight?: string;
  mediaRadius?: string;
  intervalSeconds?: number;
  ctas: CtaButton[];
  card: {
    hidden?: boolean;
    media: LifeMediaItem[];
    mediaHeight?: string;
    title: TextEl;
    body: TextEl;
    points: CareersProgramPoint[];
    pointColumns?: 1 | 2;
    ctaLabel: string;
    /** Apply-form role preselected by the button */
    role: string;
    /** Link instead of the apply form */
    href?: string;
    buttonVariant?: 'primary' | 'ghost' | 'ghost-dark';
    buttonStyle?: ElementStyle;
    buttonFullWidth?: boolean;
  };
  cardStyle: LegacyCardStyle;
  iconStyle: ContactIconStyle;
  labelStyle?: ElementStyle;
  valueStyle?: ElementStyle;
};

export type CareersFieldText = { label: string; placeholder?: string; hidden?: boolean; hint?: string };
export type CareersStep = { hidden?: boolean; text: string };

export type CareersApplicationContent = {
  section: SectionBox;
  header: LegacySectionHeader;
  layout: ContactFormContent['layout'];
  form: ContactFormContent['form'];
  fields: ContactFormContent['fields'];
  labels: {
    name: CareersFieldText;
    email: CareersFieldText;
    phone: CareersFieldText;
    experience: CareersFieldText;
    role: CareersFieldText;
    resume: CareersFieldText;
    message: CareersFieldText & { rows?: number };
  };
  roles: string[];
  side: {
    hidden?: boolean;
    background?: string;
    padding?: string;
    gap?: string;
    color?: string;
    /** Push blocks apart to fill the panel height */
    spread?: boolean;
    media: LifeMediaItem[];
    mediaPosition?: 'top' | 'bottom';
    mediaHeight?: string;
    intervalSeconds?: number;
    headingStyle?: ElementStyle;
    dividers?: boolean;
    dividerColor?: string;
    linkHoverColor?: string;
    stepsTitle: TextEl;
    steps: CareersStep[];
    stepIcon: IconEl;
    stepStyle?: ElementStyle;
    stepGap?: string;
    title: TextEl;
    items: ContactSideItem[];
    iconStyle: ContactIconStyle;
    labelStyle?: ElementStyle;
    valueStyle?: ElementStyle;
  };
};

/* ------------------------------------------------------------------ */
/* Icon presets                                                        */
/* ------------------------------------------------------------------ */

export const CAREERS_ICON_PRESETS: Array<{ key: string; label: string; svg: string }> = [
  {
    key: 'careers-wrench',
    label: 'Wrench (hands-on)',
    svg: '<path d="M14.7 6.3a4 4 0 00-5.66 5.66l-6.2 6.2a1.5 1.5 0 002.12 2.12l6.2-6.2a4 4 0 005.66-5.66l-2.5 2.5-2.12-2.12z"/>',
  },
  {
    key: 'careers-team',
    label: 'Team',
    svg: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  },
  { key: 'careers-pin', label: 'Map pin', svg: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>' },
  { key: 'careers-growth', label: 'Growth bars', svg: '<path d="M12 20V10M18 20V4M6 20v-4"/>' },
  {
    key: 'careers-heart',
    label: 'Heart (health)',
    svg: '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/>',
  },
  {
    key: 'careers-cap',
    label: 'Graduation cap (learning)',
    svg: '<path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
  },
  { key: 'careers-money', label: 'Money (bonus)', svg: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>' },
  { key: 'careers-calendar', label: 'Calendar (leave)', svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
  { key: 'careers-bank', label: 'Building (provident fund)', svg: '<path d="M3 21h18M5 21V9l6-4 6 4v12M9 21v-6h6v6"/>' },
  {
    key: 'careers-star',
    label: 'Star (recognition)',
    svg: '<path d="M12 3.5l2.47 5.01 5.53.8-4 3.9.94 5.5-4.94-2.6-4.94 2.6.94-5.5-4-3.9 5.53-.8L12 3.5z"/>',
  },
  {
    key: 'careers-briefcase',
    label: 'Briefcase (department)',
    svg: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>',
  },
  { key: 'careers-clock', label: 'Clock (duration / type)', svg: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>' },
  { key: 'careers-mail', label: 'Email', svg: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>' },
  {
    key: 'careers-rupee',
    label: 'Rupee (stipend)',
    svg: '<path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a5 5 0 000-10"/>',
  },
];

export const CAREERS_ALL_ICON_PRESETS = [...CAREERS_ICON_PRESETS, ...CONTACT_ICON_PRESETS, ...ABOUT_ICON_PRESETS];

const careersIcon = (key: string) => CAREERS_ICON_PRESETS.find((p) => p.key === key)?.svg || '';
const icon = (key: string): IconEl => ({ svg: careersIcon(key) });
const contactIconSvg = (key: string) => CONTACT_ICON_PRESETS.find((p) => p.key === key)?.svg || '';

/* ------------------------------------------------------------------ */
/* Defaults (mirror the live careers page)                             */
/* ------------------------------------------------------------------ */

/** Live why-card tints (tint-1 … tint-6). */
export const CAREERS_WHY_TINTS = ['#FFF7F2', '#F1FAF4', '#F1FAFC', '#FFFCF3', '#F8F5FD', '#F5F8FE'];

export const CAREERS_DEFAULT_ROLES = [
  'Solar Design Engineer',
  'UPS Service Engineer',
  'Site Supervisor — Solar EPC',
  'Business Development Manager',
  'Graduate Engineer Trainee',
  'Internship Program',
  'General Application',
];

const header = (eyebrow: string, title: string, subtitle: string, align: 'left' | 'center'): LegacySectionHeader => ({
  align,
  eyebrow: { text: eyebrow, line: false, style: { color: 'var(--orange)' } },
  title: { text: title },
  subtitle: { text: subtitle },
  bar: { hidden: true },
});

export function defaultCareersHeroContent(): CareersHeroContent {
  const d = defaultContactHeroContent();
  return {
    ...d,
    section: { ...d.section, paddingTop: '8rem', paddingBottom: '4rem', paddingTopMobile: '6.5rem', paddingBottomMobile: '2.75rem' },
    background: {
      ...d.background,
      items: [
        {
          src: '/assets/images/zigma-technologies-engineers-collaborati.jpg',
          title: 'Zigma Technologies engineers collaborating on a power electronics project',
        },
      ],
      position: 'center 35%',
    },
    breadcrumb: { ...d.breadcrumb, items: [{ label: 'Home', href: '/' }, { label: 'Careers' }] },
    eyebrow: { ...d.eyebrow, text: 'JOIN THE TEAM' },
    title: { text: "Build India's Power Infrastructure With Us" },
    leadEmphasis: { text: '' },
    lead: {
      text: "At Zigma, engineers don't sit on the sidelines — they design, build, and maintain the solar, UPS, and battery systems that keep Indian industry running. If you want real ownership from day one, this is where you'll find it.",
    },
    leadAccent: { text: '' },
  };
}

export function defaultCareersStatsContent(): CareersStatsContent {
  return {
    ...defaultLegacyStatsContent(),
    section: {
      tone: 'dark',
      bgColor: 'var(--navy-900)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      paddingTop: '2rem',
      paddingBottom: '2rem',
      paddingTopMobile: '2rem',
      paddingBottomMobile: '2rem',
    },
    items: [
      { value: '20', suffix: '+', label: 'Years of Engineering' },
      { value: '150', suffix: '+', label: 'Engineers & Specialists' },
      { value: '1500', suffix: '+', label: 'Projects Delivered' },
      { value: '12', suffix: '+', label: 'Cities Across India' },
    ],
    columns: { desktop: 4, tablet: 2, mobile: 2 },
    align: 'center',
    animateCount: true,
    countDurationMs: 1800,
    hoverLift: false,
    suffixColor: 'var(--cyan)',
    numberStyle: { color: 'var(--cyan)', marginBottom: '0.3rem' },
    labelStyle: {
      fontFamily: 'mono',
      fontSize: '0.72rem',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: '#8FA3C2',
    },
    iconStyle: {},
  };
}

const featCard = (title: string, body: string, iconKey: string): ContactHelpCard => ({
  title: { text: title },
  body: { text: body },
  icon: icon(iconKey),
  media: [],
  linkLabel: '',
  subject: '',
});

/** White bordered feature cards (Life at Zigma look). */
const LIFE_CARD_STYLE: CareersCardsContent['cardStyle'] = {
  background: '#FFFFFF',
  border: '1px solid var(--gray-200)',
  shadow: 'none',
  hoverLift: true,
  mediaIntervalSeconds: 4.5,
};

export function defaultCareersLifeCardsContent(): CareersCardsContent {
  const d = defaultContactHelpContent();
  return {
    ...d,
    section: { tone: 'light', bgColor: 'var(--white)' },
    header: header(
      'LIFE AT ZIGMA',
      'Engineering-First, Every Day',
      "We're a team of people who'd rather be on-site solving a real problem than sitting through another status meeting. Here's what that looks like day to day.",
      'left'
    ),
    cards: [
      featCard(
        'Hands-On From Day One',
        'No years-long ramp-up. New engineers get real site and project exposure within their first few months.',
        'careers-wrench'
      ),
      featCard('Small Teams, Real Ownership', 'Flat project teams mean your decisions matter — and your name is on the work that ships.', 'careers-team'),
      featCard(
        'Pan-India Project Exposure',
        'Work across solar, UPS, and battery projects in multiple states — not just one client, one city.',
        'careers-pin'
      ),
      featCard(
        'Growth That Keeps Pace',
        'As Zigma grows, so does the scope of what you own — most of our team leads have grown up internally.',
        'careers-growth'
      ),
    ],
    columns: { desktop: 4, tablet: 2, mobile: 1 },
    reveal: true,
    cardStyle: { ...LIFE_CARD_STYLE },
    variants: {},
    iconStyle: {},
  };
}

export function defaultCareersBenefitsContent(): CareersCardsContent {
  const d = defaultCareersLifeCardsContent();
  return {
    ...d,
    header: header('EMPLOYEE BENEFITS', 'We Take Care of Our People', 'Benefits designed around real life, not just a checklist.', 'center'),
    cards: [
      featCard('Health Insurance', 'Comprehensive medical coverage for you and your immediate family.', 'careers-heart'),
      featCard('Learning & Development', 'Certifications, technical training, and conference sponsorship for the right roles.', 'careers-cap'),
      featCard('Performance Bonuses', 'Annual and project-linked bonuses tied to real outcomes, not just tenure.', 'careers-money'),
      featCard('Flexible Leave Policy', 'Leave that respects family needs, travel, and the realities of field engineering life.', 'careers-calendar'),
      featCard('Provident Fund', 'Statutory PF contributions and long-term savings support as part of your package.', 'careers-bank'),
      featCard('Employee Recognition', 'Peer and leadership recognition for people who quietly keep critical systems online.', 'careers-star'),
    ],
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    cardStyle: { shadow: 'none', hoverLift: true, mediaIntervalSeconds: 4.5 },
  };
}

const whyCard = (index: string, title: string, body: string, i: number): CareersWhyCard => ({
  index,
  title: { text: title },
  body: { text: body },
  background: CAREERS_WHY_TINTS[i % CAREERS_WHY_TINTS.length],
  media: [],
});

export function defaultCareersWhyContent(): CareersWhyContent {
  return {
    section: { tone: 'light', bgColor: 'var(--gray-100)' },
    header: header('WHY JOIN US', "What You'll Get Working Here", "Beyond the paycheck — here's what actually makes people stay at Zigma.", 'left'),
    cards: [
      whyCard('01', 'Real Engineering Impact', 'Your work keeps hospitals, factories, and data centres powered — not stuck in a slide deck.', 0),
      whyCard('02', 'Fast-Growing Company', "We're scaling quickly across India, which means new roles, new responsibility, and new cities.", 1),
      whyCard(
        '03',
        'Learn From Specialists',
        "Work alongside engineers who've spent decades in solar, power electronics, and critical infrastructure.",
        2
      ),
      whyCard('04', 'Ownership & Autonomy', "Bring a better way to do something and you'll be the one who gets to build it.", 3),
      whyCard('05', 'Competitive Growth Path', 'Clear levels, regular reviews, and a straight line from individual contributor to project lead.', 4),
      whyCard(
        '06',
        'Nationwide Opportunities',
        'Relocate, travel, or stay local — our project spread across India means options, not one fixed desk.',
        5
      ),
    ],
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    reveal: true,
    cardStyle: { hoverLift: false, mediaIntervalSeconds: 4.5 },
    outline: { animate: true, dash: 70, speedSeconds: 5.5, staggerSeconds: 0.6 },
    iconStyle: {},
  };
}

export function defaultCareersJobsContent(): CareersJobsContent {
  const job = (title: string, department: string, location: string): CareersJob => ({ title, department, location, type: 'Full-Time' });
  return {
    section: { tone: 'light', bgColor: 'var(--white)' },
    header: header('CURRENT OPENINGS', 'Open Roles Right Now', "Don't see an exact fit? Apply anyway — we're always looking for good engineers.", 'left'),
    jobs: [
      job('Solar Design Engineer', 'Engineering', 'Bengaluru'),
      job('UPS Service Engineer', 'Field Service', 'Mumbai'),
      job('Site Supervisor — Solar EPC', 'Site Operations', 'Delhi'),
      job('Business Development Manager', 'Sales', 'Bengaluru'),
      job('Graduate Engineer Trainee', 'Engineering', 'Multiple Locations'),
    ],
    columns: { desktop: 1, tablet: 1, mobile: 1 },
    reveal: true,
    filter: { enabled: false, allLabel: 'All roles' },
    applyLabel: 'Apply Now →',
    buttonVariant: 'primary',
    buttonSize: 'sm',
    cardStyle: { hoverLift: true },
    chipIcons: {
      enabled: false,
      department: icon('careers-briefcase'),
      location: icon('careers-pin'),
      type: icon('careers-clock'),
    },
    emptyText: { text: 'No open roles right now — send a general application below and we will keep you in mind.' },
  };
}

export function defaultCareersInternshipContent(): CareersInternshipContent {
  return {
    section: { tone: 'light', bgColor: 'var(--gray-100)' },
    header: header(
      'INTERNSHIP PROGRAM',
      'Start Your Career in Power Engineering',
      "Our internship program puts students and fresh graduates on real solar, UPS, and engineering projects — not just filing paperwork. You'll be paired with a senior engineer and given actual project work from week one.",
      'left'
    ),
    layout: { cardSide: 'right', columns: '', gap: '', alignItems: 'center', mobileCardFirst: false },
    media: [],
    intervalSeconds: 5,
    ctas: [],
    card: {
      media: [],
      title: { text: 'Zigma Engineering Internship' },
      body: { text: 'Open to final-year students and recent graduates in Electrical, Electronics, or Mechanical Engineering.' },
      points: [
        { label: 'Duration', value: '3 – 6 Months' },
        { label: 'Locations', value: 'Bengaluru, Mumbai, Delhi' },
        { label: 'Stipend', value: 'Paid, Performance-Linked' },
        { label: 'Disciplines', value: 'EEE, ECE, Mechanical' },
      ],
      pointColumns: 2,
      ctaLabel: 'Apply for Internship →',
      role: 'Internship Program',
      buttonVariant: 'primary',
      buttonFullWidth: true,
    },
    cardStyle: {},
    iconStyle: {},
  };
}

export function defaultCareersApplicationContent(): CareersApplicationContent {
  const f = defaultContactFormContent();
  return {
    section: { tone: 'light', bgColor: 'var(--gray-100)' },
    header: header(
      'APPLY ONLINE',
      'Ready to Apply?',
      'Fill in your details below — our HR team reviews every application within 3–5 business days.',
      'center'
    ),
    layout: { sidePosition: 'right', columns: '', mobileSideFirst: false },
    form: {
      ...f.form,
      title: { text: 'Submit Your Application' },
      intro: { text: 'All fields marked with * are required.' },
      submitLabel: 'Submit Application →',
      submittingLabel: 'Submitting…',
      privacyNote: {
        text: 'By applying, you agree to be contacted by Zigma Technologies regarding your application. We never share your details with third parties.',
      },
      successTitle: { text: 'Application received' },
      successBody: {
        text: 'Thank you for applying to Zigma Technologies. We sincerely appreciate your interest in joining our team. Our recruitment team will review your application and contact you if your profile matches our current requirements. We look forward to connecting with you soon.',
      },
      redirectUrl: '',
      fieldColumns: 2,
    },
    fields: {},
    labels: {
      name: { label: 'Full Name', placeholder: 'Your full name' },
      email: { label: 'Email', placeholder: 'you@example.com' },
      phone: { label: 'Phone', placeholder: '+91 95901 37444' },
      experience: { label: 'Experience', placeholder: 'e.g. 2 years / Fresher' },
      role: { label: 'Position Applying For', placeholder: 'Select a role' },
      resume: { label: 'Resume / CV', hint: 'PDF or Word document, up to 5MB.' },
      message: { label: 'A Bit About You', placeholder: "Tell us why you'd be a good fit — no need for a formal cover letter.", rows: 5 },
    },
    roles: [...CAREERS_DEFAULT_ROLES],
    side: {
      spread: true,
      gap: '2.2rem',
      media: [],
      mediaPosition: 'top',
      intervalSeconds: 5,
      dividers: true,
      stepsTitle: { text: 'What Happens Next?' },
      steps: [
        { text: 'We review all applications within 3–5 business days.' },
        { text: 'Shortlisted candidates will receive a phone call or email to schedule the first interview.' },
        { text: 'The final interview is typically conducted with the Hiring Manager and the Head of Department or Department Manager.' },
      ],
      stepIcon: icon('careers-clock'),
      title: { text: 'Questions About a Role?' },
      items: [
        {
          label: 'Careers Email',
          value: 'careers@zigma-technologies.com',
          href: 'mailto:careers@zigma-technologies.com',
          icon: icon('careers-mail'),
        },
        { label: 'Contact HR', value: 'hr@zigma-technologies.com', href: 'mailto:hr@zigma-technologies.com', icon: icon('careers-mail') },
        { label: 'Phone', value: '{{phone}}', href: 'tel:{{phone}}', icon: { svg: contactIconSvg('contact-phone') } },
      ],
      iconStyle: {},
    },
  };
}

export function defaultCareersSectionContent(type: string, sectionKey?: string | null): Record<string, unknown> | null {
  switch (type) {
    case 'careers_hero':
      return defaultCareersHeroContent();
    case 'careers_stats':
      return defaultCareersStatsContent();
    case 'careers_cards':
      return sectionKey === 'employee-benefits' ? defaultCareersBenefitsContent() : defaultCareersLifeCardsContent();
    case 'careers_why':
      return defaultCareersWhyContent();
    case 'careers_jobs':
      return defaultCareersJobsContent();
    case 'careers_internship':
      return defaultCareersInternshipContent();
    case 'careers_application':
      return defaultCareersApplicationContent();
    default:
      return null;
  }
}

/**
 * Fill any missing top-level keys from defaults (one level of object merge) and normalize arrays
 * so partially saved or hand-edited JSON never crashes the renderer / editor.
 */
export function withCareersDefaults<T extends object>(type: CareersSectionType, raw: unknown): T {
  const base = defaultCareersSectionContent(type) as Record<string, unknown>;
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const merged: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(src)) {
    if (v === undefined || v === null) continue;
    const b = base[k];
    if (b && typeof b === 'object' && !Array.isArray(b) && typeof v === 'object' && !Array.isArray(v)) {
      merged[k] = { ...(b as object), ...(v as object) };
    } else {
      merged[k] = v;
    }
  }
  /* Shared shapes: every key is already present, so the other family's defaults only normalize arrays. */
  if (type === 'careers_hero') return withContactDefaults<T>('contact_hero', merged);
  if (type === 'careers_cards') return withContactDefaults<T>('contact_help', merged);
  if (type === 'careers_stats') {
    const out = withLegacyDefaults<Record<string, unknown>>('legacy_stats', merged);
    out.items = (Array.isArray(out.items) ? out.items : []).filter((x) => x && typeof x === 'object');
    out.typographyVersion = ABOUT_TYPOGRAPHY_VERSION;
    return out as T;
  }

  const out = merged;
  const arr = <V>(v: unknown): V[] => (Array.isArray(v) ? (v as V[]).filter((x) => x && typeof x === 'object') : []);
  const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  const iconOf = (v: unknown): IconEl => (v && typeof v === 'object' ? (v as IconEl) : { svg: typeof v === 'string' ? v : '' });
  if (type === 'careers_why') {
    out.cards = arr<CareersWhyCard>(out.cards).map((c) => ({ ...c, icon: c.icon ? iconOf(c.icon) : undefined, media: arr<LifeMediaItem>(c.media) }));
    out.iconStyle = out.iconStyle || {};
  }
  if (type === 'careers_jobs') {
    out.jobs = arr<CareersJob>(out.jobs).map((j) => ({ ...j, chips: strs(j.chips) }));
    const ci = out.chipIcons as CareersJobsContent['chipIcons'];
    out.chipIcons = { ...ci, department: iconOf(ci?.department), location: iconOf(ci?.location), type: iconOf(ci?.type) };
  }
  if (type === 'careers_internship') {
    out.media = arr<LifeMediaItem>(out.media);
    out.ctas = arr<CtaButton>(out.ctas);
    const card = out.card as CareersInternshipContent['card'];
    out.card = {
      ...card,
      media: arr<LifeMediaItem>(card?.media),
      points: arr<CareersProgramPoint>(card?.points).map((p) => ({ ...p, icon: p.icon ? iconOf(p.icon) : undefined })),
    };
  }
  if (type === 'careers_application') {
    const baseLabels = (base.labels || {}) as CareersApplicationContent['labels'];
    const labels = (out.labels || {}) as Partial<CareersApplicationContent['labels']>;
    out.labels = Object.fromEntries(
      Object.entries(baseLabels).map(([k, v]) => {
        const own = labels[k as keyof CareersApplicationContent['labels']];
        return [k, own && typeof own === 'object' ? { ...v, ...own } : v];
      })
    );
    out.roles = strs(out.roles);
    const side = out.side as CareersApplicationContent['side'];
    out.side = {
      ...side,
      media: arr<LifeMediaItem>(side?.media),
      steps: arr<CareersStep>(side?.steps),
      stepIcon: iconOf(side?.stepIcon),
      items: arr<ContactSideItem>(side?.items).map((it) => ({ ...it, icon: iconOf(it.icon) })),
      iconStyle: side?.iconStyle || {},
    };
  }
  out.typographyVersion = ABOUT_TYPOGRAPHY_VERSION;
  return out as T;
}

/* ------------------------------------------------------------------ */
/* Upgrade: old minimal careers sections → careers_* (keeps content)   */
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

const toneBox = (tone: string, fallback: SectionBox): SectionBox =>
  tone === 'dark'
    ? { tone: 'dark', bgColor: 'var(--navy-950)' }
    : tone === 'gray'
      ? { tone: 'light', bgColor: 'var(--gray-100)' }
      : tone === 'light'
        ? { tone: 'light', bgColor: 'var(--white)' }
        : fallback;

function upgradeHeader(o: Raw, d: LegacySectionHeader): LegacySectionHeader {
  return {
    ...d,
    eyebrow: { ...d.eyebrow, text: str(o.eyebrow) || d.eyebrow.text, style: { color: EYEBROW_CLASS_COLOR[s(o.eyebrowClass)] || 'var(--orange)' } },
    title: { text: str(o.title) },
    subtitle: { text: str(o.body) },
  };
}

function upgradeHero(o: Raw): CareersHeroContent {
  const d = defaultCareersHeroContent();
  const up = upgradeContactSection('page_hero', o)?.content as ContactHeroContent | undefined;
  if (!up) return d;
  const image = s(o.image);
  return {
    ...up,
    section: d.section,
    background: { ...d.background, items: image ? up.background.items : d.background.items, mobileItems: up.background.mobileItems },
    breadcrumb: { ...d.breadcrumb, items: [{ label: 'Home', href: '/' }, { label: s(o.breadcrumb) || s(o.title) || 'Careers' }] },
  };
}

/** "1500+" → value 1500, suffix "+"; "₹5L" → prefix ₹, value 5, suffix L. */
export function splitStatValue(raw: string): Pick<LegacyStatItem, 'value' | 'prefix' | 'suffix'> {
  const m = raw.trim().match(/^([^\d]*?)(\d[\d,.]*)(.*)$/);
  if (!m) return { value: raw.trim() };
  return { prefix: m[1] || undefined, value: m[2], suffix: m[3] || undefined };
}

function upgradeStats(o: Raw): CareersStatsContent {
  const d = defaultCareersStatsContent();
  const items = list(o.items);
  return {
    ...d,
    items: items.length ? items.map((it) => ({ ...splitStatValue(s(it.value)), label: str(it.label) })) : d.items,
  };
}

function upgradeCards(o: Raw, sectionKey?: string | null): CareersCardsContent {
  const benefits = sectionKey === 'employee-benefits';
  const d = benefits ? defaultCareersBenefitsContent() : defaultCareersLifeCardsContent();
  const up = upgradeContactSection('feature_grid', o)?.content as ContactHelpContent | undefined;
  if (!up) return d;
  return {
    ...up,
    header: { ...up.header, align: d.header.align },
    cards: list(o.cards).length ? up.cards : d.cards,
    columns: d.columns,
    cardStyle: d.cardStyle,
  };
}

function upgradeWhy(o: Raw): CareersWhyContent {
  const d = defaultCareersWhyContent();
  const cards = list(o.cards);
  return {
    ...d,
    section: toneBox(s(o.tone), d.section),
    header: upgradeHeader(o, d.header),
    cards: cards.length
      ? cards.map((c, i) => {
          const tint = Number(s(c.tint).replace('tint-', ''));
          return {
            index: str(c.index),
            title: { text: str(c.title) },
            body: { text: str(c.desc || c.body) },
            background: s(c.bg) || CAREERS_WHY_TINTS[(tint >= 1 && tint <= 6 ? tint - 1 : i) % CAREERS_WHY_TINTS.length],
            media: [],
          };
        })
      : d.cards,
  };
}

function upgradeJobs(o: Raw): CareersJobsContent {
  const d = defaultCareersJobsContent();
  const jobs = list(o.jobs);
  return {
    ...d,
    header: upgradeHeader(o, d.header),
    jobs: jobs.length
      ? jobs.map((j) => ({
          title: str(j.title),
          department: str(j.department),
          location: str(j.location),
          type: str(j.type),
          background: s(j.bg),
          chips: [],
        }))
      : d.jobs,
  };
}

function upgradeInternship(o: Raw): CareersInternshipContent {
  const d = defaultCareersInternshipContent();
  const points = list(o.points);
  return {
    ...d,
    header: upgradeHeader(o, d.header),
    card: {
      ...d.card,
      title: { text: str(o.cardTitle) },
      body: { text: str(o.cardBody) },
      points: points.length ? points.map((p) => ({ label: str(p.label), value: str(p.value) })) : d.card.points,
      ctaLabel: str(o.cta),
      role: s(o.applyRole) || d.card.role,
    },
  };
}

function upgradeApplication(o: Raw): CareersApplicationContent {
  const d = defaultCareersApplicationContent();
  const steps = list(o.nextSteps);
  const sideItems = list(o.sideItems);
  const roles = Array.isArray(o.roles) ? (o.roles as unknown[]).map((r) => s(r)).filter(Boolean) : [];
  return {
    ...d,
    header: upgradeHeader(o, d.header),
    form: {
      ...d.form,
      title: { text: str(o.formTitle) || d.form.title.text },
      intro: { text: str(o.formIntro) || d.form.intro.text },
      submitLabel: s(o.submitLabel) || d.form.submitLabel,
      privacyNote: { text: str(o.privacyNote) },
      successTitle: { text: str(o.successTitle) || d.form.successTitle.text },
      successBody: { text: str(o.successBody) || d.form.successBody.text },
    },
    roles: roles.length ? roles : d.roles,
    side: {
      ...d.side,
      stepsTitle: { text: str(o.nextTitle) || d.side.stepsTitle.text },
      steps: steps.map((st) => ({ text: str(st.text) })).filter((st) => st.text.trim()),
      title: { text: str(o.sideTitle) || d.side.title.text },
      items: sideItems.map((it) => ({
        label: str(it.label),
        value: str(it.value),
        href: s(it.href),
        icon: { svg: s(it.icon) },
      })),
    },
  };
}

/** Convert an old minimal careers section into its configurable replacement, keeping all content. */
export function upgradeCareersSection(
  oldType: string,
  content: unknown,
  sectionKey?: string | null
): { type: CareersSectionType; content: Record<string, unknown> } | null {
  const next = CAREERS_UPGRADE_MAP[oldType];
  if (!next) return null;
  const o = (content && typeof content === 'object' ? content : {}) as Raw;
  const map: Record<CareersSectionType, (o: Raw) => object> = {
    careers_hero: upgradeHero,
    careers_stats: upgradeStats,
    careers_cards: (raw) => upgradeCards(raw, sectionKey),
    careers_why: upgradeWhy,
    careers_jobs: upgradeJobs,
    careers_internship: upgradeInternship,
    careers_application: upgradeApplication,
  };
  return { type: next, content: map[next](o) as Record<string, unknown> };
}

export const CAREERS_SLUG = 'careers';

export const CAREERS_SEED_SECTIONS_V2: Array<{
  type: string;
  section_key: string | null;
  title: string;
  content_json: Record<string, unknown>;
}> = [
  { type: 'careers_hero', section_key: 'careers-hero', title: 'Careers hero', content_json: defaultCareersHeroContent() },
  { type: 'careers_stats', section_key: 'culture', title: 'Culture stats bar', content_json: defaultCareersStatsContent() },
  { type: 'careers_cards', section_key: 'life-at-zigma', title: 'Life at Zigma (cards)', content_json: defaultCareersLifeCardsContent() },
  { type: 'careers_why', section_key: 'why-join-us', title: 'Why join us', content_json: defaultCareersWhyContent() },
  { type: 'careers_jobs', section_key: 'current-openings', title: 'Current openings', content_json: defaultCareersJobsContent() },
  { type: 'careers_internship', section_key: 'internship-program', title: 'Internship program', content_json: defaultCareersInternshipContent() },
  { type: 'careers_cards', section_key: 'employee-benefits', title: 'Employee benefits (cards)', content_json: defaultCareersBenefitsContent() },
  { type: 'careers_application', section_key: 'apply', title: 'Apply online (application form)', content_json: defaultCareersApplicationContent() },
];
