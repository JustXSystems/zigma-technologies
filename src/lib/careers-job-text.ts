import type { CareersJob } from '@/lib/careers-sections';

/**
 * Turns a pasted job description (Word, PDF, WhatsApp, old HTML field) into the structured
 * job fields, so HR never has to format lists by hand.
 */

type Bucket = 'about' | 'facts' | 'responsibilities' | 'education' | 'requirements' | 'benefits' | 'skip';

export type ParsedJobText = Pick<
  CareersJob,
  'summary' | 'responsibilities' | 'requirements' | 'benefits' | 'facts' | 'department' | 'location' | 'type' | 'experience' | 'education'
>;

const HEADINGS: Array<[Bucket, RegExp]> = [
  ['skip', /how to apply|apply now/i],
  ['responsibilities', /responsibilit|\bduties\b|what you('|’)?ll (do|be doing)|\byour role\b|\bjob role\b/i],
  ['education', /\beducation|qualification/i],
  ['requirements', /requirement|qualification|eligibility|\bskills?\b|what we('|’)?re looking for|who you are|\bcriteria\b|must[- ]have|nice[- ]to[- ]have/i],
  ['benefits', /benefit|\bperks\b|what we offer|we offer|why join/i],
  ['facts', /\b(job|position|role|key) (details|information|info)\b|at a glance/i],
  ['about', /about (the|this) (role|job|position)|\boverview\b|job (description|summary)|\bsummary\b/i],
];

/* Built at runtime: the TS target predates Unicode property escapes in regex literals. */
const EMOJI = new RegExp('\\p{Extended_Pictographic}', 'u');
const EMOJI_SPLIT = new RegExp('\\s+(?=\\p{Extended_Pictographic})', 'u');
const LEADING_JUNK = new RegExp('^(?:[\\s\\-–—•*·▪●►▶➤→✓✔☑>]|\\p{Extended_Pictographic}|\\uFE0F|\\u200D|\\d{1,2}[.)](?=\\s))+', 'u');

const FIELD_FACTS: Array<[keyof ParsedJobText | 'drop', RegExp]> = [
  ['experience', /^(experience|exp\.?|work experience)$/i],
  ['location', /^((work|job) )?location$/i],
  ['type', /^((employment|job) )?type$/i],
  ['department', /^department$/i],
  ['education', /^(educational?|qualifications?|educational qualifications?)$/i],
  ['drop', /^(designation|position|job title|role|company)$/i],
];

/* Abbreviations are case-sensitive so words like "be" or "me" in a sentence don't match. */
const EDUCATION_WORDS = /\b(diploma|degree|graduate|graduation|post[- ]?graduat\w*|bachelor'?s?|master'?s? degree|polytechnic|12th|10th)\b/i;
const EDUCATION_ABBR = /\b(B\.?\s?E|M\.?\s?E|B\.?\s?Tech|M\.?\s?Tech|ITI|BBA|MBA|BCA|MCA|B\.?\s?Sc|M\.?\s?Sc|B\.?\s?Com|M\.?\s?Com|Ph\.?\s?D|SSLC|PUC|HSC)\b/;

export const isEducationLine = (line: string) => EDUCATION_WORDS.test(line) || EDUCATION_ABBR.test(line);

/** "ITI / Diploma – EEE / ECE: 1 Position." → "ITI / Diploma – EEE / ECE"; several lines join with " · ". */
export function educationText(lines: string[]): string {
  const seen = new Set<string>();
  const tokens = (l: string) =>
    [...(l.match(new RegExp(EDUCATION_WORDS.source, 'gi')) || []), ...(l.match(new RegExp(EDUCATION_ABBR.source, 'g')) || [])].map((x) =>
      x.toLowerCase().replace(/[.\s]/g, '')
    );
  return lines
    .map((l) =>
      l
        .replace(/[:：\-–]\s*\d+\s*(positions?|posts?|vacanc(y|ies)|openings?)\.?$/i, '')
        .replace(/[.;,]+$/, '')
        .trim()
    )
    .filter((l) => {
      if (!l) return false;
      const own = tokens(l);
      const repeat = own.length > 0 && own.every((x) => seen.has(x));
      own.forEach((x) => seen.add(x));
      return !repeat;
    })
    .join(' · ');
}

/** Moves education lines out of a requirements list. */
export function extractEducation(requirements: string[]): { education: string; rest: string[] } {
  const edu = requirements.filter((r) => r.trim() && isEducationLine(r));
  return { education: educationText(edu), rest: requirements.filter((r) => !edu.includes(r)) };
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };

export function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e: string) => ENTITIES[e]);
}

const clean = (line: string) =>
  line
    .replace(LEADING_JUNK, '')
    .replace(/\s+[-–—•]+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/\s+[•▪●]\s+/))
    .flatMap((line) => ((line.match(new RegExp(EMOJI.source, 'gu')) || []).length > 1 ? line.split(EMOJI_SPLIT) : [line]))
    .map(clean)
    .filter(Boolean);
}

