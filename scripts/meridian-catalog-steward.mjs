#!/usr/bin/env node
/**
 * Meridian Catalog Continuum — fleet heal for Inventory (products / services / projects + media).
 *
 * - Fill empty meta / alt / OG
 * - Refresh Meridian-owned meta when content hash drifts or seo_dirty
 * - Preserve Admin (manual) meta
 * - Detect duplicate meta titles
 * - Emit index-queue paths for newly healed / dirty-published URLs
 *
 * Usage:
 *   node scripts/meridian-catalog-steward.mjs --json --apply --out storage/meridian/zigma-prod/catalog-steward.json
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import mysql from 'mysql2/promise';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

function plain(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(s, max) {
  const t = plain(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trim()}…`;
}

function contentHash(row) {
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

function draftMeta(row) {
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

function draftAlt(row) {
  const title = plain(row.title) || 'Zigma Technologies';
  if (row.kind === 'video') return clip(`Video showing ${title}`, 120);
  if (row.item_type === 'project') return clip(`${title} — completed project by Zigma Technologies`, 120);
  if (row.item_type === 'product') return clip(`${title} product photo`, 120);
  if (row.item_type === 'service') return clip(`${title} — Zigma Technologies service`, 120);
  return clip(title, 120);
}

const TYPE_PATH = { project: 'projects', product: 'products', service: 'services' };

loadEnv();

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');
const outArg = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : 'storage/meridian/zigma-prod/catalog-steward.json';
const idFilter = process.argv.includes('--id')
  ? Number(process.argv[process.argv.indexOf('--id') + 1])
  : null;
const markInspected = process.argv.includes('--mark-inspected')
  ? String(process.argv[process.argv.indexOf('--mark-inspected') + 1] || '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)
  : [];

const pool = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

if (markInspected.length) {
  try {
    await pool.query(
      `UPDATE seo_url_queue SET status = 'inspected', processed_at = CURRENT_TIMESTAMP
       WHERE id IN (${markInspected.map(() => '?').join(',')})`,
      markInspected
    );
  } catch {
    /* table may not exist */
  }
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify({ ok: true, marked: markInspected.length }));
  } else {
    console.log(`Marked ${markInspected.length} seo_url_queue row(s) inspected`);
  }
  await pool.end();
  process.exit(0);
}

async function ensureCol(table, name, ddl) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, name]
  );
  if (!Number(rows[0]?.c)) {
    try {
      await pool.query(ddl);
    } catch {
      /* race */
    }
  }
}

