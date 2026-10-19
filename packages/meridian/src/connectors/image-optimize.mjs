import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { dbReady, dbSkipReason } from '../lib/db-ready.mjs';

/**
 * Compress heavy images via scripts/meridian-image-optimize.mjs (sharp).
 */
export async function optimizeHeavyImages(profile, opts = {}) {
  const script = resolve(process.cwd(), process.env.MERIDIAN_IMAGE_OPTIMIZE_SCRIPT || 'scripts/meridian-image-optimize.mjs');
  try {
    await access(script);
  } catch {
    return { ok: true, status: 'skipped', message: 'No image optimize script', data: {} };
  }

  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  const weightFile = resolve(outDir, 'image-weight.json');
  const wantApply =
    opts.apply === true ||
    process.env.MERIDIAN_AUTO_OPTIMIZE_IMAGES === '1' ||
    profile.autopilot?.autoOptimizeImages === true;

  if (wantApply && !dbReady()) {
    return {
      ok: true,
      status: 'skipped',
      message: `Image optimize skipped — ${dbSkipReason()}`,
      data: { skippedDb: true },
    };
  }

  const args = ['--json', '--file', weightFile];
  args.push(wantApply ? '--apply' : '--dry-run');

  try {
    const raw = await runNode(script, args);
    const data = JSON.parse(raw);
    return {
      ok: data.ok !== false,
      status: data.optimized ? 'ok' : 'ok',
      message: data.message || (wantApply ? 'Image optimize done' : 'Image optimize dry-run'),
      data,
    };
  } catch (e) {
    const msg = String(e.message || e);
    if (/Cannot find package|ERR_MODULE_NOT_FOUND|mysql2/i.test(msg)) {
      return {
        ok: true,
        status: 'skipped',
        message: `Image optimize skipped — ${msg.slice(0, 160)}`,
        data: {},
      };
    }
    return {
      ok: false,
      status: 'error',
      message: `Image optimize failed: ${msg.slice(0, 240)}`,
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
