import { z } from 'zod';
import type { RowDataPacket } from 'mysql2';
import { requireAdmin } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import pool from '@/lib/db';

export async function GET() {
  try {
    await requireAdmin();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, email, source, created_at FROM newsletter_subscribers ORDER BY id DESC LIMIT 2000'
    );
    return jsonOk({ subscribers: rows });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError('Failed to list subscribers', 500);
  }
}

const deleteSchema = z.object({ id: z.number().int().positive() });

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = deleteSchema.parse(await request.json());
    await pool.query('DELETE FROM newsletter_subscribers WHERE id = ?', [body.id]);
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    return jsonError('Failed to delete subscriber', 500);
  }
}
