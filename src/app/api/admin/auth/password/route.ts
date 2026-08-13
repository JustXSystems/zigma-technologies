import { z } from 'zod';
import {
  findAdminById,
  hashPassword,
  requireSession,
  updateAdminPassword,
  verifyPassword,
} from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10),
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = schema.parse(await readJson(request));
    const user = await findAdminById(session.sub);
    if (!user) return jsonError('User not found', 404);

    const ok = await verifyPassword(body.currentPassword, user.password_hash);
    if (!ok) return jsonError('Current password is incorrect', 400);

    const password_hash = await hashPassword(body.newPassword);
    await updateAdminPassword(user.id, password_hash);
    return jsonOk({ ok: true, message: 'Password updated.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError('New password must be at least 10 characters', 400);
    }
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    return jsonError('Failed to update password', 500);
  }
}
