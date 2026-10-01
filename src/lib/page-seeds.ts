import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { parseJsonField } from '@/lib/types';
import { PAGE_SEEDS, getPageSeed, type PageSeedDef, type PageSeedGroup, type SeedSection } from '@/lib/page-seed-registry';

/**
 * One idempotent "Seed" per built-in page. Running it any number of times converges the page to the
 * current seed without touching anything an admin made:
 *  1. creates the page (published) if it does not exist — an existing page's title, SEO, status and visibility are kept;
 *  2. fills an empty page with the full seed;
 *  3. upgrades older generic sections on the page to their configurable type in place (content, order, visibility,
 *     key, title and custom CSS kept; the previous version is saved under `_previous` so it can be restored);
 *  4. adds seed sections introduced since the page was last seeded, next to their seed neighbours. A ledger
 *     (`page_seed_state`) remembers which seed sections each page has already been offered, so a section an admin
 *     deleted is never added back.
 * Each run holds a per-page MySQL lock and runs in one transaction: double clicks and parallel runs cannot
 * duplicate sections, and a failed run leaves the page untouched.
 */

type PageRow = { id: number; slug: string; title: string; status: 'draft' | 'published'; enabled: boolean };
type SectionRow = {
  id: number;
  page_id: number;
  type: string;
  section_key: string | null;
  sort_order: number;
  content_json: Record<string, unknown>;
};
type LedgerRow = {
  slug: string;
  known_keys: string[] | null;
  last_action: string | null;
  last_summary: string | null;
  last_run_by: string | null;
  last_run_at: string | null;
};
type Snapshot = { page: PageRow | null; sections: SectionRow[]; ledger: LedgerRow | null };
type Previous = { type: string; content: Record<string, unknown> };

export type PageSeedState = 'missing' | 'empty' | 'pending' | 'current';

export type PageSeedPlan = {
  createPage: boolean;
  /** Seed sections inserted into an empty page. */
  insert: number;
  /** Older sections converted in place to their configurable type. */
  upgrade: number;
  /** Seed sections new since the last seed. */
  add: Array<{ key: string; title: string }>;
};

export type PageSeedStatus = {
  slug: string;
  label: string;
  group: PageSeedGroup;
  path: string;
  page: { id: number; title: string; status: 'draft' | 'published'; enabled: boolean; sections: number } | null;
  seedSections: number;
  state: PageSeedState;
  plan: PageSeedPlan;
  restorable: number;
  lastRun: { action: string; summary: string; by: string | null; at: string } | null;
};

export type PageSeedResult = {
  slug: string;
  label: string;
  action: 'sync' | 'restore';
  ok: boolean;
  changed: boolean;
  message: string;
};

export class PageSeedError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

const LEDGER_TABLE = 'page_seed_state';
const LOCK_WAIT_SECONDS = 20;

let ledgerReady: Promise<void> | null = null;

function ensureLedger() {
  ledgerReady ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (
        slug VARCHAR(120) NOT NULL PRIMARY KEY,
        known_keys TEXT NULL,
        last_action VARCHAR(20) NULL,
        last_summary VARCHAR(500) NULL,
        last_run_by VARCHAR(190) NULL,
        last_run_at TIMESTAMP NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    )
    .then(() => undefined)
    .catch((err) => {
      ledgerReady = null;
      throw err;
    });
  return ledgerReady;
}

export function previousOf(content: unknown): Previous | null {
  const prev = (content as { _previous?: Previous } | null)?._previous;
  return prev && typeof prev.type === 'string' && prev.content && typeof prev.content === 'object' ? prev : null;
}

function seedKeys(seed: SeedSection[]) {
  return [...new Set(seed.map((s) => s.section_key).filter((k): k is string => Boolean(k)))];
}

function mapPage(row: RowDataPacket): PageRow {
  return { id: row.id, slug: row.slug, title: row.title, status: row.status, enabled: Boolean(row.enabled) };
}

function mapSection(row: RowDataPacket): SectionRow {
  return {
    id: row.id,
    page_id: row.page_id,
    type: row.type,
    section_key: row.section_key,
    sort_order: row.sort_order,
    content_json: parseJsonField<Record<string, unknown>>(row.content_json, {}),
  };
}

