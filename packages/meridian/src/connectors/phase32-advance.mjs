import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { advancePhase31 } from './phase31-advance.mjs';
import { runCatalogSteward } from './catalog-steward.mjs';
import { syncSeoGuideCanon } from './canon-sync.mjs';
import { syncAppendixLedger } from './ledger-sync.mjs';
import { assessHumanDebt } from './human-debt.mjs';

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
 * Phase 32 — Catalog Continuum.
 * Silent steward + Inventory / Media / Products / Services / Projects auto-heal every observe.
 */
export async function advancePhase32(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const steps = [];

  // Prefer a single fleet heal: either here (observe) or earlier in autopilot.
  const catalogAlready =
    opts.skipCatalog === true || opts.skipCatalogSteward === true
      ? await readJson(resolve(outDir, 'catalog-continuum.json'))
      : null;

  let catalog = catalogAlready
    ? {
        ok: true,
        status: catalogAlready.continuumNominal ? 'nominal' : 'alert',
        message: catalogAlready.boardLine || 'Catalog continuum (cached this cycle)',
        data: catalogAlready,
        findings: [],
      }
    : null;

  if (!catalog) {
    catalog = await runCatalogSteward(profile, {
      outDir,
      apply: opts.apply !== false,
      force: opts.forceCatalog === true,
      skipProbe: opts.skipCatalogProbe === true,
      skipIndex: opts.skipIndex === true,
    });
    steps.push({ id: 'catalog-steward', ok: catalog.ok !== false, message: catalog.message });
  } else {
    steps.push({ id: 'catalog-steward', ok: true, message: catalog.message, status: 'cached' });
  }

  let p31 = { ok: true, message: 'phase31 skipped', data: {} };
  if (opts.skipSteward !== true && opts.skipPhase31 !== true) {
    p31 = await advancePhase31(profile, {
      outDir,
      apply: opts.apply !== false,
      syncGh: opts.syncGh === true,
      skipHeal: opts.skipHeal === true,
      skipLatticeHeal: opts.skipLatticeHeal === true,
      skipLattice: opts.skipLattice === true,
      skipContinuity: opts.skipContinuity === true,
      skipChronos: opts.skipChronos === true,
      skipDominion: opts.skipDominion === true,
      skipObserve: opts.skipObserve === true,
      skipDesk: opts.skipDesk === true,
      skipPresence: opts.skipPresence === true,
      skipThrone: opts.skipThrone === true,
      skipHorizon: opts.skipHorizon === true,
      skipCourier: opts.skipCourier === true,
      skipForge: opts.skipForge === true,
      skipHotpatch: opts.skipHotpatch === true,
      skipCloser: opts.skipCloser === true,
      skipIndex: opts.skipIndex === true,
      skipYield: opts.skipYield === true,
      skipSitemap: opts.skipSitemap === true,
      skipDeploy: opts.skipDeploy !== false,
      triggerDeploy: opts.triggerDeploy === true,
      ack: opts.ack === true,
      parkGbp: opts.parkGbp !== false,
      gscProxy: opts.gscProxy !== false,
      // Avoid second fleet heal inside silent steward
      skipCatalogSteward: true,
      skipCatalogProbe: true,
    });
    steps.push({ id: 'phase31', ok: p31.ok !== false, message: p31.message });
  }

  const steward = await readJson(resolve(outDir, 'silent-steward.json'));
  const dominion = await readJson(resolve(outDir, 'dominion-apex.json'));
  const continuum = catalog.data || {};
  const nominal = continuum.continuumNominal !== false && (steward?.stewardNominal !== false || opts.skipSteward === true);
  const debt = await assessHumanDebt(profile, { outDir, parkGbp: true });

  const ship = {
    generatedAt: new Date().toISOString(),
    phase: '32',
    origin,
    continuumNominal: !!continuum.continuumNominal,
    stewardNominal: !!steward?.stewardNominal,
    scanned: continuum.scanned ?? 0,
    stats: continuum.stats || {},
    dominionCrowned: !!dominion?.dominionCrowned,
    boardLine: continuum.boardLine || catalog.message,
  };
  await writeFile(resolve(outDir, 'catalog-ship.json'), JSON.stringify(ship, null, 2), 'utf8');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 32 Catalog Continuum — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#02060a;--card:#0a1218;--line:#1c2a36;--text:#e8eef8;--muted:#8799ad;--accent:#38bdf8;--ok:#2fd67b;--warn:#e6b84d}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(1000px 520px at 20% -10%,#0c1e28,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:1040px;margin:0 auto}h1{margin:0 0 .2rem;font-size:1.6rem;letter-spacing:-.03em}.sub{color:var(--muted);margin:0 0 1rem}
.banner{border:1px solid ${nominal ? '#1a3040' : '#5a4830'};background:linear-gradient(105deg,${nominal ? '#0c1c28' : '#2a2010'},#0a1218 55%);border-radius:14px;padding:1.1rem 1.25rem;margin-bottom:1.1rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.2rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.05rem 1.15rem;margin-bottom:.85rem}
.btn{display:inline-block;margin:.2rem .3rem .2rem 0;padding:.48rem .8rem;border-radius:8px;border:1px solid var(--line);background:#122030;color:var(--text);font-weight:600;text-decoration:none;font-size:.82rem}
.btn.primary{background:var(--accent);color:#042014;border:0}
.ok{color:var(--ok)}.warn{color:var(--warn)}code{font-size:.78rem;background:#122030;padding:.1rem .35rem;border-radius:4px}
ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
</style></head><body><div class="wrap">
<div class="banner">
  <strong class="${nominal ? 'ok' : 'warn'}">${nominal ? 'CATALOG CONTINUUM NOMINAL' : 'CATALOG CONTINUUM ALERT'}</strong>
  <p class="sub" style="margin:.35rem 0 0">${esc(ship.boardLine)}</p>
</div>
<h1>Phase 32 — Catalog Continuum</h1>
<p class="sub">${esc(origin)} · Inventory · Media · Products · Services · Projects · Pages · Blog · Press · zero ritual</p>
<div class="hero">
  <div class="metric"><span class="sub">Continuum</span><b class="${ship.continuumNominal ? 'ok' : 'warn'}">${ship.continuumNominal ? 'NOMINAL' : 'ALERT'}</b></div>
  <div class="metric"><span class="sub">Scanned</span><b>${esc(ship.scanned)}</b></div>
  <div class="metric"><span class="sub">Meta heals</span><b>${esc(ship.stats.healedMeta ?? 0)}</b></div>
  <div class="metric"><span class="sub">Alt / OG</span><b>${esc((ship.stats.healedAlt ?? 0) + (ship.stats.healedOg ?? 0))}</b></div>
  <div class="metric"><span class="sub">Manual kept</span><b>${esc(ship.stats.preservedManual ?? 0)}</b></div>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Auto on every observe / autopilot / Inventory save</h2>
  <ul>
    <li>Empty meta drafted for catalog + CMS pages + blog + press</li>
    <li>Meridian-owned meta refreshed on content drift · duplicates auto-uniquified</li>
    <li>Admin SEO marked <code>manual</code> — never overwritten</li>
    <li>Unpublish/delete → hub 301 + <code>seo_url_queue</code> + GSC inspect</li>
    <li>Sitemap images · Product SKU/Offer · case-study VideoObject</li>
  </ul>
  <code>npm run meridian:observe</code>
</div>
<div class="card">
  <a class="btn primary" href="catalog-continuum.md">Continuum brief</a>
  <a class="btn" href="catalog-steward.md">Heal log</a>
  <a class="btn" href="phase31-ops.html">Silent steward</a>
  <a class="btn" href="phase30-ops.html">Dominion</a>
  <a class="btn" href="SEO-GUIDE.md">SEO-GUIDE.md</a>
</div>
<div class="card">
  <h2 style="margin:0 0 .5rem;font-size:.95rem">Steps</h2>
  <ul>${steps.map((s) => `<li class="${s.ok ? 'ok' : 'warn'}">${esc(s.id)} — ${esc(s.message)}</li>`).join('')}</ul>
</div>
</div></body></html>`;

  const payload = {
    generatedAt: ship.generatedAt,
    phase: '32',
    origin,
    ship,
    catalog: continuum,
    humanDebt: debt.data,
    steps,
  };

  await writeFile(resolve(outDir, 'phase32-ops.html'), html, 'utf8');
  await writeFile(resolve(outDir, 'phase32-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(
    resolve(outDir, 'phase32-advance.md'),
    [
      `# Phase 32 advance — ${profile.displayName || profile.id}`,
      '',
      `Generated: ${payload.generatedAt}`,
      '',
      `- Catalog continuum **${ship.continuumNominal ? 'NOMINAL' : 'ALERT'}** · scanned **${ship.scanned}**`,
      `- ${p31.message}`,
      '',
      ship.boardLine,
      '',
      'Open **`phase32-ops.html`**. Forever: **`npm run meridian:observe`**.',
      '',
    ].join('\n'),
    'utf8'
  );

  const ledger = await syncAppendixLedger(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'ledger', ok: ledger.ok !== false, message: ledger.message });
  const canon = await syncSeoGuideCanon(profile, { outDir, root: process.cwd() });
  steps.push({ id: 'canon', ok: canon.ok !== false, message: canon.message });
  payload.steps = steps;
  await writeFile(resolve(outDir, 'phase32-advance.json'), JSON.stringify(payload, null, 2), 'utf8');

  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const matrix = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '32' && m.id !== '31'),
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
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix }, null, 2), 'utf8');

  return {
    ok: p31.ok !== false && catalog.ok !== false,
    status: nominal ? 'ok' : 'pending',
    message: `Phase 32 catalog · ${ship.continuumNominal ? 'NOMINAL' : 'alert'} · scanned ${ship.scanned} · heals meta=${ship.stats.healedMeta ?? 0}`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase32-ops.html'),
        md: resolve(outDir, 'phase32-advance.md'),
        continuum: resolve(outDir, 'catalog-continuum.json'),
        guide: canon.data?.paths?.guide,
      },
    },
    findings: [
      ...(catalog.findings || []),
      {
        code: ship.continuumNominal ? 'PHASE32_CATALOG_NOMINAL' : 'PHASE32_CATALOG_ALERT',
        severity: ship.continuumNominal ? 'low' : 'medium',
        title: ship.continuumNominal ? 'Catalog continuum nominal' : 'Catalog continuum alert',
        remediation: 'Keep npm run meridian:observe — Inventory saves auto-heal.',
        owner: 'developer',
        pillar: 'onpage',
      },
    ],
  };
}
