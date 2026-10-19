import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assessCityPages } from './city-pages-readiness.mjs';
import { assessLocaleDecision } from './locale-decision.mjs';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function parseCityService(path) {
  const parts = String(path || '')
    .split('/')
    .filter(Boolean);
  // locations / city / service
  if (parts[0] === 'locations' && parts.length >= 3) {
    return { city: parts[1], service: parts[2] };
  }
  return { city: parts[1] || 'city', service: parts[2] || 'service' };
}

function titleCase(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Auto content briefs for city×service pages (Phase 6.1) — unique local outline, never invents facts.
 */
function buildCityBriefs(cityPages, origin) {
  return (cityPages || []).map((p) => {
    const { city, service } = parseCityService(p.path);
    const cityName = titleCase(city);
    const serviceName = titleCase(service);
    return {
      path: p.path,
      url: p.url || `${origin}${p.path}`,
      noindex: !!p.noindex,
      words: p.words ?? 0,
      readyToIndex: !!p.readyToIndex,
      indexKey: `${city}/${service}`,
      brief: {
        workingTitle: `${serviceName} in ${cityName} — Engineering & AMC`,
        audience: `Plant / facility managers in ${cityName} evaluating ${serviceName}`,
        intent: 'Local commercial + Maps support; unlock index only after unique proof',
        mustInclude: [
          `Named ${cityName} response / travel time (real figure from ops)`,
          '1 local project or customer type (no invented logos)',
          'OEM / certification relevant to this service',
          'SLA / emergency callout for this metro',
          '3 FAQs buyers in this city actually ask',
        ],
        outline: [
          `H1: ${serviceName} in ${cityName}`,
          `Who we serve in ${cityName} (industries, not keyword soup)`,
          'What Zigma delivers on-site (scope bullets)',
          'Local proof (project / metric — leave placeholders until marketing fills)',
          'Process from enquiry → survey → commissioning',
          'FAQ',
          'CTA → /contact with city+service prefill if available',
        ],
        internalLinks: [`/locations/${city}`, '/projects', '/services', '/contact'],
        targetLength: '600–900 unique words',
        indexGate: `Add \`${city}/${service}\` to INDEXABLE_CITY_SERVICES in src/lib/location-services.ts only after copy is live.`,
      },
    };
  });
}

/**
 * Phase 6 advance — city readiness + locale decision + city briefs + HTML ops.
 */
export async function advancePhase6(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');

  const city = await assessCityPages(profile, { outDir });
  const locale = await assessLocaleDecision(profile, { outDir });
  const briefs = buildCityBriefs(city.data?.pages || [], origin);
  const ready = Number(city.data?.ready || 0);
  const blocked = Number(city.data?.blocked || 0);

  const briefsPayload = {
    generatedAt: new Date().toISOString(),
    phase: '6.1',
    count: briefs.length,
    briefs,
    rule: 'Never invent local projects. Fill mustInclude from ops, then unlock indexing.',
  };

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 6 City & Locale Ops — ${esc(profile.displayName || profile.id)}</title>
<style>
body{font-family:Segoe UI,system-ui,sans-serif;background:#0c1117;color:#e8eef5;margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:900px;margin:0 auto}
h1{font-size:1.45rem;margin:0 0 .35rem}
.sub{color:#8b9aab}
.card{background:#151c26;border:1px solid #243041;border-radius:12px;padding:1rem;margin:.75rem 0}
.badge{font-size:.68rem;padding:.12rem .4rem;border-radius:999px;background:#243040;color:#8b9aab}
.badge.on{background:#163326;color:#3dd68c}.badge.off{background:#3a2020;color:#f07178}
table{width:100%;border-collapse:collapse;font-size:.84rem;margin-top:.5rem}
th,td{text-align:left;padding:.4rem .3rem;border-bottom:1px solid #243041}
code{background:#243040;padding:.1rem .3rem;border-radius:3px;font-size:.8em}
ol{margin:.4rem 0 0;padding-left:1.2rem;color:#8b9aab}
</style></head><body><div class="wrap">
<h1>Phase 6 — City & locale command</h1>
<p class="sub">${esc(origin)} · city ready ${ready} · still noindex ${blocked} · locales: ${esc((locale.data?.recommendation || '').slice(0, 100))}</p>
<div class="card">
  <strong>Locale decision</strong>
  <p>${esc(locale.data?.recommendation || '')}</p>
  <p class="sub">Change only via Admin → Site Copy → Locales with a native speaker.</p>
</div>
<div class="card">
  <strong>City × service samples</strong>
  <table>
    <thead><tr><th>Path</th><th>Words</th><th>noindex</th><th>Index key</th></tr></thead>
    <tbody>
      ${briefs
        .map(
          (b) => `<tr>
        <td><a href="${esc(b.url)}" target="_blank" rel="noreferrer">${esc(b.path)}</a></td>
        <td>${b.words}</td>
        <td><span class="badge ${b.noindex ? 'off' : 'on'}">${b.noindex ? 'noindex' : 'index'}</span></td>
        <td><code>${esc(b.indexKey)}</code></td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>
</div>
${briefs
  .map(
    (b) => `<div class="card">
  <strong>${esc(b.brief.workingTitle)}</strong> <span class="badge">${esc(b.path)}</span>
  <ol>${b.brief.outline.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
  <p class="sub"><strong>Must include:</strong> ${esc(b.brief.mustInclude.join(' · '))}</p>
  <p class="sub">${esc(b.brief.indexGate)}</p>
</div>`
  )
  .join('')}
<p class="sub">Full briefs: city-content-briefs.md · readiness: city-pages-readiness.md · locales: locale-decision.md</p>
</div></body></html>`;

  const md = [
    `# Phase 6 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${briefsPayload.generatedAt}`,
    '',
    `## Locale`,
    '',
    locale.data?.recommendation || '—',
    '',
    `## City pages: ${ready} ready · ${blocked} noindex`,
    '',
    'Open **`phase6-ops.html`** for briefs. Index only after unique local proof.',
    '',
    ...briefs.flatMap((b) => [
      `### ${b.brief.workingTitle}`,
      '',
      `- Path: \`${b.path}\` (${b.words} words, ${b.noindex ? 'noindex' : 'indexable'})`,
      `- Index key: \`${b.indexKey}\``,
      `- Must include: ${b.brief.mustInclude.join('; ')}`,
      '',
    ]),
  ].join('\n');

  await writeFile(resolve(outDir, 'city-content-briefs.json'), JSON.stringify(briefsPayload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'city-content-briefs.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase6-advance.json'), JSON.stringify({ ...briefsPayload, locale: locale.data, city: city.data }, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase6-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase6-ops.html'), html, 'utf8');

  return {
    ok: true,
    status: 'ok',
    message: `Phase 6 · city ready ${ready}/${blocked + ready} · locale live ${locale.data?.liveCount ?? 0} · ${briefs.length} briefs`,
    data: {
      ready,
      blocked,
      briefs: briefs.length,
      localeRecommendation: locale.data?.recommendation,
      paths: {
        html: resolve(outDir, 'phase6-ops.html'),
        md: resolve(outDir, 'phase6-advance.md'),
        briefs: resolve(outDir, 'city-content-briefs.md'),
      },
      city: city.data,
      locale: locale.data,
    },
    findings: [
      {
        code: 'PHASE6_OPS',
        severity: 'low',
        title: 'Phase 6 city/locale ops pack ready',
        remediation:
          'Fill city-content-briefs.md with real local proof, then add keys to INDEXABLE_CITY_SERVICES. Follow locale-decision.md for hi/kn.',
        owner: 'marketing',
        pillar: 'onpage',
      },
      ...(city.findings || []),
      ...(locale.findings || []),
    ],
  };
}
