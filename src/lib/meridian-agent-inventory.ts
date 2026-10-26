/**
 * Bounded CMS inventory for Meridian SaaS Heal Factory.
 * Sensor-only — no SEO scoring on the client.
 * Wired from storage/ops/zigma-agent helpers (MySQL pages / catalog / media_assets).
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

/**
 * Collect pages + empty-alt media from MySQL for Product Agent heartbeat.
 */
export async function collectZigmaAgentInventory() {
  const pages: PageRow[] = [];
  const media: MediaRow[] = [];

  try {
    let pageRows: unknown;
    try {
      [pageRows] = await pool.query(
        `SELECT slug, title, meta_title, meta_description, seo_meta_source
         FROM pages WHERE enabled = 1 ORDER BY updated_at DESC LIMIT 40`
      );
    } catch {
      [pageRows] = await pool.query(
        `SELECT slug, title, meta_title, meta_description
         FROM pages WHERE enabled = 1 ORDER BY updated_at DESC LIMIT 40`
      );
    }
    for (const r of (pageRows as {
      slug: string;
      title: string;
      meta_title: string | null;
      meta_description: string | null;
      seo_meta_source?: string | null;
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
    let catRows: unknown;
    try {
      [catRows] = await pool.query(
        `SELECT item_type, slug, title, meta_title, meta_description, summary, seo_meta_source
         FROM catalog_items WHERE enabled = 1 ORDER BY updated_at DESC LIMIT 30`
      );
    } catch {
      [catRows] = await pool.query(
        `SELECT item_type, slug, title, meta_title, meta_description, summary
         FROM catalog_items WHERE enabled = 1 ORDER BY updated_at DESC LIMIT 30`
      );
    }
    for (const r of (catRows as {
      item_type: string;
      slug: string;
      title: string;
      meta_title: string | null;
      meta_description: string | null;
      summary: string | null;
      seo_meta_source?: string | null;
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

  let mediaStats: {
    total: number;
    withAlt: number;
    emptyAlt: number;
    videosSkipped: number;
  } | null = null;

  try {
    const [statsRows] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN alt IS NOT NULL AND TRIM(alt) <> '' THEN 1 ELSE 0 END) AS with_alt,
         SUM(CASE WHEN alt IS NULL OR TRIM(alt) = '' THEN 1 ELSE 0 END) AS empty_alt,
         SUM(CASE WHEN path REGEXP '\\\\.(mp4|webm|mov|avi|mkv|m4v)(\\\\?|$)' THEN 1 ELSE 0 END) AS videos
       FROM media_assets`
    );
    const s = ((statsRows as { total?: number; with_alt?: number; empty_alt?: number; videos?: number }[]) ||
      [])[0] || {};
    mediaStats = {
      total: Number(s.total || 0),
      withAlt: Number(s.with_alt || 0),
      emptyAlt: Number(s.empty_alt || 0),
      videosSkipped: Number(s.videos || 0),
    };
  } catch {
    mediaStats = null;
  }

  try {
    const [atts] = await pool.query(
      `SELECT id, path, original_name, alt
       FROM media_assets
       WHERE (alt IS NULL OR TRIM(alt) = '')
         AND path NOT REGEXP '\\\\.(mp4|webm|mov|avi|mkv|m4v)(\\\\?|$)'
       ORDER BY
         (CASE
            WHEN original_name REGEXP '[A-Za-z]{3,}[-_ ][A-Za-z]{3,}' THEN 0
            WHEN path REGEXP '[A-Za-z]{3,}[-_][A-Za-z]{3,}' THEN 1
            ELSE 2
          END),
         id DESC
       LIMIT 120`
    );
    for (const r of (atts as {
      id: number;
      path: string;
      original_name: string | null;
      alt: string | null;
    }[]) || []) {
      media.push({
        id: String(r.id),
        src: r.path || null,
        alt: null,
        filename: r.original_name || null,
        contextTitle: null,
        onPaths: r.path ? [String(r.path).split('?')[0]] : [],
      });
    }
  } catch {
    try {
      const [atts] = await pool.query(
        `SELECT id, path, original_name, alt FROM media_assets
         WHERE alt IS NULL OR TRIM(alt) = ''
         ORDER BY id DESC LIMIT 80`
      );
      for (const r of (atts as {
        id: number;
        path: string;
        original_name: string | null;
      }[]) || []) {
        if (/\.(mp4|webm|mov|avi|mkv|m4v)(\?|$)/i.test(String(r.path || ''))) continue;
        media.push({
          id: String(r.id),
          src: r.path || null,
          alt: null,
          filename: r.original_name || null,
          contextTitle: null,
          onPaths: r.path ? [String(r.path).split('?')[0]] : [],
        });
      }
    } catch {
      /* media_assets optional */
    }
  }

  // Catalog-linked empty alts (product/project/service galleries)
  if (media.length < 100) {
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
        if (media.length >= 100) break;
        const seg =
          r.item_type === 'product' ? 'products' : r.item_type === 'project' ? 'projects' : 'services';
        const filename = (r.url || '').split('/').pop() || null;
        media.push({
          id: `catalog:${r.id}`,
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
  }

  return {
    cursor: new Date().toISOString(),
    pages: pages.slice(0, 50),
    media: media.slice(0, 100),
    meta: {
      cms: 'next',
      mediaStats,
      mediaFeed: 'empty-alt-only',
    },
  };
}

/** @deprecated Prefer collectZigmaAgentInventory */
export const collectMeridianAgentInventory = collectZigmaAgentInventory;

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
