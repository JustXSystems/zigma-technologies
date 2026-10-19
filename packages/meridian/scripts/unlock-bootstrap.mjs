#!/usr/bin/env node
/**
 * Meridian unlock bootstrap — automate Google SEO connector setup after login.
 *
 * Why not plain `gcloud auth application-default login --scopes=webmasters`?
 * Google Workspace often blocks Google's default ADC OAuth client for those
 * scopes ("Access blocked"). We use YOUR Desktop OAuth client instead.
 *
 * What YOU do:
 *   1) Approve gcloud browser login (Cloud APIs)
 *   2) Once: create Desktop OAuth client in Cloud Console (script opens the page)
 *   3) Approve Meridian consent (Search Console + GA4) — your app, not Google's ADC
 *   4) Optional: paste Bing API key
 *
 * What this script does:
 *   1) Ensure gcloud CLI + auth login
 *   2) Select/create GCP project, enable APIs
 *   3) Obtain MERIDIAN_GOOGLE_* via Desktop client + local OAuth
 *   4) Discover GA4 property ID (prefers G-RFXQRYYX48)
 *   5) Create PageSpeed API key
 *   6) Write unlock-secrets.json + optional apply to Production
 *   7) Run unlock-verify [--act]
 *
 * Usage:
 *   node packages/meridian/scripts/unlock-bootstrap.mjs
 *   node packages/meridian/scripts/unlock-bootstrap.mjs --apply-prod
 *   node packages/meridian/scripts/unlock-bootstrap.mjs --skip-login --apply-prod --skip-bing
 *   node packages/meridian/scripts/unlock-bootstrap.mjs --client-id-file=./client_secret.json
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
process.chdir(ROOT);

const PROJECT_ID = (
  process.env.MERIDIAN_GCP_PROJECT ||
  'zigma-technologies-512012-m3'
).replace(/[^a-z0-9-]/g, '-').slice(0, 30);
const GA4_HINT = process.env.MERIDIAN_GA4_MEASUREMENT_HINT || 'G-RFXQRYYX48';
const ORIGIN = 'https://zigma-technologies.com';
const SKIP_LOGIN = process.argv.includes('--skip-login');
const APPLY_PROD = process.argv.includes('--apply-prod');
const SKIP_VERIFY = process.argv.includes('--skip-verify');
const SKIP_BING = process.argv.includes('--skip-bing');
const CLIENT_ID_FILE_ARG = process.argv.find((a) => a.startsWith('--client-id-file='));
const CLIENT_ID_FILE = CLIENT_ID_FILE_ARG
  ? CLIENT_ID_FILE_ARG.slice('--client-id-file='.length)
  : process.env.MERIDIAN_CLIENT_ID_FILE || '';
const OAUTH_PORT = Number(process.env.MERIDIAN_OAUTH_PORT || 8765);
// Desktop clients from Cloud Console ship redirect_uris: ["http://localhost"] — use localhost, not 127.0.0.1
const OAUTH_REDIRECT = `http://localhost:${OAUTH_PORT}/callback`;
const MERIDIAN_SCOPES = [
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/analytics.readonly',
].join(' ');

const results = [];
function step(id, status, detail) {
  results.push({ id, status, detail, at: new Date().toISOString() });
  const tag = status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : status === 'warn' ? 'WARN' : 'INFO';
  console.log(`\n[${tag}] ${id}\n      ${detail}`);
}

function findGcloud() {
  const candidates = [
    join(homedir(), 'AppData', 'Local', 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd'),
    join(homedir(), 'google-cloud-sdk', 'bin', 'gcloud.cmd'),
    join('C:\\', 'Program Files (x86)', 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd'),
    join('C:\\', 'Program Files', 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd'),
    join(homedir(), 'google-cloud-sdk', 'bin', 'gcloud'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  const which = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['gcloud'], {
    encoding: 'utf8',
    shell: true,
  });
  if (which.status === 0 && which.stdout.trim()) {
    // Prefer .cmd on Windows (bare "gcloud" from where is often a no-ext shim).
    const lines = which.stdout.trim().split(/\r?\n/).filter(Boolean);
    return lines.find((l) => /\.cmd$/i.test(l)) || lines[0];
  }
  return null;
}

/** Put SDK bin on PATH and invoke bare gcloud.cmd — avoids spaced-path + .cmd spawn bugs. */
function gcloudEnv(gcloudPath) {
  const bin = dirname(gcloudPath);
  const pathKey = process.env.Path !== undefined ? 'Path' : 'PATH';
  const cur = process.env[pathKey] || '';
  return {
    ...process.env,
    [pathKey]: cur.toLowerCase().includes(bin.toLowerCase()) ? cur : `${bin};${cur}`,
  };
}

