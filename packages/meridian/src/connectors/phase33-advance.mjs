import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { advancePhase32 } from './phase32-advance.mjs';
import { writeCommandBrief } from './command-brief.mjs';
import { syncSeoGuideCanon } from './canon-sync.mjs';
import { syncAppendixLedger } from './ledger-sync.mjs';

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

/**
 * Phase 33 — SEO Command Brief.
 * Catalog continuum (32) + unified GSC/Bing/GA4/Meridian one-spot report.
 */
export async function advancePhase33(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  let p32 = { ok: true, message: 'phase32 skipped', data: {} };
  if (opts.skipPhase32 !== true) {
    p32 = await advancePhase32(profile, {
      ...opts,
      outDir,
      skipPhase32: undefined,
    });
    steps.push({ id: 'phase32', ok: p32.ok !== false, message: p32.message });
  } else {
    steps.push({ id: 'phase32', ok: true, message: 'skipped', status: 'skipped' });
  }

  const brief = await writeCommandBrief(profile, {
    outDir,
    windowDays: opts.windowDays,
    topN: opts.topN,
    theme: opts.theme,
    sections: opts.sections,
    title: opts.title,
    comparePrevious: opts.comparePrevious,
    report: opts.scan?.report || undefined,
  });
  steps.push({ id: 'command-brief', ok: brief.ok !== false, message: brief.message });

  const nominal = brief.status === 'ok' && (p32.ok !== false || opts.skipPhase32 === true);
  const ship = {
    generatedAt: new Date().toISOString(),
    phase: '33',
    origin,
    briefStatus: brief.data?.briefStatus || brief.status,
    gscStatus: brief.data?.gsc?.status,
    bingStatus: brief.data?.bing?.status,
    insights: brief.data?.insights?.length ?? 0,
    boardLine: brief.message,
  };
  await writeFile(resolve(outDir, 'command-ship.json'), JSON.stringify(ship, null, 2), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 33 Command Brief — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#03080f;--card:#0a1218;--line:#1a3348;--text:#e6f0fa;--muted:#7a93a8;--accent:#2dd4bf;--ok:#34d399;--warn:#fbbf24}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(900px 480px at 15% -10%,rgba(45,212,191,.14),transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:960px;margin:0 auto}h1{margin:0 0 .2rem;font-size:1.55rem;letter-spacing:-.03em}.sub{color:var(--muted);margin:0 0 1rem}
.banner{border:1px solid ${nominal ? '#1a3040' : '#5a4830'};background:linear-gradient(105deg,${nominal ? '#0c1c28' : '#2a2010'},#0a1218 55%);border-radius:14px;padding:1.1rem 1.25rem;margin-bottom:1.1rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.15rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.05rem 1.15rem;margin-bottom:.85rem}
.btn{display:inline-block;margin:.2rem .3rem .2rem 0;padding:.48rem .8rem;border-radius:8px;border:1px solid var(--line);background:#122030;color:var(--text);font-weight:600;text-decoration:none;font-size:.82rem}
.btn.primary{background:var(--accent);color:#042014;border:0}
.ok{color:var(--ok)}.warn{color:var(--warn)}code{font-size:.78rem;background:#122030;padding:.1rem .35rem;border-radius:4px}
ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${nominal ? 'ok' : 'warn'}">${nominal ? 'COMMAND BRIEF LIVE' : 'COMMAND BRIEF NEEDS ATTENTION'}</strong>
  <p class="sub" style="margin:.35rem 0 0">${esc(ship.boardLine)}</p>
</div>
<h1>Phase 33 — SEO Command Brief</h1>
<p class="sub">${esc(origin)} · GSC + Bing + GA4 + Meridian · one-spot customizable report</p>
<div class="hero">
  <div class="metric"><span class="sub">Brief</span><b class="${nominal ? 'ok' : 'warn'}">${esc(ship.briefStatus)}</b></div>
  <div class="metric"><span class="sub">GSC</span><b>${esc(ship.gscStatus || '—')}</b></div>
  <div class="metric"><span class="sub">Bing</span><b>${esc(ship.bingStatus || '—')}</b></div>
  <div class="metric"><span class="sub">Insights</span><b>${esc(ship.insights)}</b></div>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Stop hopping between Search Console, Bing, and digests</h2>
  <ul>
    <li>Live GSC queries / pages / devices / countries + period delta</li>
    <li>Bing crawl, queries, pages, traffic sample</li>
    <li>GA4 organic, Meridian technical score, catalog continuum, conversion</li>
    <li>Theme / section filters in the HTML · profile <code>autopilot.commandBrief</code></li>
  </ul>
  <code>npm run meridian:observe</code> · <code>npm run meridian:brief</code>
</div>
<div class="card">
  <a class="btn primary" href="command-brief.html">Open Command Brief</a>
  <a class="btn" href="command-brief.md">Markdown</a>
  <a class="btn" href="phase32-ops.html">Catalog continuum</a>
  <a class="btn" href="ops-cockpit.html">Ops cockpit</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
</div></body></html>`;

  const payload = {
    generatedAt: ship.generatedAt,
    phase: '33',
    origin,
    ship,
    brief: brief.data,
    steps,
  };

  await writeFile(resolve(outDir, 'phase33-ops.html'), html, 'utf8');
  await writeFile(resolve(outDir, 'phase33-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'phase33-advance.md'),
    [
      `# Phase 33 advance — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt}`,
      '',
      `- Command Brief **${ship.briefStatus}** · ${ship.insights} insights`,
      `- GSC **${ship.gscStatus}** · Bing **${ship.bingStatus}**`,
      `- ${p32.message}`,
      '',
      'Open **`command-brief.html`** (or Admin → SEO → Meridian → Command Brief).',
      '',
      'Forever: **`npm run meridian:observe`** · Brief only: **`npm run meridian:brief`**.',
      '',
    ].join('\n'),
    'utf8'
  );

  if (opts.skipCanon !== true) {
    const ledger = await syncAppendixLedger(profile, { outDir, root: process.cwd() });
    steps.push({ id: 'ledger', ok: ledger.ok !== false, message: ledger.message });
    const canon = await syncSeoGuideCanon(profile, { outDir, root: process.cwd() });
    steps.push({ id: 'canon', ok: canon.ok !== false, message: canon.message });
    payload.steps = steps;
    await writeFile(resolve(outDir, 'phase33-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  }

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => !['31', '32', '33'].includes(m.id)),
    {
      id: '31',
      name: 'Phase 31 Silent Steward',
      file: 'phase31-ops.html',
      kind: 'html',
      ready: true,
      href: 'phase31-ops.html',
    },
    {
      id: '32',
      name: 'Phase 32 Catalog Continuum',
      file: 'phase32-ops.html',
      kind: 'html',
      ready: true,
      href: 'phase32-ops.html',
    },
    {
      id: '33',
      name: 'Phase 33 Command Brief',
      file: 'command-brief.html',
      kind: 'html',
      ready: true,
      href: 'command-brief.html',
    },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  return {
    ok: brief.ok !== false && (p32.ok !== false || opts.skipPhase32 === true),
    status: nominal ? 'ok' : brief.status,
    message: `Phase 33 Command Brief · ${ship.briefStatus} · ${ship.insights} insights · GSC ${ship.gscStatus}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'command-brief.html'),
        ops: resolve(outDir, 'phase33-ops.html'),
        md: resolve(outDir, 'phase33-advance.md'),
        briefMd: resolve(outDir, 'command-brief.md'),
      },
    },
    findings: [...(brief.findings || []), ...(p32.findings || [])],
  };
}
