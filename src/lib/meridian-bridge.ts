import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const MERIDIAN_BIN = path.join(ROOT, 'packages', 'meridian', 'bin', 'meridian.mjs');

export type MeridianEnv = 'prod' | 'preprod';

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
  const { json } = meridianLatestPaths(env);
  try {
    await access(json);
    const raw = await readFile(json, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Run Meridian CLI as a child process (server-side only). */
export function runMeridianCli(env: MeridianEnv): Promise<{
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
}> {
  const profile = meridianProfilePath(env);
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [MERIDIAN_BIN, 'run', '--profile', profile], {
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
