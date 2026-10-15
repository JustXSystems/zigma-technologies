'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { CmsPage } from '@/lib/cms-types';
import PageSectionsManager from '@/components/admin/PageSectionsManager';
import AdminCollapsible from '@/components/admin/AdminCollapsible';
import AdminFloatingActions from '@/components/admin/AdminFloatingActions';
import SeoFieldsEditor from '@/components/admin/SeoFieldsEditor';
import { AdminLink, useDirtyTracker } from '@/components/admin/unsaved-changes';
import { movedAddressNote } from '@/lib/moved-address';
import { appHref } from '@/lib/base-path';

const pagePath = (slug: string) => (slug === 'home' ? '/' : `/${slug}`);

export default function AdminPageSectionsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pageId = Number(params.id);
  const [page, setPage] = useState<CmsPage | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [busy, setBusy] = useState('');
  const { dirty, markClean } = useDirtyTracker({ pageTitle, pageSlug, metaTitle, metaDescription });

  const apply = useCallback(
    (next: CmsPage, withDetails: boolean) => {
      setPage(next);
      if (!withDetails) return;
      setPageTitle(next.title || '');
      setPageSlug(next.slug || '');
      setMetaTitle(next.meta_title || '');
      setMetaDescription(next.meta_description || '');
      markClean();
    },
    [markClean]
  );

  const fetchPage = useCallback(async () => {
    const res = await fetch(`/api/admin/pages/${pageId}`, { credentials: 'same-origin' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    return data.page as CmsPage;
  }, [pageId]);

  /** Refresh sections and status without touching unsaved page-detail edits. */
  const reloadSections = useCallback(async () => apply(await fetchPage(), false), [apply, fetchPage]);

  useEffect(() => {
    if (!pageId) return;
    let current = true;
    fetchPage()
      .then((next) => current && apply(next, true))
      .catch((e: Error) => current && setError(e.message));
    return () => {
      current = false;
    };
  }, [pageId, fetchPage, apply]);

  async function run(key: string, task: () => Promise<string | void>) {
    setBusy(key);
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

  async function patchPage(body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/pages/${pageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Save failed');
    return data;
  }

  const saveDetails = (e?: FormEvent) => {
    e?.preventDefault();
    return run('details', async () => {
      const data = await patchPage({
        title: pageTitle,
        slug: pageSlug,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
      });
      apply(await fetchPage(), true);
      return `Page details saved.${movedAddressNote(data.redirect)}`;
    });
  };

  const setPublished = (published: boolean) =>
    run('status', async () => {
      await patchPage({ status: published ? 'published' : 'draft' });
      await reloadSections();
      return published ? 'Page published.' : 'Page moved back to draft. Visitors no longer see it.';
    });

  const preview = () =>
    run('preview', async () => {
      const res = await fetch(`/api/admin/pages/${pageId}/preview`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Preview failed');
      window.open(data.url, '_blank', 'noopener,noreferrer');
    });

  function deletePage() {
    if (!page || !window.confirm(`Delete page "${page.title}" and all its sections?`)) return;
    void run('delete', async () => {
      const res = await fetch(`/api/admin/pages/${page.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      router.push('/admin/pages');
    });
  }

  function clearSections() {
    if (!window.confirm('Delete ALL sections on this page? You can re-seed built-in pages afterwards from Pages.')) return;
    void run('clear', async () => {
      const res = await fetch(`/api/admin/pages/${pageId}/sections`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Clear failed');
      await reloadSections();
      return data.message || 'Sections cleared.';
    });
  }

  const published = page?.status === 'published';
  const sections = page?.sections || [];

  return (
    <div className="admin-page-stack">
      <AdminFloatingActions status={message || (busy === 'details' ? 'Saving…' : undefined)}>
        {page ? (
          <button type="button" className="admin-btn admin-btn-secondary" disabled={busy === 'preview'} onClick={() => void preview()}>
            Preview
          </button>
        ) : null}
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy === 'details' || !dirty} onClick={() => void saveDetails()}>
          {busy === 'details' ? 'Saving…' : 'Save page details'}
        </button>
      </AdminFloatingActions>

      <div>
        <AdminLink href="/admin/pages" className="admin-btn admin-btn-secondary">
          ← Back to pages
        </AdminLink>
      </div>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="admin-card admin-page-intro">
        <div className="admin-toolbar" style={{ marginBottom: 0 }}>
          <div>
            <h2>{page?.title || 'Page'}</h2>
            <p>
              {page ? (
                <>
                  <span className={`admin-badge ${page.status}`}>{page.status}</span>{' '}
                  {page.enabled ? null : <span className="admin-badge closed">disabled</span>}{' '}
                  <a href={appHref(pagePath(page.slug))} target="_blank" rel="noreferrer">
                    <code>{pagePath(page.slug)}</code> ↗
                  </a>{' '}
                  · {sections.length} section{sections.length === 1 ? '' : 's'}
                  {sections.some((s) => !s.enabled) ? `, ${sections.filter((s) => !s.enabled).length} hidden` : ''}
                </>
              ) : (
                'Loading…'
              )}
            </p>
          </div>
          {page ? (
            <button
              type="button"
              className={`admin-btn ${published ? 'admin-btn-secondary' : 'admin-btn-primary'}`}
              disabled={busy === 'status'}
              onClick={() => void setPublished(!published)}
            >
              {published ? 'Unpublish' : 'Publish page'}
            </button>
          ) : null}
        </div>
      </div>

      {page ? (
        <section className="admin-card">
          <div className="admin-page-intro" style={{ marginBottom: '0.85rem' }}>
            <h2>Sections</h2>
            <p>Top to bottom, as on the page. Click a section to edit its content, look and media.</p>
          </div>
          <PageSectionsManager
            pageId={page.id}
            pageSlug={page.slug}
            sections={sections}
            reload={reloadSections}
            emptyText="No sections yet. Add one below, or seed a built-in page from Pages."
          />
        </section>
      ) : null}

      <AdminCollapsible title="Page details & SEO" description="Title, address (slug), and the search / share preview." defaultOpen={false}>
        <form onSubmit={(e) => void saveDetails(e)} className="admin-form-grid">
          <div className="admin-field">
            <label>Title</label>
            <input className="admin-input" value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} required />
          </div>
          <div className="admin-field">
            <label>Slug</label>
            <input className="admin-input" value={pageSlug} onChange={(e) => setPageSlug(e.target.value)} required />
          </div>
          <div className="full">
            <SeoFieldsEditor
              value={{ title: metaTitle, description: metaDescription }}
              onChange={(next) => {
                setMetaTitle(next.title);
                setMetaDescription(next.description);
              }}
              fallbackTitle={pageSlug === 'home' ? undefined : pageTitle}
              path={pagePath(pageSlug)}
            />
          </div>
        </form>
      </AdminCollapsible>

      <AdminCollapsible title="Danger zone" description="Remove every section, or delete the whole page." defaultOpen={false}>
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button type="button" className="admin-btn admin-btn-danger" disabled={Boolean(busy)} onClick={clearSections}>
            Clear all sections
          </button>
          <button type="button" className="admin-btn admin-btn-danger" disabled={Boolean(busy)} onClick={deletePage}>
            Delete page
          </button>
        </div>
      </AdminCollapsible>
    </div>
  );
}
