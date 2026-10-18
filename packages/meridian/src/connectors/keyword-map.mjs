import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';

/**
 * Phase 7.2 — keyword map seed from CMS catalog/pages (host script).
 */
export async function buildKeywordMap(profile, opts = {}) {
  const script = resolve(process.cwd(), process.env.MERIDIAN_KEYWORD_MAP_SCRIPT || 'scripts/meridian-keyword-map.mjs');
  try {
    await access(script);
  } catch {
    return { ok: true, status: 'skipped', message: 'No keyword-map script', data: { count: 0 } };
  }

  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  const outFile = resolve(outDir, 'keyword-map.json');

  try {
    const raw = await runNode(script, ['--json', '--out', outFile]);
    const data = JSON.parse(raw);
    return {
      ok: true,
      status: 'ok',
      message: `Keyword map: ${data.count || 0} row(s)`,
      data: { ...data, outFile },
      findings:
        (data.count || 0) >= 10
          ? [
              {
                code: 'KEYWORD_MAP',
                severity: 'low',
                title: `Keyword map seeded (${data.count} intents)`,
                remediation: 'Prioritise commercial rows in keyword-map.md / Phase 7 calendar.',
                owner: 'marketing',
                pillar: 'onpage',
              },
            ]
          : [],
    };
  } catch (e) {
    return {
      ok: false,
      status: 'error',
      message: `Keyword map failed: ${String(e.message || e).slice(0, 200)}`,
      data: { count: 0 },
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
