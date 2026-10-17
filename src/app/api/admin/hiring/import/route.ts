import { requireSession } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api';
import { getPageBySlug } from '@/lib/cms';
import { withCareersDefaults, type CareersJob, type CareersJobsContent } from '@/lib/careers-sections';
import { importLegacyJobs, listCareerJobs } from '@/lib/career-hiring';

/** One-time import of careers_jobs section JSON into career_jobs (only when table is empty). */
export async function POST() {
  try {
    const session = await requireSession();
    const existing = await listCareerJobs({ status: 'all' });
    if (existing.length) {
      return jsonOk({ imported: 0, skipped: existing.length, message: 'Hiring table already has jobs — import skipped.' });
    }
    const page = await getPageBySlug('careers', true);
    const section = page?.sections?.find((s) => s.type === 'careers_jobs');
    const content = withCareersDefaults<CareersJobsContent>('careers_jobs', section?.content_json || {});
    const jobs = (content.jobs || []) as CareersJob[];
    const result = await importLegacyJobs(jobs, session.name || session.email, { asOpen: true, durationDays: 45 });
    return jsonOk({ ...result, message: result.imported ? `Imported ${result.imported} job(s) as open (45-day posting).` : 'No jobs to import.' });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Unauthorized', 401);
    console.error(error);
    return jsonError(error instanceof Error ? error.message : 'Import failed', 500);
  }
}
