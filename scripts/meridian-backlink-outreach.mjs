#!/usr/bin/env node
/**
 * Phase 8 outreach drafts from published projects.
 *   node scripts/meridian-backlink-outreach.mjs --json --out storage/meridian/zigma-prod/backlink-outreach.json
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import mysql from 'mysql2/promise';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

function plain(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

loadEnv();

const origin = (process.argv.includes('--origin')
  ? process.argv[process.argv.indexOf('--origin') + 1]
  : process.env.NEXT_PUBLIC_SITE_URL || 'https://zigma-technologies.com'
).replace(/\/$/, '');

const outArg = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : 'storage/meridian/zigma-prod/backlink-outreach.json';

const pool = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const targets = [];
try {
  const [rows] = await pool.query(
    `SELECT slug, title, summary FROM catalog_items
     WHERE item_type = 'project' AND enabled = 1
       AND (status IS NULL OR status IN ('published','live'))
     ORDER BY sort_order, id LIMIT 40`
  );
  for (const r of rows) {
    const pageUrl = `${origin}/projects/${r.slug}`;
    targets.push({
      type: 'client-case-study',
      project: plain(r.title),
      pageUrl,
      ask: 'Permission to list your project on our site (already live) and a reciprocal mention / news link if you publish a vendor story.',
      emailDraft: `Subject: Quick favour — link to our case study on ${plain(r.title)}

Hello,

We recently published a short case study about the work we delivered for you:
${pageUrl}

If you have a vendors / news / CSR page, would you be open to linking to it (or mentioning Zigma Technologies as the EPC/UPS partner)? Happy to share a one-line blurb and logo.

Thank you,
Zigma Technologies
${origin}/contact
`,
    });
  }
} catch (e) {
  console.error(e.message || e);
}

await pool.end();

targets.push({
  type: 'oem-partner',
  project: 'OEM dealer locator',
  pageUrl: origin,
  ask: 'Ask each OEM account manager to list Zigma on their authorised partner / dealer locator with a link to the apex site.',
  emailDraft: `Subject: Dealer locator listing — Zigma Technologies

Hello,

Please add Zigma Technologies to your authorised partner / dealer locator:

Website: ${origin}
City: Bengaluru, Karnataka

Happy to provide GST, authorisation letter, and NAP details.

Thank you,
`,
});

const payload = { generatedAt: new Date().toISOString(), count: targets.length, origin, targets };
const outPath = resolve(process.cwd(), outArg);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
writeFileSync(
  outPath.replace(/\.json$/, '.md'),
  [
    '# Backlink outreach pack (Phase 8)',
    '',
    `Generated: ${payload.generatedAt} · ${targets.length} drafts`,
    '',
    'Never buy spam links. Prefer clients, OEMs, associations.',
    '',
    ...targets.map(
      (t, i) =>
        `## ${i + 1}. ${t.project}\n\n- Type: ${t.type}\n- URL: ${t.pageUrl}\n- Ask: ${t.ask}\n\n\`\`\`\n${t.emailDraft.trim()}\n\`\`\`\n`
    ),
  ].join('\n'),
  'utf8'
);

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ ok: true, count: targets.length, outPath }));
} else {
  console.log(`Wrote ${targets.length} → ${outPath}`);
}
