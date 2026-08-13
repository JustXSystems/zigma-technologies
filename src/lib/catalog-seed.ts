/** Inventory seeds sourced from live zigma-technologies.com catalog pages */

import type { CatalogCaseStudy } from '@/lib/types';

export type SeedItem = {
  title: string;
  slug: string;
  summary: string;
  description: string;
  tags_json: readonly string[];
  specs_json: Record<string, string>;
  category_slug: string;
  featured: boolean;
  price_label?: string;
  image_url: string;
  case_study_json?: CatalogCaseStudy;
};

type SeedKind = 'project' | 'product' | 'service';

function firstSentence(text: string, max = 220) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const cut = clean.split(/(?<=[.!?])\s+/)[0] || clean;
  return cut.length > max ? `${cut.slice(0, max - 1).trim()}…` : cut;
}

/** Fill missing case-study / profile fields from the item itself (never overwrites existing values). */
function enrichSeedItem(item: SeedItem, kind: SeedKind): SeedItem {
  const cs = item.case_study_json || {};
  const specs = { ...item.specs_json };
  if (!specs.Highlight && item.summary) specs.Highlight = item.summary;
  if (kind === 'product' && !specs.Brand) {
    const brandTag = item.tags_json.find((t) => !['UPS', 'Solar', 'Battery', 'Inverter', 'Hybrid', 'BMS', 'VRLA', 'SVR', 'AMC', 'Repair', 'Rental', 'Design', 'Field Services', 'O&M', 'Maintenance', 'Commissioning', 'Events', 'Critical Power', 'Data Centre', 'Industrial', 'Agro', 'Education', 'Petroleum', 'Lithium', 'Modules', 'On-Grid', 'Off-Grid', 'Hybrid Combo', 'Stabilizer', 'Battery Monitoring'].includes(t));
    if (brandTag) specs.Brand = brandTag;
  }

  const defaultSector =
    kind === 'project'
      ? 'Industrial & infrastructure'
      : kind === 'service'
        ? 'Industrial operations'
        : 'Industrial & commercial facilities';

  const defaultChallenge =
    kind === 'project'
      ? `The client needed a proven delivery for ${item.title} with clear capacity, site fit, and dependable commissioning.`
      : kind === 'service'
        ? `Customers need reliable ${item.title.toLowerCase()} with measurable SLAs, local response, and documented execution.`
        : `Buyers need OEM-aligned ${item.title} with correct sizing guidance, installation support, and a clear service pathway.`;

  const defaultSolution = firstSentence(item.summary || item.description);
  const defaultScope =
    kind === 'service'
      ? `Assessment, execution of ${item.title}, documentation, and operational handover with Zigma service desk coverage.`
      : kind === 'project'
        ? `Engineering support, supply/installation as applicable, commissioning, testing, and handover for ${item.title}.`
        : `Supply of ${item.title}, application sizing guidance, installation/commissioning support, and AMC-ready documentation.`;

  const defaultOutcomes =
    kind === 'project'
      ? [
          'Delivered capacity/performance aligned to project requirements',
          'Commissioned with operational handover documentation',
          'Local Zigma support available for AMC and breakdowns',
        ]
      : kind === 'service'
        ? [
            'Predictable service delivery with documented visits/reports',
            'Faster response for breakdowns and planned maintenance',
            'Improved asset uptime and lifecycle visibility',
          ]
        : [
            'OEM-aligned product fit for the target application',
            'Clear sizing and commissioning support from Zigma',
            'Service/AMC pathway for long-term reliability',
          ];

  const defaultTech = [...item.tags_json].slice(0, 5);
  if (!defaultTech.length) defaultTech.push(item.title);

  const locationFromSpecs = specs.Location || cs.location;
  const yearFromSpecs = specs['Delivery year'] || cs.delivery_year;

  return {
    ...item,
    specs_json: specs,
    case_study_json: {
      enabled: true,
      client_name: cs.client_name,
      client_sector: cs.client_sector || defaultSector,
      location: locationFromSpecs || (kind === 'product' || kind === 'service' ? 'India' : cs.location),
      delivery_year: yearFromSpecs,
      challenge: cs.challenge || defaultChallenge,
      solution: cs.solution || defaultSolution,
      scope: cs.scope || defaultScope,
      outcomes: cs.outcomes && cs.outcomes.length >= 2 ? cs.outcomes : defaultOutcomes,
      technologies: cs.technologies && cs.technologies.length ? cs.technologies : defaultTech,
      testimonial: cs.testimonial,
    },
  };
}

function enrichSeedGroup(items: SeedItem[], kind: SeedKind): SeedItem[] {
  return items.map((item) => enrichSeedItem(item, kind));
}

