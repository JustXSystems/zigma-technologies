'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { CmsPage } from '@/lib/cms-types';
import type { PageSeedResult, PageSeedStatus } from '@/lib/page-seeds';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

async function fetchPagesAndSeeds(): Promise<{ pages: CmsPage[]; seeds: PageSeedStatus[] }> {
  const [pagesRes, seedRes] = await Promise.all([fetch('/api/admin/pages'), fetch('/api/admin/pages/seed')]);
  const [pagesData, seedData] = await Promise.all([pagesRes.json(), seedRes.json()]);
  if (!pagesRes.ok) throw new Error(pagesData.error || 'Failed to load pages');
  if (!seedRes.ok) throw new Error(seedData.error || 'Failed to load seed status');
  return { pages: pagesData.pages, seeds: seedData.pages };
}

function seedPlanLines(s: PageSeedStatus) {
  const lines: string[] = [];
  if (s.plan.createPage) lines.push(`Create the page at ${s.path} (published)`);
  if (s.plan.insert) lines.push(`Add ${plural(s.plan.insert, 'section')} from the seed`);
  if (s.plan.upgrade) {
    lines.push(
      `Upgrade ${plural(s.plan.upgrade, 'older section')} to the configurable editors. Content and look are kept, and the previous version is saved so it can be restored`
    );
  }
  if (s.plan.add.length) {
    lines.push(`Add ${plural(s.plan.add.length, 'new section')}: ${s.plan.add.map((a) => a.title).join(', ')}`);
  }
  return lines;
}

function seedSummary(s: PageSeedStatus) {
  if (s.state === 'missing') return `Seed creates it with ${plural(s.seedSections, 'section')}`;
  if (s.state === 'empty') return `No sections yet. Seed adds ${s.seedSections}`;
  if (s.state === 'pending') {
    return [s.plan.upgrade ? `${s.plan.upgrade} to upgrade` : '', s.plan.add.length ? `${s.plan.add.length} new` : '']
      .filter(Boolean)
      .join(' · ');
  }
  return s.lastRun ? `Last seeded ${new Date(s.lastRun.at).toLocaleDateString()}${s.lastRun.by ? ` by ${s.lastRun.by}` : ''}` : '';
}

const SEED_BADGE: Record<PageSeedStatus['state'], { className: string; label: string }> = {
  missing: { className: 'new', label: 'Not created' },
  empty: { className: 'new', label: 'Empty' },
  pending: { className: 'new', label: 'Update available' },
  current: { className: 'published', label: 'Up to date' },
};

const groupRowStyle = {
  background: 'var(--admin-panel-2)',
  fontSize: '0.68rem',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'var(--admin-muted)',
  padding: '0.45rem 1rem',
};

