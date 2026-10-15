/**
 * Writing helpers for the blog editor: stats, suggestions (summary, takeaways, tags, format), the content check,
 * Markdown paste and starter outlines. Pure string work — safe on the server and the client.
 */
import type { BlogPostFormat } from '@/lib/blog-design';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };

export function htmlText(html: string | null | undefined) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#?\w+);/g, (m, e: string) => ENTITIES[e.toLowerCase()] ?? (e.startsWith('#') ? String.fromCharCode(Number(e.slice(1)) || 32) : m))
    .replace(/\s+/g, ' ')
    .trim();
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export type BodyStats = { words: number; minutes: number; headings: Array<{ level: 2 | 3; text: string }>; images: number };

/** Same rules as the public article: ~220 words a minute, H2 / H3 feed the contents list. */
export function bodyStats(html: string): BodyStats {
  const text = htmlText(html);
  const words = text ? text.split(' ').length : 0;
  const headings: BodyStats['headings'] = [];
  for (const m of html.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const t = htmlText(m[2]);
    if (t) headings.push({ level: m[1] === '2' ? 2 : 3, text: t });
  }
  return { words, minutes: Math.max(1, Math.ceil(words / 220)), headings, images: (html.match(/<img\b/gi) || []).length };
}

/** Question / answer pairs from the body's FAQ blocks (for FAQPage structured data). */
export function faqEntries(html: string | null | undefined) {
  return [...String(html || '').matchAll(/<details\b[^>]*class="[^"]*blg-faq[^"]*"[^>]*>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)]
    .map((m) => ({ question: htmlText(m[1]), answer: htmlText(m[2]) }))
    .filter((e) => e.question && e.answer);
}

/** First image in the body — the automatic cover when a post has none. */
export function firstBodyImage(html: string | null | undefined): string | null {
  const m = String(html || '').match(/<img\b[^>]*\ssrc="([^"]+)"/i);
  return m ? m[1].replace(/&amp;/g, '&') : null;
}

function sentences(text: string) {
  return text.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)?.map((s) => s.trim()).filter(Boolean) || [];
}

