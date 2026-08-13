import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { seedResourcePosts } from '@/lib/resources';

export async function POST() {
  try {
    await requireSession();
    const result = await seedResourcePosts();
    return jsonOk(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Seed failed', 500);
  }
}
