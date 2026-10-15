import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { getBlogSettings, saveBlogSettings } from '@/lib/blog-settings';

export async function GET() {
  try {
    await requireSession();
    return jsonOk({ settings: await getBlogSettings() });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to load blog settings', 500);
  }
}

export async function PUT(request: Request) {
  try {
    await requireSession();
    const body = (await readJson(request)) as { settings?: unknown };
    return jsonOk({ settings: await saveBlogSettings(body.settings) });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError('Failed to save blog settings', 500);
  }
}