const RAW_CATALOG_SEED: Record<SeedKind, SeedItem[]> = {
  project: [
    {
      title: 'Studer Hybrid + Lithium — Petroleum Project',
      slug: 'studer-hybrid-lithium-petroleum-project',
      summary: 'Studer hybrid inverter/charger with lithium batteries for a petroleum-site power solution.',
      description:
        'Zigma engineered and commissioned a Studer hybrid power architecture with lithium battery storage for a petroleum project, combining solar/hybrid conversion, battery storage, and resilient backup for critical site loads.',
      tags_json: ['Studer', 'Hybrid', 'Lithium', 'Petroleum'],
      specs_json: {
        Highlight: 'Hybrid + lithium continuity for petroleum site loads',
        Technology: 'Studer hybrid + lithium battery',
        Sector: 'Petroleum / energy',
      },
      category_slug: 'hybrid-power',
      featured: true,
      image_url: '/assets/images/seed-project-petroleum.jpg',
      case_study_json: {
        enabled: true,
        client_name: 'Petroleum project operator',
        client_sector: 'Oil & energy',
        location: 'India',
        delivery_year: '2025',
        challenge:
          'The site needed resilient hybrid power with lithium storage to support critical petroleum operations where grid quality and outages could disrupt production.',
        solution:
          'Deployed a Studer hybrid inverter/charger platform with lithium batteries, configured for hybrid energy management, seamless backup, and remote monitoring.',
        scope:
          'System design support, Studer hybrid equipment supply/integration, lithium battery bank, commissioning, and handover documentation.',
        outcomes: [
          'Reliable hybrid power continuity for petroleum site operations',
          'Lithium storage for efficient backup and cycling',
          'Remote-ready monitoring for operational visibility',
        ],
        technologies: ['Studer hybrid inverter/charger', 'Lithium batteries', 'Hybrid energy management'],
      },
    },
    {
      title: 'AMC Engineering College — 200 kW Rooftop Solar',
      slug: 'amc-engineering-college-200kw-bangalore',
      summary: '200 kW rooftop solar installation for AMC Engineering College, Bangalore.',
      description:
        'Turnkey rooftop solar delivery for AMC Engineering College covering module layout, inverter integration, and commissioning for campus energy offset in Bangalore.',
      tags_json: ['Solar EPC', 'Rooftop', 'Education'],
      specs_json: {
        Highlight: '200 kW campus rooftop solar — Bangalore',
        Capacity: '200 kW',
        Location: 'Bangalore',
      },
      category_slug: 'solar-epc',
      featured: true,
      image_url: '/assets/images/seed-project-amc-college.jpg',
      case_study_json: {
        enabled: true,
        client_name: 'AMC Engineering College',
        client_sector: 'Education',
        location: 'Bangalore, Karnataka',
        delivery_year: '2023',
        challenge: 'The campus needed a sizable rooftop solar plant to reduce grid dependency without disrupting academic operations.',
        solution: 'Zigma delivered a 200 kW rooftop solar EPC package with structured installation sequencing and commissioning.',
        scope: 'Site assessment, rooftop mounting, module & inverter installation, electrical integration, testing, and handover.',
        outcomes: [
          '200 kW of on-site solar generation capacity',
          'Lower daytime campus grid draw',
          'Documented commissioning and operational handover',
        ],
        technologies: ['Rooftop solar modules', 'String inverters', 'LT integration'],
      },
    },
    {
      title: 'Sri Rajalakshimi Agro Foods — 600 kW Solar',
      slug: 'sri-rajalakshimi-agro-foods-600kw-tumkur',
      summary: '600 kW industrial solar installation for Sri Rajalakshimi Agro Foods, Tumkur.',
      description:
        'Large-capacity industrial solar EPC for an agro-foods facility in Tumkur, engineered for high daytime process loads and long-term energy cost reduction.',
      tags_json: ['Solar EPC', 'Industrial', 'Agro'],
      specs_json: {
        Highlight: '600 kW industrial solar — Tumkur agro plant',
        Capacity: '600 kW',
        Location: 'Tumkur',
      },
      category_slug: 'solar-epc',
      featured: true,
      image_url: '/assets/images/seed-project-rajalakshimi.jpg',
      case_study_json: {
        enabled: true,
        client_name: 'Sri Rajalakshimi Agro Foods',
        client_sector: 'Agro & food processing',
        location: 'Tumkur, Karnataka',
        delivery_year: '2023',
        challenge: 'High process loads required a large solar plant sized for industrial daytime consumption and commercial payback.',
        solution: 'Executed a 600 kW solar EPC installation aligned to plant load profile and site constraints.',
        scope: 'Engineering, supply, installation, commissioning, and performance validation for a 600 kW plant.',
        outcomes: [
          '600 kW solar capacity online for industrial operations',
          'Significant daytime energy offset for process loads',
          'Scalable platform for future capacity expansion',
        ],
        technologies: ['Industrial solar EPC', 'Grid-tied inverters', 'Plant electrical integration'],
      },
    },
    {
      title: 'Karnataka Rice Industries — 200 kW Solar',
      slug: 'karnataka-rice-industries-200kw-tumkur',
      summary: '200 kW solar project for Karnataka Rice Industries, Tumkur.',
      description:
        'Industrial rooftop/plant solar delivery for a rice processing facility, focused on reducing operating energy cost and stabilizing daytime power demand.',
      tags_json: ['Solar EPC', 'Industrial'],
      specs_json: {
        Highlight: '200 kW solar for rice industry — Tumkur',
        Capacity: '200 kW',
        Location: 'Tumkur',
      },
      category_slug: 'solar-epc',
      featured: false,
      image_url: '/assets/images/seed-project-karnataka-rice.jpg',
      case_study_json: {
        enabled: true,
        client_name: 'Karnataka Rice Industries',
        client_sector: 'Agro processing',
        location: 'Tumkur, Karnataka',
        delivery_year: '2022',
        challenge: 'Rice processing loads required reliable daytime generation to cut grid energy spend.',
        solution: 'Installed and commissioned a 200 kW solar plant matched to industrial operating hours.',
        scope: 'Solar EPC installation, electrical tie-in, testing, and commissioning.',
        outcomes: ['200 kW solar generation for process loads', 'Improved daytime energy economics', 'Reliable plant handover'],
        technologies: ['Solar modules', 'Inverters', 'Industrial LT integration'],
      },
    },
    {
      title: 'Eshwari Agro Foods — 200 kW Solar',
      slug: 'eshwari-agro-foods-200kw-tumkur',
      summary: '200 kW solar installation for Eshwari Agro Foods, Tumkur.',
      description:
        'Commercial-industrial solar EPC for an agro-foods plant in Tumkur, delivering clean generation capacity for production loads.',
      tags_json: ['Solar EPC', 'Agro'],
      specs_json: {
        Highlight: '200 kW solar — agro foods plant, Tumkur',
        Capacity: '200 kW',
        Location: 'Tumkur',
      },
      category_slug: 'solar-epc',
      featured: false,
      image_url: '/assets/images/seed-project-eshwari.jpg',
      case_study_json: {
        enabled: true,
        client_name: 'Eshwari Agro Foods',
        client_sector: 'Agro & food processing',
        location: 'Tumkur, Karnataka',
        delivery_year: '2022',
        challenge: 'Facility needed dedicated solar capacity to offset rising industrial power costs.',
        solution: 'Delivered a 200 kW solar installation with commissioning for continuous plant use.',
        scope: 'Design support, installation, commissioning, and documentation.',
        outcomes: ['200 kW solar capacity commissioned', 'Lower grid dependency in daylight hours', 'Operational handover completed'],
        technologies: ['Solar EPC', 'Grid-tied inverters'],
      },
    },
    {
      title: 'Shiva Stones — 149 kW Solar',
      slug: 'shiva-stones-149kw-tumkur',
      summary: '149 kW solar project executed for Shiva Stones.',
      description:
        'Industrial solar installation sized at 149 kW for stone-industry operations, supporting daytime energy offset and plant sustainability goals.',
      tags_json: ['Solar EPC', 'Industrial'],
      specs_json: {
        Highlight: '149 kW industrial solar — Shiva Stones',
        Capacity: '149 kW',
        Location: 'Tumkur',
      },
      category_slug: 'solar-epc',
      featured: false,
      image_url: '/assets/images/seed-project-shiva-stones.jpg',
      case_study_json: {
        enabled: true,
        client_name: 'Shiva Stones',
        client_sector: 'Stone & industrial manufacturing',
        location: 'Tumkur, Karnataka',
        delivery_year: '2022',
        challenge: 'Stone processing operations needed cost-effective solar generation aligned to daytime production.',
        solution: 'Commissioned a 149 kW solar plant tailored to site load and available mounting area.',
        scope: 'Solar EPC delivery including installation and commissioning.',
        outcomes: ['149 kW solar plant online', 'Daytime energy cost reduction', 'Stable plant electrical integration'],
        technologies: ['Solar modules', 'Inverters'],
      },
    },
    {
      title: 'Mysore Drier Tech — 55 kW Solar',
      slug: 'mysore-drier-tech-55kw-tumkur',
      summary: '55 kW solar installation for Mysore Drier Tech, Tumkur.',
      description:
        'Compact industrial solar EPC for Mysore Drier Tech, delivering 55 kW of generation capacity for process and facility loads.',
      tags_json: ['Solar EPC', 'Industrial'],
      specs_json: {
        Highlight: '55 kW solar — Mysore Drier Tech, Tumkur',
        Capacity: '55 kW',
        Location: 'Tumkur',
      },
      category_slug: 'solar-epc',
      featured: false,
      image_url: '/assets/images/seed-project-mysore-drier.jpg',
      case_study_json: {
        enabled: true,
        client_name: 'Mysore Drier Tech',
        client_sector: 'Industrial manufacturing',
        location: 'Tumkur, Karnataka',
        delivery_year: '2023',
        challenge: 'Needed a right-sized solar plant for industrial drying operations without oversizing CapEx.',
        solution: 'Installed and commissioned a 55 kW solar system matched to facility demand.',
        scope: 'Survey, installation, commissioning, and handover.',
        outcomes: ['55 kW solar capacity delivered', 'Improved daytime energy mix', 'Clean handover documentation'],
        technologies: ['Rooftop/plant solar', 'String inverters'],
      },
    },
    {
      title: 'ABB UPS Installation — Bangalore (320 kW)',
      slug: 'abb-ups-installation-bangalore-320kw',
      summary: 'ABB UPS installation for critical power continuity in Bangalore (320 kW / 160 kVA × 2).',
      description:
        'Industrial UPS installation and commissioning using ABB platforms (dual 160 kVA configuration) to protect critical loads at a Bangalore site.',
      tags_json: ['UPS', 'ABB', 'Critical Power'],
      specs_json: {
        Highlight: 'ABB UPS install — 320 kW class, Bangalore',
        Capacity: '320 kW (160 kVA × 2)',
        Brand: 'ABB',
        Location: 'Bangalore',
      },
      category_slug: 'ups-battery',
      featured: true,
      image_url: '/assets/images/seed-project-abb-ups.jpg',
      case_study_json: {
        enabled: true,
        client_name: 'Bangalore industrial / commercial site',
        client_sector: 'Industrial & infrastructure',
        location: 'Bangalore, Karnataka',
        delivery_year: '2023',
        challenge: 'Critical loads required OEM-grade UPS protection with professional installation and commissioning.',
        solution: 'Installed ABB UPS systems in a dual-unit configuration and commissioned for site continuity.',
        scope: 'UPS placement, electrical integration, battery interface, testing, and commissioning.',
        outcomes: [
          'ABB UPS platform commissioned for critical loads',
          'Redundant dual-unit topology for continuity',
          'Site-ready documentation and handover',
        ],
        technologies: ['ABB UPS', 'Battery banks', 'Critical power commissioning'],
      },
    },
    {
      title: 'eMudhra Data Centre UPS — Chennai (90 kVA)',
      slug: 'emudra-data-centre-ups-chennai-90kva',
      summary: '90 kVA UPS installation for eMudhra data centre operations in Chennai.',
      description:
        'Data-centre UPS installation and commissioning for eMudhra in Chennai, protecting IT/infrastructure loads with professional field execution.',
      tags_json: ['UPS', 'Data Centre', 'Critical Power'],
      specs_json: {
        Highlight: '90 kVA data-centre UPS — Chennai',
        Capacity: '90 kVA',
        Client: 'eMudhra',
        Location: 'Chennai',
      },
      category_slug: 'ups-battery',
      featured: true,
      image_url: '/assets/images/seed-project-emudra.jpg',
      case_study_json: {
        enabled: true,
        client_name: 'eMudhra',
        client_sector: 'IT / data centre',
        location: 'Chennai, Tamil Nadu',
        delivery_year: '2021',
        challenge: 'Data-centre loads required dependable UPS protection with clean installation in a live IT environment.',
        solution: 'Supplied and commissioned a 90 kVA UPS system for data-centre continuity.',
        scope: 'UPS installation, battery integration, load testing support, and commissioning.',
        outcomes: [
          '90 kVA UPS protecting data-centre loads',
          'Commissioned with operational handover',
          'Improved continuity posture for critical IT services',
        ],
        technologies: ['UPS systems', 'Battery banks', 'Data-centre power'],
      },
    },
  ],

  product: [
    {
      title: 'ABB Industrial & Server UPS',
      slug: 'abb-industrial-server-ups',
      summary: 'ABB UPS platforms for industrial plants, process control, and mission-critical server rooms.',
      description:
        'Zigma supplies and supports ABB UPS lines spanning single-phase, three-phase standalone/modular, high-power, industrial, and specialized applications. Suitable for manufacturing plants, process industries, and data infrastructure where power continuity is non-negotiable.',
      tags_json: ['UPS', 'ABB', 'Industrial'],
      specs_json: {
        Brand: 'ABB',
        Applications: 'Industrial / server / modular UPS',
        Support: 'Supply, install, AMC-ready',
      },
      price_label: 'On request',
      category_slug: 'ups-systems',
      featured: true,
      image_url: '/assets/images/seed-abb-ups.jpg',
      case_study_json: {
        enabled: true,
        client_sector: 'Industrial & data infrastructure',
        solution: 'ABB UPS platforms configured for industrial machinery, control systems, and server environments.',
        scope: 'Product supply, sizing guidance, installation support, and AMC transition.',
        technologies: ['ABB UPS', 'Modular/standalone topologies', 'Battery integration'],
        outcomes: ['OEM-aligned UPS continuity', 'Scalable topologies for growth', 'Serviceable with Zigma AMC desk'],
      },
    },
    {
      title: 'APC / Schneider UPS Systems',
      slug: 'apc-schneider-ups-systems',
      summary: 'APC by Schneider Electric UPS solutions for IT, commercial, and industrial backup.',
      description:
        'Authorized-aligned APC/Schneider UPS portfolio for IT rooms, commercial facilities, and industrial loads — with surge protection, voltage regulation, and battery-backed continuity.',
      tags_json: ['UPS', 'APC', 'Schneider'],
      specs_json: {
        Brand: 'APC / Schneider Electric',
        Applications: 'IT / commercial / industrial',
        Monitoring: 'SNMP-ready options',
      },
      price_label: 'On request',
      category_slug: 'ups-systems',
      featured: true,
      image_url: '/assets/images/seed-apc-ups.jpg',
      case_study_json: {
        enabled: true,
        client_sector: 'IT & commercial facilities',
        solution: 'APC/Schneider UPS systems selected for rack, room, and facility-level protection.',
        scope: 'Supply, commissioning support, battery health planning, and AMC options.',
        technologies: ['APC UPS', 'Schneider ecosystem', 'Battery management ready'],
      },
    },
    {
      title: 'Vertiv UPS Systems',
      slug: 'vertiv-ups-systems',
      summary: 'Vertiv UPS platforms for data centres and critical facility power.',
      description:
        'Vertiv UPS solutions for high-availability environments including data centres and critical facilities, backed by Zigma installation and service capability.',
      tags_json: ['UPS', 'Vertiv', 'Data Centre'],
      specs_json: { Brand: 'Vertiv', Focus: 'Critical / data-centre UPS' },
      price_label: 'On request',
      category_slug: 'ups-systems',
      featured: false,
      image_url: '/assets/images/seed-vertiv-ups.jpg',
    },
    {
      title: 'Numeric UPS Systems',
      slug: 'numeric-ups-systems',
      summary: 'Numeric UPS systems for commercial and industrial backup applications.',
      description:
        'Numeric UPS portfolio supplied and supported by Zigma for commercial buildings, industrial loads, and IT backup needs.',
      tags_json: ['UPS', 'Numeric'],
      specs_json: { Brand: 'Numeric', Applications: 'Commercial / industrial' },
      price_label: 'On request',
      category_slug: 'ups-systems',
      featured: false,
      image_url: '/assets/images/seed-numeric-ups.jpg',
    },
    {
      title: 'Eaton UPS Systems',
      slug: 'eaton-ups-systems',
      summary: 'Eaton UPS solutions for enterprise and industrial power protection.',
      description:
        'Eaton UPS systems for enterprise IT and industrial environments, with Zigma support for supply, commissioning, and maintenance.',
      tags_json: ['UPS', 'Eaton'],
      specs_json: { Brand: 'Eaton', Applications: 'Enterprise / industrial' },
      price_label: 'On request',
      category_slug: 'ups-systems',
      featured: false,
      image_url: '/assets/images/seed-eaton-ups.jpg',
    },
    {
      title: 'Delta UPS Systems',
      slug: 'delta-ups-systems',
      summary: 'Delta UPS platforms for industrial and IT continuity.',
      description:
        'Delta UPS product line for industrial and IT backup applications, available through Zigma with installation and AMC pathways.',
      tags_json: ['UPS', 'Delta'],
      specs_json: { Brand: 'Delta', Applications: 'Industrial / IT' },
      price_label: 'On request',
      category_slug: 'ups-systems',
      featured: false,
      image_url: '/assets/images/seed-delta-ups.jpg',
    },
    {
      title: 'Powerone UPS Systems',
      slug: 'powerone-ups-systems',
      summary: 'Powerone UPS systems for commercial and industrial backup power.',
      description:
        'Powerone UPS solutions supplied by Zigma for facilities needing dependable backup with local service support.',
      tags_json: ['UPS', 'Powerone'],
      specs_json: { Brand: 'Powerone', Applications: 'Commercial / industrial' },
      price_label: 'On request',
      category_slug: 'ups-systems',
      featured: false,
      image_url: '/assets/images/seed-powerone-ups.jpg',
    },
    {
      title: 'Studer XTM Series Hybrid Inverter/Charger',
      slug: 'studer-xtm-series',
      summary: 'Modular Swiss Studer XTM hybrid inverter/charger for scalable off-grid and hybrid systems.',
      description:
        'Studer XTM Series modular hybrid inverter/chargers deliver high-efficiency hybrid energy management, multi-chemistry battery support, remote monitoring, and parallel expansion for homes, telecom, and industrial sites.',
      tags_json: ['Studer', 'Hybrid', 'Inverter'],
      specs_json: {
        Brand: 'Studer',
        Series: 'XTM',
        Type: 'Modular hybrid inverter/charger',
        Batteries: 'Lead-acid / lithium compatible',
      },
      price_label: 'On request',
      category_slug: 'studer-hybrid',
      featured: true,
      image_url: '/assets/images/seed-studer-xtm.jpg',
      case_study_json: {
        enabled: true,
        client_sector: 'Off-grid & hybrid power',
        solution: 'Modular Studer XTM hybrid platforms for scalable solar + battery + grid architectures.',
        scope: 'Product supply, system design guidance, commissioning support.',
        technologies: ['Studer XTM', 'Hybrid energy management', 'Remote monitoring'],
        outcomes: ['Scalable modular architecture', 'Seamless backup during grid failure', 'Multi-chemistry battery flexibility'],
      },
    },
    {
      title: 'Studer XTH Series High-Performance Hybrid',
      slug: 'studer-xth-series',
      summary: 'High-performance Studer XTH hybrid inverter for demanding hybrid and backup applications.',
      description:
        'Studer XTH Series high-performance hybrid inverters are engineered for robust hybrid energy management with Swiss durability, efficient conversion, and reliable backup behaviour.',
      tags_json: ['Studer', 'Hybrid', 'XTH'],
      specs_json: { Brand: 'Studer', Series: 'XTH', Type: 'High-performance hybrid inverter' },
      price_label: 'On request',
      category_slug: 'studer-hybrid',
      featured: true,
      image_url: '/assets/images/seed-studer-xth.jpg',
    },
    {
      title: 'Studer XTS Series Compact Hybrid',
      slug: 'studer-xts-series',
      summary: 'Compact Studer XTS hybrid inverter/charger for space-efficient hybrid installations.',
      description:
        'Studer XTS Series compact hybrid inverter/chargers suit installations needing Swiss hybrid performance in a smaller footprint for residential and light-commercial applications.',
      tags_json: ['Studer', 'Hybrid', 'XTS'],
      specs_json: { Brand: 'Studer', Series: 'XTS', Type: 'Compact hybrid inverter/charger' },
      price_label: 'On request',
      category_slug: 'studer-hybrid',
      featured: false,
      image_url: '/assets/images/seed-studer-xts.jpg',
    },
    {
      title: 'Kirloskar Solar Modules',
      slug: 'kirloskar-solar-modules',
      summary: 'Kirloskar Solar modules for residential, commercial, and industrial rooftops and plants.',
      description:
        'High-efficiency Kirloskar Solar modules designed for durability in harsh weather, low maintenance, and customizable system capacities — backed by Zigma solar EPC and O&M capability.',
      tags_json: ['Solar', 'Kirloskar', 'Modules'],
      specs_json: {
        Brand: 'Kirloskar Solar',
        Applications: 'Residential / commercial / industrial',
        Focus: 'High efficiency & durability',
      },
      price_label: 'On request',
      category_slug: 'solar-solutions',
      featured: true,
      image_url: '/assets/images/seed-solar-modules.jpg',
      case_study_json: {
        enabled: true,
        client_sector: 'C&I solar',
        solution: 'Kirloskar solar modules for rooftop and plant applications with Zigma EPC delivery.',
        scope: 'Module supply guidance, system integration, and commissioning support.',
        technologies: ['Kirloskar Solar modules', 'Rooftop mounting', 'Grid-tied systems'],
      },
    },
    {
      title: 'On-Grid String Solar Inverters',
      slug: 'on-grid-string-solar-inverters',
      summary: 'On-grid string inverters for commercial and industrial solar plants.',
      description:
        'On-grid string inverter solutions for exporting/self-consuming solar generation with reliable MPPT performance and plant monitoring readiness.',
      tags_json: ['Solar', 'On-Grid', 'Inverter'],
      specs_json: { Type: 'On-grid string inverter', Application: 'C&I solar' },
      price_label: 'On request',
      category_slug: 'solar-solutions',
      featured: true,
      image_url: '/assets/images/seed-ongrid-inverter.jpg',
    },
    {
      title: 'Off-Grid Solar Inverters',
      slug: 'off-grid-solar-inverters',
      summary: 'Off-grid solar inverters for battery-backed standalone and hybrid sites.',
      description:
        'Off-grid solar inverter solutions for sites needing battery-backed autonomy, remote locations, and hybrid backup architectures.',
      tags_json: ['Solar', 'Off-Grid', 'Inverter'],
      specs_json: { Type: 'Off-grid solar inverter', Application: 'Standalone / hybrid' },
      price_label: 'On request',
      category_slug: 'solar-solutions',
      featured: false,
      image_url: '/assets/images/seed-offgrid-inverter.jpg',
    },
    {
      title: 'On-Grid & Off-Grid Solar Combos',
      slug: 'on-off-grid-solar-combos',
      summary: 'Combined on-grid and off-grid solar packages for flexible site energy strategies.',
      description:
        'Packaged solar combo solutions blending on-grid and off-grid capabilities for facilities that need both export/self-consumption and backup autonomy.',
      tags_json: ['Solar', 'Hybrid Combo'],
      specs_json: { Type: 'On/Off-grid combo', Application: 'Flexible solar architectures' },
      price_label: 'On request',
      category_slug: 'solar-solutions',
      featured: false,
      image_url: '/assets/images/seed-solar-combo.jpg',
    },
    {
      title: 'Microtek Inverters',
      slug: 'microtek-inverters',
      summary: 'Microtek inverters for home, office, and hybrid solar backup applications.',
      description:
        'Microtek inverter range for residential and office backup, including solar-compatible hybrid options. Zigma supports selection, supply, and service.',
      tags_json: ['Inverter', 'Microtek'],
      specs_json: { Brand: 'Microtek', Applications: 'Home / office / hybrid solar' },
      price_label: 'On request',
      category_slug: 'inverters',
      featured: true,
      image_url: '/assets/images/seed-microtek-inverter.jpg',
    },
    {
      title: 'Luminous Inverters',
      slug: 'luminous-inverters',
      summary: 'Luminous inverters for residential, commercial, and industrial backup power.',
      description:
        'Luminous inverter solutions spanning home backup to commercial/industrial use, including solar-compatible models supported by Zigma.',
      tags_json: ['Inverter', 'Luminous'],
      specs_json: { Brand: 'Luminous', Applications: 'Residential / commercial / industrial' },
      price_label: 'On request',
      category_slug: 'inverters',
      featured: true,
      image_url: '/assets/images/seed-luminous-inverter.jpg',
    },
    {
      title: 'Eastman Inverters',
      slug: 'eastman-inverters',
      summary: 'Eastman inverters for reliable backup and solar-compatible power conversion.',
      description:
        'Eastman inverter lineup for homes and businesses needing dependable DC–AC conversion and backup readiness.',
      tags_json: ['Inverter', 'Eastman'],
      specs_json: { Brand: 'Eastman', Applications: 'Backup / solar-compatible' },
      price_label: 'On request',
      category_slug: 'inverters',
      featured: false,
      image_url: '/assets/images/seed-eastman-inverter.jpg',
    },
    {
      title: 'Amaron Quanta Batteries',
      slug: 'amaron-quanta-batteries',
      summary: 'Amaron Quanta sealed VRLA batteries for UPS, inverter, and telecom loads.',
      description:
        'Maintenance-free Amaron Quanta VRLA batteries engineered for deep-cycle inverter/UPS duty, spill-proof construction, and long service life in homes, offices, and industry.',
      tags_json: ['Battery', 'Amaron Quanta', 'VRLA'],
      specs_json: {
        Brand: 'Amaron Quanta',
        Chemistry: 'VRLA / sealed MF',
        Applications: 'UPS / inverter / telecom',
      },
      price_label: 'On request',
      category_slug: 'batteries',
      featured: true,
      image_url: '/assets/images/seed-amaron-battery.jpg',
      case_study_json: {
        enabled: true,
        client_sector: 'UPS & backup power',
        solution: 'Amaron Quanta VRLA banks sized for UPS autonomy and inverter backup.',
        scope: 'Battery selection, string sizing guidance, installation support, health checks.',
        technologies: ['VRLA batteries', 'UPS autonomy sizing'],
      },
    },
    {
      title: 'Exide Batteries',
      slug: 'exide-batteries',
      summary: 'Exide deep-cycle and UPS batteries for backup and solar applications.',
      description:
        'Exide battery solutions for inverter, UPS, solar, and industrial backup duty — supplied and supported by Zigma with health-check and replacement services.',
      tags_json: ['Battery', 'Exide'],
      specs_json: { Brand: 'Exide', Applications: 'UPS / inverter / solar' },
      price_label: 'On request',
      category_slug: 'batteries',
      featured: true,
      image_url: '/assets/images/seed-exide-battery.jpg',
    },
    {
      title: 'Eastman Batteries',
      slug: 'eastman-batteries',
      summary: 'Eastman batteries for inverter and UPS backup systems.',
      description:
        'Eastman battery range for residential and commercial backup applications, available through Zigma with installation and maintenance support.',
      tags_json: ['Battery', 'Eastman'],
      specs_json: { Brand: 'Eastman', Applications: 'Inverter / UPS backup' },
      price_label: 'On request',
      category_slug: 'batteries',
      featured: false,
      image_url: '/assets/images/seed-eastman-battery.jpg',
    },
    {
      title: 'Zigma Static Voltage Regulators (Optimus Series)',
      slug: 'zigma-static-voltage-regulators',
      summary: 'PWM/IGBT static voltage regulators with ±1% regulation and ≤20 ms correction.',
      description:
        'Zigma Optimus Series static voltage regulators use high-frequency IGBT/PWM technology for real-time ±1% regulation without tap switching. Ideal for sensitive industrial, IT, medical, and engineering loads. Isolation transformers also available for noise/spike attenuation and neutral isolation.',
      tags_json: ['Stabilizer', 'SVR', 'Zigma'],
      specs_json: {
        Regulation: '±1% real-time',
        Correction: '≤20 ms (1 cycle)',
        Technology: 'PWM / IGBT solid-state',
        Series: 'Optimus',
      },
      price_label: 'On request',
      category_slug: 'stabilizers',
      featured: true,
      image_url: '/assets/images/seed-stabilizer-optimus.png',
      case_study_json: {
        enabled: true,
        client_sector: 'Industrial & sensitive loads',
        solution: 'Solid-state SVR platforms delivering continuous conditioned power free from surge/spike/brown-out events.',
        scope: 'Product selection, supply, and commissioning support for SVR / isolation transformer packages.',
        technologies: ['IGBT PWM SVR', 'Isolation transformers'],
        outcomes: ['Precise voltage conditioning', 'No mechanical tap wear', 'Protection for sensitive equipment'],
      },
    },
    {
      title: 'APC Battery Management System (BMS)',
      slug: 'apc-battery-management-system',
      summary: 'APC BMS modules, sensors, and harnesses for UPS battery health monitoring.',
      description:
        'APC Battery Management System portfolio including current sensors (incl. 2000 Amp UPS sensor), main/expansion modules, and management harnesses (25/50/100 ft) to monitor UPS battery health, safety, and life.',
      tags_json: ['BMS', 'APC', 'Battery Monitoring'],
      specs_json: {
        Brand: 'APC',
        Components: 'Sensors, main/EM modules, harnesses',
        Application: 'UPS battery monitoring',
      },
      price_label: 'On request',
      category_slug: 'bms',
      featured: true,
      image_url: '/assets/images/seed-bms-apc.png',
      case_study_json: {
        enabled: true,
        client_sector: 'UPS & critical power',
        solution: 'APC BMS components for continuous battery health visibility and safer UPS operation.',
        scope: 'BMS product supply, harness selection, and integration guidance.',
        technologies: ['APC BMS', 'Current sensors', 'Battery harness kits'],
      },
    },
    {
      title: 'Utility-Scale Battery Energy Storage (BESS)',
      slug: 'utility-scale-bess',
      summary: 'Containerised and plant-scale BESS for peak shaving, backup, and renewable firming.',
      description:
        'Zigma designs and delivers utility- and C&I-scale battery energy storage systems — from containerised racks to plant-integrated storage — with EMS coordination, PCS integration, and lifecycle service support for peak shaving, backup, and solar firming.',
      tags_json: ['BESS', 'EMS', 'Storage', 'Utility'],
      specs_json: {
        Type: 'Utility / C&I BESS',
        Focus: 'Peak shaving, backup, renewable firming',
        Integration: 'PCS + EMS + solar/grid',
      },
      price_label: 'On request',
      category_slug: 'bess',
      featured: true,
      image_url: '/assets/images/city-skyline-with-solar-panels-and-indus.jpg',
      case_study_json: {
        enabled: true,
        client_sector: 'Utility & C&I energy storage',
        challenge: 'Sites need dispatchable storage to cut demand charges, ride through outages, and firm intermittent renewables.',
        solution: 'Engineered BESS packages with EMS controls, PCS integration, and commissioning for peak shaving and backup duty.',
        scope: 'System design, supply coordination, EMS setup, and field commissioning.',
        technologies: ['Lithium BESS', 'PCS', 'Energy management system'],
        outcomes: ['Lower peak demand costs', 'Improved renewable utilisation', 'Grid-independent backup windows'],
      },
    },
    {
      title: 'Peak Shaving & Energy Management (EMS)',
      slug: 'peak-shaving-ems-bess',
      summary: 'BESS + EMS packages that cut demand charges and automate energy dispatch.',
      description:
        'Peak-shaving and EMS-led BESS solutions that monitor site load, dispatch stored energy at the right moments, and coordinate with solar or grid supply — ideal for factories, campuses, and commercial facilities with high demand tariffs.',
      tags_json: ['BESS', 'EMS', 'Peak Shaving'],
      specs_json: {
        Type: 'BESS + EMS',
        Focus: 'Demand charge reduction & automated dispatch',
        Applications: 'Factories / campuses / commercial',
      },
      price_label: 'On request',
      category_slug: 'bess',
      featured: true,
      image_url: '/assets/images/solar-farm-with-wind-turbines-at-sunset-.jpg',
    },
    {
      title: 'EV Charging Infrastructure',
      slug: 'ev-charging-infrastructure',
      summary: 'AC/DC EV charging infrastructure for campuses, fleets, and commercial sites.',
      description:
        'End-to-end EV charging infrastructure — AC and DC chargers, electrical design, installation, and commissioning — for corporate campuses, fleet depots, malls, and public parking. Zigma also integrates chargers with solar and BESS for lower operating cost.',
      tags_json: ['EV', 'Smart', 'Infrastructure'],
      specs_json: {
        Type: 'AC / DC EV charging',
        Applications: 'Campus / fleet / commercial',
        Integration: 'Standalone or solar + BESS',
      },
      price_label: 'On request',
      category_slug: 'ev-charging',
      featured: true,
      image_url: '/assets/images/blue-electric-vehicle-charging-at-a-mode.jpg',
      case_study_json: {
        enabled: true,
        client_sector: 'Fleet & commercial mobility',
        challenge: 'Sites need reliable EV charging capacity without overloading electrical infrastructure.',
        solution: 'Right-sized AC/DC charger layouts with electrical upgrades and optional solar/BESS buffering.',
        scope: 'Site survey, charger selection, electrical works, commissioning, and handover.',
        technologies: ['AC chargers', 'DC fast chargers', 'Load management'],
        outcomes: ['Ready-to-use charging bays', 'Controlled peak demand', 'Path to solar-backed charging'],
      },
    },
    {
      title: 'Smart EV Charging Solutions',
      slug: 'smart-ev-charging-solutions',
      summary: 'Load-managed smart charging with monitoring and fleet-ready controls.',
      description:
        'Smart EV charging solutions with load management, remote monitoring, and access control — designed so multiple chargers share available capacity safely while operators track utilisation and energy cost.',
      tags_json: ['EV', 'Smart', 'Load Management'],
      specs_json: {
        Type: 'Smart / networked charging',
        Focus: 'Load management & monitoring',
        Applications: 'Multi-bay campuses & fleets',
      },
      price_label: 'On request',
      category_slug: 'ev-charging',
      featured: true,
      image_url: '/assets/images/blue-electric-vehicle-charging-at-a-mode.jpg',
    },
    {
      title: 'Solar + BESS + EV Integrated Charging',
      slug: 'solar-bess-ev-charging',
      summary: 'Integrated solar, storage, and EV charging for lower cost and greener mobility.',
      description:
        'Integrated Solar + BESS + EV architectures that charge vehicles from on-site generation and stored energy, reducing grid dependence and enabling green mobility programs for campuses and fleets.',
      tags_json: ['EV', 'Solar', 'BESS'],
      specs_json: {
        Type: 'Solar + BESS + EV',
        Focus: 'On-site generation + storage + charging',
        Applications: 'Campuses / fleets / green mobility',
      },
      price_label: 'On request',
      category_slug: 'ev-charging',
      featured: false,
      image_url: '/assets/images/city-skyline-with-solar-panels-and-indus.jpg',
    },
  ],

  service: [
    {
      title: 'Field Installation & Commissioning',
      slug: 'field-installation-commissioning',
      summary: 'UPS and solar field services — install, commission, maintain, and modernize critical power assets.',
      description:
        'Zigma field teams deliver installation & commissioning, maintenance & operations, safety services, UPS installation & operations, and equipment refresh programs. Process: site assessment → equipment selection → system design → electrical connections → testing & validation.',
      tags_json: ['Field Services', 'Commissioning', 'UPS', 'Solar'],
      specs_json: {
        Coverage: 'UPS & solar field execution',
        Process: 'Assess → Design → Connect → Test',
        Services: 'Install / maintain / modernize',
      },
      category_slug: 'field-services',
      featured: true,
      image_url: '/assets/images/seed-service-field.jpg',
      case_study_json: {
        enabled: true,
        client_sector: 'Industrial & commercial facilities',
        challenge: 'Sites need disciplined field execution to install and commission critical UPS/solar assets without downtime risk.',
        solution: 'Structured field methodology from assessment through validation with specialized UPS and solar crews.',
        scope: 'Installation, commissioning, maintenance operations, safety, and equipment modernization.',
        outcomes: [
          'Reduced commissioning risk',
          'Documented testing & validation',
          'Longer asset life through proper field practices',
        ],
        technologies: ['UPS field services', 'Solar commissioning', 'Safety procedures'],
      },
    },
    {
      title: 'UPS Annual Maintenance Contract (AMC)',
      slug: 'ups-amc',
      summary: 'PAN-India UPS AMC with preventive maintenance, battery care, and emergency response (1–500 kVA).',
      description:
        'UPS AMC programs after warranty — Zigma has fulfilled 10,000+ AMCs via infrastructure across 500 cities. Coverage for major brands from 1 kVA to 500 kVA with Standard/Customized SLAs: preventive maintenance, battery testing & replacement, emergency calls, load testing, and helpdesk support.',
      tags_json: ['AMC', 'UPS', 'PAN-India'],
      specs_json: {
        Range: '1–500 kVA',
        Reach: '500+ cities',
        Track: '10,000+ AMCs fulfilled',
        SLA: 'Standard / customized',
      },
      category_slug: 'ups-amc',
      featured: true,
      image_url: '/assets/images/seed-service-ups-amc.jpg',
      case_study_json: {
        enabled: true,
        client_sector: 'Industrial operations',
        challenge: 'Post-warranty UPS fleets need predictable preventive care and fast emergency response.',
        solution: 'Tiered AMC packages with PM schedules, battery programs, and priority helpdesk.',
        scope: 'Preventive visits, battery testing/replacement, emergency response, load testing, technical helpdesk.',
        outcomes: [
          'Lower unplanned downtime',
          'Battery health visibility',
          'Priority emergency desk across PAN-India network',
        ],
        technologies: ['UPS AMC', 'Battery health checks', 'Load testing'],
      },
    },
    {
      title: 'UPS Repair & Reverse Engineering Support',
      slug: 'ups-repair-service',
      summary: 'Workshop and onsite UPS repair, non-warranty breakdowns, and battery health checkups.',
      description:
        'Diagnoses and restores failed UPS systems to minimize downtime. Includes corrective maintenance, workshop repair, onsite repair, non-warranty breakdown visits, and battery health checkup/maintenance — focused on expertise, timely response, quality repairs, and business continuity.',
      tags_json: ['Repair', 'UPS', 'Breakdown'],
      specs_json: {
        Modes: 'Workshop / onsite',
        Coverage: 'Warranty & non-warranty',
        Extra: 'Battery health checkup',
      },
      category_slug: 'ups-repair',
      featured: true,
      image_url: '/assets/images/seed-service-ups-repair.jpg',
      case_study_json: {
        enabled: true,
        client_sector: 'Critical facilities',
        challenge: 'Failed or aging UPS units threaten continuity when OEM warranty windows have closed.',
        solution: 'Reverse engineering and industrial repair support with workshop/onsite capability.',
        scope: 'Fault diagnosis, corrective repair, non-warranty visits, battery health maintenance.',
        outcomes: ['Faster restoration of protection', 'Extended asset life', 'Business continuity preserved'],
        technologies: ['UPS repair', 'Battery diagnostics', 'Corrective maintenance'],
      },
    },
    {
      title: 'UPS Rental',
      slug: 'ups-rental',
      summary: 'Short-term UPS rental for events, exam centres, and temporary critical power needs.',
      description:
        'Flexible UPS rental from hours to months — cost-effective versus purchase, with installation setup, battery backup, on-site monitoring, maintenance support, and return/pickup included.',
      tags_json: ['Rental', 'UPS', 'Events'],
      specs_json: {
        Duration: 'Hours to months',
        Includes: 'Install, monitor, pickup',
        'Use cases': 'Events / exam centres / temporary loads',
      },
      category_slug: 'ups-rental',
      featured: false,
      image_url: '/assets/images/seed-service-ups-rental.jpg',
      case_study_json: {
        enabled: true,
        client_sector: 'Events & temporary facilities',
        solution: 'Turnkey UPS rental packages avoiding CapEx while covering install and monitoring.',
        scope: 'Delivery, installation setup, on-site monitoring, maintenance, return & pickup.',
        outcomes: ['No CapEx for short-term needs', 'Maintained backup during events', 'Hassle-free pickup'],
        technologies: ['Rental UPS', 'Temporary battery backup'],
      },
    },
    {
      title: 'Solar O&M / Maintenance Service',
      slug: 'solar-maintenance-service',
      summary: 'Complete solar O&M for industrial and residential plants — inspect, clean, repair, optimize.',
      description:
        'Solar operations & maintenance addressing dust, weather, and wear on panels, inverters, and wiring. Includes preventive maintenance, upgrade/replacement, performance optimization, early issue detection, and safety assurance for industrial and residential systems.',
      tags_json: ['Solar', 'O&M', 'Maintenance'],
      specs_json: {
        Scope: 'Industrial & residential O&M',
        Activities: 'Inspect / clean / repair / optimize',
        Extra: 'Upgrade & replacement',
      },
      category_slug: 'solar-om',
      featured: true,
      image_url: '/assets/images/seed-service-solar-om.jpg',
      case_study_json: {
        enabled: true,
        client_sector: 'C&I and residential solar',
        challenge: 'Dust and weather degrade solar yield without disciplined O&M.',
        solution: 'Structured O&M programs for inspections, cleaning, repairs, and performance optimization.',
        scope: 'Preventive maintenance, upgrades/replacements, safety checks, yield improvement actions.',
        outcomes: ['Higher energy yield', 'Longer system life', 'Earlier fault detection'],
        technologies: ['Solar O&M', 'Inverter health checks', 'Module cleaning programs'],
      },
    },
    {
      title: 'Design & Outsource Support (EPLAN & AutoCAD)',
      slug: 'design-outsource-support',
      summary: 'Outsourced electrical design using EPLAN & AutoCAD across industrial verticals.',
      description:
        'External engineering capacity for machinery & plant construction, panel building, automotive, process industry, energy, and building technology. Delivers expertise, customization, QA, cost-effective scaling, and confidentiality using EPLAN and AutoCAD workflows.',
      tags_json: ['Design', 'EPLAN', 'AutoCAD'],
      specs_json: {
        Tools: 'EPLAN & AutoCAD',
        Verticals: 'Plant / panel / auto / process / energy / building',
        Deliverables: 'SLD, panel design, documentation',
      },
      category_slug: 'engineering-design',
      featured: true,
      image_url: '/assets/images/seed-service-design.jpg',
      case_study_json: {
        enabled: true,
        client_sector: 'Industrial engineering & OEMs',
        challenge: 'Peak engineering loads and skill gaps slow plant/panel delivery schedules.',
        solution: 'Outsourced EPLAN/AutoCAD design support that scales with project demand.',
        scope: 'Electrical design, panel building documentation, process/energy drawings, QA reviews.',
        outcomes: ['Faster design throughput', 'Consistent documentation quality', 'Flexible engineering capacity'],
        technologies: ['EPLAN', 'AutoCAD', 'Electrical design packages'],
      },
    },
  ],
};

export const CATALOG_SEED: Record<SeedKind, SeedItem[]> = {
  project: enrichSeedGroup(RAW_CATALOG_SEED.project, 'project'),
  product: enrichSeedGroup(RAW_CATALOG_SEED.product, 'product'),
  service: enrichSeedGroup(RAW_CATALOG_SEED.service, 'service'),
};
