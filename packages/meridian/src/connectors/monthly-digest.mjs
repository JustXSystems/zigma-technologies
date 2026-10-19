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
 * Phase 9.2 monthly report — fills what Meridian already knows; leaves GBP blanks.
 */
export async function writeMonthlyDigest(profile, { scan, actions = [], outDir }) {
  const score = scan?.report?.scorecard || {};
  const signals = scan?.report?.signals || {};
  const cache = outDir ? await readJson(resolve(outDir, 'signal-cache.json')) : null;
  const gsc = cache?.gsc || signals.gsc || {};
  const ga4 = cache?.ga4 || signals.ga4 || {};
  const psi = cache?.pagespeed || signals.pagespeed || {};
  const health =
    actions.find((a) => a.id === 'sitemap-health') ||
    (outDir ? { data: await readJson(resolve(outDir, 'sitemap-health.json')) } : null);
  const form =
    actions.find((a) => a.id === 'form-health') ||
    (outDir ? { ...(await readJson(resolve(outDir, 'form-health.json'))), ok: true } : null);
  const images =
    actions.find((a) => a.id === 'image-weight') ||
    (outDir ? { data: await readJson(resolve(outDir, 'image-weight.json')) } : null);
  const healthData = health?.data || health || {};
  const formOk = form?.ok === true || form?.status === 'ok';
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  const gscClicks = gsc.totals?.clicks ?? gsc.sampleTotals?.clicks ?? gsc.clicks ?? null;
  const gscImpr = gsc.totals?.impressions ?? gsc.sampleTotals?.impressions ?? gsc.impressions ?? null;
  const gscPos = gsc.totals?.position ?? gsc.sampleTotals?.position ?? null;
  const psiScore =
    typeof psi.performanceScore === 'number'
      ? psi.performanceScore
      : typeof psi === 'number'
        ? psi
        : psi?.categories?.performance?.score != null
          ? Math.round(psi.categories.performance.score * 100)
          : null;

  const rows = [
    {
      metric: 'Meridian score',
      where: 'Autopilot / Admin → Meridian',
      value: score.overall ?? null,
      note: score.grade || '',
    },
    {
      metric: 'Hard findings',
      where: 'Meridian report',
      value: (scan?.report?.findings || []).filter((f) => f.severity === 'critical' || f.severity === 'high').length,
      note: '',
    },
    {
      metric: 'Sitemap URLs healthy',
      where: 'sitemap-health.json',
      value: healthData.okCount ?? healthData.summary?.ok ?? null,
      note: health?.message || healthData.message || '',
    },
    {
      metric: 'Orphan pages',
      where: 'link-graph.json',
      value: healthData.linkGraph?.orphanCount ?? null,
      note: '',
    },
    {
      metric: 'Heavy images (key pages)',
      where: 'image-weight.json',
      value: images?.data?.heavyCount ?? images?.heavyCount ?? null,
      note: '',
    },
    {
      metric: 'Form health',
      where: 'form-health.json',
      value: form ? (formOk ? 'ok' : 'issue') : null,
      note: form?.message || '',
    },
    {
      metric: 'Google clicks (28d)',
      where: 'GSC → Performance',
      value: gscClicks,
      note: gscClicks != null ? 'from connector' : 'Set MERIDIAN_GOOGLE_* to auto-fill',
    },
    {
      metric: 'Google impressions (28d)',
      where: 'GSC → Performance',
      value: gscImpr,
      note: gscImpr != null ? 'from connector' : 'manual until OAuth',
    },
    {
      metric: 'Average position',
      where: 'GSC → Performance',
      value: gscPos != null ? Number(Number(gscPos).toFixed(1)) : null,
      note: '',
    },
    {
      metric: 'Organic sessions',
      where: 'GA4 Traffic acquisition',
      value: ga4.organic?.sessions ?? null,
      note: ga4.organic ? 'from connector' : 'Set MERIDIAN_GA4_PROPERTY_ID',
    },
    {
      metric: 'Organic key events',
      where: 'GA4 (enquiry_submit)',
      value: ga4.organic?.keyEvents ?? null,
      note: '',
    },
    {
      metric: 'Mobile PSI score',
      where: 'PageSpeed Insights',
      value: psiScore,
      note: psi.lab?.lcp?.displayValue ? `LCP ${psi.lab.lcp.displayValue}` : '',
    },
    {
      metric: 'GBP calls / clicks / directions',
      where: 'Business Profile → Performance',
      value: null,
      note: 'Always manual (no public API)',
      alwaysManual: true,
    },
    {
      metric: 'New Google reviews / rating',
      where: 'Business Profile → Reviews',
      value: null,
      note: 'Always manual (no public API)',
      alwaysManual: true,
    },
  ];

  const digest = {
    generatedAt: now.toISOString(),
    monthKey,
    profile: { id: profile.id, displayName: profile.displayName, origin: profile.origin },
    rows,
    humanStillRequired: rows.filter((r) => r.value == null && !r.alwaysManual).map((r) => r.metric),
    alwaysManual: rows.filter((r) => r.alwaysManual).map((r) => r.metric),
    filledAuto: rows.filter((r) => r.value != null).length,
    fillable: rows.filter((r) => !r.alwaysManual).length,
    phase92: 'SEO-GUIDE Phase 9.2 monthly report template — auto-filled where connectors allow.',
  };

  const md = [
    `# Meridian monthly SEO report — ${monthKey}`,
    '',
    `Site: ${profile.displayName || profile.id} · ${profile.origin}`,
    `Generated: ${digest.generatedAt}`,
    '',
    '| Metric | Value | Where / note |',
    '| --- | --- | --- |',
    ...rows.map((r) => `| ${r.metric} | ${r.value ?? '—'} | ${r.where}${r.note ? ` · ${r.note}` : ''} |`),
    '',
    digest.humanStillRequired.length
      ? `## Still fill manually\n\n${digest.humanStillRequired.map((m) => `- ${m}`).join('\n')}`
      : '## All connector-backed metrics filled',
    '',
  ].join('\n');

  await mkdir(outDir, { recursive: true });
  const jsonPath = resolve(outDir, 'monthly-digest.json');
  const mdPath = resolve(outDir, 'monthly-digest.md');
  await writeFile(jsonPath, JSON.stringify(digest, null, 2), 'utf8');
  await writeFile(mdPath, md, 'utf8');

  const histPath = resolve(outDir, 'monthly-digest-history.jsonl');
  try {
    const prev = await readFile(histPath, 'utf8').catch(() => '');
    const line = JSON.stringify({
      at: digest.generatedAt,
      monthKey,
      score: score.overall,
      orphans: health?.data?.linkGraph?.orphanCount ?? null,
      heavyImages: images?.data?.heavyCount ?? null,
      formOk: form?.ok ?? null,
    });
    const lines = [...prev.trim().split('\n').filter(Boolean).filter((l) => !l.includes(`"monthKey":"${monthKey}"`)), line].slice(
      -24
    );
    await writeFile(histPath, lines.join('\n') + '\n', 'utf8');
  } catch {
    /* best-effort */
  }

  return {
    ok: true,
    status: 'ok',
    message: `Monthly digest ${monthKey} · ${digest.filledAuto}/${digest.fillable} auto · ${digest.alwaysManual.length} GBP manual`,
    data: { ...digest, paths: { jsonPath, mdPath } },
  };
}