function gcloudCmd() {
  return process.platform === 'win32' ? 'gcloud.cmd' : 'gcloud';
}

function runGcloud(gcloudPath, args, opts = {}) {
  const env = gcloudEnv(gcloudPath);
  // Windows: shell true + bare gcloud.cmd (no spaces in command name). Never pass full spaced path as command.
  const r = spawnSync(gcloudCmd(), args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    windowsHide: false,
    stdio: opts.inherit ? 'inherit' : 'pipe',
    env,
  });
  return {
    ok: r.status === 0,
    status: r.status,
    stdout: (r.stdout || '').trim(),
    stderr: (r.stderr || '').trim(),
  };
}

async function runGcloudInteractive(gcloudPath, args) {
  return new Promise((resolvePromise) => {
    const child = spawn(gcloudCmd(), args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      windowsHide: false,
      env: gcloudEnv(gcloudPath),
    });
    child.on('error', () => resolvePromise(false));
    child.on('close', (code) => resolvePromise(code === 0));
  });
}

function adcPath() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (process.platform === 'win32') {
    return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'gcloud', 'application_default_credentials.json');
  }
  return join(homedir(), '.config', 'gcloud', 'application_default_credentials.json');
}

function readAdc() {
  const p = adcPath();
  if (!existsSync(p)) return null;
  try {
    return { path: p, ...JSON.parse(readFileSync(p, 'utf8')) };
  } catch {
    return null;
  }
}

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolvePromise) => {
    rl.question(question, (ans) => {
      rl.close();
      resolvePromise(String(ans || '').trim());
    });
  });
}

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      // cmd `start` splits on bare `&` in query strings → Google sees missing response_type.
      // Quote the URL; empty title arg ("") is required so start does not treat the URL as a title.
      spawnSync('cmd.exe', ['/c', 'start', '""', `"${url}"`], {
        shell: false,
        stdio: 'ignore',
        windowsVerbatimArguments: true,
      });
    } else if (process.platform === 'darwin') {
      spawnSync('open', [url], { stdio: 'ignore' });
    } else {
      spawnSync('xdg-open', [url], { stdio: 'ignore' });
    }
  } catch {
    /* ignore */
  }
}

function parseClientIdFile(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    const installed = raw.installed || raw.web || raw;
    const clientId = installed.client_id || raw.client_id;
    const clientSecret = installed.client_secret || raw.client_secret;
    if (clientId && clientSecret) return { clientId, clientSecret, path: filePath };
  } catch {
    /* ignore */
  }
  return null;
}

