import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { notifyZtoolsAccessApproved, notifyZtoolsToolsAssigned } from '@/lib/ztools-push';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const ZTOOLS_COOKIE = 'zigma_ztools_session';
const SESSION_DAYS = 7;
/** Live public site opened from ZTools cards (not the local /ztools mock tools). */
export const ZTOOLS_PUBLIC_SITE_ORIGIN = 'https://www.zigma-technologies.com';

export function ztoolsPublicToolUrl(routePath: string) {
  const path = routePath.trim();
  if (!path) return ZTOOLS_PUBLIC_SITE_ORIGIN;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${ZTOOLS_PUBLIC_SITE_ORIGIN}${normalized}`;
}

export type ZtoolsUserStatus = 'pending_approval' | 'approved' | 'rejected' | 'disabled';
export type ZtoolsUserSource = 'registration' | 'admin';

export type ZtoolsSession = {
  sub: number;
  email: string;
  name: string;
  company: string | null;
  toolSlugs: string[];
};

export type ZtoolsTool = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  route_path: string;
  enabled: number;
  sort_order: number;
};

export type ZtoolsUser = {
  id: number;
  email: string;
  name: string;
  company: string | null;
  phone: string | null;
  status: ZtoolsUserStatus;
  source: ZtoolsUserSource;
  requested_tool_ids: number[];
  approved_tool_ids: number[];
  admin_notes: string | null;
  approved_by: number | null;
  approved_at: string | null;
  last_login: string | null;
  created_at: string;
};

const DEFAULT_TOOLS: Array<Omit<ZtoolsTool, 'id' | 'enabled'> & { enabled?: boolean }> = [
  {
    slug: 'quotation',
    name: 'Quotation Builder',
    description: 'Create and export professional sales quotations for UPS, solar, and BESS packages.',
    icon: 'quote',
    route_path: '/tools/solution-finder',
    sort_order: 10,
  },
  {
    slug: 'roi-calc',
    name: 'Solar ROI Calculator',
    description: 'Estimate payback, savings, and lifetime returns for rooftop and industrial solar.',
    icon: 'solar',
    route_path: '/tools/solar-roi',
    sort_order: 20,
  },
  {
    slug: 'ups-sizing',
    name: 'UPS Sizing Tool',
    description: 'Size UPS capacity and battery backup for critical load profiles.',
    icon: 'ups',
    route_path: '/tools/ups-calculator',
    sort_order: 30,
  },
  {
    slug: 'load-audit',
    name: 'Load Audit Worksheet',
    description: 'Capture facility loads and export a structured audit summary.',
    icon: 'audit',
    route_path: '/tools/solution-finder',
    sort_order: 40,
  },
  {
    slug: 'battery-life',
    name: 'Battery Life Estimator',
    description: 'Project battery replacement cycles and maintenance windows.',
    icon: 'battery',
    route_path: '/tools/ups-calculator',
    sort_order: 50,
  },
  {
    slug: 'solution-finder',
    name: 'Solution Finder',
    description: 'Match facility needs to UPS, solar, and energy solutions.',
    icon: 'audit',
    route_path: '/tools/solution-finder',
    sort_order: 5,
  },
];

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error('AUTH_SECRET must be set (min 16 characters)');
  return new TextEncoder().encode(secret);
}

function parseIdJson(raw: unknown): number[] {
  if (!raw) return [];
  let list: unknown[] = [];
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw) as unknown[];
    } catch {
      return [];
    }
  } else if (Array.isArray(raw)) {
    list = raw;
  }
  return list.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
}

function mapTool(row: RowDataPacket): ZtoolsTool {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    icon: row.icon ? String(row.icon) : null,
    route_path: String(row.route_path),
    enabled: Number(row.enabled) ? 1 : 0,
    sort_order: Number(row.sort_order) || 0,
  };
}

function mapUser(row: RowDataPacket): ZtoolsUser {
  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
    company: row.company ? String(row.company) : null,
    phone: row.phone ? String(row.phone) : null,
    status: row.status as ZtoolsUserStatus,
    source: row.source as ZtoolsUserSource,
    requested_tool_ids: parseIdJson(row.requested_tool_ids),
    approved_tool_ids: parseIdJson(row.approved_tool_ids),
    admin_notes: row.admin_notes ? String(row.admin_notes) : null,
    approved_by: row.approved_by != null ? Number(row.approved_by) : null,
    approved_at: row.approved_at ? String(row.approved_at) : null,
    last_login: row.last_login ? String(row.last_login) : null,
    created_at: String(row.created_at),
  };
}

let ztoolsSchemaReady = false;

export async function ensureZtoolsSchema() {
  if (ztoolsSchemaReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ztools_tools (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(80) NOT NULL UNIQUE,
      name VARCHAR(120) NOT NULL,
      description TEXT NULL,
      icon VARCHAR(40) NULL,
      route_path VARCHAR(255) NOT NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ztools_users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(120) NOT NULL,
      company VARCHAR(160) NULL,
      phone VARCHAR(40) NULL,
      status ENUM('pending_approval','approved','rejected','disabled') NOT NULL DEFAULT 'pending_approval',
      source ENUM('registration','admin') NOT NULL DEFAULT 'registration',
      requested_tool_ids JSON NULL,
      approved_tool_ids JSON NULL,
      admin_notes TEXT NULL,
      approved_by INT UNSIGNED NULL,
      approved_at DATETIME NULL,
      last_login DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  await pool.query(`ALTER TABLE ztools_tools MODIFY route_path VARCHAR(255) NOT NULL`).catch(() => {});

  for (const tool of DEFAULT_TOOLS) {
    await pool.query(
      `INSERT INTO ztools_tools (slug, name, description, icon, route_path, enabled, sort_order)
       VALUES (?, ?, ?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE route_path = IF(route_path LIKE '/ztools/%' OR route_path = '', VALUES(route_path), route_path)`,
      [tool.slug, tool.name, tool.description, tool.icon, tool.route_path, tool.sort_order]
    );
  }
  ztoolsSchemaReady = true;
}

export async function listZtoolsTools(opts?: { admin?: boolean }) {
  await ensureZtoolsSchema();
  const where = opts?.admin ? '' : 'WHERE enabled = 1';
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM ztools_tools ${where} ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(mapTool);
}

export async function findZtoolsToolBySlug(slug: string) {
  await ensureZtoolsSchema();
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM ztools_tools WHERE slug = ? LIMIT 1', [
    slug,
  ]);
  return rows[0] ? mapTool(rows[0]) : null;
}

export async function createZtoolsTool(input: {
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  route_path: string;
  sort_order?: number;
  enabled?: boolean;
}) {
  await ensureZtoolsSchema();
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO ztools_tools (slug, name, description, icon, route_path, sort_order, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.slug.trim().toLowerCase(),
      input.name.trim(),
      input.description ?? null,
      input.icon ?? null,
      input.route_path.trim(),
      input.sort_order ?? 0,
      input.enabled === false ? 0 : 1,
    ]
  );
  return result.insertId;
}

export async function updateZtoolsTool(
  id: number,
  input: Partial<{
    name: string;
    description: string | null;
    icon: string | null;
    route_path: string;
    sort_order: number;
    enabled: boolean;
  }>
) {
  const fields: string[] = [];
  const params: unknown[] = [];
  const map: Record<string, unknown> = {
    name: input.name,
    description: input.description,
    icon: input.icon,
    route_path: input.route_path,
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
  await pool.query(`UPDATE ztools_tools SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function deleteZtoolsTool(id: number) {
  await pool.query('DELETE FROM ztools_tools WHERE id = ?', [id]);
}

export async function listZtoolsUsers() {
  await ensureZtoolsSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM ztools_users ORDER BY FIELD(status, "pending_approval", "approved", "rejected", "disabled"), id DESC'
  );
  return rows.map(mapUser);
}

export async function findZtoolsUserByEmail(email: string) {
  await ensureZtoolsSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM ztools_users WHERE email = ? LIMIT 1',
    [email.trim().toLowerCase()]
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findZtoolsUserById(id: number) {
  await ensureZtoolsSchema();
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM ztools_users WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function registerZtoolsUser(input: {
  email: string;
  name: string;
  password: string;
  company?: string | null;
  phone?: string | null;
  requested_tool_ids: number[];
}) {
  await ensureZtoolsSchema();
  const email = input.email.trim().toLowerCase();
  const existing = await findZtoolsUserByEmail(email);
  if (existing) throw new Error('EMAIL_EXISTS');

  const tools = await listZtoolsTools();
  const validIds = input.requested_tool_ids.filter((id) => tools.some((t) => t.id === id));
  if (!validIds.length) throw new Error('TOOLS_REQUIRED');

  const hash = await hashPassword(input.password);
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO ztools_users (email, password_hash, name, company, phone, status, source, requested_tool_ids)
     VALUES (?, ?, ?, ?, ?, 'pending_approval', 'registration', ?)`,
    [
      email,
      hash,
      input.name.trim(),
      input.company?.trim() || null,
      input.phone?.trim() || null,
      JSON.stringify(validIds),
    ]
  );
  return result.insertId;
}

export async function createZtoolsUserAdmin(input: {
  email: string;
  name: string;
  password: string;
  company?: string | null;
  phone?: string | null;
  approved_tool_ids: number[];
  auto_approve?: boolean;
}) {
  await ensureZtoolsSchema();
  const email = input.email.trim().toLowerCase();
  const existing = await findZtoolsUserByEmail(email);
  if (existing) throw new Error('EMAIL_EXISTS');

  const tools = await listZtoolsTools({ admin: true });
  const validIds = input.approved_tool_ids.filter((id) => tools.some((t) => t.id === id));
  if (!validIds.length) throw new Error('TOOLS_REQUIRED');

  const hash = await hashPassword(input.password);
  const status = input.auto_approve ? 'approved' : 'pending_approval';
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO ztools_users (email, password_hash, name, company, phone, status, source, approved_tool_ids, requested_tool_ids, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, 'admin', ?, ?, ${status === 'approved' ? 'NOW()' : 'NULL'})`,
    [
      email,
      hash,
      input.name.trim(),
      input.company?.trim() || null,
      input.phone?.trim() || null,
      status,
      JSON.stringify(validIds),
      JSON.stringify(validIds),
    ]
  );
  return result.insertId;
}

export async function updateZtoolsUser(
  id: number,
  input: Partial<{
    name: string;
    company: string | null;
    phone: string | null;
    status: ZtoolsUserStatus;
    approved_tool_ids: number[];
    admin_notes: string | null;
    password: string;
  }>,
  adminId?: number
) {
  const user = await findZtoolsUserById(id);
  if (!user) throw new Error('NOT_FOUND');
  const wasApproved = user.status === 'approved';
  const previousToolIds = [...user.approved_tool_ids];

  if (input.name != null) {
    await pool.query('UPDATE ztools_users SET name = ? WHERE id = ?', [input.name.trim(), id]);
  }
  if (input.company !== undefined) {
    await pool.query('UPDATE ztools_users SET company = ? WHERE id = ?', [input.company?.trim() || null, id]);
  }
  if (input.phone !== undefined) {
    await pool.query('UPDATE ztools_users SET phone = ? WHERE id = ?', [input.phone?.trim() || null, id]);
  }
  if (input.admin_notes !== undefined) {
    await pool.query('UPDATE ztools_users SET admin_notes = ? WHERE id = ?', [
      input.admin_notes?.trim() || null,
      id,
    ]);
  }
  if (input.password) {
    const hash = await hashPassword(input.password);
    await pool.query('UPDATE ztools_users SET password_hash = ? WHERE id = ?', [hash, id]);
  }
  if (input.approved_tool_ids) {
    const tools = await listZtoolsTools({ admin: true });
    const validIds = input.approved_tool_ids.filter((tid) => tools.some((t) => t.id === tid));
    await pool.query('UPDATE ztools_users SET approved_tool_ids = ? WHERE id = ?', [
      JSON.stringify(validIds),
      id,
    ]);
  }
  if (input.status) {
    const approvedAt = input.status === 'approved' ? 'NOW()' : 'NULL';
    const approvedBy = input.status === 'approved' && adminId ? adminId : null;
    await pool.query(
      `UPDATE ztools_users SET status = ?, approved_at = ${approvedAt}, approved_by = ? WHERE id = ?`,
      [input.status, approvedBy, id]
    );
  }

  const updated = await findZtoolsUserById(id);
  if (updated) {
    if (input.status === 'approved' && !wasApproved) {
      void notifyZtoolsAccessApproved(id);
    } else if (
      updated.status === 'approved' &&
      input.approved_tool_ids &&
      updated.approved_tool_ids.length > previousToolIds.length
    ) {
      const added = updated.approved_tool_ids.filter((toolId) => !previousToolIds.includes(toolId)).length;
      if (added > 0) void notifyZtoolsToolsAssigned(id, added);
    }
  }
}

export async function deleteZtoolsUser(id: number) {
  await pool.query('DELETE FROM ztools_users WHERE id = ?', [id]);
}

export async function getApprovedToolsForUser(user: ZtoolsUser): Promise<ZtoolsTool[]> {
  if (user.status !== 'approved') return [];
  const all = await listZtoolsTools();
  const ids = new Set(user.approved_tool_ids);
  return all.filter((t) => ids.has(t.id));
}

export async function authenticateZtoolsUser(email: string, password: string) {
  await ensureZtoolsSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM ztools_users WHERE email = ? LIMIT 1',
    [email.trim().toLowerCase()]
  );
  const row = rows[0];
  if (!row) return { error: 'INVALID' as const };
  const user = mapUser(row);
  if (user.status === 'pending_approval') return { error: 'PENDING' as const, user };
  if (user.status === 'rejected') return { error: 'REJECTED' as const, user };
  if (user.status === 'disabled') return { error: 'DISABLED' as const, user };

  const ok = await verifyPassword(password, String(row.password_hash));
  if (!ok) return { error: 'INVALID' as const };

  await pool.query('UPDATE ztools_users SET last_login = NOW() WHERE id = ?', [user.id]);
  const tools = await getApprovedToolsForUser(user);
  return { user, tools };
}

export async function createZtoolsSessionToken(user: ZtoolsUser, toolSlugs: string[]) {
  return new SignJWT({
    email: user.email,
    name: user.name,
    company: user.company,
    toolSlugs,
    kind: 'ztools',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifyZtoolsSessionToken(token: string): Promise<ZtoolsSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.kind !== 'ztools') return null;
    const sub = Number(payload.sub);
    if (!sub || !payload.email || !payload.name) return null;
    const toolSlugs = Array.isArray(payload.toolSlugs)
      ? payload.toolSlugs.filter((s): s is string => typeof s === 'string')
      : [];
    return {
      sub,
      email: String(payload.email),
      name: String(payload.name),
      company: payload.company ? String(payload.company) : null,
      toolSlugs,
    };
  } catch {
    return null;
  }
}

export async function setZtoolsSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(ZTOOLS_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearZtoolsSessionCookie() {
  const jar = await cookies();
  jar.delete(ZTOOLS_COOKIE);
}

export async function getZtoolsSession(request?: Request): Promise<ZtoolsSession | null> {
  let token: string | undefined;

  if (request) {
    const auth = request.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) {
      token = auth.slice(7).trim();
    }
  }

  if (!token) {
    const jar = await cookies();
    token = jar.get(ZTOOLS_COOKIE)?.value;
  }

  if (!token) return null;
  const session = await verifyZtoolsSessionToken(token);
  if (!session) return null;

  const user = await findZtoolsUserById(session.sub);
  if (!user || user.status !== 'approved') return null;

  const tools = await getApprovedToolsForUser(user);
  const slugs = tools.map((t) => t.slug);
  return { ...session, toolSlugs: slugs };
}

export async function requireZtoolsSession(request?: Request): Promise<ZtoolsSession> {
  const session = await getZtoolsSession(request);
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

export async function requireZtoolsTool(slug: string, request?: Request): Promise<ZtoolsSession> {
  const session = await requireZtoolsSession(request);
  if (!session.toolSlugs.includes(slug)) throw new Error('FORBIDDEN');
  return session;
}

/** Short-lived token so the native app can open a WebView with an authenticated session. */
export async function createZtoolsBridgeToken(sessionToken: string, redirectPath: string) {
  return new SignJWT({
    kind: 'ztools_bridge',
    sessionToken,
    redirect: redirectPath,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('60s')
    .sign(getSecret());
}

export async function verifyZtoolsBridgeToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.kind !== 'ztools_bridge') return null;
    const sessionToken = typeof payload.sessionToken === 'string' ? payload.sessionToken : null;
    const redirect = typeof payload.redirect === 'string' ? payload.redirect : null;
    if (!sessionToken || !redirect) return null;
    if (!redirect.startsWith('/ztools/')) return null;
    const session = await verifyZtoolsSessionToken(sessionToken);
    if (!session) return null;
    return { sessionToken, redirect };
  } catch {
    return null;
  }
}

export { ZTOOLS_COOKIE, DEFAULT_TOOLS };
