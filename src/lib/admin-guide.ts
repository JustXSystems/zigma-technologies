import {
  GUIDE_MODULE_DETAILS,
  type GuideModuleDetail,
} from '@/lib/admin-guide-modules';

export type GuideSection = {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
};

export type GuideStep = {
  title: string;
  detail: string;
  href?: string;
};

export type GuideWorkflow = {
  title: string;
  purpose: string;
  steps: string[];
  href?: string;
};

export type GuideFlow = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
};

export type GuideArchitectureLayer = {
  label: string;
  items: string[];
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'content',
    eyebrow: 'Content layer',
    title: 'Pages, catalog & editorial',
    lead: 'What visitors read and browse — homepage sections, case studies, guides, press, and testimonials.',
  },
  {
    id: 'configuration',
    eyebrow: 'Configuration layer',
    title: 'Brand, copy & navigation',
    lead: 'Global identity, marketing chrome, menus, and visual theme — no code deploy required.',
  },
  {
    id: 'leads',
    eyebrow: 'Lead layer',
    title: 'Enquiries, forms & newsletter',
    lead: 'Capture, triage, notify, and export inbound interest from every public touchpoint.',
  },
  {
    id: 'media-seo',
    eyebrow: 'Asset layer',
    title: 'Media, redirects & preview',
    lead: 'Central assets, URL preservation, and safe draft review before publish.',
  },
  {
    id: 'operations',
    eyebrow: 'Operations layer',
    title: 'Dashboard & health',
    lead: 'Operational overview and first-run checklist.',
  },
  {
    id: 'advanced',
    eyebrow: 'Platform layer',
    title: 'Partners, users & growth',
    lead: 'Team access, dealer portal, and public growth surfaces gated by Site Copy flags.',
  },
];

export const GUIDE_QUICK_START: GuideStep[] = [
  {
    title: 'Apply schema & configure environment',
    detail: 'Run scripts/schema.sql (+ migrations). Set DB_*, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD in .env. Optional: SMTP_*, PREVIEW_SECRET, NEXT_PUBLIC_SITE_URL.',
  },
  {
    title: 'Sign in & seed admin',
    detail: 'Open /admin/login → Seed default admin on first run → sign in.',
    href: '/admin/login',
  },
  {
    title: 'Bootstrap core content',
    detail: 'Dashboard → Bootstrap missing seeds (admin). Or seed Pages, Navigation, Inventory individually.',
    href: '/admin',
  },
  {
    title: 'Configure site identity',
    detail: 'Site Settings: company name, logo, phones, emails, footer links, enquiry notify.',
    href: '/admin/site-settings',
  },
  {
    title: 'Review navigation & publish catalog',
    detail: 'Navigation → seed header/footer. Inventory → publish items. Catalog Settings → tune listing UX.',
    href: '/admin/nav',
  },
  {
    title: 'Verify public site & lead path',
    detail: 'View site → submit test enquiry → confirm row in Enquiries. Enable SMTP for email alerts.',
    href: '/admin/enquiries',
  },
];

export const GUIDE_ARCHITECTURE: GuideArchitectureLayer[] = [
  {
    label: 'Edge & auth',
    items: [
      'src/proxy.ts — admin cookie gate, redirects, resume URL block',
      'JWT session cookie zigma_admin_session (7 days)',
      'Roles: admin | editor in admin_users',
    ],
  },
  {
    label: 'Route groups',
    items: [
      '(admin)/admin/* — control portal, sidebar shell',
      '(site)/* — public marketing site with Header/Footer',
      'api/admin/* — protected CRUD + seeds',
      'api/public/* — read + form submit (honeypot, rate limit)',
    ],
  },
  {
    label: 'Relational content (MySQL)',
    items: [
      'pages + page_sections — CMS',
      'catalog_items + catalog_media + catalog_page_settings — inventory',
      'nav_items, enquiries, form_fields, resource_posts, press_posts',
      'redirects, media_assets, css_overrides, admin_users',
    ],
  },
  {
    label: 'Key-value config (theme_settings)',
    items: [
      'site — Site Settings (identity, analytics, CRM, SLA)',
      'site_copy — marketing strings + feature flags',
      'industries, locations — hub JSON',
      'tokens — Theme Studio design tokens',
    ],
  },
  {
    label: 'Public delivery',
    items: [
      'Server components + client islands (catalog, CMS)',
      '/api/public/theme.css — tokens + published CSS',
      'Sitemap, robots, JSON-LD from site settings + page SEO',
    ],
  },
];