/** Whole sentences up to `max` characters; a single long sentence is cut at a word with an ellipsis. */
function clip(text: string, max: number) {
  let out = '';
  for (const s of sentences(text)) {
    if ((out ? out.length + 1 : 0) + s.length > max) break;
    out = out ? `${out} ${s}` : s;
  }
  if (out) return out;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)).replace(/[,;:\s]+$/, '')}…`;
}

/** Plain-text paragraphs of the body, skipping callouts, FAQ answers and labelled notes. */
function paragraphs(html: string) {
  const body = html.replace(/<(div|details|figure|table)\b[\s\S]*?<\/\1>/gi, ' ');
  return [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => ({ raw: m[1], text: htmlText(m[1]) }))
    .filter((p) => p.text.length > 25 && !/^<strong>[^<]{1,24}:?<\/strong>/i.test(p.raw.trim()));
}

/** A 120–200 character summary from the opening paragraph(s). */
export function suggestSummary(html: string) {
  const paras = paragraphs(html);
  if (!paras.length) return '';
  const first = paras[0].text.length < 110 && paras[1] ? `${paras[0].text} ${paras[1].text}` : paras[0].text;
  return clip(first, 200);
}

/** One takeaway per H2: the first sentence of the section, else the heading itself. */
export function suggestKeyPoints(html: string, max = 5) {
  const points: string[] = [];
  const parts = html.split(/<h2\b[^>]*>/i).slice(1);
  for (const part of parts) {
    const [headingHtml, rest = ''] = part.split(/<\/h2>/i);
    const heading = htmlText(headingHtml);
    if (/^(faq|frequently asked|key takeaways|summary|conclusion|next steps?)/i.test(heading)) continue;
    const para = paragraphs(rest.split(/<h2\b/i)[0])[0]?.text;
    const sentence = para ? sentences(para)[0] : '';
    const point = sentence && sentence.length <= 160 ? sentence.replace(/[.!]+$/, '') : heading;
    if (point && !points.includes(point)) points.push(point);
    if (points.length >= max) break;
  }
  return points;
}

/** Known tags that the title or body mention, most mentioned first. */
export function suggestTags(title: string, html: string, known: string[], chosen: string[], max = 6) {
  const haystack = ` ${`${title} ${htmlText(html)}`.toLowerCase()} `;
  const have = new Set(chosen.map((t) => t.toLowerCase()));
  return known
    .filter((tag) => !have.has(tag.toLowerCase()))
    .map((tag) => {
      const re = new RegExp(`[^a-z0-9]${tag.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^a-z0-9]`, 'g');
      return { tag, hits: (haystack.match(re) || []).length };
    })
    .filter((t) => t.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, max)
    .map((t) => t.tag);
}

/** The format a title reads as; null when nothing stands out. */
export function guessFormat(title: string, html = ''): BlogPostFormat | null {
  const t = title.toLowerCase();
  if (/checklist|\bdos and don|\bto-?do\b/.test(t)) return 'checklist';
  if (/case study|how .+ (cut|saved|reduced|achieved|improved)|\bcustomer story/.test(t)) return 'case-study';
  if (/^(announcing|introducing|launch|now available|news|update:)|\b(launches|announces|partners with|wins)\b/.test(t)) return 'news';
  if (/\bvs\.?\b|versus|compar|spec(ification)?s?\b|explained|deep dive|technical/.test(t)) return 'brief';
  if (/^how to|\bguide\b|step[- ]by[- ]step|\bsteps\b|tutorial|\bwhat is\b/.test(t)) return 'guide';
  if (/<ol class="blg-steps"/.test(html)) return 'guide';
  return null;
}

/** Fills empty or missing alt text from the caption, else from the file name. Returns the new HTML and how many changed. */
export function fillMissingAlt(html: string) {
  let changed = 0;
  const out = html.replace(/(<figure\b[^>]*>\s*)?<img\b([^>]*)>([\s\S]{0,400}?<figcaption>([\s\S]*?)<\/figcaption>)?/gi, (match, fig, attrs: string, tail, caption) => {
    const alt = attrs.match(/\salt="([^"]*)"/i);
    if (alt && alt[1].trim()) return match;
    const src = attrs.match(/\ssrc="([^"]*)"/i)?.[1] || '';
    const fromFile = decodeURIComponent(src.split(/[/?#]/).filter(Boolean).pop() || '')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/^\d{6,}-?[a-z0-9]{0,8}$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    const text = (fig && caption ? htmlText(caption) : '') || fromFile;
    if (!text) return match;
    changed += 1;
    const label = esc(text.charAt(0).toUpperCase() + text.slice(1)).slice(0, 160);
    const nextAttrs = alt ? attrs.replace(/\salt="[^"]*"/i, ` alt="${label}"`) : `${attrs.replace(/\s*\/$/, '')} alt="${label}"`;
    return `${fig || ''}<img${nextAttrs}>${tail || ''}`;
  });
  return { html: out, changed };
}

export function imagesMissingAlt(html: string) {
  return [...html.matchAll(/<img\b([^>]*)>/gi)].filter((m) => !/\salt="[^"]*\S[^"]*"/i.test(m[1])).length;
}

export type CheckFix = 'summary' | 'cover' | 'alt' | 'keyPoints' | 'tags' | 'format';

export type ContentCheck = { id: string; label: string; detail: string; ok: boolean; weight: number; fix?: CheckFix; fixLabel?: string };

export type CheckInput = {
  title: string;
  excerpt: string;
  body_html: string;
  cover_url: string;
  tags: string[];
  key_points: string[];
  format: string;
  meta_title: string;
  suggestedTags: string[];
};

/** The readiness checklist shown beside the editor; `fix` names a one-click repair where one exists. */
export function contentChecks(d: CheckInput): ContentCheck[] {
  const stats = bodyStats(d.body_html);
  const h2 = stats.headings.filter((h) => h.level === 2).length;
  const title = d.title.trim().length;
  const summary = d.excerpt.trim().length;
  const points = d.key_points.filter((p) => p.trim()).length;
  const missingAlt = imagesMissingAlt(d.body_html);
  const bodyImage = firstBodyImage(d.body_html);
  const searchTitle = (d.meta_title.trim() || d.title.trim()).length;
  const guessed = d.format ? null : guessFormat(d.title, d.body_html);
  return [
    {
      id: 'title',
      label: 'Clear title',
      ok: title >= 20 && title <= 90,
      weight: 2,
      detail: title < 20 ? `${title} characters — say what the reader gets (20–90).` : title > 90 ? `${title} characters — trim it under 90.` : `${title} characters.`,
    },
    {
      id: 'summary',
      label: 'Summary for cards and Google',
      ok: summary >= 80 && summary <= 220,
      weight: 2,
      detail: !summary ? 'Missing — cards would show the first lines of the body.' : summary < 80 ? `${summary} characters — aim for 120–200.` : summary > 220 ? `${summary} characters — cards cut it off; aim for 120–200.` : `${summary} characters.`,
      ...(stats.words > 40 ? { fix: 'summary' as const, fixLabel: summary ? 'Rewrite from the intro' : 'Write it from the intro' } : {}),
    },
    {
      id: 'length',
      label: 'Enough depth',
      ok: stats.words >= 300,
      weight: 2,
      detail: `${stats.words.toLocaleString('en-IN')} words · ${stats.minutes} min read${stats.words < 300 ? ' — 300+ words ranks and reads better.' : '.'}`,
    },
    {
      id: 'structure',
      label: 'Sections (H2 headings)',
      ok: h2 >= 2,
      weight: 2,
      detail: h2 >= 2 ? `${h2} sections — the contents list is on.` : 'Add 2+ section headings so readers can skim and the contents list appears.',
    },
    {
      id: 'cover',
      label: 'Cover image',
      ok: Boolean(d.cover_url),
      weight: 1,
      detail: d.cover_url ? 'Set.' : bodyImage ? 'Not set — the first body image is used automatically.' : 'Not set — cards fall back to a stock photo.',
      ...(!d.cover_url && bodyImage ? { fix: 'cover' as const, fixLabel: 'Use the first body image' } : {}),
    },
    {
      id: 'alt',
      label: 'Image descriptions (alt text)',
      ok: missingAlt === 0,
      weight: 1,
      detail: !stats.images ? 'No body images.' : missingAlt ? `${missingAlt} of ${stats.images} images have no description.` : `All ${stats.images} images described.`,
      ...(missingAlt ? { fix: 'alt' as const, fixLabel: 'Fill from captions / file names' } : {}),
    },
    {
      id: 'keyPoints',
      label: 'Key takeaways',
      ok: points >= 3 && points <= 5,
      weight: 1,
      detail: points ? `${points} takeaway${points === 1 ? '' : 's'}${points < 3 ? ' — 3 to 5 reads best.' : points > 5 ? ' — keep it to 5.' : '.'}` : 'None — skimmers love 3 to 5.',
      ...(h2 ? { fix: 'keyPoints' as const, fixLabel: points ? 'Regenerate from sections' : 'Suggest from sections' } : {}),
    },
    {
      id: 'tags',
      label: 'Topics (tags)',
      ok: d.tags.length >= 1,
      weight: 1,
      detail: d.tags.length ? d.tags.join(', ') : d.suggestedTags.length ? `None yet — the text mentions ${d.suggestedTags.slice(0, 3).join(', ')}.` : 'None — tags power the topic filter and related articles.',
      ...(!d.tags.length && d.suggestedTags.length ? { fix: 'tags' as const, fixLabel: `Add ${d.suggestedTags.slice(0, 3).join(', ')}` } : {}),
    },
    {
      id: 'format',
      label: 'Format label',
      ok: Boolean(d.format) || !guessed,
      weight: 0.5,
      detail: d.format ? 'Set.' : guessed ? 'Automatic — the title reads like a different format.' : 'Automatic from the tags.',
      ...(guessed ? { fix: 'format' as const, fixLabel: `Mark as ${guessed.replace('-', ' ')}` } : {}),
    },
    {
      id: 'searchTitle',
      label: 'Fits in Google results',
      ok: searchTitle > 0 && searchTitle <= 65,
      weight: 0.5,
      detail: searchTitle > 65 ? `Search title is ${searchTitle} characters — set a shorter one under Search & sharing.` : 'Search title fits.',
    },
  ];
}

export function checkScore(checks: ContentCheck[]) {
  const total = checks.reduce((n, c) => n + c.weight, 0);
  const got = checks.reduce((n, c) => n + (c.ok ? c.weight : 0), 0);
  return total ? Math.round((got / total) * 100) : 0;
}

/* ---------------------------------------------------------------- Markdown paste */

function mdInline(s: string) {
  return esc(s)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_m, a, b) => `<strong>${a ?? b}</strong>`)
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/(^|\W)_([^_\s][^_]*)_(?=\W|$)/g, '$1<em>$2</em>');
}

/** Plain text that is clearly Markdown (headings, lists, emphasis, links…). */
export function looksLikeMarkdown(text: string) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2 && !/\*\*|\]\(/.test(text)) return false;
  const signals = lines.filter((l) => /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|---\s*$|\|.*\|)/.test(l.trim())).length;
  return signals >= 2 || /^#{1,4}\s/m.test(text) || /\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)/.test(text);
}

/** Small Markdown → HTML for pasted notes and AI drafts: headings, lists, quotes, code, tables, rules, emphasis, links. */
export function markdownToHtml(md: string) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) {
      i++;
      continue;
    }
    if (t.startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
      continue;
    }
    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = Math.min(4, Math.max(2, h[1].length));
      out.push(`<h${level}>${mdInline(h[2].replace(/\s*#+$/, ''))}</h${level}>`);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
      out.push('<hr>');
      i++;
      continue;
    }
    if (t.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) quote.push(lines[i++].trim().replace(/^>\s?/, ''));
      out.push(`<blockquote><p>${mdInline(quote.join(' '))}</p></blockquote>`);
      continue;
    }
    if (/^\|.*\|$/.test(t) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1].trim())) {
      const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => mdInline(c.trim()));
      const head = cells(t);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) rows.push(cells(lines[i++]));
      out.push(
        `<table><tbody><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      );
      continue;
    }
    const listMatch = t.match(/^([-*+]|\d+[.)])\s+/);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[1]);
      const items: string[] = [];
      while (i < lines.length && /^([-*+]|\d+[.)])\s+/.test(lines[i].trim()) && /\d/.test(lines[i].trim()[0]) === ordered) {
        items.push(`<li><p>${mdInline(lines[i++].trim().replace(/^([-*+]|\d+[.)])\s+/, ''))}</p></li>`);
      }
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|```|\|)/.test(lines[i].trim())) para.push(lines[i++].trim());
    if (!para.length) para.push(lines[i++].trim());
    out.push(`<p>${mdInline(para.join(' '))}</p>`);
  }
  return out.join('');
}

