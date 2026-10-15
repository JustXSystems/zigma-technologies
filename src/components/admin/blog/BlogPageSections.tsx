'use client';

import { useCallback, useEffect, useState } from 'react';
import PageSectionsManager from '@/components/admin/PageSectionsManager';
import { appHref } from '@/lib/base-path';
import { BLOG_SECTION_TYPES, BLOG_SLUG } from '@/lib/blog-sections';
import type { CmsPage } from '@/lib/cms-types';

const PREFERRED_TYPES = { label: 'Blog design', types: [...BLOG_SECTION_TYPES] };

async function readJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Request failed');
  return data as T;
}

async function fetchBlogPage(): Promise<CmsPage | null> {
  const { pages } = await readJson<{ pages: CmsPage[] }>(await fetch('/api/admin/pages'));
  const found = pages.find((p) => p.slug === BLOG_SLUG);
  return found ? (await readJson<{ page: CmsPage }>(await fetch(`/api/admin/pages/${found.id}`))).page : null;
}

/** The CMS page behind /blog: its sections, plus creating it from the design when it does not exist yet. */
export default function BlogPageSections() {
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const apply = useCallback((next: CmsPage | null) => {
    setPage(next);
    setLoaded(true);
  }, []);
  const load = useCallback(async () => apply(await fetchBlogPage()), [apply]);

  useEffect(() => {
    let current = true;
    fetchBlogPage()
      .then((next) => {
        if (current) apply(next);
      })
      .catch((e: Error) => {
        if (!current) return;
        setError(e.message);
        setLoaded(true);
      });
    return () => {
      current = false;
    };
  }, [apply]);

  async function seed() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await readJson<{ message?: string }>(
        await fetch('/api/admin/pages/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync', slug: BLOG_SLUG }),
        })
      );
      await load();
      setMessage(data.message || 'Done.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <div className="admin-card">Loading the /blog page…</div>;

  return (
    <div className="admin-card">
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}
      {!page ? (
        <>
          <h3 style={{ marginTop: 0 }}>Create the /blog page</h3>
          <p className="admin-hint" style={{ marginTop: 0 }}>
            Until it is created /blog shows the built-in design and cannot be edited. Creating it copies the five design sections — hero, featured,
            topics, article feed and CTA band — into the CMS so every element becomes editable.
          </p>
          <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void seed()}>
            {busy ? 'Creating…' : 'Create page from the design'}
          </button>
        </>
      ) : (
        <>
          <PageSectionsManager
            pageId={page.id}
            pageSlug={BLOG_SLUG}
            sections={page.sections || []}
            reload={load}
            preferred={PREFERRED_TYPES}
            emptyText="No sections. Add one below."
            actions={
              <>
                <button type="button" className="admin-btn admin-btn-secondary" disabled={busy} onClick={() => void seed()}>
                  {busy ? 'Checking…' : 'Sync with the design'}
                </button>
                <a className="admin-btn admin-btn-secondary" href={appHref(`/admin/pages/${page.id}`)}>
                  Page title &amp; SEO →
                </a>
              </>
            }
          />
          <p className="admin-hint">
            Sync adds design sections introduced since the page was created. It never changes your edits or brings back a section you deleted —
            add that again from &ldquo;Add section&rdquo;. Colours for a design are applied from the Design tab.
          </p>
        </>
      )}
    </div>
  );
}
