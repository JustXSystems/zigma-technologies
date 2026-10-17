import type { CareersJob } from '@/lib/careers-sections';

/**
 * Turns a pasted job description (Word, PDF, WhatsApp, email, old HTML) into structured
 * Hiring / Careers fields so HR never formats lists by hand.
 */

type Bucket = 'about' | 'facts' | 'responsibilities' | 'education' | 'requirements' | 'benefits' | 'skip';

export type ParsedJobText = Pick<
  CareersJob,
  'summary' | 'responsibilities' | 'requirements' | 'benefits' | 'facts' | 'department' | 'location' | 'type' | 'experience' | 'education' | 'badge' | 'chips'
> & {
  title?: string;
  vacancies?: number;
};

const HEADINGS: Array<[Bucket, RegExp]> = [
  ['skip', /how to apply|apply now|send (your )?(cv|resume)|interested candidates|walk[- ]in/i],
  ['responsibilities', /responsibilit|\bduties\b|what you('|’)?ll (do|be doing)|\byour role\b|\bjob role\b|key accountabilit/i],
  ['education', /\beducation(al)?\b|academic/i],
  [
    'requirements',
    /requirement|qualification|eligibility|\bskills?\b|what we('|’)?re looking for|who you are|\bcriteria\b|must[- ]have|nice[- ]to[- ]have|preferred (skills?|qualifications?)|competenc/i,
  ],
  ['benefits', /benefit|\bperks\b|what we offer|we offer|why join|compensation|remuneration|\bsalary\b|\bctc\b/i],
  ['facts', /\b(job|position|role|key) (details|information|info)\b|at a glance|role details/i],
  ['about', /about (the|this) (role|job|position)|\boverview\b|job (description|summary)|\bsummary\b|role description/i],
];

/* Built at runtime: the TS target predates Unicode property escapes in regex literals. */
const EMOJI = new RegExp('\\p{Extended_Pictographic}', 'u');
const EMOJI_SPLIT = new RegExp('\\s+(?=\\p{Extended_Pictographic})', 'u');
const LEADING_JUNK = new RegExp(
  '^(?:[\\s\\-–—•*·▪●►▶➤→✓✔☑>]|\\p{Extended_Pictographic}|\\uFE0F|\\u200D|\\d{1,2}[.)](?=\\s))+',
  'u'
);

type FactField = keyof ParsedJobText | 'drop' | 'title' | 'vacancies';

const FIELD_FACTS: Array<[FactField, RegExp]> = [
  ['title', /^(designation|position|job title|job role|role title|posting title|\brole\b)$/i],
  ['experience', /^(experience|exp\.?|work experience|years? of experience|exp required)$/i],
  ['location', /^((work|job|office|base) )?location$|^place$|^city$|^based (in|at)$/i],
  ['type', /^((employment|job|engagement) )?type$|^work (mode|type)$|^employment$/i],
  ['department', /^(department|function|team|division|vertical)$/i],
  ['education', /^(educational?|qualifications?|educational qualifications?)$/i],
  ['vacancies', /^(vacancies|openings|no\.?\s*of\s*(positions?|openings?|vacancies)|positions?|heads?)$/i],
  ['badge', /^(priority|urgency|status|hiring status)$/i],
  ['drop', /^(company|organisation|organization|employer)$/i],
];

const EDUCATION_WORDS = /\b(diploma|degree|graduate|graduation|post[- ]?graduat\w*|bachelor'?s?|master'?s? degree|polytechnic|12th|10th)\b/i;
const EDUCATION_ABBR =
  /\b(B\.?\s?E|M\.?\s?E|B\.?\s?Tech|M\.?\s?Tech|ITI|BBA|MBA|BCA|MCA|B\.?\s?Sc|M\.?\s?Sc|B\.?\s?Com|M\.?\s?Com|Ph\.?\s?D|SSLC|PUC|HSC)\b/;

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
    .replace(/^[*_~`]+|[*_~`]+$/g, '')
    .replace(LEADING_JUNK, '')
    .replace(/\s+[-–—•]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

function splitLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u2028|\u2029/g, '\n')
    /* WhatsApp often joins sections with double spaces or " - " without newlines */
    .split(/\n+/)
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
  const inline = line.match(/^([^:：*]{2,48})[:：]\s*(.*)$/);
  if (inline && wordCount(inline[1]) <= 8) {
    const bucket = bucketOf(inline[1].replace(/^\*+|\*+$/g, '').trim());
    if (bucket) return { bucket, rest: inline[2].trim() };
  }
  if (line.length <= 52 && wordCount(line) <= 8 && !/[.!?]$/.test(line)) {
    const bucket = bucketOf(line);
    if (bucket) return { bucket, rest: '' };
  }
  return null;
}

function asFact(line: string): [string, string] | null {
  const m = line.match(/^([^:：.]{2,40})[:：]\s*(.+)$/);
  return m && wordCount(m[1]) <= 5 ? [m[1].replace(/^\*+|\*+$/g, '').trim(), m[2].trim()] : null;
}

/** A long paragraph inside a list section is usually several items run together. */
function splitSentences(line: string): string[] {
  return line.length > 160 ? line.replace(/([.;])\s+(?=[A-Z])/g, '$1\n').split('\n') : [line];
}

function parseVacancies(value: string): number | undefined {
  const m = value.match(/(\d{1,2})\b/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return n >= 1 && n <= 99 ? n : undefined;
}

function normalizeJobType(value: string): string {
  const v = value.trim();
  if (/full[\s-]?time|permanent|\bftp\b/i.test(v)) return 'Full-Time';
  if (/part[\s-]?time/i.test(v)) return 'Part-Time';
  if (/contract|consultant|freelance/i.test(v)) return 'Contract';
  if (/intern/i.test(v)) return 'Internship';
  return v;
}

function inferBadge(text: string): string | undefined {
  if (/\burgent\b|immediate(ly)?\s*(joining|requirement|hire)|asap/i.test(text)) return 'Urgent';
  if (/\bhot\b|\bpriority\b/i.test(text)) return 'Priority';
  if (/\bnew\s+(opening|role|position)\b/i.test(text)) return 'New';
  return undefined;
}

function inferChips(text: string): string[] {
  const chips: string[] = [];
  if (/\bhybrid\b/i.test(text)) chips.push('Hybrid');
  if (/\bremote\b|work from home|\bwfh\b/i.test(text)) chips.push('Remote');
  if (/\bon[- ]?site\b|\bin[- ]?office\b/i.test(text)) chips.push('On-site');
  return chips;
}

/**
 * First short line of a pasted ad is often the job title (WhatsApp / email intros).
 * Also matches “We are hiring for X” / “Opening: X”.
 */
export function guessJobTitle(raw: string): string | null {
  const text = /<[a-z][^>]*>/i.test(raw) ? htmlToText(raw) : raw;
  for (const line of splitLines(text).slice(0, 8)) {
    const hiring = line.match(
      /^(?:we are )?(?:hiring|looking)\s+(?:for\s+)?(?:a\s+|an\s+)?(.+)$/i
    );
    if (hiring?.[1] && wordCount(hiring[1]) <= 14) return clean(hiring[1]);
    const opening = line.match(/^(?:job\s+)?(?:opening|vacancy|position)\s*[:\-–]\s*(.+)$/i);
    if (opening?.[1] && wordCount(opening[1]) <= 14) return clean(opening[1]);
    if (asHeading(line) || asFact(line)) continue;
    if (line.length > 90 || wordCount(line) > 14) continue;
    if (/^(hi|hello|dear|please|kindly|fy[i!]|job opening|we are hiring|good (morning|afternoon|evening))\b/i.test(line)) {
      continue;
    }
    return line;
  }
  return null;
}

/** Fill gaps from free-form lines when WhatsApp ads skip section headings. */
function inferLooseFields(text: string, out: ParsedJobText): void {
  const blob = text.replace(/\s+/g, ' ');
  if (!out.experience) {
    const exp =
      blob.match(/\b(\d+\s*[-–to]+\s*\d+\+?\s*(?:years?|yrs?))\b/i) ||
      blob.match(/\b(\d+\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)?)\b/i) ||
      blob.match(/\b(fresher|freshers|0[-–]1\s*(?:years?|yrs?))\b/i);
    if (exp) out.experience = exp[1].replace(/\s+/g, ' ').trim();
  }
  if (!out.location) {
    const loc = blob.match(
      /\b(?:location|based in|posted (?:in|at)|office)\s*[:\-–]?\s*([A-Za-z][A-Za-z .\/-]{2,40})/i
    );
    if (loc) out.location = loc[1].replace(/\s+/g, ' ').trim().replace(/[.,;]+$/, '');
    else {
      const city = blob.match(
        /\b(Bengaluru|Bangalore|Mumbai|Pune|Hyderabad|Chennai|Delhi|Noida|Gurugram|Gurgaon|Kolkata|Ahmedabad|Coimbatore|Kochi|Mysore|Mysuru)\b/i
      );
      if (city) out.location = city[1];
    }
  }
  if (!out.type) {
    const t = blob.match(/\b(full[\s-]?time|part[\s-]?time|contract|internship|permanent)\b/i);
    if (t) out.type = normalizeJobType(t[1]);
  }
  if (out.vacancies == null) {
    const v =
      blob.match(/\b(\d{1,2})\s*(?:positions?|openings?|vacancies|posts?)\b/i) ||
      blob.match(/\b(?:positions?|openings?|vacancies)\s*[:\-–]?\s*(\d{1,2})\b/i);
    if (v) out.vacancies = parseVacancies(v[1]);
  }
  if (!out.department) {
    const d = blob.match(/\b(?:department|team|function)\s*[:\-–]\s*([A-Za-z][A-Za-z &\/-]{2,40})/i);
    if (d) out.department = d[1].replace(/\s+/g, ' ').trim().replace(/[.,;]+$/, '');
  }
  if (!out.badge) out.badge = inferBadge(blob);
  const chips = inferChips(blob);
  if (chips.length) out.chips = Array.from(new Set([...(out.chips || []), ...chips]));
}

/** Draft shape used by Hiring + Careers paste autofill (lists as newline-separated text). */
export type JobAutofillDraft = {
  title: string;
  department: string;
  location: string;
  jobType: string;
  experience: string;
  education: string;
  badge: string;
  summary: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  facts: string;
  vacancies: number;
};

/**
 * Merge parseJobText into an admin draft.
 * Paste wins for every non-empty parsed field (defaults like Bengaluru must not block Mumbai).
 */
export function applyParsedToDraft(current: JobAutofillDraft, raw: string): JobAutofillDraft {
  const p = parseJobText(raw);
  const pickList = (parsed: string[] | undefined, currentText: string) =>
    parsed?.length ? parsed.join('\n') : currentText;
  const pickStr = (parsed: string | undefined, currentText: string, fallback = '') => {
    const pTrim = String(parsed || '').trim();
    if (pTrim) return pTrim;
    const cTrim = String(currentText || '').trim();
    return cTrim || fallback;
  };

  const title = pickStr(p.title, current.title) || guessJobTitle(raw) || '';
  let summary = pickStr(p.summary, current.summary);
  if (title && summary.toLowerCase().startsWith(title.toLowerCase())) {
    summary = summary.slice(title.length).replace(/^[\s.:\-–—]+/, '').trim();
  }

  /* Prefer structured facts; if paste only produced a chip list, keep prior facts. */
  const factLines = [...(p.facts || [])];
  if (p.chips?.length) {
    for (const chip of p.chips) {
      if (!factLines.some((f) => f.toLowerCase().includes(chip.toLowerCase()))) {
        factLines.push(`Work mode: ${chip}`);
      }
    }
  }

  return {
    ...current,
    title,
    department: pickStr(p.department, current.department),
    location: pickStr(p.location, current.location),
    jobType: pickStr(p.type ? normalizeJobType(p.type) : '', current.jobType, 'Full-Time'),
    experience: pickStr(p.experience, current.experience),
    education: pickStr(p.education, current.education),
    badge: pickStr(p.badge, current.badge),
    summary,
    responsibilities: pickList(p.responsibilities, current.responsibilities),
    requirements: pickList(p.requirements, current.requirements),
    benefits: pickList(p.benefits, current.benefits),
    facts: factLines.length ? factLines.join('\n') : current.facts,
    vacancies: p.vacancies && p.vacancies >= 1 ? p.vacancies : current.vacancies || 1,
  };
}

/** Which draft keys the last paste actually populated (for UI feedback). */
export function filledDraftKeys(before: JobAutofillDraft, after: JobAutofillDraft): string[] {
  const keys: Array<keyof JobAutofillDraft> = [
    'title',
    'department',
    'location',
    'jobType',
    'experience',
    'education',
    'badge',
    'summary',
    'responsibilities',
    'requirements',
    'benefits',
    'facts',
    'vacancies',
  ];
  return keys.filter((k) => {
    if (k === 'vacancies') return after.vacancies !== before.vacancies && after.vacancies >= 1;
    return String(after[k] || '').trim() && String(after[k]).trim() !== String(before[k] || '').trim();
  });
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
  const guessedTitle = guessJobTitle(raw);

  const addFact = (label: string, value: string) => {
    const field = FIELD_FACTS.find(([, re]) => re.test(label))?.[0];
    if (field === 'drop') return;
    if (field === 'title') {
      if (!out.title) out.title = value;
      return;
    }
    if (field === 'vacancies') {
      const n = parseVacancies(value);
      if (n) out.vacancies = n;
      out.facts.push(`${label}: ${value}`);
      return;
    }
    if (field === 'type') {
      if (!out.type) out.type = normalizeJobType(value);
      return;
    }
    if (field && field !== 'chips' && !out[field as keyof ParsedJobText]) {
      (out as Record<string, unknown>)[field] = value;
      return;
    }
    out.facts.push(`${label}: ${value}`);
  };

  const absorbMetaLine = (line: string): boolean => {
    if (/^(hybrid|remote|on[- ]?site|work from home|wfh)$/i.test(line)) {
      const chip = /hybrid/i.test(line) ? 'Hybrid' : /remote|wfh|work from home/i.test(line) ? 'Remote' : 'On-site';
      out.chips = Array.from(new Set([...(out.chips || []), chip]));
      return true;
    }
    if (/^(urgent|asap|immediate(ly)?(\s+joining)?|priority|hot)$/i.test(line)) {
      if (!out.badge) out.badge = /priority|hot/i.test(line) ? 'Priority' : 'Urgent';
      return true;
    }
    if (/^urgent\s+hiring\b/i.test(line)) {
      if (!out.badge) out.badge = 'Urgent';
      return true;
    }
    return false;
  };

  const add = (line: string) => {
    if (bucket === 'skip') return;
    if (absorbMetaLine(line)) return;
    if (bucket === 'about' || bucket === 'facts') {
      const fact = asFact(line);
      if (fact) {
        addFact(...fact);
        return;
      }
      /* Don't stuff the job title into the summary paragraph. */
      if (guessedTitle && line.toLowerCase() === guessedTitle.toLowerCase()) return;
      if (out.title && line.toLowerCase() === out.title.toLowerCase()) return;
      about.push(line);
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

  out.summary = about.join(' ').replace(/\s+/g, ' ').trim();
  const fromReqs = extractEducation(out.requirements);
  out.requirements = fromReqs.rest;
  const allEducation = educationText([out.education || '', ...education, ...fromReqs.education.split(' · ')]);
  if (allEducation) out.education = allEducation;
  if (!out.title && guessedTitle) out.title = guessedTitle;

  inferLooseFields(text, out);
  return out;
}

/** True once a job uses the structured fields instead of the old free-form description. */
export function hasStructuredDetails(job: CareersJob): boolean {
  return [job.summary, ...(job.responsibilities || []), ...(job.requirements || []), ...(job.benefits || []), ...(job.facts || [])].some(
    (v) => String(v ?? '').trim()
  );
}
