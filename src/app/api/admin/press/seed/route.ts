import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { seedPressPosts } from '@/lib/press';

export async function POST() {
  try {
    await requireSession();
    const result = await seedPressPosts();
    return jsonOk(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError(error instanceof Error ? error.message : 'Seed failed', 500);
  }
}
