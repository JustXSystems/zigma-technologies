/**
 * Parse a pasted referral / email / WhatsApp note about a candidate into
 * Hiring → Add candidate fields (name, email, phone, experience, source, notes, role hint).
 */

import type { CandidateSource } from '@/lib/career-hiring-types';

export type ParsedCandidateText = {
  name?: string;
  email?: string;
  phone?: string;
  experience?: string;
  source?: CandidateSource;
  notes?: string;
  /** Role / designation mentioned — used to preselect a job */
  roleHint?: string;
};

export type CandidateAutofillDraft = {
  name: string;
  email: string;
  phone: string;
  experience: string;
  source: CandidateSource;
  notes: string;
  jobId: string;
  stage: string;
};

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE =
  /(?:\+?91[\s-]*)?(?:\d{5}[\s-]?\d{5}|\d{3}[\s-]?\d{3}[\s-]?\d{4}|\d{4}[\s-]?\d{3}[\s-]?\d{3}|\d{10})\b/;

const LABEL_NAME =
  /^(?:name|candidate(?:\s*name)?|full\s*name|applicant|contact\s*person)\s*[:\-–]\s*(.+)$/i;
const LABEL_EMAIL = /^(?:e-?mail|mail\s*id|email\s*id)\s*[:\-–]\s*(.+)$/i;
const LABEL_PHONE =
  /^(?:phone|mobile|contact|whatsapp|cell|tel(?:ephone)?)\s*(?:no\.?|number)?\s*[:\-–]\s*(.+)$/i;
const LABEL_EXP =
  /^(?:experience|exp\.?|total\s*exp(?:erience)?|years?\s*(?:of\s*)?exp(?:erience)?)\s*[:\-–]\s*(.+)$/i;
const LABEL_ROLE =
  /^(?:role|position|designation|applying\s*for|interested\s*in|for\s*(?:the\s*)?role)\s*[:\-–]\s*(.+)$/i;
const LABEL_SOURCE =
  /^(?:source|channel|via|referred\s*via|came\s*through)\s*[:\-–]\s*(.+)$/i;
const LABEL_NOTES =
  /^(?:notes?|remarks?|comments?|message|about|profile)\s*[:\-–]\s*(.+)$/i;

