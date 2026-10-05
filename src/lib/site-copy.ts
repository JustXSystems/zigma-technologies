/** Marketing / chrome copy editable from Admin → Site Copy (theme_settings.site_copy). */

import type { HeroHeight } from '@/lib/hero-height';

/** Code-rendered pages whose hero height is set in Admin → Site Copy → Hero height. CMS pages set it per section. */
export const HERO_HEIGHT_PAGES = [
  { key: 'industryDetail', label: 'Industry detail (/industries/[slug])' },
  { key: 'locations', label: 'Locations hub (/locations)' },
  { key: 'locationDetail', label: 'City + city-service pages (/locations/…)' },
  { key: 'resources', label: 'Resources hub (/resources)' },
  { key: 'resourceDetail', label: 'Resource article (/resources/[slug])' },
  { key: 'press', label: 'Press hub (/press)' },
  { key: 'pressDetail', label: 'Press article (/press/[slug])' },
  { key: 'sla', label: 'SLA (/sla)' },
  { key: 'search', label: 'Search (/search)' },
  { key: 'thankYou', label: 'Thank-you (/thank-you)' },
  { key: 'cookies', label: 'Cookies (/cookies)' },
  { key: 'solutionFinder', label: 'Solution finder (/tools/solution-finder)' },
  { key: 'upsCalculator', label: 'UPS calculator (/tools/ups-calculator)' },
  { key: 'solarRoi', label: 'Solar ROI (/tools/solar-roi)' },
  { key: 'locales', label: 'Locale landings (/hi, /kn)' },
] as const;

export type HeroHeightPageKey = (typeof HERO_HEIGHT_PAGES)[number]['key'];

export type HubCopy = {
  eyebrow: string;
  title: string;
  lead: string;
  ctaPrimary: string;
  ctaPrimaryHref: string;
  ctaSecondary: string;
  ctaSecondaryHref: string;
  proofRail: string[];
  ctaBandEyebrow: string;
  ctaBandTitle: string;
  ctaBandLead: string;
};

export type ConsultInterestOption = {
  title: string;
  subtitle: string;
  subject: string;
};

export type ToolNeedOption = {
  id: 'backup' | 'solar' | 'storage' | 'ev' | 'service' | 'unsure';
  title: string;
  blurb: string;
};

export type ToolPageChrome = {
  eyebrow: string;
  title: string;
  lead: string;
  image: string;
  breadcrumbTools: string;
  breadcrumbSelf: string;
  secondaryToolLabel: string;
  secondaryToolHref: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  ctaBandTitle: string;
  ctaBandLead: string;
  ctaBandPrimaryLabel: string;
  ctaBandPrimaryHref: string;
  ctaBandSecondaryLabel: string;
  ctaBandSecondaryHref: string;
};

export type CatalogChrome = {
  eyebrow: string;
  title: string;
  lead: string;
  socialProofTitle: string;
};

export type LocaleCopy = {
  langName: string;
  title: string;
  lead: string;
  ups: string;
  solar: string;
  calc: string;
  locations: string;
  sla: string;
  cta: string;
  englishSite: string;
  altLocaleLabel: string;
};

/** Google title (brand appended automatically) and description for a page without its own admin SEO fields. */
export type PageSeoCopy = {
  title: string;
  description: string;
};

