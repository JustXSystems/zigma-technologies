import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Non-secret GitHub CLI helpers for Meridian fleet assurance.
 * Never logs secret values — only names / booleans / run metadata.
 */

export function runGh(args, input) {
  return new Promise((resolvePromise) => {
    const child = spawn('gh', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
      cwd: process.cwd(),
      env: process.env,
    });
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
}

export async function ghAuthOk() {
  const auth = await runGh(['auth', 'status']);
  return auth.code === 0;
}

/**
 * @param {string} outDir
 * @param {Record<string, string>|null} secretsMap from unlock-secrets.json
 */
export async function syncGhSecretsFromMap(secretsMap) {
  if (!secretsMap || typeof secretsMap !== 'object') {
    return { ok: true, status: 'skipped', message: 'No secrets map', synced: [] };
  }
  const keys = [
    'MERIDIAN_GOOGLE_CLIENT_ID',
    'MERIDIAN_GOOGLE_CLIENT_SECRET',
    'MERIDIAN_GOOGLE_REFRESH_TOKEN',
    'MERIDIAN_GA4_PROPERTY_ID',
    'MERIDIAN_BING_API_KEY',
    'MERIDIAN_PSI_API_KEY',
    'MERIDIAN_WEBHOOK_URL',
  ].filter((k) => secretsMap[k]);

  if (!keys.length) return { ok: true, status: 'skipped', message: 'No keys to sync', synced: [] };
  if (!(await ghAuthOk())) {
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
    const r = await runGh(['secret', 'set', k], secretsMap[k]);
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

/** Secret *names* only — never values. */
export async function listGhSecretNames() {
  if (!(await ghAuthOk())) {
    return { ok: true, status: 'skipped', message: 'gh not authenticated', names: [] };
  }
  const r = await runGh(['secret', 'list', '--json', 'name']);
  if (r.code !== 0) {
    return {
      ok: true,
      status: 'skipped',
      message: (r.stderr || r.stdout || 'secret list failed').slice(0, 160),
      names: [],
    };
  }
  try {
    const rows = JSON.parse(r.stdout || '[]');
    const names = rows.map((x) => x.name).filter(Boolean);
    return { ok: true, status: 'ok', message: `${names.length} secret(s) on repo`, names };
  } catch {
    return { ok: true, status: 'skipped', message: 'Could not parse secret list', names: [] };
  }
}

export async function listWorkflowRuns(workflow = 'meridian-autopilot.yml', limit = 5) {
  if (!(await ghAuthOk())) {
    return { ok: true, status: 'skipped', message: 'gh not authenticated', runs: [] };
  }
  const r = await runGh([
    'run',
    'list',
    '--workflow',
    workflow,
    '--limit',
    String(limit),
    '--json',
    'databaseId,status,conclusion,displayTitle,createdAt,url,headBranch',
  ]);
  if (r.code !== 0) {
    return {
      ok: true,
      status: 'skipped',
      message: (r.stderr || r.stdout || 'run list failed').slice(0, 160),
      runs: [],
    };
  }
  try {
    const runs = JSON.parse(r.stdout || '[]');
    const latest = runs[0] || null;
    return {
      ok: true,
      status: 'ok',
      message: latest
        ? `Latest: ${latest.conclusion || latest.status} · ${latest.createdAt || ''}`
        : 'No workflow runs yet',
      runs,
      latest,
    };
  } catch {
    return { ok: true, status: 'skipped', message: 'Could not parse run list', runs: [] };
  }
}

export async function dispatchWorkflow(workflow = 'meridian-autopilot.yml', fields = {}) {
  if (!(await ghAuthOk())) {
    return { ok: false, status: 'skipped', message: 'gh not authenticated — cannot dispatch' };
  }
  const args = ['workflow', 'run', workflow];
  for (const [k, v] of Object.entries(fields)) {
    args.push('-f', `${k}=${v}`);
  }
  const r = await runGh(args);
  if (r.code !== 0) {
    return {
      ok: false,
      status: 'error',
      message: (r.stderr || r.stdout || 'dispatch failed').slice(0, 200),
    };
  }
  return { ok: true, status: 'ok', message: `Dispatched ${workflow}` };
}

/** Static audit of local workflow YAML (no network). */
export async function auditAutopilotWorkflow(root = process.cwd()) {
  const rel = '.github/workflows/meridian-autopilot.yml';
  const path = resolve(root, rel);
  let text = '';
  try {
    text = await readFile(path, 'utf8');
  } catch {
    return {
      ok: false,
      status: 'error',
      message: `Missing ${rel}`,
      checks: { present: false, npmCi: false, softHard: false, nodeCache: false },
    };
  }
  const checks = {
    present: true,
    npmCi: /\bnpm\s+ci\b/.test(text),
    softHard: /MERIDIAN_CI_SOFT_HARD/.test(text),
    nodeCache: /cache:\s*npm/.test(text),
  };
  const score = [checks.npmCi, checks.softHard, checks.nodeCache].filter(Boolean).length;
  return {
    ok: checks.npmCi,
    status: checks.npmCi ? 'ok' : 'degraded',
    message: `Workflow audit ${score}/3 (npmCi=${checks.npmCi} softHard=${checks.softHard} cache=${checks.nodeCache})`,
    checks,
    path: rel,
  };
}

/** Required Actions secrets for full Meridian act (names only). */
export const FLEET_SECRET_KEYS = [
  'MERIDIAN_GOOGLE_CLIENT_ID',
  'MERIDIAN_GOOGLE_CLIENT_SECRET',
  'MERIDIAN_GOOGLE_REFRESH_TOKEN',
  'MERIDIAN_GA4_PROPERTY_ID',
  'MERIDIAN_BING_API_KEY',
  'MERIDIAN_PSI_API_KEY',
];

export function scoreSecretCoverage(names = []) {
  const set = new Set(names);
  const present = FLEET_SECRET_KEYS.filter((k) => set.has(k));
  const missing = FLEET_SECRET_KEYS.filter((k) => !set.has(k));
  const oauthOk =
    set.has('MERIDIAN_GOOGLE_CLIENT_ID') &&
    set.has('MERIDIAN_GOOGLE_CLIENT_SECRET') &&
    set.has('MERIDIAN_GOOGLE_REFRESH_TOKEN');
  return {
    present,
    missing,
    oauthOk,
    coverage: Math.round((present.length / FLEET_SECRET_KEYS.length) * 100),
  };
}
