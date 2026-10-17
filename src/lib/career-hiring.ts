import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { ensureCareerHiringTables } from '@/lib/schema-ensure';
import type { CareersJob } from '@/lib/careers-sections';
import {
  CANDIDATE_STAGES,
  CLOSE_REASON_LABELS,
  CLOSE_REASONS,
  JOB_STATUSES,
  STAGE_LABELS,
  STATUS_LABELS,
  type CandidateStage,
  type CandidateWriteInput,
  type CareerCandidate,
  type CareerEvent,
  type CareerJob,
  type CareerJobContent,
  type CloseJobInput,
  type CloseReason,
  type JobStatus,
  type JobWriteInput,
} from '@/lib/career-hiring-types';

export type {
  CandidateSource,
  CandidateStage,
  CandidateWriteInput,
  CareerCandidate,
  CareerEvent,
  CareerJob,
  CareerJobContent,
  CloseJobInput,
  CloseReason,
  JobStatus,
  JobWriteInput,
} from '@/lib/career-hiring-types';

export {
  CANDIDATE_SOURCES,
  CANDIDATE_STAGES,
  CLOSE_REASON_LABELS,
  CLOSE_REASONS,
  JOB_STATUSES,
  STAGE_LABELS,
  STATUS_LABELS,
} from '@/lib/career-hiring-types';

const DEFAULT_DURATION_DAYS = 30;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const t = (v: unknown) => String(v ?? '').trim();
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => t(x)).filter(Boolean) : []);

function iso(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function mysqlDt(isoStr: string | null | undefined): string | null {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140) || 'role';
}