export type SiteCopy = {
  talk: {
    buttonLabel: string;
    call: string;
    whatsapp: string;
    callback: string;
    solutionFinder: string;
    emergency: string;
    whatsappPrefill: string;
  };
  footer: {
    newsletterLabel: string;
    newsletterPlaceholder: string;
    subscribe: string;
    subscribeSuccess: string;
    stickyCall: string;
    stickyWhatsapp: string;
    stickyQuote: string;
    privacy: string;
    cookies: string;
    terms: string;
    /** Fallback Contact column heading when nav has no Contact column */
    contactHeading: string;
    /** Label above footer office / address block */
    officeHeading: string;
    officeHoursLabel: string;
    officeSlaLabel: string;
  };
  cookies: {
    bannerBody: string;
    necessaryLabel: string;
    analyticsLabel: string;
    marketingLabel: string;
    saveChoices: string;
    declineOptional: string;
    pageEyebrow: string;
    pageTitle: string;
    pageLead: string;
    necessaryHeading: string;
    necessaryBody: string;
    analyticsHeading: string;
    analyticsBody: string;
    marketingHeading: string;
    marketingBody: string;
    manageHint: string;
  };
  thankYou: {
    eyebrow: string;
    titleEnquiry: string;
    titleCallback: string;
    titleBrochure: string;
    titleCareers: string;
    leadPrefix: string;
    leadCityPrefix: string;
    leadSuffix: string;
    proofRail: string[];
    nextTitle: string;
    nextSteps: string[];
    talkTitle: string;
    whatsappPrefill: string;
    /** Full-bleed hero background (media library path). */
    heroImage: string;
    /** Optional ≤760px hero override. */
    heroImageMobile: string;
  };
  hubs: {
    industries: HubCopy;
    locations: HubCopy;
    resources: HubCopy;
    press: HubCopy;
    sla: HubCopy;
    search: HubCopy;
  };
  socialProof: {
    title: string;
    subtitle: string;
  };
  searchForm: {
    placeholder: string;
    ariaLabel: string;
  };
  /** Accessible names for icon-only buttons / social marks */
  a11y: {
    menuToggle: string;
    close: string;
    closeConsultation: string;
    closeEnquiry: string;
    copyLink: string;
    facebook: string;
    instagram: string;
    linkedin: string;
    x: string;
    youtube: string;
    viewCertifications: string;
  };
  consultation: {
    badge: string;
    title: string;
    step0Lead: string;
    step1Lead: string;
    step2Lead: string;
    ariaLabel: string;
    proofStrip: string[];
    interestOptions: ConsultInterestOption[];
    capacityOptions: string[];
    urgencyOptions: string[];
    capacityLabel: string;
    locationLabel: string;
    locationPlaceholder: string;
    urgencyLabel: string;
    step2Label: string;
    step3Label: string;
    backLabel: string;
    continueQuote: string;
    skipQuote: string;
    submitLabel: string;
    submittingLabel: string;
    loadingForm: string;
    successMsg: string;
  };
  tools: {
    solutionFinder: ToolPageChrome & {
      needStepTitle: string;
      scaleStepTitle: string;
      scaleSmall: string;
      scaleMedium: string;
      scaleLarge: string;
      recommendedEyebrow: string;
      browseRecommendation: string;
      requestQuote: string;
      needOptions: ToolNeedOption[];
    };
    upsCalculator: ToolPageChrome & {
      loadKwLabel: string;
      pfLabel: string;
      growthLabel: string;
      runtimeLabel: string;
      topologyLabel: string;
      topologyN: string;
      topologyNPlus1: string;
      resultTitle: string;
      designLoad: string;
      recommendedUps: string;
      modularFrames: string;
      batteryEnergy: string;
      disclaimer: string;
      printLabel: string;
      quoteLabel: string;
    };
    solarRoi: ToolPageChrome & {
      kwpLabel: string;
      tariffLabel: string;
      yieldLabel: string;
      capexLabel: string;
      omLabel: string;
      resultTitle: string;
      annualGen: string;
      year1Savings: string;
      capexLine: string;
      payback: string;
      tenYear: string;
      disclaimer: string;
      printLabel: string;
      quoteLabel: string;
    };
  };
  catalog: {
    products: CatalogChrome;
    services: CatalogChrome;
    projects: CatalogChrome;
  };
  locales: {
    hi: LocaleCopy;
    kn: LocaleCopy;
  };
  /** Search titles/descriptions keyed by public path, e.g. `/projects`, `/locations/pune`. */
  seo: Record<string, PageSeoCopy>;
  /** Feature flags for vertical product packaging */
  features: {
    toolsEnabled: boolean;
    solutionFinderEnabled: boolean;
    searchEnabled: boolean;
    resourcesEnabled: boolean;
    industriesEnabled: boolean;
    partnersEnabled: boolean;
    localesEnabled: boolean;
  };
  heroHeights: Record<HeroHeightPageKey, HeroHeight>;
};

const hub = (partial: HubCopy): HubCopy => partial;

