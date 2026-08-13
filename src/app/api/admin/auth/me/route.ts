import { getSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError('Unauthorized', 401);
  return jsonOk({
    user: {
      id: session.sub,
      email: session.email,
      name: session.name,
      role: session.role,
    },
  });
}
