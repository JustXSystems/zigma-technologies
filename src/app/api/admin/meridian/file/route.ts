import { NextResponse } from 'next/server';
import { requireScreen } from '@/lib/auth';
import { parseMeridianEnv, serveMeridianArtefact } from '@/lib/meridian-artefact-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Canonical artefact API (query form — safe with `.html` / `.md` names):
 *   GET /api/admin/meridian/file?env=prod&name=ops-cockpit.html
 */
export async function GET(request: Request) {
  try {
    await requireScreen('redirects');
    const url = new URL(request.url);
    const env = parseMeridianEnv(url.searchParams.get('env'));
    const name = url.searchParams.get('name') || '';
    return serveMeridianArtefact(env, name);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    const status = msg === 'UNAUTHORIZED' || msg === 'Unauthorized' ? 401 : msg === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
