import { writeFile, mkdir, readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { hydrateMeridianSecrets } from '../lib/hydrate-secrets.mjs';
import { googleEnvStatus, getGoogleAccessToken, googleFetch } from './google-auth.mjs';
import { assessUnlockReadiness } from './unlock-readiness.mjs';
import { advancePhase2 } from './phase2-advance.mjs';
import { advancePhase3 } from './phase3-advance.mjs';
import { submitSitemap, inspectPriorityUrls } from './gsc-act.mjs';
import { submitBingSitemap } from './bing-act.mjs';
import { writeIndexingQueue } from './indexing-queue.mjs';
import { runClosedLoop } from './closed-loop.mjs';
import { writeOgSharePack } from './og-share-pack.mjs';

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

function envSet(k) {
  return !!(process.env[k] || '').trim();
}

/**
 * Merge Desktop OAuth client_secret.json into unlock-secrets.json (never wipe refresh token).
 */
export async function syncClientSecretIntoUnlock(outDir) {
  const secretPath = resolve(outDir, 'client_secret.json');
  const unlockPath = resolve(outDir, 'unlock-secrets.json');
  if (!(await fileExists(secretPath))) {
    return { ok: true, status: 'skipped', message: 'No client_secret.json in outDir', synced: false };
  }
  let installed;
  try {
    const raw = JSON.parse(await readFile(secretPath, 'utf8'));
    installed = raw.installed || raw.web || raw;
  } catch (e) {
    return { ok: false, status: 'error', message: `client_secret.json unreadable: ${e.message}`, synced: false };
  }
  const clientId = installed.client_id;
  const clientSecret = installed.client_secret;
  if (!clientId || !clientSecret) {
    return { ok: false, status: 'error', message: 'client_secret.json missing client_id/secret', synced: false };
  }

  const prev = (await readJson(unlockPath)) || {};
  const next = {
    ...prev,
    MERIDIAN_GOOGLE_CLIENT_ID: clientId,
    MERIDIAN_GOOGLE_CLIENT_SECRET: clientSecret,
    _meta: {
      ...(prev._meta || {}),
      gcpProject: installed.project_id || prev._meta?.gcpProject,
      clientSecretSyncedAt: new Date().toISOString(),
      source: prev._meta?.source || 'phase10-sync',
    },
  };
  await mkdir(dirname(unlockPath), { recursive: true });
  await writeFile(unlockPath, JSON.stringify(next, null, 2), 'utf8');
  // Re-hydrate into process.env (fill gaps; do not override existing env)
  hydrateMeridianSecrets();
  if (!process.env.MERIDIAN_GOOGLE_CLIENT_ID) process.env.MERIDIAN_GOOGLE_CLIENT_ID = clientId;
  if (!process.env.MERIDIAN_GOOGLE_CLIENT_SECRET) process.env.MERIDIAN_GOOGLE_CLIENT_SECRET = clientSecret;

  return {
    ok: true,
    status: 'ok',
    message: 'Synced client_secret.json → unlock-secrets (id/secret)',
    synced: true,
    projectId: installed.project_id || null,
  };
}

async function probeConnectors(profile) {
  const probes = {
    googleToken: { ok: false, message: '' },
    gsc: { ok: false, message: '' },
    ga4: { ok: false, message: '' },
    bing: { ok: false, message: '' },
    psi: { ok: false, message: '' },
  };

  const google = googleEnvStatus();
  if (!google.ok) {
    probes.googleToken = { ok: false, message: `missing ${google.missing.join(', ')}` };
  } else {
    try {
      const t = await getGoogleAccessToken();
      probes.googleToken = { ok: true, message: `access token · expires ${t.expiresIn}s` };
      const siteUrl = profile.connectors?.gsc?.siteUrl || `sc-domain:${new URL(profile.origin).hostname}`;
      try {
        await googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}`);
        probes.gsc = { ok: true, message: `GSC property ${siteUrl}` };
      } catch (e) {
        probes.gsc = { ok: false, message: String(e.message || e) };
      }
      const prop = (process.env.MERIDIAN_GA4_PROPERTY_ID || '').trim();
      if (prop) {
        try {
          await googleFetch(
            `https://analyticsdata.googleapis.com/v1beta/properties/${prop}:runReport`,
            {
              method: 'POST',
              body: {
                dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
                metrics: [{ name: 'sessions' }],
                limit: 1,
              },
            }
          );
          probes.ga4 = { ok: true, message: `GA4 property ${prop}` };
        } catch (e) {
          probes.ga4 = { ok: false, message: String(e.message || e) };
        }
      } else {
        probes.ga4 = { ok: false, message: 'MERIDIAN_GA4_PROPERTY_ID unset' };
      }
    } catch (e) {
      probes.googleToken = { ok: false, message: String(e.message || e) };
    }
  }

  if (envSet('MERIDIAN_BING_API_KEY')) {
    probes.bing = { ok: true, message: 'API key present (submit on act)' };
  } else {
    probes.bing = { ok: false, message: 'MERIDIAN_BING_API_KEY unset' };
  }

  if (envSet('MERIDIAN_PSI_API_KEY')) {
    probes.psi = { ok: true, message: 'API key present' };
  } else {
    probes.psi = { ok: false, message: 'MERIDIAN_PSI_API_KEY unset' };
  }

  return probes;
}

