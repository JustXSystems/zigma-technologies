import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadOpsCadence, saveOpsCadence, isDue, markShown } from '../lib/ops-cadence.mjs';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Phase 9 weekly ops digest — automates what can be measured; lists remaining human tasks.
 * Writes weekly-digest.md + weekly-digest.json under outDir.
 * Phase 11: cadence + evidence-based collapse so the list stays short.
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
  const unlock = actions.find((a) => a.id === 'unlock-readiness')?.data;
  const unlockPct = unlock?.percent;
  const cmsSocial = unlock?.cmsSocialCount ?? 0;
  const liveSameAs = unlock?.sameAsCount ?? 0;

  const rich =
    actions.find((a) => a.id === 'rich-results-pack') ||
    actions.find((a) => a.id === 'phase2-advance');
  const richFail = Number(rich?.data?.fail ?? rich?.data?.richFail ?? 0);
  const phase3 = actions.find((a) => a.id === 'phase3-advance');
  const topNeeds = Number(
    actions.find((a) => a.id === 'top20-meta-pack')?.data?.needsPolish ??
      phase3?.data?.topMeta?.needsPolish ??
      0
  );
  const backlinkTodo = Number(
    actions.find((a) => a.id === 'phase8-advance')?.data?.todo ||
      actions.find((a) => a.id === 'backlink-outreach')?.data?.count ||
      0
  );
  const progress = (await readJson(resolve(outDir, 'backlink-progress.json'))) || { sent: [] };
  const sentCount = Array.isArray(progress.sent) ? progress.sent.length : 0;
  const cityBlocked = Number(actions.find((a) => a.id === 'city-pages-readiness')?.data?.blocked || 0);
  const reviewLink = !!(process.env.MERIDIAN_GBP_REVIEW_LINK || '').trim();
  const hasSchemaSameAs = findings.some((f) => f.code === 'SCHEMA_SAMEAS');
  const gscLive =
    gscAct.some((a) => a.ok && a.id === 'submit-sitemap') ||
    actions.find((a) => a.id === 'phase10-advance')?.data?.probes?.gsc?.ok === true;

  let cadence = await loadOpsCadence(outDir);

  const candidates = [
    {
      id: 'deploy-sameas',
      task: 'Deploy Production (phase12-ops.html one-command / npm run meridian:deploy:prod) so live JSON-LD sameAs ships',
      who: 'Developer',
      auto: false,
      needed: hasSchemaSameAs && cmsSocial > 0 && liveSameAs === 0,
    },
    {
      id: 'social-sameas',
      task: 'Add social profile URLs in Site Settings (clears SCHEMA_SAMEAS)',
      who: 'You',
      auto: false,
      needed: hasSchemaSameAs && cmsSocial === 0,
    },
    {
      id: 'gsc-email',
      task: 'Check Search Console emails for issues',
      who: 'You',
      auto: false,
      // GSC API + autopilot cover routine monitoring; only nudge on hard findings
      needed: hard.length > 0 || (!gscLive && isDue(cadence, 'gsc-email', 14)),
    },
    {
      id: 'gbp-pulse',
      task: 'GBP 5‑min pulse — reply new reviews + post one update (draft in phase11-gbp-draft.txt)',
      who: 'You',
      auto: false,
      needed: isDue(cadence, 'gbp-pulse', 7),
    },
    {
      id: 'enquiries',
      task: 'Check Admin → Enquiries — form health probe failed',
      who: 'You',
      auto: false,
      needed: form?.ok === false,
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
      task: 'Claim next directory from citations-playbook.csv / phase5-ops.html',
      who: 'You',
      auto: false,
      needed:
        !!(
          actions.find((a) => a.id === 'citations-playbook')?.ok ||
          actions.find((a) => a.id === 'phase5-advance')?.ok
        ) && isDue(cadence, 'citations', 14),
    },
    {
      id: 'city-content',
      task: 'Write unique proof for one noindex city×service page (phase6-ops.html)',
      who: 'You',
      auto: false,
      needed: cityBlocked > 0 && isDue(cadence, 'city-content', 14),
    },
    {
      id: 'backlink-send',
      task: 'Send 1–2 outreach emails from phase8-ops.html (Open email)',
      who: 'You',
      auto: false,
      needed: backlinkTodo > 0 && sentCount < 2 && isDue(cadence, 'backlink-send', 7),
    },
    {
      id: 'rich-results',
      task: 'Open failing Rich Results Test links (rich-results-pack.md)',
      who: 'You',
      auto: false,
      needed: richFail > 0 && isDue(cadence, 'rich-results', 30),
    },
    {
      id: 'top-meta',
      task: `Polish ${topNeeds} priority titles/descriptions (top20-meta-pack.md)`,
      who: 'You',
      auto: false,
      needed: topNeeds > 0,
    },
    {
      id: 'reviews-send',
      task: reviewLink
        ? 'Send review requests from review-kit.md for completed jobs'
        : 'Set MERIDIAN_GBP_REVIEW_LINK after GBP verify, then send review asks',
      who: 'You',
      auto: false,
      needed:
        !!actions.find((a) => a.id === 'review-kit' || a.id === 'phase5-advance')?.ok &&
        isDue(cadence, 'reviews-send', 14),
    },
    {
      id: 'calendar-publish',
      task: 'Publish this week’s slot from phase7-ops.html / content-calendar.ics',
      who: 'You',
      auto: false,
      needed:
        !cadence?.completed?.['calendar-publish'] &&
        !!(
          actions.find((a) => a.id === 'phase7-advance')?.ok ||
          actions.find((a) => a.id === 'content-calendar')?.ok ||
          actions.find((a) => a.id === 'phase12-advance')?.ok
        ) &&
        isDue(cadence, 'calendar-publish', 7),
    },
    {
      id: 'phase11-cockpit',
      task: 'Open phase11-ops.html (live convergence) · 10 min max',
      who: 'You',
      auto: false,
      needed: true, // trimmed below if nothing else remains
    },
  ];

  let humanChecklist = candidates.filter((h) => h.needed !== false);
  const actionable = humanChecklist.filter((h) => h.id !== 'phase11-cockpit');
  if (actionable.length === 0) {
    humanChecklist = [
      {
        id: 'phase11-cockpit',
        task: 'Glance phase12-ops.html — all measured gates green; optional GBP pulse only',
        who: 'You',
        auto: true,
        needed: true,
      },
    ];
  } else if (actionable.length === 1 && actionable[0].id === 'deploy-sameas') {
    // Single remaining gate — no need for a second "open dashboard" nag
    humanChecklist = actionable;
  } else if (actionable.length <= 3) {
    humanChecklist = [
      ...actionable,
      {
        id: 'phase11-cockpit',
        task: 'Open phase12-ops.html (score lift + deploy command) · 5 min max',
        who: 'You',
        auto: false,
        needed: true,
      },
    ];
  } else {
    humanChecklist = actionable.slice(0, 8);
  }

  cadence = markShown(
    cadence,
    humanChecklist.map((h) => h.id)
  );
  await saveOpsCadence(outDir, cadence);

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
      weeklyMinutesTarget: 10,
      note: 'Cadence-collapsed checklist (Phase 11). Autopilot owns measured work.',
    },
    phase11: {
      collapsedFrom: candidates.filter((c) => c.needed !== false).length,
      cadenceFile: 'ops-cadence.json',
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
    unlockPct != null ? `\nAutomation unlock: **${unlockPct}%** (see unlock-readiness.md / phase11-ops.html)\n` : '',
    `## Automated this week`,
    '',
    ...automated.map((a) => `- [${a.ok ? 'x' : ' '}] **${a.id}**: ${a.note}`),
    '',
    `## Still needs a human (cadence-collapsed)`,
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
    `Full report: \`report-latest.html\` · Command: \`phase11-ops.html\``,
    '',
  ].join('\n');

  await mkdir(outDir, { recursive: true });
  const jsonPath = resolve(outDir, 'weekly-digest.json');
  const mdPath = resolve(outDir, 'weekly-digest.md');
  await writeFile(jsonPath, JSON.stringify(digest, null, 2), 'utf8');
  await writeFile(mdPath, md, 'utf8');

  const histPath = resolve(outDir, 'weekly-digest-history.jsonl');
  try {
    const prev = await readFile(histPath, 'utf8').catch(() => '');
    const line = JSON.stringify({
      at: digest.generatedAt,
      score: score.overall,
      grade: score.grade,
      hard: hard.length,
      human: humanChecklist.length,
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
