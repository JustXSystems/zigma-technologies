import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { seedIndustryPages } from '@/lib/industry-seeds';

export async function POST() {
  try {
    await requireSession();
    const result = await seedIndustryPages();
    return jsonOk({
      ...result,
      message: `Industry CMS stubs: ${result.created} created, ${result.skipped} already had sections.`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Seed failed', 500);
  }
}
