'use client';

import { useEffect } from 'react';
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '@/lib/site-settings';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function applyDocumentSeo(input: {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  siteName?: string | null;
}) {
  if (input.title) document.title = input.title;
  if (input.description) upsertMeta('name', 'description', input.description);
  if (input.title) upsertMeta('property', 'og:title', input.title);
  if (input.description) upsertMeta('property', 'og:description', input.description);
  if (input.image) {
    const abs = input.image.startsWith('http')
      ? input.image
      : `${window.location.origin}${input.image.startsWith('/') ? '' : '/'}${input.image}`;
    upsertMeta('property', 'og:image', abs);
    upsertMeta('name', 'twitter:image', abs);
  }
  if (input.siteName) upsertMeta('property', 'og:site_name', input.siteName);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('name', 'twitter:card', 'summary_large_image');
}

/** Applies global site SEO defaults once on public pages. */
export default function SiteSeo() {
  useEffect(() => {
    fetch('/api/public/site-settings')
      .then(async (r) => {
        const data = await r.json();
        const settings = (data.settings || DEFAULT_SITE_SETTINGS) as SiteSettings;
        applyDocumentSeo({
          title: document.title || settings.companyName,
          description: settings.defaultMetaDescription,
          image: settings.ogImage,
          siteName: settings.companyName,
        });
      })
      .catch(() => undefined);
  }, []);

  return null;
}
