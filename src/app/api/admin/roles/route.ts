import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { errorResponse, jsonOk, readJson, type KnownErrors } from '@/lib/api';
import { createAdminRole, deleteAdminRole, listAdminRoles, updateAdminRole } from '@/lib/admin-roles';

const known: KnownErrors = {
  NOT_FOUND: ['Role not found', 404],
  NAME_REQUIRED: ['Give the role a name', 400],
  ROLE_NAME_EXISTS: ['A role with that name already exists', 409],
  SCREENS_REQUIRED: ['Select at least one screen', 400],
  SYSTEM_ROLE: ['Full Admin is built in and cannot be changed or deleted', 400],
  SYSTEM_ROLE_NAME: ['Built-in roles keep their name', 400],
  ROLE_IN_USE: ['Role is assigned to users — choose a role to move them to', 400],
  REASSIGN_SAME: ['Move members to a different role', 400],
  ROLE_NOT_FOUND: ['The role to move members to no longer exists', 400],
  ROLE_IS_ADMIN: ['Members cannot be moved to Full Admin this way — promote them on the Users tab', 400],
};

const name = z.string().trim().min(1).max(120);
const description = z.string().trim().max(255).nullable();
const screens = z.array(z.string()).min(1).max(100);

export async function GET() {
  try {
    await requireAdmin();
    return jsonOk({ roles: await listAdminRoles() });
  } catch (error) {
    return errorResponse(error, { known, fallback: 'Failed to list roles' });
  }
}

const createSchema = z.object({ name, description: description.optional(), screens });

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = createSchema.parse(await readJson(request));
    const id = await createAdminRole(body);
    return jsonOk({ id, message: 'Role created' }, { status: 201 });
  } catch (error) {
    return errorResponse(error, { known, fallback: 'Failed to create role', invalid: 'Check the role name and screens' });
  }
}

const patchSchema = z.object({
  id: z.number().int().positive(),
  name: name.optional(),
  description: description.optional(),
  screens: screens.optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const { id, ...changes } = patchSchema.parse(await readJson(request));
    await updateAdminRole(id, changes);
    return jsonOk({ ok: true, message: 'Role updated' });
  } catch (error) {
    return errorResponse(error, { known, fallback: 'Failed to update role', invalid: 'Check the role name and screens' });
  }
}

const deleteSchema = z.object({
  id: z.number().int().positive(),
  reassign_to: z.number().int().positive().nullable().optional(),
});

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = deleteSchema.parse(await readJson(request));
    await deleteAdminRole(body.id, body.reassign_to);
    return jsonOk({ ok: true, message: 'Role deleted' });
  } catch (error) {
    return errorResponse(error, { known, fallback: 'Failed to delete role' });
  }
}
