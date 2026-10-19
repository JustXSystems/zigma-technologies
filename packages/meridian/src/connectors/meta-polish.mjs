import { resolve } from 'node:path';
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { applyMeta } from './meta-automation.mjs';
import { dbReady, dbSkipReason } from '../lib/db-ready.mjs';

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

/**
 * Phase 3 — draft (and optionally force-apply) polished meta for length/brand issues.
 */
export async function polishMeta(profile, opts = {}) {
  if (!dbReady()) {
    return {
      ok: true,
      status: 'skipped',
      message: `Meta polish skipped — ${dbSkipReason()}`,
      data: { count: 0, skippedDb: true },
    };
  }
  const script = resolve(process.cwd(), process.env.MERIDIAN_META_POLISH_SCRIPT || 'scripts/meridian-meta-polish.mjs');
  try {
    await access(script);
  } catch {
    return { ok: true, status: 'skipped', message: 'No meta-polish script', data: { count: 0 } };
  }

  const outFile = resolve(
    opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site'),
    'meta-polish.json'
  );

  try {
    const raw = await runNode(script, ['--json', '--out', outFile]);
    const data = JSON.parse(raw);
    const count = Number(data.count || 0);
    const result = {
      ok: true,
      status: 'ok',
      message: count ? `Polished meta drafts for ${count} CMS row(s)` : 'No meta length/brand issues to polish',
      data: { count, outPath: outFile },
      findings: count
        ? [
            {
              code: 'META_POLISH',
              severity: count >= 10 ? 'medium' : 'low',
              title: `${count} CMS row(s) have title/description length or brand issues`,
              remediation:
                'Autopilot can apply with MERIDIAN_AUTO_POLISH_META=1; or review meta-polish.md then apply --force.',
              owner: 'marketing',
              pillar: 'onpage',
            },
          ]
        : [],
    };

    const wantApply =
      opts.apply === true ||
      process.env.MERIDIAN_AUTO_POLISH_META === '1' ||
      profile.autopilot?.autoPolishMeta === true;

    if (wantApply && count > 0) {
      const applied = await applyMeta(profile, { apply: true, force: true, file: outFile });
      return {
        ...result,
        message: `${result.message}; applied ~${applied.data?.updated ?? '?'}`,
        data: { ...result.data, apply: applied.data },
      };
    }

    return result;
  } catch (e) {
    return {
      ok: false,
      status: 'error',
      message: `Meta polish failed: ${String(e.message || e).slice(0, 200)}`,
      data: { count: 0 },
    };
  }
}
