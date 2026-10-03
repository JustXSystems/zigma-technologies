'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AdminScreenKey } from '@/lib/admin-screens';

export type AccessUser = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  role_id: number | null;
  role_name: string | null;
  last_login: string | null;
  created_at: string;
};

export type AccessRole = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  screens: AdminScreenKey[];
  is_system: boolean;
  userCount: number;
};

export type AccessDirectory = { users: AccessUser[]; roles: AccessRole[] };

/** `null` when the signed-in user is not a full admin. */
async function fetchDirectory(): Promise<AccessDirectory | null> {
  const res = await fetch('/api/admin/users');
  if (res.status === 403) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load users');
  return { users: data.users || [], roles: data.roles || [] };
}

/** Users + roles for the Team & Access screens, from one request. */
export function useAccessDirectory() {
  const [directory, setDirectory] = useState<AccessDirectory>({ users: [], roles: [] });
  const [loaded, setLoaded] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState('');

  const apply = useCallback((data: AccessDirectory | null) => {
    setLoaded(true);
    setLoadError('');
    if (data) setDirectory(data);
    else setForbidden(true);
  }, []);

  const reload = useCallback(async () => apply(await fetchDirectory()), [apply]);

  useEffect(() => {
    fetchDirectory()
      .then(apply)
      .catch((e: Error) => {
        setLoaded(true);
        setLoadError(e.message);
      });
  }, [apply]);

  return { ...directory, loaded, forbidden, loadError, reload };
}

/** JSON request to an access API; throws the server's message on failure. */
export async function sendAccess(url: string, method: 'POST' | 'PATCH' | 'DELETE', body: object) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as { id?: number; message?: string };
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86400],
  ['month', 30 * 86400],
  ['week', 7 * 86400],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

/** "3 hours ago" style label; `null` input → `fallback`. */
export function timeAgo(value: string | null, fallback = 'Never') {
  if (!value) return fallback;
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'Just now';
}

export const DAY_MS = 86400 * 1000;
