/** Seed content for the Industries hub CMS page (/industries). */

export const INDUSTRY_HUB_IMAGES: Record<string, string> = {
  healthcare: '/assets/images/zigma-technologies-engineers-monitoring-.jpg',
  'data-centres': '/assets/images/engineers-inspecting-switchgear-panels-i.jpg',
  manufacturing: '/assets/images/engineers-in-hard-hats-reviewing-a-digit.jpg',
  banking: '/assets/images/engineers-reviewing-electrical-design-dr.jpg',
  education: '/assets/images/bangalore-international-exhibition-centr.png',
  airports: '/assets/images/kempegowda-international-airport-bengalu.png',
};

export const INDUSTRIES_HUB_SEED_SECTIONS = [
  {
    type: 'page_hero',
    section_key: 'industries-hero',
    title: 'Industries Hero',
    content_json: {
      breadcrumb: 'Industries',
      eyebrow: 'Industries',
      title: 'Engineering that understands your sector',
      lead: 'Explore tailored UPS, solar, BESS, and service pathways for the environments you operate in.',
      image: '/assets/images/city-skyline-with-solar-panels-and-indus.jpg',
      imageAlt: 'City skyline with solar panels and industrial infrastructure',
      bodyClass: 'hub-page',
      primaryCta: 'Request consultation →',
      primaryHref: '/contact?consult=1',
      secondaryCta: 'View case studies',
      secondaryHref: '/projects',
      proofRail: ['Healthcare', 'Data centres', 'Manufacturing', 'Banking', 'Education', 'Airports'],
    },
  },
  {
    type: 'industry_hub',
    section_key: 'sector-pathways',
    title: 'Sector pathways',
    content_json: {
      eyebrow: 'Sector pathways',
      eyebrowClass: 'eyebrow-cyan',
      title: 'Pick your operating environment',
      body: 'Each landing maps catalog solutions, proof, and a direct consultation path.',
      showVisitTailor: true,
      // Cards are filled at seed time from INDUSTRY_DEFS; empty means render live defs.
      cards: [] as Array<{
        key: string;
        eyebrow: string;
        name: string;
        lead: string;
        image: string;
        href: string;
      }>,
    },
  },
  {
    type: 'cta',
    section_key: 'industries-cta',
    title: 'Industries CTA',
    content_json: {
      variant: 'inner',
      eyebrow: 'Next step',
      title: 'Not sure which path fits?',
      body: 'Tell us your load profile and site constraints — we will recommend a clear options set.',
      primaryCta: 'Request consultation →',
      primaryHref: '/contact?consult=1',
      secondaryCta: 'Solution finder',
      secondaryHref: '/tools/solution-finder',
    },
  },
] as const;
