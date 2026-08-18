import { z } from 'zod';
import { requireScreen } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api';
import { DEFAULT_SITE_COPY, mergeSiteCopy } from '@/lib/site-copy';
import {
  getIndustryDefsCms,
  getLocationDefsCms,
  getSiteCopy,
  saveIndustryDefs,
  saveLocationDefs,
  saveSiteCopy,
} from '@/lib/site-content';
import { INDUSTRY_DEFS } from '@/lib/industries';
import { LOCATION_DEFS } from '@/lib/locations';

export async function GET() {
  try {
    await requireScreen('siteCopy');
    const [copy, industries, locations] = await Promise.all([
      getSiteCopy(),
      getIndustryDefsCms(),
      getLocationDefsCms(),
    ]);
    return jsonOk({
      copy,
      defaults: DEFAULT_SITE_COPY,
      industries,
      locations,
      industryDefaults: INDUSTRY_DEFS,
      locationDefaults: LOCATION_DEFS,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    return jsonError('Failed to load site copy', 500);
  }
}

const putSchema = z.object({
  copy: z.record(z.string(), z.unknown()).optional(),
  industries: z.array(z.record(z.string(), z.unknown())).optional(),
  locations: z.array(z.record(z.string(), z.unknown())).optional(),
});

export async function PUT(request: Request) {
  try {
    await requireScreen('siteCopy');
    const body = putSchema.parse(await readJson(request));

    if (body.copy) {
      await saveSiteCopy(mergeSiteCopy(body.copy));
    }
    if (body.industries) {
      await saveIndustryDefs(body.industries as never);
    }
    if (body.locations) {
      await saveLocationDefs(body.locations as never);
    }

    const [copy, industries, locations] = await Promise.all([
      getSiteCopy(),
      getIndustryDefsCms(),
      getLocationDefsCms(),
    ]);
    return jsonOk({ copy, industries, locations });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError('Invalid payload', 400);
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    if (error instanceof Error && error.message === 'FORBIDDEN') return jsonError('Forbidden', 403);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Save failed', 500);
  }
}
