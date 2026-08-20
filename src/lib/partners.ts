import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { cookiePath } from '@/lib/base-path';

const PARTNER_COOKIE = 'zigma_partner_session';
const SESSION_DAYS = 7;

export type PartnerSession = {
  sub: number;
  email: string;
  name: string;
  company: string | null;
};

export type PartnerUser = {
  id: number;
  email: string;
  name: string;
  company: string | null;
  enabled: number;
  last_login: string | null;
  created_at?: string;
};

export type PartnerDocument = {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
  doc_type: string;
  sort_order: number;
  enabled: number;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error('AUTH_SECRET must be set (min 16 characters)');
  return new TextEncoder().encode(secret);
}

function mapUser(row: RowDataPacket): PartnerUser {
  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
    company: row.company ? String(row.company) : null,
    enabled: Number(row.enabled) ? 1 : 0,
    last_login: row.last_login ? String(row.last_login) : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

function mapDoc(row: RowDataPacket): PartnerDocument {
  return {
    id: Number(row.id),
    title: String(row.title),
    description: row.description ?? null,
    file_url: String(row.file_url),
    doc_type: String(row.doc_type || 'price_list'),
    sort_order: Number(row.sort_order) || 0,
    enabled: Number(row.enabled) ? 1 : 0,
  };
}

export async function listPartnerUsers() {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, email, name, company, enabled, last_login, created_at FROM partner_users ORDER BY id ASC'
  );
  return rows.map(mapUser);
}

export async function createPartnerUser(input: {
  email: string;
  name: string;
  password: string;
  company?: string | null;
}) {
  const hash = await hashPassword(input.password);
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO partner_users (email, name, password_hash, company, enabled)
     VALUES (?, ?, ?, ?, 1)`,
    [input.email.trim().toLowerCase(), input.name.trim(), hash, input.company?.trim() || null]
  );
  return result.insertId;
}

export async function deletePartnerUser(id: number) {
  await pool.query('DELETE FROM partner_users WHERE id = ?', [id]);
}

export async function authenticatePartner(email: string, password: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM partner_users WHERE email = ? AND enabled = 1 LIMIT 1',
    [email.trim().toLowerCase()]
  );
  const row = rows[0];
  if (!row) return null;
  const ok = await verifyPassword(password, String(row.password_hash));
  if (!ok) return null;
  await pool.query('UPDATE partner_users SET last_login = NOW() WHERE id = ?', [row.id]);
  return mapUser(row);
}

export async function createPartnerSessionToken(user: PartnerUser) {
  return new SignJWT({
    email: user.email,
    name: user.name,
    company: user.company,
    kind: 'partner',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifyPartnerSessionToken(token: string): Promise<PartnerSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.kind !== 'partner') return null;
    const sub = Number(payload.sub);
    if (!sub || !payload.email || !payload.name) return null;
    return {
      sub,
      email: String(payload.email),
      name: String(payload.name),
      company: payload.company ? String(payload.company) : null,
    };
  } catch {
    return null;
  }
}

export async function setPartnerSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(PARTNER_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: cookiePath(),
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearPartnerSessionCookie() {
  const jar = await cookies();
  jar.set(PARTNER_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: cookiePath(),
    maxAge: 0,
  });
}

export async function getPartnerSession(): Promise<PartnerSession | null> {
  const jar = await cookies();
  const token = jar.get(PARTNER_COOKIE)?.value;
  if (!token) return null;
  return verifyPartnerSessionToken(token);
}

export async function listPartnerDocuments(opts?: { admin?: boolean }) {
  const where = opts?.admin ? '' : 'WHERE enabled = 1';
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM partner_documents ${where} ORDER BY sort_order ASC, id DESC`
  );
  return rows.map(mapDoc);
}

export async function createPartnerDocument(input: {
  title: string;
  description?: string | null;
  file_url: string;
  doc_type?: string;
  sort_order?: number;
  enabled?: boolean;
}) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO partner_documents (title, description, file_url, doc_type, sort_order, enabled)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.title,
      input.description ?? null,
      input.file_url,
      input.doc_type || 'price_list',
      input.sort_order ?? 0,
      input.enabled === false ? 0 : 1,
    ]
  );
  return result.insertId;
}

export async function updatePartnerDocument(
  id: number,
  input: Partial<{
    title: string;
    description: string | null;
    file_url: string;
    doc_type: string;
    sort_order: number;
    enabled: boolean;
  }>
) {
  const fields: string[] = [];
  const params: unknown[] = [];
  const map: Record<string, unknown> = {
    title: input.title,
    description: input.description,
    file_url: input.file_url,
    doc_type: input.doc_type,
    sort_order: input.sort_order,
    enabled: input.enabled === undefined ? undefined : input.enabled ? 1 : 0,
  };
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined) {
      fields.push(`${k} = ?`);
      params.push(v);
    }
  }
  if (!fields.length) return;
  params.push(id);
  await pool.query(`UPDATE partner_documents SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function deletePartnerDocument(id: number) {
  await pool.query('DELETE FROM partner_documents WHERE id = ?', [id]);
}

export async function seedPartnerDocuments() {
  const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS c FROM partner_documents');
  if (Number(countRows[0]?.c) > 0) return { inserted: 0, skipped: true as const };
  const docs = [
    {
      title: 'Authorized partner price list (sample)',
      description: 'Indicative channel pricing — replace with live PDF in Media.',
      file_url: '/assets/uploads/documents/.gitkeep',
      doc_type: 'price_list',
    },
    {
      title: 'Warranty & RMA guidelines',
      description: 'Partner support workflow for UPS and battery returns.',
      file_url: '/assets/images/ocv-iso-9001-2015-certificate-of-registr.jpg',
      doc_type: 'policy',
    },
  ];
  for (const d of docs) {
    await createPartnerDocument(d);
  }
  return { inserted: docs.length, skipped: false as const };
}

export { PARTNER_COOKIE };
