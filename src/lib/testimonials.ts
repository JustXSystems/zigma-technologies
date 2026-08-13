import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '@/lib/db';

export type SiteTestimonial = {
  id: number;
  quote: string;
  author_name: string;
  author_role: string | null;
  company: string | null;
  rating: number | null;
  locale: string;
  status: 'draft' | 'published';
  featured: number;
  sort_order: number;
  enabled: number;
};

function mapRow(row: RowDataPacket): SiteTestimonial {
  return {
    id: Number(row.id),
    quote: String(row.quote),
    author_name: String(row.author_name),
    author_role: row.author_role ?? null,
    company: row.company ?? null,
    rating: row.rating != null ? Number(row.rating) : null,
    locale: String(row.locale || 'en'),
    status: row.status === 'published' ? 'published' : 'draft',
    featured: Number(row.featured) ? 1 : 0,
    sort_order: Number(row.sort_order) || 0,
    enabled: Number(row.enabled) ? 1 : 0,
  };
}

export async function listTestimonials(opts?: { admin?: boolean; featuredOnly?: boolean; locale?: string }) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (!opts?.admin) {
    where.push("status = 'published'");
    where.push('enabled = 1');
  }
  if (opts?.featuredOnly) where.push('featured = 1');
  if (opts?.locale) {
    where.push('locale = ?');
    params.push(opts.locale);
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM site_testimonials ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY featured DESC, sort_order ASC, id DESC`,
    params
  );
  return rows.map(mapRow);
}

export async function createTestimonial(input: {
  quote: string;
  author_name: string;
  author_role?: string | null;
  company?: string | null;
  rating?: number | null;
  locale?: string;
  status?: 'draft' | 'published';
  featured?: boolean;
  enabled?: boolean;
  sort_order?: number;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO site_testimonials
      (quote, author_name, author_role, company, rating, locale, status, featured, enabled, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.quote,
      input.author_name,
      input.author_role ?? null,
      input.company ?? null,
      input.rating ?? null,
      input.locale || 'en',
      input.status || 'draft',
      input.featured ? 1 : 0,
      input.enabled === false ? 0 : 1,
      input.sort_order ?? 0,
    ]
  );
  return result.insertId;
}

export async function updateTestimonial(
  id: number,
  input: Partial<{
    quote: string;
    author_name: string;
    author_role: string | null;
    company: string | null;
    rating: number | null;
    locale: string;
    status: 'draft' | 'published';
    featured: boolean;
    enabled: boolean;
    sort_order: number;
  }>
) {
  const fields: string[] = [];
  const params: unknown[] = [];
  const map: Record<string, unknown> = {
    quote: input.quote,
    author_name: input.author_name,
    author_role: input.author_role,
    company: input.company,
    rating: input.rating,
    locale: input.locale,
    status: input.status,
    sort_order: input.sort_order,
  };
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`);
      params.push(v);
    }
  }
  if (input.featured !== undefined) {
    fields.push('featured = ?');
    params.push(input.featured ? 1 : 0);
  }
  if (input.enabled !== undefined) {
    fields.push('enabled = ?');
    params.push(input.enabled ? 1 : 0);
  }
  if (!fields.length) return;
  params.push(id);
  await pool.query(`UPDATE site_testimonials SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function deleteTestimonial(id: number) {
  await pool.query('DELETE FROM site_testimonials WHERE id = ?', [id]);
}

export async function seedTestimonials() {
  const existing = await listTestimonials({ admin: true });
  if (existing.length) return { created: 0, total: existing.length };
  const seeds = [
    {
      quote: 'Zigma commissioned our industrial UPS with clear documentation and zero drama during cutover.',
      author_name: 'Facilities Lead',
      author_role: 'Plant Engineering',
      company: 'Manufacturing client',
      rating: 5,
      featured: true,
    },
    {
      quote: 'Their solar O&M reporting helped us catch string underperformance early and protect yield.',
      author_name: 'Energy Manager',
      author_role: 'Campus Operations',
      company: 'Education campus',
      rating: 5,
      featured: true,
    },
    {
      quote: 'Responsive AMC desk — emergency support when a critical UPS alarm hit after hours.',
      author_name: 'IT Infrastructure',
      author_role: 'Data room owner',
      company: 'BFSI client',
      rating: 5,
      featured: true,
    },
  ];
  for (const s of seeds) {
    await createTestimonial({ ...s, status: 'published', enabled: true, locale: 'en' });
  }
  return { created: seeds.length, total: seeds.length };
}

export function testimonialsJsonLd(items: SiteTestimonial[], companyName: string) {
  const rated = items.filter((t) => t.rating && t.rating > 0);
  if (!rated.length) return null;
  const avg = rated.reduce((sum, t) => sum + (t.rating || 0), 0) / rated.length;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: companyName,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: Number(avg.toFixed(1)),
      reviewCount: rated.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: rated.slice(0, 6).map((t) => ({
      '@type': 'Review',
      reviewBody: t.quote,
      author: { '@type': 'Person', name: t.author_name },
      reviewRating: { '@type': 'Rating', ratingValue: t.rating, bestRating: 5 },
    })),
  };
}
