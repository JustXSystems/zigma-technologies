import { LOCATION_DEFS } from '@/lib/locations';

export type ServiceSeoDef = {
  key: string;
  name: string;
  categoryHint?: string;
  tagHint?: string;
  itemType: 'project' | 'product' | 'service';
  subject: string;
  lead: string;
};

export const SERVICE_SEO_DEFS: ServiceSeoDef[] = [
  {
    key: 'ups-amc',
    name: 'UPS AMC',
    itemType: 'service',
    categoryHint: 'ups-amc',
    subject: 'UPS AMC enquiry',
    lead: 'Annual maintenance and emergency UPS support for critical facilities.',
  },
  {
    key: 'solar-epc',
    name: 'Solar EPC',
    itemType: 'project',
    categoryHint: 'solar-epc',
    subject: 'Solar EPC enquiry',
    lead: 'Design, supply, and commissioning of commercial and industrial solar plants.',
  },
  {
    key: 'ups-systems',
    name: 'UPS Systems',
    itemType: 'product',
    categoryHint: 'ups-systems',
    subject: 'UPS Solution',
    lead: 'Industrial and IT UPS platforms with local engineering support.',
  },
  {
    key: 'bess',
    name: 'BESS',
    itemType: 'product',
    categoryHint: 'bess',
    subject: 'BESS- Battery System',
    lead: 'Battery energy storage for peak shaving, backup, and solar firming.',
  },
  {
    key: 'ev-charging',
    name: 'EV Charging',
    itemType: 'product',
    categoryHint: 'ev-charging',
    subject: 'EV Charging Solution',
    lead: 'AC/DC charging infrastructure for campuses and fleets.',
  },
  {
    key: 'field-services',
    name: 'Field Services',
    itemType: 'service',
    categoryHint: 'field-services',
    subject: 'Field commissioning enquiry',
    lead: 'Installation, commissioning, and modernization for power assets.',
  },
];

export function getServiceSeo(key: string) {
  return SERVICE_SEO_DEFS.find((s) => s.key === key) || null;
}

export function cityServicePath(city: string, service: string) {
  return `/locations/${city}/${service}`;
}

export function allCityServicePairs() {
  return LOCATION_DEFS.flatMap((loc) =>
    SERVICE_SEO_DEFS.map((svc) => ({
      city: loc.key,
      cityName: loc.name,
      state: loc.state,
      service: svc.key,
      serviceName: svc.name,
      subject: `${svc.subject} — ${loc.name}`,
      lead: `${svc.lead} Serving ${loc.name}, ${loc.state}.`,
      categoryHint: svc.categoryHint,
      itemType: svc.itemType,
      tagHint: svc.tagHint,
    }))
  );
}
