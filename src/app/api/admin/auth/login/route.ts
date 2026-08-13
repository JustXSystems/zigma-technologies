import { z } from 'zod';
import {
  createSessionToken,
  findAdminByEmail,
  setSessionCookie,
  touchLastLogin,
  verifyPassword,
} from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await readJson(request));
    const user = await findAdminByEmail(body.email);
    if (!user) return jsonError('Invalid email or password', 401);

    const ok = await verifyPassword(body.password, user.password_hash);
    if (!ok) return jsonError('Invalid email or password', 401);

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    await setSessionCookie(token);
    await touchLastLogin(user.id);

    return jsonOk({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Login failed', 500);
  }
}
