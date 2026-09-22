import type { FooterColumn } from '@/lib/nav-tree';

/** Fallback when no footer rows exist in nav_items (location = footer). */
export const DEFAULT_FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: 'Company',
    links: [
      { label: 'About Zigma', href: '/#why' },
      { label: '20-Year Legacy', href: '/#legacy' },
      { label: 'Careers', href: '/careers' },
      { label: 'Certifications', href: '/certifications' },
      { label: 'Case studies', href: '/projects' },
      { label: 'Industries', href: '/industries' },
      { label: 'Locations', href: '/locations' },
      { label: 'Press', href: '/press' },
    ],
  },
  {
    heading: 'Capabilities',
    links: [
      { label: 'Solar Solutions', href: '/products?category=solar-solutions' },
      { label: 'UPS Solutions', href: '/products?category=ups-systems' },
      { label: 'BESS Systems', href: '/products?category=bess' },
      { label: 'EV Charging', href: '/products?category=ev-charging' },
      { label: 'AMC & O&M Support', href: '/services?category=ups-amc' },
      { label: 'Design & Engineering', href: '/services?category=engineering-design' },
      { label: 'Service levels', href: '/sla' },
    ],
  },
  {
    heading: 'Contact',
    links: [
      { label: '+91 95901 37444', href: 'tel:+919590137444' },
      { label: 'info@zigma-technologies.com', href: 'mailto:info@zigma-technologies.com' },
      {
        label: 'Emergency Call: +91 9590137666 →',
        href: 'tel:+919590137666',
        className: 'foot-emergency',
      },
    ],
  },
];
