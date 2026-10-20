/**
 * Catalog SEO steward — save-time heal for Inventory (products / services / projects).
 * Fills empty meta/alt/OG, refreshes Meridian-owned meta when content drifts,
 * never overwrites hand-crafted (manual) titles/descriptions.
 */
import { createHash } from 'node:crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '@/lib/db';
import { ensureCatalogBackgroundColumn } from '@/lib/schema-ensure';
import { toStorageMediaPath } from '@/lib/media-paths';

function plain(s: unknown) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(s: string, max: number) {
  const t = plain(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trim()}…`;
}

export function catalogSeoContentHash(row: {
  title?: string | null;
  summary?: string | null;
  description?: string | null;
  price_label?: string | null;
  slug?: string | null;
  status?: string | null;
}) {
  const raw = [
    plain(row.title),
    plain(row.summary),
    plain(row.description).slice(0, 400),
    plain(row.price_label),
    plain(row.slug),
    plain(row.status),
  ].join('\n');
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

function draftMeta(row: { item_type: string; title: string; summary?: string | null; description?: string | null }) {
  const type = row.item_type;
  const titleBase = plain(row.title);
  const proof = plain(row.summary) || plain(row.description).slice(0, 200);
  let metaTitle = titleBase;
  if (type === 'service') metaTitle = clip(`${titleBase} in India – Reliable Support`, 58);
  else if (type === 'product') {
    metaTitle = clip(titleBase.includes('–') || titleBase.includes('-') ? titleBase : `${titleBase} – Specs & AMC`, 58);
  } else metaTitle = clip(titleBase, 58);

  const cta = ' Get a quote.';
  const metaDescription = proof
    ? clip(proof.replace(/\s*Enquire with Zigma\.?\s*$/i, ''), 160 - cta.length) + cta
    : clip(`${titleBase} from Zigma Technologies — engineering, supply and AMC across India.`, 160 - cta.length) +
      cta;
  return { meta_title: clip(metaTitle, 58), meta_description: clip(metaDescription, 160) };
}

function draftAlt(row: { item_type: string; title: string; kind?: string }) {
  const title = plain(row.title) || 'Zigma Technologies';
  if (row.kind === 'video') return clip(`Video showing ${title}`, 120);
  if (row.item_type === 'project') return clip(`${title} — completed project by Zigma Technologies`, 120);
  if (row.item_type === 'product') return clip(`${title} product photo`, 120);
  if (row.item_type === 'service') return clip(`${title} — Zigma Technologies service`, 120);
  return clip(title, 120);
}

export type CatalogSeoStewardResult = {
  id: number;
  healed: string[];
  skipped: string[];
  metaSource: string | null;
};

/**
 * Heal one catalog item immediately after Admin save / media change.
 */
export async function stewardCatalogItemSeo(
  id: number,
  opts: { forceMeta?: boolean } = {}
): Promise<CatalogSeoStewardResult | null> {
  await ensureCatalogBackgroundColumn();

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, item_type, slug, title, summary, description, price_label, status,
            meta_title, meta_description, og_image_url, seo_noindex,
            seo_meta_source, seo_content_hash, seo_dirty, enabled
     FROM catalog_items WHERE id = ? LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;

  const healed: string[] = [];
  const skipped: string[] = [];
  const hash = catalogSeoContentHash({
    title: row.title as string,
    summary: row.summary as string | null,
    description: row.description as string | null,
    price_label: row.price_label as string | null,
    slug: row.slug as string,
    status: row.status as string | null,
  });
  const source = String(row.seo_meta_source || '').toLowerCase() || null;
  const hasTitle = plain(row.meta_title).length >= 15;
  const hasDesc = plain(row.meta_description).length >= 50;
  const isManual = source === 'manual';
  const isMeridian = source === 'meridian';
  const dirty = !!Number(row.seo_dirty);
  const hashDrift = !!row.seo_content_hash && row.seo_content_hash !== hash;
  const published = row.enabled && (row.status === 'published' || row.status === 'live' || !row.status);

  let nextTitle = row.meta_title as string | null;
  let nextDesc = row.meta_description as string | null;
  let nextSource = source;
  let wroteMeta = false;

  const mayRefresh =
    opts.forceMeta === true ||
    !hasTitle ||
    !hasDesc ||
    (isMeridian && (dirty || hashDrift)) ||
    (!source && (!hasTitle || !hasDesc));

  if (mayRefresh && !isManual) {
    const d = draftMeta(row as { item_type: string; title: string; summary?: string | null; description?: string | null });
    if (!hasTitle || (isMeridian && (dirty || hashDrift)) || opts.forceMeta) {
      nextTitle = d.meta_title;
      wroteMeta = true;
      healed.push(hasTitle ? 'meta_title_refresh' : 'meta_title_fill');
    }
    if (!hasDesc || (isMeridian && (dirty || hashDrift)) || opts.forceMeta) {
      nextDesc = d.meta_description;
      wroteMeta = true;
      healed.push(hasDesc ? 'meta_description_refresh' : 'meta_description_fill');
    }
    if (wroteMeta) nextSource = 'meridian';
  } else if (isManual) {
    skipped.push('manual_meta_preserved');
  } else if (!source && hasTitle && hasDesc) {
    // Grandfather hand-filled SEO as manual so future stewards do not overwrite.
    nextSource = 'manual';
    healed.push('meta_source_grandfather_manual');
  }

  // OG from primary media when empty
  let nextOg = row.og_image_url as string | null;
  if (!plain(nextOg)) {
    const [media] = await pool.query<RowDataPacket[]>(
      `SELECT url FROM catalog_media
       WHERE item_id = ? AND kind != 'video'
       ORDER BY is_primary DESC, sort_order ASC, id ASC LIMIT 1`,
      [id]
    );
    if (media[0]?.url) {
      nextOg = toStorageMediaPath(String(media[0].url));
      healed.push('og_image_sync');
    }
  }

  // Fill empty media alts
  const [alts] = await pool.query<RowDataPacket[]>(
    `SELECT id, kind, alt FROM catalog_media
     WHERE item_id = ? AND (alt IS NULL OR CHAR_LENGTH(TRIM(alt)) < 8)
     LIMIT 40`,
    [id]
  );
  for (const m of alts) {
    const alt = draftAlt({
      item_type: String(row.item_type),
      title: String(row.title),
      kind: String(m.kind || 'image'),
    });
    await pool.query('UPDATE catalog_media SET alt = ? WHERE id = ?', [alt.slice(0, 255), m.id]);
    healed.push(`alt_${m.id}`);
  }

  await pool.query(
    `UPDATE catalog_items SET
       meta_title = ?,
       meta_description = ?,
       og_image_url = ?,
       seo_meta_source = ?,
       seo_content_hash = ?,
       seo_dirty = 0,
       seo_steward_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      nextTitle,
      nextDesc,
      nextOg,
      nextSource,
      hash,
      id,
    ]
  );

  if (!published) skipped.push('not_published');

  return {
    id,
    healed,
    skipped,
    metaSource: nextSource,
  };
}

