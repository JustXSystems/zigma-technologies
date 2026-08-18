import { requireScreen } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { parseCssSections, readRepoSiteCss } from '@/lib/site-css';

export async function GET() {
  try {
    await requireScreen('theme');
    const css = readRepoSiteCss();
    const sections = parseCssSections(css);
    return jsonOk({
      css,
      sections,
      bytes: new TextEncoder().encode(css).length,
      source: 'src/app/globals.css',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Failed to read globals.css', 500);
  }
}
