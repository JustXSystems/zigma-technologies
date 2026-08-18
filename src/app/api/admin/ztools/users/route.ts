import { z } from 'zod';
import { requireScreen } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import {
  createZtoolsUserAdmin,
  deleteZtoolsUser,
  listZtoolsTools,
  listZtoolsUsers,
  updateZtoolsUser,
} from '@/lib/ztools';

export async function GET() {
  try {
    await requireScreen('ztools');
    const [users, tools] = await Promise.all([listZtoolsUsers(), listZtoolsTools({ admin: true })]);
    return jsonOk({ users, tools });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError('Failed to list users', 500);
  }
}

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  password: z.string().min(10),
  company: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
  approved_tool_ids: z.array(z.number().int().positive()).min(1),
  auto_approve: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await requireScreen('ztools');
    const body = createSchema.parse(await readJson(request));
    const id = await createZtoolsUserAdmin({
      ...body,
      auto_approve: body.auto_approve ?? true,
    });
    return jsonOk({ id, message: 'ZTools user created' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload (password min 10 chars)', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      return jsonError('Email already registered', 409);
    }
    if (error instanceof Error && error.message === 'TOOLS_REQUIRED') {
      return jsonError('Assign at least one tool', 400);
    }
    return jsonError('Failed to create user', 500);
  }
}

const patchSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).optional(),
  company: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  status: z.enum(['pending_approval', 'approved', 'rejected', 'disabled']).optional(),
  approved_tool_ids: z.array(z.number().int().positive()).optional(),
  admin_notes: z.string().nullable().optional(),
  password: z.string().min(10).optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireScreen('ztools');
    const body = patchSchema.parse(await readJson(request));
    const { id, ...rest } = body;
    await updateZtoolsUser(id, rest, session.sub);
    return jsonOk({ ok: true, message: 'User updated' });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    if (error instanceof Error && error.message === 'NOT_FOUND') return jsonError('User not found', 404);
    return jsonError('Failed to update user', 500);
  }
}

const deleteSchema = z.object({ id: z.number().int().positive() });

export async function DELETE(request: Request) {
  try {
    await requireScreen('ztools');
    const body = deleteSchema.parse(await readJson(request));
    await deleteZtoolsUser(body.id);
    return jsonOk({ ok: true, message: 'User deleted' });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError('Failed to delete user', 500);
  }
}
