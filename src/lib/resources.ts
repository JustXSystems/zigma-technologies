import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { cleanPostDisplay, type PostDisplay } from '@/lib/blog-design';
import pool from '@/lib/db';
import { ensureResourcePostColumns } from '@/lib/schema-ensure';

export type ResourcePost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body_html: string | null;
  cover_url: string | null;
  tags_json: string[] | null;
  /** Article, guide, checklist… (empty = derived from the tags) */
  format: string;
  /** Article template for this post (empty = the blog default) */
  template: string;
  /** Editor's pick for the Featured section */
  featured: number;
  author_name: string | null;
  author_role: string | null;
  author_avatar_url: string | null;
  /** Key takeaways shown as a summary card */
  key_points_json: string[] | null;
  /** This post's departures from the blog-wide design */
  display_json: PostDisplay;
  status: 'draft' | 'published';
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  enabled: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ResourcePostInput = {
  slug: string;
  title: string;
  excerpt?: string | null;
  body_html?: string | null;
  cover_url?: string | null;
  tags_json?: string[];
  format?: string;
  template?: string;
  featured?: boolean;
  author_name?: string | null;
  author_role?: string | null;
  author_avatar_url?: string | null;
  key_points_json?: string[];
  display_json?: PostDisplay | null;
  status?: 'draft' | 'published';
  meta_title?: string | null;
  meta_description?: string | null;
  published_at?: string | Date | null;
  enabled?: boolean;
  sort_order?: number;
};