/* ---------------------------------------------------------------- Starter outlines */

export type ArticleStarter = {
  id: string;
  label: string;
  summary: string;
  format: BlogPostFormat | '';
  body: string;
};

const callout = (tone: string, html: string) => `<div class="blg-callout" data-tone="${tone}"><p>${html}</p></div>`;
const faq = (q: string, a: string) => `<details class="blg-faq"><summary>${q}</summary><div class="blg-faq-a"><p>${a}</p></div></details>`;

/** Outlines a new article can start from; the prompts in each block are meant to be typed over. */
export const ARTICLE_STARTERS: ReadonlyArray<ArticleStarter> = [
  { id: 'blank', label: 'Blank page', summary: 'Start from nothing. Type / for blocks.', format: '', body: '' },
  {
    id: 'how-to',
    label: 'How-to guide',
    summary: 'Problem, numbered steps, pitfalls and FAQs.',
    format: 'guide',
    body: [
      '<p>Open with the reader’s problem in one or two sentences, and what they will be able to do by the end.</p>',
      callout('tip', '<strong>Before you start:</strong> list the tools, data or access the reader needs.'),
      '<h2>Why it matters</h2><p>Explain the cost of getting this wrong — downtime, energy bills, safety, warranty.</p>',
      '<h2>Step by step</h2>',
      '<ol class="blg-steps"><li><p><strong>Measure.</strong> What to record and how.</p></li><li><p><strong>Calculate.</strong> The rule of thumb or formula, with a worked example.</p></li><li><p><strong>Choose.</strong> How to pick between the options.</p></li><li><p><strong>Verify.</strong> How to check the result on site.</p></li></ol>',
      '<h2>Common mistakes</h2><ul><li><p>Mistake one and how to avoid it.</p></li><li><p>Mistake two and how to avoid it.</p></li></ul>',
      callout('warning', '<strong>Safety:</strong> anything the reader must not attempt without a qualified engineer.'),
      '<h2>Frequently asked questions</h2>',
      faq('A question customers ask often?', 'A short, direct answer.'),
      faq('Another common question?', 'A short, direct answer.'),
    ].join(''),
  },
  {
    id: 'checklist',
    label: 'Checklist',
    summary: 'Grouped, scannable checks with a printable feel.',
    format: 'checklist',
    body: [
      '<p>Who this checklist is for, and how often to run it.</p>',
      '<h2>Daily or monthly checks</h2><ul><li><p>Check one — what “good” looks like.</p></li><li><p>Check two — what “good” looks like.</p></li><li><p>Check three — what “good” looks like.</p></li></ul>',
      '<h2>Quarterly engineering checks</h2><ul><li><p>Check one.</p></li><li><p>Check two.</p></li></ul>',
      callout('note', '<strong>Record it:</strong> keep readings in a log so trends show before failures.'),
      '<h2>When to call an engineer</h2><p>The symptoms that mean it is time for a site visit.</p>',
    ].join(''),
  },
  {
    id: 'case-study',
    label: 'Case study',
    summary: 'Client, challenge, solution, measured results.',
    format: 'case-study',
    body: [
      '<p>One-paragraph story: who the client is, what was at stake and the headline result.</p>',
      '<table><tbody><tr><th>Client</th><th>Site</th><th>Scope</th><th>Result</th></tr><tr><td>Industry</td><td>City</td><td>What was installed</td><td>Key number</td></tr></tbody></table>',
      '<h2>The challenge</h2><p>The situation before — numbers, constraints, deadlines.</p>',
      '<h2>Our solution</h2><p>What was designed and why, and how it was delivered.</p>',
      '<blockquote><p>A quote from the client about the outcome.</p></blockquote>',
      '<h2>Results</h2><ul><li><p>Measured result one.</p></li><li><p>Measured result two.</p></li></ul>',
      '<p class="blg-btn-block"><a class="blg-btn" data-style="primary" href="/contact?consult=1">Plan a similar project →</a></p>',
    ].join(''),
  },
  {
    id: 'news',
    label: 'News / announcement',
    summary: 'What happened, why it matters, what’s next.',
    format: 'news',
    body: [
      '<p><strong>City, date —</strong> the news in one sentence: who, what, when.</p>',
      '<h2>What it means for customers</h2><p>The practical impact for the reader.</p>',
      '<blockquote><p>A short quote from a spokesperson.</p></blockquote>',
      '<h2>What’s next</h2><p>Dates, availability, how to get involved.</p>',
    ].join(''),
  },
  {
    id: 'comparison',
    label: 'Comparison',
    summary: 'Side-by-side table, verdict and how to choose.',
    format: 'brief',
    body: [
      '<p>The decision the reader is facing and the options compared.</p>',
      '<h2>At a glance</h2>',
      '<table><tbody><tr><th></th><th>Option A</th><th>Option B</th></tr><tr><td>Upfront cost</td><td>…</td><td>…</td></tr><tr><td>Running cost</td><td>…</td><td>…</td></tr><tr><td>Lifetime</td><td>…</td><td>…</td></tr><tr><td>Best for</td><td>…</td><td>…</td></tr></tbody></table>',
      '<h2>Option A in detail</h2><p>Strengths and limits.</p>',
      '<h2>Option B in detail</h2><p>Strengths and limits.</p>',
      callout('success', '<strong>Our verdict:</strong> which to choose, and when the other wins.'),
    ].join(''),
  },
];
