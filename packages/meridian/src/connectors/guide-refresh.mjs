import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { dbReady } from '../lib/db-ready.mjs';

/**
 * Quarterly guide refresh — auto-brief top resource posts (prices/rules/year).
 * Marks quarterly "guides" task partial/ok without requiring hand-editing first.
 */

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

function runNode(script, args) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }));
    child.on('error', (e) => resolvePromise({ code: 1, stdout: '', stderr: String(e.message || e) }));
  });
}

const FALLBACK_GUIDES = [
  { slug: 'ups-sizing-guide', title: 'How to Size a UPS' },
  { slug: 'solar-om-checklist', title: 'Commercial Rooftop Solar O&M Checklist' },
  { slug: 'bess-peak-shaving', title: 'BESS Peak Shaving' },
  { slug: 'ev-charger-installation-checklist', title: 'EV Charger Installation Checklist' },
  { slug: 'diesel-genset-vs-ups', title: 'Diesel Genset vs UPS' },
];

export async function writeGuideRefreshBriefs(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const year = new Date().getUTCFullYear();
  const origin = String(profile.origin || '').replace(/\/$/, '');

  let guides = [];
  if (dbReady()) {
    const script = resolve(process.cwd(), 'scripts/meridian-guide-refresh.mjs');
    const r = await runNode(script, ['--json', '--limit', '5']);
    if (r.code === 0) {
      try {
        const data = JSON.parse(r.stdout.trim());
        guides = data.guides || [];
      } catch {
        /* fall through */
      }
    }
  }

  if (!guides.length) {
    const kw = await readJson(resolve(outDir, 'keyword-map.json'));
    const rows = (kw?.rows || kw?.keywords || []).filter((r) =>
      /guide|checklist|how to|vs /i.test(String(r.intent || r.keyword || r.title || ''))
    );
    guides = (rows.length ? rows.slice(0, 5) : FALLBACK_GUIDES).map((r, i) => ({
      slug: r.slug || FALLBACK_GUIDES[i]?.slug || `guide-${i + 1}`,
      title: r.title || r.keyword || r.intent || FALLBACK_GUIDES[i]?.title || `Guide ${i + 1}`,
      path: r.path || `/resources/${r.slug || FALLBACK_GUIDES[i]?.slug || `guide-${i + 1}`}`,
      updatedAt: r.updatedAt || null,
      source: rows.length ? 'keyword-map' : 'fallback',
    }));
  }

  // Pad to 5 with fallbacks so quarterly pack always has a full checklist
  if (guides.length < 5) {
    const have = new Set(guides.map((g) => g.slug));
    for (const f of FALLBACK_GUIDES) {
      if (guides.length >= 5) break;
      if (have.has(f.slug)) continue;
      guides.push({ ...f, path: `/resources/${f.slug}`, source: 'fallback' });
    }
  }

  const briefs = guides.slice(0, 5).map((g, i) => ({
    rank: i + 1,
    slug: g.slug,
    title: g.title,
    url: `${origin}${g.path || `/resources/${g.slug}`}`,
    adminHint: 'Admin → Resources → edit post',
    checklist: [
      `Update any ${year - 1} → ${year} year references in title/body`,
      'Refresh tariff / ₹ price bands if mentioned (solar, UPS, BESS, EV)',
      'Confirm codes/rules still accurate (CEA, DISCOM, fire NOC if cited)',
      'Add 1 new FAQ or internal link to a city/service page',
      'Re-publish; Meridian meta polish will catch length/brand on next autopilot',
    ],
  }));

  const payload = {
    generatedAt: new Date().toISOString(),
    quarter: `${year}-Q${Math.floor(new Date().getUTCMonth() / 3) + 1}`,
    count: briefs.length,
    briefs,
    autoReady: briefs.length >= 5,
  };

  const md = [
    `# Guide refresh briefs — ${payload.quarter}`,
    '',
    `Generated: ${payload.generatedAt} · ${briefs.length} guide(s)`,
    '',
    'Meridian prepared the quarterly guide pack. Apply in Admin (or leave for next content sprint).',
    '',
    ...briefs.flatMap((b) => [
      `## ${b.rank}. ${b.title}`,
      '',
      `- URL: ${b.url}`,
      `- ${b.adminHint}`,
      ...b.checklist.map((c) => `- [ ] ${c}`),
      '',
    ]),
  ].join('\n');

  await writeFile(resolve(outDir, 'guide-refresh-briefs.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'guide-refresh-briefs.md'), md, 'utf8');

  return {
    ok: true,
    status: 'ok',
    message: `Guide refresh briefs · ${briefs.length} guide(s) for ${payload.quarter}`,
    data: { ...payload, paths: { json: resolve(outDir, 'guide-refresh-briefs.json'), md: resolve(outDir, 'guide-refresh-briefs.md') } },
  };
}