function loadExistingMeridianSecrets() {
  const fromEnv = {
    clientId: (process.env.MERIDIAN_GOOGLE_CLIENT_ID || '').trim(),
    clientSecret: (process.env.MERIDIAN_GOOGLE_CLIENT_SECRET || '').trim(),
    refreshToken: (process.env.MERIDIAN_GOOGLE_REFRESH_TOKEN || '').trim(),
  };
  if (fromEnv.clientId && fromEnv.clientSecret && fromEnv.refreshToken) {
    return { ...fromEnv, source: 'env' };
  }
  const secretsPath = resolve(ROOT, 'storage/meridian/zigma-prod/unlock-secrets.json');
  if (existsSync(secretsPath)) {
    try {
      const j = JSON.parse(readFileSync(secretsPath, 'utf8'));
      if (j.MERIDIAN_GOOGLE_CLIENT_ID && j.MERIDIAN_GOOGLE_CLIENT_SECRET && j.MERIDIAN_GOOGLE_REFRESH_TOKEN) {
        // Reject Google's built-in ADC clients — they cannot hold webmasters permanently for Meridian
        if (!String(j.MERIDIAN_GOOGLE_CLIENT_ID).startsWith('32555940559') &&
            !String(j.MERIDIAN_GOOGLE_CLIENT_ID).startsWith('764086051850')) {
          return {
            clientId: j.MERIDIAN_GOOGLE_CLIENT_ID,
            clientSecret: j.MERIDIAN_GOOGLE_CLIENT_SECRET,
            refreshToken: j.MERIDIAN_GOOGLE_REFRESH_TOKEN,
            ga4PropertyId: j.MERIDIAN_GA4_PROPERTY_ID,
            psiKey: j.MERIDIAN_PSI_API_KEY,
            bingKey: j.MERIDIAN_BING_API_KEY,
            source: 'unlock-secrets.json',
          };
        }
      }
    } catch {
      /* ignore */
    }
  }
  return fromEnv.clientId && fromEnv.clientSecret
    ? { ...fromEnv, source: 'env-partial' }
    : null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function promptDesktopClient(project) {
  const dropPath = resolve(ROOT, 'storage/meridian/zigma-prod/client_secret.json');
  const candidates = () =>
    [
      CLIENT_ID_FILE,
      dropPath,
      resolve(ROOT, 'storage/meridian/zigma-prod/clientid.json'),
      resolve(ROOT, 'client_secret.json'),
    ].filter(Boolean);

  for (const p of candidates()) {
    const parsed = parseClientIdFile(p);
    if (parsed) {
      step('oauth_client', 'pass', `Loaded Desktop client from ${parsed.path}`);
      return { clientId: parsed.clientId, clientSecret: parsed.clientSecret };
    }
  }

  const createUrl = `https://console.cloud.google.com/auth/clients/create?project=${project}`;
  console.log(`
── Create Meridian Desktop OAuth client (one-time) ──
Google blocked the default Cloud SDK login for Search Console scopes.
Fix: use YOUR project's Desktop OAuth client (Internal consent = org users only).

In the browser tabs that open:
  1. OAuth consent: User type = Internal (justxsystems.com Workspace)
  2. Clients → Create → Application type: Desktop app → Name: Meridian Desktop
  3. Download JSON (or copy Client ID + secret into the file below)

Save / rename the download to exactly:
  ${dropPath}

Waiting up to 15 minutes for that file…
(Or paste Client ID / Secret when prompted below.)
`);
  openBrowser(`https://console.cloud.google.com/apis/credentials/consent?project=${project}`);
  openBrowser(createUrl);

  const deadline = Date.now() + 15 * 60 * 1000;
  let lastLog = 0;
  while (Date.now() < deadline) {
    for (const p of candidates()) {
      const parsed = parseClientIdFile(p);
      if (parsed) {
        step('oauth_client', 'pass', `Loaded Desktop client from ${parsed.path}`);
        return { clientId: parsed.clientId, clientSecret: parsed.clientSecret };
      }
    }
    if (Date.now() - lastLog > 30000) {
      console.log(`…still waiting for ${dropPath}`);
      lastLog = Date.now();
    }
    await sleep(4000);
  }
  throw new Error(`Timed out waiting for ${dropPath}`);
}

/** Local OAuth for Meridian scopes using the project's Desktop client (not Google ADC). */
function runMeridianOAuth(clientId, clientSecret) {
  return new Promise((resolvePromise, reject) => {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', OAUTH_REDIRECT);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', MERIDIAN_SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    console.log('\n── Browser login: Meridian (Search Console + GA4) ──');
    console.log('Sign in with the same company account that owns GSC / GA4.');
    console.log('If Google says the app is unverified: Advanced → Go to Meridian SEO (unsafe).\n');

    const server = createServer(async (req, res) => {
      try {
        const u = new URL(req.url, OAUTH_REDIRECT);
        if (u.pathname !== '/callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const err = u.searchParams.get('error');
        const code = u.searchParams.get('code');
        if (err) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end(`OAuth error: ${err}`);
          server.close();
          reject(new Error(`OAuth error: ${err}`));
          return;
        }
        if (!code) {
          res.writeHead(400);
          res.end('Missing code');
          return;
        }
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: OAUTH_REDIRECT,
            grant_type: 'authorization_code',
          }),
        });
        const tokens = await tokenRes.json();
        if (!tokenRes.ok || !tokens.refresh_token) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(tokens, null, 2));
          server.close();
          reject(new Error(tokens.error_description || tokens.error || 'No refresh_token — revoke Meridian access and retry'));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Meridian connected</h1><p>You can close this tab and return to the terminal.</p>');
        server.close();
        resolvePromise(tokens.refresh_token);
      } catch (e) {
        try {
          res.writeHead(500);
          res.end(String(e));
        } catch {
          /* ignore */
        }
        server.close();
        reject(e);
      }
    });

    server.on('error', reject);
    server.listen(OAUTH_PORT, '127.0.0.1', () => {
      openBrowser(authUrl.toString());
      console.log(`Listening on ${OAUTH_REDIRECT}`);
      console.log('If the browser did not open, paste this URL:\n');
      console.log(authUrl.toString());
      console.log('');
    });
  });
}

