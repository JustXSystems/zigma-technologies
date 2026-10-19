#!/usr/bin/env node
/**
 * Phase 24 Deploy Courier — seal LocalBusiness hasMap on Production via SSH.
 *
 * Preferred path (corporate, reliable — matches GitHub Deploy Production):
 *   1) Local `next build` (prod env) + package-release.mjs
 *   2) SCP tarball + apply-release.sh
 *   3) apply on VPS (extract + pm2 + healthcheck)
 *   4) Seed mapsUrl in DB + live probe
 *
 * Never run `next build` on the VPS — incomplete node_modules break Production.
 *
 *   node scripts/meridian-prod-hasmap-ssh.mjs --json
 *   node scripts/meridian-prod-hasmap-ssh.mjs --apply --json
 *   node scripts/meridian-prod-hasmap-ssh.mjs --apply --skip-build --json   # reuse existing dist/zigma-prod.tgz
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AS_JSON = process.argv.includes('--json');
const APPLY = process.argv.includes('--apply');
const SKIP_BUILD = process.argv.includes('--skip-build');
const HOST = process.env.MERIDIAN_PROD_SSH || 'deploy@200.234.45.106';
const APP = process.env.MERIDIAN_PROD_APP || '/var/www/zigma-technologies';
const TGZ = resolve(ROOT, 'dist/zigma-prod.tgz');
const APPLY_SH = resolve(ROOT, 'scripts/apply-release.sh');
const PATCH = resolve(ROOT, 'scripts/_remote-patch-hasmap.mjs');
const REMOTE_PATCH = '/tmp/meridian-patch-hasmap.mjs';

function sh(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: 'utf8',
    shell: opts.shell === true,
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...(opts.env || {}) },
    timeout: opts.timeout ?? 120000,
  });
}

function out(payload, code = 0) {
  if (AS_JSON) console.log(JSON.stringify(payload, null, 2));
  else console.log(payload.message || JSON.stringify(payload));
  process.exit(code);
}

function probeHasMap() {
  const r = sh(
    process.execPath,
    [
      '-e',
      `
      fetch('https://zigma-technologies.com/', {
        signal: AbortSignal.timeout(25000),
        headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
      })
        .then((res) => res.text().then((html) => ({ status: res.status, html })))
        .then(({ status, html }) => {
          const m = html.match(/"hasMap"\\s*:\\s*"([^"]+)"/);
          console.log(JSON.stringify({
            ok: status === 200,
            status,
            hasMap: !!m,
            hasMapValue: m ? m[1] : null,
            sameAs: html.includes('sameAs'),
            origin: 'https://zigma-technologies.com',
          }));
        })
        .catch((e) => {
          console.log(JSON.stringify({ ok: false, hasMap: false, error: String(e.message || e) }));
          process.exitCode = 1;
        });
      `,
    ],
    { timeout: 40000 }
  );
  try {
    return JSON.parse((r.stdout || '').trim());
  } catch {
    return { ok: false, hasMap: false, error: (r.stderr || r.stdout || 'probe failed').trim() };
  }
}

function ensureLfScript(localPath) {
  const raw = readFileSync(localPath);
  const text = raw.toString('utf8').replace(/\r\n/g, '\n');
  const tmp = resolve(ROOT, 'dist', '_apply-release.lf.sh');
  writeFileSync(tmp, text, 'utf8');
  return tmp;
}

if (!existsSync(APPLY_SH) || !existsSync(PATCH)) {
  out({ ok: false, message: 'Missing apply-release.sh or _remote-patch-hasmap.mjs' }, 1);
}

const pre = probeHasMap();
if (pre.hasMap && pre.ok) {
  out({
    ok: true,
    status: 'already_live',
    message: 'Production already emits hasMap — courier idle',
    live: pre,
    host: HOST,
  });
}

if (!APPLY) {
  out({
    ok: true,
    status: 'dry',
    message: `Would local-build → package → SCP → apply-release on ${HOST}, then seed mapsUrl. Re-run with --apply.`,
    host: HOST,
    live: pre,
  });
}

const ping = sh('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', HOST, 'echo ok'], {
  timeout: 30000,
});
if (ping.status !== 0) {
  out(
    {
      ok: false,
      status: 'ssh_unavailable',
      message: (ping.stderr || ping.stdout || 'SSH BatchMode failed').trim().slice(0, 400),
      host: HOST,
      live: pre,
    },
    1
  );
}

let build = { ok: true, status: 'skipped', message: 'build skipped' };
let pack = { ok: true, status: 'skipped', message: 'pack skipped' };

if (!SKIP_BUILD || !existsSync(TGZ)) {
  const env = {
    NEXT_PUBLIC_SITE_URL: 'https://zigma-technologies.com',
    NEXT_PUBLIC_SEO_INDEXABLE: 'true',
  };
  // Clear base path for prod
  const buildEnv = { ...process.env, ...env };
  delete buildEnv.NEXT_PUBLIC_BASE_PATH;

  const b = sh(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'build'],
    { timeout: 600000, shell: true, env: buildEnv }
  );
  build = {
    ok: b.status === 0,
    status: b.status === 0 ? 'ok' : 'error',
    message: b.status === 0 ? 'Local production next build OK' : (b.stderr || b.stdout || '').trim().slice(-500),
  };
  if (!build.ok) out({ ok: false, status: 'build_failed', message: build.message, build, host: HOST }, 1);

  const p = sh(process.execPath, ['scripts/package-release.mjs', '--env', 'prod', '--out', 'dist/zigma-prod.tgz'], {
    timeout: 600000,
  });
  pack = {
    ok: p.status === 0 && existsSync(TGZ),
    status: p.status === 0 ? 'ok' : 'error',
    message: p.status === 0 ? `Packaged ${TGZ}` : (p.stderr || p.stdout || '').trim().slice(-500),
  };
  if (!pack.ok) out({ ok: false, status: 'pack_failed', message: pack.message, build, pack, host: HOST }, 1);
} else {
  pack = { ok: true, status: 'reused', message: `Reusing ${TGZ}` };
}

const applyLf = ensureLfScript(APPLY_SH);
const scpTgz = sh(
  'scp',
  ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', TGZ, `${HOST}:/tmp/zigma-prod.tgz`],
  { timeout: 600000 }
);
const scpApply = sh(
  'scp',
  ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', applyLf, `${HOST}:/tmp/apply-release.sh`],
  { timeout: 60000 }
);
const scpPatch = sh(
  'scp',
  ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', PATCH, `${HOST}:${REMOTE_PATCH}`],
  { timeout: 60000 }
);
if (scpTgz.status !== 0 || scpApply.status !== 0 || scpPatch.status !== 0) {
  out(
    {
      ok: false,
      status: 'scp_failed',
      message: [scpTgz, scpApply, scpPatch]
        .map((r) => (r.stderr || r.stdout || '').trim())
        .filter(Boolean)
        .join(' | ')
        .slice(0, 400),
      host: HOST,
    },
    1
  );
}

const remoteApply = [
  'set -e',
  'sed -i "s/\\r$//" /tmp/apply-release.sh',
  'chmod +x /tmp/apply-release.sh',
  `bash /tmp/apply-release.sh --env prod --confirm-prod DEPLOY_PROD --tarball /tmp/zigma-prod.tgz --extract --restart --healthcheck --preserve-uploads --no-db-backup --no-migrations`,
  `cd ${APP} && NODE_PATH=./node_modules node ${REMOTE_PATCH}`,
].join(' && ');

const apply = sh('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', HOST, remoteApply], {
  timeout: 600000,
});
const applyOk = apply.status === 0;
const applyOut = ((apply.stdout || '') + (apply.stderr || '')).trim();

await new Promise((r) => setTimeout(r, 4000));
const live = probeHasMap();

out({
  ok: !!live.hasMap && live.ok !== false,
  status: live.hasMap ? 'ok' : applyOk ? 'applied_pending' : 'apply_failed',
  message: live.hasMap
    ? 'Live hasMap SEALED via deploy courier (local build → VPS apply)'
    : applyOk
      ? 'Release applied but hasMap still missing — check OrganizationJsonLd / mapsUrl'
      : applyOut.slice(-500) || 'apply-release failed',
  build,
  pack,
  apply: { ok: applyOk, tail: applyOut.slice(-600) },
  live,
  host: HOST,
  app: APP,
});
