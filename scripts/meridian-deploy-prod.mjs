#!/usr/bin/env node
/**
 * Phase 12 — trigger Production deploy via GitHub Actions (when authenticated).
 *
 *   node scripts/meridian-deploy-prod.mjs --json
 *   node scripts/meridian-deploy-prod.mjs --trigger --json
 *
 * Requires: `gh auth login` or GH_TOKEN with workflow scope.
 * Safe default is dry (prints the exact command); --trigger actually dispatches.
 */
import { spawnSync } from 'node:child_process';

const AS_JSON = process.argv.includes('--json');
const TRIGGER = process.argv.includes('--trigger');
const BRANCH = (() => {
  const hit = process.argv.find((a) => a.startsWith('--branch='));
  return hit ? hit.slice('--branch='.length) : 'master';
})();

const cmd = [
  'gh',
  'workflow',
  'run',
  'Deploy Production',
  '-f',
  'confirm_production=DEPLOY_PROD',
  '-f',
  `branch=${BRANCH}`,
  '-f',
  'apply_release=true',
  '-f',
  'restart_pm2=true',
  '-f',
  'healthcheck=true',
];

function gh(args) {
  return spawnSync('gh', args, { encoding: 'utf8', shell: true });
}

const auth = gh(['auth', 'status']);
const authed = auth.status === 0;

const payload = {
  ok: true,
  authed,
  triggered: false,
  command: cmd.join(' '),
  message: '',
};

if (!authed) {
  payload.status = 'auth_required';
  payload.message =
    'GitHub CLI not authenticated. Run: gh auth login   then: npm run meridian:act:phase12 -- --trigger-deploy   (or paste the command from phase12-ops.html)';
  if (AS_JSON) console.log(JSON.stringify(payload, null, 2));
  else console.log(payload.message);
  process.exit(0);
}

if (!TRIGGER) {
  payload.status = 'ready';
  payload.message = `Deploy ready — re-run with --trigger to dispatch:\n  ${payload.command}`;
  if (AS_JSON) console.log(JSON.stringify(payload, null, 2));
  else console.log(payload.message);
  process.exit(0);
}

const run = gh(cmd.slice(1));
payload.triggered = run.status === 0;
payload.status = run.status === 0 ? 'ok' : 'error';
payload.message =
  run.status === 0
    ? 'Deploy Production workflow dispatched — watch Actions, then re-run phase11/phase12 for live sameAs'
    : (run.stderr || run.stdout || `gh exit ${run.status}`).trim().slice(0, 400);
payload.ok = run.status === 0;

if (AS_JSON) console.log(JSON.stringify(payload, null, 2));
else console.log(payload.message);
process.exit(payload.ok ? 0 : 1);