function mapLedger(row: RowDataPacket): LedgerRow {
  const keys = parseJsonField<unknown>(row.known_keys, null);
  return {
    slug: row.slug,
    known_keys: Array.isArray(keys) ? keys.filter((k): k is string => typeof k === 'string') : null,
    last_action: row.last_action,
    last_summary: row.last_summary,
    last_run_by: row.last_run_by,
    last_run_at: row.last_run_at ? new Date(row.last_run_at).toISOString() : null,
  };
}

type Db = Pick<PoolConnection, 'query'>;

async function readSnapshots(db: Db, slugs: string[]): Promise<Map<string, Snapshot>> {
  const out = new Map<string, Snapshot>(slugs.map((s) => [s, { page: null, sections: [], ledger: null }]));
  if (!slugs.length) return out;
  const [pageRows] = await db.query<RowDataPacket[]>(
    'SELECT id, slug, title, status, enabled FROM pages WHERE slug IN (?)',
    [slugs]
  );
  const pages = pageRows.map(mapPage);
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  if (pages.length) {
    const [sectionRows] = await db.query<RowDataPacket[]>(
      `SELECT id, page_id, type, section_key, sort_order, content_json FROM page_sections
       WHERE page_id IN (?) ORDER BY page_id ASC, sort_order ASC, id ASC`,
      [pages.map((p) => p.id)]
    );
    const byPage = new Map<number, SectionRow[]>();
    for (const row of sectionRows) {
      const s = mapSection(row);
      byPage.set(s.page_id, [...(byPage.get(s.page_id) || []), s]);
    }
    for (const slug of slugs) {
      const page = bySlug.get(slug) || null;
      out.set(slug, { page, sections: page ? byPage.get(page.id) || [] : [], ledger: null });
    }
  }
  const [ledgerRows] = await db.query<RowDataPacket[]>(`SELECT * FROM ${LEDGER_TABLE} WHERE slug IN (?)`, [slugs]);
  for (const row of ledgerRows) {
    const snap = out.get(row.slug);
    if (snap) snap.ledger = mapLedger(row);
  }
  return out;
}

function analyze(def: PageSeedDef, snap: Snapshot) {
  const seed = def.sections();
  const keys = seedKeys(seed);
  const upgrades = def.upgrade
    ? snap.sections.flatMap((s) => {
        const next = def.upgrade!(s.type, s.content_json, s.section_key);
        return next ? [{ section: s, next }] : [];
      })
    : [];
  const restorable = snap.sections.filter(
    (s) => (!def.isUpgradedType || def.isUpgradedType(s.type)) && previousOf(s.content_json)
  );

  let additions: SeedSection[] = [];
  if (snap.page && snap.sections.length) {
    const present = new Set(snap.sections.map((s) => s.section_key).filter(Boolean));
    // Sections saved without a key can only be matched by type; treat that type as present to avoid duplicates.
    const keylessTypes = new Set(snap.sections.filter((s) => !s.section_key).map((s) => s.type));
    // No ledger yet: the page predates seed tracking, so everything in today's seed counts as already offered.
    const known = new Set(snap.ledger?.known_keys ?? keys);
    additions = seed.filter(
      (s) => s.section_key && !present.has(s.section_key) && !known.has(s.section_key) && !keylessTypes.has(s.type)
    );
  }

  const plan: PageSeedPlan = {
    createPage: !snap.page,
    insert: !snap.sections.length ? seed.length : 0,
    upgrade: snap.sections.length ? upgrades.length : 0,
    add: additions.map((s) => ({ key: s.section_key as string, title: s.title })),
  };
  const state: PageSeedState = !snap.page
    ? 'missing'
    : !snap.sections.length
      ? 'empty'
      : plan.upgrade || plan.add.length
        ? 'pending'
        : 'current';
  return { seed, keys, upgrades, restorable, additions, plan, state };
}

function toStatus(def: PageSeedDef, snap: Snapshot): PageSeedStatus {
  const a = analyze(def, snap);
  const l = snap.ledger;
  return {
    slug: def.slug,
    label: def.label,
    group: def.group,
    path: def.path,
    page: snap.page ? { ...snap.page, sections: snap.sections.length } : null,
    seedSections: a.seed.length,
    state: a.state,
    plan: a.plan,
    restorable: a.restorable.length,
    lastRun:
      l?.last_action && l.last_run_at
        ? { action: l.last_action, summary: l.last_summary || '', by: l.last_run_by, at: l.last_run_at }
        : null,
  };
}