async function probePsiLive(profile) {
  if (!envSet('MERIDIAN_PSI_API_KEY')) {
    return { ok: false, message: 'MERIDIAN_PSI_API_KEY unset' };
  }
  try {
    const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(profile.origin)}&strategy=mobile&category=performance&key=${encodeURIComponent(process.env.MERIDIAN_PSI_API_KEY)}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.lighthouseResult) {
      const score = Math.round((data.lighthouseResult.categories?.performance?.score || 0) * 100);
      return { ok: true, message: `PSI mobile home ${score}` };
    }
    return { ok: false, message: data.error?.message || `PSI HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, message: String(e.message || e) };
  }
}

function writeSchtasksXml(root, origin) {
  const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Set-Location '${root.replace(/'/g, "''")}'; if (Test-Path .env) { Get-Content .env | ForEach-Object { if ($_ -match '^(MERIDIAN_|DB_)=') { $k,$v=$_.Split('=',2); [Environment]::SetEnvironmentVariable($k,$v,'Process') } } }; node packages/meridian/bin/meridian.mjs autopilot --profile packages/meridian/profiles/zigma.prod.json"`;
  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Meridian SEO autopilot — weekly continuous ops for ${String(origin).replace(/[<>&]/g, '')}</Description>
    <URI>\\MeridianAutopilot</URI>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2026-10-20T09:00:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByWeek>
        <DaysOfWeek><Monday /></DaysOfWeek>
        <WeeksInterval>1</WeeksInterval>
      </ScheduleByWeek>
    </CalendarTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <ExecutionTimeLimit>PT45M</ExecutionTimeLimit>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>powershell.exe</Command>
      <Arguments>-NoProfile -ExecutionPolicy Bypass -File "${root}\\scripts\\meridian-cron.ps1"</Arguments>
      <WorkingDirectory>${root}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
<!-- Install (Admin PowerShell): schtasks /Create /TN "MeridianAutopilot" /XML "storage\\meridian\\zigma-prod\\phase10-schtasks.xml" /F
     Or use scripts/meridian-cron.ps1 directly. Cmd echo (unused): ${cmd.slice(0, 40)}… -->
`;
}

async function writeCronPs1(root) {
  const path = resolve(root, 'scripts', 'meridian-cron.ps1');
  const body = `# Meridian weekly autopilot (Windows). Paired with phase10-schtasks.xml / Task Scheduler.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$logDir = Join-Path $Root 'storage\\meridian'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'cron.log'
function Write-Log($m) { Add-Content -Path $log -Value ("[{0}] {1}" -f (Get-Date -Format o), $m) }
Write-Log "Meridian cron start @ $Root"
if (Test-Path (Join-Path $Root '.env')) {
  Get-Content (Join-Path $Root '.env') | ForEach-Object {
    if ($_ -match '^(MERIDIAN_|DB_|NEXT_PUBLIC_SITE_URL)=(.*)$') {
      Set-Item -Path "Env:$($matches[1])" -Value $matches[2].Trim('"')
    }
  }
}
# Prefer unlock-secrets via Meridian hydrate inside the binary
& node packages/meridian/bin/meridian.mjs autopilot --profile packages/meridian/profiles/zigma.prod.json
Write-Log "Meridian cron done exit=$LASTEXITCODE"
exit $LASTEXITCODE
`;
  await mkdir(dirname(path), { recursive: true });
  if (!(await fileExists(path))) {
    await writeFile(path, body, 'utf8');
    return { wrote: true, path };
  }
  // Refresh content so Phase 10 keeps the script modern
  await writeFile(path, body, 'utf8');
  return { wrote: true, path, refreshed: true };
}

async function trySyncGhSecrets(outDir) {
  const unlockPath = resolve(outDir, 'unlock-secrets.json');
  const secrets = await readJson(unlockPath);
  if (!secrets) return { ok: true, status: 'skipped', message: 'No unlock-secrets.json', synced: [] };

  const keys = [
    'MERIDIAN_GOOGLE_CLIENT_ID',
    'MERIDIAN_GOOGLE_CLIENT_SECRET',
    'MERIDIAN_GOOGLE_REFRESH_TOKEN',
    'MERIDIAN_GA4_PROPERTY_ID',
    'MERIDIAN_BING_API_KEY',
    'MERIDIAN_PSI_API_KEY',
    'MERIDIAN_WEBHOOK_URL',
  ].filter((k) => secrets[k]);

  if (!keys.length) return { ok: true, status: 'skipped', message: 'No keys to sync', synced: [] };

  const run = (args, input) =>
    new Promise((resolvePromise) => {
      const child = spawn('gh', args, { stdio: ['pipe', 'pipe', 'pipe'], shell: true });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => (stdout += d));
      child.stderr.on('data', (d) => (stderr += d));
      if (input != null) {
        child.stdin.write(String(input));
        child.stdin.end();
      }
      child.on('close', (code) => resolvePromise({ code, stdout, stderr }));
      child.on('error', (e) => resolvePromise({ code: 1, stdout: '', stderr: String(e.message || e) }));
    });

  const auth = await run(['auth', 'status']);
  if (auth.code !== 0) {
    return {
      ok: true,
      status: 'skipped',
      message: 'gh CLI not authenticated — skip GitHub secret sync (run gh auth login)',
      synced: [],
    };
  }

  const synced = [];
  const failed = [];
  for (const k of keys) {
    const r = await run(['secret', 'set', k], secrets[k]);
    if (r.code === 0) synced.push(k);
    else failed.push({ key: k, err: (r.stderr || r.stdout || 'failed').slice(0, 120) });
  }

  return {
    ok: failed.length === 0,
    status: failed.length ? 'degraded' : 'ok',
    message:
      failed.length === 0
        ? `Synced ${synced.length} secret(s) to GitHub Actions`
        : `Synced ${synced.length}; failed ${failed.length}`,
    synced,
    failed,
  };
}

/**
 * Phase 10 — Continuous unlock & production ops.
 * Activates OAuth connectors, recovers on-page score, runs GSC/Bing acts, schedules cron.
 */
export async function advancePhase10(profile, opts = {}) {
  hydrateMeridianSecrets();
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });
  const origin = String(profile.origin || '').replace(/\/$/, '');
  const root = process.cwd();
  const actions = [];

  const sync = await syncClientSecretIntoUnlock(outDir);
  actions.push({ id: 'sync-client-secret', ...sync });
  hydrateMeridianSecrets();

  const probes = await probeConnectors(profile);
  if (opts.skipAct !== true && opts.skipPsi !== true) {
    probes.psi = await probePsiLive(profile);
  }
  actions.push({
    id: 'connector-probes',
    ok: probes.googleToken.ok,
    status: probes.googleToken.ok ? 'ok' : 'auth_required',
    message: `Token ${probes.googleToken.ok ? 'ok' : 'fail'} · GSC ${probes.gsc.ok ? 'ok' : 'fail'} · GA4 ${probes.ga4.ok ? 'ok' : 'fail'}`,
    data: probes,
  });

  const wantApply = opts.apply !== false;

  let phase2 = { ok: true, message: 'phase2 skipped', data: {} };
  let phase3 = { ok: true, message: 'phase3 skipped', data: {} };
  if (wantApply) {
    phase2 = await advancePhase2(profile, { outDir, apply: true, force: !!opts.force });
    actions.push({ id: 'phase2-advance', ...phase2 });
    phase3 = await advancePhase3(profile, { outDir, apply: true, applyAlt: true, force: !!opts.force });
    actions.push({ id: 'phase3-advance', ...phase3 });
  }

  const og = await writeOgSharePack(profile, { outDir });
  actions.push({ id: 'og-share-pack', ...og });

  let gscSubmit = { ok: true, status: 'skipped', message: 'GSC skipped' };
  let gscInspect = { ok: true, status: 'skipped', message: 'inspect skipped' };
  let bing = { ok: true, status: 'skipped', message: 'Bing skipped' };
  let indexQ = { ok: true, status: 'skipped', message: 'indexing queue skipped' };

  if (opts.skipAct !== true && googleEnvStatus().ok && profile.indexable) {
    gscSubmit = await submitSitemap(profile);
    actions.push({ id: 'submit-sitemap', ...gscSubmit });
    gscInspect = await inspectPriorityUrls(profile, { limit: opts.inspectLimit ?? profile.autopilot?.inspectLimit ?? 5 });
    actions.push({ id: 'inspect-priority', ...gscInspect });
    indexQ = await writeIndexingQueue(profile, { outDir, skipInspect: false });
    actions.push({ id: 'indexing-queue', ...indexQ });
  }

  if (opts.skipAct !== true && envSet('MERIDIAN_BING_API_KEY') && profile.indexable) {
    bing = await submitBingSitemap(profile);
    actions.push({ id: 'bing-submit-sitemap', ...bing });
  }

  let loop = { ok: true, status: 'skipped', message: 'Closed-loop skipped', data: { improved: false } };
  if (opts.skipAct !== true && opts.skipLoop !== true) {
    loop = await runClosedLoop(profile, { outDir });
  }
  actions.push({ id: 'closed-loop', ...loop });

  const unlock = await assessUnlockReadiness(profile, { outDir });
  actions.push({ id: 'unlock-readiness', ...unlock });

  const cronPs1 = await writeCronPs1(root);
  const schtasksXml = writeSchtasksXml(root, origin);
  await writeFile(resolve(outDir, 'phase10-schtasks.xml'), schtasksXml, 'utf8');

  let ghSync = { ok: true, status: 'skipped', message: 'gh sync skipped', synced: [] };
  if (opts.syncGh === true || process.env.MERIDIAN_SYNC_GH_SECRETS === '1') {
    ghSync = await trySyncGhSecrets(outDir);
  }
  actions.push({ id: 'gh-secret-sync', ...ghSync });

  // Convenience: keep a non-secret pointer file for ops
  await writeFile(
    resolve(outDir, 'phase10-continuous.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        unlockPercent: unlock.data?.percent,
        probes: Object.fromEntries(Object.entries(probes).map(([k, v]) => [k, { ok: v.ok, message: v.message }])),
        gsc: gscSubmit.message,
        bing: bing.message,
        cron: { ps1: cronPs1.path, schtasks: resolve(outDir, 'phase10-schtasks.xml') },
        githubWorkflow: '.github/workflows/meridian-autopilot.yml',
        humanLeft: (unlock.data?.nextUnlock || []).map((n) => n.id),
      },
      null,
      2
    ),
    'utf8'
  );

  const probeRows = Object.entries(probes)
    .map(
      ([k, v]) =>
        `<tr><td>${esc(k)}</td><td class="${v.ok ? 'ok' : 'bad'}">${v.ok ? 'OK' : 'FAIL'}</td><td>${esc(v.message)}</td></tr>`
    )
    .join('');

  const humanLeft = unlock.data?.nextUnlock || [];
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 10 Continuous Ops — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#060a0f;--card:#101820;--line:#243041;--text:#e8eef5;--muted:#8b9aab;--accent:#2dd4bf;--ok:#3dd68c;--bad:#f07178}
*{box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(800px 420px at 10% -10%,#163028,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:960px;margin:0 auto}h1{margin:0 0 .25rem;font-size:1.55rem;letter-spacing:-.02em}.sub{color:var(--muted);margin:0 0 1.2rem}
.hero{display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:1rem}
.metric{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem}.metric b{display:block;font-size:1.3rem;margin-top:.15rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1rem;margin-bottom:.75rem}
a.primary{display:inline-block;margin:.2rem .35rem .2rem 0;padding:.5rem .85rem;border-radius:8px;background:var(--accent);color:#042018;font-weight:650;text-decoration:none;font-size:.84rem}
table{width:100%;border-collapse:collapse;font-size:.86rem}td,th{padding:.4rem .35rem;border-bottom:1px solid var(--line);text-align:left}
.ok{color:var(--ok)}.bad{color:var(--bad)}ul{margin:.4rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
code{font-size:.8rem;background:#1a2636;padding:.1rem .35rem;border-radius:4px}
</style></head><body><div class="wrap">
<h1>Phase 10 — Continuous unlock &amp; ops</h1>
<p class="sub">${esc(origin)} · connectors live-probed · GSC/Bing acts · score recovery · scheduled autopilot</p>
<div class="hero">
  <div class="metric"><span class="sub">Unlock</span><b class="${(unlock.data?.percent ?? 0) >= 70 ? 'ok' : 'bad'}">${esc(unlock.data?.percent ?? '—')}%</b></div>
  <div class="metric"><span class="sub">Google token</span><b class="${probes.googleToken.ok ? 'ok' : 'bad'}">${probes.googleToken.ok ? 'LIVE' : 'DOWN'}</b></div>
  <div class="metric"><span class="sub">GSC act</span><b>${esc(gscSubmit.status || (gscSubmit.ok ? 'ok' : '—'))}</b></div>
  <div class="metric"><span class="sub">Closed-loop</span><b>${loop.data?.improved ? '↑' : '·'}</b></div>
</div>
<div class="card">
  <a class="primary" href="phase9-ops.html">Phase 9 command center</a>
  <a class="primary" href="ops-cockpit.html">Ops cockpit</a>
  <a class="primary" href="unlock-readiness.md">Unlock readiness</a>
  <a class="primary" href="phase10-schtasks.xml">Windows Task XML</a>
  <a class="primary" href="${esc(origin)}/admin" target="_blank" rel="noreferrer">Admin</a>
</div>
<div class="card"><h2 style="margin:0 0 .5rem;font-size:.95rem">Connector probes</h2>
<table><thead><tr><th>Probe</th><th>Status</th><th>Detail</th></tr></thead><tbody>${probeRows}</tbody></table>
</div>
<div class="card"><h2 style="margin:0 0 .5rem;font-size:.95rem">Automated this run</h2>
<ul>
<li>${esc(sync.message)}</li>
<li>${esc(phase2.message)}</li>
<li>${esc(phase3.message)}</li>
<li>${esc(gscSubmit.message)} · ${esc(gscInspect.message)}</li>
<li>${esc(bing.message)}</li>
<li>${esc(loop.message)}</li>
<li>${esc(ghSync.message)}</li>
<li>Windows cron: <code>scripts/meridian-cron.ps1</code> + schtasks XML · GitHub: <code>meridian-autopilot.yml</code> (Mondays)</li>
</ul></div>
<div class="card"><h2 style="margin:0 0 .5rem;font-size:.95rem">Still human (minimized)</h2>
<ul>
${
  humanLeft.length
    ? humanLeft.map((h) => `<li><strong>${esc(h.label)}</strong> — ${esc(h.howTo)}</li>`).join('')
    : '<li class="ok">All measured unlock gates green. GBP verify + weekly 15‑min routine remain the only ongoing human work.</li>'
}
<li>Import <code>phase9-routine.ics</code> if not already · GBP claim/verify (Phase 5) when ready</li>
<li>Production deploy still required for live HTML that is code-owned (hours schema, hub SEO)</li>
</ul></div>
</div></body></html>`;

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '10',
    unlockPercent: unlock.data?.percent ?? null,
    unlockGrade: unlock.data?.grade ?? null,
    probes,
    sync: { message: sync.message, synced: sync.synced },
    phase2: { message: phase2.message, sameAsCount: phase2.data?.sameAsCount },
    phase3: { message: phase3.message },
    gsc: { submit: gscSubmit.message, inspect: gscInspect.message, status: gscSubmit.status },
    bing: { message: bing.message, status: bing.status },
    closedLoop: { message: loop.message, improved: loop.data?.improved },
    ghSync: { message: ghSync.message, synced: ghSync.synced || [] },
    cron: { ps1: cronPs1.path, schtasks: resolve(outDir, 'phase10-schtasks.xml') },
    humanLeft: humanLeft.map((h) => ({ id: h.id, label: h.label })),
  };

  const md = [
    `# Phase 10 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `- Unlock: **${payload.unlockPercent ?? '—'}%** (${payload.unlockGrade ?? '—'})`,
    `- ${sync.message}`,
    `- Connectors: token ${probes.googleToken.ok ? 'ok' : 'fail'} · GSC ${probes.gsc.ok ? 'ok' : 'fail'} · GA4 ${probes.ga4.ok ? 'ok' : 'fail'} · PSI ${probes.psi.ok ? 'ok' : 'fail'}`,
    `- ${phase2.message}`,
    `- ${phase3.message}`,
    `- GSC: ${gscSubmit.message}`,
    `- Bing: ${bing.message}`,
    `- ${loop.message}`,
    `- ${ghSync.message}`,
    '',
    'Open **`phase10-ops.html`**. Schedule: GitHub Action Mondays + `scripts/meridian-cron.ps1` / VPS `meridian-cron.sh`.',
    '',
    '## Human left',
    '',
    ...humanLeft.map((h) => `- [ ] ${h.label} — ${h.howTo}`),
    humanLeft.length ? '' : '- [x] Measured unlock gates complete',
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'phase10-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase10-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase10-ops.html'), html, 'utf8');

  // Refresh phase matrix if present
  const matrixPath = resolve(outDir, 'phase-matrix.json');
  const matrixDoc = (await readJson(matrixPath)) || { matrix: [] };
  const packs = [
    ...(matrixDoc.matrix || []).filter((m) => m.id !== '10'),
    { id: '10', name: 'Phase 10 Continuous', file: 'phase10-ops.html', kind: 'html', ready: true, href: 'phase10-ops.html' },
  ];
  await writeFile(matrixPath, JSON.stringify({ generatedAt: payload.generatedAt, matrix: packs }, null, 2), 'utf8');

  const criticalFail = !probes.googleToken.ok;
  return {
    ok: !criticalFail,
    status: criticalFail ? 'auth_required' : humanLeft.filter((h) => h.id !== 'webhook').length ? 'degraded' : 'ok',
    message: `Phase 10 continuous ops · unlock ${payload.unlockPercent ?? '—'}% · GSC ${gscSubmit.ok ? 'ok' : gscSubmit.status} · probes ${Object.values(probes).filter((p) => p.ok).length}/5`,
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase10-ops.html'),
        md: resolve(outDir, 'phase10-advance.md'),
        schtasks: resolve(outDir, 'phase10-schtasks.xml'),
        cronPs1: cronPs1.path,
      },
      actions,
    },
    findings: [
      {
        code: 'PHASE10_CONTINUOUS',
        severity: 'low',
        title: 'Phase 10 continuous unlock & ops pack ready',
        remediation:
          'Keep GitHub Meridian autopilot + VPS/Windows cron on; open phase10-ops.html; finish optional webhook + live sameAs via deploy.',
        owner: 'developer',
        pillar: 'ops',
      },
      ...(!probes.googleToken.ok
        ? [
            {
              code: 'PHASE10_AUTH',
              severity: 'high',
              title: 'Google OAuth token probe failed',
              remediation: 'Re-sync client_secret.json and refresh token via unlock-bootstrap / google-oauth-setup',
              owner: 'developer',
              pillar: 'technical',
            },
          ]
        : []),
    ],
  };
}
