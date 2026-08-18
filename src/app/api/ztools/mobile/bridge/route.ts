import { z } from 'zod';
import {
  createZtoolsBridgeToken,
  getZtoolsSession,
  verifyZtoolsSessionToken,
} from '@/lib/ztools';
import { jsonError, jsonOk, readJson } from '@/lib/api';

const bridgeSchema = z.object({
  redirect: z.string().min(1),
});

function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (!bearer) return jsonError('Unauthorized', 401);

  const session = await verifyZtoolsSessionToken(bearer);
  if (!session) return jsonError('Unauthorized', 401);

  const fullSession = await getZtoolsSession(request);
  if (!fullSession) return jsonError('Unauthorized', 401);

  try {
    const body = bridgeSchema.parse(await readJson(request));
    const redirect = body.redirect.startsWith('/') ? body.redirect : `/${body.redirect}`;
    if (!redirect.startsWith('/ztools/')) {
      return jsonError('Invalid redirect path', 400);
    }

    const bridge = await createZtoolsBridgeToken(bearer, redirect);
    const url = `${siteOrigin()}/ztools/app-bridge?token=${encodeURIComponent(bridge)}`;
    return jsonOk({ url });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    console.error(error);
    return jsonError('Bridge failed', 500);
  }
}
