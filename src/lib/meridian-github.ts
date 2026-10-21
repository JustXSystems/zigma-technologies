/**
 * Control-plane GitHub API — Admin triggers Meridian workflows without spawning CLI on the web node.
 * See packages/meridian/ARCHITECTURE.md §6 (Admin → workflow_dispatch).
 *
 * Auth: MERIDIAN_GITHUB_TOKEN (fine-grained PAT: Actions read/write) or GH_TOKEN.
 * Repo: MERIDIAN_GITHUB_REPO or GITHUB_REPOSITORY (owner/name).
 */

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
  repo: string;
  message: string;
  howTo: string;
  workflows: {
    seoReport: string;
    autopilot: string;
  };
};

function token(): string {
  return (
    process.env.MERIDIAN_GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.GITHUB_TOKEN ||
    ''
  ).trim();
}

export function meridianGithubRepo(): string {
  const raw = (process.env.MERIDIAN_GITHUB_REPO || process.env.GITHUB_REPOSITORY || DEFAULT_REPO).trim();
  return raw.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
}

export function meridianGithubDeskStatus(): GhDeskStatus {
  const tok = token();
  const repo = meridianGithubRepo();
  const tokenSet = !!tok;
  const looksFineGrained = tok.startsWith('github_pat_');
  const looksClassic = tok.startsWith('ghp_');
  return {
    ready: tokenSet,
    tokenSet,
    repo,
    message: tokenSet
      ? `GitHub control plane token set · ${repo}${looksFineGrained ? ' (fine-grained — org 403s are common; prefer classic ghp_ + workflow)' : looksClassic ? ' (classic)' : ''}`
      : 'Set MERIDIAN_GITHUB_TOKEN on this node so Admin can dispatch Meridian SEO report without a local CLI.',
    howTo:
      'Prefer classic PAT (ghp_…): GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate → scopes: repo + workflow → paste as MERIDIAN_GITHUB_TOKEN → pm2 restart zigma --update-env. Fine-grained (github_pat_…) often returns 403 on org repos until an org admin approves PATs / Actions write.',
    workflows: {
      seoReport: `https://github.com/${repo}/actions/workflows/meridian-seo-report.yml`,
      autopilot: `https://github.com/${repo}/actions/workflows/meridian-autopilot.yml`,
    },
  };
}

function formatDispatchError(status: number, detail: string, repo: string): string {
  const base = `GitHub dispatch failed (${status}): ${detail}`;
  if (status !== 403 && status !== 401 && status !== 404) return base;
  const hints: string[] = [];
  if (status === 403 || detail.toLowerCase().includes('personal access token')) {
    hints.push(
      'Use a classic PAT (ghp_…) with scopes repo + workflow — fine-grained github_pat_ tokens often get this 403 on org repos.'
    );
    hints.push(
      `Confirm MERIDIAN_GITHUB_REPO=${repo} matches the real owner/name and the token owner can run Actions there.`
    );
    hints.push(
      'Org admins: Settings → Personal access tokens → allow classic / approve fine-grained requests; ensure Actions are enabled.'
    );
  } else if (status === 401) {
    hints.push('Token invalid or revoked — create a new classic PAT and update Production .env, then pm2 restart zigma --update-env.');
  } else if (status === 404) {
    hints.push('Workflow or repo not found — check MERIDIAN_GITHUB_REPO and that meridian-seo-report.yml exists on the default branch.');
  }
  return `${base} — ${hints.join(' ')}`;
}

async function ghFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const tok = token();
  if (!tok) {
    throw new Error('MERIDIAN_GITHUB_TOKEN is not set — cannot call GitHub Actions from Admin.');
  }
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

/**
 * Trigger workflow_dispatch. Returns immediately; poll listWorkflowRuns for the new run.
 */
export async function dispatchMeridianWorkflow(
  workflow: GhWorkflowId,
  inputs: GhDispatchInputs = {}
): Promise<{ ok: boolean; message: string; workflow: string; inputs: GhDispatchInputs }> {
  const ref = (process.env.MERIDIAN_GITHUB_REF || 'master').trim();
  const body = {
    ref,
    inputs: Object.fromEntries(
      Object.entries(inputs).map(([k, v]) => [k, typeof v === 'boolean' ? String(v) : String(v)])
    ),
  };
  const res = await ghFetch(`/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 204) {
    return {
      ok: true,
      message: `Dispatched ${workflow} on ${ref}`,
      workflow,
      inputs,
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
  };
}

export async function listMeridianWorkflowRuns(
  workflow: GhWorkflowId,
  limit = 5
): Promise<{ ok: boolean; message: string; runs: GhRunSummary[]; latest: GhRunSummary | null }> {
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
}

export async function getMeridianWorkflowRun(
  runId: number
): Promise<{ ok: boolean; message: string; run: GhRunSummary | null }> {
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
