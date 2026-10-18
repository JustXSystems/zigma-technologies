import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { googleEnvStatus } from './google-auth.mjs';
import { fetchManual } from '../lib/html.mjs';

function envSet(k) {
  return !!(process.env[k] || '').trim();
}

/**
 * Phase 0 — guided onboarding HTML: GSC / Bing / GA4 / Meridian secrets with live status.
 */
export async function writePhase0Wizard(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  const origin = profile.origin.replace(/\/$/, '');
  const google = googleEnvStatus();
  const ga4Hint = profile.connectors?.ga4?.measurementIdHint || 'G-RFXQRYYX48';

  let liveGa4 = '';
  let sitemapOk = false;
  try {
    const home = await fetchManual(origin + '/', { forceBody: true });
    const m = (home.body || '').match(/G-[A-Z0-9]+/);
    liveGa4 = m ? m[0] : '';
    const sm = await fetchManual(origin + '/sitemap.xml');
    sitemapOk = sm.status >= 200 && sm.status < 400;
  } catch {
    /* offline */
  }

  let unlockPct = null;
  try {
    unlockPct = JSON.parse(await readFile(resolve(outDir, 'unlock-readiness.json'), 'utf8')).percent;
  } catch {
    /* optional */
  }

  const steps = [
    {
      id: 'gsc-verify',
      title: 'Verify domain in Google Search Console',
      who: 'You',
      doneHint: google.ok,
      url: 'https://search.google.com/search-console',
      how: [
        'Add domain property for zigma-technologies.com',
        'Add DNS TXT at BigRock as shown',
        'Submit sitemap: ' + origin + '/sitemap.xml',
      ],
    },
    {
      id: 'oauth',
      title: 'Set Meridian Google OAuth secrets (Developer)',
      who: 'Developer',
      doneHint: google.ok,
      url: null,
      how: [
        'Follow packages/meridian/SETUP.md Part A',
        'Run: node packages/meridian/scripts/google-oauth-setup.mjs',
        'Put MERIDIAN_GOOGLE_CLIENT_ID / SECRET / REFRESH_TOKEN in Production .env',
        'pm2 restart zigma --update-env',
      ],
      missing: google.missing,
    },
    {
      id: 'ga4',
      title: 'Confirm GA4 Realtime',
      who: 'You',
      doneHint: liveGa4 === ga4Hint && envSet('MERIDIAN_GA4_PROPERTY_ID'),
      url: 'https://analytics.google.com/',
      how: [
        `Snippet on site: ${liveGa4 || '(not found)'} — expect ${ga4Hint}`,
        'Set MERIDIAN_GA4_PROPERTY_ID to numeric Property ID (not G-…)',
        'Open Realtime while browsing the site',
      ],
    },
    {
      id: 'bing',
      title: 'Bing Webmaster — import from GSC',
      who: 'You',
      doneHint: envSet('MERIDIAN_BING_API_KEY'),
      url: 'https://www.bing.com/webmasters',
      how: [
        'Import site from Google Search Console',
        'Settings → API Access → create key → MERIDIAN_BING_API_KEY',
      ],
    },
    {
      id: 'social',
      title: 'Add social profile URLs in Site Settings',
      who: 'You',
      doneHint: false,
      url: origin + '/admin/site-settings',
      how: ['LinkedIn, Facebook, YouTube (after citations playbook)', 'Clears SCHEMA_SAMEAS / unlocks sameAs'],
    },
    {
      id: 'gbp',
      title: 'Start Google Business Profile verify',
      who: 'You',
      doneHint: false,
      url: 'https://business.google.com/',
      how: ['Use gbp-checklist.md NAP exactly', 'Start postcard/mail verification early'],
    },
  ];

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '0',
    origin,
    unlockPercent: unlockPct,
    liveGa4,
    ga4Hint,
    sitemapOk,
    googleOk: google.ok,
    steps,
  };

  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<title>Phase 0 unlock wizard — ${esc(profile.displayName || profile.id)}</title>
<style>
body{font-family:Segoe UI,system-ui,sans-serif;background:#0f1419;color:#e8eef5;margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:720px;margin:0 auto}
h1{font-size:1.5rem;margin:0 0 .35rem}
.sub{color:#8b9aab;margin-bottom:1.5rem}
.step{background:#1a222c;border:1px solid #2a3544;border-radius:10px;padding:1rem 1.1rem;margin:0 0 .75rem}
.step h2{font-size:1rem;margin:0 0 .4rem}
.badge{font-size:.7rem;font-weight:600;padding:.15rem .45rem;border-radius:4px;background:#243040;color:#8b9aab}
.badge.on{background:#1a3a2a;color:#3dd68c}
.badge.off{background:#3a2020;color:#f07178}
ol{margin:.4rem 0 0;padding-left:1.2rem}
a{color:#5b9fd4}
code{font-size:.85em;background:#243040;padding:.1rem .35rem;border-radius:3px}
</style></head><body><div class="wrap">
<h1>Phase 0 — Unlock wizard</h1>
<p class="sub">${esc(origin)} · unlock ${unlockPct != null ? unlockPct + '%' : '?'} · GA4 live <code>${esc(liveGa4 || '—')}</code> · sitemap ${sitemapOk ? 'OK' : '?'}</p>
${steps
  .map(
    (s, i) => `<div class="step">
  <h2>${i + 1}. ${esc(s.title)} <span class="badge ${s.doneHint ? 'on' : 'off'}">${s.doneHint ? 'ready' : 'todo'}</span></h2>
  <div class="sub">Who: ${esc(s.who)}${s.url ? ` · <a href="${esc(s.url)}" target="_blank" rel="noreferrer">Open</a>` : ''}</div>
  <ol>${(s.how || []).map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
  ${s.missing?.length ? `<p class="sub">Missing: <code>${esc(s.missing.join(', '))}</code></p>` : ''}
</div>`
  )
  .join('')}
<p class="sub">After secrets: Admin → SEO → Meridian → Run autopilot → GSC sitemap. Full detail: packages/meridian/SETUP.md</p>
</div></body></html>`;

  const md = [
    `# Phase 0 unlock wizard — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt} · unlock ${unlockPct ?? '?'}%`,
    '',
    ...steps.map(
      (s, i) =>
        `## ${i + 1}. ${s.title} ${s.doneHint ? '(ready)' : '(todo)'}\n\nWho: ${s.who}\n\n${(s.how || []).map((h) => `- ${h}`).join('\n')}\n`
    ),
  ].join('\n');

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'phase0-wizard.html'), html, 'utf8');
  await writeFile(resolve(outDir, 'phase0-wizard.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase0-wizard.json'), JSON.stringify(payload, null, 2), 'utf8');

  return {
    ok: true,
    status: google.ok ? 'ok' : 'degraded',
    message: `Phase 0 wizard written · Google OAuth ${google.ok ? 'set' : 'missing'} · GA4 snippet ${liveGa4 || '—'}`,
    data: { ...payload, paths: { html: resolve(outDir, 'phase0-wizard.html'), md: resolve(outDir, 'phase0-wizard.md') } },
    findings: [
      {
        code: 'PHASE0_WIZARD',
        severity: google.ok ? 'low' : 'medium',
        title: 'Phase 0 unlock wizard ready',
        remediation: 'Open phase0-wizard.html / follow SETUP.md — highest leverage for Meridian Act.',
        owner: 'developer',
        pillar: 'technical',
      },
    ],
  };
}
