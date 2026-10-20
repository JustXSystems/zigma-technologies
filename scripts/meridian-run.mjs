#!/usr/bin/env node
/**
 * Resolve Meridian control-plane CLI:
 *   1) MERIDIAN_HOME/bin/meridian.mjs  (Deploy Meridian sidecar)
 *   2) packages/meridian/bin/meridian.mjs (dev / SHIP_MERIDIAN=1)
 *
 * Rewrites --profile packages/meridian/... → $MERIDIAN_HOME/... when using the sidecar.
 * Website releases do not ship Meridian — stale copies are cleared by apply-release.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const home = (process.env.MERIDIAN_HOME || '').trim().replace(/[/\\]+$/, '');
const candidates = [];
if (home) candidates.push(join(home, 'bin', 'meridian.mjs'));
candidates.push(join(root, 'packages', 'meridian', 'bin', 'meridian.mjs'));

const bin = candidates.find((p) => existsSync(p));
if (!bin) {
  console.error('Meridian control plane CLI not found.');
  console.error('  • GitHub Actions → “Meridian SEO report” (preferred — no VPS CLI)');
  console.error('  • Or: GitHub → “Deploy Meridian” then: export MERIDIAN_HOME=/var/www/zigma-meridian');
  console.error('  • Local/dev: packages/meridian must exist in the repo checkout');
  console.error('See packages/meridian/ARCHITECTURE.md');
  process.exit(2);
}

try {
  const head = readFileSync(bin, 'utf8').slice(0, 240);
  if (head.includes('CONTROL_PLANE_STUB') || head.includes('not shipped with the website')) {
    console.error('This node has no Meridian control plane (website-only deploy).');
    console.error('Run GitHub → Meridian SEO report, or Deploy Meridian + MERIDIAN_HOME=/var/www/zigma-meridian');
    process.exit(2);
  }
} catch {
  /* ignore */
}

const usingHome = Boolean(home && bin.startsWith(resolve(home)));

/** Rewrite packages/meridian/... profile paths onto MERIDIAN_HOME when needed. */
function rewriteArgs(argv) {
  if (!usingHome) return argv;
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--profile' || a === '-p') && argv[i + 1]) {
      out.push(a);
      let p = argv[++i];
      const rel = p.replace(/\\/g, '/');
      if (rel.startsWith('packages/meridian/')) {
        p = join(home, rel.slice('packages/meridian/'.length));
      }
      out.push(p);
      continue;
    }
    out.push(a);
  }
  return out;
}

const args = rewriteArgs(process.argv.slice(2));
const child = spawn(process.execPath, [bin, ...args], {
  cwd: root,
  env: {
    ...process.env,
    // Sidecar at /var/www/zigma-meridian must write artefacts under the site tree
    MERIDIAN_SITE_ROOT: process.env.MERIDIAN_SITE_ROOT || process.env.ZIGMA_APP_DIR || root,
  },
  stdio: 'inherit',
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
