import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { dashboardCounts } from '@/lib/catalog';

export async function GET() {
  try {
    await requireSession();
    const counts = await dashboardCounts();
    return jsonOk(counts);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error(error);
    return jsonError('Failed to load dashboard', 500);
  }
}
