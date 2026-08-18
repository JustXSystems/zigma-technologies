import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import {
  ADMIN_SCREEN_KEYS,
  DEFAULT_EDITOR_SCREENS,
  isAdminScreenKey,
  type AdminScreenKey,
} from '@/lib/admin-screens';

export type AdminRoleRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  screens: AdminScreenKey[];
  is_system: boolean;
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
  return list.filter((k): k is AdminScreenKey => typeof k === 'string' && isAdminScreenKey(k));
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function ensureAdminRolesSchema() {
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

export async function listAdminRoles(): Promise<AdminRoleRow[]> {
  await ensureAdminRolesSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, name, slug, description, screens, is_system, created_at, updated_at FROM admin_roles ORDER BY is_system DESC, name ASC'
  );
  return rows.map((row) => ({
    id: row.id as number,
    name: row.name as string,
    slug: row.slug as string,
    description: (row.description as string | null) ?? null,
    screens: parseScreens(row.screens),
    is_system: Boolean(row.is_system),
    created_at: row.created_at as Date | string,
    updated_at: row.updated_at as Date | string,
  }));
}

export async function findAdminRoleById(id: number): Promise<AdminRoleRow | null> {
  await ensureAdminRolesSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, name, slug, description, screens, is_system, created_at, updated_at FROM admin_roles WHERE id = ? LIMIT 1',
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id as number,
    name: row.name as string,
    slug: row.slug as string,
    description: (row.description as string | null) ?? null,
    screens: parseScreens(row.screens),
    is_system: Boolean(row.is_system),
    created_at: row.created_at as Date | string,
    updated_at: row.updated_at as Date | string,
  };
}

export async function getScreensForUser(input: {
  role: 'admin' | 'editor';
  role_id: number | null;
}): Promise<AdminScreenKey[] | '*'> {
  if (input.role === 'admin') return '*';

  await ensureAdminRolesSchema();
  if (input.role_id) {
    const role = await findAdminRoleById(input.role_id);
    if (role) return role.screens;
  }

  const [editorRole] = await pool.query<RowDataPacket[]>(
    'SELECT screens FROM admin_roles WHERE slug = ? LIMIT 1',
    [SYSTEM_EDITOR_SLUG]
  );
  if (editorRole[0]) return parseScreens(editorRole[0].screens);
  return DEFAULT_EDITOR_SCREENS;
}

export async function createAdminRole(input: {
  name: string;
  description?: string;
  screens: AdminScreenKey[];
}) {
  await ensureAdminRolesSchema();
  const name = input.name.trim();
  if (!name) throw new Error('NAME_REQUIRED');
  const screens = input.screens.filter((k) => isAdminScreenKey(k) && k !== 'users' && k !== 'roles' && k !== 'newClient');
  if (!screens.length) throw new Error('SCREENS_REQUIRED');

  let slug = slugify(name);
  if (!slug) slug = `role-${Date.now()}`;
  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM admin_roles WHERE slug = ? LIMIT 1',
    [slug]
  );
  if (existing[0]) slug = `${slug}-${Date.now()}`;

  const [result] = await pool.query(
    `INSERT INTO admin_roles (name, slug, description, screens, is_system) VALUES (?, ?, ?, ?, 0)`,
    [name, slug, input.description?.trim() || null, JSON.stringify(screens)]
  );
  return (result as { insertId: number }).insertId;
}

export async function updateAdminRole(
  id: number,
  input: { name?: string; description?: string; screens?: AdminScreenKey[] }
) {
  const role = await findAdminRoleById(id);
  if (!role) throw new Error('NOT_FOUND');
  if (role.is_system) throw new Error('SYSTEM_ROLE');

  if (input.name != null) {
    await pool.query('UPDATE admin_roles SET name = ? WHERE id = ?', [input.name.trim(), id]);
  }
  if (input.description !== undefined) {
    await pool.query('UPDATE admin_roles SET description = ? WHERE id = ?', [
      input.description?.trim() || null,
      id,
    ]);
  }
  if (input.screens != null) {
    const screens = input.screens.filter((k) => isAdminScreenKey(k) && k !== 'users' && k !== 'roles' && k !== 'newClient');
    if (!screens.length) throw new Error('SCREENS_REQUIRED');
    await pool.query('UPDATE admin_roles SET screens = ? WHERE id = ?', [JSON.stringify(screens), id]);
  }
}

export async function deleteAdminRole(id: number) {
  const role = await findAdminRoleById(id);
  if (!role) throw new Error('NOT_FOUND');
  if (role.is_system) throw new Error('SYSTEM_ROLE');

  const [userRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS c FROM admin_users WHERE role_id = ?',
    [id]
  );
  if (Number(userRows[0]?.c || 0) > 0) throw new Error('ROLE_IN_USE');

  await pool.query('DELETE FROM admin_roles WHERE id = ?', [id]);
}

export async function countUsersWithRole(roleId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS c FROM admin_users WHERE role_id = ?',
    [roleId]
  );
  return Number(rows[0]?.c || 0);
}

export { SYSTEM_ADMIN_SLUG, SYSTEM_EDITOR_SLUG };
