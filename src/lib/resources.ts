import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '@/lib/db';

export type ResourcePost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body_html: string | null;
  cover_url: string | null;
  tags_json: string[] | null;
  status: 'draft' | 'published';
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  enabled: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
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

function mapRow(row: RowDataPacket): ResourcePost {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: row.excerpt ?? null,
    body_html: row.body_html ?? null,
    cover_url: row.cover_url ?? null,
    tags_json: parseJsonArray(row.tags_json),
    status: row.status === 'published' ? 'published' : 'draft',
    meta_title: row.meta_title ?? null,
    meta_description: row.meta_description ?? null,
    published_at: row.published_at ? String(row.published_at) : null,
    enabled: Number(row.enabled) ? 1 : 0,
    sort_order: Number(row.sort_order) || 0,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function listResourcePosts(opts?: {
  admin?: boolean;
  q?: string;
  tag?: string;
  limit?: number;
}) {
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
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM resource_posts WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createResourcePost(input: {
  slug: string;
  title: string;
  excerpt?: string | null;
  body_html?: string | null;
  cover_url?: string | null;
  tags_json?: string[];
  status?: 'draft' | 'published';
  meta_title?: string | null;
  meta_description?: string | null;
  published_at?: string | null;
  enabled?: boolean;
  sort_order?: number;
}) {
  const status = input.status || 'draft';
  const publishedAt =
    input.published_at || (status === 'published' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null);
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO resource_posts
      (slug, title, excerpt, body_html, cover_url, tags_json, status, meta_title, meta_description, published_at, enabled, sort_order)
     VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?, ?)`,
    [
      input.slug,
      input.title,
      input.excerpt ?? null,
      input.body_html ?? null,
      input.cover_url ?? null,
      JSON.stringify(input.tags_json || []),
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

export async function updateResourcePost(
  id: number,
  input: Partial<{
    slug: string;
    title: string;
    excerpt: string | null;
    body_html: string | null;
    cover_url: string | null;
    tags_json: string[];
    status: 'draft' | 'published';
    meta_title: string | null;
    meta_description: string | null;
    published_at: string | null;
    enabled: boolean;
    sort_order: number;
  }>
) {
  const fields: string[] = [];
  const params: unknown[] = [];
  const map: Record<string, unknown> = {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    body_html: input.body_html,
    cover_url: input.cover_url,
    status: input.status,
    meta_title: input.meta_title,
    meta_description: input.meta_description,
    published_at: input.published_at,
    sort_order: input.sort_order,
  };
  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (input.tags_json !== undefined) {
    fields.push('tags_json = CAST(? AS JSON)');
    params.push(JSON.stringify(input.tags_json));
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
  await pool.query(`UPDATE resource_posts SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function deleteResourcePost(id: number) {
  await pool.query('DELETE FROM resource_posts WHERE id = ?', [id]);
}

const RESOURCE_SEEDS: Array<{
  slug: string;
  title: string;
  excerpt: string;
  body_html: string;
  cover_url: string;
  tags_json: string[];
  meta_title: string;
  meta_description: string;
}> = [
  {
    slug: 'ups-sizing-guide',
    title: 'UPS sizing guide for industrial and IT loads',
    excerpt: 'How to estimate kVA, autonomy, and redundancy before you buy a UPS.',
    cover_url: '/assets/images/seed-abb-ups.jpg',
    tags_json: ['UPS', 'Guide', 'Sizing'],
    meta_title: 'UPS Sizing Guide | Zigma Technologies',
    meta_description: 'Practical UPS sizing checklist for industrial plants, server rooms, and commercial facilities in India.',
    body_html: `<p>Correct UPS sizing protects critical loads without overspending on oversized hardware. Start with measured load (kW), apply a power-factor conversion to kVA, then add headroom for growth and inrush.</p>
<p><strong>Checklist:</strong> list critical vs non-critical loads; note single-phase vs three-phase; decide autonomy (minutes); choose N or N+1 redundancy; plan battery chemistry and service access.</p>
<p>Zigma engineers can validate your BOM against site conditions, harmonic content, and generator compatibility before procurement.</p>`,
  },
  {
    slug: 'solar-om-checklist',
    title: 'Solar O&amp;M checklist for commercial rooftops',
    excerpt: 'A practical operations checklist to keep C&amp;I solar plants performing year-round.',
    cover_url: '/assets/images/seed-solar-modules.jpg',
    tags_json: ['Solar', 'O&M', 'Checklist'],
    meta_title: 'Solar O&M Checklist | Zigma Technologies',
    meta_description: 'Monthly and quarterly solar O&M checklist covering cleaning, IV curves, string health, and inverter alarms.',
    body_html: `<p>Commercial solar underperforms quietly when soiling, loose terminations, or inverter faults go unnoticed. A disciplined O&amp;M rhythm protects yield and warranty compliance.</p>
<p><strong>Monthly:</strong> visual inspection, string current spot-checks, inverter alarm review, vegetation/soiling notes.</p>
<p><strong>Quarterly:</strong> torque checks on critical joints, thermal imaging hotspots, IV curve sampling, earthing verification.</p>
<p>Zigma Solar AMC teams deliver scheduled O&amp;M with clear reporting so facility managers see production vs expectation.</p>`,
  },
  {
    slug: 'bess-peak-shaving',
    title: 'BESS peak shaving: when storage pays for itself',
    excerpt: 'How battery energy storage cuts demand charges and firms solar generation.',
    cover_url: '/assets/images/city-skyline-with-solar-panels-and-indus.jpg',
    tags_json: ['BESS', 'EMS', 'Peak Shaving'],
    meta_title: 'BESS Peak Shaving Guide | Zigma Technologies',
    meta_description: 'Learn when battery energy storage systems reduce demand charges and improve solar self-consumption.',
    body_html: `<p>Peak shaving uses stored energy during short high-demand windows that drive tariff spikes. Pairing BESS with an energy management system (EMS) automates charge/discharge against your load profile.</p>
<p>Good candidates: factories with sharp process peaks, campuses with EV charging growth, and solar sites exporting little while paying high demand charges.</p>
<p>Zigma designs BESS packages with PCS, EMS, and commissioning so dispatch matches your commercial goals—not just nameplate kWh.</p>`,
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
