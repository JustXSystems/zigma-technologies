import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import {
  countUsersWithRole,
  createAdminRole,
  deleteAdminRole,
  listAdminRoles,
  updateAdminRole,
} from '@/lib/admin-roles';
import { isAdminScreenKey } from '@/lib/admin-screens';

export async function GET() {
  try {
    await requireAdmin();
    const roles = await listAdminRoles();
    const withCounts = await Promise.all(
      roles.map(async (role) => ({
        ...role,
        userCount: await countUsersWithRole(role.id),
      }))
    );
    return jsonOk({ roles: withCounts });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError('Failed to list roles', 500);
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(255).optional(),
  screens: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = createSchema.parse(await readJson(request));
    const screens = body.screens.filter(isAdminScreenKey);
    if (!screens.length) return jsonError('Select at least one screen', 400);
    const id = await createAdminRole({
      name: body.name,
      description: body.description,
      screens,
    });
    return jsonOk({ id, message: 'Role created' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    if (error instanceof Error && error.message === 'SCREENS_REQUIRED') {
      return jsonError('Select at least one screen', 400);
    }
    return jsonError('Failed to create role', 500);
  }
}

const patchSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(255).optional().nullable(),
  screens: z.array(z.string()).min(1).optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = patchSchema.parse(await readJson(request));
    const screens = body.screens?.filter(isAdminScreenKey);
    await updateAdminRole(body.id, {
      name: body.name,
      description: body.description ?? undefined,
      screens,
    });
    return jsonOk({ ok: true, message: 'Role updated' });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    if (error instanceof Error && error.message === 'NOT_FOUND') return jsonError('Role not found', 404);
    if (error instanceof Error && error.message === 'SYSTEM_ROLE') {
      return jsonError('System roles cannot be edited', 400);
    }
    if (error instanceof Error && error.message === 'SCREENS_REQUIRED') {
      return jsonError('Select at least one screen', 400);
    }
    return jsonError('Failed to update role', 500);
  }
}

const deleteSchema = z.object({
  id: z.number().int().positive(),
});

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = deleteSchema.parse(await readJson(request));
    await deleteAdminRole(body.id);
    return jsonOk({ ok: true, message: 'Role deleted' });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    if (error instanceof Error && error.message === 'NOT_FOUND') return jsonError('Role not found', 404);
    if (error instanceof Error && error.message === 'SYSTEM_ROLE') {
      return jsonError('System roles cannot be deleted', 400);
    }
    if (error instanceof Error && error.message === 'ROLE_IN_USE') {
      return jsonError('Role is assigned to users — reassign them first', 400);
    }
    return jsonError('Failed to delete role', 500);
  }
}
