/**
 * Enquiries ↔ Hiring pipeline bridge.
 * Every careers_apply enquiry should land in the ATS (matched role or holding queue).
 */

import type { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { getEnquiry, mergeEnquiryPayload, updateEnquiry } from '@/lib/catalog';
import type { Enquiry } from '@/lib/types';
import {
  createCandidate,
  createCareerJob,
  getCandidate,
  getCareerJob,
  getCareerJobByPublicId,
  getCareerJobBySlug,
  ingestWebsiteApplication,
  listCareerJobs,
  recordEvent,
  resolveOpenJob,
  STAGE_LABELS,
  type CandidateStage,
  type CareerCandidate,
  type CareerJob,
} from '@/lib/career-hiring';
import { ensureCareerHiringTables } from '@/lib/schema-ensure';

export const GENERAL_APPLICATIONS_SLUG = 'general-applications';
export const GENERAL_APPLICATIONS_TITLE = 'General Applications';

export type EnquiryPipelineLink = {
  candidateId: number;
  stage: CandidateStage;
  stageLabel: string;
  jobId: number;
  jobTitle: string;
  holding: boolean;
  hiringUrl: string;
};

export type EnquiryWithPipeline = Enquiry & {
  pipeline: EnquiryPipelineLink | null;
};

export type SyncEnquiriesResult = {
  scanned: number;
  created: number;
  linked: number;
  duplicates: number;
  holding: number;
  alreadyLinked: number;
  errors: number;
  message: string;
};

function t(v: unknown) {
  return String(v ?? '').trim();
}

function isCareersEnquiry(payload: Record<string, unknown>) {
  return String(payload.source || '') === 'careers_apply';
}

/** Paused internal job — not listed on /careers; catches unmatched website applies. */
export async function ensureGeneralApplicationsJob(actor = 'system'): Promise<CareerJob> {
  await ensureCareerHiringTables();
  const existing = await getCareerJobBySlug(GENERAL_APPLICATIONS_SLUG);
  if (existing) {
    if (existing.status === 'open') {
      // Keep off the public board
      const { updateCareerJob } = await import('@/lib/career-hiring');
      await updateCareerJob(existing.id, { status: 'paused' }, actor);
      return (await getCareerJob(existing.id)) || existing;
    }
    return existing;
  }
  const id = await createCareerJob(
    {
      title: GENERAL_APPLICATIONS_TITLE,
      slug: GENERAL_APPLICATIONS_SLUG,
      department: 'Talent',
      location: 'India',
      jobType: 'Full-Time',
      experience: 'Any',
      summary:
        'Internal holding queue for website applications that did not match a live opening. Reassign each person to the correct role from Pipeline.',
      status: 'paused',
      badge: 'Internal',
      content: {
        role: GENERAL_APPLICATIONS_TITLE,
        responsibilities: [
          'Triage website applications that arrived without a matched open role',
          'Reassign candidates to the correct posting when identified',
        ],
        requirements: ['HR review'],
        benefits: [],
        facts: ['Work mode: Internal queue'],
        chips: ['Internal'],
      },
      allowDuplicateTitle: true,
    },
    actor
  );
  const job = await getCareerJob(id);
  if (!job) throw new Error('Failed to create General Applications holding job');
  return job;
}

/** Resolve job for ingest/backfill — open first, then any status by id/slug/title. */
export async function resolveJobForIngest(ref: {
  jobId?: number | null;
  publicId?: string | null;
  slug?: string | null;
  role?: string | null;
}): Promise<CareerJob | null> {
  const open = await resolveOpenJob(ref);
  if (open) return open;

  const jobId = Number(ref.jobId) || 0;
  if (jobId > 0) {
    const byId = await getCareerJob(jobId);
    if (byId) return byId;
  }
  const publicId = t(ref.publicId);
  if (publicId) {
    const byPid = await getCareerJobByPublicId(publicId);
    if (byPid) return byPid;
  }
  const slug = t(ref.slug).toLowerCase();
  if (slug) {
    const bySlug = await getCareerJobBySlug(slug);
    if (bySlug) return bySlug;
  }
  const role = t(ref.role);
  if (!role || /^general\s*application/i.test(role)) return null;

  const all = await listCareerJobs({ status: 'all', q: role });
  const key = role.toLowerCase();
  const exact =
    all.find((j) => j.title.toLowerCase() === key) ||
    all.find((j) => t(j.content.role).toLowerCase() === key) ||
    all.find((j) => j.slug.toLowerCase() === key);
  return exact || null;
}

function hiringUrl(jobId: number, candidateId?: number | null) {
  const base = `/admin/hiring?tab=pipeline&job=${jobId}`;
  return candidateId ? `${base}&candidate=${candidateId}` : base;
}

export function enquiryStatusForStage(stage: CandidateStage): Enquiry['status'] | null {
  if (stage === 'screening' || stage === 'interview' || stage === 'offer' || stage === 'on_hold') {
    return 'in_progress';
  }
  if (stage === 'hired' || stage === 'rejected' || stage === 'withdrawn') {
    return 'closed';
  }
  return null;
}

/** Push candidate stage → enquiry inbox status (never reopens a closed enquiry). */
export async function syncEnquiryStatusFromCandidate(
  enquiryId: number | null | undefined,
  stage: CandidateStage
): Promise<void> {
  if (!enquiryId) return;
  const next = enquiryStatusForStage(stage);
  if (!next) return;
  const enquiry = await getEnquiry(enquiryId);
  if (!enquiry || !isCareersEnquiry(enquiry.payload_json)) return;
  if (enquiry.status === 'closed') return;
  if (enquiry.status === next) return;
  if (enquiry.status === 'in_progress' && next === 'new') return;
  await updateEnquiry(enquiryId, { status: next });
}

export async function getPipelineByEnquiryIds(ids: number[]): Promise<Map<number, EnquiryPipelineLink>> {
  const map = new Map<number, EnquiryPipelineLink>();
  const unique = [...new Set(ids.filter((n) => n > 0))];
  if (!unique.length) return map;
  await ensureCareerHiringTables();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.id, c.enquiry_id, c.stage, c.job_id, j.title AS job_title, j.slug AS job_slug
     FROM career_candidates c
     LEFT JOIN career_jobs j ON j.id = c.job_id
     WHERE c.enquiry_id IN (?)`,
    [unique]
  );
  for (const row of rows) {
    const enquiryId = Number(row.enquiry_id);
    const stage = String(row.stage) as CandidateStage;
    const jobId = Number(row.job_id);
    const candidateId = Number(row.id);
    const jobTitle = String(row.job_title || '');
    const holding = String(row.job_slug || '') === GENERAL_APPLICATIONS_SLUG;
    map.set(enquiryId, {
      candidateId,
      stage,
      stageLabel: STAGE_LABELS[stage] || stage,
      jobId,
      jobTitle,
      holding,
      hiringUrl: hiringUrl(jobId, candidateId),
    });
  }
  return map;
}

export async function enrichEnquiriesWithPipeline(enquiries: Enquiry[]): Promise<EnquiryWithPipeline[]> {
  const careersIds = enquiries.filter((e) => isCareersEnquiry(e.payload_json)).map((e) => e.id);
  const map = await getPipelineByEnquiryIds(careersIds);
  return enquiries.map((e) => ({
    ...e,
    pipeline: map.get(e.id) || null,
  }));
}

async function listUnmappedCareersEnquiryIds(limit = 400): Promise<number[]> {
  await ensureCareerHiringTables();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT e.id
     FROM enquiries e
     LEFT JOIN career_candidates c ON c.enquiry_id = e.id
     WHERE JSON_UNQUOTE(JSON_EXTRACT(e.payload_json, '$.source')) = 'careers_apply'
       AND c.id IS NULL
     ORDER BY e.id DESC
     LIMIT ?`,
    [Math.min(800, Math.max(1, limit))]
  );
  return rows.map((r) => Number(r.id));
}

