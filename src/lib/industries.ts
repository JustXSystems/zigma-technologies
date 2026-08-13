/** Industry landing definitions — CMS page slug = industries-{key}, public URL /industries/{key} */

export type IndustryDef = {
  key: string;
  name: string;
  eyebrow: string;
  lead: string;
  subject: string;
  catalogHints: { type: 'project' | 'product' | 'service'; category?: string; tag?: string }[];
  faqs: { q: string; a: string }[];
};

export const INDUSTRY_DEFS: IndustryDef[] = [
  {
    key: 'healthcare',
    name: 'Healthcare & hospitals',
    eyebrow: 'Critical care power',
    lead: 'UPS, medical-grade continuity, and solar solutions that keep diagnostics, OT, and ICU loads protected.',
    subject: 'Healthcare power enquiry',
    catalogHints: [
      { type: 'product', category: 'ups-systems' },
      { type: 'service', category: 'ups-amc' },
      { type: 'project', tag: 'Critical Power' },
    ],
    faqs: [
      {
        q: 'What UPS topology suits hospitals?',
        a: 'Double-conversion online UPS with adequate redundancy (N+1) is typical for critical clinical loads, sized with medical equipment inrush in mind.',
      },
      {
        q: 'Can solar work with hospital backup?',
        a: 'Yes — rooftop solar can offset daytime load while UPS/DG handle continuity. We design interlocking so clinical safety is never compromised.',
      },
    ],
  },
  {
    key: 'data-centres',
    name: 'Data centres & IT',
    eyebrow: 'Mission-critical uptime',
    lead: 'Modular UPS, battery monitoring, and power distribution engineered for racks, rooms, and enterprise facilities.',
    subject: 'Data centre power enquiry',
    catalogHints: [
      { type: 'product', category: 'ups-systems', tag: 'Vertiv' },
      { type: 'product', category: 'bms' },
      { type: 'project', tag: 'Data Centre' },
    ],
    faqs: [
      {
        q: 'How do you plan redundancy?',
        a: 'We size for N, N+1, or 2N based on SLA, then validate autonomy, bypass, and maintenance windows with your facilities team.',
      },
      {
        q: 'Do you support battery monitoring?',
        a: 'Yes — APC BMS and related sensors for continuous battery health on UPS banks.',
      },
    ],
  },
  {
    key: 'manufacturing',
    name: 'Manufacturing & process',
    eyebrow: 'Industrial resilience',
    lead: 'Solar EPC, industrial UPS, BESS peak shaving, and field commissioning for plants that cannot afford downtime.',
    subject: 'Manufacturing power enquiry',
    catalogHints: [
      { type: 'project', category: 'solar-epc' },
      { type: 'product', category: 'bess' },
      { type: 'product', category: 'ups-systems', tag: 'ABB' },
    ],
    faqs: [
      {
        q: 'Can BESS reduce our demand charges?',
        a: 'Often yes — peak shaving with EMS dispatch targets short high-tariff windows common in process industries.',
      },
      {
        q: 'Do you handle turnkey solar EPC?',
        a: 'Yes — design, supply, install, and commission C&I rooftop and industrial solar plants with O&M options.',
      },
    ],
  },
  {
    key: 'banking',
    name: 'Banking & BFSI',
    eyebrow: 'Branch & core continuity',
    lead: 'UPS, AMC, and power quality for branches, ATMs, and data floors that must stay online for customers.',
    subject: 'BFSI power enquiry',
    catalogHints: [
      { type: 'product', category: 'ups-systems' },
      { type: 'service', category: 'ups-amc' },
      { type: 'service', category: 'ups-rental' },
    ],
    faqs: [
      {
        q: 'Can you cover multi-branch AMC?',
        a: 'Yes — pan-India UPS AMC with SLA options, emergency desks, and standardized reporting.',
      },
      {
        q: 'Is rental UPS available for migrations?',
        a: 'Temporary UPS rental bridges cutovers, renovations, and disaster recovery drills.',
      },
    ],
  },
  {
    key: 'education',
    name: 'Education & campuses',
    eyebrow: 'Campus energy',
    lead: 'Rooftop solar, UPS for labs/data rooms, and EV charging for modern university and school campuses.',
    subject: 'Education campus enquiry',
    catalogHints: [
      { type: 'project', category: 'solar-epc', tag: 'Education' },
      { type: 'product', category: 'solar-solutions' },
      { type: 'product', category: 'ev-charging' },
    ],
    faqs: [
      {
        q: 'What size solar suits a college?',
        a: 'We model daytime load, roof area, and tariff to recommend kW capacity — many campuses land between 50–500 kW.',
      },
      {
        q: 'Can EV charging share the campus feeder?',
        a: 'Smart load management keeps chargers from overloading existing infrastructure.',
      },
    ],
  },
  {
    key: 'airports',
    name: 'Airports & transit',
    eyebrow: 'High-availability infrastructure',
    lead: 'Critical UPS, solar, and engineering support for terminals, airside facilities, and passenger infrastructure.',
    subject: 'Airport infrastructure enquiry',
    catalogHints: [
      { type: 'product', category: 'ups-systems' },
      { type: 'service', category: 'field-services' },
      { type: 'service', category: 'engineering-design' },
    ],
    faqs: [
      {
        q: 'Do you work under airport compliance regimes?',
        a: 'Our field and design teams follow site HSE, permit-to-work, and OEM procedures required by large transit operators.',
      },
      {
        q: 'What about temporary power during upgrades?',
        a: 'UPS rental and staged cutovers keep critical circuits live during modernization.',
      },
    ],
  },
];

export function getIndustryByKey(key: string) {
  return INDUSTRY_DEFS.find((i) => i.key === key) || null;
}

export function industryPageSlug(key: string) {
  return `industries-${key}`;
}

export function industryPublicPath(key: string) {
  return `/industries/${key}`;
}