export async function getPageSeedStatuses(): Promise<PageSeedStatus[]> {
  await ensureLedger();
  const snaps = await readSnapshots(pool, PAGE_SEEDS.map((d) => d.slug));
  return PAGE_SEEDS.map((def) => toStatus(def, snaps.get(def.slug)!));
}

function lockName(slug: string) {
  return `zigma:page-seed:${slug}`.slice(0, 64);
}

async function withPageLock<T>(slug: string, fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  await ensureLedger();
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query<RowDataPacket[]>('SELECT GET_LOCK(?, ?) AS got', [lockName(slug), LOCK_WAIT_SECONDS]);
    if (Number(rows[0]?.got) !== 1) {
      throw new PageSeedError(`Another seed of "${slug}" is still running. Try again in a moment.`, 409);
    }
    try {
      await conn.beginTransaction();
      try {
        const out = await fn(conn);
        await conn.commit();
        return out;
      } catch (err) {
        await conn.rollback();
        throw err;
      }
    } finally {
      await conn.query('SELECT RELEASE_LOCK(?)', [lockName(slug)]);
    }
  } finally {
    conn.release();
  }
}

async function insertSection(conn: Db, pageId: number, s: SeedSection, sortOrder: number) {
  await conn.query<ResultSetHeader>(
    `INSERT INTO page_sections (page_id, type, section_key, title, sort_order, enabled, content_json, style_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [pageId, s.type, s.section_key || null, s.title || null, sortOrder, s.enabled === false ? 0 : 1, JSON.stringify(s.content_json || {}), '{}']
  );
}

/** Inserts `additions` next to their nearest seed neighbour already on the page, then renumbers sort order. */
async function insertInSeedOrder(conn: Db, pageId: number, seed: SeedSection[], current: SectionRow[], additions: SeedSection[]) {
  const order: Array<{ key: string | null; existing?: SectionRow; add?: SeedSection }> = current.map((s) => ({
    key: s.section_key,
    existing: s,
  }));
  const lastIndexOfKey = (key: string) => {
    for (let n = order.length - 1; n >= 0; n--) if (order[n].key === key) return n;
    return -1;
  };
  for (const add of additions) {
    const i = seed.indexOf(add);
    let at = -1;
    for (let j = i - 1; j >= 0 && at < 0; j--) {
      const k = seed[j].section_key;
      const pos = k ? lastIndexOfKey(k) : -1;
      if (pos >= 0) at = pos + 1;
    }
    for (let j = i + 1; j < seed.length && at < 0; j++) {
      const k = seed[j].section_key;
      const pos = k ? order.findIndex((o) => o.key === k) : -1;
      if (pos >= 0) at = pos;
    }
    order.splice(at < 0 ? order.length : at, 0, { key: add.section_key, add });
  }
  for (let n = 0; n < order.length; n++) {
    const o = order[n];
    if (o.add) await insertSection(conn, pageId, o.add, n);
    else if (o.existing && o.existing.sort_order !== n) {
      await conn.query('UPDATE page_sections SET sort_order = ? WHERE id = ?', [n, o.existing.id]);
    }
  }
}

async function writeLedger(conn: Db, slug: string, action: 'sync' | 'restore', summary: string, actor: string | null, knownKeys?: string[]) {
  if (knownKeys) {
    await conn.query(
      `INSERT INTO ${LEDGER_TABLE} (slug, known_keys, last_action, last_summary, last_run_by, last_run_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE known_keys = VALUES(known_keys), last_action = VALUES(last_action),
         last_summary = VALUES(last_summary), last_run_by = VALUES(last_run_by), last_run_at = VALUES(last_run_at)`,
      [slug, JSON.stringify(knownKeys), action, summary.slice(0, 500), actor]
    );
  } else {
    await conn.query(
      `INSERT INTO ${LEDGER_TABLE} (slug, last_action, last_summary, last_run_by, last_run_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE last_action = VALUES(last_action), last_summary = VALUES(last_summary),
         last_run_by = VALUES(last_run_by), last_run_at = VALUES(last_run_at)`,
      [slug, action, summary.slice(0, 500), actor]
    );
  }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function requireDef(slug: string) {
  const def = getPageSeed(slug);
  if (!def) throw new PageSeedError(`"${slug}" is not a built-in page. Built-in pages: ${PAGE_SEEDS.map((d) => d.slug).join(', ')}.`);
  return def;
}

/** Brings one built-in page up to its current seed. Safe to run any number of times. */
export async function syncPageSeed(slug: string, actor: string | null = null): Promise<PageSeedResult> {
  const def = requireDef(slug);
  return withPageLock(slug, async (conn) => {
    const snap = (await readSnapshots(conn, [slug])).get(slug)!;
    const a = analyze(def, snap);
    const done: string[] = [];

    let pageId = snap.page?.id;
    if (!pageId) {
      const [res] = await conn.query<ResultSetHeader>(
        `INSERT INTO pages (slug, title, meta_title, meta_description, status, enabled, sort_order)
         VALUES (?, ?, ?, ?, 'published', 1, 0)`,
        [def.slug, def.page.title, def.page.meta_title || null, def.page.meta_description || null]
      );
      pageId = res.insertId;
      done.push(`created the page at ${def.path}`);
    }

    if (!snap.sections.length) {
      for (let i = 0; i < a.seed.length; i++) await insertSection(conn, pageId, a.seed[i], i);
      done.push(`added ${plural(a.seed.length, 'section')}`);
    } else {
      for (const { section, next } of a.upgrades) {
        await conn.query('UPDATE page_sections SET type = ?, content_json = ? WHERE id = ?', [
          next.type,
          JSON.stringify({ ...next.content, _previous: { type: section.type, content: section.content_json || {} } }),
          section.id,
        ]);
      }
      if (a.upgrades.length) {
        done.push(`upgraded ${plural(a.upgrades.length, 'section')} to the configurable editors (previous version kept)`);
      }
      if (a.additions.length) {
        await insertInSeedOrder(conn, pageId, a.seed, snap.sections, a.additions);
        done.push(`added ${plural(a.additions.length, 'new section')}: ${a.additions.map((s) => s.title).join(', ')}`);
      }
    }

    const message = done.length
      ? `${def.label}: ${done.join('; ')}.`
      : `${def.label} is already up to date (${plural(snap.sections.length, 'section')}). Nothing changed.`;
    const known = [...new Set([...(snap.ledger?.known_keys ?? []), ...a.keys])];
    await writeLedger(conn, slug, 'sync', message, actor, known);
    return { slug, label: def.label, action: 'sync' as const, ok: true, changed: done.length > 0, message };
  });
}

/** Restores every upgraded section on the page to the version saved before its upgrade. */
export async function restorePageSeed(slug: string, actor: string | null = null): Promise<PageSeedResult> {
  const def = requireDef(slug);
  return withPageLock(slug, async (conn) => {
    const snap = (await readSnapshots(conn, [slug])).get(slug)!;
    if (!snap.page) throw new PageSeedError(`${def.label} does not exist yet, so there is nothing to restore.`, 404);
    const { restorable } = analyze(def, snap);
    for (const s of restorable) {
      const prev = previousOf(s.content_json)!;
      await conn.query('UPDATE page_sections SET type = ?, content_json = ? WHERE id = ?', [
        prev.type,
        JSON.stringify(prev.content),
        s.id,
      ]);
    }
    const message = restorable.length
      ? `${def.label}: restored ${plural(restorable.length, 'section')} to the version saved before the upgrade.`
      : `${def.label} has no upgraded sections with a saved previous version. Nothing changed.`;
    if (restorable.length) await writeLedger(conn, slug, 'restore', message, actor);
    return { slug, label: def.label, action: 'restore' as const, ok: true, changed: restorable.length > 0, message };
  });
}

/** Seeds several pages (default: every built-in page) one at a time; one page failing does not stop the rest. */
export async function syncPageSeeds(slugs?: string[], actor: string | null = null): Promise<PageSeedResult[]> {
  const targets = slugs?.length ? slugs : PAGE_SEEDS.map((d) => d.slug);
  const results: PageSeedResult[] = [];
  for (const slug of targets) {
    try {
      results.push(await syncPageSeed(slug, actor));
    } catch (err) {
      results.push({
        slug,
        label: getPageSeed(slug)?.label || slug,
        action: 'sync',
        ok: false,
        changed: false,
        message: err instanceof Error ? err.message : `Seeding ${slug} failed`,
      });
    }
  }
  return results;
}
