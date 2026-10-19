import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { writeGuideRefreshBriefs } from './guide-refresh.mjs';
import { writeDepsAudit } from './deps-audit.mjs';
import { writeRichResultsPack } from './rich-results-pack.mjs';
import { writeQuarterlyDigest } from './quarterly-digest.mjs';
import { writeMonthlyDigest } from './monthly-digest.mjs';
import { writeWeeklyDigest } from './weekly-digest.mjs';
import { writeOpsCockpit } from './ops-cockpit.mjs';
import { loadGbpPulse } from './gbp-pulse.mjs';
import { assessUnlockReadiness } from './unlock-readiness.mjs';
import { advancePhase16 } from './phase16-advance.mjs';
import { advancePhase9 } from './phase9-advance.mjs';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Phase 17 — Mission archive (terminal guardian).
 * Closes quarterly guides/deps gaps, re-validates rich results, seals continuum.
 * After this: forever ops = `npm run meridian:guard` (alias of phase17).
 */
export async function advancePhase17(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  // 1) Guide refresh briefs (closes quarterly guides todo → partial/ok)
  const guides = await writeGuideRefreshBriefs(profile, { outDir });
  steps.push({ id: 'guide-refresh', ok: true, message: guides.message });

  // 2) Deps audit (closes quarterly deps todo → partial/ok)
  const deps = await writeDepsAudit(profile, { outDir });
  steps.push({ id: 'deps-audit', ok: true, message: deps.message });

  // 3) Rich results re-probe (clear stale contact Breadcrumb fail when live)
  const rich = await writeRichResultsPack(profile, { outDir });
  steps.push({ id: 'rich-results', ok: rich.ok !== false, message: rich.message });

  // 4) GBP pulse template keep-alive
  const gbp = await loadGbpPulse(profile, { outDir });
  steps.push({ id: 'gbp-pulse', ok: true, message: gbp.message });

  // 5) Continuum refresh (score apex maintain) — skip nested fleet storm by default
  let p16 = { ok: true, message: 'phase16 skipped', data: {} };
  if (opts.skipPhase16 !== true) {
    p16 = await advancePhase16(profile, {
      outDir,
      apply: opts.apply !== false,
      skipScan: opts.skipScan === true,
      skipMeta: opts.skipMeta === true,
      skipPhase15: opts.skipPhase15 !== false, // default skip fleet for speed
      skipPhase14: true,
      syncGh: opts.syncGh === true,
    });
    steps.push({ id: 'phase16', ok: p16.ok !== false, message: p16.message });
  }

  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const scan = opts.scan || {
    report: report || { scorecard: {}, findings: [] },
    ok: true,
    hardFailCount: 0,
    paths: { outDir },
  };
  // Prefer continuum score if present
  if (p16.data?.score?.overall != null && scan.report) {
    scan.report.scorecard = { ...scan.report.scorecard, ...p16.data.score };
  }

  const unlock = await assessUnlockReadiness(profile, { outDir });
  steps.push({ id: 'unlock', ok: true, message: unlock.message });

  const weekly = await writeWeeklyDigest(profile, { scan, actions: [], outDir });
  const monthly = await writeMonthlyDigest(profile, { scan, actions: [], outDir, gbpPulse: gbp.data });
  const quarterly = await writeQuarterlyDigest(profile, {
    outDir,
    scan,
    actions: [
      { id: 'sitemap-health', ok: true, data: await readJson(resolve(outDir, 'sitemap-health.json')) },
      { id: 'unlock-readiness', ...unlock },
      { id: 'guide-refresh', ...guides },
      { id: 'deps-audit', ...deps },
    ],
  });
  const cockpit = await writeOpsCockpit(profile, {
    outDir,
    scan,
    actions: [],
    unlock: unlock.data,
    scorecard: scan.report?.scorecard,
  });
  steps.push({ id: 'digests', ok: true, message: `${weekly.message} · ${monthly.message} · ${quarterly.message}` });

  const score = scan.report?.scorecard || p16.data?.score || {};
  const q = (await readJson(resolve(outDir, 'quarterly-digest.json'))) || {};
  const qTasks = q.tasks || [];
  const qOk = qTasks.filter((t) => t.status === 'ok').length;
  const qTodo = qTasks.filter((t) => t.status === 'todo').length;
  const qPartial = qTasks.filter((t) => t.status === 'partial').length;
  const richFail = rich.data?.fail ?? rich.data?.payload?.fail ?? (await readJson(resolve(outDir, 'rich-results-pack.json')))?.fail ?? null;

  const sealed =
    (score.overall ?? 0) >= 99 &&
    (unlock.data?.percent ?? 0) >= 100 &&
    qTodo === 0 &&
    (richFail === 0 || richFail == null);

  const archive = {
    generatedAt: new Date().toISOString(),
    phase: '17',
    origin,
    sealed,
    score: { overall: score.overall, grade: score.grade, pillars: score.pillars },
    unlockPercent: unlock.data?.percent ?? null,
    quarterly: { ok: qOk, partial: qPartial, todo: qTodo, total: qTasks.length },
    richFail,
    gbpComplete: !!gbp.data?.complete,
    guides: { count: guides.data?.count, quarter: guides.data?.quarter },
    deps: { outdated: deps.data?.outdatedCount, major: deps.data?.majorCount, status: deps.status },
    foreverCommand: 'npm run meridian:guard',
    humanLeft: [
      ...(!gbp.data?.complete
        ? [
            {
              id: 'gbp-pulse',
              label: 'Optional monthly: GBP Insights → gbp-pulse.json',
              howTo: 'gbp-pulse.md or MERIDIAN_GBP_* env',
            },
          ]
        : []),
      ...qTasks
        .filter((t) => t.status === 'todo')
        .map((t) => ({ id: t.id, label: t.task, howTo: t.note || '—' })),
    ],
  };

  await writeFile(
    resolve(outDir, 'phase17-ops.html'),
    '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Phase 17</title></head><body><p>Phase 17 writing…</p></body></html>',
    'utf8'
  );

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 17 Mission Archive — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#020508;--card:#0a0e14;--line:#243041;--text:#e8eef5;--muted:#8b9aab;--accent:#fbbf24;--ok:#3dd68c;--warn:#e6b84d;--bad:#f07178}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(900px 480px at 50% -20%,#3a2a0a,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:980px;margin:0 auto}h1{margin:0 0 .25rem;font-size:1.55rem;letter-spacing:-.02em}.sub{color:var(--muted);margin:0 0 1.2rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.25rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1rem;margin-bottom:.75rem}
a.primary{display:inline-block;margin:.2rem .35rem .2rem 0;padding:.5rem .85rem;border-radius:8px;background:var(--accent);color:#1a1200;font-weight:650;text-decoration:none;font-size:.84rem}
.ok{color:var(--ok)}.warn{color:var(--warn)}.bad{color:var(--bad)}ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
.seal{border:1px solid ${sealed ? '#2a6a4a' : '#5c4a1f'};background:linear-gradient(90deg,${sealed ? '#0a281c' : '#2a220a'},#0a0e14);border-radius:12px;padding:1.1rem 1.2rem;margin-bottom:1rem}
code{font-size:.78rem;background:#1a2636;padding:.1rem .35rem;border-radius:4px}
</style></head><body><div class="wrap">
<div class="seal">
  <strong class="${sealed ? 'ok' : 'warn'}">${sealed ? 'MISSION ARCHIVED — SEALED' : 'MISSION ARCHIVE — ACTIVE'}</strong>
  <p class="sub" style="margin:.4rem 0 0">Terminal Meridian layer. Forever ops: <code>npm run meridian:guard</code> · Monday GitHub cron · optional GBP pulse.</p>
</div>
<h1>Phase 17 — Mission archive</h1>
<p class="sub">${esc(origin)} · guide briefs · deps audit · rich re-probe · continuum seal</p>
<div class="hero">
  <div class="metric"><span class="sub">Score</span><b class="ok">${esc(score.overall ?? '—')} ${esc(score.grade || '')}</b></div>
  <div class="metric"><span class="sub">Unlock</span><b class="ok">${esc(unlock.data?.percent ?? '—')}%</b></div>
  <div class="metric"><span class="sub">Quarterly</span><b>${qOk} ok · ${qPartial} partial · ${qTodo} todo</b></div>
  <div class="metric"><span class="sub">Rich fail</span><b class="${richFail === 0 ? 'ok' : 'warn'}">${esc(richFail ?? '—')}</b></div>
  <div class="metric"><span class="sub">Guides</span><b>${esc(guides.data?.count ?? 0)}</b></div>
  <div class="metric"><span class="sub">Deps major</span><b class="${(deps.data?.majorCount ?? 0) === 0 ? 'ok' : 'warn'}">${esc(deps.data?.majorCount ?? '—')}</b></div>
</div>
<div class="card">
  <a class="primary" href="phase16-ops.html">Phase 16 continuum</a>
  <a class="primary" href="phase15-ops.html">Phase 15 fleet</a>
  <a class="primary" href="phase9-ops.html">Phase 9</a>
  <a class="primary" href="guide-refresh-briefs.md">Guide briefs</a>
  <a class="primary" href="deps-audit.md">Deps audit</a>
  <a class="primary" href="gbp-pulse.md">GBP pulse</a>
  <a class="primary" href="mission-archive.json">Archive JSON</a>
  <a class="primary" href="${esc(origin)}/admin" target="_blank" rel="noreferrer">Admin</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Archive steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Forever (no new phases required)</h2>
  <ul>
    <li><code>npm run meridian:guard</code> — this pack (guides + deps + rich + continuum)</li>
    <li><code>npm run meridian:autopilot</code> — weekly GitHub Action (Mondays)</li>
    <li>Optional: <code>gbp-pulse.json</code> once/month for Insights numbers</li>
    <li>Optional: <code>npm run meridian:act:phase15:gh</code> after <code>gh auth login</code></li>
  </ul>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Human left</h2>
  <ul>
  ${
    archive.humanLeft.length
      ? archive.humanLeft.map((h) => `<li><strong>${esc(h.label)}</strong> — ${esc(h.howTo)}</li>`).join('')
      : '<li class="ok">Archive sealed — no blocking human tasks.</li>'
  }
  </ul>
</div>
</div></body></html>`;

  const payload = {
    ...archive,
    steps,
    digests: {
      weekly: weekly.message,
      monthly: monthly.message,
      quarterly: quarterly.message,
      cockpit: cockpit.message,
      phase16: p16.message,
    },
  };

  const md = [
    `# Phase 17 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `- **${sealed ? 'SEALED' : 'ACTIVE'}** · Score **${score.overall ?? '—'}** · Unlock **${unlock.data?.percent ?? '—'}%**`,
    `- Guides ${guides.data?.count ?? 0} briefs · Deps ${deps.data?.outdatedCount ?? 0} outdated (${deps.data?.majorCount ?? 0} major)`,
    `- Rich fail ${richFail ?? '—'} · Quarterly ${qOk} ok / ${qPartial} partial / ${qTodo} todo`,
    `- Forever: \`npm run meridian:guard\``,
    '',
    'Open **`phase17-ops.html`** — mission archive.',
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'mission-archive.json'), JSON.stringify(archive, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase17-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase17-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase17-ops.html'), html, 'utf8');

  const p9 = await advancePhase9(profile, {
    outDir,
    scan,
    actions: [
      { id: 'phase17-advance', ok: true, message: `Phase 17 archive · ${sealed ? 'sealed' : 'active'}`, data: payload },
      { id: 'unlock-readiness', ...unlock },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  payload.digests.phase9 = p9.message;
  await writeFile(resolve(outDir, 'phase17-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '17'),
    { id: '17', name: 'Phase 17 Mission Archive', file: 'phase17-ops.html', kind: 'html', ready: true, href: 'phase17-ops.html' },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  if (!(await fileExists(resolve(outDir, 'phase17-ops.html')))) {
    /* written */
  }

  return {
    ok: true,
    status: sealed ? 'ok' : 'degraded',
    message: `Phase 17 archive · ${sealed ? 'SEALED' : 'active'} · score ${score.overall ?? '—'} · Q ${qOk}/${qTasks.length} ok · rich fail ${richFail ?? '—'}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase17-ops.html'),
        md: resolve(outDir, 'phase17-advance.md'),
        archive: resolve(outDir, 'mission-archive.json'),
        guides: guides.data?.paths?.md,
        deps: deps.data?.paths?.md,
      },
    },
    findings: [
      {
        code: 'PHASE17_ARCHIVE',
        severity: 'low',
        title: sealed ? 'Phase 17 mission archive sealed' : 'Phase 17 mission archive active',
        remediation: sealed
          ? 'Run npm run meridian:guard on a schedule; optional GBP pulse monthly.'
          : 'Apply guide-refresh-briefs.md in Admin if desired; review deps-audit.md; redeploy if /contact Breadcrumb missing live.',
        owner: 'developer',
        pillar: 'ops',
      },
    ],
  };
}
