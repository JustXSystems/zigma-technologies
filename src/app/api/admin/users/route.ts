import { z } from 'zod';
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  requireAdmin,
  updateAdminUser,
} from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';

export async function GET() {
  try {
    await requireAdmin();
    const users = await listAdminUsers();
    return jsonOk({ users });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError('Failed to list users', 500);
  }
}

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(10),
  role: z.enum(['admin', 'editor']).default('editor'),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = createSchema.parse(await readJson(request));
    const id = await createAdminUser(body);
    return jsonOk({ id, message: 'User created' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload (password min 10 chars)', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      return jsonError('An account with that email already exists', 409);
    }
    return jsonError('Failed to create user', 500);
  }
}

const patchSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'editor']).optional(),
  password: z.string().min(10).optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireAdmin();
    const body = patchSchema.parse(await readJson(request));
    await updateAdminUser(body.id, body, session.sub);
    return jsonOk({ ok: true, message: 'User updated' });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    if (error instanceof Error && error.message === 'NOT_FOUND') return jsonError('User not found', 404);
    if (error instanceof Error && error.message === 'LAST_ADMIN') {
      return jsonError('Cannot demote the last admin', 400);
    }
    return jsonError('Failed to update user', 500);
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
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    if (error instanceof Error && error.message === 'CANNOT_DELETE_SELF') {
      return jsonError('You cannot delete your own account', 400);
    }
    if (error instanceof Error && error.message === 'LAST_ADMIN') {
      return jsonError('Cannot delete the last admin', 400);
    }
    if (error instanceof Error && error.message === 'NOT_FOUND') return jsonError('User not found', 404);
    return jsonError('Failed to delete user', 500);
  }
}
