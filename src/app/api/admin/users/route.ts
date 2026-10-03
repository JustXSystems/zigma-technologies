import { z } from 'zod';
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  requireAdmin,
  updateAdminUser,
} from '@/lib/auth';
import { errorResponse, jsonOk, readJson, type KnownErrors } from '@/lib/api';
import { listAdminRoles } from '@/lib/admin-roles';

const known: KnownErrors = {
  NOT_FOUND: ['User not found', 404],
  EMAIL_EXISTS: ['An account with that email already exists', 409],
  ROLE_NOT_FOUND: ['That role no longer exists — pick another', 400],
  ROLE_IS_ADMIN: ['Choose "Full admin" access instead of the Full Admin role', 400],
  OWN_ACCESS: ['You cannot change your own access', 400],
  LAST_ADMIN: ['At least one full admin must remain', 400],
  CANNOT_DELETE_SELF: ['You cannot delete your own account', 400],
};
const invalid = 'Check the details (password at least 10 characters)';

const email = z.string().trim().email();
const name = z.string().trim().min(1).max(120);
const password = z.string().min(10).max(200);
const role = z.enum(['admin', 'editor']);
const roleId = z.number().int().positive().nullable();

/** Users and roles together: the Team & Access screens render both from one request. */
export async function GET() {
  try {
    await requireAdmin();
    const [users, roles] = await Promise.all([listAdminUsers(), listAdminRoles()]);
    return jsonOk({ users, roles });
  } catch (error) {
    return errorResponse(error, { known, fallback: 'Failed to list users' });
  }
}

const createSchema = z.object({
  email,
  name,
  password,
  role: role.default('editor'),
  role_id: roleId.optional(),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = createSchema.parse(await readJson(request));
    const id = await createAdminUser(body);
    return jsonOk({ id, message: 'User created' }, { status: 201 });
  } catch (error) {
    return errorResponse(error, { known, fallback: 'Failed to create user', invalid });
  }
}

const patchSchema = z.object({
  id: z.number().int().positive(),
  name: name.optional(),
  email: email.optional(),
  role: role.optional(),
  role_id: roleId.optional(),
  password: password.optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireAdmin();
    const body = patchSchema.parse(await readJson(request));
    await updateAdminUser(body.id, body, session.sub);
    return jsonOk({ ok: true, message: 'User updated' });
  } catch (error) {
    return errorResponse(error, { known, fallback: 'Failed to update user', invalid });
  }
}

const deleteSchema = z.object({
  id: z.number().int().positive(),
});

export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin();
    const body = deleteSchema.parse(await readJson(request));
    await deleteAdminUser(body.id, session.sub);
    return jsonOk({ ok: true, message: 'User deleted' });
  } catch (error) {
    return errorResponse(error, { known, fallback: 'Failed to delete user' });
  }
}
