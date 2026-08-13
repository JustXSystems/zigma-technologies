/** Default header mega-menu + footer columns for nav CMS seeding */

export type NavSeedNode = {
  label: string;
  href?: string | null;
  meta_json?: Record<string, unknown>;
  children?: NavSeedNode[];
};

/**
 * What We Do links pass catalog filter keys so listings open pre-filtered.
 * - /services?category=<slug>
 * - /products?category=<slug>&tag=<Brand>
 * - /projects?category=<slug>
 * Column headings link to homepage capability sections (no separate “Learn more” rows).
 */
export const HEADER_NAV_SEED: NavSeedNode[] = [
  {
    label: 'Who We Are',
    href: '/#why',
    meta_json: { kind: 'mega' },
    children: [
      {
        label: 'About Us',
        href: '/#why',
        meta_json: { kind: 'column' },
        children: [
          { label: 'About Zigma', href: '/#why' },
          { label: '20+ Years Legacy', href: '/#legacy' },
        ],
      },
      {
        label: 'Standards & proof',
        href: '/certifications',
        meta_json: { kind: 'column' },
        children: [
          { label: 'Certifications', href: '/certifications' },
          { label: 'Quality & Safety', href: '/certifications#industry-certs' },
          { label: 'Case studies', href: '/projects' },
          { label: 'Service levels', href: '/sla' },
          { label: 'Press', href: '/press' },
        ],
      },
      {
        label: 'Company',
        href: '/careers',
        meta_json: { kind: 'column' },
        children: [
          { label: 'Life at Zigma', href: '/careers#why-join-us' },
          { label: 'Careers', href: '/careers' },
        ],
      },
    ],
  },
  {
    label: 'What We Do',
    href: '/services',
    meta_json: { kind: 'mega', megaClass: 'mega-2x2' },
    children: [
      {
        label: 'Generate',
        href: '/#generate',
        meta_json: { kind: 'column' },
        children: [
          { label: 'Solar EPC Solutions', href: '/projects?category=solar-epc' },
          { label: 'Solar AMC - O&M', href: '/services?category=solar-om' },
          { label: 'Solar Inverters', href: '/products?category=solar-solutions' },
        ],
      },
      {
        label: 'Protect',
        href: '/#protect',
        meta_json: { kind: 'column' },
        children: [
          { label: 'UPS Solutions', href: '/products?category=ups-systems' },
          { label: 'ABB UPS', href: '/products?category=ups-systems&tag=ABB' },
          { label: 'APC / Schneider UPS', href: '/products?category=ups-systems&tag=APC' },
          { label: 'UPS AMC Services', href: '/services?category=ups-amc' },
          { label: 'Field Commissioning', href: '/services?category=field-services' },
        ],
      },
      {
        label: 'BESS',
        href: '/#bess',
        meta_json: { kind: 'column' },
        children: [
          { label: 'Utility-Scale BESS', href: '/products?category=bess' },
          { label: 'Peak Shaving & EMS', href: '/products?category=bess&tag=EMS' },
          { label: 'Hybrid Solar + BESS', href: '/products?category=studer-hybrid' },
          { label: 'Hybrid Projects', href: '/projects?category=hybrid-power' },
        ],
      },
      {
        label: 'Maintain',
        href: '/#maintain',
        meta_json: { kind: 'column' },
        children: [
          { label: 'Field Commissioning', href: '/services?category=field-services' },
          { label: 'UPS Repair Support', href: '/services?category=ups-repair' },
          { label: 'UPS Rental', href: '/services?category=ups-rental' },
          { label: 'Solar O&M', href: '/services?category=solar-om' },
        ],
      },
      {
        label: 'EV Charging',
        href: '/#ev-charging',
        meta_json: { kind: 'column' },
        children: [
          { label: 'EV Infrastructure', href: '/products?category=ev-charging' },
          { label: 'Smart Charging', href: '/products?category=ev-charging&tag=Smart' },
          { label: 'Solar + BESS + EV', href: '/products?category=ev-charging&tag=Solar' },
        ],
      },
      {
        label: 'Engineering',
        href: '/#engineering-design',
        meta_json: { kind: 'column' },
        children: [
          { label: 'Design & Development', href: '/services?category=engineering-design' },
          { label: 'Electrical Engineering', href: '/services?category=engineering-design&tag=EPLAN' },
          { label: 'Project Support', href: '/services?category=field-services' },
        ],
      },
    ],
  },
  { label: 'Industries', href: '/industries' },
  { label: 'Projects', href: '/projects' },
  { label: 'Products', href: '/products' },
  { label: 'Services', href: '/services' },
  { label: 'Resources', href: '/resources' },
  { label: 'Contact', href: '/contact#contact-form' },
];

export const FOOTER_NAV_SEED: NavSeedNode[] = [
  {
    label: 'Company',
    meta_json: { kind: 'column' },
    children: [
      { label: 'About Zigma', href: '/#why' },
      { label: '20-Year Legacy', href: '/#legacy' },
      { label: 'Careers', href: '/careers' },
      { label: 'Certifications', href: '/certifications' },
      { label: 'Case studies', href: '/projects' },
      { label: 'Industries', href: '/industries' },
      { label: 'Locations', href: '/locations' },
      { label: 'Resources', href: '/resources' },
      { label: 'Press', href: '/press' },
    ],
  },
  {
    label: 'Capabilities',
    meta_json: { kind: 'column' },
    children: [
      { label: 'Solar Solutions', href: '/products?category=solar-solutions' },
      { label: 'UPS Solutions', href: '/products?category=ups-systems' },
      { label: 'BESS Systems', href: '/products?category=bess' },
      { label: 'EV Charging', href: '/products?category=ev-charging' },
      { label: 'AMC & O&M Support', href: '/services?category=ups-amc' },
      { label: 'Design & Engineering', href: '/services?category=engineering-design' },
      { label: 'Service levels', href: '/sla' },
      { label: 'Solution finder', href: '/tools/solution-finder' },
    ],
  },
  {
    label: 'Contact',
    meta_json: { kind: 'column' },
    children: [
      { label: '+91 95901 37444', href: 'tel:+919590137444' },
      { label: 'info@zigma-technologies.com', href: 'mailto:info@zigma-technologies.com' },
      { label: 'Emergency Call: +91 9590137666 →', href: 'tel:+919590137666', meta_json: { className: 'foot-emergency' } },
    ],
  },
];