function parseJsonArray(raw: unknown): string[] | null {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function parseJsonObject(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isoOrNull(raw: unknown): string | null {
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(String(raw));
  return Number.isNaN(date.getTime()) ? String(raw) : date.toISOString();
}

function mapRow(row: RowDataPacket): ResourcePost {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: row.excerpt ?? null,
    body_html: row.body_html ?? null,
    cover_url: row.cover_url ?? null,
    tags_json: parseJsonArray(row.tags_json),
    format: row.format ? String(row.format) : '',
    template: row.template ? String(row.template) : '',
    featured: Number(row.featured) ? 1 : 0,
    author_name: row.author_name ?? null,
    author_role: row.author_role ?? null,
    author_avatar_url: row.author_avatar_url ?? null,
    key_points_json: parseJsonArray(row.key_points_json),
    display_json: cleanPostDisplay(parseJsonObject(row.display_json)),
    status: row.status === 'published' ? 'published' : 'draft',
    meta_title: row.meta_title ?? null,
    meta_description: row.meta_description ?? null,
    published_at: isoOrNull(row.published_at),
    enabled: Number(row.enabled) ? 1 : 0,
    sort_order: Number(row.sort_order) || 0,
    created_at: isoOrNull(row.created_at) ?? undefined,
    updated_at: isoOrNull(row.updated_at) ?? undefined,
  };
}

export async function listResourcePosts(opts?: {
  admin?: boolean;
  q?: string;
  tag?: string;
  limit?: number;
}) {
  await ensureResourcePostColumns();
  const where: string[] = [];
  const params: unknown[] = [];
  if (!opts?.admin) {
    where.push("status = 'published'");
    where.push('enabled = 1');
  }
  if (opts?.q) {
    where.push('(title LIKE ? OR excerpt LIKE ? OR CAST(tags_json AS CHAR) LIKE ?)');
    const like = `%${opts.q}%`;
    params.push(like, like, like);
  }
  if (opts?.tag) {
    where.push('CAST(tags_json AS CHAR) LIKE ?');
    params.push(`%${opts.tag}%`);
  }
  const limitSql = opts?.limit && opts.limit > 0 ? ` LIMIT ${Math.min(opts.limit, 200)}` : '';
  const sql = `SELECT * FROM resource_posts ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY COALESCE(published_at, created_at) DESC, sort_order ASC, id DESC${limitSql}`;
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows.map(mapRow);
}

export async function getResourcePostBySlug(slug: string, opts?: { admin?: boolean }) {
  await ensureResourcePostColumns();
  const where = ['slug = ?'];
  const params: unknown[] = [slug];
  if (!opts?.admin) {
    where.push("status = 'published'");
    where.push('enabled = 1');
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM resource_posts WHERE ${where.join(' AND ')} LIMIT 1`,
    params
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getResourcePostById(id: number) {
  await ensureResourcePostColumns();
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM resource_posts WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

const cleanList = (list: string[] | undefined) => JSON.stringify((list || []).map((s) => s.trim()).filter(Boolean));
const displayJson = (display: PostDisplay | null | undefined) => {
  const clean = cleanPostDisplay(display);
  return Object.keys(clean).length ? JSON.stringify(clean) : null;
};

export async function createResourcePost(input: ResourcePostInput) {
  await ensureResourcePostColumns();
  const status = input.status || 'draft';
  const publishedAt = input.published_at || (status === 'published' ? new Date() : null);
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO resource_posts
      (slug, title, excerpt, body_html, cover_url, tags_json, format, template, featured, author_name, author_role,
       author_avatar_url, key_points_json, display_json, status, meta_title, meta_description, published_at, enabled, sort_order)
     VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?, ?, ?, ?, ?)`,
    [
      input.slug,
      input.title,
      input.excerpt ?? null,
      input.body_html ?? null,
      input.cover_url ?? null,
      cleanList(input.tags_json),
      input.format || '',
      input.template || '',
      input.featured ? 1 : 0,
      input.author_name || null,
      input.author_role || null,
      input.author_avatar_url || null,
      cleanList(input.key_points_json),
      displayJson(input.display_json),
      status,
      input.meta_title ?? null,
      input.meta_description ?? null,
      publishedAt,
      input.enabled === false ? 0 : 1,
      input.sort_order ?? 0,
    ]
  );
  return result.insertId;
}

export async function updateResourcePost(id: number, input: Partial<ResourcePostInput>) {
  await ensureResourcePostColumns();
  const before = await getResourcePostById(id);
  const fields: string[] = [];
  const params: unknown[] = [];
  const map: Record<string, unknown> = {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    body_html: input.body_html,
    cover_url: input.cover_url,
    format: input.format,
    template: input.template,
    author_name: input.author_name,
    author_role: input.author_role,
    author_avatar_url: input.author_avatar_url,
    status: input.status,
    meta_title: input.meta_title,
    meta_description: input.meta_description,
    published_at: input.published_at,
    sort_order: input.sort_order,
  };
  if (input.meta_title !== undefined || input.meta_description !== undefined) {
    fields.push('seo_meta_source = ?');
    params.push('manual');
  } else if (input.title !== undefined || input.excerpt !== undefined || input.slug !== undefined) {
    fields.push('seo_dirty = ?');
    params.push(1);
  }
  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (input.tags_json !== undefined) {
    fields.push('tags_json = CAST(? AS JSON)');
    params.push(cleanList(input.tags_json));
  }
  if (input.key_points_json !== undefined) {
    fields.push('key_points_json = CAST(? AS JSON)');
    params.push(cleanList(input.key_points_json));
  }
  if (input.display_json !== undefined) {
    fields.push('display_json = CAST(? AS JSON)');
    params.push(displayJson(input.display_json));
  }
  if (input.featured !== undefined) {
    fields.push('featured = ?');
    params.push(input.featured ? 1 : 0);
  }
  if (input.enabled !== undefined) {
    fields.push('enabled = ?');
    params.push(input.enabled ? 1 : 0);
  }
  if (input.status === 'published' && input.published_at === undefined) {
    fields.push('published_at = COALESCE(published_at, NOW())');
  }
  if (!fields.length) return;
  params.push(id);
  try {
    await pool.query(`UPDATE resource_posts SET ${fields.join(', ')} WHERE id = ?`, params);
  } catch {
    const coreFields: string[] = [];
    const coreParams: unknown[] = [];
    for (const [key, value] of Object.entries(map)) {
      if (value !== undefined) {
        coreFields.push(`${key} = ?`);
        coreParams.push(value);
      }
    }
    if (input.tags_json !== undefined) {
      coreFields.push('tags_json = CAST(? AS JSON)');
      coreParams.push(cleanList(input.tags_json));
    }
    if (input.key_points_json !== undefined) {
      coreFields.push('key_points_json = CAST(? AS JSON)');
      coreParams.push(cleanList(input.key_points_json));
    }
    if (input.display_json !== undefined) {
      coreFields.push('display_json = CAST(? AS JSON)');
      coreParams.push(displayJson(input.display_json));
    }
    if (input.featured !== undefined) {
      coreFields.push('featured = ?');
      coreParams.push(input.featured ? 1 : 0);
    }
    if (input.enabled !== undefined) {
      coreFields.push('enabled = ?');
      coreParams.push(input.enabled ? 1 : 0);
    }
    if (input.status === 'published' && input.published_at === undefined) {
      coreFields.push('published_at = COALESCE(published_at, NOW())');
    }
    if (coreFields.length) {
      coreParams.push(id);
      await pool.query(`UPDATE resource_posts SET ${coreFields.join(', ')} WHERE id = ?`, coreParams);
    }
  }
  const after = await getResourcePostById(id);
  if (before && after) {
    const { enqueueSeoUrlRemovalSafe, leftIndexableSet } = await import('@/lib/seo-url-queue');
    if (leftIndexableSet(before, after)) {
      await enqueueSeoUrlRemovalSafe({
        path: `/blog/${before.slug}`,
        event: 'unpublish',
        hubPath: '/blog',
        redirectToHub: true,
      });
    }
  }
}

export async function deleteResourcePost(id: number) {
  const before = await getResourcePostById(id);
  await pool.query('DELETE FROM resource_posts WHERE id = ?', [id]);
  if (before && before.status === 'published' && Number(before.enabled)) {
    const { enqueueSeoUrlRemovalSafe } = await import('@/lib/seo-url-queue');
    await enqueueSeoUrlRemovalSafe({
      path: `/blog/${before.slug}`,
      event: 'delete',
      hubPath: '/blog',
      redirectToHub: true,
    });
  }
}

const RESOURCE_SEEDS: Array<
  Required<Pick<ResourcePostInput, 'slug' | 'title' | 'excerpt' | 'body_html' | 'cover_url' | 'tags_json' | 'format' | 'key_points_json'>> & {
    meta_title: string;
    meta_description: string;
  }
> = [
  {
    slug: 'ups-sizing-guide',
    title: 'UPS sizing guide for industrial and IT loads',
    excerpt: 'How to estimate kVA, autonomy, and redundancy before you buy a UPS.',
    cover_url: '/assets/images/seed-abb-ups.jpg',
    tags_json: ['UPS', 'Guide', 'Sizing'],
    format: 'guide',
    key_points_json: [
      'Size from measured kW, then convert to kVA with the real power factor',
      'Add 20–25% headroom for growth and inrush',
      'Pick N+1 redundancy for mission-critical loads',
    ],
    meta_title: 'UPS Sizing Guide | Zigma Technologies',
    meta_description: 'Practical UPS sizing checklist for industrial plants, server rooms, and commercial facilities in India.',
    body_html: `<p>Correct UPS sizing protects critical loads without overspending on oversized hardware. Start with measured load (kW), apply a power-factor conversion to kVA, then add headroom for growth and inrush.</p>
<h2>Sizing checklist</h2>
<ul>
<li>List critical vs non-critical loads with measured kW</li>
<li>Note single-phase vs three-phase distribution</li>
<li>Decide autonomy target in minutes</li>
<li>Choose N or N+1 redundancy for mission-critical sites</li>
<li>Plan battery chemistry, enclosure, and service access</li>
</ul>
<blockquote><p>Zigma engineers can validate your BOM against site conditions, harmonic content, and generator compatibility before procurement.</p></blockquote>`,
  },
  {
    slug: 'solar-om-checklist',
    title: 'Solar O&M checklist for commercial rooftops',
    excerpt: 'A practical operations checklist to keep C&I solar plants performing year-round.',
    cover_url: '/assets/images/seed-solar-modules.jpg',
    tags_json: ['Solar', 'O&M', 'Checklist'],
    format: 'checklist',
    key_points_json: [
      'Monthly visual, string and inverter-log checks catch silent losses',
      'Quarterly thermal imaging finds hotspots before they fail',
      'Documented O&M protects yield and warranty claims',
    ],
    meta_title: 'Solar O&M Checklist | Zigma Technologies',
    meta_description: 'Monthly and quarterly solar O&M checklist covering cleaning, IV curves, string health, and inverter alarms.',
    body_html: `<p>Commercial solar underperforms quietly when soiling, loose terminations, or inverter faults go unnoticed. A disciplined O&amp;M rhythm protects yield and warranty compliance.</p>
<h2>Monthly inspection rhythm</h2>
<ul>
<li>Visual inspection of modules, mounting, and cable routing</li>
<li>String current spot-checks against baseline</li>
<li>Inverter alarm and event log review</li>
<li>Vegetation, soiling, and drainage notes</li>
</ul>
<h2>Quarterly engineering checks</h2>
<ul>
<li>Torque verification on critical joints</li>
<li>Thermal imaging for hotspot detection</li>
<li>IV curve sampling on representative strings</li>
<li>Earthing and SPD verification</li>
</ul>
<blockquote><p>Zigma Solar AMC teams deliver scheduled O&amp;M with clear reporting so facility managers see production vs expectation.</p></blockquote>`,
  },
  {
    slug: 'bess-peak-shaving',
    title: 'BESS peak shaving: when storage pays for itself',
    excerpt: 'How battery energy storage cuts demand charges and firms solar generation.',
    cover_url: '/assets/images/city-skyline-with-solar-panels-and-indus.jpg',
    tags_json: ['BESS', 'EMS', 'Peak Shaving'],
    format: 'brief',
    key_points_json: [
      'Storage pays back fastest where short peaks drive demand charges',
      'An EMS automates charge and discharge against the load profile',
      'BESS can defer a transformer upgrade when adding EV charging',
    ],
    meta_title: 'BESS Peak Shaving Guide | Zigma Technologies',
    meta_description: 'Learn when battery energy storage systems reduce demand charges and improve solar self-consumption.',
    body_html: `<p>Peak shaving uses stored energy during short high-demand windows that drive tariff spikes. Pairing BESS with an energy management system (EMS) automates charge/discharge against your load profile.</p>
<h2>When BESS pays back</h2>
<ul>
<li>Factories with sharp process peaks and high demand charges</li>
<li>Campuses adding EV charging without upgrading transformer capacity</li>
<li>Solar sites exporting little while paying high demand tariffs</li>
</ul>
<blockquote><p>Zigma designs BESS packages with PCS, EMS, and commissioning so dispatch matches your commercial goals—not just nameplate kWh.</p></blockquote>`,
  },
];

export async function seedResourcePosts() {
  let created = 0;
  for (const seed of RESOURCE_SEEDS) {
    const existing = await getResourcePostBySlug(seed.slug, { admin: true });
    if (existing) continue;
    await createResourcePost({ ...seed, status: 'published', enabled: true });
    created += 1;
  }
  return { created, total: RESOURCE_SEEDS.length };
}
