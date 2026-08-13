import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { getDefaultForm } from '@/lib/catalog';

export async function GET() {
  try {
    await requireSession();
    const form = await getDefaultForm();
    if (!form) return jsonError('Default form not found. Run setup-database.sql', 404);
    return jsonOk({ form });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    return jsonError('Failed to load form', 500);
  }
}
