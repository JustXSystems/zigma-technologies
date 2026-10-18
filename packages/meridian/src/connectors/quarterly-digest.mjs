import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Phase 9.3 — quarterly ops checklist auto-filled from latest Meridian artefacts.
 */
export async function writeQuarterlyDigest(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  const scan = opts.scan || null;
  const actions = opts.actions || [];

  const unlock = await readJson(resolve(outDir, 'unlock-readiness.json'));
  const preprod = await readJson(resolve(outDir, 'preprod-removals.json'));
  const speed = await readJson(resolve(outDir, 'speed-baseline.json'));
  const keywords = await readJson(resolve(outDir, 'keyword-map.json'));
  const nap = await readJson(resolve(outDir, 'nap-audit.json'));
  const rich = await readJson(resolve(outDir, 'rich-results-pack.json'));
  const top20 = await readJson(resolve(outDir, 'top20-meta-pack.json'));

  const score = scan?.report?.scorecard || {};
  const q = Math.floor(new Date().getUTCMonth() / 3) + 1;
  const year = new Date().getUTCFullYear();
  const label = `${year}-Q${q}`;

  const tasks = [
    {
      id: 'crawl',
      task: 'Screaming Frog / Meridian sitemap-health: fix new 404s, missing/duplicate titles',
      auto: 'sitemap-health + top20-meta-pack',
      status: actions.find((a) => a.id === 'sitemap-health')?.ok !== false ? 'partial' : 'todo',
      note: top20 ? `${top20.needsPolish ?? '?'} meta rows need polish` : 'run top20 pack',
    },
    {
      id: 'pagespeed',
      task: 'PageSpeed test for 4 key pages (Phase 4)',
      auto: 'speed-baseline.md',
      status: speed?.withLab > 0 || speed?.pages?.length ? 'partial' : 'todo',
      note: speed ? `${speed.withLab || 0} lab scores` : 'generate speed baseline',
    },
    {
      id: 'keywords',
      task: 'Review keyword map: new topics, merge/improve',
      auto: 'keyword-map.md + content-calendar.md',
      status: keywords ? 'partial' : 'todo',
      note: keywords ? `${keywords.count || keywords.rows?.length || 0} keywords` : '—',
    },
    {
      id: 'guides',
      task: 'Update top 5 guides with current prices/rules',
      auto: null,
      status: 'todo',
      note: 'human — Admin → Resources',
    },
    {
      id: 'nap',
      task: 'NAP consistency on top directories + GBP',
      auto: 'citations-playbook.md + gbp-checklist.md',
      status: nap?.sameAsCount > 0 ? 'partial' : 'todo',
      note: nap ? `sameAs=${nap.sameAsCount}` : '—',
    },
    {
      id: 'appendix-c',
      task: 'Appendix C: prod indexable + PreProd hidden',
      auto: 'preprod-removals.md + seo:verify',
      status: preprod?.leakCount === 0 ? 'ok' : preprod?.leakCount > 0 ? 'fail' : 'todo',
      note: preprod ? `leaks=${preprod.leakCount}` : 'run preprod-removals',
    },
    {
      id: 'deps',
      task: 'Update Next.js / dependencies with testing',
      auto: null,
      status: 'todo',
      note: 'developer',
    },
    {
      id: 'access',
      task: 'Review GSC / GA4 / GBP user access',
      auto: null,
      status: 'todo',
      note: 'marketing / owner',
    },
    {
      id: 'rich',
      task: 'Re-run Rich Results Test pack',
      auto: 'rich-results-pack.md',
      status: rich?.fail === 0 ? 'partial' : 'todo',
      note: rich ? `fail=${rich.fail}` : '—',
    },
  ];

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '9.3',
    quarter: label,
    scorecard: { overall: score.overall, grade: score.grade },
    unlockPercent: unlock?.percent ?? null,
    tasks,
  };

  const md = [
    `# Quarterly SEO digest — ${label}`,
    '',
    `Generated: ${payload.generatedAt} · score ${score.overall ?? '—'} (${score.grade ?? '—'}) · unlock ${unlock?.percent ?? '?'}%`,
    '',
    '| # | Task | Auto artefact | Status | Note |',
    '| --- | --- | --- | --- | --- |',
    ...tasks.map(
      (t, i) => `| ${i + 1} | ${t.task} | ${t.auto || '—'} | ${t.status} | ${t.note || ''} |`
    ),
    '',
    'Statuses: `ok` / `partial` (artefact ready, human confirm) / `todo` / `fail`.',
    '',
  ].join('\n');

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'quarterly-digest.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'quarterly-digest.md'), md, 'utf8');

  return {
    ok: true,
    status: 'ok',
    message: `Quarterly digest ${label}: ${tasks.filter((t) => t.status === 'ok').length} ok · ${tasks.filter((t) => t.status === 'todo').length} todo`,
    data: { ...payload, paths: { md: resolve(outDir, 'quarterly-digest.md') } },
  };
}
