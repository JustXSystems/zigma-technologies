import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { collectGsc } from './gsc.mjs';
import { collectBing } from './bing.mjs';
import { collectGa4 } from './ga4.mjs';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const pct = (n) => (n == null || Number.isNaN(n) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`);
const num = (n) => (n == null ? '—' : Number(n).toLocaleString('en-IN'));
const ctrPct = (n) => (n == null ? '—' : `${(Number(n) * 100).toFixed(1)}%`);
const pos = (n) => (n == null ? '—' : Number(n).toFixed(1));

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

const DEFAULT_SECTIONS = [
  'overview',
  'verify',
  'gsc',
  'bing',
  'ga4',
  'technical',
  'catalog',
  'conversion',
  'growth',
  'insights',
  'actions',
];

const THEMES = {
  aurora: {
    id: 'aurora',
    bg: '#03080f',
    card: 'rgba(10,22,34,0.82)',
    line: '#1a3348',
    text: '#e6f0fa',
    muted: '#7a93a8',
    accent: '#2dd4bf',
    accent2: '#38bdf8',
    ok: '#34d399',
    warn: '#fbbf24',
    bad: '#f87171',
    glow: 'rgba(45,212,191,0.18)',
  },
  forge: {
    id: 'forge',
    bg: '#0a0806',
    card: 'rgba(28,20,12,0.88)',
    line: '#3d2e1a',
    text: '#f5efe6',
    muted: '#a89070',
    accent: '#f59e0b',
    accent2: '#fb923c',
    ok: '#4ade80',
    warn: '#fbbf24',
    bad: '#f87171',
    glow: 'rgba(245,158,11,0.16)',
  },
  glass: {
    id: 'glass',
    bg: '#060a10',
    card: 'rgba(14,20,30,0.75)',
    line: '#243044',
    text: '#e8eef8',
    muted: '#8899ae',
    accent: '#94a3b8',
    accent2: '#64748b',
    ok: '#6ee7b7',
    warn: '#fcd34d',
    bad: '#fca5a5',
    glow: 'rgba(148,163,184,0.14)',
  },
};

function resolveConfig(profile, opts = {}) {
  const cfg = { ...(profile.autopilot?.commandBrief || {}), ...opts };
  const themeId = String(cfg.theme || 'aurora').toLowerCase();
  const theme = THEMES[themeId] || THEMES.aurora;
  let sections = Array.isArray(cfg.sections) && cfg.sections.length ? cfg.sections : DEFAULT_SECTIONS;
  if (typeof cfg.sections === 'string') {
    sections = cfg.sections.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return {
    windowDays: Math.min(90, Math.max(7, Number(cfg.windowDays || 28))),
    topN: Math.min(50, Math.max(5, Number(cfg.topN || 15))),
    comparePrevious: cfg.comparePrevious !== false,
    theme,
    sections,
    title: cfg.title || 'SEO Command Brief',
    showControls: cfg.showControls !== false,
  };
}

function analyzeInsights({ gsc, bing, ga4, report, catalog, conversion, humanDebt, liveVerify, growth }) {
  const insights = [];
  const g = gsc?.status === 'ok' ? gsc.data : null;
  const b = bing?.status === 'ok' ? bing.data : null;

  if (liveVerify && liveVerify.ok === false) {
    insights.push({
      severity: 'high',
      title: 'Live SEO verification failed',
      detail: (liveVerify.failures || []).slice(0, 3).join('; ') || 'See seo-live-verify.json',
      owner: 'developer',
    });
  } else if (liveVerify?.ok === true) {
    insights.push({
      severity: 'ok',
      title: 'Live technical SEO checks passed',
      detail: `${liveVerify.passed ?? 0} checks OK on this request`,
      owner: 'auto',
    });
  }

  if (gsc?.status === 'auth_required') {
    insights.push({
      severity: 'high',
      title: 'Google login required (OAuth)',
      detail: gsc.message || 'Run npm run meridian:oauth once with the company Google account',
      owner: 'developer',
    });
  }

  if (g?.delta) {
    if (g.delta.clicksPct <= -15) {
      insights.push({
        severity: 'high',
        title: 'Google clicks down vs prior window',
        detail: `${pct(g.delta.clicksPct)} clicks · check ranking drops and indexing`,
        owner: 'you',
      });
    } else if (g.delta.clicksPct >= 15) {
      insights.push({
        severity: 'ok',
        title: 'Google clicks rising',
        detail: `${pct(g.delta.clicksPct)} vs prior ${g.window?.days || 28}d`,
        owner: 'auto',
      });
    }
  }

  for (const o of g?.opportunities || []) {
    insights.push({
      severity: 'medium',
      title: `CTR opportunity: “${o.query}”`,
      detail: `${num(o.impressions)} impressions · CTR ${ctrPct(o.ctr)} · pos ${pos(o.position)} — rewrite title/description`,
      owner: 'you',
    });
  }

  for (const p of (g?.pageAlerts || []).slice(0, 3)) {
    insights.push({
      severity: 'medium',
      title: 'Page ranking outside top 20',
      detail: `${p.page} · pos ${pos(p.position)} · ${num(p.impressions)} impressions`,
      owner: 'you',
    });
  }

  const smErr = (g?.sitemaps || []).filter((s) => Number(s.errors) > 0);
  if (smErr.length) {
    insights.push({
      severity: 'high',
      title: 'GSC sitemap errors',
      detail: smErr.map((s) => `${s.path} (${s.errors} errors)`).join('; '),
      owner: 'developer',
    });
  }

  if (bing?.status === 'auth_required') {
    insights.push({
      severity: 'low',
      title: 'Bing API key missing',
      detail: bing.message,
      owner: 'developer',
    });
  } else if (b?.latestCrawl?.errors > 0) {
    insights.push({
      severity: 'medium',
      title: 'Bing crawl errors',
      detail: `${b.latestCrawl.errors} errors on latest crawl sample`,
      owner: 'developer',
    });
  }

  const score = report?.scorecard?.overall;
  if (score != null && score < 90) {
    insights.push({
      severity: 'high',
      title: `Technical score ${score}`,
      detail: report?.scorecard?.summary || 'Run meridian:observe to remediate',
      owner: 'developer',
    });
  }

  if (catalog && catalog.continuumNominal === false) {
    insights.push({
      severity: 'medium',
      title: 'Catalog continuum alert',
      detail: catalog.boardLine || 'Inventory / CMS meta needs attention',
      owner: 'auto',
    });
  }

  const debt = humanDebt?.open ?? humanDebt?.count ?? humanDebt?.total;
  if (debt != null && Number(debt) > 0) {
    insights.push({
      severity: 'medium',
      title: `Human debt: ${debt}`,
      detail: 'Optional GBP / review items remain',
      owner: 'you',
    });
  }

  if (ga4?.status === 'ok' && g?.totals && ga4.data?.organic) {
    const gscClicks = g.totals.clicks || 0;
    const organic = ga4.data.organic.sessions ?? 0;
    if (gscClicks > 20 && organic > 0) {
      const ratio = organic / gscClicks;
      if (ratio < 0.5) {
        insights.push({
          severity: 'low',
          title: 'GA4 organic sessions lag GSC clicks',
          detail: `GSC ${num(gscClicks)} clicks vs GA4 ${num(organic)} organic — check tagging / consent`,
          owner: 'developer',
        });
      }
    }
  }

  if (conversion?.yieldPct != null && conversion.yieldPct < 20) {
    insights.push({
      severity: 'medium',
      title: 'Enquiry yield soft',
      detail: `${conversion.yieldPct}% yield — review form UX and CTAs`,
      owner: 'you',
    });
  }

  if (growth?.opportunityCount > 0) {
    insights.push({
      severity: 'medium',
      title: `${growth.opportunityCount} growth opportunity(ies) on Growth Desk`,
      detail:
        (growth.nextActions || [])
          .slice(0, 2)
          .map((a) => a.title)
          .join(' · ') || 'Open Growth Desk for CTR / page-2 / review actions',
      owner: 'you',
    });
  }
  if (growth?.cityDraftPath) {
    insights.push({
      severity: 'medium',
      title: 'City draft staged — promote only with unique proof',
      detail: `${growth.cityDraftPath} · Admin → SEO → City promote (never auto-index thin templates)`,
      owner: 'you',
    });
  }

  if (!insights.length) {
    insights.push({
      severity: 'ok',
      title: 'No critical search alerts',
      detail: 'GSC + Bing + Meridian look stable for this window',
      owner: 'auto',
    });
  }

  return insights.slice(0, 16);
}

function statusClass(status) {
  if (status === 'ok' || status === 'nominal') return 'ok';
  if (status === 'auth_required' || status === 'skipped' || status === 'pending') return 'warn';
  return 'bad';
}

function renderTable(headers, rows) {
  if (!rows.length) return '<p class="empty">No rows for this window.</p>';
  return `<div class="table-wrap"><table><thead><tr>${headers
    .map((h) => `<th>${esc(h)}</th>`)
    .join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
}

function buildHtml(profile, config, board) {
  const t = config.theme;
  const brand = profile.displayName || profile.brand?.name || profile.id;
  const origin = profile.origin || '';
  const sections = new Set(config.sections);
  const g = board.gsc?.data || {};
  const b = board.bing?.data || {};
  const delta = g.delta;

  const deltaChip = (v, invert = false) => {
    if (v == null) return '<span class="chip muted">—</span>';
    const good = invert ? v < 0 : v > 0;
    const bad = invert ? v > 0 : v < 0;
    const cls = good ? 'ok' : bad ? 'bad' : 'muted';
    return `<span class="chip ${cls}">${esc(typeof v === 'number' && Math.abs(v) < 50 ? pct(v) : String(v))}</span>`;
  };

  const sectionNav = config.sections
    .map((id) => `<button type="button" class="nav-btn" data-section="${esc(id)}">${esc(id)}</button>`)
    .join('');

  const parts = [];

  parts.push(`
<header class="hero">
  <div class="hero-glow"></div>
  <div class="hero-top">
    <div>
      <p class="eyebrow">Meridian · Phase 33 · One-spot SEO</p>
      <h1>${esc(config.title)}</h1>
      <p class="sub"><strong>${esc(brand)}</strong> · ${esc(origin)} · ${esc(g.window?.startDate || '—')} → ${esc(g.window?.endDate || '—')} (${esc(config.windowDays)}d)</p>
    </div>
    <div class="score-orb">
      <span class="orb-label">Meridian</span>
      <span class="orb-val">${esc(board.scorecard?.overall ?? '—')}<small>${esc(board.scorecard?.grade || '')}</small></span>
      <span class="orb-sub">${esc(board.briefStatus)}</span>
    </div>
  </div>
  <div class="kpi-strip">
    <div class="kpi"><span>GSC clicks</span><b>${esc(num(g.totals?.clicks))}</b>${delta ? deltaChip(delta.clicksPct) : ''}</div>
    <div class="kpi"><span>GSC impressions</span><b>${esc(num(g.totals?.impressions))}</b>${delta ? deltaChip(delta.impressionsPct) : ''}</div>
    <div class="kpi"><span>Avg position</span><b>${esc(pos(g.totals?.position))}</b>${delta?.positionDelta != null ? deltaChip(delta.positionDelta, true) : ''}</div>
    <div class="kpi"><span>CTR</span><b>${esc(ctrPct(g.totals?.ctr))}</b></div>
    <div class="kpi"><span>Bing clicks</span><b>${esc(num(b.totals?.clicks))}</b></div>
    <div class="kpi"><span>GA4 organic</span><b>${esc(num(board.ga4?.data?.organic?.sessions))}</b></div>
    <div class="kpi"><span>Enquiries</span><b>${esc(num(board.conversion?.enquiries))}</b></div>
    <div class="kpi"><span>Human debt</span><b>${esc(num(board.humanDebt?.open ?? board.humanDebt?.count ?? 0))}</b></div>
  </div>
</header>`);

  if (config.showControls) {
    parts.push(`
<section class="panel controls" id="sec-controls">
  <div class="panel-head">
    <h2>Customize this brief</h2>
    <p>Filters apply in-browser. Re-run <code>npm run meridian:brief</code> (or observe) to refresh live GSC/Bing data.</p>
  </div>
  <div class="controls-row">
    <label>Theme
      <select id="themePick">
        <option value="aurora"${t.id === 'aurora' ? ' selected' : ''}>Aurora</option>
        <option value="forge"${t.id === 'forge' ? ' selected' : ''}>Forge</option>
        <option value="glass"${t.id === 'glass' ? ' selected' : ''}>Glass</option>
      </select>
    </label>
    <label>Sections
      <div class="nav">${sectionNav}</div>
    </label>
    <label class="check"><input type="checkbox" id="compactMode"/> Compact tables</label>
    <button type="button" class="btn" id="printBtn">Print / PDF</button>
  </div>
  <p class="hint">Profile defaults: <code>autopilot.commandBrief</code> in <code>zigma.prod.json</code> — windowDays, topN, theme, sections.</p>
</section>`);
  }

  if (sections.has('overview')) {
    parts.push(`
<section class="panel" data-section="overview" id="sec-overview">
  <div class="panel-head"><h2>Mission overview</h2><p>Live pull this request · search + technical + conversion</p></div>
  <div class="grid-3">
    <article class="tile">
      <h3>Google (API login)</h3>
      <p class="status ${statusClass(board.gsc?.status)}">${esc(board.gsc?.status || '—')}</p>
      <p>${esc(board.gsc?.message || 'Not connected — npm run meridian:oauth')}</p>
    </article>
    <article class="tile">
      <h3>Bing (API key)</h3>
      <p class="status ${statusClass(board.bing?.status)}">${esc(board.bing?.status || '—')}</p>
      <p>${esc(board.bing?.message || 'Not connected')}</p>
    </article>
    <article class="tile">
      <h3>Meridian</h3>
      <p class="status ok">${esc(board.scorecard?.summary || 'Technical engine')}</p>
      <p>Catalog ${esc(board.catalog?.continuumNominal ? 'NOMINAL' : board.catalog ? 'ALERT' : '—')} · PSI ${esc(board.pagespeed?.data?.performanceScore ?? '—')}</p>
    </article>
  </div>
</section>`);
  }

  if (sections.has('verify') && board.liveVerify) {
    const lv = board.liveVerify;
    parts.push(`
<section class="panel" data-section="verify" id="sec-verify">
  <div class="panel-head"><h2>Live site SEO verification</h2><p>Ran this request against ${esc(origin)} (canonicals, robots, sitemap, noindex, H1)</p></div>
  <div class="grid-3">
    <article class="tile"><h3>Result</h3><b class="${lv.ok ? 'ok' : 'bad'}">${lv.ok ? 'PASS' : 'FAIL'}</b></article>
    <article class="tile"><h3>Passed</h3><b>${esc(num(lv.passed))}</b></article>
    <article class="tile"><h3>Failed</h3><b class="${lv.failed ? 'bad' : 'ok'}">${esc(num(lv.failed))}</b></article>
  </div>
  ${
    (lv.failures || []).length
      ? `<ul class="findings">${(lv.failures || [])
          .slice(0, 12)
          .map((f) => `<li class="high"><strong>FAIL</strong> ${esc(f)}</li>`)
          .join('')}</ul>`
      : '<p class="empty">All hard technical checks passed on this request.</p>'
  }
</section>`);
  }

  if (sections.has('insights')) {
    parts.push(`
<section class="panel" data-section="insights" id="sec-insights">
  <div class="panel-head"><h2>Insights &amp; actions</h2><p>Auto-analyzed from GSC + Bing + Meridian artefacts</p></div>
  <div class="insight-list">
    ${board.insights
      .map(
        (i) => `
      <div class="insight ${esc(i.severity)}">
        <div class="insight-meta"><span class="pill ${esc(i.severity)}">${esc(i.severity)}</span><span class="owner">${esc(i.owner)}</span></div>
        <strong>${esc(i.title)}</strong>
        <p>${esc(i.detail)}</p>
      </div>`
      )
      .join('')}
  </div>
</section>`);
  }

  if (sections.has('gsc')) {
    const qRows = (g.topQueries || []).map((r) => [
      esc(r.query),
      esc(num(r.clicks)),
      esc(num(r.impressions)),
      esc(ctrPct(r.ctr)),
      esc(pos(r.position)),
    ]);
    const pRows = (g.topPages || []).map((r) => [
      `<a href="${esc(r.page)}" target="_blank" rel="noreferrer">${esc(r.page.replace(origin, '') || r.page)}</a>`,
      esc(num(r.clicks)),
      esc(num(r.impressions)),
      esc(ctrPct(r.ctr)),
      esc(pos(r.position)),
    ]);
    const dRows = (g.byDevice || []).map((r) => [
      esc(r.device),
      esc(num(r.clicks)),
      esc(num(r.impressions)),
      esc(ctrPct(r.ctr)),
    ]);
    const cRows = (g.byCountry || []).slice(0, 10).map((r) => [
      esc(r.country),
      esc(num(r.clicks)),
      esc(num(r.impressions)),
      esc(pos(r.position)),
    ]);
    parts.push(`
<section class="panel" data-section="gsc" id="sec-gsc">
  <div class="panel-head"><h2>Google Search Console</h2><p>${esc(g.siteUrl || '')} · ${esc(config.windowDays)} day window</p></div>
  ${renderTable(['Query', 'Clicks', 'Impr.', 'CTR', 'Pos'], qRows)}
  <h3 class="subhead">Top pages</h3>
  ${renderTable(['Page', 'Clicks', 'Impr.', 'CTR', 'Pos'], pRows)}
  <div class="grid-2">
    <div><h3 class="subhead">Devices</h3>${renderTable(['Device', 'Clicks', 'Impr.', 'CTR'], dRows)}</div>
    <div><h3 class="subhead">Countries</h3>${renderTable(['Country', 'Clicks', 'Impr.', 'Pos'], cRows)}</div>
  </div>
  <h3 class="subhead">Sitemaps</h3>
  ${renderTable(
    ['Path', 'Submitted', 'Errors', 'Warnings'],
    (g.sitemaps || []).map((s) => [
      esc(s.path),
      esc(s.lastSubmitted || '—'),
      esc(s.errors ?? 0),
      esc(s.warnings ?? 0),
    ])
  )}
</section>`);
  }

  if (sections.has('bing')) {
    const bq = (b.topQueries || []).map((r) => [
      esc(r.query),
      esc(num(r.clicks)),
      esc(num(r.impressions)),
      esc(r.position != null ? pos(r.position) : '—'),
    ]);
    const bp = (b.topPages || []).map((r) => [
      esc(r.page),
      esc(num(r.clicks)),
      esc(num(r.impressions)),
    ]);
    parts.push(`
<section class="panel" data-section="bing" id="sec-bing">
  <div class="panel-head"><h2>Bing Webmaster</h2><p>${esc(b.siteUrl || board.bing?.message || '')}</p></div>
  <div class="grid-3">
    <article class="tile"><h3>Crawled</h3><b>${esc(num(b.latestCrawl?.crawledPages))}</b></article>
    <article class="tile"><h3>Crawl errors</h3><b>${esc(num(b.latestCrawl?.errors ?? 0))}</b></article>
    <article class="tile"><h3>Quota</h3><pre class="mini">${esc(JSON.stringify(b.urlSubmissionQuota?.d || b.urlSubmissionQuota || {}, null, 0).slice(0, 180))}</pre></article>
  </div>
  <h3 class="subhead">Top queries</h3>
  ${renderTable(['Query', 'Clicks', 'Impr.', 'Pos'], bq)}
  <h3 class="subhead">Top pages</h3>
  ${renderTable(['Page', 'Clicks', 'Impr.'], bp)}
</section>`);
  }

  if (sections.has('ga4')) {
    const ga = board.ga4?.data || {};
    parts.push(`
<section class="panel" data-section="ga4" id="sec-ga4">
  <div class="panel-head"><h2>Google Analytics 4</h2><p>${esc(board.ga4?.message || '')}</p></div>
  <div class="grid-3">
    <article class="tile"><h3>Sessions</h3><b>${esc(num(ga.totals?.sessions))}</b></article>
    <article class="tile"><h3>Organic</h3><b>${esc(num(ga.organic?.sessions))}</b></article>
    <article class="tile"><h3>Key events</h3><b>${esc(num(ga.organic?.keyEvents ?? ga.totals?.keyEvents))}</b></article>
  </div>
</section>`);
  }

  if (sections.has('technical')) {
    const findings = (board.findings || []).slice(0, 12);
    parts.push(`
<section class="panel" data-section="technical" id="sec-technical">
  <div class="panel-head"><h2>Technical SEO</h2><p>Live Meridian scorecard + top findings</p></div>
  <div class="grid-3">
    ${Object.entries(board.scorecard?.pillars || {})
      .map(
        ([k, v]) =>
          `<article class="tile"><h3>${esc(k)}</h3><b>${esc(v)}</b></article>`
      )
      .join('') || '<article class="tile"><h3>Score</h3><b>—</b></article>'}
  </div>
  ${
    findings.length
      ? `<ul class="findings">${findings
          .map(
            (f) =>
              `<li class="${esc(f.severity)}"><strong>${esc(f.code)}</strong> ${esc(f.title)} — <span class="muted">${esc(f.remediation)}</span></li>`
          )
          .join('')}</ul>`
      : '<p class="empty">No open high-severity findings in latest report.</p>'
  }
</section>`);
  }

  if (sections.has('catalog')) {
    const c = board.catalog || {};
    const stats = c.stats || {};
    parts.push(`
<section class="panel" data-section="catalog" id="sec-catalog">
  <div class="panel-head"><h2>Catalog continuum</h2><p>Inventory · Products · Services · Projects · CMS</p></div>
  <div class="grid-3">
    <article class="tile"><h3>Status</h3><b class="${c.continuumNominal ? 'ok' : 'warn'}">${c.continuumNominal ? 'NOMINAL' : c.boardLine ? 'ALERT' : '—'}</b></article>
    <article class="tile"><h3>Scanned</h3><b>${esc(num(c.scanned))}</b></article>
    <article class="tile"><h3>Meta heals</h3><b>${esc(num(stats.healedMeta ?? 0))}</b></article>
  </div>
  <p class="muted">${esc(c.boardLine || '')}</p>
</section>`);
  }

  if (sections.has('conversion')) {
    const cv = board.conversion || {};
    parts.push(`
<section class="panel" data-section="conversion" id="sec-conversion">
  <div class="panel-head"><h2>Conversion continuum</h2><p>Enquiries &amp; yield</p></div>
  <div class="grid-3">
    <article class="tile"><h3>Enquiries (28d)</h3><b>${esc(num(cv.enquiries))}</b></article>
    <article class="tile"><h3>Yield</h3><b>${cv.yieldPct != null ? esc(cv.yieldPct) + '%' : '—'}</b></article>
    <article class="tile"><h3>Form health</h3><b class="${cv.formOk === false ? 'bad' : 'ok'}">${cv.formOk === false ? 'CHECK' : 'OK'}</b></article>
  </div>
</section>`);
  }

  if (sections.has('growth')) {
    const gr = board.growth || {};
    const actions = (gr.nextActions || []).slice(0, 5);
    parts.push(`
<section class="panel" data-section="growth" id="sec-growth">
  <div class="panel-head"><h2>Growth Desk</h2><p>Radar · city drafts · review outreach — quality gates on</p></div>
  <div class="grid-3">
    <article class="tile"><h3>Opportunities</h3><b>${esc(num(gr.opportunityCount))}</b></article>
    <article class="tile"><h3>City held</h3><b>${esc(num(gr.cityTemplatesHeld))}</b></article>
    <article class="tile"><h3>Review link</h3><b class="${gr.reviewLink ? 'ok' : 'warn'}">${gr.reviewLink ? 'LIVE' : 'SET GBP'}</b></article>
  </div>
  ${
    actions.length
      ? `<ul class="findings">${actions
          .map(
            (a) =>
              `<li><strong>${esc(a.kind)}</strong> ${esc(a.title)} — <span class="muted">${esc(a.detail)}</span></li>`
          )
          .join('')}</ul>`
      : '<p class="empty">Growth desk clear for this cycle.</p>'
  }
  <p class="muted">City promote stays human: Admin → SEO → Meridian → City promote after unique proof.</p>
</section>`);
  }

  if (sections.has('actions')) {
    const fileEnv = String(profile.id || '').includes('preprod') ? 'preprod' : 'prod';
    let urlPrefix = '';
    try {
      const originPath = new URL(profile.origin || 'https://zigma-technologies.com').pathname || '/';
      if (originPath !== '/') urlPrefix = originPath.replace(/\/$/, '');
    } catch {
      /* apex */
    }
    const arte = (name) =>
      `${urlPrefix}/api/admin/meridian?env=${encodeURIComponent(fileEnv)}&format=file&name=${encodeURIComponent(name)}`;
    const desk = (format) =>
      `${urlPrefix}/api/admin/meridian?env=${encodeURIComponent(fileEnv)}&format=${encodeURIComponent(format)}`;
    parts.push(`
<section class="panel" data-section="actions" id="sec-actions">
  <div class="panel-head"><h2>One-command ops</h2><p>Stay in Meridian — no tab-hopping GSC / Bing / GA</p></div>
  <div class="cmd-grid">
    <code>npm run seo:report</code>
    <code>npm run meridian:oauth   ← one-time Google login (OAuth)</code>
    <code>npm run meridian:brief -- --theme forge --window 7</code>
    <code>Admin → SEO → Meridian → Generate SEO report</code>
  </div>
  <div class="links">
    <a class="btn primary" href="${desk('brief')}">This report</a>
    <a class="btn" href="${desk('growth')}">Growth Desk</a>
    <a class="btn" href="${arte('phase32-ops.html')}">Catalog</a>
    <a class="btn" href="${arte('phase31-ops.html')}">Steward</a>
    <a class="btn" href="${desk('cockpit')}">Ops cockpit</a>
    <a class="btn" href="${desk('digest')}">Weekly digest</a>
    <a class="btn" href="${desk('executive')}">Executive brief</a>
  </div>
</section>`);
  }

  parts.push(`
<footer>
  Generated ${esc(board.generatedAt)} · theme ${esc(t.id)} · secrets never embedded ·
  customize via <code>autopilot.commandBrief</code>
</footer>`);

  return `<!DOCTYPE html>
<html lang="en" data-theme="${esc(t.id)}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<title>${esc(config.title)} — ${esc(brand)}</title>
<style>
:root {
  --bg: ${t.bg}; --card: ${t.card}; --line: ${t.line}; --text: ${t.text};
  --muted: ${t.muted}; --accent: ${t.accent}; --accent2: ${t.accent2};
  --ok: ${t.ok}; --warn: ${t.warn}; --bad: ${t.bad}; --glow: ${t.glow};
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0;color:var(--text);font-family:"Segoe UI Variable","Segoe UI",system-ui,sans-serif;
  background:
    radial-gradient(900px 480px at 12% -8%, var(--glow), transparent 55%),
    radial-gradient(700px 400px at 92% 8%, rgba(56,189,248,0.08), transparent 50%),
    linear-gradient(180deg, #050a12 0%, var(--bg) 40%, #020508 100%);
  line-height:1.45;padding:1.5rem 1rem 3.5rem;
}
body.compact .table-wrap{font-size:.78rem}
body.compact td,body.compact th{padding:.28rem .4rem}
.wrap{max-width:1120px;margin:0 auto}
.hero{position:relative;border:1px solid var(--line);border-radius:18px;padding:1.4rem 1.5rem 1.1rem;margin-bottom:1rem;overflow:hidden;background:linear-gradient(135deg,rgba(8,18,28,.95),rgba(6,12,20,.7));animation:rise .7s ease both}
.hero-glow{position:absolute;inset:-40% 40% auto -20%;height:180px;background:radial-gradient(circle,var(--glow),transparent 70%);pointer-events:none;animation:pulse 6s ease-in-out infinite}
.hero-top{display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between;align-items:flex-start;position:relative}
.eyebrow{margin:0;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:700}
h1{margin:.25rem 0 .35rem;font-size:clamp(1.55rem,3vw,2.15rem);letter-spacing:-.03em;font-weight:700}
.sub{margin:0;color:var(--muted);font-size:.92rem}
.score-orb{min-width:140px;text-align:center;padding:.85rem 1rem;border-radius:16px;border:1px solid var(--line);background:rgba(0,0,0,.25);animation:rise .9s ease both}
.orb-label{display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)}
.orb-val{display:block;font-size:2rem;font-weight:800;color:var(--accent);line-height:1.1}
.orb-val small{font-size:1rem;margin-left:.25rem;color:var(--text)}
.orb-sub{display:block;margin-top:.2rem;font-size:.75rem;color:var(--muted)}
.kpi-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:.55rem;margin-top:1.1rem;position:relative}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.65rem .75rem;backdrop-filter:blur(8px);transition:transform .2s,border-color .2s}
.kpi:hover{transform:translateY(-2px);border-color:var(--accent)}
.kpi span{display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.kpi b{display:block;font-size:1.2rem;margin:.15rem 0}
.chip{display:inline-block;font-size:.68rem;font-weight:700;padding:.1rem .4rem;border-radius:999px;background:#122030}
.chip.ok{color:var(--ok);background:rgba(52,211,153,.12)}
.chip.bad{color:var(--bad);background:rgba(248,113,113,.12)}
.chip.muted{color:var(--muted)}
.panel{border:1px solid var(--line);border-radius:16px;padding:1.1rem 1.2rem;margin-bottom:.85rem;background:var(--card);backdrop-filter:blur(10px);animation:rise .6s ease both}
.panel.hidden{display:none}
.panel-head{margin-bottom:.75rem}
.panel-head h2{margin:0;font-size:1.05rem;letter-spacing:-.02em}
.panel-head p{margin:.2rem 0 0;color:var(--muted);font-size:.85rem}
.grid-2{display:grid;gap:.85rem;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.grid-3{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:.75rem}
.tile{border:1px solid var(--line);border-radius:12px;padding:.8rem .9rem;background:rgba(0,0,0,.18)}
.tile h3{margin:0;font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:600}
.tile b,.tile .status{display:block;margin-top:.25rem;font-size:1.15rem}
.tile p{margin:.35rem 0 0;color:var(--muted);font-size:.82rem}
.status.ok,.ok{color:var(--ok)}.status.warn,.warn{color:var(--warn)}.status.bad,.bad{color:var(--bad)}
.muted{color:var(--muted)}
.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:10px;margin:.4rem 0 .9rem}
table{width:100%;border-collapse:collapse;font-size:.84rem}
th,td{padding:.42rem .55rem;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{color:var(--muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.05em}
a{color:var(--accent2);text-decoration:none}a:hover{text-decoration:underline}
.subhead{margin:1rem 0 .4rem;font-size:.88rem;color:var(--accent)}
.insight-list{display:grid;gap:.55rem}
.insight{border:1px solid var(--line);border-radius:12px;padding:.75rem .9rem;background:rgba(0,0,0,.2)}
.insight.high{border-color:rgba(248,113,113,.35)}
.insight.medium{border-color:rgba(251,191,36,.28)}
.insight.ok{border-color:rgba(52,211,153,.28)}
.insight-meta{display:flex;gap:.5rem;align-items:center;margin-bottom:.25rem}
.pill{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:.12rem .4rem;border-radius:4px;background:#1a2836}
.pill.high{color:var(--bad)}.pill.medium{color:var(--warn)}.pill.ok,.pill.low{color:var(--ok)}
.owner{font-size:.7rem;color:var(--muted)}
.insight strong{display:block}.insight p{margin:.2rem 0 0;color:var(--muted);font-size:.84rem}
.findings{margin:0;padding-left:1.1rem}.findings li{margin:.35rem 0;font-size:.86rem}
.controls-row{display:flex;flex-wrap:wrap;gap:.85rem;align-items:flex-end}
.controls label{display:flex;flex-direction:column;gap:.3rem;font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.controls select{background:#0c1520;color:var(--text);border:1px solid var(--line);border-radius:8px;padding:.4rem .55rem}
.controls .check{flex-direction:row;align-items:center;text-transform:none;letter-spacing:0;font-size:.85rem;color:var(--text)}
.nav{display:flex;flex-wrap:wrap;gap:.3rem}
.nav-btn{border:1px solid var(--line);background:#101a26;color:var(--muted);border-radius:999px;padding:.25rem .55rem;font-size:.72rem;cursor:pointer}
.nav-btn:hover,.nav-btn.active{border-color:var(--accent);color:var(--accent)}
.btn{display:inline-block;margin:.2rem .35rem .2rem 0;padding:.45rem .75rem;border-radius:8px;border:1px solid var(--line);background:#122030;color:var(--text);font-weight:600;font-size:.8rem;text-decoration:none;cursor:pointer}
.btn.primary{background:var(--accent);color:#042014;border:0}
.cmd-grid{display:grid;gap:.4rem;margin-bottom:.75rem}
.cmd-grid code,.hint code,footer code{font-size:.78rem;background:#0c1520;padding:.35rem .55rem;border-radius:6px;border:1px solid var(--line);display:block}
.hint{font-size:.78rem;color:var(--muted)}
.mini{margin:0;font-size:.7rem;white-space:pre-wrap;color:var(--muted);max-height:4.5rem;overflow:hidden}
.empty{color:var(--muted);font-size:.86rem}
footer{margin-top:1.5rem;color:var(--muted);font-size:.78rem}
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{opacity:.55}50%{opacity:1}}
@media print{
  body{background:#fff;color:#111;padding:0}
  .hero,.panel{break-inside:avoid;border-color:#ccc;background:#fff;box-shadow:none}
  .controls,.hero-glow{display:none!important}
  a{color:#000;text-decoration:underline}
}
@media(max-width:640px){h1{font-size:1.45rem}.kpi b{font-size:1.05rem}}
</style>
</head>
<body>
<div class="wrap">
${parts.join('\n')}
</div>
<script>
(function(){
  var root=document.documentElement;
  var themes={
    aurora:{bg:'#03080f',card:'rgba(10,22,34,0.82)',line:'#1a3348',text:'#e6f0fa',muted:'#7a93a8',accent:'#2dd4bf',accent2:'#38bdf8',ok:'#34d399',warn:'#fbbf24',bad:'#f87171',glow:'rgba(45,212,191,0.18)'},
    forge:{bg:'#0a0806',card:'rgba(28,20,12,0.88)',line:'#3d2e1a',text:'#f5efe6',muted:'#a89070',accent:'#f59e0b',accent2:'#fb923c',ok:'#4ade80',warn:'#fbbf24',bad:'#f87171',glow:'rgba(245,158,11,0.16)'},
    glass:{bg:'#060a10',card:'rgba(14,20,30,0.75)',line:'#243044',text:'#e8eef8',muted:'#8899ae',accent:'#94a3b8',accent2:'#64748b',ok:'#6ee7b7',warn:'#fcd34d',bad:'#fca5a5',glow:'rgba(148,163,184,0.14)'}
  };
  function applyTheme(id){
    var t=themes[id]||themes.aurora;
    root.setAttribute('data-theme',id);
    var s=root.style;
    s.setProperty('--bg',t.bg);s.setProperty('--card',t.card);s.setProperty('--line',t.line);
    s.setProperty('--text',t.text);s.setProperty('--muted',t.muted);s.setProperty('--accent',t.accent);
    s.setProperty('--accent2',t.accent2);s.setProperty('--ok',t.ok);s.setProperty('--warn',t.warn);
    s.setProperty('--bad',t.bad);s.setProperty('--glow',t.glow);
    try{localStorage.setItem('meridian-brief-theme',id)}catch(e){}
  }
  var pick=document.getElementById('themePick');
  if(pick){
    try{var saved=localStorage.getItem('meridian-brief-theme');if(saved&&themes[saved]){pick.value=saved;applyTheme(saved)}}catch(e){}
    pick.addEventListener('change',function(){applyTheme(pick.value)});
  }
  var compact=document.getElementById('compactMode');
  if(compact){
    try{if(localStorage.getItem('meridian-brief-compact')==='1'){compact.checked=true;document.body.classList.add('compact')}}catch(e){}
    compact.addEventListener('change',function(){
      document.body.classList.toggle('compact',compact.checked);
      try{localStorage.setItem('meridian-brief-compact',compact.checked?'1':'0')}catch(e){}
    });
  }
  document.getElementById('printBtn')&&document.getElementById('printBtn').addEventListener('click',function(){window.print()});
  var active=null;
  document.querySelectorAll('.nav-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      var id=btn.getAttribute('data-section');
      if(active===id){
        active=null;
        document.querySelectorAll('.panel[data-section]').forEach(function(p){p.classList.remove('hidden')});
        document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('active')});
        return;
      }
      active=id;
      document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.toggle('active',b===btn)});
      document.querySelectorAll('.panel[data-section]').forEach(function(p){
        p.classList.toggle('hidden',p.getAttribute('data-section')!==id);
      });
      var el=document.getElementById('sec-'+id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
})();
</script>
</body>
</html>`;
}

/**
 * Unified SEO Command Brief — GSC + Bing + GA4 + Meridian artefacts → one customizable HTML report.
 */
export async function writeCommandBrief(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const config = resolveConfig(profile, opts);

  const [gsc, bing, ga4, report, catalog, steward, conversionJson, humanDebt, unlock, digest, growth] =
    await Promise.all([
      opts.gsc ||
        collectGsc(profile, {
          windowDays: config.windowDays,
          topN: config.topN,
          comparePrevious: config.comparePrevious,
        }),
      opts.bing || collectBing(profile, { topN: config.topN }),
      opts.ga4 ||
        collectGa4(profile).catch((e) => ({
          id: 'ga4',
          status: 'error',
          message: String(e.message || e),
          data: {},
        })),
      opts.report || readJson(resolve(outDir, 'report-latest.json')),
      opts.catalog || readJson(resolve(outDir, 'catalog-continuum.json')),
      readJson(resolve(outDir, 'silent-steward.json')),
      readJson(resolve(outDir, 'yield-apex.json')),
      readJson(resolve(outDir, 'human-debt.json')),
      readJson(resolve(outDir, 'unlock-readiness.json')),
      readJson(resolve(outDir, 'weekly-digest.json')),
      opts.growth || readJson(resolve(outDir, 'growth-desk.json')),
    ]);
  const liveVerify = opts.liveVerify || (await readJson(resolve(outDir, 'seo-live-verify.json')));
  const pagespeed = opts.pagespeed || null;

  const conversion = {
    enquiries: conversionJson?.enquiries ?? conversionJson?.enquiryCount ?? conversionJson?.total ?? null,
    yieldPct: conversionJson?.yieldPct ?? conversionJson?.yield ?? null,
    formOk: conversionJson?.formOk,
  };

  const findings = (report?.findings || [])
    .filter((f) => f.severity === 'critical' || f.severity === 'high' || f.severity === 'medium')
    .slice(0, 20);

  const insights = analyzeInsights({
    gsc,
    bing,
    ga4,
    report,
    catalog,
    conversion,
    humanDebt: humanDebt?.data || humanDebt,
    liveVerify,
    growth,
  });

  const gOk = gsc?.status === 'ok';
  const bOk = bing?.status === 'ok' || bing?.status === 'skipped';
  const briefOk = gOk || bOk;
  const briefStatus = !gOk && bing?.status === 'auth_required'
    ? 'AUTH GATES'
    : briefOk
      ? 'LIVE'
      : 'DEGRADED';

  const board = {
    generatedAt: new Date().toISOString(),
    phase: '33',
    config: {
      windowDays: config.windowDays,
      topN: config.topN,
      theme: config.theme.id,
      sections: config.sections,
      title: config.title,
    },
    briefStatus,
    scorecard: report?.scorecard || {},
    trend: report?.trend || null,
    gsc,
    bing,
    ga4,
    pagespeed,
    liveVerify,
    catalog,
    steward,
    conversion,
    growth: growth
      ? {
          opportunityCount: growth.opportunityCount ?? 0,
          cityTemplatesHeld: growth.cityTemplatesHeld ?? 0,
          reviewLink: growth.reviewLink || null,
          cityDraftPath: growth.cityDraftPath || null,
          nextActions: growth.nextActions || [],
        }
      : null,
    humanDebt: humanDebt?.data || humanDebt,
    unlock,
    digest: digest
      ? { remaining: digest.remaining?.length ?? digest.tasks?.length, message: digest.message }
      : null,
    findings,
    insights,
  };

  const html = buildHtml(profile, config, board);
  const md = [
    `# ${config.title} — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${board.generatedAt}`,
    `Window: ${config.windowDays}d · Theme: ${config.theme.id} · Status: **${briefStatus}**`,
    '',
    `## Totals`,
    '',
    `- GSC clicks: **${gsc?.data?.totals?.clicks ?? '—'}** · impressions: **${gsc?.data?.totals?.impressions ?? '—'}** · CTR: **${gsc?.data?.totals?.ctr != null ? (gsc.data.totals.ctr * 100).toFixed(1) + '%' : '—'}**`,
    `- Bing clicks (sample): **${bing?.data?.totals?.clicks ?? '—'}**`,
    `- Meridian score: **${board.scorecard?.overall ?? '—'} ${board.scorecard?.grade || ''}**`,
    `- Enquiries: **${conversion.enquiries ?? '—'}** · yield: **${conversion.yieldPct ?? '—'}%**`,
    '',
    `## Insights`,
    '',
    ...insights.map((i) => `- **[${i.severity}]** ${i.title} — ${i.detail}`),
    '',
    `Open **\`command-brief.html\`** for the full interactive report.`,
    '',
    `Customize: \`autopilot.commandBrief\` or \`npm run meridian:brief -- --theme forge --window 7\`.`,
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'command-brief.html'), html, 'utf8');
  await writeFile(resolve(outDir, 'command-brief.json'), JSON.stringify(board, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'command-brief.md'), md, 'utf8');

  // Alias for Admin "one spot" link
  await writeFile(resolve(outDir, 'seo-command-brief.html'), html, 'utf8');

  return {
    ok: briefOk || report?.scorecard != null,
    status: briefStatus === 'LIVE' ? 'ok' : briefStatus === 'AUTH GATES' ? 'auth_required' : 'degraded',
    message: `Command Brief · GSC ${gsc?.status} · Bing ${bing?.status} · ${insights.length} insights · ${config.windowDays}d`,
    data: {
      ...board,
      paths: {
        html: resolve(outDir, 'command-brief.html'),
        json: resolve(outDir, 'command-brief.json'),
        md: resolve(outDir, 'command-brief.md'),
      },
    },
    findings: insights
      .filter((i) => i.severity === 'high' || i.severity === 'medium')
      .map((i) => ({
        code: 'COMMAND_BRIEF_' + i.severity.toUpperCase(),
        severity: i.severity === 'high' ? 'high' : 'medium',
        title: i.title,
        remediation: i.detail,
        owner: i.owner === 'auto' ? 'developer' : i.owner,
        pillar: 'authority',
      })),
  };
}
