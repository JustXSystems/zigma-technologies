import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { scanImageWeight } from './image-weight.mjs';
import { optimizeHeavyImages } from './image-optimize.mjs';
import { writeSpeedBaseline } from './speed-baseline.mjs';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

async function probeOrigin(origin) {
  const url = `${origin}/`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'user-agent': 'MeridianSEO/phase4',
        'accept-encoding': 'gzip, br',
      },
    });
    const ttfbMs = Date.now() - started;
    return {
      ok: res.ok,
      status: res.status,
      ttfbMs,
      contentEncoding: res.headers.get('content-encoding') || '(none)',
      cacheControl: res.headers.get('cache-control') || '(none)',
      ttfbOk: ttfbMs < 800,
      encodingOk: /gzip|br|deflate/i.test(res.headers.get('content-encoding') || ''),
    };
  } catch (e) {
    return { ok: false, error: String(e.message || e), ttfbOk: false, encodingOk: false };
  }
}

/**
 * Phase 4 advance — image weight → WebP optimize → PSI lab baseline → TTFB probe + HTML ops.
 */
export async function advancePhase4(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');

  const wantOptimize =
    opts.skipImages !== true &&
    opts.optimize !== false &&
    (opts.apply === true ||
      process.env.MERIDIAN_AUTO_OPTIMIZE_IMAGES === '1' ||
      profile.autopilot?.autoOptimizeImages === true);

  let weight = { ok: true, message: 'image-weight skipped (already run)', data: { heavyCount: opts.heavyCount ?? 0 } };
  let optimize = { ok: true, message: 'optimize skipped', data: {} };
  if (opts.skipImages !== true) {
    weight = await scanImageWeight(profile, { outDir });
    if (wantOptimize) {
      optimize = await optimizeHeavyImages(profile, { outDir, apply: true });
    }
  }

  const runPsi =
    opts.runPsi === true ||
    process.env.MERIDIAN_AUTO_PSI === '1' ||
    profile.autopilot?.autoPsi === true ||
    !!(process.env.MERIDIAN_PSI_API_KEY || '').trim();

  const speed = await writeSpeedBaseline(profile, {
    outDir,
    skipApi: !runPsi,
  });

  const probe = await probeOrigin(origin);
  const pages = speed.data?.pages || [];
  const labPages = pages.filter((p) => p.lab);
  const weak = labPages.filter((p) => (p.lab?.performance ?? 100) < 70);
  const heavyCount = Number(weight.data?.heavyCount ?? weight.data?.heavy?.length ?? 0);

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '4',
    heavyCount,
    optimized: optimize.data?.optimized ?? optimize.data?.count ?? null,
    labChecked: labPages.length,
    weakPerf: weak.map((p) => ({ path: p.path, performance: p.lab.performance, lcp: p.lab.lcp })),
    probe,
    psiKeyPresent: !!speed.data?.psiKeyPresent,
  };

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 4 Speed Ops — ${esc(profile.displayName || profile.id)}</title>
<style>
body{font-family:Segoe UI,system-ui,sans-serif;background:#0c1117;color:#e8eef5;margin:0;padding:2rem 1.25rem}
.wrap{max-width:880px;margin:0 auto}
h1{font-size:1.45rem;margin:0 0 .35rem}
.sub{color:#8b9aab;margin:0 0 1.2rem}
.card{background:#151c26;border:1px solid #243041;border-radius:12px;padding:1rem;margin:0 0 .75rem}
table{width:100%;border-collapse:collapse;font-size:.86rem}
th,td{text-align:left;padding:.45rem .35rem;border-bottom:1px solid #243041}
a{color:#5b9fd4}
.ok{color:#3dd68c}.bad{color:#f07178}.warn{color:#e6b84d}
.badge{font-size:.68rem;padding:.12rem .4rem;border-radius:999px;background:#243040;color:#8b9aab}
</style></head><body><div class="wrap">
<h1>Phase 4 — Speed command</h1>
<p class="sub">${esc(origin)} · heavy images ${heavyCount} · PSI lab ${labPages.length}/${pages.length} · TTFB ${probe.ttfbMs ?? '—'}ms</p>
<div class="card">
  <strong>Server probe</strong>
  <ul>
    <li>TTFB: <span class="${probe.ttfbOk ? 'ok' : 'bad'}">${probe.ttfbMs ?? '—'} ms</span> (target &lt; 800 ms)</li>
    <li>Content-Encoding: <span class="${probe.encodingOk ? 'ok' : 'warn'}">${esc(probe.contentEncoding || '—')}</span></li>
    <li>Cache-Control: ${esc(probe.cacheControl || '—')}</li>
  </ul>
  <p class="sub">Images: ${esc(weight.message)} · ${esc(optimize.message)}</p>
</div>
<div class="card">
  <table>
    <thead><tr><th>Page</th><th>Perf</th><th>LCP</th><th>CLS</th><th>PSI</th></tr></thead>
    <tbody>
      ${pages
        .map((p) => {
          const perf = p.lab?.performance;
          const cls = perf == null ? '' : perf < 70 ? 'bad' : perf < 85 ? 'warn' : 'ok';
          return `<tr>
            <td>${esc(p.path)}</td>
            <td class="${cls}">${perf ?? '—'}</td>
            <td>${esc(p.lab?.lcp || '—')}</td>
            <td>${esc(p.lab?.cls || '—')}</td>
            <td><a href="${esc(p.psiMobile)}" target="_blank" rel="noreferrer">Open</a></td>
          </tr>`;
        })
        .join('')}
    </tbody>
  </table>
</div>
<p class="sub">Autopilot compresses heavy images to WebP. Admin uploads: keep heroes &lt;300KB (SEO-GUIDE 4.2).</p>
</div></body></html>`;

  const md = [
    `# Phase 4 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `- Image weight: ${weight.message}`,
    `- Optimize: ${optimize.message}`,
    `- Speed: ${speed.message}`,
    `- TTFB: ${probe.ttfbMs ?? '—'} ms · encoding ${probe.contentEncoding || '—'}`,
    '',
    weak.length ? `**Weak mobile perf (<70):** ${weak.map((w) => `${w.path} (${w.performance})`).join(', ')}` : 'All lab scores ≥70 or PSI not run.',
    '',
    'Open `phase4-ops.html` for the dashboard. Details: `speed-baseline.md`.',
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'phase4-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase4-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase4-ops.html'), html, 'utf8');

  const findings = [];
  if (weak.length) {
    findings.push({
      code: 'SPEED_WEAK_LAB',
      severity: 'medium',
      title: `${weak.length} key page(s) mobile PSI < 70`,
      remediation: 'Review phase4-ops.html / speed-baseline.md; compress heroes; see SEO-GUIDE 4.4 if still low after images.',
      owner: 'developer',
      pillar: 'technical',
    });
  }
  if (probe.ttfbMs != null && !probe.ttfbOk) {
    findings.push({
      code: 'SPEED_TTFB',
      severity: 'medium',
      title: `Home TTFB ${probe.ttfbMs} ms (target <800)`,
      remediation: 'SEO-GUIDE 4.3–4.4 — cache CMS reads / server capacity.',
      owner: 'developer',
      pillar: 'technical',
    });
  }
  if (!findings.length) {
    findings.push({
      code: 'PHASE4_OPS',
      severity: 'low',
      title: 'Phase 4 speed ops pack ready',
      remediation: 'Keep media under limits; re-run after large uploads.',
      owner: 'developer',
      pillar: 'technical',
    });
  }

  return {
    ok: optimize.ok !== false && speed.ok !== false,
    status: weak.length || (probe.ttfbMs != null && !probe.ttfbOk) ? 'degraded' : 'ok',
    message: `Phase 4 · heavy ${heavyCount} · lab ${labPages.length} · weak ${weak.length} · TTFB ${probe.ttfbMs ?? '—'}ms`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase4-ops.html'),
        md: resolve(outDir, 'phase4-advance.md'),
        json: resolve(outDir, 'phase4-advance.json'),
      },
      weight: weight.data,
      optimize: optimize.data,
      speed: speed.data,
    },
    findings,
  };
}
