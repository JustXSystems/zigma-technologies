import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '@/lib/db';

export type RedirectRow = {
  id: number;
  from_path: string;
  to_path: string;
  status_code: number;
  enabled: number;
  created_at?: string;
  updated_at?: string;
};

function normalizePath(path: string) {
  let p = path.trim();
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

let cache: { at: number; map: Map<string, RedirectRow> } | null = null;
const CACHE_MS = 30_000;

export async function listRedirects(admin = false): Promise<RedirectRow[]> {
  const where = admin ? '' : 'WHERE enabled = 1';
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM redirects ${where} ORDER BY from_path ASC`
  );
  return rows as RedirectRow[];
}

export async function getRedirectMap(force = false): Promise<Map<string, RedirectRow>> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.map;
  const rows = await listRedirects(false);
  const map = new Map<string, RedirectRow>();
  for (const row of rows) {
    map.set(normalizePath(row.from_path), row);
  }
  cache = { at: Date.now(), map };
  return map;
}

export function invalidateRedirectCache() {
  cache = null;
}

export async function findRedirect(pathname: string): Promise<RedirectRow | null> {
  const map = await getRedirectMap();
  return map.get(normalizePath(pathname)) || null;
}

export async function createRedirect(input: {
  from_path: string;
  to_path: string;
  status_code?: number;
  enabled?: boolean;
}) {
  const from_path = normalizePath(input.from_path);
  const to_path = input.to_path.trim();
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO redirects (from_path, to_path, status_code, enabled) VALUES (?, ?, ?, ?)',
    [from_path, to_path, input.status_code || 301, input.enabled === false ? 0 : 1]
  );
  invalidateRedirectCache();
  return result.insertId;
}

export async function updateRedirect(
  id: number,
  input: Partial<{ from_path: string; to_path: string; status_code: number; enabled: boolean }>
) {
  const fields: string[] = [];
  const params: unknown[] = [];
  if (input.from_path != null) {
    fields.push('from_path = ?');
    params.push(normalizePath(input.from_path));
  }
  if (input.to_path != null) {
    fields.push('to_path = ?');
    params.push(input.to_path.trim());
  }
  if (input.status_code != null) {
    fields.push('status_code = ?');
    params.push(input.status_code);
  }
  if (input.enabled != null) {
    fields.push('enabled = ?');
    params.push(input.enabled ? 1 : 0);
  }
  if (!fields.length) return;
  params.push(id);
  await pool.query(`UPDATE redirects SET ${fields.join(', ')} WHERE id = ?`, params);
  invalidateRedirectCache();
}

export async function deleteRedirect(id: number) {
  await pool.query('DELETE FROM redirects WHERE id = ?', [id]);
  invalidateRedirectCache();
}

export { normalizePath };
