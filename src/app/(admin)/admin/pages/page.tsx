'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import type { CmsPage } from '@/lib/cms-types';

export default function AdminPagesPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [seedMsg, setSeedMsg] = useState('');

  async function load() {
    const res = await fetch('/api/admin/pages');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    setPages(data.pages);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function createPage(e: FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, slug: slug || title, status: 'draft', enabled: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Create failed');
      return;
    }
    setTitle('');
    setSlug('');
    await load();
  }

  async function seedHome() {
    setSeedMsg('');
    setError('');
    const res = await fetch('/api/admin/pages/seed-home', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Seed failed');
      return;
    }
    setSeedMsg(data.message);
    await load();
  }

  async function seedInner(slug: 'contact' | 'careers' | 'certifications' | 'privacy' | 'terms') {
    setSeedMsg('');
    setError('');
    const res = await fetch('/api/admin/pages/seed-inner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Seed failed');
      return;
    }
    setSeedMsg(data.message);
    await load();
  }

  async function openPreview(page: CmsPage) {
    setError('');
    const res = await fetch(`/api/admin/pages/${page.id}/preview`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Preview failed');
      return;
    }
    window.open(data.url, '_blank', 'noopener,noreferrer');
  }

  async function toggle(page: CmsPage) {
    await fetch(`/api/admin/pages/${page.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !page.enabled }),
    });
    await load();
  }

  async function setStatus(page: CmsPage, status: 'draft' | 'published') {
    await fetch(`/api/admin/pages/${page.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  return (
    <div>
      {error ? <div className="admin-error">{error}</div> : null}
      {seedMsg ? <div className="admin-success">{seedMsg}</div> : null}

      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <div className="admin-toolbar" style={{ marginBottom: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Pages & sections</h2>
            <p style={{ margin: '0.4rem 0 0', color: 'var(--admin-muted)', fontSize: '0.88rem' }}>
              Manage public pages, reorder sections, enable/disable blocks.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="admin-btn admin-btn-primary" onClick={seedHome}>
              Seed homepage
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => seedInner('contact')}>
              Seed contact
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => seedInner('careers')}>
              Seed careers
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => seedInner('certifications')}>
              Seed certifications
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => seedInner('privacy')}>
              Seed privacy
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => seedInner('terms')}>
              Seed terms
            </button>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '0.98rem' }}>Create page</h3>
        <form onSubmit={createPage} className="admin-form-grid">
          <div className="admin-field">
            <label>Title</label>
            <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="admin-field">
            <label>Slug</label>
            <input className="admin-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from title" />
          </div>
          <div className="full">
            <button type="submit" className="admin-btn admin-btn-primary">
              Create
            </button>
          </div>
        </form>
      </div>

      <div className="admin-table-wrap admin-card" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Enabled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-empty">
                  No pages yet. Seed the homepage to get started.
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr key={page.id}>
                  <td style={{ fontWeight: 600 }}>{page.title}</td>
                  <td>
                    <code>/{page.slug === 'home' ? '' : page.slug}</code>
                  </td>
                  <td>
                    <span className={`admin-badge ${page.status}`}>{page.status}</span>
                  </td>
                  <td>{page.enabled ? 'Yes' : 'No'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <Link className="admin-btn admin-btn-secondary" href={`/admin/pages/${page.id}`}>
                        Sections
                      </Link>
                      <button type="button" className="admin-btn admin-btn-secondary" onClick={() => openPreview(page)}>
                        Preview
                      </button>
                      <button type="button" className="admin-btn admin-btn-secondary" onClick={() => toggle(page)}>
                        {page.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={() => setStatus(page, page.status === 'published' ? 'draft' : 'published')}
                      >
                        {page.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