function t(s: string) {
  return s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanWhatsApp(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_]{1,2}([^*_\n]+)[*_]{1,2}/g, '$1')
    .replace(/^\s*[-–—*•·▪●►▶➤→✓✔☑>]+\s*/gm, '')
    .replace(new RegExp('\\p{Extended_Pictographic}', 'gu'), ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function inferSource(text: string): CandidateSource | undefined {
  const lower = text.toLowerCase();
  if (/\breferr(al|ed|er)\b|\breferred by\b/.test(lower)) return 'referral';
  if (/\bagency\b|\bconsultant\b|\brecruiter\b/.test(lower)) return 'agency';
  if (/\blinkedin\b/.test(lower)) return 'linkedin';
  if (/\bwalk[- ]?in\b/.test(lower)) return 'walk_in';
  if (/\bwhatsapp\b|\bemail\b|\bmail\b|\binbox\b|\bfwd:\b|\bre:\b/.test(lower)) return 'email';
  return undefined;
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (/^\+?91\d{10}$/.test(digits.replace(/\s/g, ''))) {
    const d = digits.replace(/\D/g, '').slice(-10);
    return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  }
  if (/^\d{10}$/.test(digits)) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return t(raw);
}

function looksLikeName(s: string): boolean {
  const v = t(s);
  if (!v || v.length < 2 || v.length > 80) return false;
  if (EMAIL_RE.test(v) || PHONE_RE.test(v)) return false;
  if (/\d{3,}/.test(v)) return false;
  if (/^(hi|hello|dear|please|find|attached|resume|cv|regards|thanks)\b/i.test(v)) return false;
  // 2–4 capitalized words, or Title Case / all words letters
  const words = v.split(/\s+/);
  if (words.length < 1 || words.length > 5) return false;
  return words.every((w) => /^[A-Za-z][A-Za-z.'-]*$/.test(w));
}

function experienceFromLine(line: string): string | undefined {
  const m =
    line.match(/(\d+\s*[–\-to]+\s*\d+\s*\+?\s*years?)/i) ||
    line.match(/(\d+\+?\s*years?(?:\s*of\s*experience)?)/i) ||
    line.match(/\b(fresher|freshers?|entry[- ]level)\b/i);
  return m ? t(m[1]) : undefined;
}

export function parseCandidateText(raw: string): ParsedCandidateText {
  const text = cleanWhatsApp(raw);
  if (!text) return {};

  const out: ParsedCandidateText = {};
  const lines = text.split('\n').map(t).filter(Boolean);
  const leftover: string[] = [];

  for (const line of lines) {
    let m = line.match(LABEL_NAME);
    if (m && looksLikeName(m[1])) {
      out.name = t(m[1]);
      continue;
    }
    m = line.match(LABEL_EMAIL);
    if (m) {
      const em = m[1].match(EMAIL_RE);
      if (em) out.email = em[0].toLowerCase();
      continue;
    }
    m = line.match(LABEL_PHONE);
    if (m) {
      const ph = m[1].match(PHONE_RE);
      if (ph) out.phone = normalizePhone(ph[0]);
      continue;
    }
    m = line.match(LABEL_EXP);
    if (m) {
      out.experience = experienceFromLine(m[1]) || t(m[1]);
      continue;
    }
    m = line.match(LABEL_ROLE);
    if (m) {
      out.roleHint = t(m[1]).replace(/[.]+$/, '');
      continue;
    }
    m = line.match(LABEL_SOURCE);
    if (m) {
      const inferred = inferSource(m[1]);
      if (inferred) out.source = inferred;
      continue;
    }
    m = line.match(LABEL_NOTES);
    if (m) {
      leftover.push(t(m[1]));
      continue;
    }
    leftover.push(line);
  }

  // Loose extraction from remaining / full text
  if (!out.email) {
    const em = text.match(EMAIL_RE);
    if (em) out.email = em[0].toLowerCase();
  }
  if (!out.phone) {
    const ph = text.match(PHONE_RE);
    if (ph) out.phone = normalizePhone(ph[0]);
  }
  if (!out.experience) {
    for (const line of lines) {
      const exp = experienceFromLine(line);
      if (exp) {
        out.experience = exp;
        break;
      }
    }
  }
  if (!out.source) out.source = inferSource(text);

  if (!out.roleHint) {
    const roleLoose =
      text.match(/(?:for|as)\s+(?:the\s+)?([A-Z][A-Za-z0-9 /&–-]{2,60}?)\s+(?:role|position|opening)/i) ||
      text.match(/(?:role|position|designation)\s*[:\-–]\s*([^\n,]{2,60})/i);
    if (roleLoose) out.roleHint = t(roleLoose[1]);
  }

  if (!out.name) {
    // "Please find CV of Rahul Sharma" / "Referring: Anita Menon"
    const intro =
      text.match(
        /(?:cv|resume|profile)\s+(?:of|for)\s+([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,3})/
      ) ||
      text.match(/(?:referring|recommend(?:ing)?|candidate)\s*[:\-–]?\s*([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){0,3})/i) ||
      text.match(/^([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){1,3})\s*$/m);
    if (intro && looksLikeName(intro[1])) out.name = t(intro[1]);
  }

  if (!out.name) {
    for (const line of lines.slice(0, 6)) {
      if (looksLikeName(line) && !/^dear\b/i.test(line)) {
        out.name = line;
        break;
      }
    }
  }

  // Notes = cleaned original minus pure contact lines we already captured
  const noteLines = leftover.filter((l) => {
    if (out.email && l.toLowerCase().includes(out.email)) return false;
    if (out.phone && l.replace(/\D/g, '').includes(out.phone.replace(/\D/g, '').slice(-10))) return false;
    if (out.name && t(l).toLowerCase() === out.name.toLowerCase()) return false;
    return true;
  });
  if (noteLines.length) {
    out.notes = noteLines.join('\n').slice(0, 4000);
  } else if (text.length < 800) {
    out.notes = text;
  }

  return out;
}

/** Match roleHint against open job titles (exact → contains). */
export function matchJobIdFromRoleHint(
  roleHint: string | undefined,
  jobs: Array<{ id: number; title: string; content?: { role?: string }; slug?: string }>
): string | undefined {
  const hint = t(roleHint || '').toLowerCase();
  if (!hint || !jobs.length) return undefined;
  const exact = jobs.find(
    (j) =>
      j.title.toLowerCase() === hint ||
      t(j.content?.role || '').toLowerCase() === hint ||
      (j.slug || '').toLowerCase() === hint
  );
  if (exact) return String(exact.id);
  const partial = jobs.find(
    (j) => j.title.toLowerCase().includes(hint) || hint.includes(j.title.toLowerCase())
  );
  return partial ? String(partial.id) : undefined;
}

export function applyParsedCandidateToDraft(
  current: CandidateAutofillDraft,
  raw: string,
  jobs: Array<{ id: number; title: string; content?: { role?: string }; slug?: string }> = []
): CandidateAutofillDraft {
  const p = parseCandidateText(raw);
  const jobId = matchJobIdFromRoleHint(p.roleHint, jobs) || current.jobId;
  return {
    ...current,
    name: p.name || current.name,
    email: p.email || current.email,
    phone: p.phone || current.phone,
    experience: p.experience || current.experience,
    source: p.source || current.source,
    notes: p.notes || current.notes,
    jobId,
  };
}

export function filledCandidateKeys(before: CandidateAutofillDraft, after: CandidateAutofillDraft): string[] {
  const keys: Array<keyof CandidateAutofillDraft> = [
    'name',
    'email',
    'phone',
    'experience',
    'source',
    'notes',
    'jobId',
  ];
  return keys.filter((k) => String(before[k] || '') !== String(after[k] || '') && String(after[k] || '').trim());
}
