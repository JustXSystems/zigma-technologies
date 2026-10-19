import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Single HTML ops cockpit aggregating Meridian artefacts (Phase 9 maximum automation view).
 */
export async function writeOpsCockpit(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  const actions = opts.actions || [];
  const scan = opts.scan || null;

  const unlock = (await readJson(resolve(outDir, 'unlock-readiness.json'))) || opts.unlock || null;
  const closed = await readJson(resolve(outDir, 'closed-loop.json'));
  const health = await readJson(resolve(outDir, 'sitemap-health.json'));
  const nap = await readJson(resolve(outDir, 'nap-audit.json'));
  const city = await readJson(resolve(outDir, 'city-pages-readiness.json'));
  const citations = await readJson(resolve(outDir, 'citations-playbook.json'));
  const backlinks = await readJson(resolve(outDir, 'backlink-outreach.json'));
  const keywords = await readJson(resolve(outDir, 'keyword-map.json'));

  const score = scan?.report?.scorecard || opts.scorecard || {};
  const trend = scan?.report?.trend || null;

  const actionRows = actions.map((a) => ({
    id: a.id,
    ok: a.ok !== false || a.status === 'auth_required' || a.status === 'skipped' || a.status === 'degraded',
    status: a.status || (a.ok === false ? 'fail' : 'ok'),
    message: a.message || '',
  }));

  const artefacts = [
    { name: 'Phase 0 wizard', file: 'phase0-wizard.html' },
    { name: 'Weekly digest', file: 'weekly-digest.md' },
    { name: 'Monthly digest', file: 'monthly-digest.md' },
    { name: 'Quarterly digest', file: 'quarterly-digest.md' },
    { name: 'Unlock readiness', file: 'unlock-readiness.md' },
    { name: 'Indexing queue', file: 'indexing-queue.md' },
    { name: 'Meta polish', file: 'meta-polish.md' },
    { name: 'OG / share pack', file: 'og-share-pack.md' },
    { name: 'Locale decision', file: 'locale-decision.md' },
    { name: 'GBP / NAP checklist', file: 'gbp-checklist.md' },
    { name: 'Citations playbook', file: 'citations-playbook.md' },
    { name: 'Review kit', file: 'review-kit.md' },
    { name: 'City draft (staged)', file: 'city-draft.md' },
    { name: 'Rich Results pack', file: 'rich-results-pack.md' },
    { name: 'Top meta pack', file: 'top20-meta-pack.md' },
    { name: 'Content calendar', file: 'content-calendar.md' },
    { name: 'Speed baseline', file: 'speed-baseline.md' },
    { name: 'Phase 2 advance', file: 'phase2-advance.md' },
    { name: 'Phase 3 advance', file: 'phase3-advance.md' },
    { name: 'Phase 5 ops', file: 'phase5-ops.html' },
    { name: 'Phase 4 ops', file: 'phase4-ops.html' },
    { name: 'Phase 6 ops', file: 'phase6-ops.html' },
    { name: 'Phase 7 ops', file: 'phase7-ops.html' },
    { name: 'Phase 8 ops', file: 'phase8-ops.html' },
    { name: 'Phase 9 command center', file: 'phase9-ops.html' },
    { name: 'Phase 10 continuous', file: 'phase10-ops.html' },
    { name: 'Phase 11 convergence', file: 'phase11-ops.html' },
    { name: 'Phase 12 score lift', file: 'phase12-ops.html' },
    { name: 'Phase 13 autoclose', file: 'phase13-ops.html' },
    { name: 'Phase 14 perpetual', file: 'phase14-ops.html' },
    { name: 'Phase 15 sovereign fleet', file: 'phase15-ops.html' },
    { name: 'Phase 16 continuum', file: 'phase16-ops.html' },
    { name: 'Phase 17 mission archive', file: 'phase17-ops.html' },
    { name: 'Phase 18 observatory', file: 'phase18-ops.html' },
    { name: 'Phase 19 living canon', file: 'phase19-ops.html' },
    { name: 'Phase 20 autonomic desk', file: 'phase20-ops.html' },
    { name: 'Phase 21 presence sentinel', file: 'phase21-ops.html' },
    { name: 'Phase 22 quiet throne', file: 'phase22-ops.html' },
    { name: 'Phase 23 eternal horizon', file: 'phase23-ops.html' },
    { name: 'Phase 24 deploy courier', file: 'phase24-ops.html' },
    { name: 'Phase 25 growth closer', file: 'phase25-ops.html' },
    { name: 'Phase 26 conversion continuum', file: 'phase26-ops.html' },
    { name: 'Phase 27 integrity lattice', file: 'phase27-ops.html' },
    { name: 'Phase 28 sovereign continuity', file: 'phase28-ops.html' },
    { name: 'Phase 29 autonomic chronos', file: 'phase29-ops.html' },
    { name: 'Phase 30 dominion apex', file: 'phase30-ops.html' },
    { name: 'Phase 31 silent steward', file: 'phase31-ops.html' },
    { name: 'Phase 1 technical', file: 'phase1-ops.html' },
    { name: 'Sovereign certificate', file: 'sovereign-certificate.html' },
    { name: 'Live throne', file: 'live-throne.md' },
    { name: 'Deploy courier', file: 'deploy-courier.json' },
    { name: 'Growth radar', file: 'growth-radar.md' },
    { name: 'Growth closer', file: 'growth-closer.md' },
    { name: 'Signal forge', file: 'signal-forge.json' },
    { name: 'Conversion continuum', file: 'conversion-continuum.md' },
    { name: 'Yield apex', file: 'yield-apex.json' },
    { name: 'Integrity lattice', file: 'integrity-lattice.md' },
    { name: 'Sovereign continuity', file: 'sovereign-continuity.md' },
    { name: 'Autonomic chronos', file: 'autonomic-chronos.md' },
    { name: 'Dominion apex', file: 'dominion-apex.md' },
    { name: 'Silent steward', file: 'silent-steward.md' },
    { name: 'Perpetual seal', file: 'perpetual-seal.json' },
    { name: 'Presence sentinel', file: 'presence-sentinel.md' },
    { name: 'Automation ledger', file: 'automation-ledger.md' },
    { name: 'Executive brief', file: 'executive-brief.md' },
    { name: 'Human debt', file: 'human-debt.md' },
    { name: 'PreProd removals', file: 'preprod-removals.md' },
    { name: 'City pages readiness', file: 'city-pages-readiness.md' },
    { name: 'Backlink outreach', file: 'backlink-outreach.md' },
    { name: 'Keyword map', file: 'keyword-map.md' },
    { name: 'Content briefs', file: 'content-briefs.md' },
    { name: 'Closed-loop', file: 'closed-loop.json' },
  ];

  const payload = {
    generatedAt: new Date().toISOString(),
    profile: { id: profile.id, displayName: profile.displayName, origin: profile.origin },
    scorecard: { overall: score.overall, grade: score.grade, summary: score.summary },
    trend,
    unlockPercent: unlock?.percent ?? null,
    unlockGrade: unlock?.grade ?? null,
    nextUnlock: unlock?.nextUnlock || [],
    closedLoop: closed
      ? {
          orphanDelta: closed.delta?.orphanCount,
          heavyDelta: closed.delta?.heavyCount,
          thinDelta: closed.delta?.thinCount,
          message: closed.message,
        }
      : null,
    health: health
      ? {
          urls: health.checked ?? health.urls?.length,
          orphanCount: health.linkGraph?.orphanCount,
          thinCount: health.linkGraph?.thinCount,
        }
      : null,
    nap: nap ? { sameAsCount: nap.sameAsCount, missing: nap.missing } : null,
    city: city ? { ready: city.ready, blocked: city.blocked, checked: city.checked } : null,
    citations: citations ? { directories: citations.directories?.length } : null,
    backlinks: backlinks ? { count: backlinks.count } : null,
    keywords: keywords ? { count: keywords.count } : null,
    actions: actionRows,
    artefacts,
  };

  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<title>Meridian ops — ${esc(profile.displayName || profile.id)}</title>
<style>
  :root {
    --bg: #0f1419;
    --panel: #1a222c;
    --line: #2a3544;
    --text: #e8eef5;
    --muted: #8b9aab;
    --ok: #3dd68c;
    --warn: #f0b429;
    --bad: #f07178;
    --accent: #5b9fd4;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: "Segoe UI", system-ui, sans-serif;
    background: radial-gradient(1200px 600px at 10% -10%, #1a3048 0%, var(--bg) 55%);
    color: var(--text); line-height: 1.45; padding: 2rem 1.25rem 4rem;
  }
  .wrap { max-width: 960px; margin: 0 auto; }
  h1 { font-size: 1.65rem; font-weight: 650; letter-spacing: -0.02em; margin: 0 0 0.35rem; }
  .sub { color: var(--muted); font-size: 0.95rem; margin-bottom: 1.75rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
  .card {
    background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 1rem 1.1rem;
  }
  .card .label { color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; }
  .card .val { font-size: 1.55rem; font-weight: 700; margin-top: 0.2rem; }
  .ok { color: var(--ok); } .warn { color: var(--warn); } .bad { color: var(--bad); }
  h2 { font-size: 1.05rem; margin: 1.75rem 0 0.65rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  th, td { text-align: left; padding: 0.45rem 0.5rem; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { color: var(--muted); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
  ul.next { margin: 0; padding-left: 1.1rem; }
  ul.next li { margin: 0.35rem 0; }
  a { color: var(--accent); }
  .pill {
    display: inline-block; font-size: 0.7rem; font-weight: 600; padding: 0.12rem 0.45rem;
    border-radius: 4px; background: #243040; color: var(--muted);
  }
  .pill.ok { background: #1a3a2a; color: var(--ok); }
  .pill.auth { background: #3a3020; color: var(--warn); }
  .pill.fail { background: #3a2020; color: var(--bad); }
  footer { margin-top: 2rem; color: var(--muted); font-size: 0.8rem; }
</style>
</head>
<body>
<div class="wrap">
  <h1>${esc(profile.displayName || profile.id)} — Meridian ops</h1>
  <p class="sub">${esc(profile.origin)} · generated ${esc(payload.generatedAt)}</p>

  <div class="grid">
    <div class="card"><div class="label">Score</div><div class="val">${esc(score.overall ?? '—')} <span style="font-size:0.9rem;font-weight:500">${esc(score.grade ?? '')}</span></div></div>
    <div class="card"><div class="label">Unlock</div><div class="val ${payload.unlockPercent != null && payload.unlockPercent < 50 ? 'bad' : payload.unlockPercent != null && payload.unlockPercent < 80 ? 'warn' : 'ok'}">${payload.unlockPercent != null ? esc(payload.unlockPercent) + '%' : '—'}</div></div>
    <div class="card"><div class="label">Orphans</div><div class="val">${esc(payload.health?.orphanCount ?? '—')}</div></div>
    <div class="card"><div class="label">sameAs</div><div class="val">${esc(payload.nap?.sameAsCount ?? '—')}</div></div>
    <div class="card"><div class="label">Keywords</div><div class="val">${esc(payload.keywords?.count ?? '—')}</div></div>
    <div class="card"><div class="label">Outreach</div><div class="val">${esc(payload.backlinks?.count ?? '—')}</div></div>
  </div>

  ${
    trend
      ? `<p class="sub">Trend: ${esc(trend.message || trend.status)}</p>`
      : ''
  }

  <h2>Unlock next</h2>
  <ul class="next">
    ${(payload.nextUnlock || [])
      .map((n) => `<li><strong>${esc(n.label)}</strong> (+${esc(n.weight)}%) — ${esc(n.howTo)}</li>`)
      .join('') || '<li>All measured gates unlocked</li>'}
  </ul>

  <h2>Autopilot actions</h2>
  <table>
    <thead><tr><th>Action</th><th>Status</th><th>Message</th></tr></thead>
    <tbody>
      ${actionRows
        .map((a) => {
          const cls =
            a.status === 'auth_required' ? 'auth' : a.ok === false || a.status === 'fail' ? 'fail' : 'ok';
          return `<tr><td>${esc(a.id)}</td><td><span class="pill ${cls}">${esc(a.status)}</span></td><td>${esc(a.message)}</td></tr>`;
        })
        .join('')}
    </tbody>
  </table>

  <h2>Playbooks & digests</h2>
  <table>
    <thead><tr><th>Artefact</th><th>File</th></tr></thead>
    <tbody>
      ${artefacts.map((a) => `<tr><td>${esc(a.name)}</td><td><code>${esc(a.file)}</code></td></tr>`).join('')}
    </tbody>
  </table>

  <h2>Local / content snapshot</h2>
  <ul class="next">
    <li>Citations directories: ${esc(payload.citations?.directories ?? '—')} (see citations-playbook.md)</li>
    <li>City×service samples: ${esc(payload.city?.ready ?? '—')} ready · ${esc(payload.city?.blocked ?? '—')} noindex</li>
    <li>Closed-loop: ${esc(payload.closedLoop?.message || '—')}</li>
  </ul>

  <footer>Meridian M9 ops cockpit · files under storage/meridian/${esc(profile.id || 'site')}/ · noindex</footer>
</div>
</body>
</html>`;

  await mkdir(outDir, { recursive: true });
  const htmlPath = resolve(outDir, 'ops-cockpit.html');
  const jsonPath = resolve(outDir, 'ops-cockpit.json');
  await writeFile(htmlPath, html, 'utf8');
  await writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8');

  return {
    ok: true,
    status: 'ok',
    message: `Ops cockpit written · unlock ${payload.unlockPercent ?? '?'}%`,
    data: { ...payload, paths: { html: htmlPath, json: jsonPath } },
  };
}
