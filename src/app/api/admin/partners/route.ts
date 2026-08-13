import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import {
  createPartnerDocument,
  createPartnerUser,
  deletePartnerDocument,
  deletePartnerUser,
  listPartnerDocuments,
  listPartnerUsers,
  seedPartnerDocuments,
  updatePartnerDocument,
} from '@/lib/partners';

export async function GET() {
  try {
    await requireAdmin();
    const [users, documents] = await Promise.all([listPartnerUsers(), listPartnerDocuments({ admin: true })]);
    return jsonOk({ users, documents });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError(error instanceof Error ? error.message : 'Failed', 500);
  }
}

const userSchema = z.object({
  action: z.literal('create_user'),
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  company: z.string().optional(),
});

const docSchema = z.object({
  action: z.literal('create_doc'),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  file_url: z.string().min(1),
  doc_type: z.string().optional(),
});

const seedSchema = z.object({ action: z.literal('seed_docs') });

const deleteUserSchema = z.object({ action: z.literal('delete_user'), id: z.number() });
const deleteDocSchema = z.object({ action: z.literal('delete_doc'), id: z.number() });
const updateDocSchema = z.object({
  action: z.literal('update_doc'),
  id: z.number(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  file_url: z.string().optional(),
  doc_type: z.string().optional(),
  enabled: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await readJson(request);
    const action = (body as { action?: string }).action;

    if (action === 'create_user') {
      const input = userSchema.parse(body);
      const id = await createPartnerUser(input);
      return jsonOk({ id }, { status: 201 });
    }
    if (action === 'create_doc') {
      const input = docSchema.parse(body);
      const id = await createPartnerDocument(input);
      return jsonOk({ id }, { status: 201 });
    }
    if (action === 'seed_docs') {
      seedSchema.parse(body);
      const result = await seedPartnerDocuments();
      return jsonOk(result);
    }
    if (action === 'delete_user') {
      const input = deleteUserSchema.parse(body);
      await deletePartnerUser(input.id);
      return jsonOk({ ok: true });
    }
    if (action === 'delete_doc') {
      const input = deleteDocSchema.parse(body);
      await deletePartnerDocument(input.id);
      return jsonOk({ ok: true });
    }
    if (action === 'update_doc') {
      const input = updateDocSchema.parse(body);
      await updatePartnerDocument(input.id, input);
      return jsonOk({ ok: true });
    }
    return jsonError('Unknown action', 400);
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError(error instanceof Error ? error.message : 'Failed', 500);
  }
}
