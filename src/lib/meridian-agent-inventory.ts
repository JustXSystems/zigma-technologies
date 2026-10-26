/**
 * Bounded CMS inventory for Meridian SaaS Heal Factory.
 * Sensor-only — no SEO scoring on the client.
 */
import pool from '@/lib/db';

type PageRow = {
  path: string;
  title: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  h1: string | null;
  excerpt: string | null;
  manualSeo: boolean;
};

type MediaRow = {
  id: string;
  src: string | null;
  alt: string | null;
  filename: string | null;
  contextTitle: string | null;
  onPaths: string[];
};

function clip(s: unknown, max: number) {
  const t = String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export async function collectMeridianAgentInventory() {
  const pages: PageRow[] = [];
  const media: MediaRow[] = [];

  try {
    const [pageRows] = await pool.query(
      `SELECT slug, title, meta_title, meta_description, seo_meta_source
       FROM pages
       WHERE enabled = 1
       ORDER BY updated_at DESC
       LIMIT 40`
    );
    for (const r of (pageRows as {
      slug: string;
      title: string;
      meta_title: string | null;
      meta_description: string | null;
      seo_meta_source: string | null;
    }[]) || []) {
      const slug = String(r.slug || '').trim();
      if (!slug) continue;
      const path = slug === 'home' ? '/' : `/${slug}`;
      pages.push({
        path,
        title: clip(r.title, 200) || null,
        metaTitle: clip(r.meta_title, 120) || null,
        metaDescription: clip(r.meta_description, 320) || null,
        h1: null,
        excerpt: null,
        manualSeo: String(r.seo_meta_source || '') === 'manual',
      });
    }
  } catch {
    /* pages table shape may differ */
  }

  try {
    const [catRows] = await pool.query(
      `SELECT item_type, slug, title, meta_title, meta_description, summary, seo_meta_source
       FROM catalog_items
       WHERE enabled = 1
       ORDER BY updated_at DESC
       LIMIT 30`
    );
    for (const r of (catRows as {
      item_type: string;
      slug: string;
      title: string;
      meta_title: string | null;
      meta_description: string | null;
      summary: string | null;
      seo_meta_source: string | null;
    }[]) || []) {
      const seg =
        r.item_type === 'product' ? 'products' : r.item_type === 'project' ? 'projects' : 'services';
      pages.push({
        path: `/${seg}/${r.slug}`,
        title: clip(r.title, 200) || null,
        metaTitle: clip(r.meta_title, 120) || null,
        metaDescription: clip(r.meta_description, 320) || null,
        h1: clip(r.title, 200) || null,
        excerpt: clip(r.summary, 400) || null,
        manualSeo: String(r.seo_meta_source || '') === 'manual',
      });
    }
  } catch {
    /* ignore */
  }

  try {
    const [mediaRows] = await pool.query(
      `SELECT m.id, m.url, m.alt, m.kind, c.item_type, c.slug, c.title
       FROM catalog_media m
       JOIN catalog_items c ON c.id = m.item_id
       WHERE c.enabled = 1 AND (m.alt IS NULL OR TRIM(m.alt) = '')
       ORDER BY m.id DESC
       LIMIT 80`
    );
    for (const r of (mediaRows as {
      id: number;
      url: string;
      alt: string | null;
      kind: string;
      item_type: string;
      slug: string;
      title: string;
    }[]) || []) {
      const seg =
        r.item_type === 'product' ? 'products' : r.item_type === 'project' ? 'projects' : 'services';
      const filename = (r.url || '').split('/').pop() || null;
      media.push({
        id: String(r.id),
        src: r.url || null,
        alt: null,
        filename,
        contextTitle: clip(r.title, 200) || null,
        onPaths: [`/${seg}/${r.slug}`],
      });
    }
  } catch {
    /* ignore */
  }

  return {
    cursor: new Date().toISOString(),
    pages: pages.slice(0, 50),
    media: media.slice(0, 100),
  };
}

export const ZIGMA_AGENT_CAPABILITIES = {
  apply: [
    'meta',
    'schema',
    'canonical',
    'sitemap-hint',
    'alt',
    'robots-hint',
    'verify-meta',
    'bing-verify',
    'redirect-hint',
    'indexnow-key',
  ],
  inventory: ['pages', 'media'],
  cms: 'next',
  seoPlugins: [] as string[],
};
