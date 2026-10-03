'use client';

import AdminHub, { type AdminHubTab } from '@/components/admin/AdminHub';
import SiteSettingsEditor from '@/components/admin/site-settings/SiteSettingsEditor';
import { AdminLink } from '@/components/admin/unsaved-changes';
import SeoPageTitlesEditor from './SeoPageTitlesEditor';
import RedirectsEditor from './RedirectsEditor';

type Tab = 'defaults' | 'pages' | 'redirects';

const TABS: readonly AdminHubTab<Tab>[] = [
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
];

export default function SeoHub({ initialTab }: { initialTab?: string }) {
  return (
    <AdminHub
      title="SEO"
      intro={
        <>
          How the site appears in search and when shared. CMS pages, catalog items and resources have their own SEO
          fields in <AdminLink href="/admin/pages">Pages</AdminLink>,{' '}
          <AdminLink href="/admin/inventory">Inventory → SEO</AdminLink> and{' '}
          <AdminLink href="/admin/resources">Resources</AdminLink>.
        </>
      }
      tabs={TABS}
      initialTab={initialTab}
    >
      {(active) =>
        active === 'defaults' ? (
          <SiteSettingsEditor group="seo" />
        ) : active === 'pages' ? (
          <SeoPageTitlesEditor />
        ) : (
          <RedirectsEditor />
        )
      }
    </AdminHub>
  );
}
