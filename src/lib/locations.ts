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

/** Merge CMS JSON overrides (theme_settings.locations) onto code defaults by key. */
export function mergeLocationDefs(raw: unknown): LocationDef[] {
  if (!Array.isArray(raw) || raw.length === 0) return LOCATION_DEFS;
  const byKey = new Map(LOCATION_DEFS.map((d) => [d.key, { ...d }]));
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<LocationDef> & { key?: string };
    if (!row.key || typeof row.key !== 'string') continue;
    const prev = byKey.get(row.key) || {
      key: row.key,
      name: row.key,
      state: '',
      eyebrow: '',
      lead: '',
      subject: '',
      highlights: [],
      serviceTags: [],
    };
    byKey.set(row.key, {
      ...prev,
      ...row,
      key: row.key,
      highlights: Array.isArray(row.highlights) ? row.highlights : prev.highlights,
      serviceTags: Array.isArray(row.serviceTags) ? row.serviceTags : prev.serviceTags,
    });
  }
  const ordered: LocationDef[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const key = (item as { key?: string })?.key;
    if (!key || seen.has(key)) continue;
    const def = byKey.get(key);
    if (def) {
      ordered.push(def);
      seen.add(key);
    }
  }
  for (const d of LOCATION_DEFS) {
    if (!seen.has(d.key)) ordered.push(d);
  }
  return ordered;
}

export function getLocationByKeyFromList(defs: LocationDef[], key: string) {
  return defs.find((l) => l.key === key) || null;
}