/** Ensure steward columns exist (idempotent). */
async function ensureColumns() {
  await ensureCol('catalog_items', 'seo_meta_source', `ALTER TABLE catalog_items ADD COLUMN seo_meta_source VARCHAR(20) NULL`);
  await ensureCol('catalog_items', 'seo_content_hash', `ALTER TABLE catalog_items ADD COLUMN seo_content_hash VARCHAR(64) NULL`);
  await ensureCol('catalog_items', 'seo_dirty', `ALTER TABLE catalog_items ADD COLUMN seo_dirty TINYINT(1) NOT NULL DEFAULT 0`);
  await ensureCol('catalog_items', 'seo_steward_at', `ALTER TABLE catalog_items ADD COLUMN seo_steward_at TIMESTAMP NULL`);
  for (const table of ['pages', 'resource_posts', 'press_posts']) {
    await ensureCol(table, 'meta_title', `ALTER TABLE ${table} ADD COLUMN meta_title VARCHAR(255) NULL`);
    await ensureCol(table, 'meta_description', `ALTER TABLE ${table} ADD COLUMN meta_description VARCHAR(500) NULL`);
    await ensureCol(table, 'seo_meta_source', `ALTER TABLE ${table} ADD COLUMN seo_meta_source VARCHAR(20) NULL`);
    await ensureCol(table, 'seo_content_hash', `ALTER TABLE ${table} ADD COLUMN seo_content_hash VARCHAR(64) NULL`);
    await ensureCol(table, 'seo_dirty', `ALTER TABLE ${table} ADD COLUMN seo_dirty TINYINT(1) NOT NULL DEFAULT 0`);
    await ensureCol(table, 'seo_steward_at', `ALTER TABLE ${table} ADD COLUMN seo_steward_at TIMESTAMP NULL`);
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS seo_url_queue (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        path VARCHAR(500) NOT NULL,
        event VARCHAR(32) NOT NULL,
        hub_path VARCHAR(500) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        note VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP NULL,
        INDEX idx_seo_queue_status (status, created_at)
      ) ENGINE=InnoDB`);
  } catch {
    /* ok */
  }
}

function uniquifyTitle(base, path, used) {
  let t = clip(base, 58);
  const key = () => plain(t).toLowerCase();
  if (!used.has(key())) {
    used.add(key());
    return t;
  }
  const slugBit = (path.split('/').filter(Boolean).pop() || 'page').replace(/-/g, ' ');
  t = clip(`${plain(base)} – ${slugBit}`, 58);
  if (!used.has(key())) {
    used.add(key());
    return t;
  }
  let n = 2;
  while (n < 20) {
    t = clip(`${plain(base)} (${n})`, 58);
    if (!used.has(key())) {
      used.add(key());
      return t;
    }
    n++;
  }
  used.add(key());
  return t;
}

await ensureColumns();

const where = idFilter
  ? 'WHERE id = ?'
  : `WHERE enabled = 1 AND (status IS NULL OR status IN ('published','live','draft'))`;
const params = idFilter ? [idFilter] : [];

const [catalog] = await pool.query(
  `SELECT id, item_type, slug, title, summary, description, price_label, status, enabled,
          meta_title, meta_description, og_image_url, seo_noindex,
          seo_meta_source, seo_content_hash, seo_dirty, updated_at
   FROM catalog_items ${where}
   ORDER BY updated_at DESC, id DESC
   LIMIT 800`,
  params
);

const actions = [];
const indexPaths = [];
const titleMap = new Map();
let healedMeta = 0;
let healedOg = 0;
let healedAlt = 0;
let preservedManual = 0;
let grandfathered = 0;
let staleRefreshed = 0;

for (const row of catalog) {
  const path = `/${TYPE_PATH[row.item_type] || `${row.item_type}s`}/${row.slug}`;
  const hash = contentHash(row);
  const source = String(row.seo_meta_source || '').toLowerCase() || null;
  const hasTitle = plain(row.meta_title).length >= 15;
  const hasDesc = plain(row.meta_description).length >= 50;
  const dirty = !!Number(row.seo_dirty);
  const hashDrift = !!row.seo_content_hash && row.seo_content_hash !== hash;
  const isManual = source === 'manual';
  const isMeridian = source === 'meridian';
  const published =
    !!Number(row.enabled) && (!row.status || row.status === 'published' || row.status === 'live');

  let nextTitle = row.meta_title;
  let nextDesc = row.meta_description;
  let nextSource = source;
  let nextOg = row.og_image_url;
  const itemHeals = [];

  const mayRefresh =
    FORCE ||
    !hasTitle ||
    !hasDesc ||
    (isMeridian && (dirty || hashDrift)) ||
    (!source && (!hasTitle || !hasDesc));

  if (mayRefresh && !isManual) {
    const d = draftMeta(row);
    if (!hasTitle || (isMeridian && (dirty || hashDrift)) || FORCE) {
      nextTitle = d.meta_title;
      itemHeals.push(hasTitle ? 'meta_title_refresh' : 'meta_title_fill');
      if (hasTitle) staleRefreshed++;
      healedMeta++;
    }
    if (!hasDesc || (isMeridian && (dirty || hashDrift)) || FORCE) {
      nextDesc = d.meta_description;
      itemHeals.push(hasDesc ? 'meta_description_refresh' : 'meta_description_fill');
      healedMeta++;
    }
    if (itemHeals.some((h) => h.startsWith('meta_'))) nextSource = 'meridian';
  } else if (isManual) {
    preservedManual++;
  } else if (!source && hasTitle && hasDesc) {
    nextSource = 'manual';
    grandfathered++;
    itemHeals.push('meta_source_grandfather_manual');
  }

  const titleKey = plain(nextTitle || row.title).toLowerCase();
  if (published && !row.seo_noindex && titleKey) {
    if (!titleMap.has(titleKey)) titleMap.set(titleKey, []);
    titleMap.get(titleKey).push({
      id: row.id,
      path,
      title: row.title,
      table: 'catalog_items',
      source: nextSource,
      meta_title: nextTitle,
    });
  }

  if (!plain(nextOg)) {
    const [media] = await pool.query(
      `SELECT url FROM catalog_media
       WHERE item_id = ? AND kind != 'video'
       ORDER BY is_primary DESC, sort_order ASC, id ASC LIMIT 1`,
      [row.id]
    );
    if (media[0]?.url) {
      nextOg = media[0].url;
      itemHeals.push('og_image_sync');
      healedOg++;
    }
  }

  const [alts] = await pool.query(
    `SELECT id, kind, alt FROM catalog_media
     WHERE item_id = ? AND (alt IS NULL OR CHAR_LENGTH(TRIM(alt)) < 8)
     LIMIT 40`,
    [row.id]
  );
  for (const m of alts) {
    const alt = draftAlt({ ...row, kind: m.kind });
    if (APPLY) {
      await pool.query('UPDATE catalog_media SET alt = ? WHERE id = ?', [alt.slice(0, 255), m.id]);
    }
    itemHeals.push(`alt_${m.id}`);
    healedAlt++;
  }

  if (APPLY && (itemHeals.length || dirty || hashDrift || nextSource !== source)) {
    await pool.query(
      `UPDATE catalog_items SET
         meta_title = ?, meta_description = ?, og_image_url = ?,
         seo_meta_source = ?, seo_content_hash = ?, seo_dirty = 0,
         seo_steward_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nextTitle, nextDesc, nextOg, nextSource, hash, row.id]
    );
  }

  if (itemHeals.length || dirty || hashDrift) {
    actions.push({
      id: row.id,
      item_type: row.item_type,
      path,
      heals: itemHeals,
      dirty,
      hashDrift,
      source: nextSource,
      published,
    });
    if (published && !row.seo_noindex) indexPaths.push(path);
  }
}

