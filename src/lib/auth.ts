import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import type { AdminScreenKey } from '@/lib/admin-screens';
import { hasScreenAccess } from '@/lib/admin-screens';
import { ensureAdminRolesSchema, getScreensForUser } from '@/lib/admin-roles';

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

export async function createSessionToken(payload: AdminSession) {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
    roleId: payload.roleId,
    roleName: payload.roleName,
    screens: payload.screens,
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
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;

  if (session.role === 'editor' && session.screens !== '*' && session.screens.length === 0) {
    const user = await findAdminById(session.sub);
    if (!user) return null;
    const screens = await getScreensForUser({ role: user.role, role_id: user.role_id });
    return {
      ...session,
      roleId: user.role_id,
      roleName: user.role_name,
      screens,
    };
  }

  return session;
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
  await ensureAdminRolesSchema();
  const email = input.email.toLowerCase().trim();
  const existing = await findAdminByEmail(email);
  if (existing) throw new Error('EMAIL_EXISTS');
  const password_hash = await hashPassword(input.password);

  let role_id = input.role_id ?? null;
  if (input.role === 'admin') {
    const [adminRole] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM admin_roles WHERE slug = 'admin' LIMIT 1"
    );
    role_id = (adminRole[0]?.id as number) ?? role_id;
  } else if (!role_id) {
    const [editorRole] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM admin_roles WHERE slug = 'editor' LIMIT 1"
    );
    role_id = (editorRole[0]?.id as number) ?? null;
  }

  const [result] = await pool.query(
    'INSERT INTO admin_users (email, password_hash, name, role, role_id) VALUES (?, ?, ?, ?, ?)',
    [email, password_hash, input.name.trim(), input.role, role_id]
  );
  return (result as { insertId: number }).insertId;
}

export async function deleteAdminUser(id: number, actorId: number) {
  if (id === actorId) throw new Error('CANNOT_DELETE_SELF');
  const [countRows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS c FROM admin_users WHERE role = 'admin'"
  );
  const adminCount = Number(countRows[0]?.c || 0);
  const target = await findAdminById(id);
  if (!target) throw new Error('NOT_FOUND');
  if (target.role === 'admin' && adminCount <= 1) throw new Error('LAST_ADMIN');
  await pool.query('DELETE FROM admin_users WHERE id = ?', [id]);
}

export async function updateAdminUser(
  id: number,
  input: { name?: string; role?: 'admin' | 'editor'; role_id?: number | null; password?: string },
  actorId: number
) {
  const target = await findAdminById(id);
  if (!target) throw new Error('NOT_FOUND');

  if (input.role && input.role !== target.role) {
    if (target.role === 'admin' && input.role === 'editor') {
      const [countRows] = await pool.query<RowDataPacket[]>(
        "SELECT COUNT(*) AS c FROM admin_users WHERE role = 'admin'"
      );
      if (Number(countRows[0]?.c || 0) <= 1) throw new Error('LAST_ADMIN');
    }
  }

  if (input.name != null) {
    await pool.query('UPDATE admin_users SET name = ? WHERE id = ?', [input.name.trim(), id]);
  }
  if (input.role != null) {
    await pool.query('UPDATE admin_users SET role = ? WHERE id = ?', [input.role, id]);
    if (input.role === 'admin') {
      const [adminRole] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM admin_roles WHERE slug = 'admin' LIMIT 1"
      );
      if (adminRole[0]?.id) {
        await pool.query('UPDATE admin_users SET role_id = ? WHERE id = ?', [adminRole[0].id, id]);
      }
    }
  }
  if (input.role_id !== undefined) {
    await pool.query('UPDATE admin_users SET role_id = ? WHERE id = ?', [input.role_id, id]);
  }
  if (input.password) {
    const password_hash = await hashPassword(input.password);
    await updateAdminPassword(id, password_hash);
  }
  void actorId;
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

  const existing = await findAdminByEmail(email);
  if (existing) return { created: false, email };

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
