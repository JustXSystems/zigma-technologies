import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import {
  ADMIN_SCREEN_KEYS,
  DEFAULT_EDITOR_SCREENS,
  normalizeRoleScreens,
  type AdminScreenKey,
} from '@/lib/admin-screens';

export type AdminRoleRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  screens: AdminScreenKey[];
  is_system: boolean;
  userCount: number;
  created_at: Date | string;
  updated_at: Date | string;
};

const SYSTEM_ADMIN_SLUG = 'admin';
const SYSTEM_EDITOR_SLUG = 'editor';

function parseScreens(raw: unknown): AdminScreenKey[] {
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
  } else {
    return [];
  }
  return normalizeRoleScreens(list.filter((k): k is string => typeof k === 'string'));
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

let schemaReady: Promise<void> | null = null;

/** Creates / backfills the roles schema once per server process (retried after a failure). */
export function ensureAdminRolesSchema(): Promise<void> {
  schemaReady ??= migrateAdminRolesSchema().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

async function migrateAdminRolesSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_roles (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(80) NOT NULL UNIQUE,
      description VARCHAR(255) NULL,
      screens JSON NOT NULL,
      is_system TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  const [colRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'role_id'`
  );
  if (Number(colRows[0]?.c || 0) === 0) {
    await pool.query('ALTER TABLE admin_users ADD COLUMN role_id INT UNSIGNED NULL AFTER role');
    await pool.query(
      'ALTER TABLE admin_users ADD CONSTRAINT fk_admin_users_role FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE SET NULL'
    ).catch(() => {
      /* FK may already exist on re-run */
    });
  }

  await seedSystemRoles();
  await backfillUserRoleIds();
}

async function seedSystemRoles() {
  const [adminRows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM admin_roles WHERE slug = ? LIMIT 1',
    [SYSTEM_ADMIN_SLUG]
  );
  if (!adminRows[0]) {
    await pool.query(
      `INSERT INTO admin_roles (name, slug, description, screens, is_system) VALUES (?, ?, ?, ?, 1)`,
      [
        'Full Admin',
        SYSTEM_ADMIN_SLUG,
        'Unrestricted access to every admin screen.',
        JSON.stringify(ADMIN_SCREEN_KEYS),
      ]
    );
  }

  const [editorRows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM admin_roles WHERE slug = ? LIMIT 1',
    [SYSTEM_EDITOR_SLUG]
  );
  if (!editorRows[0]) {
    await pool.query(
      `INSERT INTO admin_roles (name, slug, description, screens, is_system) VALUES (?, ?, ?, ?, 1)`,
      [
        'Editor',
        SYSTEM_EDITOR_SLUG,
        'Default content and leads access (legacy editor permissions).',
        JSON.stringify(DEFAULT_EDITOR_SCREENS),
      ]
    );
  }
}

async function backfillUserRoleIds() {
  const [adminRole] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM admin_roles WHERE slug = ? LIMIT 1',
    [SYSTEM_ADMIN_SLUG]
  );
  const [editorRole] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM admin_roles WHERE slug = ? LIMIT 1',
    [SYSTEM_EDITOR_SLUG]
  );
  const adminRoleId = adminRole[0]?.id;
  const editorRoleId = editorRole[0]?.id;
  if (!adminRoleId || !editorRoleId) return;

  await pool.query(
    `UPDATE admin_users SET role_id = ? WHERE role = 'admin' AND role_id IS NULL`,
    [adminRoleId]
  );
  await pool.query(
    `UPDATE admin_users SET role_id = ? WHERE role = 'editor' AND role_id IS NULL`,
    [editorRoleId]
  );
}

const ROLE_COLUMNS = `r.id, r.name, r.slug, r.description, r.screens, r.is_system, r.created_at, r.updated_at,
  (SELECT COUNT(*) FROM admin_users u WHERE u.role_id = r.id) AS user_count`;

function toRole(row: RowDataPacket): AdminRoleRow {
  return {
    id: row.id as number,
    name: row.name as string,
    slug: row.slug as string,
    description: (row.description as string | null) ?? null,
    screens: parseScreens(row.screens),
    is_system: Boolean(row.is_system),
    userCount: Number(row.user_count || 0),
    created_at: row.created_at as Date | string,
    updated_at: row.updated_at as Date | string,
  };
}

/** System roles first (Full Admin, then Editor), then custom roles by name. */
export async function listAdminRoles(): Promise<AdminRoleRow[]> {
  await ensureAdminRolesSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${ROLE_COLUMNS} FROM admin_roles r ORDER BY r.is_system DESC, r.slug = ? DESC, r.name ASC`,
    [SYSTEM_ADMIN_SLUG]
  );
  return rows.map(toRole);
}

export async function findAdminRoleById(id: number): Promise<AdminRoleRow | null> {
  await ensureAdminRolesSchema();
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT ${ROLE_COLUMNS} FROM admin_roles r WHERE r.id = ? LIMIT 1`, [id]);
  return rows[0] ? toRole(rows[0]) : null;
}

export async function getScreensForUser(input: {
  role: 'admin' | 'editor';
  role_id: number | null;
}): Promise<AdminScreenKey[] | '*'> {
  if (input.role === 'admin') return '*';

  await ensureAdminRolesSchema();
  if (input.role_id) {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT screens FROM admin_roles WHERE id = ? LIMIT 1', [input.role_id]);
    if (rows[0]) return parseScreens(rows[0].screens);
  }

  const [editorRole] = await pool.query<RowDataPacket[]>(
    'SELECT screens FROM admin_roles WHERE slug = ? LIMIT 1',
    [SYSTEM_EDITOR_SLUG]
  );
  if (editorRole[0]) return parseScreens(editorRole[0].screens);
  return normalizeRoleScreens(DEFAULT_EDITOR_SCREENS);
}

async function assertUniqueName(name: string, exceptId?: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM admin_roles WHERE LOWER(name) = LOWER(?) AND id <> ? LIMIT 1',
    [name, exceptId ?? 0]
  );
  if (rows[0]) throw new Error('ROLE_NAME_EXISTS');
}

function roleScreens(keys: readonly string[]) {
  const screens = normalizeRoleScreens(keys);
  if (!screens.length) throw new Error('SCREENS_REQUIRED');
  return screens;
}

export async function createAdminRole(input: { name: string; description?: string | null; screens: readonly string[] }) {
  await ensureAdminRolesSchema();
  const name = input.name.trim();
  if (!name) throw new Error('NAME_REQUIRED');
  const screens = roleScreens(input.screens);
  await assertUniqueName(name);

  const base = slugify(name) || 'role';
  const [taken] = await pool.query<RowDataPacket[]>('SELECT id FROM admin_roles WHERE slug = ? LIMIT 1', [base]);
  const slug = taken[0] ? `${base.slice(0, 50)}-${Date.now().toString(36)}` : base;

  const [result] = await pool.query(
    `INSERT INTO admin_roles (name, slug, description, screens, is_system) VALUES (?, ?, ?, ?, 0)`,
    [name, slug, input.description?.trim() || null, JSON.stringify(screens)]
  );
  return (result as { insertId: number }).insertId;
}

/**
 * Custom roles: name, description and screens. The system Editor role keeps its name but its
 * description and screens can change; Full Admin is fixed. Holders see changes on their next request.
 */
export async function updateAdminRole(
  id: number,
  input: { name?: string; description?: string | null; screens?: readonly string[] }
) {
  const role = await findAdminRoleById(id);
  if (!role) throw new Error('NOT_FOUND');
  if (role.slug === SYSTEM_ADMIN_SLUG) throw new Error('SYSTEM_ROLE');

  const sets: string[] = [];
  const values: unknown[] = [];
  if (input.name != null && input.name.trim() !== role.name) {
    if (role.is_system) throw new Error('SYSTEM_ROLE_NAME');
    const name = input.name.trim();
    if (!name) throw new Error('NAME_REQUIRED');
    await assertUniqueName(name, id);
    sets.push('name = ?');
    values.push(name);
  }
  if (input.description !== undefined) {
    sets.push('description = ?');
    values.push(input.description?.trim() || null);
  }
  if (input.screens != null) {
    sets.push('screens = ?');
    values.push(JSON.stringify(roleScreens(input.screens)));
  }
  if (sets.length) await pool.query(`UPDATE admin_roles SET ${sets.join(', ')} WHERE id = ?`, [...values, id]);
}

/** Deletes a custom role; members move to `reassignTo` first (required when the role is in use). */
export async function deleteAdminRole(id: number, reassignTo?: number | null) {
  const role = await findAdminRoleById(id);
  if (!role) throw new Error('NOT_FOUND');
  if (role.is_system) throw new Error('SYSTEM_ROLE');

  if (role.userCount > 0) {
    if (!reassignTo) throw new Error('ROLE_IN_USE');
    if (reassignTo === id) throw new Error('REASSIGN_SAME');
    const target = await findAdminRoleById(reassignTo);
    if (!target) throw new Error('ROLE_NOT_FOUND');
    if (target.slug === SYSTEM_ADMIN_SLUG) throw new Error('ROLE_IS_ADMIN');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (role.userCount > 0) {
      await conn.query("UPDATE admin_users SET role = 'editor', role_id = ? WHERE role_id = ?", [reassignTo, id]);
    }
    await conn.query('DELETE FROM admin_roles WHERE id = ?', [id]);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Resolves the role an account should be stored with. Full admins always get the system admin
 * role; role-based accounts need an existing non-admin role (the system Editor role by default).
 */
export async function resolveRoleIdFor(role: 'admin' | 'editor', roleId: number | null | undefined) {
  if (role === 'editor' && roleId) {
    const found = await findAdminRoleById(roleId);
    if (!found) throw new Error('ROLE_NOT_FOUND');
    if (found.slug === SYSTEM_ADMIN_SLUG) throw new Error('ROLE_IS_ADMIN');
    return found.id;
  }
  await ensureAdminRolesSchema();
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM admin_roles WHERE slug = ? LIMIT 1', [
    role === 'admin' ? SYSTEM_ADMIN_SLUG : SYSTEM_EDITOR_SLUG,
  ]);
  return (rows[0]?.id as number | undefined) ?? null;
}

export { SYSTEM_ADMIN_SLUG, SYSTEM_EDITOR_SLUG };