export const GUIDE_FLOWS: GuideFlow[] = [
  {
    id: 'enquiry',
    title: 'Visitor form → enquiry → notification',
    summary: 'Contact, catalog, careers, and callback submissions land in one inbox with optional email and CRM push.',
    steps: [
      'Visitor submits public form (honeypot + rate limit + optional Turnstile)',
      'POST /api/public/enquiries (or careers/apply, callback)',
      'Row inserted in enquiries with payload_json and source',
      'If SMTP + Site Settings notify enabled → staff email + optional visitor auto-reply',
      'If crmWebhookUrl set → lead pushed with score',
      'Admin triages at /admin/enquiries → notes → status closed',
    ],
  },
  {
    id: 'cms-page',
    title: 'CMS page → public render',
    summary: 'Published pages and sections render via public API; preview mode bypasses publish gate with signed token.',
    steps: [
      'Editor saves page + sections in /admin/pages',
      'Public route / or /{slug} loads CmsPageClient',
      'GET /api/public/pages/[slug] returns published sections',
      'SectionRenderer maps section types to React components',
      'Preview: ?preview=1&token=… includes drafts/disabled sections',
    ],
  },
  {
    id: 'catalog',
    title: 'Inventory → listing → case study',
    summary: 'One inventory record drives catalog card, modal, and full case study page.',
    steps: [
      'Editor publishes catalog_item in /admin/inventory',
      'Catalog Settings control listing layout at /projects|products|services',
      'GET /api/public/catalog/[type] returns items + settings',
      'Card click → quick modal or full page at /{type}/{slug}',
      'Case study layout uses case_study_json + media gallery + enquiry form',
    ],
  },
  {
    id: 'white-label',
    title: 'White-label client onboarding',
    summary: 'Clone a filled CMS to a new environment and rebrand without rebuilding from scratch.',
    steps: [
      'Source: npm run db:export (optionally --with-cms-media)',
      'Target: deploy code, configure .env, npm run db:import -- … --force',
      '/admin/new-client → brand wizard + Site Copy reset',
      '/admin/theme → tokens and CSS',
      '/admin/site-copy → feature flags, industries, locales',
      'Replace logo/media; change passwords; disable demo content if needed',
    ],
  },
];

