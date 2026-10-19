#!/usr/bin/env node
/**
 * Phase 13 — push LinkedIn sameAs into Production DB over SSH (no full redeploy).
 *
 *   node scripts/meridian-prod-sameas-ssh.mjs --json
 *   node scripts/meridian-prod-sameas-ssh.mjs --apply --json
 *   node scripts/meridian-prod-sameas-ssh.mjs --apply --restart --json
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AS_JSON = process.argv.includes('--json');
const APPLY = process.argv.includes('--apply');
const RESTART = process.argv.includes('--restart');
const HOST = process.env.MERIDIAN_PROD_SSH || 'deploy@200.234.45.106';
const APP = process.env.MERIDIAN_PROD_APP || '/var/www/zigma-technologies';
const REMOTE = '/tmp/meridian-apply-sameas.mjs';
const LOCAL = resolve(ROOT, 'scripts/_remote-apply-sameas.mjs');

function sh(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8', shell: false });
}

function out(payload, code = 0) {
  if (AS_JSON) console.log(JSON.stringify(payload, null, 2));
  else console.log(payload.message || JSON.stringify(payload));
  process.exit(code);
}

if (!existsSync(LOCAL)) out({ ok: false, message: 'Missing _remote-apply-sameas.mjs' }, 1);

if (!APPLY) {
  out({
    ok: true,
    status: 'dry',
    message: `Would SCP apply script → ${HOST}:${REMOTE} and run in ${APP}. Re-run with --apply.`,
    host: HOST,
  });
}

const scp = sh('scp', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', LOCAL, `${HOST}:${REMOTE}`]);
if (scp.status !== 0) {
  out({ ok: false, status: 'error', message: (scp.stderr || scp.stdout || 'scp failed').trim() }, 1);
}

const remoteCmd = `cd ${APP} && NODE_PATH=./node_modules node ${REMOTE}`;
const run = sh('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', HOST, remoteCmd]);
let applyResult = null;
try {
  applyResult = JSON.parse((run.stdout || '').trim());
} catch {
  applyResult = { ok: run.status === 0, raw: (run.stdout || run.stderr || '').trim().slice(0, 500) };
}

if (run.status !== 0 || applyResult.ok === false) {
  out(
    {
      ok: false,
      status: 'error',
      message: applyResult.error || applyResult.message || (run.stderr || 'remote apply failed').trim(),
      applyResult,
    },
    1
  );
}

let restart = { ok: true, status: 'skipped', message: 'PM2 restart skipped' };
if (RESTART || applyResult.updated) {
  const r = sh('ssh', [
    '-o',
    'BatchMode=yes',
    '-o',
    'ConnectTimeout=20',
    HOST,
    'pm2 restart zigma --update-env && sleep 2 && pm2 describe zigma | head -20',
  ]);
  restart = {
    ok: r.status === 0,
    status: r.status === 0 ? 'ok' : 'error',
    message: r.status === 0 ? 'PM2 zigma restarted' : (r.stderr || r.stdout || 'restart failed').trim().slice(0, 300),
  };
}

// Probe live
await new Promise((r) => setTimeout(r, RESTART || applyResult.updated ? 2500 : 500));
const probe = sh(process.execPath, [resolve(ROOT, 'scripts/meridian-probe-sameas.mjs')]);
let live = null;
try {
  live = JSON.parse((probe.stdout || '').trim());
} catch {
  live = { ok: false, hasSameAs: false };
}

out({
  ok: !!(live?.hasSameAs || applyResult.updated),
  status: live?.hasSameAs ? 'ok' : applyResult.updated ? 'applied_pending_cache' : 'noop',
  message: live?.hasSameAs
    ? `Live sameAs green · ${live.urls?.length || 0} URL(s)`
    : applyResult.updated
      ? `Applied LinkedIn on prod DB · live still empty (cache?) · restart=${restart.status}`
      : `Prod already had LinkedIn · live sameAs=${!!live?.hasSameAs}`,
  applyResult,
  restart,
  live,
  host: HOST,
});
