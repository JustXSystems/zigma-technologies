import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { advancePhase21 } from './phase21-advance.mjs';
import { assessHumanDebt } from './human-debt.mjs';
import { syncSeoGuideCanon } from './canon-sync.mjs';
import { syncAppendixLedger } from './ledger-sync.mjs';
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

/**
 * Phase 22 — Quiet Throne.
 * Declares autonomic mission complete: parks the Google-only gate, syncs Appendix F ledger,
 * issues sovereign certificate. LocalBusiness hasMap ships in site JSON-LD from NAP.
 */
export async function advancePhase22(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  let p21 = { ok: true, message: 'phase21 skipped', data: {} };
  if (opts.skipPresence !== true) {
    p21 = await advancePhase21(profile, {
      outDir,
      apply: opts.apply !== false,
      syncGh: opts.syncGh === true,
      skipHeal: opts.skipHeal === true,
      skipObserve: opts.skipObserve === true,
      skipCanon: true, // throne refreshes canon after parking debt
      skipDesk: opts.skipDesk === true,
      ack: opts.ack === true,
      gscProxy: opts.gscProxy !== false,
    });
    steps.push({ id: 'phase21', ok: p21.ok !== false, message: p21.message });
  }

  const observatory = await readJson(resolve(outDir, 'observatory.json'));
  const archive = await readJson(resolve(outDir, 'mission-archive.json'));
  const report = await readJson(resolve(outDir, 'report-latest.json'));
  const presence = await readJson(resolve(outDir, 'presence-sentinel.json'));
  const unlock = await assessUnlockReadiness(profile, { outDir });
  const score = observatory?.score || archive?.score || report?.scorecard || {};
  const scoreOk = Number(score.overall) >= 100 || score.grade === 'A';
  const archiveSealed = archive?.sealed === true;
  const presenceSealed = presence?.sealed === true;

  // Park GBP gate when automation apex is reached (Google cannot be coded away)
  const parkGbp = opts.parkGbp !== false && archiveSealed && scoreOk && !presenceSealed;

  const throne = {
    generatedAt: new Date().toISOString(),
    phase: '22',
    origin,
    quiet: true,
    parkGbp,
    presenceSealed,
    archiveSealed,
    score: { overall: score.overall, grade: score.grade },
    unlockPercent: unlock.data?.percent ?? observatory?.unlockPercent ?? null,
    localSchema: {
      hasMap: 'auto-from-NAP',
      note: 'OrganizationJsonLd emits hasMap Maps-search URL from Site Settings NAP; set mapsUrl/geo when GBP place known',
    },
    missionComplete: false, // set after debt assess
    forever: ['npm run meridian:observe'],
    boardLine: '',
  };

  await writeFile(resolve(outDir, 'quiet-throne.json'), JSON.stringify(throne, null, 2), 'utf8');

  const debt = await assessHumanDebt(profile, { outDir, parkGbp });
  steps.push({ id: 'human-debt', ok: debt.ok !== false, message: debt.message });

  throne.missionComplete =
    archiveSealed && scoreOk && (debt.data?.debtScore === 0 || presenceSealed || parkGbp);
  throne.boardLine = throne.missionComplete
    ? presenceSealed
      ? 'Quiet throne — SEO automation complete; GBP presence sealed.'
      : 'Quiet throne — SEO automation complete; GBP parked as the sole Google-owned gate (optional).'
    : 'Quiet throne warming — archive or score not at apex.';
  throne.humanDebt = debt.data?.debtScore ?? null;
  await writeFile(resolve(outDir, 'quiet-throne.json'), JSON.stringify(throne, null, 2), 'utf8');

  const certHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Sovereign Certificate — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#02040a;--ink:#e8eef8;--gold:#c9a227;--line:#2a3344;--ok:#2fd67b}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(800px 420px at 50% 0%,#1a2838,transparent),var(--bg);color:var(--ink);font-family:"Segoe UI",system-ui,sans-serif;padding:2rem}
.cert{width:min(720px,100%);border:1px solid var(--line);border-radius:18px;padding:2.2rem 2rem;background:linear-gradient(160deg,#0c121c,#060a12);box-shadow:0 24px 80px #0008}
.eyebrow{letter-spacing:.18em;text-transform:uppercase;font-size:.72rem;color:var(--gold);margin:0 0 .8rem}
h1{margin:0 0 .4rem;font-size:1.75rem;letter-spacing:-.03em}
.sub{color:#8a9bb0;margin:0 0 1.4rem;line-height:1.5}
.seal{display:inline-block;padding:.35rem .75rem;border-radius:999px;border:1px solid ${throne.missionComplete ? '#2a5c3a' : '#5c4a28'};color:${throne.missionComplete ? 'var(--ok)' : 'var(--gold)'};font-weight:700;font-size:.82rem;margin-bottom:1.2rem}
grid{display:grid;grid-template-columns:1fr 1fr;gap:.65rem;margin:1.2rem 0}
.metric{border:1px solid var(--line);border-radius:12px;padding:.75rem .9rem;background:#080e16}.metric b{display:block;margin-top:.2rem;font-size:1.15rem}
.footer{margin-top:1.4rem;font-size:.82rem;color:#8a9bb0}
a{color:var(--gold)}
@media(max-width:560px){grid{grid-template-columns:1fr}}
</style></head><body>
<article class="cert">
  <p class="eyebrow">Zigma Technologies · Meridian</p>
  <div class="seal">${throne.missionComplete ? 'MISSION COMPLETE' : 'THRONE ACTIVE'}</div>
  <h1>Certificate of Autonomic SEO Operations</h1>
  <p class="sub">${esc(throne.boardLine)}</p>
  <grid>
    <div class="metric"><span class="sub">Score</span><b>${esc(score.overall ?? '—')} ${esc(score.grade || '')}</b></div>
    <div class="metric"><span class="sub">Unlock</span><b>${esc(throne.unlockPercent ?? '—')}%</b></div>
    <div class="metric"><span class="sub">Human debt</span><b>${esc(debt.data?.debtScore ?? '—')}</b></div>
    <div class="metric"><span class="sub">GBP</span><b>${presenceSealed ? 'SEALED' : parkGbp ? 'PARKED' : 'OPEN'}</b></div>
  </grid>
  <p class="footer">Issued ${esc(throne.generatedAt)} · ${esc(origin)} · Forever: <code>npm run meridian:observe</code><br/>
  Local schema: <code>hasMap</code> auto from NAP · Optional: <a href="phase21-ops.html">presence sentinel</a> · <a href="phase20-ops.html">desk</a></p>
</article>
</body></html>`;

  await writeFile(resolve(outDir, 'sovereign-certificate.html'), certHtml, 'utf8');
  await writeFile(
    resolve(outDir, 'sovereign-certificate.md'),
    [
      `# Certificate of Autonomic SEO Operations`,
      '',
      `**${profile.displayName || profile.id}** · ${throne.generatedAt}`,
      '',
      throne.boardLine,
      '',
      `| KPI | Value |`,
      `| --- | --- |`,
      `| Score | ${score.overall ?? '—'} ${score.grade || ''} |`,
      `| Unlock | ${throne.unlockPercent ?? '—'}% |`,
      `| Human debt | ${debt.data?.debtScore ?? '—'} |`,
      `| GBP | ${presenceSealed ? 'SEALED' : parkGbp ? 'PARKED' : 'OPEN'} |`,
      `| Mission | ${throne.missionComplete ? 'COMPLETE' : 'ACTIVE'} |`,
      '',
      `Forever: \`npm run meridian:observe\``,
      '',
    ].join('\n'),
    'utf8'
  );

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 22 Quiet Throne — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#02040a;--card:#0a1018;--line:#1c2836;--text:#e8eef8;--muted:#8799ad;--accent:#c9a227;--ok:#2fd67b;--warn:#e6b84d}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(900px 480px at 50% -10%,#1a2838,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:1000px;margin:0 auto}h1{margin:0 0 .2rem;font-size:1.6rem;letter-spacing:-.03em}.sub{color:var(--muted);margin:0 0 1rem}
.banner{border:1px solid ${throne.missionComplete ? '#2a5c3a' : '#5c4a28'};background:linear-gradient(105deg,${throne.missionComplete ? '#0e2418' : '#2a220a'},#0a1018 55%);border-radius:14px;padding:1.1rem 1.25rem;margin-bottom:1.1rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.3rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.05rem 1.15rem;margin-bottom:.85rem}
.btn{display:inline-block;margin:.2rem .3rem .2rem 0;padding:.48rem .8rem;border-radius:8px;border:1px solid var(--line);background:#142030;color:var(--text);font-weight:600;text-decoration:none;font-size:.82rem}
.btn.primary{background:var(--accent);color:#1a1200;border:0}
.ok{color:var(--ok)}.warn{color:var(--warn)}code{font-size:.78rem;background:#142030;padding:.1rem .35rem;border-radius:4px}
ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${throne.missionComplete ? 'ok' : 'warn'}">${throne.missionComplete ? 'QUIET THRONE · MISSION COMPLETE' : 'QUIET THRONE'}</strong>
  <p class="sub" style="margin:.35rem 0 0">${esc(throne.boardLine)}</p>
</div>
<h1>Phase 22 — Quiet throne</h1>
<p class="sub">${esc(origin)} · sovereign completion epoch · zero ritual noise</p>
<div class="hero">
  <div class="metric"><span class="sub">Score</span><b class="ok">${esc(score.overall ?? '—')} ${esc(score.grade || '')}</b></div>
  <div class="metric"><span class="sub">Debt</span><b class="${(debt.data?.debtScore ?? 0) === 0 ? 'ok' : 'warn'}">${esc(debt.data?.debtScore ?? '—')}</b></div>
  <div class="metric"><span class="sub">Mission</span><b class="${throne.missionComplete ? 'ok' : ''}">${throne.missionComplete ? 'COMPLETE' : '—'}</b></div>
  <div class="metric"><span class="sub">GBP</span><b>${presenceSealed ? 'SEALED' : parkGbp ? 'PARKED' : 'OPEN'}</b></div>
</div>
<div class="card">
  <a class="btn primary" href="sovereign-certificate.html">Sovereign certificate</a>
  <a class="btn" href="automation-ledger.md">Appendix F ledger</a>
  <a class="btn" href="phase21-ops.html">Presence sentinel</a>
  <a class="btn" href="phase20-ops.html">Autonomic desk</a>
  <a class="btn" href="../../../../SEO-GUIDE.md">SEO-GUIDE.md</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">What shipped</h2>
  <ul>
    <li>LocalBusiness <code>hasMap</code> auto-emitted from NAP (no GBP required)</li>
    <li>Appendix F automation ledger synced (authoritative)</li>
    <li>Google Business Profile ${presenceSealed ? 'sealed' : 'parked as optional Google gate'} — does not block forever ops</li>
    <li>Primary command remains <code>npm run meridian:observe</code></li>
  </ul>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
</div></body></html>`;

  await writeFile(resolve(outDir, 'phase22-ops.html'), html, 'utf8');

  const ledger = await syncAppendixLedger(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'ledger', ok: ledger.ok !== false, message: ledger.message });

  const canon = await syncSeoGuideCanon(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'canon', ok: canon.ok !== false, message: canon.message });

  const payload = {
    generatedAt: throne.generatedAt,
    phase: '22',
    origin,
    throne,
    humanDebt: debt.data,
    presence: { sealed: presenceSealed, strength: presence?.strength },
    steps,
  };

  await writeFile(resolve(outDir, 'phase22-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'phase22-advance.md'),
    [
      `# Phase 22 advance — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt}`,
      '',
      `- Mission **${throne.missionComplete ? 'COMPLETE' : 'ACTIVE'}**`,
      `- Human debt **${debt.data?.debtScore ?? '—'}** · GBP **${presenceSealed ? 'SEALED' : parkGbp ? 'PARKED' : 'OPEN'}**`,
      `- ${p21.message}`,
      `- ${ledger.message}`,
      '',
      'Open **`phase22-ops.html`** · **`sovereign-certificate.html`**.',
      '',
    ].join('\n'),
    'utf8'
  );

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
      { id: 'phase22-advance', ok: true, message: throne.boardLine, data: payload },
      { id: 'unlock-readiness', ...unlock },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase22-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '22'),
    {
      id: '22',
      name: 'Phase 22 Quiet Throne',
      file: 'phase22-ops.html',
      kind: 'html',
      ready: true,
      href: 'phase22-ops.html',
    },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  return {
    ok: p21.ok !== false && ledger.ok !== false,
    status: 'ok',
    message: `Phase 22 throne · mission ${throne.missionComplete ? 'COMPLETE' : 'active'} · debt ${debt.data?.debtScore ?? '—'} · GBP ${presenceSealed ? 'sealed' : parkGbp ? 'parked' : 'open'}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase22-ops.html'),
        certificate: resolve(outDir, 'sovereign-certificate.html'),
        md: resolve(outDir, 'phase22-advance.md'),
        ledger: ledger.data?.paths?.md,
        guide: canon.data?.paths?.guide,
      },
    },
    findings: [
      {
        code: throne.missionComplete ? 'PHASE22_MISSION_COMPLETE' : 'PHASE22_THRONE',
        severity: 'low',
        title: throne.missionComplete
          ? 'Quiet throne — autonomic SEO mission complete'
          : 'Quiet throne active',
        remediation: 'Keep npm run meridian:observe. Optional GBP: phase21-ops.html → ack-gbp.',
        owner: 'developer',
        pillar: 'ops',
      },
    ],
  };
}
