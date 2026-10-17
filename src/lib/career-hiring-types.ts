/**
 * Client-safe hiring domain types & labels (no DB / mysql2).
 * Server code lives in career-hiring.ts and re-exports these.
 */

export const JOB_STATUSES = ['draft', 'open', 'paused', 'closed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const CLOSE_REASONS = ['filled', 'expired', 'cancelled', 'other'] as const;
export type CloseReason = (typeof CLOSE_REASONS)[number];

export const CANDIDATE_STAGES = [
  'applied',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected',
  'withdrawn',
  'on_hold',
] as const;
export type CandidateStage = (typeof CANDIDATE_STAGES)[number];

export const CANDIDATE_SOURCES = ['website', 'referral', 'agency', 'walk_in', 'linkedin', 'other'] as const;
export type CandidateSource = (typeof CANDIDATE_SOURCES)[number];

export const STAGE_LABELS: Record<CandidateStage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  on_hold: 'On hold',
};

export const STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  paused: 'Paused',
  closed: 'Archived',
};

export const CLOSE_REASON_LABELS: Record<CloseReason, string> = {
  filled: 'Position filled',
  expired: 'Posting expired',
  cancelled: 'Cancelled',
  other: 'Other',
};

/** Nested posting fields kept as JSON (lists, links, HTML about). */
export type CareerJobContent = {
  chips?: string[];
  responsibilities?: string[];
  requirements?: string[];
  benefits?: string[];
  facts?: string[];
  description?: string;
  role?: string;
  applyLabel?: string;
  href?: string;
  linkLabel?: string;
  newTab?: boolean;
  background?: string;
};

export type CareerJob = {
  id: number;
  publicId: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  jobType: string;
  experience: string;
  education: string;
  badge: string;
  summary: string;
  content: CareerJobContent;
  status: JobStatus;
  closeReason: CloseReason | null;
  closeNotes: string;
  opensAt: string | null;
  closesAt: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  vacancies: number;
  sortOrder: number;
  createdBy: string;
  updatedBy: string;
  closedBy: string;
  createdAt: string;
  updatedAt: string;
  /** Present on list endpoints */
  candidateCount?: number;
  hiredCount?: number;
};

export type CareerCandidate = {
  id: number;
  jobId: number;
  enquiryId: number | null;
  name: string;
  email: string;
  phone: string;
  experience: string;
  resumeFile: string;
  resumeName: string;
  stage: CandidateStage;
  source: string;
  interviewer: string;
  interviewAt: string | null;
  offerAt: string | null;
  joinedAt: string | null;
  rejectedAt: string | null;
  rating: number | null;
  notes: string;
  tags: string[];
  sortOrder: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  jobTitle?: string;
};

export type CareerEvent = {
  id: number;
  jobId: number | null;
  candidateId: number | null;
  actor: string;
  eventType: string;
  fromValue: string;
  toValue: string;
  message: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

export type JobWriteInput = {
  title: string;
  slug?: string;
  department?: string;
  location?: string;
  jobType?: string;
  experience?: string;
  education?: string;
  badge?: string;
  summary?: string;
  content?: CareerJobContent;
  status?: JobStatus;
  opensAt?: string | null;
  closesAt?: string | null;
  vacancies?: number;
  sortOrder?: number;
  /** When publishing without closesAt: days from now (default 30). */
  durationDays?: number;
  /** Skip soft block when another open role already uses the same title. */
  allowDuplicateTitle?: boolean;
};

export type CloseJobInput = {
  reason: CloseReason;
  notes?: string;
  hiredCandidateIds?: number[];
  joinedAt?: string | null;
};

export type CandidateWriteInput = {
  jobId: number;
  name: string;
  email?: string;
  phone?: string;
  experience?: string;
  resumeFile?: string;
  resumeName?: string;
  stage?: CandidateStage;
  source?: string;
  interviewer?: string;
  interviewAt?: string | null;
  offerAt?: string | null;
  joinedAt?: string | null;
  rejectedAt?: string | null;
  rating?: number | null;
  notes?: string;
  tags?: string[];
  enquiryId?: number | null;
};
