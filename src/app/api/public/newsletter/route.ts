import { z } from 'zod';
import type { ResultSetHeader } from 'mysql2';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import pool from '@/lib/db';
import { guardPublicForm } from '@/lib/form-guard';

const schema = z.object({
  email: z.string().email(),
  source: z.string().max(80).optional(),
  _hp: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await readJson(request));
    const guard = guardPublicForm(request, 'newsletter', body._hp);
    if (guard.action === 'honeypot') {
      return jsonOk({ ok: true, message: 'Subscribed' }, { status: 201 });
    }
    if (guard.action === 'rate_limited') {
      return jsonError(`Too many attempts. Please try again in ${guard.retryAfterSec} seconds.`, 429);
    }

    const email = body.email.toLowerCase().trim();
    await pool.query<ResultSetHeader>(
      `INSERT INTO newsletter_subscribers (email, source) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE source = VALUES(source)`,
      [email, body.source || 'footer']
    );
    return jsonOk({ ok: true, message: 'Subscribed' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Valid email required', 400);
    console.error('[newsletter]', error);
    return jsonError('Unable to subscribe right now', 500);
  }
}
