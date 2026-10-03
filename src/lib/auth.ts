import { createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import type { AdminScreenKey } from '@/lib/admin-screens';
import { hasScreenAccess } from '@/lib/admin-screens';
import { ensureAdminRolesSchema, getScreensForUser, resolveRoleIdFor } from '@/lib/admin-roles';
import { cookiePathsForAuth } from '@/lib/base-path';

const COOKIE_NAME = 'zigma_admin_session';
const SESSION_DAYS = 7;

export type AdminSession = {
  sub: number;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  roleId: number | null;
  roleName: string | null;
  screens: AdminScreenKey[] | '*';
  /** Fingerprint of the password the session was issued for; a password change ends the session. */
  pv?: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET must be set (min 16 characters)');
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function passwordVersion(passwordHash: string) {
  return createHash('sha256').update(passwordHash).digest('base64url').slice(0, 16);
}

export async function createSessionToken(payload: AdminSession) {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
    roleId: payload.roleId,
    roleName: payload.roleName,
    screens: payload.screens,
    ...(payload.pv ? { pv: payload.pv } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(payload.sub))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

function parseScreensClaim(raw: unknown): AdminScreenKey[] | '*' {
  if (raw === '*') return '*';
  if (!Array.isArray(raw)) return [];
  return raw.filter((k): k is AdminScreenKey => typeof k === 'string');
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = Number(payload.sub);
    if (!sub || !payload.email || !payload.name || !payload.role) return null;
    const role = payload.role === 'editor' ? 'editor' : 'admin';
    const roleId = payload.roleId != null ? Number(payload.roleId) : null;
    const roleName = payload.roleName != null ? String(payload.roleName) : null;
    let screens = parseScreensClaim(payload.screens);
    if (role === 'admin') screens = '*';
    return {
      sub,
      email: String(payload.email),
      name: String(payload.name),
      role,
      roleId: Number.isFinite(roleId) ? roleId : null,
      roleName,
      screens,
      pv: typeof payload.pv === 'string' ? payload.pv : undefined,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  const opts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
  // Write on `/` and basePath so Path mismatches after PreProd deploys cannot orphan the session.
  for (const path of cookiePathsForAuth()) {
    jar.set(COOKIE_NAME, token, { ...opts, path });
  }
}

export async function clearSessionCookie() {
  const jar = await cookies();
  const opts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  };
  for (const path of cookiePathsForAuth()) {
    jar.set(COOKIE_NAME, '', { ...opts, path });
  }
}

function tokenFromCookieHeader(header: string | null): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    if (name !== COOKIE_NAME) continue;
    return decodeURIComponent(trimmed.slice(eq + 1).trim());
  }
  return undefined;
}

export async function getSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  let token = jar.get(COOKIE_NAME)?.value;
  if (!token) {
    const h = await headers();
    token = tokenFromCookieHeader(h.get('cookie'));
  }
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  return resolveLiveSession(session);
}

/**
 * The account as it is now: deleted users and sessions from before a password change are
 * rejected, and role / screen changes apply on the next request without signing in again.
 * Read fresh every time — the proxy and route handlers do not share memory, so a cache could
 * not be cleared from both when an account changes.
 */
export async function resolveLiveSession(session: AdminSession): Promise<AdminSession | null> {
  try {
    const row = await findAdminById(session.sub);
    if (!row || (session.pv && session.pv !== passwordVersion(row.password_hash))) return null;
    return {
      sub: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      roleId: row.role_id,
      roleName: row.role_name,
      screens: await getScreensForUser({ role: row.role, role_id: row.role_id }),
      pv: session.pv,
    };
  } catch (error) {
    console.error('Admin session lookup failed', error);
    return null;
  }
}

export async function requireSession(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await requireSession();
  if (session.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return session;
}

export async function requireScreen(screen: AdminScreenKey): Promise<AdminSession> {
  const session = await requireSession();
  if (!hasScreenAccess(session.screens, screen)) {
    throw new Error('FORBIDDEN');
  }
  return session;
}

export type AdminUserRow = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  role_id: number | null;
  role_name: string | null;
  last_login: Date | string | null;
  created_at: Date | string;
};