async function googleFetch(accessToken, url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || data?.error_description || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function refreshAccessToken(clientId, clientSecret, refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'token refresh failed');
  }
  return data.access_token;
}

async function discoverGa4PropertyId(accessToken) {
  // Analytics Admin API — account summaries
  const sum = await googleFetch(
    accessToken,
    'https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200'
  );
  const accounts = sum.accountSummaries || [];
  const candidates = [];
  for (const a of accounts) {
    for (const p of a.propertySummaries || []) {
      const propName = p.property; // properties/123456789
      const id = String(propName || '').replace(/^properties\//, '');
      if (!id) continue;
      candidates.push({ id, displayName: p.displayName, property: propName });
    }
  }
  // Prefer property that has our measurement ID stream
  for (const c of candidates) {
    try {
      const streams = await googleFetch(
        accessToken,
        `https://analyticsadmin.googleapis.com/v1beta/${c.property}/dataStreams`
      );
      const hit = (streams.dataStreams || []).some(
        (s) => s.webStreamData?.measurementId === GA4_HINT || s.webStreamData?.measurementId?.includes('RFXQRYYX48')
      );
      if (hit) return { ...c, matchedMeasurementId: GA4_HINT };
    } catch {
      /* try next */
    }
  }
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    console.log('\nMultiple GA4 properties found:');
    candidates.forEach((c, i) => console.log(`  ${i + 1}. ${c.displayName} (${c.id})`));
    const pick = await ask('Enter property number (or paste numeric Property ID): ');
    if (/^\d+$/.test(pick) && Number(pick) <= candidates.length) return candidates[Number(pick) - 1];
    if (/^\d{6,}$/.test(pick)) return { id: pick, displayName: '(manual)' };
  }
  return null;
}

