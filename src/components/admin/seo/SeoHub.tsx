'use client';

import AdminHub from '@/components/admin/AdminHub';
import { SEO_TABS } from '@/lib/admin-hub-tabs';
import SiteSettingsEditor from '@/components/admin/site-settings/SiteSettingsEditor';
import { AdminLink } from '@/components/admin/unsaved-changes';
import SeoPageTitlesEditor from './SeoPageTitlesEditor';
import RedirectsEditor from './RedirectsEditor';

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
      tabs={SEO_TABS}
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