export async function buildSessionForUser(user: {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  role_id: number | null;
  role_name?: string | null;
  password_hash: string;
}): Promise<AdminSession> {
  const screens = await getScreensForUser({ role: user.role, role_id: user.role_id });
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleId: user.role_id,
    roleName: user.role_name ?? null,
    screens,
    pv: passwordVersion(user.password_hash),
  };
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  await ensureAdminRolesSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.email, u.name, u.role, u.role_id, r.name AS role_name, u.last_login, u.created_at
     FROM admin_users u
     LEFT JOIN admin_roles r ON r.id = u.role_id
     ORDER BY u.id ASC`
  );
  return rows as AdminUserRow[];
}

export async function createAdminUser(input: {
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'editor';
  role_id?: number | null;
}) {
  const email = input.email.toLowerCase().trim();
  const existing = await findAdminByEmail(email);
  if (existing) throw new Error('EMAIL_EXISTS');
  const role_id = await resolveRoleIdFor(input.role, input.role_id);
  const password_hash = await hashPassword(input.password);

  const [result] = await pool.query(
    'INSERT INTO admin_users (email, password_hash, name, role, role_id) VALUES (?, ?, ?, ?, ?)',
    [email, password_hash, input.name.trim(), input.role, role_id]
  );
  return (result as { insertId: number }).insertId;
}

export async function deleteAdminUser(id: number, actorId: number) {
  if (id === actorId) throw new Error('CANNOT_DELETE_SELF');
  const target = await findAdminById(id);
  if (!target) throw new Error('NOT_FOUND');
  if (target.role === 'admin' && (await countFullAdmins()) <= 1) throw new Error('LAST_ADMIN');
  await pool.query('DELETE FROM admin_users WHERE id = ?', [id]);
}

/**
 * Updates an account in one write. Access is validated (existing non-admin role for role-based
 * accounts, never your own, never the last full admin); a new password ends the user's sessions.
 */
export async function updateAdminUser(
  id: number,
  input: {
    name?: string;
    email?: string;
    role?: 'admin' | 'editor';
    role_id?: number | null;
    password?: string;
  },
  actorId: number
) {
  const target = await findAdminById(id);
  if (!target) throw new Error('NOT_FOUND');

  const sets: string[] = [];
  const values: unknown[] = [];
  const set = (column: string, value: unknown) => {
    sets.push(`${column} = ?`);
    values.push(value);
  };

  if (input.name != null) set('name', input.name.trim());

  if (input.email != null) {
    const email = input.email.toLowerCase().trim();
    if (email !== target.email) {
      if (await findAdminByEmail(email)) throw new Error('EMAIL_EXISTS');
      set('email', email);
    }
  }

  if (input.role !== undefined || input.role_id !== undefined) {
    const role = input.role ?? target.role;
    const requested = input.role_id !== undefined ? input.role_id : target.role === 'editor' ? target.role_id : null;
    const roleId = await resolveRoleIdFor(role, requested);
    if (role !== target.role || roleId !== target.role_id) {
      if (id === actorId) throw new Error('OWN_ACCESS');
      if (target.role === 'admin' && role === 'editor' && (await countFullAdmins()) <= 1) {
        throw new Error('LAST_ADMIN');
      }
      set('role', role);
      set('role_id', roleId);
    }
  }

  if (input.password) set('password_hash', await hashPassword(input.password));

  if (sets.length) {
    await pool.query(`UPDATE admin_users SET ${sets.join(', ')} WHERE id = ?`, [...values, id]);
  }
}

async function countFullAdmins() {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS c FROM admin_users WHERE role = 'admin'");
  return Number(rows[0]?.c || 0);
}

export async function findAdminByEmail(email: string) {
  await ensureAdminRolesSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.email, u.password_hash, u.name, u.role, u.role_id, r.name AS role_name
     FROM admin_users u
     LEFT JOIN admin_roles r ON r.id = u.role_id
     WHERE u.email = ? LIMIT 1`,
    [email.toLowerCase()]
  );
  return rows[0] as
    | {
        id: number;
        email: string;
        password_hash: string;
        name: string;
        role: 'admin' | 'editor';
        role_id: number | null;
        role_name: string | null;
      }
    | undefined;
}

export async function touchLastLogin(userId: number) {
  await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [userId]);
}

export async function findAdminById(id: number) {
  await ensureAdminRolesSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.email, u.password_hash, u.name, u.role, u.role_id, r.name AS role_name
     FROM admin_users u
     LEFT JOIN admin_roles r ON r.id = u.role_id
     WHERE u.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] as
    | {
        id: number;
        email: string;
        password_hash: string;
        name: string;
        role: 'admin' | 'editor';
        role_id: number | null;
        role_name: string | null;
      }
    | undefined;
}

export async function updateAdminPassword(userId: number, passwordHash: string) {
  await pool.query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
}

export async function ensureSeedAdmin() {
  await ensureAdminRolesSchema();
  const email = (process.env.ADMIN_EMAIL || 'admin@zigma-technologies.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'ChangeMeNow!123';
  const name = process.env.ADMIN_NAME || 'Site Admin';

  // First-run only: once any account exists, deleting the default one must not let it be recreated.
  const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS c FROM admin_users');
  if (Number(countRows[0]?.c || 0) > 0) return { created: false, email };

  const [adminRole] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM admin_roles WHERE slug = 'admin' LIMIT 1"
  );
  const role_id = adminRole[0]?.id ?? null;

  const password_hash = await hashPassword(password);
  await pool.query(
    'INSERT INTO admin_users (email, password_hash, name, role, role_id) VALUES (?, ?, ?, ?, ?)',
    [email, password_hash, name, 'admin', role_id]
  );
  return { created: true, email };
}

export { COOKIE_NAME };
