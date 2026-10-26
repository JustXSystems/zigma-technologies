/**
 * Optional Next inventory helpers — CMS facts for Heal Factory (no SEO scoring).
 * Call from createAgentHandlers({ collectInventory: () => collectNextInventory(...) }).
 */

/**
 * Build a bounded inventory from in-memory agent store + optional page/media lists.
 *
 * @param {{
 *   store?: Map<string, object>,
 *   pages?: Array<object>,
 *   media?: Array<object>,
 *   maxPages?: number,
 *   maxMedia?: number,
 * }} [opts]
 */
export function collectNextInventory(opts = {}) {
  const maxPages = opts.maxPages ?? 50;
  const maxMedia = opts.maxMedia ?? 100;
  const store = opts.store || globalThis.__meridianAgentStore;
  const pages = [];
  const media = [];

  if (Array.isArray(opts.pages)) {
    for (const p of opts.pages) {
      if (!p || typeof p !== 'object') continue;
      let path = String(p.path || '/').trim() || '/';
      if (!path.startsWith('/')) path = `/${path}`;
      pages.push({
        path,
        title: p.title ?? null,
        metaTitle: p.metaTitle ?? p.title ?? null,
        metaDescription: p.metaDescription ?? null,
        h1: p.h1 ?? null,
        excerpt: p.excerpt ?? null,
        canonical: p.canonical ?? null,
        ogTitle: p.ogTitle ?? null,
        ogDescription: p.ogDescription ?? null,
        ogImage: p.ogImage ?? null,
        robots: p.robots ?? null,
        hasJsonLd: p.hasJsonLd === true,
        manualSeo: p.manualSeo === true,
      });
      if (pages.length >= maxPages) break;
    }
  } else if (store instanceof Map) {
    for (const [path, row] of store.entries()) {
      if (!path || path.startsWith('/api') || path.startsWith('/admin')) continue;
      pages.push({
        path,
        title: row.title ?? null,
        metaTitle: row.title ?? null,
        metaDescription: row.description ?? null,
        canonical: row.canonical ?? null,
        ogTitle: row.ogTitle ?? null,
        ogDescription: row.ogDescription ?? null,
        hasJsonLd: !!row.schemaJsonLd,
        manualSeo: false,
      });
      if (pages.length >= maxPages) break;
    }
  }

  if (Array.isArray(opts.media)) {
    for (const m of opts.media) {
      if (!m || typeof m !== 'object') continue;
      if (m.alt && String(m.alt).trim()) continue; // inventory prefers empty-alt gaps
      media.push({
        id: m.id != null ? String(m.id) : null,
        src: m.src ?? null,
        alt: m.alt ? String(m.alt) : null,
        filename: m.filename ?? null,
        contextTitle: m.contextTitle ?? null,
        role: m.role ?? null,
        width: m.width ?? null,
        height: m.height ?? null,
        onPaths: Array.isArray(m.onPaths) ? m.onPaths.slice(0, 8) : [],
      });
      if (media.length >= maxMedia) break;
    }
  }

  return {
    cursor: new Date().toISOString(),
    pages,
    media,
  };
}