function publicId(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

function parseContent(raw: unknown): CareerJobContent {
  if (!raw) return {};
  const o = typeof raw === 'string' ? (JSON.parse(raw) as CareerJobContent) : (raw as CareerJobContent);
  return {
    chips: strs(o.chips),
    responsibilities: strs(o.responsibilities),
    requirements: strs(o.requirements),
    benefits: strs(o.benefits),
    facts: strs(o.facts),
    description: t(o.description) || undefined,
    role: t(o.role) || undefined,
    applyLabel: t(o.applyLabel) || undefined,
    href: t(o.href) || undefined,
    linkLabel: t(o.linkLabel) || undefined,
    newTab: Boolean(o.newTab),
    background: t(o.background) || undefined,
  };
}

function parseTags(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      return strs(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return strs(raw);
}

function mapJob(row: RowDataPacket): CareerJob {
  return {
    id: Number(row.id),
    publicId: String(row.public_id),
    slug: String(row.slug),
    title: String(row.title),
    department: t(row.department),
    location: t(row.location),
    jobType: t(row.job_type),
    experience: t(row.experience),
    education: t(row.education),
    badge: t(row.badge),
    summary: t(row.summary),
    content: parseContent(row.content_json),
    status: (JOB_STATUSES.includes(row.status) ? row.status : 'draft') as JobStatus,
    closeReason: CLOSE_REASONS.includes(row.close_reason) ? row.close_reason : null,
    closeNotes: t(row.close_notes),
    opensAt: iso(row.opens_at),
    closesAt: iso(row.closes_at),
    publishedAt: iso(row.published_at),
    closedAt: iso(row.closed_at),
    vacancies: Math.max(1, Number(row.vacancies) || 1),
    sortOrder: Number(row.sort_order) || 0,
    createdBy: t(row.created_by),
    updatedBy: t(row.updated_by),
    closedBy: t(row.closed_by),
    createdAt: iso(row.created_at) || '',
    updatedAt: iso(row.updated_at) || '',
    candidateCount: row.candidate_count != null ? Number(row.candidate_count) : undefined,
    hiredCount: row.hired_count != null ? Number(row.hired_count) : undefined,
  };
}

function mapCandidate(row: RowDataPacket): CareerCandidate {
  return {
    id: Number(row.id),
    jobId: Number(row.job_id),
    enquiryId: row.enquiry_id != null ? Number(row.enquiry_id) : null,
    name: String(row.name),
    email: t(row.email),
    phone: t(row.phone),
    experience: t(row.experience),
    resumeFile: t(row.resume_file),
    resumeName: t(row.resume_name),
    stage: (CANDIDATE_STAGES.includes(row.stage) ? row.stage : 'applied') as CandidateStage,
    source: t(row.source) || 'website',
    interviewer: t(row.interviewer),
    interviewAt: iso(row.interview_at),
    offerAt: iso(row.offer_at),
    joinedAt: iso(row.joined_at),
    rejectedAt: iso(row.rejected_at),
    rating: row.rating != null ? Number(row.rating) : null,
    notes: t(row.notes),
    tags: parseTags(row.tags_json),
    sortOrder: Number(row.sort_order) || 0,
    createdBy: t(row.created_by),
    updatedBy: t(row.updated_by),
    createdAt: iso(row.created_at) || '',
    updatedAt: iso(row.updated_at) || '',
    jobTitle: row.job_title != null ? String(row.job_title) : undefined,
  };
}

function mapEvent(row: RowDataPacket): CareerEvent {
  let meta: Record<string, unknown> | null = null;
  if (row.meta_json) {
    try {
      meta = typeof row.meta_json === 'string' ? JSON.parse(row.meta_json) : row.meta_json;
    } catch {
      meta = null;
    }
  }
  return {
    id: Number(row.id),
    jobId: row.job_id != null ? Number(row.job_id) : null,
    candidateId: row.candidate_id != null ? Number(row.candidate_id) : null,
    actor: t(row.actor),
    eventType: String(row.event_type),
    fromValue: t(row.from_value),
    toValue: t(row.to_value),
    message: t(row.message),
    meta,
    createdAt: iso(row.created_at) || '',
  };
}

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  const slug = slugify(base);
  for (let i = 0; i < 50; i++) {
    const trySlug = i === 0 ? slug : `${slug}-${i + 1}`;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM career_jobs WHERE slug = ? ${excludeId ? 'AND id <> ?' : ''} LIMIT 1`,
      excludeId ? [trySlug, excludeId] : [trySlug]
    );
    if (!rows.length) return trySlug;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

export async function recordEvent(input: {
  jobId?: number | null;
  candidateId?: number | null;
  actor?: string;
  eventType: string;
  fromValue?: string;
  toValue?: string;
  message?: string;
  meta?: Record<string, unknown>;
}) {
  await ensureCareerHiringTables();
  await pool.query(
    `INSERT INTO career_events (job_id, candidate_id, actor, event_type, from_value, to_value, message, meta_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.jobId ?? null,
      input.candidateId ?? null,
      t(input.actor).slice(0, 120) || null,
      input.eventType.slice(0, 64),
      t(input.fromValue).slice(0, 120) || null,
      t(input.toValue).slice(0, 120) || null,
      t(input.message) || null,
      input.meta ? JSON.stringify(input.meta) : null,
    ]
  );
}

/* ------------------------------------------------------------------ */
/* Auto-expire                                                         */
/* ------------------------------------------------------------------ */

/** Close open jobs whose closes_at has passed. Safe to call on every public/admin list. */
export async function expireDueJobs(actor = 'system'): Promise<number> {
  await ensureCareerHiringTables();
  const [due] = await pool.query<RowDataPacket[]>(
    `SELECT id, title FROM career_jobs
     WHERE status = 'open' AND closes_at IS NOT NULL AND closes_at <= UTC_TIMESTAMP()`
  );
  if (!due.length) return 0;
  const ids = due.map((r) => Number(r.id));
  await pool.query(
    `UPDATE career_jobs
     SET status = 'closed', close_reason = 'expired', closed_at = UTC_TIMESTAMP(), closed_by = ?, updated_by = ?
     WHERE id IN (?)`,
    [actor.slice(0, 120), actor.slice(0, 120), ids]
  );
  for (const row of due) {
    await recordEvent({
      jobId: Number(row.id),
      actor,
      eventType: 'job.expired',
      fromValue: 'open',
      toValue: 'closed',
      message: `Auto-archived: posting period ended for “${row.title}”.`,
    });
  }
  return due.length;
}

/* ------------------------------------------------------------------ */
/* Jobs CRUD                                                           */
/* ------------------------------------------------------------------ */

export async function listCareerJobs(opts: {
  status?: JobStatus | 'active' | 'archive' | 'all';
  q?: string;
  department?: string;
} = {}): Promise<CareerJob[]> {
  await ensureCareerHiringTables();
  await expireDueJobs();
  const where: string[] = ['1=1'];
  const params: unknown[] = [];
  if (opts.status === 'active') {
    where.push(`j.status IN ('draft','open','paused')`);
  } else if (opts.status === 'archive') {
    where.push(`j.status = 'closed'`);
  } else if (opts.status && opts.status !== 'all' && JOB_STATUSES.includes(opts.status)) {
    where.push(`j.status = ?`);
    params.push(opts.status);
  }
  if (opts.q) {
    where.push(`(j.title LIKE ? OR j.department LIKE ? OR j.location LIKE ? OR j.slug LIKE ?)`);
    const like = `%${opts.q}%`;
    params.push(like, like, like, like);
  }
  if (opts.department) {
    where.push(`j.department = ?`);
    params.push(opts.department);
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT j.*,
       (SELECT COUNT(*) FROM career_candidates c WHERE c.job_id = j.id) AS candidate_count,
       (SELECT COUNT(*) FROM career_candidates c WHERE c.job_id = j.id AND c.stage = 'hired') AS hired_count
     FROM career_jobs j
     WHERE ${where.join(' AND ')}
     ORDER BY
       FIELD(j.status, 'open', 'paused', 'draft', 'closed'),
       COALESCE(j.closes_at, '9999-12-31') ASC,
       j.sort_order ASC,
       j.id DESC`,
    params
  );
  return rows.map(mapJob);
}

/** Public open roles only (after auto-expire). */
export async function listOpenCareerJobs(): Promise<CareerJob[]> {
  await ensureCareerHiringTables();
  await expireDueJobs();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM career_jobs
     WHERE status = 'open'
       AND (opens_at IS NULL OR opens_at <= UTC_TIMESTAMP())
       AND (closes_at IS NULL OR closes_at > UTC_TIMESTAMP())
     ORDER BY sort_order ASC, id DESC`
  );
  return rows.map(mapJob);
}

export async function getCareerJob(id: number): Promise<CareerJob | null> {
  await ensureCareerHiringTables();
  await expireDueJobs();
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM career_jobs WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ? mapJob(rows[0]) : null;
}

export async function getCareerJobBySlug(slug: string): Promise<CareerJob | null> {
  await ensureCareerHiringTables();
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM career_jobs WHERE slug = ? LIMIT 1`, [slug]);
  return rows[0] ? mapJob(rows[0]) : null;
}

export async function createCareerJob(input: JobWriteInput, actor: string): Promise<number> {
  await ensureCareerHiringTables();
  const title = t(input.title);
  if (!title) throw new Error('Job title is required');
  const slug = await uniqueSlug(input.slug || title);
  const status: JobStatus = input.status && JOB_STATUSES.includes(input.status) ? input.status : 'draft';
  let closesAt = mysqlDt(input.closesAt ?? null);
  let opensAt = mysqlDt(input.opensAt ?? null);
  let publishedAt: string | null = null;
  if (status === 'open') {
    opensAt = opensAt || mysqlDt(new Date().toISOString());
    publishedAt = opensAt;
    if (!closesAt) {
      const days = Math.min(365, Math.max(1, Number(input.durationDays) || DEFAULT_DURATION_DAYS));
      const end = new Date();
      end.setUTCDate(end.getUTCDate() + days);
      closesAt = mysqlDt(end.toISOString());
    }
  }
  const content = input.content || {};
  const [res] = await pool.query<ResultSetHeader>(
    `INSERT INTO career_jobs (
       public_id, slug, title, department, location, job_type, experience, education, badge, summary,
       content_json, status, opens_at, closes_at, published_at, vacancies, sort_order, created_by, updated_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      publicId(),
      slug,
      title,
      t(input.department) || null,
      t(input.location) || null,
      t(input.jobType) || null,
      t(input.experience) || null,
      t(input.education) || null,
      t(input.badge) || null,
      t(input.summary) || null,
      JSON.stringify(content),
      status,
      opensAt,
      closesAt,
      publishedAt,
      Math.max(1, Number(input.vacancies) || 1),
      Number(input.sortOrder) || 0,
      actor.slice(0, 120) || null,
      actor.slice(0, 120) || null,
    ]
  );
  await recordEvent({
    jobId: res.insertId,
    actor,
    eventType: status === 'open' ? 'job.published' : 'job.created',
    toValue: status,
    message: status === 'open' ? `Published “${title}”.` : `Created draft “${title}”.`,
  });
  return res.insertId;
}