export const DEFAULT_SITE_COPY: SiteCopy = {
  talk: {
    buttonLabel: 'Talk to us',
    call: 'Call now',
    whatsapp: 'WhatsApp',
    callback: 'Callback',
    solutionFinder: 'Solution finder',
    emergency: 'Emergency',
    whatsappPrefill: 'Hi — I would like to speak with a power & energy engineer.',
  },
  footer: {
    newsletterLabel: 'Stay informed',
    newsletterPlaceholder: 'Your work email',
    subscribe: 'Subscribe',
    subscribeSuccess: "Thanks — you're subscribed!",
    stickyCall: 'Call',
    stickyWhatsapp: 'WhatsApp',
    stickyQuote: 'Quote',
    privacy: 'Privacy Policy',
    cookies: 'Cookies',
    terms: 'Terms',
    contactHeading: 'Contact',
    officeHeading: 'Office',
    officeHoursLabel: 'Hours',
    officeSlaLabel: 'Reply',
  },
  cookies: {
    bannerBody:
      'Necessary cookies keep the site working. Optional categories help us improve performance and campaigns.',
    necessaryLabel: 'Necessary (always on)',
    analyticsLabel: 'Analytics (GA4 / Plausible)',
    marketingLabel: 'Marketing (future pixels)',
    saveChoices: 'Save choices',
    declineOptional: 'Decline optional',
    pageEyebrow: 'Legal',
    pageTitle: 'Cookie Policy',
    pageLead: 'Categories we use and how you can control them.',
    necessaryHeading: 'Necessary',
    necessaryBody:
      'Required for security, session, and basic site operation (including admin login cookies when you sign in).',
    analyticsHeading: 'Analytics',
    analyticsBody:
      'Optional. When enabled via the consent banner, we may load Google Analytics 4 and/or Plausible to understand traffic and conversion events.',
    marketingHeading: 'Marketing',
    marketingBody: 'Optional. Reserved for future advertising pixels; not loaded unless you opt in.',
    manageHint: 'Manage choices anytime by clearing site cookies for this domain, or see our Privacy Policy.',
  },
  thankYou: {
    eyebrow: 'Next steps',
    titleEnquiry: 'Thank you — we have your enquiry',
    titleCallback: 'Callback requested',
    titleBrochure: 'Brochure unlocked',
    titleCareers: 'Application received',
    leadPrefix: 'Our engineering team ',
    leadCityPrefix: 'Our {city} desk ',
    leadSuffix: 'will review your note and respond with a clear feasibility path',
    proofRail: ['Engineer-owned follow-up', 'Clear options, not a sales script'],
    nextTitle: 'What happens next',
    nextSteps: [
      'We confirm scope, site constraints, and urgency.',
      'An engineer proposes options (product / EPC / AMC) with rough timelines.',
      'You choose a site visit, quote package, or remote review.',
    ],
    talkTitle: 'Talk sooner',
    whatsappPrefill: 'Hi — following up on my enquiry.',
    heroImage: '/assets/images/zigma-technologies-engineers-collaborati.jpg',
    heroImageMobile: '',
  },
  hubs: {
    industries: hub({
      eyebrow: 'Industries',
      title: 'Engineering that understands your sector',
      lead: 'Explore tailored UPS, solar, BESS, and service pathways for the environments you operate in.',
      ctaPrimary: 'Request consultation →',
      ctaPrimaryHref: '/contact?consult=1',
      ctaSecondary: 'View case studies',
      ctaSecondaryHref: '/projects',
      proofRail: ['Healthcare', 'Data centres', 'Manufacturing', 'Banking', 'Education', 'Airports'],
      ctaBandEyebrow: 'Next step',
      ctaBandTitle: 'Not sure which path fits?',
      ctaBandLead: 'Tell us your load profile and site constraints — we will recommend a clear options set.',
    }),
    locations: hub({
      eyebrow: 'Locations',
      title: 'Where we deliver across India',
      lead: 'Local engineering desks for site surveys, UPS continuity, solar EPC, and AMC coordination.',
      ctaPrimary: 'Talk to an engineer →',
      ctaPrimaryHref: '/contact?consult=1',
      ctaSecondary: 'Browse industries',
      ctaSecondaryHref: '/industries',
      proofRail: ['Bengaluru HQ', 'Metro coverage', 'Pan-India projects'],
      ctaBandEyebrow: 'Site visit',
      ctaBandTitle: 'Need a city-specific review?',
      ctaBandLead: 'Share your city and load priority — we route it to the right desk.',
    }),
    resources: hub({
      eyebrow: 'Resources',
      title: 'Resources & guides',
      lead: 'Practical notes for UPS sizing, solar ROI, and service planning.',
      ctaPrimary: 'Solution finder →',
      ctaPrimaryHref: '/tools/solution-finder',
      ctaSecondary: 'Contact us',
      ctaSecondaryHref: '/contact',
      proofRail: ['Guides', 'Checklists', 'Calculators'],
      ctaBandEyebrow: 'Prefer a guided path?',
      ctaBandTitle: 'Use the solution finder',
      ctaBandLead: 'Answer a few questions and get a recommended capability stack.',
    }),
    press: hub({
      eyebrow: 'Press',
      title: 'Press & announcements',
      lead: 'Company news, certifications, and project milestones.',
      ctaPrimary: 'Contact media →',
      ctaPrimaryHref: '/contact',
      ctaSecondary: 'About us',
      ctaSecondaryHref: '/#why',
      proofRail: ['Announcements', 'Milestones'],
      ctaBandEyebrow: 'Media',
      ctaBandTitle: 'Need a quote or asset?',
      ctaBandLead: 'Reach our team for press materials and project references.',
    }),
    sla: hub({
      eyebrow: 'Service levels',
      title: 'Service level dashboard',
      lead: 'Transparent response targets for enquiries, emergency UPS callouts, AMC, and solar O&M.',
      ctaPrimary: 'Request support →',
      ctaPrimaryHref: '/contact',
      ctaSecondary: 'AMC services',
      ctaSecondaryHref: '/services?category=ups-amc',
      proofRail: ['First response', 'Emergency', 'AMC', 'Solar O&M'],
      ctaBandEyebrow: 'Need coverage?',
      ctaBandTitle: 'Talk about an AMC package',
      ctaBandLead: 'We size coverage around your sites, OEM mix, and uptime goals.',
    }),
    search: hub({
      eyebrow: 'Search',
      title: 'Find products, projects, guides & pages',
      lead: 'Search the catalog and knowledge base.',
      ctaPrimary: 'Browse products',
      ctaPrimaryHref: '/products',
      ctaSecondary: 'Browse services',
      ctaSecondaryHref: '/services',
      proofRail: [],
      ctaBandEyebrow: 'Next step',
      ctaBandTitle: 'Need a human recommendation?',
      ctaBandLead: 'Request a consultation and an engineer will map options to your load.',
    }),
  },
  socialProof: {
    title: 'Trusted by industry leaders',
    subtitle: 'OEM partnerships and enterprise delivery across India',
  },
  searchForm: {
    placeholder: 'Search…',
    ariaLabel: 'Search projects, products, services',
  },
  a11y: {
    menuToggle: 'Toggle menu',
    close: 'Close',
    closeConsultation: 'Close consultation wizard',
    closeEnquiry: 'Close enquiry form',
    copyLink: 'Copy link',
    facebook: 'Facebook',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    x: 'X (Twitter)',
    youtube: 'YouTube',
    viewCertifications: 'View certifications',
  },
  consultation: {
    badge: 'Enquiry',
    title: 'Send an Enquiry',
    /** @deprecated Multi-step wizard removed — kept for stored site-copy compatibility */
    step0Lead: 'Pick what you need. Then share capacity and contact details.',
    /** @deprecated Multi-step wizard removed — kept for stored site-copy compatibility */
    step1Lead: 'Tell us capacity, location, and urgency for a faster quote.',
    step2Lead: 'Submit your details — we respond with a clear next step.',
    ariaLabel: 'Send an enquiry',
    proofStrip: ['Fast feasibility response', 'Aligned to certified process', 'Commercial clarity upfront'],
    interestOptions: [
      { title: 'Solar EPC', subtitle: 'Design, supply, and commissioning', subject: 'Solar Solution' },
      { title: 'UPS Solutions', subtitle: 'Power backup & protection planning', subject: 'UPS Solution' },
      { title: 'BESS- Battery System', subtitle: 'Peak shaving, EMS, and hybrid setups', subject: 'BESS- Battery System' },
      { title: 'AMC & Service Request', subtitle: 'O&M, upgrades, and support', subject: 'AMC & Service Request' },
      { title: 'EV Charging', subtitle: 'Infrastructure and smart charging', subject: 'EV Charging Solution' },
      { title: 'Request a Quote', subtitle: 'Pricing, timelines, and next steps', subject: 'Request a Quote' },
      { title: 'General Enquiry', subtitle: 'Talk to our team for the right fit', subject: 'General Enquiry' },
    ],
    capacityOptions: ['< 50 kW / kVA', '50–200 kW / kVA', '200–500 kW / kVA', '500 kW+ / utility-scale', 'Not sure yet'],
    urgencyOptions: ['Exploring', 'This quarter', 'Urgent / this month', 'Emergency support'],
    capacityLabel: 'Approximate capacity / load *',
    locationLabel: 'Site / city',
    locationPlaceholder: 'e.g. Bangalore, Karnataka',
    urgencyLabel: 'Timeline',
    step2Label: 'Step 2 of 3 · Quote details',
    step3Label: 'Step 3 of 3',
    backLabel: '← Back',
    continueQuote: 'Continue to contact details →',
    skipQuote: 'Skip quote details',
    submitLabel: 'Send enquiry →',
    submittingLabel: 'Submitting…',
    loadingForm: 'Loading form…',
    successMsg: 'Thank you — our engineering team will contact you shortly.',
  },
  tools: {
    solutionFinder: {
      eyebrow: 'Solution finder',
      title: 'Compare paths in under a minute',
      lead: 'Pick what you need and site scale — we point you to the best catalog path and quote intake.',
      image: '/assets/images/engineers-reviewing-electrical-design-dr.jpg',
      breadcrumbTools: 'Tools',
      breadcrumbSelf: 'Solution finder',
      secondaryToolLabel: 'Solar ROI',
      secondaryToolHref: '/tools/solar-roi',
      primaryCtaLabel: 'UPS calculator',
      primaryCtaHref: '/tools/ups-calculator',
      ctaBandTitle: 'Want an engineer to validate the path?',
      ctaBandLead: 'Share site constraints and load profile — we refine the recommendation into a feasibility plan.',
      ctaBandPrimaryLabel: 'Request consultation →',
      ctaBandPrimaryHref: '/contact?consult=1',
      ctaBandSecondaryLabel: 'Browse guides',
      ctaBandSecondaryHref: '/blog',
      needStepTitle: '1. What do you need?',
      scaleStepTitle: '2. Approximate scale',
      scaleSmall: 'Small (< 50 kW/kVA)',
      scaleMedium: 'Medium (50–500)',
      scaleLarge: 'Large / utility',
      recommendedEyebrow: 'Recommended',
      browseRecommendation: 'Browse recommendation →',
      requestQuote: 'Request a quote',
      needOptions: [
        { id: 'backup', title: 'Power backup / UPS', blurb: 'Protect critical loads from outages' },
        { id: 'solar', title: 'Solar generation', blurb: 'Cut daytime energy cost' },
        { id: 'storage', title: 'Battery storage (BESS)', blurb: 'Peak shaving & firming' },
        { id: 'ev', title: 'EV charging', blurb: 'Campus or fleet charging' },
        { id: 'service', title: 'AMC / repair / rental', blurb: 'Keep assets healthy' },
        { id: 'unsure', title: 'Not sure yet', blurb: 'Help me choose' },
      ],
    },
    upsCalculator: {
      eyebrow: 'Sizing tool',
      title: 'UPS kVA calculator',
      lead: 'Convert critical load to indicative UPS capacity, redundancy, and battery energy.',
      image: '/assets/images/engineers-inspecting-switchgear-panels-i.jpg',
      breadcrumbTools: 'Tools',
      breadcrumbSelf: 'UPS calculator',
      secondaryToolLabel: 'Solar ROI →',
      secondaryToolHref: '/tools/solar-roi',
      primaryCtaLabel: 'Request UPS quote',
      primaryCtaHref: '/contact?consult=1&consult_subject=UPS%20Solution',
      ctaBandTitle: 'Need a site-specific UPS design?',
      ctaBandLead: 'Share load list, redundancy target, and runtime — we refine this estimate into a bill of materials.',
      ctaBandPrimaryLabel: 'Talk to an engineer →',
      ctaBandPrimaryHref: '/contact?consult=1&consult_subject=UPS%20Solution',
      ctaBandSecondaryLabel: 'Browse UPS',
      ctaBandSecondaryHref: '/products?category=ups-systems',
      loadKwLabel: 'Critical load (kW)',
      pfLabel: 'Power factor',
      growthLabel: 'Growth headroom (%)',
      runtimeLabel: 'Battery runtime (min)',
      topologyLabel: 'Topology',
      topologyN: 'N capacity',
      topologyNPlus1: 'N+1 modular',
      resultTitle: 'Indicative sizing',
      designLoad: 'Design load',
      recommendedUps: 'Recommended UPS',
      modularFrames: 'Modular frames (100 kVA class)',
      batteryEnergy: 'Approx. battery energy',
      disclaimer: 'Engineering estimate only — site power quality, crest factor, and generator sizing require a site survey.',
      printLabel: 'Print / save PDF',
      quoteLabel: 'Request engineered quote →',
    },
    solarRoi: {
      eyebrow: 'Sizing tool',
      title: 'Solar ROI calculator',
      lead: 'Model generation, tariff savings, and simple payback for C&I rooftop plants.',
      image: '/assets/images/solar-farm-with-wind-turbines-at-sunset-.jpg',
      breadcrumbTools: 'Tools',
      breadcrumbSelf: 'Solar ROI',
      secondaryToolLabel: 'UPS calculator →',
      secondaryToolHref: '/tools/ups-calculator',
      primaryCtaLabel: 'Request solar quote',
      primaryCtaHref: '/contact?consult=1&consult_subject=Solar%20Solution',
      ctaBandTitle: 'Ready for a rooftop feasibility?',
      ctaBandLead: 'Share tariff, roof area, and daytime load — we turn this model into an EPC proposal.',
      ctaBandPrimaryLabel: 'Talk to an engineer →',
      ctaBandPrimaryHref: '/contact?consult=1&consult_subject=Solar%20Solution',
      ctaBandSecondaryLabel: 'Solar EPC projects',
      ctaBandSecondaryHref: '/projects?category=solar-epc',
      kwpLabel: 'System size (kWp)',
      tariffLabel: 'Tariff (₹/kWh)',
      yieldLabel: 'Specific yield (kWh/kWp/yr)',
      capexLabel: 'Capex (₹/kWp)',
      omLabel: 'O&M (% of capex / yr)',
      resultTitle: 'Indicative ROI',
      annualGen: 'Annual generation',
      year1Savings: 'Year-1 savings',
      capexLine: 'Capex',
      payback: 'Simple payback',
      tenYear: '10-year net (excl. degradation)',
      disclaimer: 'Not a financial offer — irradiance, policy, and EPC scope change outcomes. Request a site-specific proposal.',
      printLabel: 'Print / save PDF',
      quoteLabel: 'Request solar proposal →',
    },
  },
  catalog: {
    products: {
      eyebrow: 'PRODUCT CATALOG',
      title: 'Products',
      lead: 'Explore UPS, battery, solar, and related products. Open any item for specifications, media, and enquiry.',
      socialProofTitle: 'Authorized and aligned with leading OEMs',
    },
    services: {
      eyebrow: 'ENGINEERING SERVICES',
      title: 'Services',
      lead: 'AMC, installation, engineering design and technical services — review details and send an enquiry in one click.',
      socialProofTitle: 'Trusted service partner for critical facilities',
    },
    projects: {
      eyebrow: 'PROOF, NOT PROMISES',
      title: 'Projects',
      lead: 'Browse delivered projects across solar EPC, power continuity, and energy management — tap any card for full details and enquiry.',
      socialProofTitle: 'OEM partners on projects we deliver',
    },
  },
  locales: {
    hi: {
      langName: 'हिन्दी',
      title: 'ज़िग्मा टेक्नोलॉजीज़ — सोलर, UPS और पावर समाधान',
      lead: 'भारत भर में सोलर EPC, औद्योगिक UPS, BESS और EV चार्जिंग के लिए इंजीनियरिंग सहायता।',
      ups: 'UPS और पावर निरंतरता',
      solar: 'सोलर EPC और O&M',
      calc: 'UPS कैलकुलेटर',
      locations: 'शहर और सेवाएँ',
      sla: 'सेवा स्तर',
      cta: 'परामर्श का अनुरोध करें',
      englishSite: 'English site →',
      altLocaleLabel: 'ಕನ್ನಡ',
    },
    kn: {
      langName: 'ಕನ್ನಡ',
      title: 'ಝಿಗ್ಮಾ ಟೆಕ್ನಾಲಜೀಸ್ — ಸೋಲಾರ್, UPS ಮತ್ತು ಪವರ್ ಪರಿಹಾರಗಳು',
      lead: 'ಭಾರತದಾದ್ಯಂತ ಸೋಲಾರ್ EPC, ಕೈಗಾರಿಕಾ UPS, BESS ಮತ್ತು EV ಚಾರ್ಜಿಂಗ್‌ಗೆ ಎಂಜಿನಿಯರಿಂಗ್ ಬೆಂಬಲ.',
      ups: 'UPS ಮತ್ತು ವಿದ್ಯುತ್ ನಿರಂತರತೆ',
      solar: 'ಸೋಲಾರ್ EPC ಮತ್ತು O&M',
      calc: 'UPS ಕ್ಯಾಲ್ಕುಲೇಟರ್',
      locations: 'ನಗರಗಳು ಮತ್ತು ಸೇವೆಗಳು',
      sla: 'ಸೇವಾ ಮಟ್ಟ',
      cta: 'ಸಮಾಲೋಚನೆ ವಿನಂತಿಸಿ',
      englishSite: 'English site →',
      altLocaleLabel: 'हिन्दी',
    },
  },
  seo: {
    '/projects': {
      title: 'Solar, UPS & Battery Storage Projects Across India',
      description:
        'Case studies from 1,500+ projects: rooftop solar plants up to 600 kW, data-centre UPS and hybrid lithium systems, with scope, capacity and results.',
    },
    '/products': {
      title: 'UPS, Inverters, Batteries, Solar & EV Charging Products',
      description:
        'ABB, APC, Vertiv, Eaton and Delta UPS, Exide and Amaron batteries, Studer hybrids, Kirloskar solar and EV chargers, with installation and AMC.',
    },
    '/services': {
      title: 'UPS AMC, Repair, Rental, Solar O&M & Installation Services',
      description:
        'UPS AMC (10,000+ contracts delivered), repairs, rentals, solar O&M, commissioning and EPLAN/AutoCAD design support across India. Get a quote.',
    },
    '/industries': {
      title: 'Power & Energy Solutions by Industry – Hospitals to Airports',
      description:
        'UPS, solar, battery storage and AMC matched to your sector: hospitals, data centres, factories, banks, campuses and airports. See what fits your site.',
    },
    '/industries/healthcare': {
      title: 'Hospital UPS & Solar – Backup Power for ICU, OT & Imaging',
      description:
        'Online double-conversion UPS with N+1 redundancy, battery care and rooftop solar for hospitals, keeping ICU, OT and imaging loads powered. Talk to us.',
    },
    '/industries/data-centres': {
      title: 'Data Centre UPS & Battery Monitoring – N+1 and 2N Designs',
      description:
        'Modular UPS, APC battery monitoring and power distribution for server rooms and data centres, sized for N, N+1 or 2N redundancy. Plan your upgrade.',
    },
    '/industries/manufacturing': {
      title: 'Solar EPC, Industrial UPS & BESS for Factories and Plants',
      description:
        'Rooftop solar up to 600 kW, ABB industrial UPS and peak-shaving battery storage for plants that cannot afford downtime. See our factory projects.',
    },
    '/industries/banking': {
      title: 'UPS & AMC for Banks, Branches, ATMs and BFSI Data Floors',
      description:
        'Online UPS, multi-branch AMC with SLAs and rental UPS for migrations, keeping bank branches, ATMs and data floors running. Get a pan-India AMC quote.',
    },
    '/industries/education': {
      title: 'Rooftop Solar, UPS & EV Charging for Colleges and Schools',
      description:
        'Campus rooftop solar like our 200 kW plant at AMC Engineering College, UPS for labs and data rooms, and smart EV charging for staff and students.',
    },
    '/industries/airports': {
      title: 'Critical UPS & Power Engineering for Airports and Transit',
      description:
        'UPS, rental power for staged cutovers and HSE-compliant field engineering for terminals, airside systems and transit infrastructure. Talk to our team.',
    },
    '/locations': {
      title: 'Solar, UPS & AMC Service Locations – Bengaluru to Delhi NCR',
      description:
        'Engineering desks in Bengaluru, Chennai, Hyderabad, Mumbai, Pune and Delhi NCR for site surveys, UPS, solar EPC and AMC. Find your nearest team.',
    },
    '/locations/bengaluru': {
      title: 'Solar EPC, UPS & 24×7 AMC in Bengaluru – Head Office',
      description:
        'Our Bengaluru head office serves factories, campuses, hospitals and data centres with solar EPC, UPS, BESS and 24×7 AMC, plus same-day emergency help.',
    },
    '/locations/chennai': {
      title: 'UPS, AMC & Solar EPC in Chennai for Industry & Commerce',
      description:
        'Industrial UPS, AMC and C&I solar for Chennai manufacturers and commercial sites, backed by projects like the eMudhra data-centre UPS. Get a quote.',
    },
    '/locations/hyderabad': {
      title: 'Data Centre UPS, Campus Solar & BESS Advisory in Hyderabad',
      description:
        'Mission-critical UPS, campus rooftop solar and hybrid/BESS advice for Hyderabad IT parks, pharma units and manufacturing campuses. Talk to an engineer.',
    },
    '/locations/mumbai': {
      title: 'UPS for BFSI, Rental UPS & Commercial Solar in Mumbai',
      description:
        'UPS continuity for Mumbai banks and offices, rental UPS for cutovers and commercial rooftop solar for real estate and industry. Request a site review.',
    },
    '/locations/pune': {
      title: 'Industrial UPS, Solar EPC & Peak Shaving BESS in Pune',
      description:
        "Process-industry UPS, plant solar EPC and peak-shaving battery studies for Pune's automotive and manufacturing plants. Share your load for a proposal.",
    },
    '/locations/delhi-ncr': {
      title: 'Multi-Site UPS AMC, Solar & Power Engineering in Delhi NCR',
      description:
        'Multi-site UPS AMC, campus solar and emergency desk access for Delhi NCR corporate campuses and industrial estates. Get an AMC or solar quote today.',
    },
    '/press': {
      title: 'Press & News – Projects, Certifications and Milestones',
      description:
        'Company news: new solar and UPS projects, OEM authorisations, ISO certification and awards like the Karnataka Solar Awards 2025. Media enquiries welcome.',
    },
    '/sla': {
      title: 'Service Levels – UPS Emergency, AMC & Solar O&M Response',
      description:
        'Our published response targets for enquiries, emergency UPS call-outs, AMC visits and solar O&M, so you know what to expect before you sign up.',
    },
    '/cookies': {
      title: 'Cookie Policy',
      description:
        'Which cookies our website uses (necessary, analytics and marketing), what each one does, and how you can change your consent choices at any time.',
    },
    '/tools/ups-calculator': {
      title: 'UPS kVA Calculator – Size Your UPS and Battery Backup',
      description:
        'Free UPS sizing tool: enter load, power factor, growth and backup time to get the recommended kVA, modular frames and battery energy. Print or get a quote.',
    },
    '/tools/solar-roi': {
      title: 'Solar ROI Calculator for Commercial Rooftops in India',
      description:
        'Estimate rooftop solar generation, first-year savings, payback period and 10-year returns using your own tariff and system cost. Free and instant.',
    },
    '/hi': {
      title: 'सोलर EPC, UPS, BESS और EV चार्जिंग कंपनी – भारत',
      description:
        '2006 से फ़ैक्टरियों, अस्पतालों और कैंपस के लिए सोलर EPC, UPS, बैटरी स्टोरेज, EV चार्जिंग और 24×7 AMC। बेंगलुरु मुख्यालय, पूरे भारत में सेवा।',
    },
    '/kn': {
      title: 'ಸೋಲಾರ್ EPC, UPS, BESS ಮತ್ತು EV ಚಾರ್ಜಿಂಗ್ ಕಂಪನಿ – ಭಾರತ',
      description:
        '2006 ರಿಂದ ಕಾರ್ಖಾನೆ, ಆಸ್ಪತ್ರೆ ಮತ್ತು ಕ್ಯಾಂಪಸ್‌ಗಳಿಗೆ ಸೋಲಾರ್ EPC, UPS, ಬ್ಯಾಟರಿ ಸಂಗ್ರಹಣೆ, EV ಚಾರ್ಜಿಂಗ್ ಮತ್ತು 24×7 AMC. ಬೆಂಗಳೂರು ಮುಖ್ಯ ಕಚೇರಿ.',
    },
    '/hi/locations/bengaluru': {
      title: 'बेंगलुरु में सोलर EPC, UPS और 24×7 AMC सेवाएँ',
      description:
        'बेंगलुरु मुख्यालय से उद्योगों, कैंपस, अस्पतालों और डेटा सेंटर के लिए सोलर EPC, UPS, BESS और 24×7 AMC। उसी दिन आपातकालीन सहायता।',
    },
    '/kn/locations/bengaluru': {
      title: 'ಬೆಂಗಳೂರಿನಲ್ಲಿ ಸೋಲಾರ್ EPC, UPS ಮತ್ತು 24×7 AMC ಸೇವೆಗಳು',
      description:
        'ಬೆಂಗಳೂರು ಮುಖ್ಯ ಕಚೇರಿಯಿಂದ ಕೈಗಾರಿಕೆ, ಕ್ಯಾಂಪಸ್, ಆಸ್ಪತ್ರೆ ಮತ್ತು ಡೇಟಾ ಸೆಂಟರ್‌ಗಳಿಗೆ ಸೋಲಾರ್ EPC, UPS, BESS ಮತ್ತು 24×7 AMC. ಅದೇ ದಿನ ತುರ್ತು ಸಹಾಯ.',
    },
  },
  features: {
    toolsEnabled: true,
    solutionFinderEnabled: false,
    searchEnabled: false,
    resourcesEnabled: false,
    industriesEnabled: true,
    partnersEnabled: true,
    localesEnabled: true,
  },
  heroHeights: Object.fromEntries(HERO_HEIGHT_PAGES.map((p) => [p.key, 'full'])) as Record<
    HeroHeightPageKey,
    HeroHeight
  >,
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge<T extends Record<string, unknown>>(base: T, overlay: unknown): T {
  if (!isPlainObject(overlay)) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(overlay)) {
    if (v === undefined || v === null) continue;
    const prev = out[k];
    if (Array.isArray(v)) {
      out[k] = v;
    } else if (isPlainObject(v) && isPlainObject(prev)) {
      out[k] = deepMerge(prev, v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export function mergeSiteCopy(raw: unknown): SiteCopy {
  return deepMerge(DEFAULT_SITE_COPY as unknown as Record<string, unknown>, raw) as unknown as SiteCopy;
}

/** SEO copy for a path, falling back per field when the admin value is blank. */
export function pageSeo(copy: SiteCopy, path: string, fallback: PageSeoCopy): PageSeoCopy {
  const entry = copy.seo?.[path];
  return {
    title: entry?.title?.trim() || fallback.title,
    description: entry?.description?.trim() || fallback.description,
  };
}

/** Replace {company} placeholders after a new-client bootstrap. */
export function applyBrandToSiteCopy(copy: SiteCopy, companyName: string): SiteCopy {
  const company = companyName.trim() || 'our team';
  const replace = (s: string) => s.replace(/\{company\}/g, company).replace(/\bZigma Technologies\b/g, company).replace(/\bZigma\b/g, company);
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return replace(v);
    if (Array.isArray(v)) return v.map(walk);
    if (isPlainObject(v)) {
      const o: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) o[k] = walk(val);
      return o;
    }
    return v;
  };
  return walk(copy) as SiteCopy;
}
