import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { syncSeoGuideCanon } from './canon-sync.mjs';
import { advancePhase18 } from './phase18-advance.mjs';
import { advancePhase9 } from './phase9-advance.mjs';
import { assessUnlockReadiness } from './unlock-readiness.mjs';

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
 * Phase 19 — Living canon.
 * Syncs SEO-GUIDE.md status/next-actions from Meridian so the human guide never drifts.
 */
export async function advancePhase19(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  let p18 = { ok: true, message: 'phase18 skipped', data: {} };
  if (opts.skipObserve !== true) {
    p18 = await advancePhase18(profile, {
      outDir,
      apply: opts.apply !== false,
      syncGh: opts.syncGh === true,
      skipHeal: opts.skipHeal === true,
      gscProxy: opts.gscProxy !== false,
    });
    steps.push({ id: 'observe', ok: p18.ok !== false, message: p18.message });
  }

  const canon = await syncSeoGuideCanon(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'canon-sync', ok: canon.ok !== false, message: canon.message });

  const unlock = await assessUnlockReadiness(profile, { outDir });
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const score = observatory?.score || archive?.score || report?.scorecard || {};

  const scan = {
    report: report || { scorecard: score, findings: [] },
    ok: true,
    hardFailCount: 0,
    paths: { outDir },
  };

  await writeFile(
    resolve(outDir, 'phase19-ops.html'),
    '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Phase 19</title></head><body><p>Phase 19 writing…</p></body></html>',
    'utf8'
  );

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 19 Living Canon — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#050308;--card:#100c14;--line:#243041;--text:#e8eef5;--muted:#8b9aab;--accent:#e7c27d;--ok:#3dd68c;--warn:#e6b84d}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(900px 480px at 20% -20%,#3a2a18,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:980px;margin:0 auto}h1{margin:0 0 .25rem;font-size:1.55rem;letter-spacing:-.02em}.sub{color:var(--muted);margin:0 0 1.2rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.25rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1rem;margin-bottom:.75rem}
a.primary{display:inline-block;margin:.2rem .35rem .2rem 0;padding:.5rem .85rem;border-radius:8px;background:var(--accent);color:#1a1200;font-weight:650;text-decoration:none;font-size:.84rem}
.ok{color:var(--ok)}.warn{color:var(--warn)}ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
.banner{border:1px solid #5c4a28;background:linear-gradient(90deg,#2a220a,#100c14);border-radius:12px;padding:1rem 1.15rem;margin-bottom:1rem}
code{font-size:.78rem;background:#1a2636;padding:.1rem .35rem;border-radius:4px}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${canon.ok ? 'ok' : 'warn'}">${canon.ok ? 'CANON SYNCED' : 'CANON SYNC ISSUE'}</strong>
  <p class="sub" style="margin:.35rem 0 0">SEO-GUIDE.md status block is Meridian-owned. Humans follow <code>npm run meridian:observe</code> — not stale Phase-14 checklists.</p>
</div>
<h1>Phase 19 — Living canon</h1>
<p class="sub">${esc(origin)} · guide ↔ observatory · zero doc drift</p>
<div class="hero">
  <div class="metric"><span class="sub">Score</span><b class="ok">${esc(score.overall ?? '—')} ${esc(score.grade || '')}</b></div>
  <div class="metric"><span class="sub">Unlock</span><b class="ok">${esc(unlock.data?.percent ?? observatory?.unlockPercent ?? '—')}%</b></div>
  <div class="metric"><span class="sub">Archive</span><b class="${archive?.sealed ? 'ok' : ''}">${archive?.sealed ? 'SEALED' : '—'}</b></div>
  <div class="metric"><span class="sub">Guide sync</span><b class="${canon.ok ? 'ok' : 'warn'}">${esc(canon.data?.mode || '—')}</b></div>
</div>
<div class="card">
  <a class="primary" href="../../../../SEO-GUIDE.md">SEO-GUIDE.md</a>
  <a class="primary" href="canon-status.md">Canon status</a>
  <a class="primary" href="phase18-ops.html">Phase 18 observatory</a>
  <a class="primary" href="phase17-ops.html">Phase 17 archive</a>
  <a class="primary" href="phase9-ops.html">Phase 9</a>
  <a class="primary" href="${esc(origin)}/admin" target="_blank" rel="noreferrer">Admin</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Forever</h2>
  <ul>
    <li><code>npm run meridian:observe</code> — sensors + GBP proxy + heal</li>
    <li><code>npm run meridian:canon</code> — refresh SEO-GUIDE status only</li>
    <li><code>npm run meridian:guard</code> — full archive re-seal</li>
  </ul>
</div>
</div></body></html>`;

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '19',
    origin,
    score,
    unlockPercent: unlock.data?.percent ?? observatory?.unlockPercent ?? null,
    canon: canon.data,
    observe: { message: p18.message },
    steps,
  };

  const md = [
    `# Phase 19 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `- Canon **${canon.ok ? 'synced' : 'FAILED'}** (${canon.data?.mode || '—'})`,
    `- Score **${score.overall ?? '—'}** · Unlock **${payload.unlockPercent ?? '—'}%**`,
    `- ${p18.message}`,
    '',
    'Open **`phase19-ops.html`**. Guide: root **`SEO-GUIDE.md`** (auto status block).',
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'phase19-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase19-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase19-ops.html'), html, 'utf8');

  const p9 = await advancePhase9(profile, {
    outDir,
    scan,
    actions: [
      { id: 'phase19-advance', ok: canon.ok !== false, message: canon.message, data: payload },
      { id: 'unlock-readiness', ...unlock },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase19-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '19'),
    { id: '19', name: 'Phase 19 Living Canon', file: 'phase19-ops.html', kind: 'html', ready: true, href: 'phase19-ops.html' },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  if (!(await fileExists(resolve(outDir, 'phase19-ops.html')))) {
    /* written */
  }

  return {
    ok: canon.ok !== false,
    status: canon.ok ? 'ok' : 'error',
    message: `Phase 19 canon · ${canon.message}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase19-ops.html'),
        md: resolve(outDir, 'phase19-advance.md'),
        guide: canon.data?.paths?.guide,
        canonMd: canon.data?.paths?.md,
      },
    },
    findings: [
      {
        code: 'PHASE19_CANON',
        severity: 'low',
        title: canon.ok ? 'SEO-GUIDE.md living canon synced' : 'SEO-GUIDE.md canon sync failed',
        remediation: canon.ok
          ? 'Humans read SEO-GUIDE Current status (auto) + run npm run meridian:observe.'
          : 'Check SEO-GUIDE.md markers MERIDIAN:CANON:START/END.',
        owner: 'developer',
        pillar: 'ops',
      },
    ],
  };
}
