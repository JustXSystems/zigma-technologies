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
  const form = actions.find((a) => a.id === 'form-health');
  const images = actions.find((a) => a.id === 'image-weight');
  const draft = actions.find((a) => a.id === 'draft-meta');
  const gscAct = actions.filter((a) =>
    ['submit-sitemap', 'inspect-priority', 'inspect-sitemap-delta', 'act-auth'].includes(a.id)
  );
  const bingAct = actions.find((a) => a.id === 'bing-submit-sitemap');
  const formOk = form?.ok === true;

  const humanChecklist = [
    { id: 'gsc-email', task: 'Check Search Console emails for issues', who: 'You', auto: false },
    { id: 'gbp-reviews', task: 'Reply to new Google Business Profile reviews', who: 'You', auto: false },
    { id: 'gbp-update', task: 'Post one GBP update', who: 'You', auto: false },
    {
      id: 'enquiries',
      task: formOk
        ? 'Skim Admin → Enquiries volume (form endpoints already probed OK)'
        : 'Check Admin → Enquiries — form health probe failed',
      who: 'You',
      auto: formOk,
      needed: true,
    },
    {
      id: 'orphans',
      task: `Add internal links to ${health?.data?.linkGraph?.orphanCount ?? '?'} orphan sitemap pages`,
      who: 'You',
      auto: false,
      needed: (health?.data?.linkGraph?.orphanCount || 0) >= 3,
    },
    {
      id: 'heavy-images',
      task: `Compress ${images?.data?.heavyCount ?? 0} heavy image(s) on key pages`,
      who: 'Developer',
      auto: false,
      needed: (images?.data?.heavyCount || 0) >= 1,
    },
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
    {
      id: 'citations',
      task: 'Claim/create next directory listing from citations-playbook.md (Phase 5.5)',
      who: 'You',
      auto: false,
      needed: !!actions.find((a) => a.id === 'citations-playbook')?.ok,
    },
    {
      id: 'city-content',
      task: 'Write unique content for a noindex city×service page (city-pages-readiness.md)',
      who: 'You',
      auto: false,
      needed: (actions.find((a) => a.id === 'city-pages-readiness')?.data?.blocked || 0) > 0,
    },
    {
      id: 'backlink-send',
      task: 'Send 1–2 outreach emails from phase8-ops.html (Open email)',
      who: 'You',
      auto: false,
      needed:
        (actions.find((a) => a.id === 'phase8-advance')?.data?.todo ||
          actions.find((a) => a.id === 'backlink-outreach')?.data?.count ||
          0) > 0,
    },
    {
      id: 'rich-results',
      task: 'Click through rich-results-pack.md (Phase 2.2 Rich Results Test)',
      who: 'You',
      auto: false,
      needed: !!actions.find((a) => a.id === 'rich-results-pack'),
    },
    {
      id: 'top-meta',
      task: `Polish ${actions.find((a) => a.id === 'top20-meta-pack')?.data?.needsPolish ?? '?'} priority titles/descriptions (top20-meta-pack.md)`,
      who: 'You',
      auto: false,
      needed: (actions.find((a) => a.id === 'top20-meta-pack')?.data?.needsPolish || 0) > 0,
    },
    {
      id: 'reviews-send',
      task: 'Send review requests from review-kit.md for completed jobs (Phase 5.6)',
      who: 'You',
      auto: false,
      needed: !!actions.find((a) => a.id === 'review-kit')?.ok,
    },
    {
      id: 'calendar-publish',
      task: 'Publish this week’s item from phase7-ops.html / content-calendar.ics',
      who: 'You',
      auto: false,
      needed: !!(
        actions.find((a) => a.id === 'phase7-advance')?.ok ||
        actions.find((a) => a.id === 'content-calendar')?.ok
      ),
    },
    {
      id: 'phase9-cockpit',
      task: 'Open phase9-ops.html command center (15 min routine)',
      who: 'You',
      auto: false,
      needed: true,
    },
  ].filter((h) => h.needed !== false);

  const unlockPct = actions.find((a) => a.id === 'unlock-readiness')?.data?.percent;

  const automated = [
    { id: 'scan', ok: !!scan?.ok, note: `Score ${score.overall ?? '—'} (${score.grade ?? '—'}) · ${trend?.message || 'no trend yet'}` },
    { id: 'draft-meta', ok: draft?.ok !== false, note: draft?.message || '—' },
    { id: 'sitemap-health', ok: health?.ok !== false, note: health?.message || '—' },
    { id: 'form-health', ok: form?.ok !== false, note: form?.message || '—' },
    { id: 'image-weight', ok: images?.ok !== false, note: images?.message || '—' },
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
    unlockPercent: unlockPct ?? null,
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
    unlockPct != null ? `\nAutomation unlock: **${unlockPct}%** (see unlock-readiness.md / ops-cockpit.html)\n` : '',
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
