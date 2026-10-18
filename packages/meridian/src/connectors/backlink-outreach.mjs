import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

/**
 * Phase 8 — outreach pack from published projects (host script).
 */
export async function writeBacklinkOutreach(profile, opts = {}) {
  const script = resolve(process.cwd(), 'scripts/meridian-backlink-outreach.mjs');
  try {
    await access(script);
  } catch {
    return { ok: true, status: 'skipped', message: 'No backlink outreach script', data: {} };
  }

  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  const outFile = resolve(outDir, 'backlink-outreach.json');

  try {
    const raw = await runNode(script, ['--json', '--out', outFile, '--origin', profile.origin]);
    const data = JSON.parse(raw);
    return {
      ok: true,
      status: 'ok',
      message: `Backlink outreach: ${data.count || 0} target(s)`,
      data: { ...data, outFile },
      findings: [
        {
          code: 'BACKLINK_OUTREACH',
          severity: 'low',
          title: `${data.count || 0} outreach draft(s) for clients/partners`,
          remediation: 'Send polite asks from backlink-outreach.md (Phase 8) — never buy spam links.',
          owner: 'marketing',
          pillar: 'authority',
        },
      ],
    };
  } catch (e) {
    return {
      ok: false,
      status: 'error',
      message: `Backlink outreach failed: ${String(e.message || e).slice(0, 200)}`,
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
