/** Minimal iCalendar invite for interview stage emails / downloads. */

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toUtcStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildInterviewIcs(input: {
  title: string;
  candidateName: string;
  interviewAt: string;
  interviewer?: string | null;
  durationMinutes?: number;
  description?: string;
}): { filename: string; mime: string; content: Buffer } | null {
  const start = toUtcStamp(input.interviewAt);
  if (!start) return null;
  const mins = Math.min(240, Math.max(15, input.durationMinutes || 60));
  const endDate = new Date(new Date(input.interviewAt).getTime() + mins * 60_000);
  const end = toUtcStamp(endDate.toISOString());
  const uid = `interview-${start}-${Buffer.from(input.candidateName).toString('base64url').slice(0, 12)}@hiring`;
  const summary = icsEscape(`Interview — ${input.title} — ${input.candidateName}`);
  const descParts = [
    input.description || `Interview for ${input.title}`,
    input.interviewer ? `Interviewer: ${input.interviewer}` : '',
  ].filter(Boolean);
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zigma Technologies//Hiring//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toUtcStamp(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${icsEscape(descParts.join('\\n'))}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
  return {
    filename: `interview-${input.candidateName.replace(/[^\w.-]+/g, '-').slice(0, 40)}.ics`,
    mime: 'text/calendar; charset=utf-8',
    content: Buffer.from(body, 'utf8'),
  };
}
