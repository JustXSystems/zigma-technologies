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
    await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
    await access(/*turbopackIgnore: true*/ json);
    const raw = await readFile(/*turbopackIgnore: true*/ json, 'utf8');
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

function envSet(name: string) {
  return !!(process.env[name] || '').trim();
}

/**
 * Connector readiness for Admin (booleans only — never returns secret values).
 * Docs: packages/meridian/SETUP.md
 */
export function meridianConnectorReadiness() {
  const googleClientId = envSet('MERIDIAN_GOOGLE_CLIENT_ID');
  const googleClientSecret = envSet('MERIDIAN_GOOGLE_CLIENT_SECRET');
  const googleRefreshToken = envSet('MERIDIAN_GOOGLE_REFRESH_TOKEN');
  const googleOk = googleClientId && googleClientSecret && googleRefreshToken;
  const ga4PropertyId = envSet('MERIDIAN_GA4_PROPERTY_ID');
  const bingApiKey = envSet('MERIDIAN_BING_API_KEY');
  const psiApiKey = envSet('MERIDIAN_PSI_API_KEY');

  return {
    docsPath: 'packages/meridian/SETUP.md',
    fields: [
      {
        id: 'MERIDIAN_GOOGLE_CLIENT_ID',
        label: 'Google OAuth Client ID',
        set: googleClientId,
        requiredFor: ['gsc', 'ga4', 'act'],
        howTo: 'Google Cloud → APIs & Services → Credentials → OAuth client (Desktop) → Client ID. SETUP.md Part A.5.',
      },
      {
        id: 'MERIDIAN_GOOGLE_CLIENT_SECRET',
        label: 'Google OAuth Client Secret',
        set: googleClientSecret,
        requiredFor: ['gsc', 'ga4', 'act'],
        howTo: 'Same OAuth client → Client secret. SETUP.md Part A.5.',
      },
      {
        id: 'MERIDIAN_GOOGLE_REFRESH_TOKEN',
        label: 'Google OAuth Refresh Token',
        set: googleRefreshToken,
        requiredFor: ['gsc', 'ga4', 'act'],
        howTo: 'Run: node packages/meridian/scripts/google-oauth-setup.mjs after Client ID/Secret are set. SETUP.md Part A.6.',
      },
      {
        id: 'MERIDIAN_GA4_PROPERTY_ID',
        label: 'GA4 Property ID (numeric)',
        set: ga4PropertyId,
        requiredFor: ['ga4'],
        howTo: 'GA4 → Admin → Property settings → Property ID (digits only, NOT G-…). SETUP.md Part B.',
      },
      {
        id: 'MERIDIAN_BING_API_KEY',
        label: 'Bing Webmaster API key',
        set: bingApiKey,
        requiredFor: ['bing'],
        howTo: 'Bing Webmaster → Settings → API Access → create key. SETUP.md Part D.',
      },
      {
        id: 'MERIDIAN_PSI_API_KEY',
        label: 'PageSpeed Insights API key',
        set: psiApiKey,
        requiredFor: ['pagespeed'],
        howTo: 'Google Cloud → Credentials → API key; enable PageSpeed Insights API. SETUP.md Part E.',
      },
    ],
    connectors: {
      gsc: { ready: googleOk, missing: googleOk ? [] : ['MERIDIAN_GOOGLE_CLIENT_ID', 'MERIDIAN_GOOGLE_CLIENT_SECRET', 'MERIDIAN_GOOGLE_REFRESH_TOKEN'].filter((k) => !envSet(k)) },
      ga4: {
        ready: googleOk && ga4PropertyId,
        missing: [
          ...(!googleOk
            ? ['MERIDIAN_GOOGLE_CLIENT_ID', 'MERIDIAN_GOOGLE_CLIENT_SECRET', 'MERIDIAN_GOOGLE_REFRESH_TOKEN'].filter((k) => !envSet(k))
            : []),
          ...(!ga4PropertyId ? ['MERIDIAN_GA4_PROPERTY_ID'] : []),
        ],
      },
      bing: { ready: bingApiKey, missing: bingApiKey ? [] : ['MERIDIAN_BING_API_KEY'] },
      pagespeed: { ready: psiApiKey, missing: psiApiKey ? [] : ['MERIDIAN_PSI_API_KEY'] },
      act: { ready: googleOk, missing: googleOk ? [] : ['MERIDIAN_GOOGLE_* refresh with webmasters scope'] },
    },
  };
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