export default function AdminPagesPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [seeds, setSeeds] = useState<PageSeedStatus[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');

  const load = useCallback(async () => {
    const data = await fetchPagesAndSeeds();
    setPages(data.pages);
    setSeeds(data.seeds);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPagesAndSeeds()
      .then((data) => {
        if (cancelled) return;
        setPages(data.pages);
        setSeeds(data.seeds);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pageBySlug = useMemo(() => new Map(pages.map((p) => [p.slug, p])), [pages]);
  const customPages = useMemo(() => {
    const builtIn = new Set(seeds.map((s) => s.slug));
    return pages.filter((p) => !builtIn.has(p.slug));
  }, [pages, seeds]);
  const pendingSeeds = seeds.filter((s) => s.state !== 'current');

  async function runSeed(body: { action: 'sync' | 'restore'; slug?: string }, busyKey: string) {
    setBusy(busyKey);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/pages/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seed failed');
      const failed = (data.results as PageSeedResult[]).filter((r) => !r.ok);
      setNotice(data.message);
      if (failed.length) setError(failed.map((r) => r.message).join(' '));
      if (data.pages) setSeeds(data.pages);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Seed failed');
    } finally {
      setBusy(null);
    }
  }

  function seedPage(s: PageSeedStatus) {
    const lines = seedPlanLines(s);
    if (lines.length) {
      const question = `Seed ${s.label} (${s.path})?\n\n${lines.map((l) => `• ${l}`).join('\n')}\n\nNothing you have edited is overwritten.`;
      if (!window.confirm(question)) return;
    }
    void runSeed({ action: 'sync', slug: s.slug }, s.slug);
  }

  function seedAll() {
    if (pendingSeeds.length) {
      const list = pendingSeeds.map((s) => `• ${s.label}: ${seedPlanLines(s).join('; ')}`).join('\n');
      const question = `Seed all built-in pages? ${plural(pendingSeeds.length, 'page')} will change:\n\n${list}\n\nPages that are up to date are left as they are, and nothing you have edited is overwritten.`;
      if (!window.confirm(question)) return;
    }
    void runSeed({ action: 'sync' }, '*');
  }

  function restorePage(s: PageSeedStatus) {
    const question = `Restore ${plural(s.restorable, 'upgraded section')} on ${s.label} to the version saved before the upgrade? Changes made in the new editors since then will be lost.`;
    if (!window.confirm(question)) return;
    void runSeed({ action: 'restore', slug: s.slug }, s.slug);
  }

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

  async function patchPage(page: CmsPage, body: Partial<Pick<CmsPage, 'status'>> & { enabled?: boolean }) {
    await fetch(`/api/admin/pages/${page.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await load();
  }

  function pageStatus(page: CmsPage | undefined) {
    if (!page) return <span style={{ color: 'var(--admin-muted)', fontSize: '0.8rem' }}>—</span>;
    return (
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
        <span className={`admin-badge ${page.status}`}>{page.status}</span>
        {page.enabled ? null : <span className="admin-badge closed">disabled</span>}
      </div>
    );
  }

  function pageActions(page: CmsPage) {
    return (
      <>
        <Link className="admin-btn admin-btn-secondary" href={`/admin/pages/${page.id}`}>
          Sections
        </Link>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => openPreview(page)}>
          Preview
        </button>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => patchPage(page, { enabled: !page.enabled })}>
          {page.enabled ? 'Disable' : 'Enable'}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={() => patchPage(page, { status: page.status === 'published' ? 'draft' : 'published' })}
        >
          {page.status === 'published' ? 'Unpublish' : 'Publish'}
        </button>
      </>
    );
  }

  const groups = seeds.reduce<Array<{ group: string; items: PageSeedStatus[] }>>((acc, s) => {
    const last = acc[acc.length - 1];
    if (last && last.group === s.group) last.items.push(s);
    else acc.push({ group: s.group, items: [s] });
    return acc;
  }, []);

  return (
    <div>
      {error ? <div className="admin-error">{error}</div> : null}
      {notice ? <div className="admin-success">{notice}</div> : null}

      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <div className="admin-toolbar" style={{ marginBottom: 0 }}>
          <div style={{ flex: '1 1 420px' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Pages & sections</h2>
            <p style={{ margin: '0.4rem 0 0', color: 'var(--admin-muted)', fontSize: '0.88rem' }}>
              Manage public pages, reorder sections, enable/disable blocks. <strong>Seed</strong> brings a built-in page up to
              date: it creates the page if needed, fills it when empty, upgrades older sections to the configurable editors
              and adds sections that are new in the seed. It never overwrites your edits and is safe to run any number of times.
            </p>
            <p style={{ margin: '0.3rem 0 0', color: 'var(--admin-muted)', fontSize: '0.88rem' }}>
              Company details: type <code>{'{{phone}}'}</code>, <code>{'{{emergencyPhone}}'}</code>,{' '}
              <code>{'{{email}}'}</code>, <code>{'{{address}}'}</code> or <code>{'{{hours}}'}</code> (links:{' '}
              <code>{'tel:{{phone}}'}</code>) and the site fills them from Site Settings.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--admin-muted)', fontSize: '0.82rem' }}>
              {seeds.length
                ? pendingSeeds.length
                  ? `${plural(pendingSeeds.length, 'built-in page')} can be seeded`
                  : 'All built-in pages are up to date'
                : null}
            </span>
            <button
              type="button"
              className={`admin-btn ${pendingSeeds.length ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              onClick={seedAll}
              disabled={busy !== null || !seeds.length}
            >
              {busy === '*' ? 'Seeding…' : 'Seed all built-in pages'}
            </button>
          </div>
        </div>
      </div>

      <div className="admin-table-wrap admin-card" style={{ padding: 0, marginBottom: '1rem' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Built-in page</th>
              <th>Status</th>
              <th>Seed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {seeds.length === 0 ? (
              <tr>
                <td colSpan={4} className="admin-empty">
                  Loading built-in pages…
                </td>
              </tr>
            ) : (
              groups.map(({ group, items }) => [
                <tr key={`g-${group}`}>
                  <td colSpan={4} style={groupRowStyle}>
                    {group}
                  </td>
                </tr>,
                ...items.map((s) => {
                  const page = pageBySlug.get(s.slug);
                  const badge = SEED_BADGE[s.state];
                  const rowBusy = busy === s.slug || busy === '*';
                  return (
                    <tr key={s.slug}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{page?.title || s.label}</div>
                        <code style={{ fontSize: '0.78rem' }}>{s.path}</code>
                      </td>
                      <td>{pageStatus(page)}</td>
                      <td>
                        <span className={`admin-badge ${badge.className}`}>{badge.label}</span>
                        <div style={{ color: 'var(--admin-muted)', fontSize: '0.76rem', marginTop: '0.25rem' }}>{seedSummary(s)}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className={`admin-btn ${s.state === 'current' ? 'admin-btn-secondary' : 'admin-btn-primary'}`}
                            onClick={() => seedPage(s)}
                            disabled={busy !== null}
                            title={seedPlanLines(s).join('\n') || 'Up to date. Running it again changes nothing.'}
                          >
                            {rowBusy ? 'Seeding…' : 'Seed'}
                          </button>
                          {page ? pageActions(page) : null}
                          {s.restorable ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger"
                              onClick={() => restorePage(s)}
                              disabled={busy !== null}
                              title="Put the upgraded sections back to the version saved before the upgrade"
                            >
                              Restore previous ({s.restorable})
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                }),
              ])
            )}
          </tbody>
        </table>
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
              <th>Other pages</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customPages.length === 0 ? (
              <tr>
                <td colSpan={4} className="admin-empty">
                  No other pages yet. Create one above.
                </td>
              </tr>
            ) : (
              customPages.map((page) => (
                <tr key={page.id}>
                  <td style={{ fontWeight: 600 }}>{page.title}</td>
                  <td>
                    <code>/{page.slug}</code>
                  </td>
                  <td>{pageStatus(page)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>{pageActions(page)}</div>
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
