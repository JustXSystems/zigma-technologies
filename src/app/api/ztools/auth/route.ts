import { z } from 'zod';
import {
  authenticateZtoolsUser,
  clearZtoolsSessionCookie,
  createZtoolsSessionToken,
  getZtoolsSession,
  setZtoolsSessionCookie,
} from '@/lib/ztools';
import { jsonError, jsonOk, readJson } from '@/lib/api';

export async function GET(request: Request) {
  const session = await getZtoolsSession(request);
  if (!session) return jsonError('Unauthorized', 401);
  return jsonOk({
    user: {
      id: session.sub,
      email: session.email,
      name: session.name,
      company: session.company,
      toolSlugs: session.toolSlugs,
    },
  });
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await readJson(request));
    const result = await authenticateZtoolsUser(body.email, body.password);

    if (result.error === 'PENDING') {
      return jsonError('Your account is awaiting admin approval. We will email you once access is granted.', 403);
    }
    if (result.error === 'REJECTED') {
      return jsonError('Your registration was not approved. Contact Zigma support for assistance.', 403);
    }
    if (result.error === 'DISABLED') {
      return jsonError('This account has been disabled.', 403);
    }
    if (result.error === 'INVALID' || !result.user || !result.tools) {
      return jsonError('Invalid email or password', 401);
    }

    const toolSlugs = result.tools.map((t) => t.slug);
    const token = await createZtoolsSessionToken(result.user, toolSlugs);
    await setZtoolsSessionCookie(token);

    return jsonOk({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        company: result.user.company,
        toolSlugs,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    console.error(error);
    return jsonError('Login failed', 500);
  }
}

export async function DELETE() {
  await clearZtoolsSessionCookie();
  return jsonOk({ ok: true });
}
