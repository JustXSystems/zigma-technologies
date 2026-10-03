'use client';

import { useEffect, useState } from 'react';
import type { SiteCopy } from '@/lib/site-copy';
import { useDirtyTracker } from '@/components/admin/unsaved-changes';
import { getPath, withPaths } from './CopyField';

async function fetchCopy(): Promise<SiteCopy> {
  const res = await fetch('/api/admin/site-copy');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load site copy');
  return data.copy;
}

/**
 * Edits some paths of the shared Site Copy object from another screen. Saving writes only these
 * paths onto the latest stored copy, so other screens' edits are never overwritten.
 * With `enabled: false` (no Site Copy access) nothing is loaded and `copy` stays null.
 */
export function useSiteCopySlice(paths: readonly string[], savedMessage: string, { enabled = true } = {}) {
  const [copy, setCopy] = useState<SiteCopy | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const { dirty, markClean } = useDirtyTracker(copy && paths.map((path) => getPath(copy, path)));

  useEffect(() => {
    if (!enabled) return;
    fetchCopy()
      .then((loaded) => {
        setCopy(loaded);
        markClean();
      })
      .catch((e: Error) => setError(e.message));
  }, [enabled, markClean]);

  /** Resolves to false when the save failed (the reason is in `error`). */
  async function save(): Promise<boolean> {
    if (!copy) return false;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const next = withPaths(await fetchCopy(), copy, paths);
      const res = await fetch('/api/admin/site-copy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setCopy(data.copy);
      markClean();
      setMessage(savedMessage);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { copy, setCopy, dirty, error, message, saving, save };
}
