import { hasScreenAccess, type AdminScreenKey } from '@/lib/admin-screens';

/** Each tab keeps the permission of the screen whose data it edits. */
export type AdminHubTab<Id extends string> = {
  id: Id;
  label: string;
  /** Any one of several screens opens a tab that edits data from each of them. */
  screen: AdminScreenKey | readonly AdminScreenKey[];
  description: string;
  /** Tabs naming the same editor share its state, so switching between them keeps edits without asking. */
  editor?: string;
};

export const HEADER_FOOTER_TABS = [
  {
    id: 'menus',
    label: 'Menus',
    screen: 'nav',
    description: 'Header mega-menu and footer link columns. Each change saves immediately.',
  },
  {
    id: 'header',
    label: 'Header',
    screen: 'siteSettings',
    description: 'Logo size and type, menu style and fonts, the Request Consultation and Talk to us buttons, sticky and floating CTAs.',
  },
  {
    id: 'footer',
    label: 'Footer',
    screen: 'siteSettings',
    description: 'Footer brand column, office block, copyright, powered-by credit and policy links.',
  },
  {
    id: 'labels',
    label: 'Labels',
    screen: 'siteCopy',
    description: 'Footer, sticky bar, search box and icon button text.',
  },
] as const satisfies readonly AdminHubTab<string>[];

export const LEADS_TABS = [
  {
    id: 'fields',
    label: 'Form fields',
    screen: 'forms',
    description:
      'The enquiry form behind the Send an Enquiry pop-up, the contact page, product / project enquiry drawers and case-study blocks. Changes apply on the public site immediately.',
  },
  {
    id: 'messages',
    label: 'Pop-up & thank-you',
    screen: 'siteCopy',
    description: 'What visitors read while sending an enquiry and on the page they land on afterwards.',
  },
  {
    id: 'crm',
    label: 'CRM',
    screen: 'siteSettings',
    description: 'Forward new leads to HubSpot, Zoho, Zapier, Make or any webhook as they arrive.',
  },
] as const satisfies readonly AdminHubTab<string>[];

export const SEO_TABS = [
  {
    id: 'defaults',
    label: 'Defaults',
    screen: 'siteSettings',
    description: 'The fallback description and share image for every page that has none of its own.',
  },
  {
    id: 'pages',
    label: 'Page titles',
    screen: 'siteCopy',
    description:
      'Built-in listing, hub, industry, city, tool and language pages. Title 50–60 characters without the brand; description 120–160. Leave a field empty for the automatic text.',
  },
  {
    id: 'redirects',
    label: 'Redirects',
    screen: 'redirects',
    description: 'Send old or retired addresses to their new home with a 301 (permanent) or 302 (temporary).',
  },
] as const satisfies readonly AdminHubTab<string>[];

export const THEME_TABS = [
  {
    id: 'tokens',
    label: 'Colours & layout',
    screen: 'theme',
    editor: 'studio',
    description: 'Brand and neutral colours, section padding and header height. Saved as tokens and live within ~30 seconds.',
  },
  {
    id: 'typography',
    label: 'Typography',
    screen: ['theme', 'siteSettings'],
    description:
      'Type sizes, heading levels and eyebrow sizes — the defaults every page section inherits unless its own editor overrides them.',
  },
  {
    id: 'css',
    label: 'Site CSS',
    screen: 'theme',
    editor: 'studio',
    description: 'The full site stylesheet (globals.css body) with drafts, version history and publish.',
  },
] as const satisfies readonly AdminHubTab<string>[];

/** All Site Copy tabs edit one document, so switching tabs keeps unsaved edits. */
export const SITE_COPY_TABS = [
  {
    id: 'hubs',
    label: 'Hub pages',
    screen: 'siteCopy',
    editor: 'siteCopy',
    description: 'Eyebrow, title, lead, buttons, proof rail and CTA band of the industries, locations, press, SLA and search hubs.',
  },
  {
    id: 'features',
    label: 'Features',
    screen: 'siteCopy',
    editor: 'siteCopy',
    description: 'Switch whole site features on or off: tools, solution finder, search, industries, partner portal, language landings.',
  },
  {
    id: 'heroHeights',
    label: 'Hero height',
    screen: 'siteCopy',
    editor: 'siteCopy',
    description: 'Full-screen or compact heroes on the built-in hub, tool and listing pages.',
  },
  {
    id: 'tools',
    label: 'Tools',
    screen: 'siteCopy',
    editor: 'siteCopy',
    description: 'Headings and CTA band of the solution finder, UPS calculator and solar ROI tools, plus the solution finder needs.',
  },
  {
    id: 'locales',
    label: 'Locales',
    screen: 'siteCopy',
    editor: 'siteCopy',
    description: 'Landing copy for the Hindi (/hi) and Kannada (/kn) pages.',
  },
  {
    id: 'industries',
    label: 'Industries data',
    screen: 'siteCopy',
    editor: 'siteCopy',
    description: 'Advanced: the industry list behind /industries/<key> pages, as JSON. Empty or invalid falls back to the built-in list.',
  },
  {
    id: 'locations',
    label: 'Locations data',
    screen: 'siteCopy',
    editor: 'siteCopy',
    description: 'Advanced: the city list behind /locations/<key> pages, as JSON.',
  },
] as const satisfies readonly AdminHubTab<string>[];

export const BLOG_TABS = [
  {
    id: 'articles',
    label: 'Articles',
    screen: 'resources',
    description: 'Write, preview and publish posts at /blog/<slug>: cover, author, format, key takeaways, tags and SEO.',
  },
  {
    id: 'design',
    label: 'Design',
    screen: 'resources',
    description:
      'Pick the /blog hub design and the article layout, choose what every article shows (contents, progress, share, author, related) and the default author and CTA.',
  },
  {
    id: 'sections',
    label: 'Page sections',
    screen: 'pages',
    description: 'The sections of the /blog page — hero, featured, topics, feed and CTA band. Each one follows the blog design unless it picks its own.',
  },
] as const satisfies readonly AdminHubTab<string>[];

/** Tabbed hub screens: the screen that hosts them and their tabs (for search and deep links). */
export const ADMIN_HUBS: readonly { screen: AdminScreenKey; href: string; tabs: readonly AdminHubTab<string>[] }[] = [
  { screen: 'resources', href: '/admin/resources', tabs: BLOG_TABS },
  { screen: 'nav', href: '/admin/header-footer', tabs: HEADER_FOOTER_TABS },
  { screen: 'forms', href: '/admin/forms', tabs: LEADS_TABS },
  { screen: 'redirects', href: '/admin/seo', tabs: SEO_TABS },
  { screen: 'theme', href: '/admin/theme', tabs: THEME_TABS },
  { screen: 'siteCopy', href: '/admin/site-copy', tabs: SITE_COPY_TABS },
];

export function canOpenHubTab(screens: AdminScreenKey[] | '*', tab: AdminHubTab<string>) {
  const keys = typeof tab.screen === 'string' ? [tab.screen] : tab.screen;
  return keys.some((key) => hasScreenAccess(screens, key));
}

/** The tab ids of a tab list, as a union type. */
export type HubTabId<T extends readonly AdminHubTab<string>[]> = T[number]['id'];