export const GUIDE_WORKFLOWS: GuideWorkflow[] = [
  {
    title: 'First-time go-live',
    purpose: 'Take a fresh schema install to a reviewable public site.',
    steps: [
      'schema.sql + migrations → dev server → seed admin',
      'Dashboard bootstrap (or individual seeds)',
      'Site Settings: real company details + notify emails',
      'Navigation seed → verify header/footer',
      'Inventory seed → publish key items → Catalog Settings',
      'Test enquiry + optional SMTP',
    ],
    href: '/admin',
  },
  {
    title: 'Edit homepage',
    purpose: 'Update marketing story without code deploy.',
    steps: [
      'Pages → Home → edit/reorder sections',
      'Use media picker; Preview signed link',
      'Publish page when approved',
    ],
    href: '/admin/pages',
  },
  {
    title: 'Publish a case study',
    purpose: 'Turn an inventory item into a premium public profile.',
    steps: [
      'Inventory → create/seed item',
      'Fill case study block + media gallery (★ thumbnail)',
      'Status Published + Featured if needed',
      'Verify /projects|products|services/{slug}',
    ],
    href: '/admin/inventory',
  },
  {
    title: 'Handle a lead',
    purpose: 'Triage inbound interest through to closure.',
    steps: [
      'Enquiries → filter New',
      'Review payload; download resume if careers',
      'Add notes; set In progress → Closed',
      'Export CSV for CRM if needed',
    ],
    href: '/admin/enquiries',
  },
  {
    title: 'Preview before publish',
    purpose: 'Share draft CMS content safely.',
    steps: [
      'Pages → open page → Preview',
      'Share 12h signed URL with stakeholder',
      'Publish when approved',
    ],
    href: '/admin/pages',
  },
  {
    title: 'Re-seed without duplicates',
    purpose: 'Reload sample content cleanly.',
    steps: [
      'Delete existing rows (Clear sections, Clear nav, Delete all {type}s)',
      'Run matching Seed button',
      'Dashboard checklist confirms complete',
    ],
    href: '/admin',
  },
  {
    title: 'Clone environment',
    purpose: 'Move CMS content between dev, UAT, and prod.',
    steps: [
      'Source: npm run db:export',
      'Copy export folder to target server',
      'Target: npm run db:import -- path --force',
      'Rotate admin passwords; verify .env',
    ],
  },
  {
    title: 'Migrate to Hostinger (PROD)',
    purpose: 'Move www.zigma-technologies.com from UrbanVendo to Hostinger VPS.',
    steps: [
      'Buy KVM 2 VPS; provision Node 20, PM2, Nginx, MySQL',
      'Deploy UAT → QA sign-off at uat.zigma-technologies.com',
      'Deploy PROD with unique secrets; import CMS export',
      'Update BigRock A records (@ + www) → Hostinger IP',
      'Validate, monitor logs, decommission old host after 7–14 days',
    ],
    href: '/admin/guide/migration',
  },
  {
    title: 'Migrate company email (keep @zigma-technologies.com)',
    purpose: 'Leave Roundcube/UrbanVendo mail for Google Workspace (default) or Zoho/Microsoft before Sep 2026 renewal.',
    steps: [
      'Inventory 60+ IDs; licence ~70 Google Workspace Starter seats now, grow to 150',
      'Verify domain with TXT only — do not change MX yet',
      'IMAP-copy mailboxes into Gmail in batches while Roundcube still receives',
      'Cut over MX + SPF/DKIM/DMARC to Google; update site SMTP_* (smtp.gmail.com)',
      'Reconfigure phones/Outlook if needed; cancel UrbanVendo mail plan after 7 stable days',
    ],
    href: '/admin/guide/email',
  },
  {
    title: 'Onboard white-label client',
    purpose: 'Rebrand template for a similar vertical client.',
    steps: [
      'db:import snapshot on target',
      'New Client wizard',
      'Theme Studio + Site Copy',
      'Replace assets; toggle feature flags',
    ],
    href: '/admin/new-client',
  },
];

export const GUIDE_ROLES: Array<{ area: string; editor: boolean; admin: boolean }> = [
  { area: 'Dashboard (view stats)', editor: true, admin: true },
  { area: 'Dashboard bootstrap', editor: false, admin: true },
  { area: 'Pages, Inventory, Catalog Settings', editor: true, admin: true },
  { area: 'Resources, Press, Testimonials', editor: true, admin: true },
  { area: 'Enquiries, Enquiry Forms', editor: true, admin: true },
  { area: 'Navigation, Site Settings, Media', editor: true, admin: true },
  { area: 'Account (own password)', editor: true, admin: true },
  { area: 'Site Copy (write), Theme Studio (write/publish)', editor: false, admin: true },
  { area: 'New Client, Newsletter, Redirects, Partners, Users', editor: false, admin: true },
];

export function modulesForSection(sectionId: string): GuideModuleDetail[] {
  return GUIDE_MODULE_DETAILS.filter((m) => m.sectionId === sectionId);
}

export type { GuideModuleDetail };
export { GUIDE_MODULE_DETAILS };
