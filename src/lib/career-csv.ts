import type { CareerCandidate } from '@/lib/career-hiring-types';
import { STAGE_LABELS } from '@/lib/career-hiring-types';

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function candidatesToCsv(candidates: CareerCandidate[]): string {
  const headers = [
    'id',
    'name',
    'email',
    'phone',
    'job_title',
    'job_id',
    'stage',
    'stage_label',
    'source',
    'experience',
    'interviewer',
    'interview_at',
    'offer_at',
    'joined_at',
    'rejected_at',
    'rating',
    'resume_name',
    'enquiry_id',
    'created_at',
    'updated_at',
    'notes',
  ];
  const rows = candidates.map((c) =>
    [
      c.id,
      c.name,
      c.email,
      c.phone,
      c.jobTitle,
      c.jobId,
      c.stage,
      STAGE_LABELS[c.stage],
      c.source,
      c.experience,
      c.interviewer,
      c.interviewAt,
      c.offerAt,
      c.joinedAt,
      c.rejectedAt,
      c.rating,
      c.resumeName,
      c.enquiryId,
      c.createdAt,
      c.updatedAt,
      c.notes,
    ]
      .map(csvCell)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\r\n') + '\r\n';
}
