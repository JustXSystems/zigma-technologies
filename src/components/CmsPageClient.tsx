'use client';

import { useEffect, useState } from 'react';
import SectionRenderer from '@/components/sections/SectionRenderer';
import type { CmsSection } from '@/lib/cms-types';
import { applyDocumentSeo } from '@/components/SiteSeo';

type Props = {
  slug: string;
};

export default function CmsPageClient({ slug }: Props) {
  const [sections, setSections] = useState<CmsSection[] | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [source, setSource] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPreview = params.get('preview') === '1';
    const token = params.get('token') || '';
    setPreview(isPreview);

    const qs = isPreview ? `?preview=1&token=${encodeURIComponent(token)}` : '';

    Promise.all([
      fetch(`/api/public/pages/${slug}${qs}`).then(async (r) => ({ r, data: await r.json() })),
      fetch('/api/public/site-settings')
        .then(async (r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([pageRes, siteData]) => {
        const { r, data } = pageRes;
        if (!r.ok) throw new Error(data.error || 'Failed to load page');
        setSections(data.page.sections || []);
        setSource(data.source || '');
        setPreview(!!data.preview);

        const settings = siteData?.settings;
        const title = data.page.meta_title || data.page.title || settings?.companyName;
        const description = data.page.meta_description || settings?.defaultMetaDescription;
        applyDocumentSeo({
          title,
          description,
          image: settings?.ogImage,
          siteName: settings?.companyName,
        });
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    if (!sections) return;
    const hero = sections.find((s) => s.type === 'page_hero' && s.enabled);
    const bodyClass = String((hero?.content_json as { bodyClass?: string })?.bodyClass || '');
    if (!bodyClass) return;
    document.body.classList.add(bodyClass);
    return () => document.body.classList.remove(bodyClass);
  }, [sections]);

  if (error) {
    return (
      <main id="main-content" className="section">
        <div className="container">
          <p style={{ color: 'var(--orange-dim)' }}>{error}</p>
        </div>
      </main>
    );
  }

  if (!sections) {
    return (
      <main id="main-content" className="section">
        <div className="container">
          <p>Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <>
      {preview ? (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2000,
            background: '#FF6B1A',
            color: '#0A1628',
            padding: '0.55rem 1rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          Preview mode{source ? ` · ${source}` : ''} · draft / disabled sections may appear · link expires in 12h
        </div>
      ) : null}
      <div style={preview ? { paddingTop: '2.2rem' } : undefined}>
        <SectionRenderer sections={sections} />
      </div>
    </>
  );
}