export async function updateCareerJob(id: number, input: Partial<JobWriteInput>, actor: string): Promise<void> {
  await ensureCareerHiringTables();
  const current = await getCareerJob(id);
  if (!current) throw new Error('Job not found');
  if (current.status === 'closed') throw new Error('Archived jobs cannot be edited — reopen first if needed');

  const title = input.title != null ? t(input.title) : current.title;
  if (!title) throw new Error('Job title is required');
  const slug =
    input.slug != null || (input.title != null && t(input.title) !== current.title)
      ? await uniqueSlug(input.slug || title, id)
      : current.slug;

  let status = current.status;
  if (input.status && JOB_STATUSES.includes(input.status) && input.status !== 'closed') {
    status = input.status;
  }

  let opensAt = input.opensAt !== undefined ? mysqlDt(input.opensAt) : mysqlDt(current.opensAt);
  let closesAt = input.closesAt !== undefined ? mysqlDt(input.closesAt) : mysqlDt(current.closesAt);
  let publishedAt = mysqlDt(current.publishedAt);

  if (status === 'open' && current.status !== 'open') {
    opensAt = opensAt || mysqlDt(new Date().toISOString());
    publishedAt = publishedAt || opensAt;
    if (!closesAt) {
      const days = Math.min(365, Math.max(1, Number(input.durationDays) || DEFAULT_DURATION_DAYS));
      const end = new Date();
      end.setUTCDate(end.getUTCDate() + days);
      closesAt = mysqlDt(end.toISOString());
    }
  }

  const content = input.content !== undefined ? input.content || {} : current.content;

  await pool.query(
    `UPDATE career_jobs SET
       slug = ?, title = ?, department = ?, location = ?, job_type = ?, experience = ?, education = ?,
       badge = ?, summary = ?, content_json = ?, status = ?, opens_at = ?, closes_at = ?, published_at = ?,
       vacancies = ?, sort_order = ?, updated_by = ?
     WHERE id = ?`,
    [
      slug,
      title,
      t(input.department ?? current.department) || null,
      t(input.location ?? current.location) || null,
      t(input.jobType ?? current.jobType) || null,
      t(input.experience ?? current.experience) || null,
      t(input.education ?? current.education) || null,
      t(input.badge ?? current.badge) || null,
      t(input.summary ?? current.summary) || null,
      JSON.stringify(content),
      status,
      opensAt,
      closesAt,
      publishedAt,
      Math.max(1, Number(input.vacancies ?? current.vacancies) || 1),
      Number(input.sortOrder ?? current.sortOrder) || 0,
      actor.slice(0, 120) || null,
      id,
    ]
  );

  if (status !== current.status) {
    await recordEvent({
      jobId: id,
      actor,
      eventType: status === 'open' ? 'job.published' : status === 'paused' ? 'job.paused' : 'job.status',
      fromValue: current.status,
      toValue: status,
      message: `Status changed from ${STATUS_LABELS[current.status]} to ${STATUS_LABELS[status]}.`,
    });
  } else {
    await recordEvent({ jobId: id, actor, eventType: 'job.updated', message: `Updated “${title}”.` });
  }
}