// --- CMS pages / blog / press continuum ---
async function healContentTable(opts) {
  const { table, pathOf, draftOf, selectExtra = '', where = "enabled = 1" } = opts;
  let rows = [];
  try {
    const [r] = await pool.query(
      `SELECT id, slug, title, meta_title, meta_description, seo_meta_source, seo_content_hash, seo_dirty, status, enabled
       ${selectExtra}
       FROM ${table} WHERE ${where} ORDER BY id DESC LIMIT 300`
    );
    rows = r;
  } catch (e) {
    actions.push({ id: 0, path: table, heals: [`skip:${String(e.message || e).slice(0, 80)}`], source: null });
    return 0;
  }
  let n = 0;
  for (const row of rows) {
    const path = pathOf(row);
    const hash = contentHash({
      title: row.title,
      summary: row.excerpt || row.meta_description,
      description: row.body_html || '',
      price_label: '',
      slug: row.slug,
      status: row.status,
    });
    const source = String(row.seo_meta_source || '').toLowerCase() || null;
    const hasTitle = plain(row.meta_title).length >= 15;
    const hasDesc = plain(row.meta_description).length >= 50;
    const dirty = !!Number(row.seo_dirty);
    const hashDrift = !!row.seo_content_hash && row.seo_content_hash !== hash;
    const isManual = source === 'manual';
    const isMeridian = source === 'meridian';
    const published = !!Number(row.enabled) && (!row.status || row.status === 'published' || row.status === 'live');
    let nextTitle = row.meta_title;
    let nextDesc = row.meta_description;
    let nextSource = source;
    const heals = [];
    const mayRefresh =
      FORCE || !hasTitle || !hasDesc || (isMeridian && (dirty || hashDrift)) || (!source && (!hasTitle || !hasDesc));
    if (mayRefresh && !isManual) {
      const d = draftOf(row);
      if (!hasTitle || (isMeridian && (dirty || hashDrift)) || FORCE) {
        nextTitle = d.meta_title;
        heals.push(hasTitle ? 'meta_title_refresh' : 'meta_title_fill');
        healedMeta++;
        if (hasTitle) staleRefreshed++;
      }
      if (!hasDesc || (isMeridian && (dirty || hashDrift)) || FORCE) {
        nextDesc = d.meta_description;
        heals.push(hasDesc ? 'meta_description_refresh' : 'meta_description_fill');
        healedMeta++;
      }
      if (heals.length) nextSource = 'meridian';
    } else if (isManual) {
      preservedManual++;
    } else if (!source && hasTitle && hasDesc) {
      nextSource = 'manual';
      grandfathered++;
      heals.push('meta_source_grandfather_manual');
    }
    const titleKey = plain(nextTitle || row.title).toLowerCase();
    if (published && titleKey) {
      if (!titleMap.has(titleKey)) titleMap.set(titleKey, []);
      titleMap.get(titleKey).push({
        id: row.id,
        path,
        title: row.title,
        table,
        source: nextSource,
        meta_title: nextTitle,
      });
    }
    if (APPLY && (heals.length || dirty || hashDrift || nextSource !== source)) {
      try {
        await pool.query(
          `UPDATE ${table} SET meta_title = ?, meta_description = ?, seo_meta_source = ?,
           seo_content_hash = ?, seo_dirty = 0, seo_steward_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [nextTitle, nextDesc, nextSource, hash, row.id]
        );
      } catch {
        /* columns may lag */
      }
    }
    if (heals.length || dirty || hashDrift) {
      actions.push({ id: row.id, item_type: table, path, heals, dirty, hashDrift, source: nextSource, published });
      if (published) indexPaths.push(path);
      n++;
    }
  }
  return rows.length;
}

const scannedPages = await healContentTable({
  table: 'pages',
  where: '1=1',
  pathOf: (r) => `/${String(r.slug || '').replace(/^\//, '')}`,
  draftOf: (r) => ({
    meta_title: clip(plain(r.title) || String(r.slug).replace(/-/g, ' '), 58),
    meta_description: clip(
      `${plain(r.title)} at Zigma Technologies. Solar EPC, UPS, BESS and EV charging for industries across India. Contact us for a quote.`,
      160
    ),
  }),
});

const scannedPosts = await healContentTable({
  table: 'resource_posts',
  selectExtra: ', excerpt, body_html',
  pathOf: (r) => `/blog/${r.slug}`,
  draftOf: (r) => ({
    meta_title: clip(plain(r.title), 58),
    meta_description: clip(
      plain(r.excerpt) ||
        `${plain(r.title)} — practical guidance from Zigma Technologies on power, solar and UPS. Read the full article.`,
      160
    ),
  }),
});

const scannedPress = await healContentTable({
  table: 'press_posts',
  selectExtra: ', excerpt, body_html',
  pathOf: (r) => `/press/${r.slug}`,
  draftOf: (r) => ({
    meta_title: clip(plain(r.title), 58),
    meta_description: clip(
      plain(r.excerpt) || `${plain(r.title)} — news from Zigma Technologies.`,
      160
    ),
  }),
});

// Auto-fix duplicate titles for Meridian-owned (or empty-source) rows only
let duplicatesFixed = 0;
const duplicates = [...titleMap.entries()]
  .filter(([, items]) => items.length > 1)
  .map(([title, items]) => ({ title, count: items.length, items: items.slice(0, 8) }));

if (APPLY && duplicates.length) {
  const used = new Set([...titleMap.keys()].filter((k) => titleMap.get(k).length === 1));
  for (const group of duplicates) {
    const items = titleMap.get(group.title) || [];
    // Keep first; uniquify the rest when not manual
    for (let i = 1; i < items.length; i++) {
      const it = items[i];
      if (it.source === 'manual') continue;
      const next = uniquifyTitle(it.meta_title || it.title, it.path, used);
      const table = it.table || 'catalog_items';
      try {
        await pool.query(
          `UPDATE ${table} SET meta_title = ?, seo_meta_source = IF(seo_meta_source = 'manual', 'manual', 'meridian'),
           seo_dirty = 0, seo_steward_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [next, it.id]
        );
        duplicatesFixed++;
        actions.push({
          id: it.id,
          item_type: table,
          path: it.path,
          heals: ['duplicate_title_fix'],
          source: 'meridian',
          published: true,
        });
      } catch {
        /* skip */
      }
    }
  }
}

// Pending removal queue (for Meridian GSC inspect)
let removalQueue = [];
try {
  const [rq] = await pool.query(
    `SELECT id, path, event, hub_path FROM seo_url_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 40`
  );
  removalQueue = rq;
} catch {
  removalQueue = [];
}

const payload = {
  generatedAt: new Date().toISOString(),
  formula: 'Content Continuum — Inventory / Media / Products / Services / Projects / Pages / Blog / Press',
  apply: APPLY,
  force: FORCE,
  scanned: catalog.length + scannedPages + scannedPosts + scannedPress,
  scannedBy: {
    catalog: catalog.length,
    pages: scannedPages,
    posts: scannedPosts,
    press: scannedPress,
  },
  stats: {
    healedMeta,
    healedOg,
    healedAlt,
    preservedManual,
    grandfathered,
    staleRefreshed,
    duplicatesFixed,
    actionCount: actions.length,
    duplicateTitleGroups: duplicates.length,
    indexPathCount: indexPaths.length,
    removalPending: removalQueue.length,
  },
  actions: actions.slice(0, 120),
  duplicates: duplicates.slice(0, 40),
  indexPaths: [...new Set(indexPaths)].slice(0, 80),
  removalQueue: removalQueue.map((r) => ({
    id: r.id,
    path: r.path,
    event: r.event,
    hub_path: r.hub_path,
  })),
};

const outPath = resolve(process.cwd(), outArg);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

const mdPath = outPath.replace(/\.json$/i, '.md');
writeFileSync(
  mdPath,
  [
    '# Content Continuum (Meridian)',
    '',
    `Generated: ${payload.generatedAt} · apply=${APPLY}`,
    '',
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Scanned | ${payload.scanned} (catalog ${catalog.length} · pages ${scannedPages} · blog ${scannedPosts} · press ${scannedPress}) |`,
    `| Meta heals | ${healedMeta} |`,
    `| Stale refreshes | ${staleRefreshed} |`,
    `| OG syncs | ${healedOg} |`,
    `| Alt fills | ${healedAlt} |`,
    `| Manual preserved | ${preservedManual} |`,
    `| Duplicate groups / auto-fixed | ${duplicates.length} / ${duplicatesFixed} |`,
    `| Removal queue | ${removalQueue.length} |`,
    `| Index queue paths | ${payload.indexPaths.length} |`,
    '',
    duplicates.length
      ? `## Duplicate meta titles\n\n${duplicates
          .slice(0, 12)
          .map((d) => `- **${d.title}** (${d.count}): ${d.items.map((i) => i.path).join(', ')}`)
          .join('\n')}\n\nMeridian-owned duplicates auto-uniquified when \`--apply\`.`
      : '## Duplicate meta titles\n\nNone detected.',
    '',
    removalQueue.length
      ? `## Removal queue\n\n${removalQueue
          .slice(0, 15)
          .map((r) => `- \`${r.path}\` (${r.event}) → hub ${r.hub_path || '—'}`)
          .join('\n')}`
      : '## Removal queue\n\nEmpty.',
    '',
    '## Recent heals',
    '',
    ...(actions.slice(0, 25).map((a) => `- \`${a.path}\` — ${a.heals.join(', ') || 'stamp'}`) || ['- none']),
    '',
    'Forever: `npm run meridian:observe` · Autopilot includes Content Continuum each run.',
    '',
  ].join('\n'),
  'utf8'
);

await pool.end();

if (process.argv.includes('--json')) {
  process.stdout.write(
    JSON.stringify({
      ok: true,
      apply: APPLY,
      scanned: payload.scanned,
      stats: payload.stats,
      outPath,
      mdPath,
      sample: actions.slice(0, 8),
      indexPaths: payload.indexPaths.slice(0, 20),
      duplicates: duplicates.slice(0, 5),
      duplicatesFixed,
      removalQueue: removalQueue.slice(0, 10),
    })
  );
} else {
  console.log(
    `Content steward: scanned=${payload.scanned} actions=${actions.length} dupesFixed=${duplicatesFixed} apply=${APPLY} → ${outPath}`
  );
}
