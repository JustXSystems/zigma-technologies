import { API_BASE_URL } from '../config';

export type ZtoolsUser = {
  id: number;
  email: string;
  name: string;
  company: string | null;
  toolSlugs: string[];
};

export type ZtoolsTool = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  route_path?: string;
  url?: string;
};

type ApiError = { error?: string };

function networkErrorMessage() {
  return `Cannot reach ${API_BASE_URL}. From repo root: run "npm run dev", then "npm run ztools:android:emu" (sets up emulator networking).`;
}

async function apiFetch(input: string, init?: RequestInit, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        `Server timed out at ${API_BASE_URL}. Start "npm run dev" (repo root), then restart the app with "npm run ztools:android:emu".`
      );
    }
    throw new Error(networkErrorMessage());
  } finally {
    clearTimeout(timer);
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  let data: T & ApiError;
  try {
    data = (await res.json()) as T & ApiError;
  } catch {
    throw new Error(`Unexpected response from server (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function checkApiHealth() {
  const res = await apiFetch(`${API_BASE_URL}/api/ztools/tools`);
  if (!res.ok) throw new Error(`Server error (${res.status})`);
}

export async function login(email: string, password: string) {
  const res = await apiFetch(`${API_BASE_URL}/api/ztools/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parseJson<{ token: string; user: ZtoolsUser }>(res);
}

export async function fetchSession(token: string) {
  const res = await apiFetch(`${API_BASE_URL}/api/ztools/auth`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<{ user: ZtoolsUser }>(res);
}

export async function fetchToolsCatalog() {
  const res = await apiFetch(`${API_BASE_URL}/api/ztools/tools`);
  return parseJson<{ tools: ZtoolsTool[] }>(res);
}