export async function closeCareerJob(id: number, input: CloseJobInput, actor: string): Promise<void> {
  await ensureCareerHiringTables();
  const job = await getCareerJob(id);
  if (!job) throw new Error('Job not found');
  if (job.status === 'closed') throw new Error('Job is already archived');
  if (!CLOSE_REASONS.includes(input.reason)) throw new Error('Invalid close reason');

  const hiredIds = (input.hiredCandidateIds || []).map(Number).filter((n) => n > 0);
  const joinedAt = mysqlDt(input.joinedAt ?? new Date().toISOString());

  await pool.query(
    `UPDATE career_jobs SET
       status = 'closed', close_reason = ?, close_notes = ?, closed_at = UTC_TIMESTAMP(),
       closed_by = ?, updated_by = ?
     WHERE id = ?`,
    [input.reason, t(input.notes) || null, actor.slice(0, 120), actor.slice(0, 120), id]
  );

  if (input.reason === 'filled' && hiredIds.length) {
    for (const cid of hiredIds) {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT id, stage, name FROM career_candidates WHERE id = ? AND job_id = ? LIMIT 1`,
        [cid, id]
      );
      if (!rows[0]) continue;
      const prev = String(rows[0].stage);
      await pool.query(
        `UPDATE career_candidates SET stage = 'hired', joined_at = COALESCE(joined_at, ?), updated_by = ? WHERE id = ?`,
        [joinedAt, actor.slice(0, 120), cid]
      );
      if (prev !== 'hired') {
        await recordEvent({
          jobId: id,
          candidateId: cid,
          actor,
          eventType: 'candidate.hired',
          fromValue: prev,
          toValue: 'hired',
          message: `Hired ${rows[0].name}.`,
        });
      }
    }
  }

  await recordEvent({
    jobId: id,
    actor,
    eventType: 'job.closed',
    fromValue: job.status,
    toValue: 'closed',
    message: `${CLOSE_REASON_LABELS[input.reason]}: ${t(input.notes) || job.title}`,
    meta: { reason: input.reason, hiredCandidateIds: hiredIds },
  });
}

export async function reopenCareerJob(id: number, actor: string, durationDays = DEFAULT_DURATION_DAYS): Promise<void> {
  await ensureCareerHiringTables();
  const job = await getCareerJob(id);
  if (!job) throw new Error('Job not found');
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + Math.min(365, Math.max(1, durationDays)));
  await pool.query(
    `UPDATE career_jobs SET
       status = 'open', close_reason = NULL, close_notes = NULL, closed_at = NULL, closed_by = NULL,
       opens_at = UTC_TIMESTAMP(), closes_at = ?, published_at = COALESCE(published_at, UTC_TIMESTAMP()),
       updated_by = ?
     WHERE id = ?`,
    [mysqlDt(end.toISOString()), actor.slice(0, 120), id]
  );
  await recordEvent({
    jobId: id,
    actor,
    eventType: 'job.reopened',
    fromValue: job.status,
    toValue: 'open',
    message: `Reopened “${job.title}” for ${durationDays} days.`,
  });
}

/* ------------------------------------------------------------------ */
/* Candidates                                                          */
/* ------------------------------------------------------------------ */

export async function listCandidates(opts: { jobId?: number; stage?: CandidateStage; q?: string } = {}): Promise<CareerCandidate[]> {
  await ensureCareerHiringTables();
  const where: string[] = ['1=1'];
  const params: unknown[] = [];
  if (opts.jobId) {
    where.push('c.job_id = ?');
    params.push(opts.jobId);
  }
  if (opts.stage && CANDIDATE_STAGES.includes(opts.stage)) {
    where.push('c.stage = ?');
    params.push(opts.stage);
  }
  if (opts.q) {
    where.push(`(c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)`);
    const like = `%${opts.q}%`;
    params.push(like, like, like);
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.*, j.title AS job_title
     FROM career_candidates c
     JOIN career_jobs j ON j.id = c.job_id
     WHERE ${where.join(' AND ')}
     ORDER BY FIELD(c.stage, 'interview','offer','screening','applied','on_hold','hired','rejected','withdrawn'),
              c.updated_at DESC, c.id DESC`,
    params
  );
  return rows.map(mapCandidate);
}

export async function getCandidate(id: number): Promise<CareerCandidate | null> {
  await ensureCareerHiringTables();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.*, j.title AS job_title FROM career_candidates c
     JOIN career_jobs j ON j.id = c.job_id WHERE c.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ? mapCandidate(rows[0]) : null;
}

export async function createCandidate(input: CandidateWriteInput, actor: string): Promise<number> {
  await ensureCareerHiringTables();
  const name = t(input.name);
  if (!name) throw new Error('Candidate name is required');
  if (!input.jobId) throw new Error('Job is required');
  const job = await getCareerJob(input.jobId);
  if (!job) throw new Error('Job not found');
  const stage: CandidateStage =
    input.stage && CANDIDATE_STAGES.includes(input.stage) ? input.stage : 'applied';

  const [res] = await pool.query<ResultSetHeader>(
    `INSERT INTO career_candidates (
       job_id, enquiry_id, name, email, phone, experience, resume_file, resume_name, stage, source,
       interviewer, interview_at, offer_at, joined_at, rejected_at, rating, notes, tags_json,
       created_by, updated_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.jobId,
      input.enquiryId ?? null,
      name,
      t(input.email) || null,
      t(input.phone) || null,
      t(input.experience) || null,
      t(input.resumeFile) || null,
      t(input.resumeName) || null,
      stage,
      t(input.source) || 'website',
      t(input.interviewer) || null,
      mysqlDt(input.interviewAt ?? null),
      mysqlDt(input.offerAt ?? null),
      mysqlDt(input.joinedAt ?? null),
      mysqlDt(input.rejectedAt ?? null),
      input.rating != null ? Math.min(5, Math.max(1, Number(input.rating))) : null,
      t(input.notes) || null,
      JSON.stringify(input.tags || []),
      actor.slice(0, 120) || null,
      actor.slice(0, 120) || null,
    ]
  );
  await recordEvent({
    jobId: input.jobId,
    candidateId: res.insertId,
    actor,
    eventType: 'candidate.created',
    toValue: stage,
    message: `Added candidate ${name} (${STAGE_LABELS[stage]}).`,
  });
  return res.insertId;
}

export async function updateCandidate(
  id: number,
  input: Partial<CandidateWriteInput> & { stage?: CandidateStage },
  actor: string
): Promise<void> {
  await ensureCareerHiringTables();
  const current = await getCandidate(id);
  if (!current) throw new Error('Candidate not found');

  const stage =
    input.stage && CANDIDATE_STAGES.includes(input.stage) ? input.stage : current.stage;
  let interviewAt = input.interviewAt !== undefined ? mysqlDt(input.interviewAt) : mysqlDt(current.interviewAt);
  let offerAt = input.offerAt !== undefined ? mysqlDt(input.offerAt) : mysqlDt(current.offerAt);
  let joinedAt = input.joinedAt !== undefined ? mysqlDt(input.joinedAt) : mysqlDt(current.joinedAt);
  let rejectedAt = input.rejectedAt !== undefined ? mysqlDt(input.rejectedAt) : mysqlDt(current.rejectedAt);

  if (stage === 'interview' && !interviewAt && current.stage !== 'interview') {
    interviewAt = mysqlDt(new Date().toISOString());
  }
  if (stage === 'offer' && !offerAt && current.stage !== 'offer') {
    offerAt = mysqlDt(new Date().toISOString());
  }
  if (stage === 'hired' && !joinedAt && current.stage !== 'hired') {
    joinedAt = mysqlDt(new Date().toISOString());
  }
  if (stage === 'rejected' && !rejectedAt && current.stage !== 'rejected') {
    rejectedAt = mysqlDt(new Date().toISOString());
  }

  await pool.query(
    `UPDATE career_candidates SET
       name = ?, email = ?, phone = ?, experience = ?, resume_file = ?, resume_name = ?,
       stage = ?, source = ?, interviewer = ?, interview_at = ?, offer_at = ?, joined_at = ?,
       rejected_at = ?, rating = ?, notes = ?, tags_json = ?, updated_by = ?
     WHERE id = ?`,
    [
      t(input.name ?? current.name),
      t(input.email ?? current.email) || null,
      t(input.phone ?? current.phone) || null,
      t(input.experience ?? current.experience) || null,
      t(input.resumeFile ?? current.resumeFile) || null,
      t(input.resumeName ?? current.resumeName) || null,
      stage,
      t(input.source ?? current.source) || 'website',
      t(input.interviewer ?? current.interviewer) || null,
      interviewAt,
      offerAt,
      joinedAt,
      rejectedAt,
      input.rating !== undefined
        ? input.rating == null
          ? null
          : Math.min(5, Math.max(1, Number(input.rating)))
        : current.rating,
      t(input.notes ?? current.notes) || null,
      JSON.stringify(input.tags ?? current.tags),
      actor.slice(0, 120) || null,
      id,
    ]
  );

  if (stage !== current.stage) {
    await recordEvent({
      jobId: current.jobId,
      candidateId: id,
      actor,
      eventType: 'candidate.stage',
      fromValue: current.stage,
      toValue: stage,
      message: `${current.name}: ${STAGE_LABELS[current.stage]} → ${STAGE_LABELS[stage]}.`,
    });
  } else {
    await recordEvent({
      jobId: current.jobId,
      candidateId: id,
      actor,
      eventType: 'candidate.updated',
      message: `Updated ${current.name}.`,
    });
  }
}

export async function addCandidateNote(id: number, note: string, actor: string): Promise<void> {
  const current = await getCandidate(id);
  if (!current) throw new Error('Candidate not found');
  const text = t(note);
  if (!text) throw new Error('Note is required');
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const next = current.notes ? `${current.notes}\n\n[${stamp} ${actor}] ${text}` : `[${stamp} ${actor}] ${text}`;
  await pool.query(`UPDATE career_candidates SET notes = ?, updated_by = ? WHERE id = ?`, [
    next,
    actor.slice(0, 120),
    id,
  ]);
  await recordEvent({
    jobId: current.jobId,
    candidateId: id,
    actor,
    eventType: 'candidate.note',
    message: text.slice(0, 500),
  });
}

export async function listJobEvents(jobId: number, limit = 80): Promise<CareerEvent[]> {
  await ensureCareerHiringTables();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM career_events WHERE job_id = ? ORDER BY id DESC LIMIT ?`,
    [jobId, Math.min(200, Math.max(1, limit))]
  );
  return rows.map(mapEvent);
}

/* ------------------------------------------------------------------ */
/* Public apply → candidate                                            */
/* ------------------------------------------------------------------ */

export async function findOpenJobByRole(role: string): Promise<CareerJob | null> {
  const r = t(role);
  if (!r) return null;
  const open = await listOpenCareerJobs();
  const exact = open.find((j) => j.title === r || t(j.content.role) === r);
  if (exact) return exact;
  const lower = r.toLowerCase();
  return open.find((j) => j.title.toLowerCase() === lower || t(j.content.role).toLowerCase() === lower) || null;
}

export async function ingestWebsiteApplication(input: {
  enquiryId: number;
  role: string;
  name: string;
  email?: string;
  phone?: string;
  experience?: string;
  resumeFile?: string;
  resumeName?: string;
  message?: string;
}): Promise<number | null> {
  const job = await findOpenJobByRole(input.role);
  if (!job) return null;
  const [dup] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM career_candidates WHERE enquiry_id = ? LIMIT 1`,
    [input.enquiryId]
  );
  if (dup[0]) return Number(dup[0].id);
  return createCandidate(
    {
      jobId: job.id,
      enquiryId: input.enquiryId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      experience: input.experience,
      resumeFile: input.resumeFile,
      resumeName: input.resumeName,
      notes: input.message,
      source: 'website',
      stage: 'applied',
    },
    'website'
  );
}

/* ------------------------------------------------------------------ */
/* Map DB job → public CareersJob card shape                           */
/* ------------------------------------------------------------------ */

export function careerJobToPublicCard(job: CareerJob): CareersJob & { id: number; publicId: string; slug: string } {
  const c = job.content || {};
  return {
    id: job.id,
    publicId: job.publicId,
    slug: job.slug,
    title: job.title,
    department: job.department,
    location: job.location,
    type: job.jobType,
    experience: job.experience,
    education: job.education,
    badge: job.badge,
    summary: job.summary,
    chips: c.chips || [],
    responsibilities: c.responsibilities || [],
    requirements: c.requirements || [],
    benefits: c.benefits || [],
    facts: c.facts || [],
    description: c.description,
    role: c.role || job.title,
    applyLabel: c.applyLabel,
    href: c.href,
    linkLabel: c.linkLabel,
    newTab: c.newTab,
    background: c.background,
  };
}

/* ------------------------------------------------------------------ */
/* Import legacy CMS JSON jobs                                         */
/* ------------------------------------------------------------------ */

export async function importLegacyJobs(
  jobs: CareersJob[],
  actor: string,
  opts: { durationDays?: number; asOpen?: boolean } = {}
): Promise<{ imported: number; skipped: number }> {
  await ensureCareerHiringTables();
  const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS c FROM career_jobs`);
  if (Number(countRows[0]?.c || 0) > 0) {
    return { imported: 0, skipped: jobs.length };
  }
  let imported = 0;
  for (const j of jobs) {
    if (!t(j.title) || j.hidden) continue;
    await createCareerJob(
      {
        title: j.title,
        department: j.department,
        location: j.location,
        jobType: j.type,
        experience: j.experience,
        education: j.education,
        badge: j.badge,
        summary: j.summary,
        content: {
          chips: j.chips,
          responsibilities: j.responsibilities,
          requirements: j.requirements,
          benefits: j.benefits,
          facts: j.facts,
          description: j.description,
          role: j.role,
          applyLabel: j.applyLabel,
          href: j.href,
          linkLabel: j.linkLabel,
          newTab: j.newTab,
          background: j.background,
        },
        status: opts.asOpen === false ? 'draft' : 'open',
        durationDays: opts.durationDays || DEFAULT_DURATION_DAYS,
      },
      actor
    );
    imported++;
  }
  return { imported, skipped: jobs.length - imported };
}

export async function hiringStats() {
  await ensureCareerHiringTables();
  await expireDueJobs();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       SUM(status = 'open') AS open_count,
       SUM(status = 'draft') AS draft_count,
       SUM(status = 'paused') AS paused_count,
       SUM(status = 'closed') AS archive_count,
       (SELECT COUNT(*) FROM career_candidates WHERE stage NOT IN ('hired','rejected','withdrawn')) AS pipeline_count,
       (SELECT COUNT(*) FROM career_candidates WHERE stage = 'hired') AS hired_count
     FROM career_jobs`
  );
  const r = rows[0] || {};
  return {
    open: Number(r.open_count) || 0,
    draft: Number(r.draft_count) || 0,
    paused: Number(r.paused_count) || 0,
    archive: Number(r.archive_count) || 0,
    pipeline: Number(r.pipeline_count) || 0,
    hired: Number(r.hired_count) || 0,
  };
}
