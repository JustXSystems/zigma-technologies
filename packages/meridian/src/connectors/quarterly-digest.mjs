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
  const sitemap = await readJson(resolve(outDir, 'sitemap-health.json'));
  const fleet = await readJson(resolve(outDir, 'fleet-assurance.json'));
  const phase4 = await readJson(resolve(outDir, 'phase4-advance.json'));
  const guideBriefs = await readJson(resolve(outDir, 'guide-refresh-briefs.json'));
  const depsAudit = await readJson(resolve(outDir, 'deps-audit.json'));

  const score = scan?.report?.scorecard || {};
  const q = Math.floor(new Date().getUTCMonth() / 3) + 1;
  const year = new Date().getUTCFullYear();
  const label = `${year}-Q${q}`;

  const sitemapOk =
    sitemap &&
    (sitemap.broken === 0 || sitemap.brokenCount === 0 || sitemap.unhealthy === 0) &&
    (sitemap.checked > 0 || sitemap.urls?.length > 0 || sitemap.healthy > 0);
  const crawlActionOk = actions.find((a) => a.id === 'sitemap-health')?.ok !== false;
  const labScores = speed?.withLab || phase4?.psi?.checked || phase4?.labCount || 0;
  const kwCount = keywords?.count || keywords?.rows?.length || 0;
  const richFail = rich?.fail ?? rich?.payload?.fail ?? null;

  const tasks = [
    {
      id: 'crawl',
      task: 'Screaming Frog / Meridian sitemap-health: fix new 404s, missing/duplicate titles',
      auto: 'sitemap-health + top20-meta-pack',
      status:
        sitemapOk && (top20?.needsPolish === 0 || top20?.needsPolish == null)
          ? 'ok'
          : sitemapOk || crawlActionOk || sitemap
            ? 'partial'
            : 'todo',
      note: sitemap
        ? `healthy=${sitemap.healthy ?? sitemap.checked ?? '?'} · polish ${top20?.needsPolish ?? '—'}`
        : top20
          ? `${top20.needsPolish ?? '?'} meta rows need polish`
          : 'run sitemap-health',
    },
    {
      id: 'pagespeed',
      task: 'PageSpeed test for 4 key pages (Phase 4)',
      auto: 'speed-baseline.md / phase4-advance',
      status: labScores > 0 || speed?.pages?.length ? (labScores >= 3 ? 'ok' : 'partial') : 'todo',
      note: speed || phase4 ? `${labScores || speed?.pages?.length || 0} lab scores` : 'generate speed baseline',
    },
    {
      id: 'keywords',
      task: 'Review keyword map: new topics, merge/improve',
      auto: 'keyword-map.md + content-calendar.md',
      status: kwCount >= 10 ? 'ok' : keywords ? 'partial' : 'todo',
      note: keywords ? `${kwCount} keywords` : '—',
    },
    {
      id: 'guides',
      task: 'Update top 5 guides with current prices/rules',
      auto: 'guide-refresh-briefs.md',
      status: guideBriefs?.autoReady || (guideBriefs?.count || 0) >= 5 ? 'ok' : guideBriefs?.count ? 'partial' : 'todo',
      note: guideBriefs
        ? `${guideBriefs.count} briefs · ${guideBriefs.quarter} — apply in Admin when convenient`
        : 'run phase17 / guide-refresh',
    },
    {
      id: 'nap',
      task: 'NAP consistency on top directories + GBP',
      auto: 'citations-playbook.md + gbp-checklist.md',
      status: nap?.sameAsCount > 0 && !(nap.missing || []).length ? 'ok' : nap?.sameAsCount > 0 ? 'partial' : 'todo',
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
      auto: 'deps-audit.md + fleet-assurance',
      status:
        depsAudit?.status === 'ok'
          ? 'ok'
          : depsAudit
            ? 'partial'
            : fleet?.workflow?.npmCi && fleet?.runs?.latest?.conclusion === 'success'
              ? 'partial'
              : 'todo',
      note: depsAudit
        ? `outdated ${depsAudit.outdatedCount} · major ${depsAudit.majorCount} · Next ${depsAudit.nextPinned || '—'}`
        : fleet
          ? `fleet ${fleet.fleetPercent}% · last ${fleet.runs?.latest?.conclusion || '—'}`
          : 'developer',
    },
    {
      id: 'access',
      task: 'Review GSC / GA4 / GBP user access',
      auto: 'unlock-readiness + fleet secrets',
      status:
        (unlock?.percent ?? 0) >= 100 && fleet?.secrets?.oauthOk
          ? 'partial'
          : (unlock?.percent ?? 0) >= 100
            ? 'partial'
            : 'todo',
      note:
        fleet?.secrets?.oauthOk
          ? 'Actions OAuth present — confirm GBP users quarterly'
          : 'marketing / owner · sync secrets via phase15:gh',
    },
    {
      id: 'rich',
      task: 'Re-run Rich Results Test pack',
      auto: 'rich-results-pack.md',
      status: richFail === 0 ? 'ok' : rich ? 'partial' : 'todo',
      note: rich != null ? `fail=${richFail}${richFail === 1 ? ' (often /contact Breadcrumb — redeploy if code has JsonLd)' : ''}` : '—',
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
