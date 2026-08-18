import { z } from 'zod';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { deleteZtoolsPushToken, upsertZtoolsPushToken } from '@/lib/ztools-push';
import { getZtoolsSession } from '@/lib/ztools';

const registerSchema = z.object({
  expoPushToken: z.string().min(8),
  platform: z.string().max(20).optional(),
});

export async function POST(request: Request) {
  const session = await getZtoolsSession(request);
  if (!session) return jsonError('Unauthorized', 401);

  try {
    const body = registerSchema.parse(await readJson(request));
    await upsertZtoolsPushToken(session.sub, body.expoPushToken, body.platform || 'android');
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    console.error(error);
    return jsonError('Failed to register push token', 500);
  }
}

export async function DELETE(request: Request) {
  const session = await getZtoolsSession(request);
  if (!session) return jsonError('Unauthorized', 401);

  try {
    const body = (await readJson<{ expoPushToken?: string }>(request).catch(() => ({}))) as {
      expoPushToken?: string;
    };
    await deleteZtoolsPushToken(session.sub, body.expoPushToken);
    return jsonOk({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonError('Failed to unregister push token', 500);
  }
}
