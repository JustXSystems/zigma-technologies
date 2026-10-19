#!/usr/bin/env node
/**
 * Phase 25 — close GSC growth opportunities on Production DB (no rebuild).
 * - Upsert homepage rich_text FAQ (visible crawlable proof)
 * - Upsert/publish FAQ blog post (FAQPage JSON-LD)
 * - Soft-polish home meta when brand+city query is a defend-winner
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function loadEnv() {
  if (!existsSync('.env')) return;
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}
loadEnv();

const APPLY = process.argv.includes('--apply');
const MARKER = 'meridian-growth-faq';
const opsIdx = process.argv.indexOf('--ops');
const opsFile = opsIdx >= 0 ? process.argv[opsIdx + 1] : '';
const opportunities = (() => {
  try {
    if (opsFile && existsSync(opsFile)) return JSON.parse(readFileSync(opsFile, 'utf8'));
    const raw = process.env.MERIDIAN_GROWTH_OPS_JSON || '[]';
    return JSON.parse(raw);
  } catch {
    return [];
  }
})();

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(q) {
  return (
    'faq-' +
    String(q || 'growth')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80)
  );
}

function faqsFor(op) {
  const q = String(op.query || 'Zigma Technologies').trim();
  const city = /\bbangalore\b|\bbengaluru\b/i.test(q) ? 'Bengaluru' : 'India';
  return [
    {
      question: `Where is Zigma Technologies based in ${city}?`,
      answer: `Zigma Technologies is a power-engineering company headquartered in ${city}, Karnataka — delivering solar EPC, UPS, BESS and EV charging for industries, hospitals and campuses across India.`,
    },
    {
      question: `What does Zigma Technologies do in ${city}?`,
      answer: `Design, supply, install and maintain critical power systems: solar EPC, UPS, battery energy storage, EV charging and annual maintenance contracts — with 20+ years of project delivery and 24×7 support.`,
    },
    {
      question: `How do I contact Zigma Technologies ${city}?`,
      answer: `Call +91 95901 37666, email info@zigma-technologies.com, or use the contact form on zigma-technologies.com/contact for a site survey and quote.`,
    },
  ];
}

function faqHtml(faqs) {
  return faqs
    .map(
      (f) =>
        `<details class="blg-faq"><summary>${esc(f.question)}</summary><div class="blg-faq-a"><p>${esc(f.answer)}</p></div></details>`
    )
    .join('\n');
}

function homeRichHtml(op, faqs) {
  return `<!-- ${MARKER} -->
<section class="meridian-growth-faq" data-query="${esc(op.query)}">
<h2>Zigma Technologies ${/\bbangalore\b|\bbengaluru\b/i.test(op.query) ? 'Bengaluru' : ''} — quick answers</h2>
<p>Defending brand search visibility with clear local proof. Enquire for solar EPC, UPS, BESS and EV charging.</p>
${faqs
  .map(
    (f) =>
      `<details><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`
  )
  .join('\n')}
<p><a href="/contact">Contact Zigma Technologies</a> · <a href="/projects">View projects</a> · <a href="/blog/${esc(slugify(op.query))}">Read the FAQ guide</a></p>
</section>`;
}

if (!opportunities.length) {
  console.log(JSON.stringify({ ok: true, status: 'noop', message: 'No opportunities to close', closed: 0 }));
  process.exit(0);
}

const mysql = require('mysql2/promise');
const c = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const results = [];
let closed = 0;

for (const op of opportunities.slice(0, 6)) {
  const faqs = faqsFor(op);
  const slug = slugify(op.query);
  const title = `Zigma Technologies ${/\bbangalore|\bbengaluru/i.test(op.query) ? 'Bengaluru' : ''} — FAQ`.replace(/\s+/g, ' ').trim();
  const excerpt = `Answers buyers search for about ${op.query}: location, services and how to enquire.`;
  const body = `<p>People searching for <strong>${esc(op.query)}</strong> want clear local proof. Here are concise answers — then <a href="/contact">enquire</a> for a survey.</p>
${faqHtml(faqs)}
<p>Explore <a href="/services">services</a>, <a href="/projects">projects</a> and <a href="/">the homepage</a>.</p>`;
  const metaTitle = `${title} | Zigma Technologies`.slice(0, 60);
  const metaDesc = excerpt.slice(0, 155);

  let blog = { action: 'skip' };
  const [existing] = await c.query('SELECT id, status FROM resource_posts WHERE slug = ? LIMIT 1', [slug]);
  if (!APPLY) {
    blog = { action: existing.length ? 'would_update' : 'would_insert', slug };
  } else if (existing.length) {
    await c.query(
      `UPDATE resource_posts SET title=?, excerpt=?, body_html=?, meta_title=?, meta_description=?,
       status='published', enabled=1, published_at=COALESCE(published_at, NOW()), tags_json=? WHERE id=?`,
      [title, excerpt, body, metaTitle, metaDesc, JSON.stringify(['faq', 'meridian', 'growth']), existing[0].id]
    );
    blog = { action: 'updated', id: existing[0].id, slug };
  } else {
    const [ins] = await c.query(
      `INSERT INTO resource_posts (slug, title, excerpt, body_html, tags_json, status, meta_title, meta_description, published_at, enabled, sort_order)
       VALUES (?, ?, ?, ?, ?, 'published', ?, ?, NOW(), 1, 0)`,
      [slug, title, excerpt, body, JSON.stringify(['faq', 'meridian', 'growth']), metaTitle, metaDesc]
    );
    blog = { action: 'inserted', id: ins.insertId, slug };
  }

  let home = { action: 'skip' };
  const [pages] = await c.query(`SELECT id, meta_title, meta_description FROM pages WHERE slug = 'home' LIMIT 1`);
  if (pages.length) {
    const pageId = pages[0].id;
    const html = homeRichHtml(op, faqs);
    const content = JSON.stringify({ html, body: html, markdown: html });
    const [sec] = await c.query(
      `SELECT id FROM page_sections WHERE page_id = ? AND section_key = ? LIMIT 1`,
      [pageId, MARKER]
    );
    if (!APPLY) {
      home = { action: sec.length ? 'would_update_section' : 'would_insert_section' };
    } else if (sec.length) {
      await c.query(`UPDATE page_sections SET type='rich_text', title=?, content_json=?, enabled=1 WHERE id=?`, [
        'Growth FAQ',
        content,
        sec[0].id,
      ]);
      home = { action: 'updated_section', id: sec[0].id };
    } else {
      const [maxRow] = await c.query(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM page_sections WHERE page_id = ?`, [
        pageId,
      ]);
      const sort = Number(maxRow[0]?.m || 0) + 10;
      const [ins] = await c.query(
        `INSERT INTO page_sections (page_id, type, section_key, title, sort_order, enabled, content_json)
         VALUES (?, 'rich_text', ?, 'Growth FAQ', ?, 1, ?)`,
        [pageId, MARKER, sort, content]
      );
      home = { action: 'inserted_section', id: ins.insertId };
    }

    // Soft meta: include Bangalore when defending that query and meta lacks it
    if (APPLY && /\bbangalore|\bbengaluru/i.test(op.query)) {
      const mt = String(pages[0].meta_title || '');
      const md = String(pages[0].meta_description || '');
      let nextTitle = mt;
      let nextDesc = md;
      if (mt && !/bengaluru|bangalore/i.test(mt) && mt.length < 52) {
        nextTitle = `${mt.replace(/\s*\|\s*Zigma.*$/i, '').trim()} Bengaluru | Zigma Technologies`.slice(0, 60);
      }
      if (md && !/bengaluru|bangalore/i.test(md)) {
        nextDesc = `${md.replace(/\.$/, '')} Based in Bengaluru.`.slice(0, 160);
      }
      if (nextTitle !== mt || nextDesc !== md) {
        await c.query(`UPDATE pages SET meta_title = ?, meta_description = ? WHERE id = ?`, [
          nextTitle || mt,
          nextDesc || md,
          pageId,
        ]);
        home.metaPolished = true;
      }
    }
  }

  const bridged =
    APPLY &&
    (['inserted', 'updated'].includes(blog.action) ||
      ['inserted_section', 'updated_section'].includes(home.action));
  if (bridged) closed++;
  results.push({
    query: op.query,
    kind: op.kind,
    blog,
    home,
    href: `/blog/${slug}`,
    status: APPLY ? (bridged ? 'closed' : 'partial') : 'dry',
  });
}

await c.end();
console.log(
  JSON.stringify(
    {
      ok: true,
      status: APPLY ? (closed ? 'closed' : 'noop') : 'dry',
      message: APPLY
        ? `Growth closer · ${closed}/${results.length} opportunity(ies) bridged on Production`
        : `Dry-run · would close ${results.length}`,
      closed,
      results,
      db: process.env.DB_NAME,
    },
    null,
    2
  )
);
