import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dbReady, dbSkipReason } from '../lib/db-ready.mjs';

export async function seedThinContent(profile, opts = {}) {
  if (!dbReady()) {
    return {
      ok: true,
      status: 'skipped',
      message: `Content seed skipped — ${dbSkipReason()}`,
      data: { skippedDb: true },
    };
  }
  const script = resolve(process.cwd(), 'scripts/meridian-content-seed.mjs');
  try {
    await access(script);
  } catch {
    return { ok: true, status: 'skipped', message: 'No content-seed script', data: {} };
  }

  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  const file = resolve(outDir, 'content-briefs.json');
  const wantApply =
    opts.apply === true ||
    process.env.MERIDIAN_AUTO_SEED_CONTENT === '1' ||
    profile.autopilot?.autoSeedContent === true;

  const args = ['--json', '--file', file];
  args.push(wantApply ? '--apply' : '--dry-run');

  try {
    const raw = await runNode(script, args);
    const data = JSON.parse(raw);
    return {
      ok: true,
      status: 'ok',
      message: data.message || 'Content seed done',
      data,
    };
  } catch (e) {
    return {
      ok: false,
      status: 'error',
      message: `Content seed failed: ${String(e.message || e).slice(0, 200)}`,
      data: {},
    };
  }
}

function runNode(script, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += String(d);
    });
    child.stderr.on('data', (d) => {
      stderr += String(d);
    });
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr.trim() || `exit ${code}`));
      else resolvePromise(stdout.trim());
    });
    child.on('error', reject);
  });
}
