/** City / service-area landing definitions — public URL /locations/{key} */

export type LocationDef = {
  key: string;
  name: string;
  state: string;
  eyebrow: string;
  lead: string;
  subject: string;
  highlights: string[];
  serviceTags: string[];
  mapEmbed?: string;
};

export const LOCATION_DEFS: LocationDef[] = [
  {
    key: 'bengaluru',
    name: 'Bengaluru',
    state: 'Karnataka',
    eyebrow: 'HQ & primary service hub',
    lead: 'Solar EPC, UPS, BESS, and 24×7 AMC for Bengaluru industries, campuses, hospitals, and data infrastructure.',
    subject: 'Bengaluru site enquiry',
    highlights: ['Local engineering desk', 'Same-day emergency coordination', 'Rooftop & industrial solar experience'],
    serviceTags: ['UPS', 'Solar EPC', 'AMC'],
  },
  {
    key: 'chennai',
    name: 'Chennai',
    state: 'Tamil Nadu',
    eyebrow: 'South India coverage',
    lead: 'Power continuity and solar solutions for Chennai manufacturing, ports-adjacent industry, and commercial facilities.',
    subject: 'Chennai site enquiry',
    highlights: ['Industrial UPS & AMC', 'C&I solar delivery', 'Field commissioning support'],
    serviceTags: ['UPS', 'Solar', 'Field Services'],
  },
  {
    key: 'hyderabad',
    name: 'Hyderabad',
    state: 'Telangana',
    eyebrow: 'IT & industrial corridor',
    lead: 'UPS, data-centre power, and solar for Hyderabad IT parks, pharma, and manufacturing campuses.',
    subject: 'Hyderabad site enquiry',
    highlights: ['Mission-critical UPS', 'Campus solar', 'Hybrid / BESS advisory'],
    serviceTags: ['UPS', 'Data Centre', 'Solar'],
  },
  {
    key: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    eyebrow: 'West India support',
    lead: 'Critical power and energy projects for Mumbai commercial real estate, BFSI, and industrial clients.',
    subject: 'Mumbai site enquiry',
    highlights: ['BFSI UPS continuity', 'Commercial solar', 'Rental UPS for cutovers'],
    serviceTags: ['UPS', 'Rental', 'Solar'],
  },
  {
    key: 'pune',
    name: 'Pune',
    state: 'Maharashtra',
    eyebrow: 'Auto & manufacturing belt',
    lead: 'Industrial UPS, solar EPC, and peak-shaving BESS for Pune automotive and process plants.',
    subject: 'Pune site enquiry',
    highlights: ['Process-industry UPS', 'Plant solar EPC', 'Peak shaving studies'],
    serviceTags: ['Manufacturing', 'BESS', 'Solar EPC'],
  },
  {
    key: 'delhi-ncr',
    name: 'Delhi NCR',
    state: 'Delhi / NCR',
    eyebrow: 'North India coverage',
    lead: 'UPS AMC, solar, and engineering support across Delhi NCR corporate campuses and industrial estates.',
    subject: 'Delhi NCR site enquiry',
    highlights: ['Multi-site AMC', 'Campus energy', 'Emergency desk access'],
    serviceTags: ['AMC', 'UPS', 'Solar'],
  },
];

export function getLocationByKey(key: string) {
  return LOCATION_DEFS.find((l) => l.key === key) || null;
}
