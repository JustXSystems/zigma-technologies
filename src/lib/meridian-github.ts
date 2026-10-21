/**
 * Control-plane GitHub API — Admin triggers Meridian workflows without spawning CLI on the web node.
 * See packages/meridian/ARCHITECTURE.md §6 (Admin → workflow_dispatch).
 *
 * Auth (first match wins):
 *   1) GitHub App installation token — MERIDIAN_GITHUB_APP_ID + INSTALLATION_ID + PRIVATE_KEY
 *      (corporate / org-safe; avoids fine-grained PAT 403)
 *   2) Classic PAT — MERIDIAN_GITHUB_TOKEN / GH_TOKEN (ghp_… with repo + workflow)
 * Repo: MERIDIAN_GITHUB_REPO or GITHUB_REPOSITORY (owner/name).
 */

import { createPrivateKey } from 'node:crypto';
import { SignJWT } from 'jose';

const DEFAULT_REPO = 'JustXSystems/zigma-technologies';

export type GhWorkflowId = 'meridian-seo-report.yml' | 'meridian-autopilot.yml' | 'deploy-meridian.yml';

export type GhDispatchInputs = Record<string, string | boolean | number>;

export type GhRunSummary = {
  id: number;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  displayTitle: string;
  createdAt: string;
  updatedAt: string;
  workflowId?: number;
};

export type GhDeskStatus = {
  ready: boolean;
  tokenSet: boolean;
  appConfigured: boolean;
  authMode: 'github-app' | 'pat' | 'none';
  repo: string;
  message: string;
  howTo: string;
  /** Always available — zero secrets; open Actions → Run workflow */
  actionsRunUrl: string;
  workflows: {
    seoReport: string;
    autopilot: string;
  };
};

type CachedInstallToken = { token: string; expiresAtMs: number };

let installTokenCache: CachedInstallToken | null = null;

function patToken(): string {
  return (
    process.env.MERIDIAN_GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.GITHUB_TOKEN ||
    ''
  ).trim();
}

function appCredentials(): { appId: string; installationId: string; privateKeyPem: string } | null {
  const appId = (process.env.MERIDIAN_GITHUB_APP_ID || '').trim();
  const installationId = (process.env.MERIDIAN_GITHUB_APP_INSTALLATION_ID || '').trim();
  let privateKeyPem = (process.env.MERIDIAN_GITHUB_APP_PRIVATE_KEY || '').trim();
  if (!appId || !installationId || !privateKeyPem) return null;
  // Allow \n-escaped PEM in single-line .env
  privateKeyPem = privateKeyPem.replace(/\\n/g, '\n');
  return { appId, installationId, privateKeyPem };
}

export function meridianGithubRepo(): string {
  const raw = (process.env.MERIDIAN_GITHUB_REPO || process.env.GITHUB_REPOSITORY || DEFAULT_REPO).trim();
  return raw.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
}

export function meridianGithubActionsRunUrl(workflow: GhWorkflowId = 'meridian-seo-report.yml'): string {
  const repo = meridianGithubRepo();
  return `https://github.com/${repo}/actions/workflows/${workflow}`;
}

export function meridianGithubDeskStatus(): GhDeskStatus {
  const tok = patToken();
  const app = appCredentials();
  const repo = meridianGithubRepo();
  const appConfigured = !!app;
  const tokenSet = !!tok;
  const ready = appConfigured || tokenSet;
  const looksFineGrained = tok.startsWith('github_pat_');
  const looksClassic = tok.startsWith('ghp_');
  const authMode: GhDeskStatus['authMode'] = appConfigured ? 'github-app' : tokenSet ? 'pat' : 'none';
  const actionsRunUrl = meridianGithubActionsRunUrl('meridian-seo-report.yml');

  let message: string;
  if (appConfigured) {
    message = `GitHub App ready · ${repo} (org-safe install token)`;
  } else if (tokenSet) {
    message = `GitHub PAT set · ${repo}${
      looksFineGrained
        ? ' (fine-grained — org 403s common; use App or classic ghp_)'
        : looksClassic
          ? ' (classic)'
          : ''
    }`;
  } else {
    message =
      'No GitHub auth on this node — use Actions → Meridian SEO report (zero secrets), or set a GitHub App / classic PAT for one-click Admin dispatch.';
  }

  return {
    ready,
    tokenSet,
    appConfigured,
    authMode,
    repo,
    message,
    howTo: appConfigured
      ? 'GitHub App install token is preferred for org repos. Rotate private key via GitHub → Settings → Developer settings → GitHub Apps.'
      : 'Preferred: GitHub App (MERIDIAN_GITHUB_APP_ID + INSTALLATION_ID + PRIVATE_KEY). Fallback: classic PAT ghp_… with scopes repo + workflow. Or skip secrets and open Actions → Meridian SEO report (scheduled Sundays anyway).',
    actionsRunUrl,
    workflows: {
      seoReport: actionsRunUrl,
      autopilot: meridianGithubActionsRunUrl('meridian-autopilot.yml'),
    },
  };
}

