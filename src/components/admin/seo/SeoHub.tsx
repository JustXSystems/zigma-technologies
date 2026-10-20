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
          <strong>On-page SEO</strong> lives in the website (titles, sitemap, schema). <strong>Meridian</strong> is
          the separate control plane for GSC/Bing reports — run via GitHub Actions when possible so Production
          deploys stay clean. Edit page SEO in <AdminLink href="/admin/pages">Pages</AdminLink>,{' '}
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
