import { z } from 'zod';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import {
  authenticatePartner,
  createPartnerSessionToken,
  setPartnerSessionCookie,
  clearPartnerSessionCookie,
  getPartnerSession,
} from '@/lib/partners';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function GET() {
  const session = await getPartnerSession();
  if (!session) return jsonError('Unauthorized', 401);
  return jsonOk({ user: session });
}

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await readJson(request));
    const user = await authenticatePartner(body.email, body.password);
    if (!user) return jsonError('Invalid credentials', 401);
    const token = await createPartnerSessionToken(user);
    await setPartnerSessionCookie(token);
    return jsonOk({ user: { email: user.email, name: user.name, company: user.company } });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    return jsonError(error instanceof Error ? error.message : 'Login failed', 500);
  }
}

export async function DELETE() {
  await clearPartnerSessionCookie();
  return jsonOk({ ok: true });
}
