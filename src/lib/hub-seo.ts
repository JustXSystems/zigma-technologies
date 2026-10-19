/**
 * Phase 3 hub SEO — titles without brand (layout appends "| Zigma Technologies").
 * Keep unique title ≤58 chars; descriptions 120–160.
 */
export type HubSeo = { title: string; description: string };

export const HUB_SEO = {
  projects: {
    title: 'Solar, UPS & Battery Storage Projects',
    description:
      'Case studies from 1,500+ projects: rooftop solar to 600 kW, data-centre UPS and hybrid lithium systems — scope, capacity and results.',
  },
  products: {
    title: 'UPS, Solar, BESS & EV Charging Products',
    description:
      'Industrial and IT UPS, lithium and VRLA batteries, BESS, solar modules and EV chargers — supplied, installed and supported pan-India.',
  },
  services: {
    title: 'UPS AMC, Solar O&M & Power Services',
    description:
      'AMC, engineering design, installation, commissioning and 24×7 support for UPS, solar, BESS and EV charging assets across India.',
  },
} as const satisfies Record<string, HubSeo>;
