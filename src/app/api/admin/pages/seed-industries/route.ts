import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { seedIndustryPages } from '@/lib/industry-seeds';

export async function POST() {
  try {
    await requireSession();
    const result = await seedIndustryPages();
    const hubPart = result.hubSeeded
      ? 'Hub /industries seeded.'
      : result.hubSkipped
        ? 'Hub /industries already had sections.'
        : '';
    return jsonOk({
      ...result,
      message: `${hubPart} Industry landing stubs: ${result.created} created, ${result.skipped} already had sections.`.trim(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Seed failed', 500);
  }
}
