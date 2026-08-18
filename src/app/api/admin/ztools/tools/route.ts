import { z } from 'zod';
import { requireScreen } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import {
  createZtoolsTool,
  deleteZtoolsTool,
  listZtoolsTools,
  updateZtoolsTool,
} from '@/lib/ztools';

export async function GET() {
  try {
    await requireScreen('ztools');
    const tools = await listZtoolsTools({ admin: true });
    return jsonOk({ tools });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError('Failed to list tools', 500);
  }
}

const createSchema = z.object({
  slug: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  icon: z.string().max(40).optional(),
  route_path: z.string().min(1).max(255),
  sort_order: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await requireScreen('ztools');
    const body = createSchema.parse(await readJson(request));
    const id = await createZtoolsTool(body);
    return jsonOk({ id, message: 'Tool created' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError('Failed to create tool', 500);
  }
}

const patchSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
  route_path: z.string().min(1).max(255).optional(),
  sort_order: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireScreen('ztools');
    const body = patchSchema.parse(await readJson(request));
    const { id, ...rest } = body;
    await updateZtoolsTool(id, rest);
    return jsonOk({ ok: true, message: 'Tool updated' });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError('Failed to update tool', 500);
  }
}

const deleteSchema = z.object({ id: z.number().int().positive() });

export async function DELETE(request: Request) {
  try {
    await requireScreen('ztools');
    const body = deleteSchema.parse(await readJson(request));
    await deleteZtoolsTool(body.id);
    return jsonOk({ ok: true, message: 'Tool deleted' });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError('Failed to delete tool', 500);
  }
}