function formatDispatchError(status: number, detail: string, repo: string): string {
  const base = `GitHub dispatch failed (${status}): ${detail}`;
  if (status !== 403 && status !== 401 && status !== 404) return base;
  const hints: string[] = [];
  if (status === 403 || detail.toLowerCase().includes('personal access token')) {
    hints.push(
      'Org blocked this PAT — switch to a GitHub App (MERIDIAN_GITHUB_APP_*) or classic ghp_… with repo+workflow, or click Actions → Meridian SEO report (no token).'
    );
    hints.push(`Repo=${repo}.`);
  } else if (status === 401) {
    hints.push('Token/App credentials invalid — rotate and pm2 restart zigma --update-env.');
  } else if (status === 404) {
    hints.push('Workflow or repo not found — check MERIDIAN_GITHUB_REPO and workflow file on master.');
  }
  return `${base} — ${hints.join(' ')}`;
}

async function mintGithubAppInstallationToken(): Promise<string | null> {
  const creds = appCredentials();
  if (!creds) return null;

  const now = Date.now();
  if (installTokenCache && installTokenCache.expiresAtMs > now + 60_000) {
    return installTokenCache.token;
  }

  let key;
  try {
    key = createPrivateKey(creds.privateKeyPem);
  } catch {
    throw new Error(
      'MERIDIAN_GITHUB_APP_PRIVATE_KEY is not a valid PEM. Paste the .pem with \\n newlines in .env.'
    );
  }

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(Math.floor(now / 1000) - 30)
    .setExpirationTime(Math.floor(now / 1000) + 8 * 60)
    .setIssuer(creds.appId)
    .sign(key);

  const res = await fetch(
    `https://api.github.com/app/installations/${creds.installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${jwt}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        // Least privilege for workflow_dispatch + run status
        permissions: {
          actions: 'write',
          contents: 'read',
          metadata: 'read',
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub App install token failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { token?: string; expires_at?: string };
  if (!data.token) throw new Error('GitHub App install token response missing token');
  const expiresAtMs = data.expires_at ? Date.parse(data.expires_at) : now + 50 * 60_000;
  installTokenCache = { token: data.token, expiresAtMs };
  return data.token;
}

async function resolveAuthToken(): Promise<{ token: string; mode: 'github-app' | 'pat' }> {
  if (appCredentials()) {
    const t = await mintGithubAppInstallationToken();
    if (t) return { token: t, mode: 'github-app' };
  }
  const pat = patToken();
  if (pat) return { token: pat, mode: 'pat' };
  throw new Error(
    'No GitHub auth configured. Open Actions → Meridian SEO report, or set MERIDIAN_GITHUB_APP_* / MERIDIAN_GITHUB_TOKEN (classic ghp_).'
  );
}

async function ghFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { token: tok } = await resolveAuthToken();
  const repo = meridianGithubRepo();
  const url = path.startsWith('http') ? path : `https://api.github.com/repos/${repo}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${tok}`,
    'X-GitHub-Api-Version': '2022-11-28',
    ...(init.headers as Record<string, string> | undefined),
  };
  return fetch(url, { ...init, headers });
}

export type GhDispatchResult = {
  ok: boolean;
  message: string;
  workflow: string;
  inputs: GhDispatchInputs;
  /** Zero-secret fallback — open in browser and click Run workflow */
  fallbackUrl?: string;
  authMode?: 'github-app' | 'pat';
};

/**
 * Trigger workflow_dispatch. Returns immediately; poll listWorkflowRuns for the new run.
 */
