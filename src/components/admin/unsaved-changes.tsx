'use client';

import Link from 'next/link';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';

const LEAVE_PROMPT = 'You have unsaved changes. Leave without saving?';

type UnsavedChangesContextValue = {
  dirty: boolean;
  setDirty: (source: string, dirty: boolean) => void;
  /** True when nothing is unsaved or the user agrees to discard it. */
  confirmDiscard: () => boolean;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue>({
  dirty: false,
  setDirty: () => {},
  confirmDiscard: () => true,
});

/** Admin-wide unsaved-edits state: warns on reload/close and on links rendered with `AdminLink`. */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<ReadonlySet<string>>(() => new Set());
  const dirty = sources.size > 0;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const setDirty = useCallback((source: string, next: boolean) => {
    setSources((prev) => {
      if (prev.has(source) === next) return prev;
      const updated = new Set(prev);
      if (next) updated.add(source);
      else updated.delete(source);
      return updated;
    });
  }, []);

  const confirmDiscard = useCallback(() => !dirty || window.confirm(LEAVE_PROMPT), [dirty]);

  const value = useMemo(() => ({ dirty, setDirty, confirmDiscard }), [dirty, setDirty, confirmDiscard]);
  return <UnsavedChangesContext.Provider value={value}>{children}</UnsavedChangesContext.Provider>;
}

export function useUnsavedChangesState() {
  return useContext(UnsavedChangesContext);
}

/** Registers this component's unsaved state while `dirty` is true. */
export function useUnsavedChanges(dirty: boolean) {
  const source = useId();
  const { setDirty } = useContext(UnsavedChangesContext);
  useEffect(() => {
    setDirty(source, dirty);
  }, [source, dirty, setDirty]);
  useEffect(() => () => setDirty(source, false), [source, setDirty]);
}

/**
 * Snapshot-based dirty tracking for editors without a saved copy of their state.
 * Call `markClean()` in the same tick as the state update that loads or saves `value`.
 */
export function useDirtyTracker(value: unknown) {
  const current = JSON.stringify(value ?? null);
  const [clean, setClean] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (pending) {
    setPending(false);
    setClean(current);
  }
  const dirty = !pending && clean !== null && clean !== current;
  useUnsavedChanges(dirty);
  const markClean = useCallback(() => setPending(true), []);
  return { dirty, markClean };
}

/** `next/link` that asks before leaving a screen with unsaved changes. */
export function AdminLink({ onNavigate, ...props }: ComponentProps<typeof Link>) {
  const { confirmDiscard } = useContext(UnsavedChangesContext);
  return (
    <Link
      {...props}
      onNavigate={(e) => {
        onNavigate?.(e);
        if (!confirmDiscard()) e.preventDefault();
      }}
    />
  );
}
