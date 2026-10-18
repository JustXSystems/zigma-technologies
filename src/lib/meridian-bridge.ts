import { spawn } from 'node:child_process';
import { access, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const MERIDIAN_BIN = path.join(ROOT, 'packages', 'meridian', 'bin', 'meridian.mjs');

export type MeridianEnv = 'prod' | 'preprod';

export type MeridianAct =
  | { action: 'scan' }
  | { action: 'submit-sitemap'; feed?: string }
  | { action: 'inspect-url'; url: string }
  | { action: 'inspect-priority'; limit?: number };

const PROFILES: Record<MeridianEnv, string> = {
  prod: path.join(ROOT, 'packages', 'meridian', 'profiles', 'zigma.prod.json'),
  preprod: path.join(ROOT, 'packages', 'meridian', 'profiles', 'zigma.preprod.json'),
};

export function meridianProfilePath(env: MeridianEnv) {
  return PROFILES[env];
}

export function meridianLatestPaths(env: MeridianEnv) {
  const dir = path.join(ROOT, 'storage', 'meridian', env === 'prod' ? 'zigma-prod' : 'zigma-preprod');
  return {
    dir,
    json: path.join(dir, 'report-latest.json'),
    html: path.join(dir, 'report-latest.html'),
  };
}

export async function readLatestMeridianReport(env: MeridianEnv) {
  const { json, dir } = meridianLatestPaths(env);
  try {
    await mkdir(dir, { recursive: true });
    await access(json);
    const raw = await readFile(json, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function spawnMeridian(args: string[]): Promise<{
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [MERIDIAN_BIN, ...args], {
      cwd: ROOT,
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
      resolvePromise({ ok: code === 0, code, stdout, stderr });
    });
    child.on('error', (err) => {
      resolvePromise({ ok: false, code: null, stdout, stderr: String(err) });
    });
  });
}

/** Run Meridian CLI as a child process (server-side only). */
export function runMeridianCli(env: MeridianEnv) {
  const profile = meridianProfilePath(env);
  return spawnMeridian(['run', '--profile', profile]);
}

export function runMeridianAct(env: MeridianEnv, act: MeridianAct) {
  const profile = meridianProfilePath(env);
  if (act.action === 'scan') {
    return spawnMeridian(['run', '--profile', profile]);
  }
  if (act.action === 'submit-sitemap') {
    const args = ['act', 'submit-sitemap', '--profile', profile];
    if (act.feed) args.push('--feed', act.feed);
    return spawnMeridian(args);
  }
  if (act.action === 'inspect-url') {
    return spawnMeridian(['act', 'inspect-url', '--profile', profile, '--url', act.url]);
  }
  if (act.action === 'inspect-priority') {
    const args = ['act', 'inspect-priority', '--profile', profile];
    if (act.limit) args.push('--limit', String(act.limit));
    return spawnMeridian(args);
  }
  return Promise.resolve({ ok: false, code: 2, stdout: '', stderr: 'Unknown action' });
}