/** Count careers enquiries not yet linked to a pipeline candidate. */
export async function countUnmappedCareersEnquiries(): Promise<number> {
  await ensureCareerHiringTables();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS n
     FROM enquiries e
     LEFT JOIN career_candidates c ON c.enquiry_id = e.id
     WHERE JSON_UNQUOTE(JSON_EXTRACT(e.payload_json, '$.source')) = 'careers_apply'
       AND c.id IS NULL`
  );
  return Number(rows[0]?.n) || 0;
}

async function persistPipelineOnEnquiry(
  enquiryId: number,
  result: { candidateId: number | null; job: CareerJob | null; holding: boolean; duplicate: boolean }
) {
  if (!result.job || !result.candidateId) return;
  await mergeEnquiryPayload(enquiryId, {
    job_title: result.job.title,
    job_id: result.job.id,
    job_public_id: result.job.publicId,
    job_slug: result.job.slug,
    candidate_id: result.candidateId,
    pipeline_matched: result.holding ? 'holding' : 'yes',
    pipeline_duplicate: result.duplicate ? 'yes' : 'no',
    hiring_url: hiringUrl(result.job.id, result.candidateId),
  });
}

/**
 * Ingest one careers enquiry into Hiring.
 * Always lands somewhere: matched open/closed job, or General Applications holding queue.
 */
export async function ingestEnquiryIntoPipeline(
  enquiryId: number,
  actor = 'system'
): Promise<{
  candidateId: number | null;
  job: CareerJob | null;
  matched: boolean;
  duplicate: boolean;
  holding: boolean;
  created: boolean;
}> {
  const enquiry = await getEnquiry(enquiryId);
  if (!enquiry) throw new Error('Enquiry not found');
  const p = enquiry.payload_json || {};
  if (!isCareersEnquiry(p)) throw new Error('Not a careers application');

  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id, job_id FROM career_candidates WHERE enquiry_id = ? LIMIT 1`,
    [enquiryId]
  );
  if (existing[0]) {
    const job = await getCareerJob(Number(existing[0].job_id));
    const candidateId = Number(existing[0].id);
    await persistPipelineOnEnquiry(enquiryId, {
      candidateId,
      job,
      holding: job?.slug === GENERAL_APPLICATIONS_SLUG,
      duplicate: true,
    });
    return {
      candidateId,
      job,
      matched: true,
      duplicate: true,
      holding: job?.slug === GENERAL_APPLICATIONS_SLUG,
      created: false,
    };
  }

  const role = t(p.role);
  const name = t(p.name) || 'Applicant';
  const email = t(p.email);
  const phone = t(p.phone);
  const experience = t(p.experience);
  const message = t(p.message);
  const resumeFile = t(p.resume_file);
  const resumeName = t(p.resume_name);
  const jobId = Number(p.job_id) || null;
  const publicId = t(p.job_public_id) || null;
  const slug = t(p.job_slug) || null;

  let job = await resolveJobForIngest({ jobId, publicId, slug, role });
  let holding = false;

  if (!job) {
    job = await ensureGeneralApplicationsJob(actor);
    holding = true;
  } else if (job.slug === GENERAL_APPLICATIONS_SLUG) {
    holding = true;
  }

  // Prefer standard ingest when the job is currently open
  if (!holding && job.status === 'open') {
    const ingest = await ingestWebsiteApplication({
      enquiryId,
      role: role || job.title,
      name,
      email,
      phone,
      experience: experience || undefined,
      resumeFile: resumeFile || undefined,
      resumeName: resumeName || undefined,
      message: message || undefined,
      jobId: job.id,
      publicId: job.publicId,
      slug: job.slug,
    });
    if (ingest.matched && ingest.candidateId) {
      await persistPipelineOnEnquiry(enquiryId, {
        candidateId: ingest.candidateId,
        job: ingest.job,
        holding: false,
        duplicate: ingest.duplicate,
      });
      return {
        candidateId: ingest.candidateId,
        job: ingest.job,
        matched: true,
        duplicate: ingest.duplicate,
        holding: false,
        created: !ingest.duplicate,
      };
    }
  }

  // Closed/paused match or holding queue — create directly
  const noteParts = [
    message || '',
    holding ? `Intended role: ${role || '—'}` : '',
    `Synced from enquiry #${enquiryId}`,
  ].filter(Boolean);

  const candidateId = await createCandidate(
    {
      jobId: job.id,
      enquiryId,
      name,
      email,
      phone,
      experience: experience || undefined,
      resumeFile: resumeFile || undefined,
      resumeName: resumeName || undefined,
      notes: noteParts.join('\n\n'),
      source: 'website',
      stage: holding ? 'on_hold' : 'applied',
      tags: holding ? ['unmatched', 'from-enquiry'] : ['from-enquiry'],
    },
    actor
  );

  await recordEvent({
    jobId: job.id,
    candidateId,
    actor,
    eventType: holding ? 'candidate.holding' : 'candidate.backfill',
    message: holding
      ? `${name} queued in General Applications (enquiry #${enquiryId}).`
      : `${name} synced from enquiry #${enquiryId} → ${job.title}.`,
    meta: { enquiryId, holding },
  });

  await persistPipelineOnEnquiry(enquiryId, {
    candidateId,
    job,
    holding,
    duplicate: false,
  });

  return {
    candidateId,
    job,
    matched: true,
    duplicate: false,
    holding,
    created: true,
  };
}

