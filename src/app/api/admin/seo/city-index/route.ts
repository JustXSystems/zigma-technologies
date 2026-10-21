import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import {
  demoteCityService,
  ensureCityIndexAllowlistFile,
  hydrateCityIndexAllowlist,
  listRuntimeCityPairs,
  promoteCityService,
} from '@/lib/city-index-allowlist';
import { INDEXABLE_CITY_SERVICES, SERVICE_SEO_DEFS } from '@/lib/location-services';
import { LOCATION_DEFS } from '@/lib/locations';

const promoteSchema = z.object({
  action: z.enum(['promote', 'demote']),
  city: z.string().min(1).max(64),
  service: z.string().min(1).max(64),
  confirmUniqueProof: z.boolean().optional(),
  note: z.string().max(500).optional(),
});

export async function GET() {
  try {
    await requireSession();
    await ensureCityIndexAllowlistFile();
    await hydrateCityIndexAllowlist();
    const runtime = await listRuntimeCityPairs();
    const code = [...INDEXABLE_CITY_SERVICES].sort();
    const cities = LOCATION_DEFS.map((l) => ({ key: l.key, name: l.name }));
    const services = SERVICE_SEO_DEFS.map((s) => ({ key: s.key, name: s.name }));
    return jsonOk({
      ok: true,
      code,
      runtime: runtime.runtime,
      notes: runtime.notes,
      updatedAt: runtime.updatedAt,
      cities,
      services,
      all: [...new Set([...code, ...runtime.runtime])].sort(),
      qualityGate:
        'Confirm unique local proof (photos + ~600+ words) before promote. Never index thin templates.',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    return jsonError('Failed to load city index allowlist', 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = promoteSchema.parse(await readJson(request));
    const cityOk = LOCATION_DEFS.some((l) => l.key === body.city);
    const serviceOk = SERVICE_SEO_DEFS.some((s) => s.key === body.service);
    if (!cityOk || !serviceOk) {
      return jsonError('Unknown city or service key', 400);
    }

    if (body.action === 'demote') {
      if (INDEXABLE_CITY_SERVICES.has(`${body.city}/${body.service}`)) {
        return jsonError(
          'This pair is shipped in code (INDEXABLE_CITY_SERVICES). Remove it from src/lib/location-services.ts to demote.',
          400
        );
      }
      const result = await demoteCityService(body.city, body.service);
      revalidatePath(`/locations/${body.city}/${body.service}`);
      revalidatePath('/sitemap.xml');
      return jsonOk({ ...result, message: `Demoted ${result.pair} (noindex again)` });
    }

    const result = await promoteCityService(body.city, body.service, {
      confirmUniqueProof: !!body.confirmUniqueProof,
      note: body.note,
    });
    if (!result.ok) return jsonError(result.error, 400);

    revalidatePath(`/locations/${body.city}/${body.service}`);
    revalidatePath('/sitemap.xml');
    return jsonOk({
      ...result,
      message: result.already
        ? `${result.pair} already indexable`
        : `Promoted ${result.pair} — live index + sitemap on next crawl`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return jsonError('Unauthorized', 401);
    }
    console.error(error);
    return jsonError('City index update failed', 500);
  }
}
