import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Phase 9.2 monthly report — fills what Meridian already knows; leaves GSC/GBP blanks when secrets missing.
 */
export async function writeMonthlyDigest(profile, { scan, actions = [], outDir }) {
  const score = scan?.report?.scorecard || {};
  const signals = scan?.report?.signals || {};
  const gsc = signals.gsc || {};
  const ga4 = signals.ga4 || {};
  const psi = signals.pagespeed || {};
  const health = actions.find((a) => a.id === 'sitemap-health');
  const form = actions.find((a) => a.id === 'form-health');
  const images = actions.find((a) => a.id === 'image-weight');
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

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
      value: health?.data?.okCount ?? null,
      note: health?.message || '',
    },
    {
      metric: 'Orphan pages',
      where: 'link-graph.json',
      value: health?.data?.linkGraph?.orphanCount ?? null,
      note: '',
    },
    {
      metric: 'Heavy images (key pages)',
      where: 'image-weight.json',
      value: images?.data?.heavyCount ?? null,
      note: '',
    },
    {
      metric: 'Form health',
      where: 'form-health.json',
      value: form?.ok ? 'ok' : form ? 'issue' : null,
      note: form?.message || '',
    },
    {
      metric: 'Google clicks (28d)',
      where: 'GSC → Performance',
      value: gsc.totals?.clicks ?? gsc.clicks ?? null,
      note: signals.gsc ? 'from connector' : 'Set MERIDIAN_GOOGLE_* to auto-fill',
    },
    {
      metric: 'Google impressions (28d)',
      where: 'GSC → Performance',
      value: gsc.totals?.impressions ?? gsc.impressions ?? null,
      note: signals.gsc ? 'from connector' : 'manual until OAuth',
    },
    {
      metric: 'Average position',
      where: 'GSC → Performance',
      value: gsc.totals?.position ?? null,
      note: '',
    },
    {
      metric: 'Organic sessions',
      where: 'GA4 Traffic acquisition',
      value: ga4.organic?.sessions ?? null,
      note: signals.ga4 ? 'from connector' : 'Set MERIDIAN_GA4_PROPERTY_ID',
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
      value: psi.performanceScore ?? null,
      note: psi.lab?.lcp?.displayValue ? `LCP ${psi.lab.lcp.displayValue}` : '',
    },
    {
      metric: 'GBP calls / clicks / directions',
      where: 'Business Profile → Performance',
      value: null,
      note: 'Always manual',
    },
    {
      metric: 'New Google reviews / rating',
      where: 'Business Profile → Reviews',
      value: null,
      note: 'Always manual',
    },
  ];

  const digest = {
    generatedAt: now.toISOString(),
    monthKey,
    profile: { id: profile.id, displayName: profile.displayName, origin: profile.origin },
    rows,
    humanStillRequired: rows.filter((r) => r.value == null).map((r) => r.metric),
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
    message: `Monthly digest ${monthKey} · ${rows.filter((r) => r.value != null).length}/${rows.length} metrics auto-filled`,
    data: { ...digest, paths: { jsonPath, mdPath } },
  };
}
