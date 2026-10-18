import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Phase 9 weekly ops digest — automates what can be measured; lists remaining human tasks.
 * Writes weekly-digest.md + weekly-digest.json under outDir.
 */
export async function writeWeeklyDigest(profile, { scan, actions = [], outDir }) {
  const score = scan?.report?.scorecard || {};
  const trend = scan?.report?.trend || null;
  const findings = scan?.report?.findings || [];
  const hard = findings.filter((f) => f.severity === 'critical' || f.severity === 'high');
  const signals = scan?.report?.signals || {};
  const health = actions.find((a) => a.id === 'sitemap-health');
  const draft = actions.find((a) => a.id === 'draft-meta');
  const gscAct = actions.filter((a) =>
    ['submit-sitemap', 'inspect-priority', 'inspect-sitemap-delta', 'act-auth'].includes(a.id)
  );
  const bingAct = actions.find((a) => a.id === 'bing-submit-sitemap');

  const humanChecklist = [
    { id: 'gsc-email', task: 'Check Search Console emails for issues', who: 'You', auto: false },
    { id: 'gbp-reviews', task: 'Reply to new Google Business Profile reviews', who: 'You', auto: false },
    { id: 'gbp-update', task: 'Post one GBP update', who: 'You', auto: false },
    { id: 'enquiries', task: 'Check Admin → Enquiries (or GA4 enquiry_submit)', who: 'You', auto: false },
    {
      id: 'social-sameas',
      task: 'Add social profile URLs in Site Settings (clears SCHEMA_SAMEAS)',
      who: 'You',
      auto: false,
      needed: findings.some((f) => f.code === 'SCHEMA_SAMEAS'),
    },
    {
      id: 'oauth',
      task: 'Set MERIDIAN_GOOGLE_* secrets (SETUP.md) so GSC act runs unattended',
      who: 'Developer',
      auto: false,
      needed: gscAct.some((a) => a.status === 'auth_required'),
    },
    {
      id: 'bing-key',
      task: 'Set MERIDIAN_BING_API_KEY so Bing sitemap submit runs unattended',
      who: 'Developer',
      auto: false,
      needed: bingAct?.status === 'auth_required',
    },
  ].filter((h) => h.needed !== false);

  const automated = [
    { id: 'scan', ok: !!scan?.ok, note: `Score ${score.overall ?? '—'} (${score.grade ?? '—'}) · ${trend?.message || 'no trend yet'}` },
    { id: 'draft-meta', ok: draft?.ok !== false, note: draft?.message || '—' },
    { id: 'sitemap-health', ok: health?.ok !== false, note: health?.message || '—' },
    ...gscAct.map((a) => ({ id: a.id, ok: a.ok !== false || a.status === 'auth_required', note: a.message || a.status })),
    ...(bingAct ? [{ id: 'bing-submit-sitemap', ok: bingAct.ok !== false || bingAct.status === 'auth_required', note: bingAct.message }] : []),
  ];

  const digest = {
    generatedAt: new Date().toISOString(),
    profile: { id: profile.id, displayName: profile.displayName, origin: profile.origin },
    scorecard: { overall: score.overall, grade: score.grade, summary: score.summary },
    trend,
    hardFindingCount: hard.length,
    hardFindings: hard.slice(0, 10).map((f) => ({ code: f.code, title: f.title, severity: f.severity })),
    automated,
    humanChecklist,
    signalsPresent: {
      gsc: !!signals.gsc,
      ga4: !!signals.ga4,
      bing: !!signals.bing,
      pagespeed: !!signals.pagespeed,
    },
    phase9: {
      weeklyMinutesTarget: 15,
      note: 'Automated rows are done by Meridian autopilot/cron. Complete humanChecklist each week.',
    },
  };

  const md = [
    `# Meridian weekly SEO digest — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${digest.generatedAt}`,
    '',
    `## Score`,
    '',
    `**${score.overall ?? '—'}** (${score.grade ?? '—'}) — ${trend?.message || 'first run'}`,
    '',
    `## Automated this week`,
    '',
    ...automated.map((a) => `- [${a.ok ? 'x' : ' '}] **${a.id}**: ${a.note}`),
    '',
    `## Still needs a human (Phase 9.1)`,
    '',
    ...humanChecklist.map((h) => `- [ ] ${h.task} _(${h.who})_`),
    '',
    hard.length
      ? `## Hard findings (${hard.length})\n\n${hard
          .slice(0, 8)
          .map((f) => `- **${f.severity}** \`${f.code}\`: ${f.title}`)
          .join('\n')}`
      : '## Hard findings\n\nNone.',
    '',
    `Full report: \`report-latest.html\` · Autopilot: \`autopilot-latest.json\``,
    '',
  ].join('\n');

  await mkdir(outDir, { recursive: true });
  const jsonPath = resolve(outDir, 'weekly-digest.json');
  const mdPath = resolve(outDir, 'weekly-digest.md');
  await writeFile(jsonPath, JSON.stringify(digest, null, 2), 'utf8');
  await writeFile(mdPath, md, 'utf8');

  // Append to history (last 12 weeks)
  const histPath = resolve(outDir, 'weekly-digest-history.jsonl');
  try {
    const prev = await readFile(histPath, 'utf8').catch(() => '');
    const line = JSON.stringify({
      at: digest.generatedAt,
      score: score.overall,
      grade: score.grade,
      hard: hard.length,
      healthIssues: health?.data?.issueCount ?? null,
    });
    const lines = [...prev.trim().split('\n').filter(Boolean), line].slice(-12);
    await writeFile(histPath, lines.join('\n') + '\n', 'utf8');
  } catch {
    /* best-effort */
  }

  return {
    ok: true,
    status: 'ok',
    message: `Weekly digest written · ${hard.length} hard finding(s) · ${humanChecklist.length} human task(s)`,
    data: { ...digest, paths: { jsonPath, mdPath } },
  };
}