/** Bulk sync all unmapped careers enquiries into Hiring (idempotent). */
export async function syncCareersEnquiriesToPipeline(actor = 'system'): Promise<SyncEnquiriesResult> {
  const ids = await listUnmappedCareersEnquiryIds(500);
  const result: SyncEnquiriesResult = {
    scanned: ids.length,
    created: 0,
    linked: 0,
    duplicates: 0,
    holding: 0,
    alreadyLinked: 0,
    errors: 0,
    message: '',
  };

  if (!ids.length) {
    result.message = 'All careers applications are already in the Hiring pipeline.';
    return result;
  }

  await ensureGeneralApplicationsJob(actor);

  for (const id of ids) {
    try {
      const out = await ingestEnquiryIntoPipeline(id, actor);
      if (out.holding) result.holding += 1;
      if (out.duplicate) result.duplicates += 1;
      else if (out.created) result.created += 1;
      else result.linked += 1;
    } catch (err) {
      result.errors += 1;
      console.error(`[hiring] sync enquiry #${id} failed`, err);
    }
  }

  const placed = result.created + result.linked + result.duplicates;
  result.message =
    placed > 0
      ? `Synced ${placed} application(s) into Hiring` +
        (result.holding ? ` · ${result.holding} in General Applications queue` : '') +
        (result.errors ? ` · ${result.errors} failed` : '') +
        '.'
      : result.errors
        ? `Sync finished with ${result.errors} error(s).`
        : 'Nothing to sync.';

  return result;
}

