'use client';

import AdminHub from '@/components/admin/AdminHub';
import { SEO_TABS } from '@/lib/admin-hub-tabs';
import SiteSettingsEditor from '@/components/admin/site-settings/SiteSettingsEditor';
import { AdminLink } from '@/components/admin/unsaved-changes';
import SeoPageTitlesEditor from './SeoPageTitlesEditor';
import RedirectsEditor from './RedirectsEditor';
import MeridianPanel from './MeridianPanel';

export default function SeoHub({ initialTab }: { initialTab?: string }) {
  return (
    <AdminHub
      title="SEO"
      intro={
        <>
          How the site appears in search and when shared. Use <strong>Meridian</strong> for live verify and the
          consolidated report. CMS pages, catalog items and blog articles have their own SEO fields in{' '}
          <AdminLink href="/admin/pages">Pages</AdminLink>,{' '}
          <AdminLink href="/admin/inventory">Inventory → SEO</AdminLink> and{' '}
          <AdminLink href="/admin/resources">Blog → Articles</AdminLink>.
        </>
      }
      tabs={SEO_TABS}
      initialTab={initialTab}
    >
      {(active) =>
        active === 'meridian' ? (
          <MeridianPanel />
        ) : active === 'defaults' ? (
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
