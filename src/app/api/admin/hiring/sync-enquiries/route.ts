import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import {
  autoSyncCareersEnquiries,
  countUnmappedCareersEnquiries,
  syncCareersEnquiriesToPipeline,
} from '@/lib/career-enquiry-bridge';

export async function GET() {
  try {
    await requireSession();
    const unmapped = await countUnmappedCareersEnquiries();
    return jsonOk({ unmapped });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError('Failed to count unmapped applications', 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const actor = session.name || session.email || 'admin';
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'full';
    const result =
      mode === 'auto' ? await autoSyncCareersEnquiries(actor) : await syncCareersEnquiriesToPipeline(actor);
    if (!result) {
      return jsonOk({
        scanned: 0,
        created: 0,
        linked: 0,
        duplicates: 0,
        holding: 0,
        alreadyLinked: 0,
        errors: 0,
        message: 'All careers applications are already in the Hiring pipeline.',
      });
    }
    return jsonOk(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Sync failed', 500);
  }
}