export async function dispatchMeridianWorkflow(
  workflow: GhWorkflowId,
  inputs: GhDispatchInputs = {}
): Promise<GhDispatchResult> {
  const ref = (process.env.MERIDIAN_GITHUB_REF || 'master').trim();
  const fallbackUrl = meridianGithubActionsRunUrl(workflow);
  const body = {
    ref,
    inputs: Object.fromEntries(
      Object.entries(inputs).map(([k, v]) => [k, typeof v === 'boolean' ? String(v) : String(v)])
    ),
  };

  let authMode: 'github-app' | 'pat' | undefined;
  let res: Response;
  try {
    const auth = await resolveAuthToken();
    authMode = auth.mode;
    const repo = meridianGithubRepo();
    res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${auth.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return {
      ok: false,
      message: `${e instanceof Error ? e.message : String(e)} Open: ${fallbackUrl}`,
      workflow,
      inputs,
      fallbackUrl,
    };
  }

  if (res.status === 204) {
    return {
      ok: true,
      message: `Dispatched ${workflow} on ${ref} via ${authMode}`,
      workflow,
      inputs,
      authMode,
    };
  }
  const text = await res.text().catch(() => '');
  let detail = text.slice(0, 280);
  try {
    const j = JSON.parse(text) as { message?: string };
    if (j.message) detail = j.message;
  } catch {
    /* keep raw */
  }
  return {
    ok: false,
    message: formatDispatchError(res.status, detail, meridianGithubRepo()),
    workflow,
    inputs,
    fallbackUrl,
    authMode,
  };
}

export async function listMeridianWorkflowRuns(
  workflow: GhWorkflowId,
  limit = 5
): Promise<{ ok: boolean; message: string; runs: GhRunSummary[]; latest: GhRunSummary | null }> {
  try {
    const res = await ghFetch(
      `/actions/workflows/${workflow}/runs?per_page=${Math.min(Math.max(limit, 1), 20)}`
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        message: `Could not list runs (${res.status}): ${text.slice(0, 160)}`,
        runs: [],
        latest: null,
      };
    }
    const data = (await res.json()) as {
      workflow_runs?: {
        id: number;
        status: string;
        conclusion: string | null;
        html_url: string;
        display_title?: string;
        name?: string;
        created_at: string;
        updated_at: string;
        workflow_id?: number;
      }[];
    };
    const runs: GhRunSummary[] = (data.workflow_runs || []).map((r) => ({
      id: r.id,
      status: r.status,
      conclusion: r.conclusion,
      htmlUrl: r.html_url,
      displayTitle: r.display_title || r.name || workflow,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      workflowId: r.workflow_id,
    }));
    return {
      ok: true,
      message: runs[0]
        ? `Latest: ${runs[0].conclusion || runs[0].status} · ${runs[0].createdAt}`
        : 'No workflow runs yet',
      runs,
      latest: runs[0] || null,
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : String(e),
      runs: [],
      latest: null,
    };
  }
}

export async function getMeridianWorkflowRun(
  runId: number
): Promise<{ ok: boolean; message: string; run: GhRunSummary | null }> {
  try {
    const res = await ghFetch(`/actions/runs/${runId}`);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        message: `Could not load run ${runId} (${res.status}): ${text.slice(0, 160)}`,
        run: null,
      };
    }
    const r = (await res.json()) as {
      id: number;
      status: string;
      conclusion: string | null;
      html_url: string;
      display_title?: string;
      name?: string;
      created_at: string;
      updated_at: string;
      workflow_id?: number;
    };
    const run: GhRunSummary = {
      id: r.id,
      status: r.status,
      conclusion: r.conclusion,
      htmlUrl: r.html_url,
      displayTitle: r.display_title || r.name || `run ${runId}`,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      workflowId: r.workflow_id,
    };
    return {
      ok: true,
      message: `${run.conclusion || run.status}`,
      run,
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : String(e),
      run: null,
    };
  }
}

/**
 * After workflow_dispatch, GitHub can take a few seconds before the run appears.
 * Poll briefly for a run created after `sinceIso`.
 */
export async function waitForDispatchedRun(
  workflow: GhWorkflowId,
  sinceIso: string,
  opts: { attempts?: number; delayMs?: number } = {}
): Promise<GhRunSummary | null> {
  const attempts = opts.attempts ?? 8;
  const delayMs = opts.delayMs ?? 1500;
  const since = Date.parse(sinceIso);
  for (let i = 0; i < attempts; i++) {
    const listed = await listMeridianWorkflowRuns(workflow, 5);
    const hit = listed.runs.find((r) => Date.parse(r.createdAt) >= since - 5000);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

export function mapGhRunToJobStatus(run: GhRunSummary): 'running' | 'ok' | 'error' {
  if (run.status === 'completed') {
    if (run.conclusion === 'success' || run.conclusion === 'neutral') return 'ok';
    return 'error';
  }
  return 'running';
}
