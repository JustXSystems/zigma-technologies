import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { linkNapEverywhere } from '@/lib/nap-link';

export async function GET() {
  try {
    await requireSession();
    return jsonOk(await linkNapEverywhere(false));
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError('Failed to scan company details', 500);
  }
}

export async function POST() {
  try {
    await requireSession();
    return jsonOk(await linkNapEverywhere(true));
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError('Failed to link company details', 500);
  }
}
