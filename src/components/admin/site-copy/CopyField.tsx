'use client';

import { useId } from 'react';
import type { SiteCopy } from '@/lib/site-copy';

export function getPath(obj: unknown, path: string): unknown {
  let cur = obj;
  for (const p of path.split('.')) cur = (cur as Record<string, unknown> | undefined)?.[p];
  return cur;
}

export function setPath(obj: SiteCopy, path: string, value: unknown): SiteCopy {
  const parts = path.split('.');
  const clone = structuredClone(obj) as Record<string, unknown>;
  let cur: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
  return clone as unknown as SiteCopy;
}

/** `target` with the given paths taken from `source` — lets two screens save one copy object without clobbering. */
export function withPaths(target: SiteCopy, source: SiteCopy, paths: readonly string[]): SiteCopy {
  return paths.reduce((acc, path) => setPath(acc, path, getPath(source, path)), target);
}

/** Text field bound to a dotted Site Copy path; string arrays edit one item per line. */
export function CopyField({
  label,
  path,
  copy,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  path: string;
  copy: SiteCopy;
  onChange: (next: SiteCopy) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const cur = getPath(copy, path);
  const value = typeof cur === 'string' ? cur : Array.isArray(cur) ? cur.join('\n') : '';

  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          className="admin-textarea"
          style={{ width: '100%', minHeight: 88 }}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            if (Array.isArray(cur)) {
              onChange(setPath(copy, path, e.target.value.split('\n').filter(Boolean)));
            } else {
              onChange(setPath(copy, path, e.target.value));
            }
          }}
        />
      ) : (
        <input
          id={id}
          className="admin-input"
          style={{ width: '100%' }}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(setPath(copy, path, e.target.value))}
        />
      )}
    </div>
  );
}
