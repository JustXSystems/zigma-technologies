'use client';

import AdminHub from '@/components/admin/AdminHub';
import { AdminLink } from '@/components/admin/unsaved-changes';
import { BLOG_TABS } from '@/lib/admin-hub-tabs';
import BlogArticles from './BlogArticles';
import BlogDesign from './BlogDesign';
import BlogPageSections from './BlogPageSections';

/** Everything about the blog in one place: articles, the chosen designs and the /blog page sections. */
export default function BlogHub({ initialTab, initialPost }: { initialTab?: string; initialPost?: string }) {
  return (
    <AdminHub
      title="Blog"
      intro={
        <>
          Write articles, pick how /blog and every article look, and edit the /blog page sections. Articles publish at{' '}
          <code>/blog/&lt;slug&gt;</code>; old <code>/resources</code> links redirect there. The blog&rsquo;s Google title is set on the page
          itself (Page sections → Page title &amp; SEO); site-wide fallbacks are in <AdminLink href="/admin/seo">SEO</AdminLink>.
        </>
      }
      tabs={BLOG_TABS}
      initialTab={initialTab}
    >
      {(active) => (
        <>
          {active === 'articles' ? <BlogArticles initialPost={initialPost} /> : null}
          {active === 'design' ? <BlogDesign /> : null}
          {active === 'sections' ? <BlogPageSections /> : null}
        </>
      )}
    </AdminHub>
  );
}