function bucketOf(label: string): Bucket | null {
  for (const [bucket, re] of HEADINGS) {
    const m = re.exec(label);
    if (m && m.index <= 14) return bucket;
  }
  return null;
}

/** "Key Responsibilities", "Requirements:" or "Skills: Excel, CRM" → heading (+ inline content). */
function asHeading(line: string): { bucket: Bucket; rest: string } | null {
  if (HEADINGS[0][1].exec(line)?.index === 0) return { bucket: 'skip', rest: '' };
  const inline = line.match(/^([^:：]{3,48})[:：]\s*(.*)$/);
  if (inline && wordCount(inline[1]) <= 7) {
    const bucket = bucketOf(inline[1]);
    if (bucket) return { bucket, rest: inline[2].trim() };
  }
  if (line.length <= 48 && wordCount(line) <= 7 && !/[.!?]$/.test(line)) {
    const bucket = bucketOf(line);
    if (bucket) return { bucket, rest: '' };
  }
  return null;
}

function asFact(line: string): [string, string] | null {
  const m = line.match(/^([^:：.]{2,32})[:：]\s*(.+)$/);
  return m && wordCount(m[1]) <= 4 ? [m[1].trim(), m[2].trim()] : null;
}

/** A long paragraph inside a list section is usually several items run together. */
function splitSentences(line: string): string[] {
  return line.length > 160 ? line.replace(/([.;])\s+(?=[A-Z])/g, '$1\n').split('\n') : [line];
}

export function parseJobText(raw: string): ParsedJobText {
  const text = /<[a-z][^>]*>/i.test(raw) ? htmlToText(raw) : raw;
  const out: Required<Pick<ParsedJobText, 'responsibilities' | 'requirements' | 'benefits' | 'facts'>> & ParsedJobText = {
    responsibilities: [],
    requirements: [],
    benefits: [],
    facts: [],
  };
  const about: string[] = [];
  const education: string[] = [];
  let bucket: Bucket = 'about';

  const addFact = (label: string, value: string) => {
    const field = FIELD_FACTS.find(([, re]) => re.test(label))?.[0];
    if (field === 'drop') return;
    if (field && !out[field]) {
      (out as Record<string, unknown>)[field] = value;
      return;
    }
    out.facts.push(`${label}: ${value}`);
  };

  const add = (line: string) => {
    if (bucket === 'skip') return;
    if (bucket === 'about' || bucket === 'facts') {
      const fact = asFact(line);
      if (fact) addFact(...fact);
      else about.push(line);
      return;
    }
    if (bucket === 'education') {
      (isEducationLine(line) ? education : out.requirements).push(line);
      return;
    }
    out[bucket].push(...splitSentences(line).map(clean).filter(Boolean));
  };

  for (const line of splitLines(text)) {
    const heading = asHeading(line);
    if (heading) {
      bucket = heading.bucket;
      if (heading.rest) add(heading.rest);
    } else {
      add(line);
    }
  }
  out.summary = about.join(' ');
  const fromReqs = extractEducation(out.requirements);
  out.requirements = fromReqs.rest;
  const allEducation = educationText([out.education || '', ...education, ...fromReqs.education.split(' · ')]);
  if (allEducation) out.education = allEducation;
  return out;
}

/** True once a job uses the structured fields instead of the old free-form description. */
export function hasStructuredDetails(job: CareersJob): boolean {
  return [job.summary, ...(job.responsibilities || []), ...(job.requirements || []), ...(job.benefits || []), ...(job.facts || [])].some(
    (v) => String(v ?? '').trim()
  );
}
