import { NextResponse } from 'next/server';
import { requireScreen } from '@/lib/auth';
import { parseMeridianEnv, serveMeridianArtefact } from '@/lib/meridian-artefact-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ env: string; name: string }> };

/** Legacy path-style URL — serve in place (no redirect through dotted segments). */
export async function GET(_request: Request, ctx: Ctx) {
  try {
    await requireScreen('redirects');
    const { env: envRaw, name: nameRaw } = await ctx.params;
    return serveMeridianArtefact(parseMeridianEnv(envRaw), nameRaw || '');
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    const status = msg === 'UNAUTHORIZED' || msg === 'Unauthorized' ? 401 : msg === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
