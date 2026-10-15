'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { canOpenHubTab, type AdminHubTab } from '@/lib/admin-hub-tabs';
import { useAdminUser } from '@/components/admin/admin-session';
import { useUnsavedChangesState } from '@/components/admin/unsaved-changes';

export type { AdminHubTab };

type HubControls<Id extends string> = {
  /** Whether the signed-in user can open a tab. */
  can: (id: Id) => boolean;
  /** Switch tab (asks first when there are unsaved edits); `hash` deep-links a section. */
  select: (id: Id, hash?: string) => void;
};

/** Tabbed screen that groups editors of one topic; the open tab lives in `?tab=`. */
export default function AdminHub<Id extends string>({
  title,
  intro,
  tabs: allTabs,
  initialTab,
  children,
}: {
  title: string;
  intro: ReactNode;
  tabs: readonly AdminHubTab<Id>[];
  initialTab?: string;
  children: (active: Id, controls: HubControls<Id>) => ReactNode;
}) {
  const user = useAdminUser();
  const { confirmDiscard } = useUnsavedChangesState();
  const tabs = useMemo(
    () => (user ? allTabs.filter((t) => canOpenHubTab(user.screens, t)) : []),
    [allTabs, user]
  );

  const [picked, setPicked] = useState(initialTab);
  const [syncedInitial, setSyncedInitial] = useState(initialTab);
  if (initialTab !== syncedInitial) {
    setSyncedInitial(initialTab);
    setPicked(initialTab);
  }
  const active = tabs.find((t) => t.id === picked) ?? tabs[0];

  const controls: HubControls<Id> = {
    can: (id) => tabs.some((t) => t.id === id),
    select: (id, hash = '') => {
      const target = tabs.find((t) => t.id === id);
      const sameEditor = !!active?.editor && active.editor === target?.editor;
      if (id !== active?.id && !sameEditor && !confirmDiscard()) return;
      setPicked(id);
      window.history.replaceState(null, '', `?tab=${id}${hash}`);
    },
  };

  if (!user) return <div className="admin-card">Loading…</div>;

  return (
    <div className="admin-page-stack">
      <div className="admin-card admin-page-intro">
        <h2>{title}</h2>
        <p>{intro}</p>
        <div className="theme-tabs" role="tablist" aria-label={title} style={{ marginTop: '0.75rem' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === active?.id}
              className={t.id === active?.id ? 'is-active' : ''}
              onClick={() => controls.select(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {active ? (
          <p className="theme-help" style={{ marginBottom: 0 }}>
            {active.description}
          </p>
        ) : null}
      </div>

      {active ? children(active.id, controls) : <div className="admin-card">Your role has no access to this screen.</div>}
    </div>
  );
}
