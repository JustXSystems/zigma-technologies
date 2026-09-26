'use client';

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

/**
 * Admin draft preview only. Public metadata must come from `generateMetadata`
 * so crawlers see a single version of the head.
 */
export function applyDocumentSeo(input: { title?: string | null; description?: string | null }) {
  if (input.title) document.title = input.title;
  if (input.description) upsertMeta('name', 'description', input.description);
}
