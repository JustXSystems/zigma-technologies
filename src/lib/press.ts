import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '@/lib/db';

export type PressPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body_html: string | null;
  cover_url: string | null;
  source_name: string | null;
  source_url: string | null;
  published_at: string | null;
  status: 'draft' | 'published';
  enabled: number;
  sort_order: number;
};

function mapRow(row: RowDataPacket): PressPost {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: row.excerpt ?? null,
    body_html: row.body_html ?? null,
    cover_url: row.cover_url ?? null,
    source_name: row.source_name ?? null,
    source_url: row.source_url ?? null,
    published_at: row.published_at ? String(row.published_at) : null,
    status: row.status === 'published' ? 'published' : 'draft',
    enabled: Number(row.enabled) ? 1 : 0,
    sort_order: Number(row.sort_order) || 0,
  };
}

export async function listPressPosts(opts?: { admin?: boolean; limit?: number }) {
  const where: string[] = [];
  if (!opts?.admin) {
    where.push("status = 'published'");
    where.push('enabled = 1');
  }
  const limitSql = opts?.limit && opts.limit > 0 ? ` LIMIT ${Math.min(opts.limit, 200)}` : '';
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM press_posts ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY COALESCE(published_at, created_at) DESC, sort_order ASC, id DESC${limitSql}`
  );
  return rows.map(mapRow);
}

export async function getPressPostBySlug(slug: string, opts?: { admin?: boolean }) {
  const where = ['slug = ?'];
  const params: unknown[] = [slug];
  if (!opts?.admin) {
    where.push("status = 'published'");
    where.push('enabled = 1');
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM press_posts WHERE ${where.join(' AND ')} LIMIT 1`,
    params
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getPressPostById(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM press_posts WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createPressPost(input: {
  slug: string;
  title: string;
  excerpt?: string | null;
  body_html?: string | null;
  cover_url?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  status?: 'draft' | 'published';
  published_at?: string | null;
  enabled?: boolean;
  sort_order?: number;
}) {
  const status = input.status || 'draft';
  const publishedAt =
    input.published_at || (status === 'published' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null);
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO press_posts
      (slug, title, excerpt, body_html, cover_url, source_name, source_url, published_at, status, enabled, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.slug,
      input.title,
      input.excerpt ?? null,
      input.body_html ?? null,
      input.cover_url ?? null,
      input.source_name ?? null,
      input.source_url ?? null,
      publishedAt,
      status,
      input.enabled === false ? 0 : 1,
      input.sort_order ?? 0,
    ]
  );
  return result.insertId;
}

export async function updatePressPost(
  id: number,
  input: Partial<{
    slug: string;
    title: string;
    excerpt: string | null;
    body_html: string | null;
    cover_url: string | null;
    source_name: string | null;
    source_url: string | null;
    status: 'draft' | 'published';
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
    source_name: input.source_name,
    source_url: input.source_url,
    status: input.status,
    published_at: input.published_at,
    enabled: input.enabled === undefined ? undefined : input.enabled ? 1 : 0,
    sort_order: input.sort_order,
  };
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`);
      params.push(v);
    }
  }
  if (!fields.length) return getPressPostById(id);
  params.push(id);
  await pool.query(`UPDATE press_posts SET ${fields.join(', ')} WHERE id = ?`, params);
  return getPressPostById(id);
}

export async function deletePressPost(id: number) {
  await pool.query('DELETE FROM press_posts WHERE id = ?', [id]);
}

export async function seedPressPosts() {
  const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS c FROM press_posts');
  if (Number(countRows[0]?.c) > 0) return { inserted: 0, skipped: true as const };
  const samples = [
    {
      slug: 'zigma-abb-channel-partner',
      title: 'Zigma Technologies expands ABB UPS partnership in South India',
      excerpt: 'Authorized channel coverage for industrial UPS and power quality solutions.',
      body_html:
        '<p>Zigma Technologies continues to support critical facilities with ABB UPS platforms, local engineering, and AMC readiness across Karnataka and neighbouring states.</p>',
      source_name: 'Company newsroom',
      status: 'published' as const,
    },
    {
      slug: 'solar-epc-milestones-2025',
      title: 'Commercial solar EPC milestones across Bengaluru campuses',
      excerpt: 'Rooftop and ground-mount deliveries with monitoring and O&M handover.',
      body_html:
        '<p>Recent campus deployments highlight Zigma’s integrated Solar EPC approach — design, OEM supply, commissioning, and lifecycle support.</p>',
      source_name: 'Company newsroom',
      status: 'published' as const,
    },
  ];
  for (const s of samples) {
    await createPressPost(s);
  }
  return { inserted: samples.length, skipped: false as const };
}
