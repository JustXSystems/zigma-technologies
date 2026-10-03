'use client';

import { useEffect, useRef } from 'react';
import { ADMIN_SCREEN_DEFS, ASSIGNABLE_SCREEN_DEFS, type AdminScreenKey } from '@/lib/admin-screens';

const LABELS = new Map(ADMIN_SCREEN_DEFS.map((s) => [s.key, s.label]));

const GROUPS = (() => {
  const map = new Map<string, typeof ASSIGNABLE_SCREEN_DEFS>();
  for (const screen of ASSIGNABLE_SCREEN_DEFS) map.set(screen.group, [...(map.get(screen.group) ?? []), screen]);
  return Array.from(map, ([group, screens]) => ({ group, screens }));
})();

export const ASSIGNABLE_COUNT = ASSIGNABLE_SCREEN_DEFS.length;

/** Plain-language note for hub screens that other permissions also open. */
function hubNote(openWith?: readonly AdminScreenKey[]) {
  if (!openWith?.length) return undefined;
  return `Also opens for ${openWith.map((k) => LABELS.get(k) ?? k).join(' / ')} holders (their tabs only)`;
}

function GroupToggle({ group, keys, selected, disabled, onChange }: {
  group: string;
  keys: AdminScreenKey[];
  selected: Set<AdminScreenKey>;
  disabled?: boolean;
  onChange: (keys: AdminScreenKey[], on: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const count = keys.filter((k) => selected.has(k)).length;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = count > 0 && count < keys.length;
  }, [count, keys.length]);
  return (
    <label className="access-perm-group-toggle">
      <input
        ref={ref}
        type="checkbox"
        checked={count === keys.length}
        disabled={disabled}
        onChange={(e) => onChange(keys, e.target.checked)}
        aria-label={`All ${group} screens`}
      />
      <span>{group}</span>
      <small>
        {count}/{keys.length}
      </small>
    </label>
  );
}

/** Screen checklist grouped like the sidebar, with per-group and global select. */
export default function PermissionMatrix({
  value,
  onChange,
  disabled,
}: {
  value: AdminScreenKey[];
  onChange: (next: AdminScreenKey[]) => void;
  disabled?: boolean;
}) {
  const selected = new Set(value);
  const set = (keys: AdminScreenKey[], on: boolean) => {
    const next = new Set(selected);
    for (const k of keys) {
      if (on) next.add(k);
      else next.delete(k);
    }
    onChange(ASSIGNABLE_SCREEN_DEFS.filter((s) => next.has(s.key)).map((s) => s.key));
  };
  const all = ASSIGNABLE_SCREEN_DEFS.map((s) => s.key);

  return (
    <fieldset className="access-perms" disabled={disabled}>
      <legend className="access-perms-legend">
        <span>Screen access</span>
        <span className="access-perms-count" aria-live="polite">
          {value.length} of {ASSIGNABLE_COUNT} screens
        </span>
      </legend>
      <div className="access-perms-meter" aria-hidden="true">
        <span style={{ width: `${(value.length / ASSIGNABLE_COUNT) * 100}%` }} />
      </div>
      <div className="access-perms-bulk">
        <button type="button" className="admin-link-btn" onClick={() => set(all, true)}>
          Select all
        </button>
        <button type="button" className="admin-link-btn" onClick={() => set(all, false)}>
          Clear
        </button>
      </div>
      {GROUPS.map(({ group, screens }) => (
        <section key={group} className="access-perm-group">
          <GroupToggle group={group} keys={screens.map((s) => s.key)} selected={selected} disabled={disabled} onChange={set} />
          <div className="access-perm-list">
            {screens.map((screen) => {
              const note = hubNote(screen.openWith);
              const label = screen.accessLabel ?? screen.label;
              return (
                <label key={screen.key} className={`access-perm${selected.has(screen.key) ? ' is-on' : ''}`} htmlFor={`role-screen-${screen.key}`}>
                  <input
                    id={`role-screen-${screen.key}`}
                    type="checkbox"
                    checked={selected.has(screen.key)}
                    onChange={(e) => set([screen.key], e.target.checked)}
                  />
                  <span className="access-perm-switch" aria-hidden="true" />
                  <span className="access-perm-text">
                    <strong>{label}</strong>
                    {note ? <small>{note}</small> : <small>{screen.href}</small>}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      ))}
      <p className="admin-hint">Account is always available. Users, Roles, Email and New Client are reserved for full admins.</p>
    </fieldset>
  );
}

export function screenLabel(key: AdminScreenKey) {
  return LABELS.get(key) ?? key;
}
