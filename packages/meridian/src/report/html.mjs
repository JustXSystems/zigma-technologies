/**
 * Boardroom HTML report — IBM Plex, graphite / ice / cyan signal accent.
 */
export function renderHtmlReport(report) {
  const { meta, scorecard, findings, pages, connectors, roadmap, profile } = report;
  const sevClass = (s) => `sev-${s}`;
  const findingsHtml = findings
    .slice()
    .sort((a, b) => sevRank(a.severity) - sevRank(b.severity))
    .map(
      (f) => `
      <article class="finding ${sevClass(f.severity)}">
        <header>
          <span class="pill">${esc(f.severity)}</span>
          <span class="code">${esc(f.code)}</span>
          <span class="owner">${esc(f.owner)}</span>
        </header>
        <h3>${esc(f.title)}</h3>
        <p class="detail">${esc(f.detail)}</p>
        ${f.evidence ? `<p class="evidence"><span>Evidence</span> ${esc(f.evidence)}</p>` : ''}
        <p class="fix"><span>Fix</span> ${esc(f.remediation)}</p>
      </article>`
    )
    .join('\n');

  const pillars = Object.entries(scorecard.pillars || {})
    .map(
      ([k, v]) => `
      <div class="pillar">
        <div class="pillar-label">${esc(k)}</div>
        <div class="pillar-bar"><i style="width:${v}%"></i></div>
        <div class="pillar-val">${v}</div>
      </div>`
    )
    .join('');

  const pagesHtml = pages
    .map(
      (p) => `
      <tr>
        <td><code>${esc(p.path)}</code></td>
        <td>${p.status}</td>
        <td>${esc(truncate(p.title, 48))}</td>
        <td><code>${esc(truncate(p.robots, 24))}</code></td>
        <td>${p.h1}</td>
        <td>${p.issues?.length || 0}</td>
      </tr>`
    )
    .join('');

  const connectorsHtml = connectors
    .map(
      (c) => `
      <div class="connector status-${esc(c.status)}">
        <div class="c-name">${esc(c.label)}</div>
        <div class="c-status">${esc(c.status)}</div>
        <p>${esc(c.message || '')}</p>
      </div>`
    )
    .join('');

  const roadmapHtml = (roadmap || [])
    .map(
      (r) => `
      <li>
        <span class="prio">${r.priority}</span>
        <div>
          <strong>${esc(r.title)}</strong>
          <span class="meta">${esc(r.owner)} · phase ${esc(String(r.phase))}</span>
        </div>
      </li>`
    )
    .join('');

  const signals = report.signals || {};
  const signalsHtml = renderSignals(signals);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Meridian · ${esc(profile.displayName || profile.id)} · ${scorecard.overall}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
:root{
  --bg:#0b121c; --panel:#121a26; --panel2:#182233; --line:rgba(255,255,255,.08);
  --text:#e8eef7; --muted:#8b9bb0; --cyan:#3de0ff; --ice:#9fb4cc;
  --crit:#ff5c5c; --high:#ff9f43; --med:#f6c945; --low:#6ec6ff; --ok:#3dd68c;
}
*{box-sizing:border-box}
body{margin:0;font-family:'IBM Plex Sans',system-ui,sans-serif;background:
  radial-gradient(1200px 600px at 10% -10%, rgba(61,224,255,.12), transparent 55%),
  radial-gradient(900px 500px at 100% 0%, rgba(61,224,255,.05), transparent 40%),
  var(--bg);color:var(--text);line-height:1.5}
.wrap{max-width:1120px;margin:0 auto;padding:2.5rem 1.5rem 4rem}
.brand{display:flex;align-items:baseline;gap:.75rem;margin-bottom:2rem}
.brand .mark{font-family:'IBM Plex Mono',monospace;font-size:.75rem;letter-spacing:.18em;text-transform:uppercase;color:var(--cyan)}
.brand h1{font-size:1.65rem;font-weight:600;margin:0;letter-spacing:-.02em}
.sub{color:var(--muted);font-size:.95rem;margin:.35rem 0 0}
.hero{display:grid;grid-template-columns:220px 1fr;gap:1.5rem;align-items:stretch;margin:1.75rem 0 2.25rem}
@media(max-width:800px){.hero{grid-template-columns:1fr}}
.dial{background:linear-gradient(160deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:20px;padding:1.5rem;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden}
.dial::before{content:"";position:absolute;inset:-40%;background:conic-gradient(from 210deg, transparent, rgba(61,224,255,.25), transparent 40%);animation:spin 12s linear infinite;opacity:.5}
@keyframes spin{to{transform:rotate(1turn)}}
.dial .score{position:relative;font-size:4rem;font-weight:700;letter-spacing:-.04em;line-height:1}
.dial .grade{position:relative;font-family:'IBM Plex Mono',monospace;color:var(--cyan);letter-spacing:.2em;margin-top:.4rem}
.summary-card{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:1.4rem 1.5rem}
.summary-card p{margin:.4rem 0 0;color:var(--ice)}
.pillars{margin-top:1.1rem}
.pillar{display:grid;grid-template-columns:90px 1fr 36px;gap:.6rem;align-items:center;margin:.45rem 0;font-size:.85rem}
.pillar-label{text-transform:capitalize;color:var(--muted);font-family:'IBM Plex Mono',monospace;font-size:.72rem}
.pillar-bar{height:6px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden}
.pillar-bar i{display:block;height:100%;background:linear-gradient(90deg,#1a9bb5,var(--cyan));border-radius:99px}
.section{margin:2.5rem 0}
.section h2{font-size:1.05rem;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);font-weight:600;margin:0 0 1rem}
.grid{display:grid;gap:1rem}
.findings{display:grid;gap:.85rem}
.finding{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--muted);border-radius:12px;padding:1rem 1.15rem}
.finding.sev-critical{border-left-color:var(--crit)}
.finding.sev-high{border-left-color:var(--high)}
.finding.sev-medium{border-left-color:var(--med)}
.finding.sev-low{border-left-color:var(--low)}
.finding header{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.35rem}
.pill{font-family:'IBM Plex Mono',monospace;font-size:.65rem;letter-spacing:.08em;text-transform:uppercase;padding:.2rem .45rem;border-radius:4px;background:rgba(255,255,255,.06)}
.code,.owner{font-family:'IBM Plex Mono',monospace;font-size:.7rem;color:var(--muted)}
.finding h3{margin:0;font-size:1rem;font-weight:600}
.detail{color:var(--ice);margin:.4rem 0}
.evidence,.fix{font-size:.88rem;color:var(--muted);margin:.3rem 0}
.evidence span,.fix span{color:var(--cyan);font-family:'IBM Plex Mono',monospace;font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;margin-right:.4rem}
.connectors{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.75rem}
.connector{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:1rem}
.connector .c-name{font-weight:600}
.connector .c-status{font-family:'IBM Plex Mono',monospace;font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;margin:.35rem 0;color:var(--muted)}
.connector.status-ok .c-status{color:var(--ok)}
.connector.status-auth_required .c-status{color:var(--high)}
.connector.status-error .c-status{color:var(--crit)}
.connector p{margin:0;font-size:.85rem;color:var(--ice)}
table{width:100%;border-collapse:collapse;font-size:.85rem}
th,td{text-align:left;padding:.55rem .5rem;border-bottom:1px solid var(--line)}
th{color:var(--muted);font-weight:500;font-family:'IBM Plex Mono',monospace;font-size:.68rem;letter-spacing:.06em;text-transform:uppercase}
code{font-family:'IBM Plex Mono',monospace;font-size:.78rem}
.roadmap{list-style:none;padding:0;margin:0}
.roadmap li{display:flex;gap:.85rem;padding:.75rem 0;border-bottom:1px solid var(--line)}
.prio{font-family:'IBM Plex Mono',monospace;color:var(--cyan);min-width:1.5rem}
.roadmap .meta{display:block;color:var(--muted);font-size:.8rem;margin-top:.15rem}
.foot{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--line);font-size:.8rem;color:var(--muted);font-family:'IBM Plex Mono',monospace}
</style>
</head>
<body>
<main class="wrap">
  <div class="brand">
    <div>
      <div class="mark">Meridian · SEO Command</div>
      <h1>${esc(profile.displayName || profile.id)}</h1>
      <p class="sub">${esc(profile.origin)} · run ${esc(meta.runId)} · ${esc(meta.finishedAt)}</p>
    </div>
  </div>

  <section class="hero">
    <div class="dial">
      <div class="score">${scorecard.overall}</div>
      <div class="grade">GRADE ${esc(scorecard.grade)}</div>
    </div>
    <div class="summary-card">
      <div class="mark">Scorecard</div>
      <p>${esc(scorecard.summary)}</p>
      ${report.trend ? `<p class="sub" style="margin-top:.75rem"><span class="mark">Trend</span> ${esc(report.trend.message || report.trend.status)}</p>` : ''}
      <div class="pillars">${pillars}</div>
    </div>
  </section>

  <section class="section">
    <h2>Connectors</h2>
    <div class="connectors">${connectorsHtml}</div>
  </section>

  <section class="section">
    <h2>Signals</h2>
    ${signalsHtml}
  </section>

  <section class="section">
    <h2>Roadmap</h2>
    <ol class="roadmap">${roadmapHtml || '<li><div>No urgent items — maintain weekly verify cadence.</div></li>'}</ol>
  </section>

  <section class="section">
    <h2>Findings (${findings.length})</h2>
    <div class="findings">${findingsHtml || '<p class="sub">No findings.</p>'}</div>
  </section>

  <section class="section">
    <h2>Pages sampled</h2>
    <table>
      <thead><tr><th>Path</th><th>Status</th><th>Title</th><th>Robots</th><th>H1</th><th>Issues</th></tr></thead>
      <tbody>${pagesHtml}</tbody>
    </table>
  </section>

  <p class="foot">Meridian ${esc(meta.meridianVersion)} · schema ${esc(String(meta.schemaVersion))} · portable across sites via SiteProfile JSON</p>
</main>
</body>
</html>`;
}

function renderSignals(signals) {
  const blocks = [];
  if (signals.gsc) {
    const q = (signals.gsc.topQueries || []).slice(0, 5)
      .map((r) => `<li><code>${esc(r.query)}</code> · ${r.clicks} clicks · pos ${Number(r.position).toFixed(1)}</li>`)
      .join('');
    blocks.push(`
      <div class="signal">
        <h3>Search Console</h3>
        <p class="sub">${esc(signals.gsc.siteUrl)} · ${esc(signals.gsc.window?.startDate || '')} → ${esc(signals.gsc.window?.endDate || '')}</p>
        <p>${(signals.gsc.sitemaps || []).length} sitemap(s) · sample clicks ${signals.gsc.sampleTotals?.clicks ?? 0}</p>
        ${q ? `<ul>${q}</ul>` : '<p class="sub">No query rows in window (new property or low traffic).</p>'}
      </div>`);
  }
  if (signals.ga4) {
    const org = signals.ga4.organic;
    blocks.push(`
      <div class="signal">
        <h3>GA4</h3>
        <p class="sub">Property ${esc(String(signals.ga4.propertyId))} · 28d</p>
        <p>Organic: ${org ? `${org.sessions} sessions · ${org.keyEvents} key events` : 'no Organic Search row'} · All channels: ${signals.ga4.totals?.sessions ?? 0} sessions</p>
      </div>`);
  }
  if (signals.bing) {
    blocks.push(`
      <div class="signal">
        <h3>Bing</h3>
        <p class="sub">${esc(signals.bing.siteUrl)}</p>
        <p>Crawl / query samples attached in JSON report.</p>
      </div>`);
  }
  if (signals.pagespeed) {
    const lab = signals.pagespeed.lab || {};
    blocks.push(`
      <div class="signal">
        <h3>PageSpeed / CrUX</h3>
        <p>Mobile lab <strong>${signals.pagespeed.performanceScore}</strong>/100 · LCP ${esc(lab.lcp?.displayValue || '—')} · CLS ${esc(lab.cls?.displayValue || '—')}</p>
      </div>`);
  }
  if (!blocks.length) {
    return `<p class="sub">${esc(signals.note || 'Connect GSC / GA4 / Bing / PSI to populate signals.')}</p>`;
  }
  return `<div class="signals">${blocks.join('')}<p class="sub" style="margin-top:1rem">${esc(signals.note || '')}</p></div>
<style>.signals{display:grid;gap:.85rem}.signal{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:1rem 1.15rem}.signal h3{margin:0 0 .35rem;font-size:1rem}.signal ul{margin:.5rem 0 0;padding-left:1.1rem;color:var(--ice)}</style>`;
}

function sevRank(s) {
  return { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[s] ?? 9;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(s, n) {
  const t = String(s || '');
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}
