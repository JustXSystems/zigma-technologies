import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { getPageBySlug } from '@/lib/cms';
import { withCareersDefaults, type CareersJob, type CareersJobsContent } from '@/lib/careers-sections';
import { importLegacyJobs } from '@/lib/career-hiring';

/**
 * Import careers_jobs section JSON into career_jobs.
 * Default mode `missing`: skips titles/slugs that already exist (safe to re-run).
 * Pass `?mode=empty-only` to only import when the ATS table is empty.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const modeParam = new URL(request.url).searchParams.get('mode');
    const mode = modeParam === 'empty-only' ? 'empty-only' : 'missing';

    const page = await getPageBySlug('careers', true);
    const section = page?.sections?.find((s) => s.type === 'careers_jobs');
    const content = withCareersDefaults<CareersJobsContent>('careers_jobs', section?.content_json || {});
    const jobs = (content.jobs || []) as CareersJob[];
    if (!jobs.length) {
      return jsonOk({ imported: 0, skipped: 0, mode, message: 'No jobs found on the Careers page section to import.' });
    }

    const result = await importLegacyJobs(jobs, session.name || session.email, {
      asOpen: true,
      durationDays: 45,
      mode,
    });

    let message: string;
    if (result.imported) {
      message =
        mode === 'missing'
          ? `Imported ${result.imported} new job(s) as open (45-day posting). ${result.skipped} already present or skipped.`
          : `Imported ${result.imported} job(s) as open (45-day posting).`;
    } else if (mode === 'empty-only') {
      message = 'Hiring already has jobs — empty-only import skipped. Use Import again to add any missing Careers-page roles.';
    } else {
      message = result.skipped
        ? `Nothing new to import — ${result.skipped} Careers-page role(s) already exist in Hiring.`
        : 'No jobs to import.';
    }

    return jsonOk({ ...result, message });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Import failed', 500);
  }
}
