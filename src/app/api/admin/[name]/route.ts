import { NextResponse } from 'next/server';
import { requireScreen } from '@/lib/auth';
import {
  MERIDIAN_ARTEFACT_NAME,
  parseMeridianEnv,
  serveMeridianArtefact,
} from '@/lib/meridian-artefact-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Legacy relative links from Command Brief HTML (href="ops-cockpit.html") resolve to
 * /api/admin/ops-cockpit.html when the brief is opened under /api/admin/meridian.
 * Serve the artefact here directly (do not redirect to a nested .html path segment).
 */
type Ctx = { params: Promise<{ name: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    await requireScreen('redirects');
    const { name: nameRaw } = await ctx.params;
    const name = decodeURIComponent(nameRaw || '');
    if (!MERIDIAN_ARTEFACT_NAME.test(name)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const url = new URL(request.url);
    const env = parseMeridianEnv(url.searchParams.get('env'));
    return serveMeridianArtefact(env, name);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    const status = msg === 'UNAUTHORIZED' || msg === 'Unauthorized' ? 401 : msg === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
