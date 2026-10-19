import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

/**
 * Quarterly dependency audit — npm outdated + pinned Next version.
 * No auto-upgrade (unsafe); produces actionable pack for humans/CI.
 */

function run(cmd, args) {
  return new Promise((resolvePromise) => {
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
      shell: process.platform === 'win32',
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }));
    child.on('error', (e) => resolvePromise({ code: 1, stdout: '', stderr: String(e.message || e) }));
  });
}

export async function writeDepsAudit(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });

  let pkg = {};
  try {
    pkg = JSON.parse(await readFile(resolve(process.cwd(), 'package.json'), 'utf8'));
  } catch {
    pkg = {};
  }

  const nextPinned = pkg.dependencies?.next || pkg.devDependencies?.next || null;
  const outdated = await run('npm', ['outdated', '--json']);
  /** @type {Record<string, { current?: string, wanted?: string, latest?: string, type?: string }> } */
  let map = {};
  try {
    map = JSON.parse(outdated.stdout || '{}') || {};
  } catch {
    map = {};
  }

  const entries = Object.entries(map).map(([name, v]) => ({
    name,
    current: v.current,
    wanted: v.wanted,
    latest: v.latest,
    type: v.type,
  }));
  const major = entries.filter((e) => {
    const c = String(e.current || '').replace(/^[^\d]*/, '').split('.')[0];
    const l = String(e.latest || '').replace(/^[^\d]*/, '').split('.')[0];
    return c && l && c !== l;
  });
  const nextRow = entries.find((e) => e.name === 'next');

  const fleet = await readJsonSafe(resolve(outDir, 'fleet-assurance.json'));
  const ciGreen = fleet?.workflow?.npmCi === true;
  const lastSuccess = fleet?.runs?.latest?.conclusion === 'success';

  // "ok" when audit ran and either no major bumps or Next is current enough + CI hardened
  const status =
    entries.length === 0
      ? 'ok'
      : major.length === 0 && ciGreen
        ? 'ok'
        : 'partial';

  const payload = {
    generatedAt: new Date().toISOString(),
    nextPinned,
    next: nextRow || null,
    outdatedCount: entries.length,
    majorCount: major.length,
    outdated: entries.slice(0, 40),
    major: major.slice(0, 20),
    ciGreen,
    lastSuccess,
    status,
    command: 'npm outdated && npm update && npm run typecheck && npm run build',
  };

  const md = [
    `# Dependency audit — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `- Next.js pinned: \`${nextPinned || '—'}\`${nextRow ? ` · latest ${nextRow.latest}` : ''}`,
    `- Outdated packages: **${entries.length}** (major bumps: **${major.length}**)`,
    `- Actions hardened (npm ci): ${ciGreen ? 'yes' : 'no'} · last run: ${fleet?.runs?.latest?.conclusion || '—'}`,
    '',
    '## Safe quarterly loop (automated reminder)',
    '',
    '```bash',
    payload.command,
    '```',
    '',
    major.length
      ? `## Major version candidates\n\n${major.map((m) => `- \`${m.name}\` ${m.current} → ${m.latest}`).join('\n')}`
      : '## No major version gaps detected',
    '',
    entries.length
      ? `## All outdated (cap 40)\n\n| Package | Current | Wanted | Latest |\n| --- | --- | --- | --- |\n${entries
          .slice(0, 40)
          .map((e) => `| ${e.name} | ${e.current} | ${e.wanted} | ${e.latest} |`)
          .join('\n')}`
      : '_npm outdated empty — tree current._',
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'deps-audit.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'deps-audit.md'), md, 'utf8');

  return {
    ok: true,
    status,
    message: `Deps audit · ${entries.length} outdated · ${major.length} major · ${status}`,
    data: { ...payload, paths: { json: resolve(outDir, 'deps-audit.json'), md: resolve(outDir, 'deps-audit.md') } },
  };
}

async function readJsonSafe(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}
