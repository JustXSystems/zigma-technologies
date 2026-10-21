import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { advancePhase20 } from './phase20-advance.mjs';
import { runPresenceSentinel, ackGbpPresence } from './presence-sentinel.mjs';
import { assessHumanDebt } from './human-debt.mjs';
import { syncSeoGuideCanon } from './canon-sync.mjs';
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

function mapsSearchUrl(nap, name) {
  const q = [name || nap?.name, nap?.streetAddress, nap?.addressLocality, nap?.addressRegion, nap?.postalCode]
    .filter(Boolean)
    .join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || 'Zigma Technologies Bengaluru')}`;
}

/**
 * Phase 21 — Presence Sentinel.
 * Auto-detects / seals Google Business Profile evidence; collapses last human debt.
 */
export async function advancePhase21(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  let p20 = { ok: true, message: 'phase20 skipped', data: {} };
  if (opts.skipDesk !== true) {
    p20 = await advancePhase20(profile, {
      outDir,
      apply: opts.apply !== false,
      syncGh: opts.syncGh === true,
      skipHeal: opts.skipHeal === true,
      skipObserve: opts.skipObserve === true,
      skipCanon: opts.skipCanon === true,
      gscProxy: opts.gscProxy !== false,
    });
    steps.push({ id: 'phase20', ok: p20.ok !== false, message: p20.message });
  }

  const presence = opts.ack
    ? await ackGbpPresence(profile, { outDir })
    : await runPresenceSentinel(profile, { outDir, ack: opts.ack === true });
  steps.push({ id: 'presence', ok: presence.ok !== false, message: presence.message });

  const debt = await assessHumanDebt(profile, { outDir });
  steps.push({ id: 'human-debt', ok: debt.ok !== false, message: debt.message });

  const unlock = await assessUnlockReadiness(profile, { outDir });
  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const napAudit = await readJson(resolve(outDir, 'nap-audit.json'));
  const nap = napAudit?.nap || {};
  const score = observatory?.score || archive?.score || report?.scorecard || {};
  const sealed = presence.data?.sealed === true;
  const strength = presence.data?.strength || 'none';

  const evidenceRows = (presence.data?.evidence || [])
    .slice(0, 16)
    .map(
      (e) =>
        `<tr><td class="st-${esc(e.strength)}">${esc(e.strength)}</td><td>${esc(e.kind)}</td><td>${esc(e.note || e.value || '')}</td></tr>`
    )
    .join('');

  const kitPaths = (presence.data?.verifyKit?.paths || [])
    .map(
      (p) =>
        `<div class="card-inner"><strong>${esc(p.title)}</strong><ol>${(p.steps || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 21 Presence Sentinel — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#03050a;--card:#0a1018;--line:#1c2836;--text:#e8eef6;--muted:#8799ad;--accent:#d4af37;--ok:#2fd67b;--warn:#e6b84d;--ext:#6aa8ff}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(900px 500px at 80% -20%,#1a3048,transparent),radial-gradient(700px 380px at 0% 0%,#2a1e0a,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:1040px;margin:0 auto}h1{margin:0 0 .2rem;font-size:1.6rem;letter-spacing:-.03em}.sub{color:var(--muted);font-size:.9rem;margin:0 0 1rem}
.banner{border:1px solid ${sealed ? '#2a5c3a' : '#5c4a28'};background:linear-gradient(105deg,${sealed ? '#0e2418' : '#2a220a'},#0a1018 60%);border-radius:14px;padding:1.1rem 1.25rem;margin-bottom:1.1rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.3rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.05rem 1.15rem;margin-bottom:.85rem}
.card-inner{border:1px solid var(--line);border-radius:10px;padding:.75rem .9rem;margin:.5rem 0}
h2{margin:0 0 .55rem;font-size:1rem}
.btn{display:inline-block;margin:.2rem .3rem .2rem 0;padding:.48rem .8rem;border-radius:8px;border:1px solid var(--line);background:#142030;color:var(--text);font-weight:600;text-decoration:none;font-size:.82rem}
.btn.primary{background:var(--accent);color:#1a1200;border-color:transparent}
.ok{color:var(--ok)}.warn{color:var(--warn)}.ext{color:var(--ext)}
table{width:100%;border-collapse:collapse;font-size:.84rem}td,th{border-bottom:1px solid var(--line);padding:.4rem .3rem;text-align:left}
.st-sealed,.st-strong{color:var(--ok)}.st-weak{color:var(--warn)}.st-none{color:var(--muted)}
code{font-size:.78rem;background:#142030;padding:.1rem .35rem;border-radius:4px}
ol{margin:.35rem 0 0;padding-left:1.2rem;color:var(--muted);font-size:.86rem}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${sealed ? 'ok' : 'warn'}">${sealed ? 'PRESENCE SEALED' : 'PRESENCE SENTINEL ACTIVE'}</strong>
  <p class="sub" style="margin:.35rem 0 0">${
    sealed
      ? 'Google Business Profile evidence confirmed — human debt closed. Forever ops is fully autonomic.'
      : 'Watching for GBP signals. Verify once in Google, then <code>npm run meridian:ack-gbp</code> — or set place id / Places API for auto-seal.'
  }</p>
</div>
<h1>Phase 21 — Presence sentinel</h1>
<p class="sub">${esc(origin)} · last external gate · corporate local sovereignty</p>
<div class="hero">
  <div class="metric"><span class="sub">Score</span><b class="ok">${esc(score.overall ?? '—')} ${esc(score.grade || '')}</b></div>
  <div class="metric"><span class="sub">Presence</span><b class="${sealed ? 'ok' : 'warn'}">${esc(sealed ? 'SEALED' : strength.toUpperCase())}</b></div>
  <div class="metric"><span class="sub">Human debt</span><b class="${(debt.data?.debtScore ?? 0) === 0 ? 'ok' : 'warn'}">${esc(debt.data?.debtScore ?? '—')}</b></div>
  <div class="metric"><span class="sub">Unlock</span><b class="ok">${esc(unlock.data?.percent ?? '—')}%</b></div>
</div>

<div class="card">
  <h2>Actions</h2>
  <a class="btn primary" href="${esc(mapsSearchUrl(nap, presence.data?.verifyKit?.businessName))}" target="_blank" rel="noreferrer">Search Maps</a>
  <a class="btn primary" href="https://business.google.com/create" target="_blank" rel="noreferrer">GBP create / manage</a>
  <a class="btn" href="phase20-ops.html#nap">NAP vault (desk)</a>
  <a class="btn" href="phase5-ops.html">Phase 5 pack</a>
  <a class="btn" href="presence-sentinel.md">Sentinel report</a>
  ${sealed ? '<a class="btn" href="presence-seal.json">Presence seal JSON</a>' : ''}
</div>

${
  sealed
    ? `<div class="card"><h2>Seal</h2>
<pre style="white-space:pre-wrap;font-size:.84rem;background:#060a10;border:1px solid var(--line);border-radius:10px;padding:.85rem">${esc(JSON.stringify(presence.data?.seal || {}, null, 2))}</pre>
<p class="sub">Place id → set <code>MERIDIAN_GBP_PLACE_ID</code> permanently. Review link → <code>MERIDIAN_GBP_REVIEW_LINK</code>.</p></div>`
    : `<div class="card"><h2>Verify kit <span class="ext">(once)</span></h2>${kitPaths}
<p class="sub">After Google verifies you: <code>npm run meridian:ack-gbp</code></p>
<ul class="sub" style="padding-left:1.1rem">${(presence.data?.verifyKit?.autoClose || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
</div>`
}

<div class="card">
  <h2>Evidence ladder</h2>
  <table><thead><tr><th>Strength</th><th>Kind</th><th>Note</th></tr></thead><tbody>${evidenceRows || '<tr><td colspan="3">No evidence yet</td></tr>'}</tbody></table>
</div>

<div class="card">
  <h2>Forever</h2>
  <ul class="sub" style="margin:0;padding-left:1.1rem">
    <li><code>npm run meridian:observe</code> — desk + presence + canon (primary)</li>
    <li><code>npm run meridian:ack-gbp</code> — seal after browser verify</li>
    <li><code>npm run meridian:guard</code> — full archive re-seal</li>
  </ul>
  <p style="margin:.7rem 0 0">
    <a class="btn" href="phase20-ops.html">Phase 20 desk</a>
    <a class="btn" href="executive-brief.md">Executive brief</a>
    <a class="btn" href="SEO-GUIDE.md">SEO-GUIDE.md</a>
    <a class="btn" href="${esc(origin)}/admin" target="_blank" rel="noreferrer">Admin</a>
  </p>
</div>
</div></body></html>`;

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '21',
    origin,
    score,
    unlockPercent: unlock.data?.percent ?? null,
    presence: presence.data,
    humanDebt: debt.data,
    steps,
  };

  await writeFile(resolve(outDir, 'phase21-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'phase21-advance.md'),
    [
      `# Phase 21 advance — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt}`,
      '',
      `- Presence **${sealed ? 'SEALED' : strength}**`,
      `- Human debt **${debt.data?.debtScore ?? '—'}**`,
      `- Score **${score.overall ?? '—'}** · Unlock **${payload.unlockPercent ?? '—'}%**`,
      `- ${p20.message}`,
      '',
      'Open **`phase21-ops.html`**.',
      '',
    ].join('\n'),
    'utf8'
  );
  await writeFile(resolve(outDir, 'phase21-ops.html'), html, 'utf8');

  const canon = await syncSeoGuideCanon(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'canon-refresh', ok: canon.ok !== false, message: canon.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase21-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const scan = {
    report: report || { scorecard: score, findings: [] },
    ok: true,
    hardFailCount: 0,
    paths: { outDir },
  };
  const p9 = await advancePhase9(profile, {
    outDir,
    scan,
    actions: [
      { id: 'phase21-advance', ok: true, message: presence.message, data: payload },
      { id: 'unlock-readiness', ...unlock },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase21-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '21'),
    {
      id: '21',
      name: 'Phase 21 Presence Sentinel',
      file: 'phase21-ops.html',
      kind: 'html',
      ready: true,
      href: 'phase21-ops.html',
    },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  return {
    ok: p20.ok !== false && presence.ok !== false,
    status: 'ok',
    message: `Phase 21 presence · ${sealed ? 'SEALED' : strength} · debt ${debt.data?.debtScore ?? '—'} · score ${score.overall ?? '—'}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase21-ops.html'),
        md: resolve(outDir, 'phase21-advance.md'),
        presence: resolve(outDir, 'presence-sentinel.json'),
        seal: sealed ? resolve(outDir, 'presence-seal.json') : null,
        guide: canon.data?.paths?.guide,
      },
    },
    findings: [
      {
        code: sealed ? 'PHASE21_PRESENCE_SEALED' : 'PHASE21_PRESENCE_WATCH',
        severity: 'low',
        title: sealed ? 'GBP presence sealed — zero human debt' : 'Presence sentinel watching for GBP',
        remediation: sealed
          ? 'Keep npm run meridian:observe on cron.'
          : 'Verify GBP once, then npm run meridian:ack-gbp — or set MERIDIAN_GBP_PLACE_ID / Places API.',
        owner: sealed ? 'developer' : 'you',
        pillar: 'local',
      },
    ],
  };
}