/** HR assigns an unmatched (or holding) enquiry to a specific job. */
export async function assignEnquiryToJob(
  enquiryId: number,
  jobId: number,
  actor: string
): Promise<CareerCandidate> {
  const enquiry = await getEnquiry(enquiryId);
  if (!enquiry || !isCareersEnquiry(enquiry.payload_json)) {
    throw new Error('Careers enquiry not found');
  }
  const job = await getCareerJob(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status === 'closed') throw new Error('Cannot assign to an archived job — reopen it first');

  const [existing] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM career_candidates WHERE enquiry_id = ? LIMIT 1`,
    [enquiryId]
  );

  if (existing[0]) {
    const candId = Number(existing[0].id);
    await pool.query(
      `UPDATE career_candidates SET job_id = ?, stage = IF(stage = 'on_hold', 'applied', stage),
         tags_json = ?, updated_by = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?`,
      [jobId, JSON.stringify(['reassigned']), actor.slice(0, 120), candId]
    );
    await recordEvent({
      jobId,
      candidateId: candId,
      actor,
      eventType: 'candidate.reassigned',
      message: `Reassigned enquiry #${enquiryId} to “${job.title}”.`,
      meta: { enquiryId },
    });
    await persistPipelineOnEnquiry(enquiryId, {
      candidateId: candId,
      job,
      holding: false,
      duplicate: false,
    });
    if (enquiry.status === 'new') await updateEnquiry(enquiryId, { status: 'in_progress' });
    const cand = await getCandidate(candId);
    if (!cand) throw new Error('Candidate missing after reassignment');
    return cand;
  }

  const p = enquiry.payload_json;
  const candidateId = await createCandidate(
    {
      jobId,
      enquiryId,
      name: t(p.name) || 'Applicant',
      email: t(p.email),
      phone: t(p.phone),
      experience: t(p.experience) || undefined,
      resumeFile: t(p.resume_file) || undefined,
      resumeName: t(p.resume_name) || undefined,
      notes: t(p.message) || undefined,
      source: 'website',
      stage: 'applied',
      tags: ['from-enquiry'],
    },
    actor
  );
  await persistPipelineOnEnquiry(enquiryId, {
    candidateId,
    job,
    holding: false,
    duplicate: false,
  });
  if (enquiry.status === 'new') await updateEnquiry(enquiryId, { status: 'in_progress' });
  const cand = await getCandidate(candidateId);
  if (!cand) throw new Error('Candidate missing after create');
  return cand;
}

/** Soft auto-sync used when Hiring / Enquiries loads — capped, never throws. */
export async function autoSyncCareersEnquiries(actor = 'system'): Promise<SyncEnquiriesResult | null> {
  try {
    const n = await countUnmappedCareersEnquiries();
    if (n === 0) return null;
    return await syncCareersEnquiriesToPipeline(actor);
  } catch (err) {
    console.error('[hiring] auto-sync failed', err);
    return null;
  }
}

export function pipelineBadgeClass(link: EnquiryPipelineLink | null): string {
  if (!link) return 'is-unmatched';
  if (link.holding) return 'is-holding';
  if (link.stage === 'hired') return 'is-hired';
  if (link.stage === 'rejected' || link.stage === 'withdrawn') return 'is-closed';
  if (link.stage === 'interview' || link.stage === 'offer') return 'is-hot';
  return 'is-linked';
}
