'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { ADMIN_SCREEN_DEFS, canOpenScreen, hasScreenAccess, type AdminScreenKey } from '@/lib/admin-screens';
import { ADMIN_HUBS, canOpenHubTab } from '@/lib/admin-hub-tabs';
import type { CmsPage } from '@/lib/cms-types';
import { useUnsavedChangesState } from '@/components/admin/unsaved-changes';

type Entry = { key: string; label: string; context: string; href: string; keywords: string };

/** Screens and hub tabs the user may open (sync, no network). */
function staticEntries(screens: AdminScreenKey[] | '*'): Entry[] {
  const entries: Entry[] = ADMIN_SCREEN_DEFS.filter((s) => canOpenScreen(screens, s.key)).map((s) => ({
    key: `screen-${s.key}`,
    label: s.label,
    context: `${s.group} · ${s.summary}`,
    href: s.href,
    keywords: s.accessLabel || '',
  }));
  for (const hub of ADMIN_HUBS) {
    const hubLabel = ADMIN_SCREEN_DEFS.find((s) => s.key === hub.screen)?.label || hub.href;
    for (const tab of hub.tabs) {
      if (!canOpenHubTab(screens, tab)) continue;
      entries.push({
        key: `tab-${hub.href}-${tab.id}`,
        label: `${hubLabel} → ${tab.label}`,
        context: tab.description,
        href: `${hub.href}?tab=${tab.id}`,
        keywords: '',
      });
    }
  }
  return entries;
}

/** Site settings sections and CMS pages, loaded when the finder first opens. */
async function loadedEntries(screens: AdminScreenKey[] | '*'): Promise<Entry[]> {
  const entries: Entry[] = [];
  const tasks: Promise<void>[] = [];
  if (hasScreenAccess(screens, 'siteSettings')) {
    tasks.push(
      import('@/components/admin/site-settings/SiteSettingsEditor').then(({ siteSettingsSearchIndex }) => {
        for (const s of siteSettingsSearchIndex()) {
          entries.push({
            key: `settings-${s.id}`,
            label: s.title,
            context: `Setting · ${s.description}`,
            href: s.href,
            keywords: s.fields.join(' '),
          });
        }
      })
    );
  }
  if (hasScreenAccess(screens, 'pages')) {
    tasks.push(
      fetch('/api/admin/pages', { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : { pages: [] }))
        .then((data: { pages?: CmsPage[] }) => {
          for (const p of data.pages || []) {
            entries.push({
              key: `page-${p.id}`,
              label: `${p.title} page`,
              context: `Page sections · ${p.slug === 'home' ? '/' : `/${p.slug}`} · ${p.status}`,
              href: `/admin/pages/${p.id}`,
              keywords: p.slug,
            });
          }
        })
    );
  }
  await Promise.allSettled(tasks);
  return entries;
}

function rank(entry: Entry, terms: string[]): number {
  const label = entry.label.toLowerCase();
  const haystack = `${label} ${entry.context} ${entry.keywords}`.toLowerCase();
  if (!terms.every((t) => haystack.includes(t))) return -1;
  const first = terms[0];
  if (label.startsWith(first)) return 3;
  if (label.split(/[\s→&/-]+/).some((w) => w.startsWith(first))) return 2;
  return terms.every((t) => label.includes(t)) ? 1 : 0;
}

/** Ctrl/⌘ + K finder over every admin screen, hub tab, site setting and CMS page the user can open. */
export default function AdminQuickFind({ screens }: { screens: AdminScreenKey[] | '*' }) {
  const router = useRouter();
  const pathname = usePathname();
  const { confirmDiscard } = useUnsavedChangesState();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [extra, setExtra] = useState<Entry[] | null>(null);
  const loadStarted = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const base = useMemo(() => staticEntries(screens), [screens]);
  const results = useMemo(() => {
    const all = [...base, ...(extra || [])];
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return all.filter((e) => e.key.startsWith('screen-'));
    return all
      .map((entry) => ({ entry, score: rank(entry, terms) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map((r) => r.entry);
  }, [base, extra, query]);
  const active = Math.min(cursor, Math.max(results.length - 1, 0));

  const toggle = useCallback(
    (next?: boolean) => {
      setQuery('');
      setCursor(0);
      setOpen((was) => next ?? !was);
      if (loadStarted.current) return;
      loadStarted.current = true;
      void loadedEntries(screens).then(setExtra);
    },
    [screens]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function go(entry: Entry | undefined) {
    if (!entry) return;
    const [target, hash] = entry.href.split('#');
    const here = `${pathname}${window.location.search}`;
    if (hash && target === here) {
      setOpen(false);
      window.location.hash = hash;
      return;
    }
    if (!confirmDiscard()) return;
    setOpen(false);
    router.push(entry.href);
  }

  function onInputKey(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((active + 1) % Math.max(results.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((active - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <>
      <button type="button" className="admin-quickfind-trigger" onClick={() => toggle(true)} aria-haspopup="dialog" title="Find any screen or setting">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span>Find a setting…</span>
        <kbd>Ctrl K</kbd>
      </button>
      {open
        ? createPortal(
            <div className="admin-modal-backdrop admin-quickfind-backdrop" onClick={() => setOpen(false)}>
              <div
                className="admin-quickfind"
                role="dialog"
                aria-modal="true"
                aria-label="Find a screen or setting"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  ref={inputRef}
                  className="admin-quickfind-input"
                  placeholder="Search screens, tabs, settings and pages…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCursor(0);
                  }}
                  onKeyDown={onInputKey}
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="admin-quickfind-list"
                  aria-activedescendant={results[active] ? `qf-${results[active].key}` : undefined}
                />
                <ul ref={listRef} id="admin-quickfind-list" className="admin-quickfind-list" role="listbox">
                  {results.length === 0 ? (
                    <li className="admin-quickfind-empty">{extra ? 'Nothing matches.' : 'Searching…'}</li>
                  ) : (
                    results.map((entry, i) => (
                      <li
                        key={entry.key}
                        id={`qf-${entry.key}`}
                        role="option"
                        aria-selected={i === active}
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => go(entry)}
                      >
                        <strong>{entry.label}</strong>
                        <span>{entry.context}</span>
                      </li>
                    ))
                  )}
                </ul>
                <div className="admin-quickfind-foot">
                  <span>
                    <kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close
                  </span>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
