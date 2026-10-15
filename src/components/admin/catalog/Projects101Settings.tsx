'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CmsPage } from '@/lib/cms-types';
import { PROJECTS101_SLUG } from '@/lib/projects101-sections';
import type { CatalogListingDesign } from '@/lib/types';
import PageSectionsManager from '@/components/admin/PageSectionsManager';
import { appHref } from '@/lib/base-path';

/** Section types built for this page, offered first in "Add section". */
const PREFERRED_TYPES = {
  label: 'Projects 101 design',
  types: ['ind101_hero', 'ind101_stats', 'pj101_projects', 'pj101_ongoing', 'ind101_cta'],
};

type Snapshot = { page: CmsPage | null; listing_design: CatalogListingDesign };

async function readSnapshot(res: Response): Promise<Snapshot & { message?: string }> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function Projects101Settings({ onDesignChange }: { onDesignChange?: (design: CatalogListingDesign) => void }) {
  const [page, setPage] = useState<CmsPage | null>(null);
  const [design, setDesign] = useState<CatalogListingDesign>('classic');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const sections = page?.sections || [];

  const apply = useCallback((snap: Snapshot) => {
    setPage(snap.page);
    setDesign(snap.listing_design === 'projects101' ? 'projects101' : 'classic');
    setLoaded(true);
  }, []);

  const load = useCallback(async () => {
    apply(await readSnapshot(await fetch('/api/admin/catalog-settings/projects101', { credentials: 'same-origin' })));
  }, [apply]);

  useEffect(() => {
    let current = true;
    fetch('/api/admin/catalog-settings/projects101', { credentials: 'same-origin' })
      .then(readSnapshot)
      .then((snap) => {
        if (current) apply(snap);
      })
      .catch((e: Error) => {
        if (current) {
          setError(e.message);
          setLoaded(true);
        }
      });
    return () => {
      current = false;
    };
  }, [apply]);

  async function run(label: string, task: () => Promise<string | void>) {
    setBusy(label);
    setError('');
    setMessage('');
    try {
      const note = await task();
      if (note) setMessage(note);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy('');
    }
  }

  const seed = () =>
    run('seed', async () => {
      const snap = await readSnapshot(
        await fetch('/api/admin/catalog-settings/projects101', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'seed' }),
        })
      );
      apply(snap);
      return snap.message;
    });

  const switchDesign = (next: CatalogListingDesign) =>
    run('design', async () => {
      const res = await fetch('/api/admin/catalog-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: 'project', listing_design: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      const saved: CatalogListingDesign = data.settings?.listing_design === 'projects101' ? 'projects101' : 'classic';
      setDesign(saved);
      onDesignChange?.(saved);
      return next === 'projects101'
        ? '/projects now shows the Projects 101 page.'
        : '/projects now shows the classic catalog listing again.';
    });

  return (
    <div className="admin-settings-panel">
      <div className="admin-settings-panel-head">
        <div>
          <div className="admin-settings-panel-head-copy">
            <h2>Projects 101 page</h2>
            <p>
              The redesigned projects page at <code>/{PROJECTS101_SLUG}</code>: hero, stat strip, project cards with detail popup and running strip,
              ongoing projects and CTA band. Every section, element and style is editable below.
            </p>
          </div>
        </div>
      </div>
      <div className="admin-settings-panel-body">
        {error ? <div className="admin-error">{error}</div> : null}
        {message ? <div className="admin-success">{message}</div> : null}

        <div className="admin-card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Which page does /projects show?</h3>
          <p className="admin-hint" style={{ marginTop: 0 }}>
            Switch any time; it applies immediately. Both designs keep their own settings, so you can switch back without losing anything.
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }} role="radiogroup" aria-label="Design served on /projects">
            {(
              [
                { value: 'classic', label: 'Classic catalog listing', hint: 'Inventory → Projects, with the Projects tab settings' },
                { value: 'projects101', label: 'Projects 101 page', hint: 'The sections managed on this tab' },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className="admin-footer-office-toggle"
                style={{ flex: '1 1 260px', cursor: busy ? 'progress' : 'pointer', opacity: busy === 'design' ? 0.6 : 1 }}
              >
                <input
                  type="radio"
                  name="pj101-listing-design"
                  checked={design === opt.value}
                  disabled={!loaded || Boolean(busy)}
                  onChange={() => void switchDesign(opt.value)}
                />
                <span>
                  <strong>{opt.label}</strong>
                  <small>{opt.hint}</small>
                </span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
            <a className="admin-btn admin-btn-secondary" href={appHref(`/${PROJECTS101_SLUG}`)} target="_blank" rel="noreferrer">
              View /{PROJECTS101_SLUG} ↗
            </a>
            <a className="admin-btn admin-btn-secondary" href={appHref('/projects')} target="_blank" rel="noreferrer">
              View /projects ↗
            </a>
            {page ? (
              <a className="admin-btn admin-btn-secondary" href={appHref(`/admin/pages/${page.id}`)}>
                Page title & SEO →
              </a>
            ) : null}
          </div>
        </div>

        {!loaded ? (
          <p className="admin-empty">Loading Projects 101…</p>
        ) : !page ? (
          <div className="admin-card">
            <h3 style={{ marginTop: 0 }}>Create the Projects 101 page</h3>
            <p className="admin-hint" style={{ marginTop: 0 }}>
              Until it is created the page shows the built-in design defaults and cannot be edited. Creating it copies the design (5 sections, 9
              sample projects, 3 ongoing projects) into the CMS so every element becomes editable.
            </p>
            <button type="button" className="admin-btn admin-btn-primary" disabled={Boolean(busy)} onClick={() => void seed()}>
              {busy === 'seed' ? 'Creating…' : 'Create page from the design'}
            </button>
          </div>
        ) : (
          <div className="admin-card">
            <PageSectionsManager
              pageId={page.id}
              pageSlug={PROJECTS101_SLUG}
              sections={sections}
              reload={load}
              preferred={PREFERRED_TYPES}
              emptyText="No sections. Add one below or restore the design sections."
              actions={
                <button type="button" className="admin-btn admin-btn-secondary" disabled={Boolean(busy)} onClick={() => void seed()}>
                  {busy === 'seed' ? 'Checking…' : 'Restore missing design sections'}
                </button>
              }
            />
            <p className="admin-hint">Restore only adds design sections the page does not have yet; it never changes or removes your edits.</p>
          </div>
        )}
      </div>
    </div>
  );
}
