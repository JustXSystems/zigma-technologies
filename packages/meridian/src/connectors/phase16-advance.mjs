import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { fetchManual, meta } from '../lib/html.mjs';
import { loadGbpPulse } from './gbp-pulse.mjs';
import { draftMeta, applyMeta } from './meta-automation.mjs';
import { auditNap } from './nap-audit.mjs';
import { writeMonthlyDigest } from './monthly-digest.mjs';
import { writeWeeklyDigest } from './weekly-digest.mjs';
import { writeQuarterlyDigest } from './quarterly-digest.mjs';
import { writeOpsCockpit } from './ops-cockpit.mjs';
import { advancePhase15 } from './phase15-advance.mjs';
import { assessUnlockReadiness } from './unlock-readiness.mjs';
import { runMeridian } from '../orchestrator.mjs';
import { dbReady } from '../lib/db-ready.mjs';

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

async function probeLiveSameAs(origin) {
  const res = await fetchManual(`${origin}/`, { forceBody: true });
  const body = res.body || '';
  let urls = [];
  try {
    const blocks = [...body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const b of blocks) {
      try {
        const data = JSON.parse(b[1]);
        const nodes = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
        for (const n of nodes) {
          if (!n) continue;
          const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
          if (types.some((t) => /Organization|LocalBusiness/i.test(String(t || '')))) {
            const sa = n.sameAs;
            if (Array.isArray(sa)) urls = sa.map(String);
            else if (sa) urls = [String(sa)];
          }
        }
      } catch {
        /* next */
      }
    }
  } catch {
    /* ignore */
  }
  return { status: res.status, robots: meta(body, 'robots'), hasSameAs: urls.length > 0, urls };
}

function runNode(scriptArgs) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, scriptArgs, {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }));
    child.on('error', (e) => resolvePromise({ code: 1, stdout: '', stderr: String(e.message || e) }));
  });
}

/**
 * Phase 16 — Autonomous continuum: score apex, GBP pulse ingest, authority evidence,
 * quarterly autoclose, Phase 15 fleet refresh. Terminal forever-ops layer.
 */
