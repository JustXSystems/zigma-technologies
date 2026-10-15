'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import AdminCollapsible from '@/components/admin/AdminCollapsible';

type GroupState = { all: boolean | null; overrides: Record<string, boolean> };

const GroupContext = createContext<{
  state: GroupState;
  setOpen: (title: string, open: boolean) => void;
} | null>(null);

/** Owns open/closed state for every Group below it (titles must be unique per editor). */
export function GroupProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GroupState>({ all: null, overrides: {} });
  const setOpen = (title: string, open: boolean) =>
    setState((s) => ({ ...s, overrides: { ...s.overrides, [title]: open } }));
  return (
    <GroupContext.Provider value={{ state, setOpen }}>
      <div className="lz-admin-toolbar">
        <span className="az-admin-hint" style={{ margin: 0 }}>
          Every field is optional: empty = design default / Site Settings value.
        </span>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button
            type="button"
            className="admin-btn admin-btn-secondary az-admin-mini"
            onClick={() => setState({ all: true, overrides: {} })}
          >
            Expand all
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-secondary az-admin-mini"
            onClick={() => setState({ all: false, overrides: {} })}
          >
            Collapse all
          </button>
        </div>
      </div>
      {children}
    </GroupContext.Provider>
  );
}

/** Collapsible block of related fields inside a section editor. */
export function Group({
  title,
  description,
  open: defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  open?: boolean;
  children: ReactNode;
}) {
  const ctx = useContext(GroupContext);
  const open = ctx ? (ctx.state.overrides[title] ?? ctx.state.all ?? defaultOpen) : undefined;
  return (
    <AdminCollapsible
      title={title}
      description={description}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={ctx ? (next) => ctx.setOpen(title, next) : undefined}
      className="az-admin-group"
    >
      {children}
    </AdminCollapsible>
  );
}
