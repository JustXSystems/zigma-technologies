'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { CmsPage, CmsSection } from '@/lib/cms-types';
import { SECTION_TYPES } from '@/lib/cms-types';
import SectionEditor from '@/components/admin/SectionEditor';

export default function AdminPageSectionsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pageId = Number(params.id);
  const [page, setPage] = useState<CmsPage | null>(null);
  const [sections, setSections] = useState<CmsSection[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [addType, setAddType] = useState('why');
  const [editing, setEditing] = useState<CmsSection | null>(null);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');

  async function load() {
    const res = await fetch(`/api/admin/pages/${pageId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    setPage(data.page);
    setSections(data.page.sections || []);
    setPageTitle(data.page.title || '');
    setPageSlug(data.page.slug || '');
    setMetaTitle(data.page.meta_title || '');
    setMetaDescription(data.page.meta_description || '');
  }

  useEffect(() => {
    if (!pageId) return;
    load().catch((e) => setError(e.message));
  }, [pageId]);

  const typeLabel = useMemo(() => {
    const map = Object.fromEntries(SECTION_TYPES.map((t) => [t.type, t.label]));
    return (type: string) => map[type] || type;
  }, []);

  async function saveMeta(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await fetch(`/api/admin/pages/${pageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: pageTitle,
        slug: pageSlug,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Save failed');
      return;
    }
    setMessage('Page details saved.');
    await load();
  }

  async function deletePage() {
    if (!page) return;
    if (!confirm(`Delete page "${page.title}" and all its sections?`)) return;
    const res = await fetch(`/api/admin/pages/${page.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Delete failed');
      return;
    }
    router.push('/admin/pages');
  }

  async function addSection(e: FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page_id: pageId,
        type: addType,
        title: typeLabel(addType),
        content_json: {},
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Add failed');
      return;
    }
    await load();
  }

  async function duplicate(section: CmsSection) {
    const res = await fetch('/api/admin/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page_id: pageId,
        type: section.type,
        title: `${section.title || section.type} (copy)`,
        section_key: section.section_key ? `${section.section_key}-copy` : null,
        content_json: section.content_json || {},
        style_json: section.style_json || {},
        enabled: false,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Duplicate failed');
      return;
    }
    await load();
  }

  async function toggle(section: CmsSection) {
    await fetch(`/api/admin/sections/${section.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !section.enabled }),
    });
    await load();
  }

  async function remove(section: CmsSection) {
    if (!confirm(`Delete section "${section.title || section.type}"?`)) return;
    await fetch(`/api/admin/sections/${section.id}`, { method: 'DELETE' });
    await load();
  }

  async function move(section: CmsSection, dir: -1 | 1) {
    const idx = sections.findIndex((s) => s.id === section.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= sections.length) return;
    const next = [...sections];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setSections(next);
    await fetch('/api/admin/sections/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_id: pageId, ordered_ids: next.map((s) => s.id) }),
    });
  }

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/admin/pages" className="admin-btn admin-btn-secondary">
          ← Back to pages
        </Link>
      </div>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <div className="admin-toolbar" style={{ marginBottom: '0.8rem' }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 0 }}>{page?.title || 'Page'} sections</h2>
            <p style={{ color: 'var(--admin-muted)', marginTop: '0.35rem', marginBottom: 0 }}>
              Slug: <code>/{page?.slug === 'home' ? '' : page?.slug}</code>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {page ? (
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={async () => {
                  const res = await fetch(`/api/admin/pages/${page.id}/preview`, { method: 'POST' });
                  const data = await res.json();
                  if (!res.ok) {
                    setError(data.error || 'Preview failed');
                    return;
                  }
                  window.open(data.url, '_blank', 'noopener,noreferrer');
                }}
              >
                Open preview
              </button>
            ) : null}
            <button type="button" className="admin-btn admin-btn-danger" onClick={deletePage}>
              Delete page
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-danger"
              onClick={async () => {
                if (!confirm('Delete ALL sections on this page? You can re-seed afterwards.')) return;
                const res = await fetch(`/api/admin/pages/${pageId}/sections`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) {
                  setError(data.error || 'Clear failed');
                  return;
                }
                setMessage(data.message || 'Sections cleared.');
                await load();
              }}
            >
              Clear sections
            </button>
          </div>
        </div>

        <form onSubmit={saveMeta} className="admin-form-grid" style={{ marginBottom: '1rem' }}>
          <div className="admin-field">
            <label>Title</label>
            <input className="admin-input" value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} required />
          </div>
          <div className="admin-field">
            <label>Slug</label>
            <input className="admin-input" value={pageSlug} onChange={(e) => setPageSlug(e.target.value)} required />
          </div>
          <div className="admin-field">
            <label>Meta title (SEO)</label>
            <input className="admin-input" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
          </div>
          <div className="admin-field full">
            <label>Meta description</label>
            <textarea
              className="admin-textarea"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
            />
          </div>
          <div className="full">
            <button type="submit" className="admin-btn admin-btn-primary">
              Save page details
            </button>
          </div>
        </form>

        <form onSubmit={addSection} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <select className="admin-select" value={addType} onChange={(e) => setAddType(e.target.value)}>
            {SECTION_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
          <button type="submit" className="admin-btn admin-btn-primary">
            Add section
          </button>
        </form>
      </div>

      <div className="admin-table-wrap admin-card" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Type</th>
              <th>Title / key</th>
              <th>Enabled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sections.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-empty">
                  No sections. Add one or seed from Pages.
                </td>
              </tr>
            ) : (
              sections.map((section) => (
                <tr key={section.id}>
                  <td>
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => move(section, -1)}>
                      ↑
                    </button>{' '}
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => move(section, 1)}>
                      ↓
                    </button>
                  </td>
                  <td>{typeLabel(section.type)}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{section.title || '—'}</div>
                    <div style={{ color: 'var(--admin-muted)', fontSize: '0.8rem' }}>#{section.section_key || '—'}</div>
                  </td>
                  <td>{section.enabled ? 'Yes' : 'No'}</td>
                  <td>
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditing(section)}>
                      Edit
                    </button>{' '}
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => duplicate(section)}>
                      Duplicate
                    </button>{' '}
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => toggle(section)}>
                      {section.enabled ? 'Disable' : 'Enable'}
                    </button>{' '}
                    <button type="button" className="admin-btn admin-btn-danger" onClick={() => remove(section)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing ? (
        <SectionEditor
          section={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}