/** Mark item dirty so the next steward pass refreshes Meridian-owned meta. */
export async function markCatalogSeoDirty(id: number): Promise<void> {
  try {
    await ensureCatalogBackgroundColumn();
    await pool.query(`UPDATE catalog_items SET seo_dirty = 1 WHERE id = ?`, [id]);
  } catch {
    /* columns may not exist yet on first boot — ensureCatalogBackgroundColumn handles DDL */
  }
}

export async function setCatalogSeoMetaSource(id: number, source: 'manual' | 'meridian'): Promise<void> {
  try {
    await ensureCatalogBackgroundColumn();
    await pool.query(`UPDATE catalog_items SET seo_meta_source = ? WHERE id = ?`, [source, id]);
  } catch {
    /* ignore */
  }
}

/** Soft-fail wrapper for API routes — never block Admin saves on steward errors. */
export async function stewardCatalogItemSeoSafe(id: number): Promise<void> {
  try {
    await stewardCatalogItemSeo(id);
  } catch (e) {
    console.warn('[catalog-seo-steward]', id, e instanceof Error ? e.message : e);
  }
}

/** Used by transfer / bulk paths */
export async function stewardCatalogItemsSeo(ids: number[]): Promise<ResultSetHeader | null> {
  for (const id of ids) {
    await stewardCatalogItemSeoSafe(id);
  }
  return null;
}