export async function advancePhase16(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  // 1) Live sameAs probe + NAP refresh
  let live = { hasSameAs: false, urls: [] };
  try {
    live = await probeLiveSameAs(origin);
  } catch (e) {
    live = { hasSameAs: false, urls: [], error: String(e.message || e) };
  }
  steps.push({
    id: 'live-sameas',
    ok: live.hasSameAs,
    message: live.hasSameAs ? `Live sameAs ${live.urls.length}` : 'Live sameAs missing',
  });

  const nap = await auditNap(profile, { outDir });
  steps.push({ id: 'nap', ok: nap.ok !== false, message: nap.message });

  // 2) Authority evidence for score.mjs
  const cites = await readJson(resolve(outDir, 'citations-playbook.json'));
  const outreach = await readJson(resolve(outDir, 'backlink-outreach.json'));
  const phase8 = await readJson(resolve(outDir, 'phase8-advance.json'));
  const outreachDrafts =
    outreach?.drafts?.length ||
    outreach?.count ||
    outreach?.unsent ||
    phase8?.outreachDrafts ||
    phase8?.drafts ||
    0;
  const evidence = {
    generatedAt: new Date().toISOString(),
    sameAsLive: !!live.hasSameAs || (nap.data?.sameAsCount || 0) > 0,
    sameAsUrls: live.urls || [],
    citationsReady: !!(cites && (cites.rows?.length || cites.count || cites.directories)),
    outreachDrafts: Number(outreachDrafts) || 0,
    authorityBonus: 0,
  };
  await writeFile(resolve(outDir, 'authority-evidence.json'), JSON.stringify(evidence, null, 2), 'utf8');
  steps.push({
    id: 'authority-evidence',
    ok: true,
    message: `sameAs=${evidence.sameAsLive} · citations=${evidence.citationsReady} · outreach=${evidence.outreachDrafts}`,
  });

  // 3) CMS meta gap chase (DB hosts only)
  let metaChase = { ok: true, status: 'skipped', message: 'meta chase skipped', data: { count: 0 } };
  if (dbReady() && opts.skipMeta !== true) {
    const draftOut = resolve(outDir, 'meta-drafts.json');
    const drafted = await draftMeta(profile, { outFile: draftOut });
    if ((drafted.data?.count || 0) > 0 && opts.apply !== false) {
      const applied = await applyMeta(profile, { apply: true, file: draftOut });
      metaChase = {
        ok: applied.ok !== false,
        status: 'ok',
        message: `Meta chase · drafted ${drafted.data.count} · ${applied.message}`,
        data: { drafted: drafted.data?.count, apply: applied.data },
      };
    } else {
      metaChase = {
        ok: true,
        status: 'ok',
        message: drafted.message || 'No CMS meta gaps',
        data: { count: drafted.data?.count || 0 },
      };
    }
  } else if (!dbReady()) {
    metaChase = { ok: true, status: 'skipped', message: 'Meta chase skipped — no DB', data: { count: 0 } };
  }
  steps.push({ id: 'meta-chase', ok: metaChase.ok !== false, message: metaChase.message });

  // 4) GBP pulse (env or gbp-pulse.json)
  const gbp = await loadGbpPulse(profile, { outDir });
  steps.push({ id: 'gbp-pulse', ok: true, message: gbp.message });

  // 5) Fresh Meridian scan (score apex with evidence)
  let scan = opts.scan || null;
  if (opts.skipScan !== true) {
    scan = await runMeridian(profile, { outDir });
    steps.push({
      id: 'rescan',
      ok: scan.ok !== false,
      message: `Rescan score ${scan.report?.scorecard?.overall ?? '—'} (${scan.report?.scorecard?.grade ?? '—'})`,
    });
  } else {
    scan = {
      report: (await readJson(resolve(outDir, 'report-latest.json'))) || { scorecard: {}, findings: [] },
      ok: true,
      hardFailCount: 0,
      paths: { outDir },
    };
    steps.push({ id: 'rescan', ok: true, message: 'Rescan skipped — using report-latest' });
  }

  const unlock = await assessUnlockReadiness(profile, { outDir });
  steps.push({ id: 'unlock', ok: true, message: unlock.message });

  // 6) Digests with GBP ingest + quarterly autoclose
  const weekly = await writeWeeklyDigest(profile, { scan, actions: steps.map((s) => ({ id: s.id, ...s })), outDir });
  const monthly = await writeMonthlyDigest(profile, {
    scan,
    actions: [],
    outDir,
    gbpPulse: gbp.data,
  });
  const quarterly = await writeQuarterlyDigest(profile, {
    outDir,
    scan,
    actions: [
      { id: 'sitemap-health', ok: true, data: await readJson(resolve(outDir, 'sitemap-health.json')) },
      { id: 'unlock-readiness', ...unlock },
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

  // 7) Fleet refresh (no nested phase14 heal storm unless asked)
  let p15 = { ok: true, message: 'phase15 skipped', data: {} };
  if (opts.skipPhase15 !== true) {
    p15 = await advancePhase15(profile, {
      outDir,
      scan,
      apply: false,
      skipHeal: true,
      skipPhase14: opts.skipPhase14 !== false, // default skip nested 14 for speed
      skipPhase9: true, // refresh phase9 below after continuum html exists
      syncGh: opts.syncGh === true || process.env.MERIDIAN_SYNC_GH_SECRETS === '1',
      dispatch: false,
    });
    steps.push({ id: 'phase15', ok: p15.ok !== false, message: p15.message });
  }

  const score = scan.report?.scorecard || {};
  const qTasks = quarterly.data?.tasks || (await readJson(resolve(outDir, 'quarterly-digest.json')))?.tasks || [];
  const qOk = qTasks.filter((t) => t.status === 'ok').length;
  const qTodo = qTasks.filter((t) => t.status === 'todo').length;

  const continuum = {
    generatedAt: new Date().toISOString(),
    phase: '16',
    origin,
    score: { overall: score.overall, grade: score.grade, pillars: score.pillars },
    unlockPercent: unlock.data?.percent ?? null,
    sameAsLive: evidence.sameAsLive,
    gbpComplete: !!gbp.data?.complete,
    monthlyFilled: monthly.data?.filledAuto,
    monthlyFillable: monthly.data?.fillable,
    monthlyManual: monthly.data?.alwaysManual?.length ?? 0,
    quarterly: { ok: qOk, todo: qTodo, total: qTasks.length },
    fleetPercent: p15.data?.fleetPercent ?? null,
    apex: (score.overall ?? 0) >= 99 && (unlock.data?.percent ?? 0) >= 100,
    humanLeft: [
      ...(!gbp.data?.complete
        ? [
            {
              id: 'gbp-pulse',
              label: 'Optional: paste GBP Insights into gbp-pulse.json (once/month)',
              howTo: 'Open gbp-pulse.md · or set MERIDIAN_GBP_CALLS / _CLICKS / _DIRECTIONS',
            },
          ]
        : []),
      ...(qTodo > 0
        ? qTasks
            .filter((t) => t.status === 'todo')
            .slice(0, 3)
            .map((t) => ({ id: t.id, label: t.task, howTo: t.note || t.auto || '—' }))
        : []),
    ],
  };

  // Stub then final HTML so Phase 9 counts pack 16
  await writeFile(
    resolve(outDir, 'phase16-ops.html'),
    '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Phase 16</title></head><body><p>Phase 16 writing…</p></body></html>',
    'utf8'
  );

  const pillarRows = Object.entries(score.pillars || {})
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td class="${v >= 95 ? 'ok' : v >= 85 ? '' : 'warn'}">${esc(v)}</td></tr>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 16 Autonomous Continuum — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#03060a;--card:#0a1018;--line:#243041;--text:#e8eef5;--muted:#8b9aab;--accent:#34d399;--ok:#3dd68c;--warn:#e6b84d;--bad:#f07178}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(1000px 520px at 85% -10%,#0d3d2e,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:980px;margin:0 auto}h1{margin:0 0 .25rem;font-size:1.55rem;letter-spacing:-.02em}.sub{color:var(--muted);margin:0 0 1.2rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.25rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1rem;margin-bottom:.75rem}
a.primary{display:inline-block;margin:.2rem .35rem .2rem 0;padding:.5rem .85rem;border-radius:8px;background:var(--accent);color:#042018;font-weight:650;text-decoration:none;font-size:.84rem}
.ok{color:var(--ok)}.warn{color:var(--warn)}.bad{color:var(--bad)}ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
table{width:100%;border-collapse:collapse;font-size:.84rem}td,th{padding:.4rem .3rem;border-bottom:1px solid var(--line);text-align:left}
.banner{border:1px solid #1f5c45;background:linear-gradient(90deg,#0a281c,#0a1018);border-radius:12px;padding:1rem 1.1rem;margin-bottom:1rem}
</style></head><body><div class="wrap">
${
  continuum.apex
    ? `<div class="banner"><strong class="ok">CONTINUUM APEX</strong> — score ${esc(score.overall)} · unlock 100% · autonomous ops engaged. Keep Monday cron.</div>`
    : `<div class="banner"><strong>Continuum active</strong> — chasing score apex · GBP ${continuum.gbpComplete ? 'pulsed' : 'template ready'} · fleet ${esc(continuum.fleetPercent ?? '—')}%</div>`
}
<h1>Phase 16 — Autonomous continuum</h1>
<p class="sub">${esc(origin)} · score apex · GBP pulse · authority evidence · quarterly autoclose · forever ops</p>
<div class="hero">
  <div class="metric"><span class="sub">Score</span><b class="${(score.overall ?? 0) >= 99 ? 'ok' : ''}">${esc(score.overall ?? '—')} ${esc(score.grade || '')}</b></div>
  <div class="metric"><span class="sub">Unlock</span><b class="ok">${esc(unlock.data?.percent ?? '—')}%</b></div>
  <div class="metric"><span class="sub">sameAs</span><b class="${evidence.sameAsLive ? 'ok' : 'warn'}">${evidence.sameAsLive ? 'LIVE' : '—'}</b></div>
  <div class="metric"><span class="sub">Monthly</span><b>${esc(monthly.data?.filledAuto ?? '—')}/${esc((monthly.data?.fillable ?? 0) + (monthly.data?.alwaysManual?.length ?? 0))}</b></div>
  <div class="metric"><span class="sub">GBP pulse</span><b class="${continuum.gbpComplete ? 'ok' : 'warn'}">${continuum.gbpComplete ? 'ON' : 'TMPL'}</b></div>
  <div class="metric"><span class="sub">Fleet</span><b>${esc(continuum.fleetPercent ?? '—')}%</b></div>
</div>
<div class="card">
  <a class="primary" href="phase15-ops.html">Phase 15 fleet</a>
  <a class="primary" href="phase14-ops.html">Phase 14</a>
  <a class="primary" href="phase9-ops.html">Phase 9</a>
  <a class="primary" href="gbp-pulse.md">GBP pulse</a>
  <a class="primary" href="authority-evidence.json">Authority evidence</a>
  <a class="primary" href="monthly-digest.md">Monthly</a>
  <a class="primary" href="${esc(origin)}/admin" target="_blank" rel="noreferrer">Admin</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Continuum steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Score pillars</h2>
  <table><thead><tr><th>Pillar</th><th>Score</th></tr></thead><tbody>${pillarRows}</tbody></table>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Human left (truly minimized)</h2>
  <ul>
  ${
    continuum.humanLeft.length
      ? continuum.humanLeft.map((h) => `<li><strong>${esc(h.label)}</strong> — ${esc(h.howTo)}</li>`).join('')
      : '<li class="ok">Nothing blocking — optional GBP Insights paste once per month.</li>'
  }
  <li>Forever: <code>npm run meridian:act:phase16</code> + GitHub Monday cron</li>
  </ul>
</div>
</div></body></html>`;

  const payload = { ...continuum, steps, evidence, digests: { weekly: weekly.message, monthly: monthly.message, quarterly: quarterly.message, cockpit: cockpit.message, phase15: p15.message } };

  const md = [
    `# Phase 16 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `- Score **${score.overall ?? '—'}** (${score.grade ?? '—'}) · Unlock **${unlock.data?.percent ?? '—'}%** · Apex ${continuum.apex ? 'YES' : 'chasing'}`,
    `- sameAs ${evidence.sameAsLive ? 'live' : 'check'} · GBP pulse ${continuum.gbpComplete ? 'complete' : 'template'}`,
    `- Monthly ${monthly.data?.filledAuto}/${monthly.data?.fillable} auto · ${monthly.data?.alwaysManual?.length ?? 0} manual`,
    `- Quarterly ${qOk} ok · ${qTodo} todo`,
    `- ${metaChase.message}`,
    '',
    'Open **`phase16-ops.html`** — autonomous continuum.',
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'continuum-ops.json'), JSON.stringify(continuum, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase16-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase16-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase16-ops.html'), html, 'utf8');

  // Phase 9 with all packs including 16
  const { advancePhase9 } = await import('./phase9-advance.mjs');
  const p9 = await advancePhase9(profile, {
    outDir,
    scan,
    actions: [
      { id: 'phase16-advance', ok: true, message: `Phase 16 continuum · score ${score.overall}`, data: payload },
      { id: 'unlock-readiness', ...unlock },
    ],
    skipForm: true,
  });
  steps.push({ id: 'phase9', ok: p9.ok !== false, message: p9.message });
  payload.steps = steps;
  payload.digests.phase9 = p9.message;
  await writeFile(resolve(outDir, 'phase16-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '16'),
    { id: '16', name: 'Phase 16 Continuum', file: 'phase16-ops.html', kind: 'html', ready: true, href: 'phase16-ops.html' },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  if (!(await fileExists(resolve(outDir, 'phase16-ops.html')))) {
    /* written */
  }

  // Optional: seed outreach mailto batch quietly (no send)
  if (opts.seedOutreach === true) {
    await runNode(['scripts/meridian-backlink-outreach.mjs', '--json']).catch(() => null);
  }

  return {
    ok: true,
    status: continuum.apex ? 'ok' : 'degraded',
    message: `Phase 16 continuum · score ${score.overall ?? '—'} ${score.grade || ''} · GBP ${continuum.gbpComplete ? 'on' : 'tmpl'} · apex ${continuum.apex ? 'yes' : 'chase'}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase16-ops.html'),
        md: resolve(outDir, 'phase16-advance.md'),
        continuum: resolve(outDir, 'continuum-ops.json'),
        gbp: resolve(outDir, 'gbp-pulse.json'),
      },
    },
    findings: [
      {
        code: 'PHASE16_CONTINUUM',
        severity: 'low',
        title: continuum.apex
          ? 'Phase 16 continuum apex — autonomous ops'
          : `Phase 16 continuum · score ${score.overall ?? '—'}`,
        remediation: continuum.gbpComplete
          ? 'Keep Monday autopilot; open phase16-ops.html.'
          : 'Optional: paste GBP Insights into gbp-pulse.json once/month (gbp-pulse.md).',
        owner: 'developer',
        pillar: 'ops',
      },
    ],
  };
}
