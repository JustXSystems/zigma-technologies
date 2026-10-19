#!/usr/bin/env node
/**
 * Phase 12 — auto-advance this week's content-calendar slot:
 *  - Resolve product/project title from DB (fixes "Untitled topic")
 *  - Ensure meta_title / meta_description on the target catalog row
 *  - Seed FAQ block via content-seed pattern when thin
 *  - Mark ops-cadence calendar-publish completed
 *
 *   node scripts/meridian-calendar-publish.mjs --json
 *   node scripts/meridian-calendar-publish.mjs --apply --json
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
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

loadEnv();

const APPLY = process.argv.includes('--apply');
const AS_JSON = process.argv.includes('--json');
const outDir = resolve(process.cwd(), 'storage/meridian/zigma-prod');
const calPath = resolve(outDir, 'content-calendar.json');
const MARKER = '<!-- meridian-content-seed -->';

function clip(s, max) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.55 ? cut.slice(0, sp) : cut).trim()}…`;
}

function weekIndex() {
  const d = new Date();
  return Math.min(4, Math.max(1, Math.ceil(d.getDate() / 7)));
}

function parsePath(pathname) {
  const parts = String(pathname || '')
    .split('/')
    .filter(Boolean);
  if (parts.length < 2) return null;
  const seg = parts[0];
  const slug = parts[1];
  const itemType = seg === 'projects' ? 'project' : seg === 'products' ? 'product' : seg === 'services' ? 'service' : null;
  if (!itemType) return null;
  return { itemType, slug, path: `/${seg}/${slug}` };
}

if (!existsSync(calPath)) {
  const out = { ok: false, message: 'content-calendar.json missing — run phase7 first' };
  if (AS_JSON) console.log(JSON.stringify(out));
  else console.error(out.message);
  process.exit(1);
}

const cal = JSON.parse(readFileSync(calPath, 'utf8'));
const wk = weekIndex();
const week = (cal.weeks || []).find((w) => w.week === wk) || (cal.weeks || [])[0];
if (!week?.publish) {
  const out = { ok: true, updated: 0, message: 'No publish slot this week', week: wk };
  if (AS_JSON) console.log(JSON.stringify(out));
  else console.log(out.message);
  process.exit(0);
}

const target = parsePath(week.publish.path);
const pool = await mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const result = {
  ok: true,
  week: week.week,
  path: week.publish.path || null,
  topicBefore: week.publish.topic,
  topicAfter: week.publish.topic,
  metaUpdated: false,
  faqSeeded: false,
  calendarPatched: false,
  dryRun: !APPLY,
  message: '',
};

try {
  if (!target) {
    result.message = 'Publish path not a catalog URL — skipped DB publish';
  } else {
    const [rows] = await pool.query(
      `SELECT id, title, summary, description, meta_title, meta_description
       FROM catalog_items WHERE item_type = ? AND slug = ? LIMIT 1`,
      [target.itemType, target.slug]
    );
    const row = rows[0];
    if (!row) {
      result.message = `Catalog row not found: ${target.path}`;
      result.ok = false;
    } else {
      const title = String(row.title || target.slug).trim();
      result.topicAfter = title;
      const intent =
        week.publish.intent && week.publish.intent !== 'Untitled topic'
          ? week.publish.intent
          : clip(`${title} for commercial and industrial buyers in India`, 80);

      let metaTitle = String(row.meta_title || '').trim();
      let metaDesc = String(row.meta_description || '').trim();
      if (metaTitle.length < 15) {
        metaTitle = clip(
          target.itemType === 'product' ? `${title} – Specs & Supply` : `${title} in India`,
          58
        );
      }
      if (metaDesc.length < 50) {
        metaDesc = clip(
          row.summary ||
            `${title} from Zigma Technologies — engineered supply, installation and AMC support across India. Enquire for a site survey.`,
          155
        );
      }

      const needsMeta =
        String(row.meta_title || '').trim() !== metaTitle ||
        String(row.meta_description || '').trim() !== metaDesc;

      let desc = String(row.description || '');
      const needsFaq = !desc.includes(MARKER);
      const faq = `${MARKER}
<section class="meridian-faq">
<h2>Frequently asked questions</h2>
<details><summary>Who is ${title} for?</summary><p>Commercial and industrial teams evaluating ${title.toLowerCase()} for reliable power in India.</p></details>
<details><summary>What does Zigma deliver?</summary><p>Scoped engineering, supply, installation and AMC support — see related projects and enquire for a survey.</p></details>
<details><summary>How do we start?</summary><p><a href="/contact">Contact Zigma Technologies</a> with your load profile and location.</p></details>
</section>`;

      if (APPLY) {
        if (needsMeta) {
          await pool.query(`UPDATE catalog_items SET meta_title = ?, meta_description = ? WHERE id = ?`, [
            metaTitle,
            metaDesc,
            row.id,
          ]);
          result.metaUpdated = true;
        }
        if (needsFaq) {
          const nextDesc = desc.trim() ? `${desc.trim()}\n\n${faq}` : faq;
          await pool.query(`UPDATE catalog_items SET description = ? WHERE id = ?`, [nextDesc, row.id]);
          result.faqSeeded = true;
        }

        // Patch calendar JSON so ops HTML shows a real topic
        week.publish.topic = title;
        week.publish.intent = intent;
        week.publish.notes = week.publish.notes || `Auto-published SEO+FAQ by Meridian Phase 12 (${new Date().toISOString().slice(0, 10)})`;
        week.publish.autoPublishedAt = new Date().toISOString();
        writeFileSync(calPath, JSON.stringify(cal, null, 2), 'utf8');
        result.calendarPatched = true;

        // Cadence: suppress weekly nag
        const cadencePath = resolve(outDir, 'ops-cadence.json');
        let cadence = { schemaVersion: 1, completed: {}, lastShown: {}, notes: {} };
        if (existsSync(cadencePath)) {
          try {
            cadence = JSON.parse(readFileSync(cadencePath, 'utf8'));
          } catch {
            /* keep default */
          }
        }
        cadence.completed = cadence.completed || {};
        cadence.completed['calendar-publish'] = {
          at: new Date().toISOString(),
          note: `${target.path} · meta=${result.metaUpdated} · faq=${result.faqSeeded}`,
        };
        cadence.lastShown = cadence.lastShown || {};
        cadence.lastShown['calendar-publish'] = new Date().toISOString();
        mkdirSync(dirname(cadencePath), { recursive: true });
        writeFileSync(cadencePath, JSON.stringify(cadence, null, 2), 'utf8');
      }

      result.message = APPLY
        ? `Week ${week.week} published · ${title} · meta ${result.metaUpdated ? 'updated' : 'ok'} · faq ${result.faqSeeded ? 'seeded' : 'ok'}`
        : `Week ${week.week} ready · ${title} · would update meta=${needsMeta} faq=${needsFaq}`;
    }
  }
} finally {
  await pool.end();
}

if (AS_JSON) console.log(JSON.stringify(result, null, 2));
else console.log(result.message);
process.exit(result.ok ? 0 : 1);
