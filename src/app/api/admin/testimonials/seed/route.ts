import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { seedTestimonials } from '@/lib/testimonials';

export async function POST() {
  try {
    await requireSession();
    return jsonOk(await seedTestimonials());
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Seed failed', 500);
  }
}