async function main() {
  console.log('\n═══ Meridian unlock bootstrap ═══');
  console.log('You only need to approve browser logins. Everything else is automated.\n');

  let gcloud = findGcloud();
  if (!gcloud) {
    step('gcloud', 'fail', 'Google Cloud SDK not found. Install is in progress or run: winget install Google.CloudSDK');
    console.log(`
Install Cloud SDK, then re-run:
  winget install --id Google.CloudSDK -e
  # close/reopen terminal, then:
  npm run meridian:unlock
`);
    writeResults();
    process.exit(2);
  }
  step('gcloud', 'pass', `Found ${gcloud}`);

  // Login (Cloud only — do NOT request webmasters on Google's ADC client; Workspace blocks it)
  if (!SKIP_LOGIN) {
    console.log('\n── Browser login #1: Google Cloud (gcloud) ──');
    console.log('Sign in with the COMPANY Google account that owns Search Console / GA4.\n');
    const ok1 = await runGcloudInteractive(gcloud, ['auth', 'login', '--update-adc', '--brief']);
    if (!ok1) {
      const ok1b = await runGcloudInteractive(gcloud, ['auth', 'login']);
      if (!ok1b) {
        step('auth_login', 'fail', 'gcloud auth login failed or cancelled');
        writeResults();
        process.exit(1);
      }
    }
    step('auth_login', 'pass', 'gcloud auth login completed');
  } else {
    step('auth_login', 'info', 'Skipped (--skip-login) — using existing gcloud credentials');
  }

  // Project + APIs
  let project = PROJECT_ID;
  const listProj = runGcloud(gcloud, ['projects', 'list', '--format=value(projectId)', `--filter=projectId:${PROJECT_ID}`]);
  if (!listProj.stdout.includes(PROJECT_ID)) {
    console.log(`\nCreating GCP project ${PROJECT_ID}…`);
    const created = runGcloud(gcloud, ['projects', 'create', PROJECT_ID, `--name=Zigma Meridian`]);
    if (!created.ok && !/alreadyExists|already exists/i.test(created.stderr + created.stdout)) {
      // try with random suffix
      project = `${PROJECT_ID}-${Math.floor(Math.random() * 9000 + 1000)}`.slice(0, 30);
      const created2 = runGcloud(gcloud, ['projects', 'create', project, `--name=Zigma Meridian`]);
      if (!created2.ok) {
        step('gcp_project', 'warn', `Could not create project (${created.stderr || created2.stderr}). Using existing active project.`);
        const cfg = runGcloud(gcloud, ['config', 'get-value', 'project']);
        project = cfg.stdout || project;
      } else {
        step('gcp_project', 'pass', `Created project ${project}`);
      }
    } else {
      step('gcp_project', 'pass', `Project ${PROJECT_ID} ready`);
    }
  } else {
    step('gcp_project', 'pass', `Project ${PROJECT_ID} already exists`);
  }
  runGcloud(gcloud, ['config', 'set', 'project', project]);

  const apis = [
    'searchconsole.googleapis.com',
    'analyticsdata.googleapis.com',
    'analyticsadmin.googleapis.com',
    'pagespeedonline.googleapis.com',
    'siteverification.googleapis.com',
  ];
  for (const api of apis) {
    const en = runGcloud(gcloud, ['services', 'enable', api, `--project=${project}`]);
    step(`api_${api.split('.')[0]}`, en.ok ? 'pass' : 'warn', en.ok ? `Enabled ${api}` : en.stderr || 'enable warning');
  }

  // Meridian OAuth (YOUR Desktop client) — Google's ADC client is blocked for these scopes on Workspace
  let meridianCreds = loadExistingMeridianSecrets();
  if (meridianCreds?.refreshToken && meridianCreds?.clientId && meridianCreds?.clientSecret) {
    step('meridian_oauth', 'pass', `Reusing Meridian credentials from ${meridianCreds.source}`);
  } else {
    try {
      const desktop = meridianCreds?.clientId && meridianCreds?.clientSecret
        ? { clientId: meridianCreds.clientId, clientSecret: meridianCreds.clientSecret }
        : await promptDesktopClient(project);
      const refreshToken = await runMeridianOAuth(desktop.clientId, desktop.clientSecret);
      meridianCreds = {
        clientId: desktop.clientId,
        clientSecret: desktop.clientSecret,
        refreshToken,
        source: 'meridian-oauth',
      };
      step('meridian_oauth', 'pass', 'Refresh token obtained for Search Console + GA4');
    } catch (e) {
      step('meridian_oauth', 'fail', String(e.message || e));
      console.log(`
If Google still blocks access:
  • OAuth consent screen must be Internal (Workspace) OR External + add yourself as Test user
  • Do not use gcloud application-default for webmasters — that client is what Workspace blocks
  • Workspace Admin → Security → API controls → trust your Meridian client ID if policy is strict
`);
      writeResults();
      process.exit(1);
    }
  }

  // Access token from Meridian OAuth
  let accessToken;
  try {
    accessToken = await refreshAccessToken(
      meridianCreds.clientId,
      meridianCreds.clientSecret,
      meridianCreds.refreshToken
    );
    step('token', 'pass', 'Access token from Meridian refresh OK');
  } catch (e) {
    step('token', 'fail', String(e.message || e));
    writeResults();
    process.exit(1);
  }

  // GA4 property
  let ga4PropertyId = (process.env.MERIDIAN_GA4_PROPERTY_ID || meridianCreds.ga4PropertyId || '').trim();
  if (!ga4PropertyId) {
    try {
      const found = await discoverGa4PropertyId(accessToken);
      if (found?.id) {
        ga4PropertyId = found.id;
        step(
          'ga4_property',
          'pass',
          `GA4 Property ID ${ga4PropertyId} (${found.displayName || ''})${found.matchedMeasurementId ? ` · matched ${found.matchedMeasurementId}` : ''}`
        );
      } else {
        step('ga4_property', 'warn', 'No GA4 property found — create one in analytics.google.com then re-run');
      }
    } catch (e) {
      step('ga4_property', 'warn', `Could not list GA4 properties: ${String(e.message || e).slice(0, 160)}`);
    }
  } else {
    step('ga4_property', 'pass', `Using existing MERIDIAN_GA4_PROPERTY_ID=${ga4PropertyId}`);
  }

  // PSI API key
  let psiKey = (process.env.MERIDIAN_PSI_API_KEY || meridianCreds.psiKey || '').trim();
  if (!psiKey) {
    const keyCreate = runGcloud(gcloud, [
      'services',
      'api-keys',
      'create',
      `--display-name=Meridian-PSI`,
      `--api-target=service=pagespeedonline.googleapis.com`,
      `--project=${project}`,
      '--format=value(keyString)',
    ]);
    if (keyCreate.ok && keyCreate.stdout) {
      psiKey = keyCreate.stdout.split(/\r?\n/).filter(Boolean).pop();
      step('psi_key', 'pass', 'PageSpeed API key created');
    } else {
      // older CLI format
      const keyCreate2 = runGcloud(gcloud, [
        'alpha',
        'services',
        'api-keys',
        'create',
        `--display-name=Meridian-PSI`,
        `--project=${project}`,
      ]);
      step('psi_key', 'warn', `API key create: ${keyCreate.stderr || keyCreate2.stderr || 'skipped — set later'}`);
    }
  } else {
    step('psi_key', 'pass', 'Using existing MERIDIAN_PSI_API_KEY');
  }

  // Bing — cannot create API key via Google; one Microsoft login
  let bingKey = (process.env.MERIDIAN_BING_API_KEY || meridianCreds.bingKey || '').trim();
  if (!bingKey && !SKIP_BING) {
    console.log('\n── Bing Webmaster (optional) ──');
    console.log('1. Open https://www.bing.com/webmasters');
    console.log('2. Import site from Google Search Console (fastest)');
    console.log('3. Settings → API Access → Generate key');
    console.log('Or press Enter to skip Bing for now.\n');
    openBrowser('https://www.bing.com/webmasters');
    bingKey = await ask('Paste MERIDIAN_BING_API_KEY (or Enter to skip): ');
    if (bingKey) step('bing_key', 'pass', 'Bing API key captured');
    else step('bing_key', 'warn', 'Bing skipped — Meridian Bing act stays auth_required until set');
  } else if (!bingKey) {
    step('bing_key', 'info', 'Bing skipped (--skip-bing)');
  }

  const secrets = {
    MERIDIAN_GOOGLE_CLIENT_ID: meridianCreds.clientId,
    MERIDIAN_GOOGLE_CLIENT_SECRET: meridianCreds.clientSecret,
    MERIDIAN_GOOGLE_REFRESH_TOKEN: meridianCreds.refreshToken,
    ...(ga4PropertyId ? { MERIDIAN_GA4_PROPERTY_ID: ga4PropertyId } : {}),
    ...(psiKey ? { MERIDIAN_PSI_API_KEY: psiKey } : {}),
    ...(bingKey ? { MERIDIAN_BING_API_KEY: bingKey } : {}),
    _meta: {
      gcpProject: project,
      origin: ORIGIN,
      generatedAt: new Date().toISOString(),
      source: meridianCreds.source || 'meridian-oauth',
    },
  };

  const outDir = resolve(ROOT, 'storage/meridian/zigma-prod');
  mkdirSync(outDir, { recursive: true });
  const secretsPath = resolve(outDir, 'unlock-secrets.json');
  // Never commit; write locally only
  writeFileSync(secretsPath, JSON.stringify(secrets, null, 2), 'utf8');
  try {
    chmodSync(secretsPath, 0o600);
  } catch {
    /* win */
  }
  step('secrets_file', 'pass', `Wrote ${secretsPath} (gitignored storage — do not commit)`);

  // Local .env merge
  const applyLocal = spawnSync(
    process.execPath,
    [resolve(ROOT, 'scripts/meridian-unlock-apply-env.mjs'), '--env-file', '.env', '--from-json', secretsPath],
    { encoding: 'utf8', cwd: ROOT }
  );
  step('local_env', applyLocal.status === 0 ? 'pass' : 'warn', applyLocal.stdout || applyLocal.stderr || 'local .env update');

  if (APPLY_PROD) {
    console.log('\n── Applying secrets to Production VPS ──');
    // Never shell:true here — on Windows, cmd splits on && and runs the node step locally (C:\tmp\…).
    const remoteSecrets = '/tmp/meridian-unlock-secrets.json';
    const scp = spawnSync('scp', [secretsPath, `deploy@200.234.45.106:${remoteSecrets}`], {
      encoding: 'utf8',
      shell: false,
      stdio: 'inherit',
    });
    if (scp.status !== 0) {
      step('prod_scp', 'fail', scp.stderr || 'scp failed');
    } else {
      step('prod_scp', 'pass', 'Secrets uploaded to VPS (tmp)');
      const remoteCmd = [
        'cd /var/www/zigma-technologies',
        `node scripts/meridian-unlock-apply-env.mjs --env-file .env --from-json ${remoteSecrets}`,
        `rm -f ${remoteSecrets}`,
        'pm2 restart zigma --update-env',
        'sleep 2',
        'node packages/meridian/scripts/unlock-verify.mjs --act',
      ].join(' && ');
      const remote = spawnSync('ssh', ['deploy@200.234.45.106', remoteCmd], {
        encoding: 'utf8',
        shell: false,
        stdio: 'inherit',
      });
      step('prod_apply', remote.status === 0 ? 'pass' : 'warn', 'Production .env + PM2 + unlock-verify --act');
    }
  } else {
    step('prod_apply', 'info', 'Skipped Production apply (pass --apply-prod to push secrets + verify on VPS)');
  }

  if (!SKIP_VERIFY && !APPLY_PROD) {
    console.log('\n── Local unlock-verify --act ──');
    // Load secrets into env for this process
    for (const [k, v] of Object.entries(secrets)) {
      if (k.startsWith('_') || v == null) continue;
      process.env[k] = String(v);
    }
    const ver = spawnSync(process.execPath, [resolve(ROOT, 'packages/meridian/scripts/unlock-verify.mjs'), '--act'], {
      encoding: 'utf8',
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
    });
    step('verify', ver.status === 0 ? 'pass' : 'warn', `unlock-verify exited ${ver.status}`);
  }

  writeResults();
  console.log('\n═══ Bootstrap finished ═══');
  console.log('Next: if you did not use --apply-prod, run:');
  console.log('  npm run meridian:unlock:prod');
  console.log('');
}

function writeResults() {
  const outDir = resolve(ROOT, 'storage/meridian/zigma-prod');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, 'unlock-bootstrap-results.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
    'utf8'
  );
}

main().catch((e) => {
  console.error(e);
  step('fatal', 'fail', String(e.message || e));
  writeResults();
  process.exit(1);
});
